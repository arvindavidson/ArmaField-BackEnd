import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(__dirname, "..", ".env") });
dotenv.config({ path: path.join(__dirname, "..", ".env.local"), override: true });

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// Idempotent backfill: re-applies createDefaultLoadouts() logic to EVERY existing
// player, using upserts so it's safe to run repeatedly. Needed because the
// connect-time default assignment only fires when isNew=true; players who
// connected before the catalog was seeded got null loadout slots and stayed that
// way. This script populates those slots from the current isDefault flags.

const CLASSES = ["ASSAULT", "ENGINEER", "SUPPORT", "RECON"] as const;

async function backfillPlayer(playerId: string) {
  for (const cls of CLASSES) {
    const [primary, secondary, special, gadget, grenade] = await Promise.all([
      prisma.weapon.findFirst({ where: { class: cls, type: "PRIMARY",   isDefault: true }, select: { id: true } }),
      prisma.weapon.findFirst({ where: { class: cls, type: "SECONDARY", isDefault: true }, select: { id: true } }),
      prisma.weapon.findFirst({ where: { class: cls, type: "SPECIAL",   isDefault: true }, select: { id: true } }),
      prisma.gadget.findFirst({ where: { class: cls, isDefault: true }, select: { id: true } }),
      prisma.grenade.findFirst({ where: { class: cls, isDefault: true }, select: { id: true } }),
    ]);

    await prisma.playerLoadout.upsert({
      where: { playerId_class: { playerId, class: cls } },
      update: {
        weaponId:  primary?.id   ?? null,
        pistolId:  secondary?.id ?? null,
        specialId: special?.id   ?? null,
        gadgetId:  gadget?.id    ?? null,
        grenadeId: grenade?.id   ?? null,
      },
      create: {
        playerId, class: cls,
        weaponId:  primary?.id   ?? null,
        pistolId:  secondary?.id ?? null,
        specialId: special?.id   ?? null,
        gadgetId:  gadget?.id    ?? null,
        grenadeId: grenade?.id   ?? null,
      },
    });

    const unlockRows: { playerId: string; itemType: "WEAPON" | "GADGET" | "GRENADE"; itemId: string }[] = [];
    if (primary)   unlockRows.push({ playerId, itemType: "WEAPON",  itemId: primary.id });
    if (secondary) unlockRows.push({ playerId, itemType: "WEAPON",  itemId: secondary.id });
    if (special)   unlockRows.push({ playerId, itemType: "WEAPON",  itemId: special.id });
    if (gadget)    unlockRows.push({ playerId, itemType: "GADGET",  itemId: gadget.id });
    if (grenade)   unlockRows.push({ playerId, itemType: "GRENADE", itemId: grenade.id });
    if (unlockRows.length > 0) {
      await prisma.playerUnlock.createMany({ data: unlockRows, skipDuplicates: true });
    }

    for (const w of [primary, secondary, special]) {
      if (!w) continue;
      const existing = await prisma.playerWeaponSetup.findUnique({
        where: { playerId_weaponId: { playerId, weaponId: w.id } },
        select: { id: true },
      });
      const setupId = existing?.id ?? (await prisma.playerWeaponSetup.create({
        data: { playerId, weaponId: w.id }, select: { id: true },
      })).id;

      const defaultBindings = await prisma.weaponAttachment.findMany({
        where: { weaponId: w.id, isDefault: true },
        select: { attachmentId: true },
      });
      if (defaultBindings.length > 0) {
        await prisma.playerWeaponAttachment.createMany({
          data: defaultBindings.map((b) => ({ setupId, attachmentId: b.attachmentId })),
          skipDuplicates: true,
        });
      }
    }
  }
}

async function main() {
  const players = await prisma.player.findMany({ select: { id: true, nickname: true } });
  console.log(`Backfilling defaults for ${players.length} player(s)...`);
  for (const p of players) {
    await backfillPlayer(p.id);
    console.log(`  ✓ ${p.nickname} (${p.id})`);
  }
  console.log("Backfill complete.");
}

main()
  .catch((e) => { console.error("Backfill failed:", e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
