import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import dotenv from "dotenv";
import path from "path";
import { readFileSync } from "node:fs";

dotenv.config({ path: path.join(__dirname, "..", ".env") });
dotenv.config({ path: path.join(__dirname, "..", ".env.local"), override: true });

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// Generic JSON-driven catalog importer. Reads a file at CATALOG_FILE env var
// (defaults to prisma/data/import.json) and upserts categories + weapons +
// gadgets + grenades + attachments + bindings into the database.
// All writes are idempotent (upserts) so it is safe to re-run.

type Class = "ASSAULT" | "ENGINEER" | "SUPPORT" | "RECON";
type WeaponType = "PRIMARY" | "SECONDARY" | "SPECIAL";
type AttachmentSlot =
  | "OPTIC" | "UNDER_BARREL" | "HAND_GUARD" | "MUZZLE"
  | "STOCK" | "MAGAZINE" | "TACTICAL_BLOCK" | "FOREGRIP";

interface CategoryIn { name: string; color?: string; icon?: string }
interface WeaponIn {
  guid: string; name: string; class: Class; type: WeaponType;
  category: string; price?: number; zorder?: number; isDefault?: boolean;
}
interface GadgetIn {
  guid: string; name: string; class: Class;
  category?: string | null; price?: number; zorder?: number; isDefault?: boolean;
}
interface GrenadeIn extends GadgetIn {}
interface AttachmentIn {
  guid: string; name: string; slot: AttachmentSlot; defaultPrice?: number;
}
interface BindingIn {
  weapon_guid: string; weapon_class: Class;
  attachment_guid: string; isDefault?: boolean; priceOverride?: number | null;
}
interface ImportFile {
  categories?: CategoryIn[];
  weapons?: WeaponIn[];
  gadgets?: GadgetIn[];
  grenades?: GrenadeIn[];
  attachments?: AttachmentIn[];
  bindings?: BindingIn[];
}

async function main() {
  const file = process.env.CATALOG_FILE ?? "prisma/data/import.json";
  const fullPath = path.resolve(file);
  console.log(`Importing catalog from ${fullPath}...`);
  const data: ImportFile = JSON.parse(readFileSync(fullPath, "utf8"));

  // 1. Categories (upsert by name)
  const catId = new Map<string, string>();
  for (const c of data.categories ?? []) {
    const row = await prisma.weaponCategory.upsert({
      where: { name: c.name },
      update: { color: c.color ?? undefined, icon: c.icon ?? undefined },
      create: { name: c.name, color: c.color ?? null, icon: c.icon ?? null },
    });
    catId.set(c.name, row.id);
  }
  if (data.categories?.length) console.log(`  ✓ ${data.categories.length} categories`);

  // Resolve category id (also looks up existing rows not in this import)
  async function resolveCat(name: string | null | undefined): Promise<string | null> {
    if (!name) return null;
    if (catId.has(name)) return catId.get(name)!;
    const row = await prisma.weaponCategory.findUnique({ where: { name } });
    if (!row) throw new Error(`Unknown category referenced: ${name}`);
    catId.set(name, row.id);
    return row.id;
  }

  // 2. Attachments (upsert by guid)
  const attId = new Map<string, string>();
  for (const a of data.attachments ?? []) {
    const row = await prisma.attachment.upsert({
      where: { guid: a.guid },
      update: { name: a.name, slot: a.slot, defaultPrice: a.defaultPrice ?? 0 },
      create: { guid: a.guid, name: a.name, slot: a.slot, defaultPrice: a.defaultPrice ?? 0 },
    });
    attId.set(a.guid, row.id);
  }
  if (data.attachments?.length) console.log(`  ✓ ${data.attachments.length} attachments`);

  // 3. Weapons (upsert by (guid, class))
  const wpnId = new Map<string, string>(); // key: `${guid}|${class}`
  let wpnNew = 0, wpnUpd = 0;
  for (const w of data.weapons ?? []) {
    const categoryId = await resolveCat(w.category);
    if (!categoryId) throw new Error(`Weapon ${w.name} (${w.guid}) missing category`);
    // Detect new vs existing for cleaner logging
    const existing = await prisma.weapon.findUnique({
      where: { guid_class: { guid: w.guid, class: w.class } },
      select: { id: true },
    });
    const row = await prisma.weapon.upsert({
      where: { guid_class: { guid: w.guid, class: w.class } },
      update: {
        name: w.name, type: w.type, categoryId,
        price: w.price ?? 0, zorder: w.zorder ?? 0,
        // Only flip isDefault to true if explicitly requested; never overwrite an
        // existing starter to false. (Bug: earlier import wiped seed starters.)
        ...(w.isDefault === true ? { isDefault: true } : {}),
      },
      create: {
        guid: w.guid, class: w.class, name: w.name, type: w.type, categoryId,
        price: w.price ?? 0, zorder: w.zorder ?? 0,
        isDefault: w.isDefault ?? false,
      },
    });
    wpnId.set(`${w.guid}|${w.class}`, row.id);
    if (existing) wpnUpd++; else wpnNew++;
  }
  if (data.weapons?.length) console.log(`  ✓ ${data.weapons.length} weapons (${wpnNew} new, ${wpnUpd} updated)`);

  // 4. Gadgets (upsert by (guid, class))
  for (const g of data.gadgets ?? []) {
    const categoryId = await resolveCat(g.category ?? null);
    await prisma.gadget.upsert({
      where: { guid_class: { guid: g.guid, class: g.class } },
      update: {
        name: g.name, categoryId, price: g.price ?? 0, zorder: g.zorder ?? 0,
        isDefault: g.isDefault ?? false,
      },
      create: {
        guid: g.guid, class: g.class, name: g.name, categoryId,
        price: g.price ?? 0, zorder: g.zorder ?? 0, isDefault: g.isDefault ?? false,
      },
    });
  }
  if (data.gadgets?.length) console.log(`  ✓ ${data.gadgets.length} gadgets`);

  // 5. Grenades (upsert by (guid, class))
  for (const g of data.grenades ?? []) {
    const categoryId = await resolveCat(g.category ?? null);
    await prisma.grenade.upsert({
      where: { guid_class: { guid: g.guid, class: g.class } },
      update: {
        name: g.name, categoryId, price: g.price ?? 0, zorder: g.zorder ?? 0,
        isDefault: g.isDefault ?? false,
      },
      create: {
        guid: g.guid, class: g.class, name: g.name, categoryId,
        price: g.price ?? 0, zorder: g.zorder ?? 0, isDefault: g.isDefault ?? false,
      },
    });
  }
  if (data.grenades?.length) console.log(`  ✓ ${data.grenades.length} grenades`);

  // 6. WeaponAttachment bindings (upsert by composite (weaponId, attachmentId))
  let bound = 0, skipped = 0;
  for (const b of data.bindings ?? []) {
    const wKey = `${b.weapon_guid}|${b.weapon_class}`;
    let weaponId = wpnId.get(wKey);
    if (!weaponId) {
      const row = await prisma.weapon.findUnique({
        where: { guid_class: { guid: b.weapon_guid, class: b.weapon_class } },
        select: { id: true },
      });
      if (!row) { skipped++; continue; }
      weaponId = row.id;
    }
    let attachmentId = attId.get(b.attachment_guid);
    if (!attachmentId) {
      const row = await prisma.attachment.findUnique({
        where: { guid: b.attachment_guid }, select: { id: true },
      });
      if (!row) { skipped++; continue; }
      attachmentId = row.id;
    }
    await prisma.weaponAttachment.upsert({
      where: { weaponId_attachmentId: { weaponId, attachmentId } },
      update: { isDefault: b.isDefault ?? false, priceOverride: b.priceOverride ?? null },
      create: { weaponId, attachmentId, isDefault: b.isDefault ?? false, priceOverride: b.priceOverride ?? null },
    });
    bound++;
  }
  if (data.bindings?.length) console.log(`  ✓ ${bound} bindings (${skipped} skipped)`);

  console.log("Catalog import complete.");
}

main()
  .catch((e) => { console.error("Import failed:", e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
