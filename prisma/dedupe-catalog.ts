import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(__dirname, "..", ".env") });
dotenv.config({ path: path.join(__dirname, "..", ".env.local"), override: true });

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// Dedupes weapons by (stripped-name, class). The in-game UI shows the
// weapon's UIInfo from its prefab, not our DB's `name` field, so two
// prefabs with the same in-game name appear as identical entries in the
// buy menu even if their GUIDs and DB names differ.
//
// Keeper preference per duplicate group:
//   1. isDefault=true (a seeded starter — preserve to not break player loadouts)
//   2. name tagged [WCS] (WCS is canonical when both sources exist)
//   3. lowest weapon id alphabetically (deterministic tiebreak)
//
// Losers get deleted; their weapon_attachments rows cascade.

function stripModTag(name: string): string {
  return name.replace(/\s*\[(RHS|WCS)\]\s*$/, "").trim();
}

// Aggressive grouping key — collapses parenthesized variants like (RHSMag),
// (M203), (camo), (FDE), (PlumMag), (base), (tan) that share an in-game
// UIInfo display name with the bare prefab.
function groupingName(name: string): string {
  return name
    .replace(/\s*\[(RHS|WCS)\]\s*$/, "")
    .replace(/\s*\((RHSMag|PlumMag|base|M203|camo|tan|FDE)\)\s*/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function main() {
  const all = await prisma.weapon.findMany({
    select: { id: true, guid: true, name: true, class: true, type: true, isDefault: true },
    orderBy: { id: "asc" },
  });
  console.log(`Loaded ${all.length} weapon rows.`);

  // Group by (in-game grouping name, class). The grouping key collapses
  // parenthesized variants that share their parent prefab's UIInfo display.
  const groups = new Map<string, typeof all>();
  for (const w of all) {
    const key = `${groupingName(w.name)}|${w.class}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(w);
  }

  const losers: { id: string; guid: string; name: string; class: string }[] = [];
  const renames: { id: string; from: string; to: string }[] = [];
  let groupsTouched = 0;

  for (const [key, group] of groups) {
    if (group.length < 2) {
      // Singletons: still strip mod tag + variant suffix from the name
      const w = group[0];
      const clean = groupingName(w.name);
      if (clean !== w.name) renames.push({ id: w.id, from: w.name, to: clean });
      continue;
    }
    groupsTouched++;

    // Pick keeper by rule
    const sorted = [...group].sort((a, b) => {
      // 1. starter weapons always win
      if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1;
      // 2. prefer "bare" names over parenthesized variants
      const aParen = /\(/.test(a.name) ? 1 : 0;
      const bParen = /\(/.test(b.name) ? 1 : 0;
      if (aParen !== bParen) return aParen - bParen;
      // 3. prefer WCS over RHS
      const aWcs = /\[WCS\]/.test(a.name) ? 0 : 1; // 0 wins, so WCS = 0
      const bWcs = /\[WCS\]/.test(b.name) ? 0 : 1;
      if (aWcs !== bWcs) return aWcs - bWcs;
      // 4. deterministic tiebreak
      return a.id < b.id ? -1 : 1;
    });
    const [keeper, ...losersInGroup] = sorted;

    // Always strip the tag AND parenthesized variant suffix from the keeper's name
    const clean = groupingName(keeper.name);
    if (clean !== keeper.name) renames.push({ id: keeper.id, from: keeper.name, to: clean });
    for (const l of losersInGroup) {
      losers.push({ id: l.id, guid: l.guid, name: l.name, class: l.class });
    }
  }

  console.log(`Groups with duplicates: ${groupsTouched}`);
  console.log(`Weapons to delete: ${losers.length}`);
  console.log(`Names to clean (strip [RHS]/[WCS]): ${renames.length}`);

  // Apply renames
  for (const r of renames) {
    await prisma.weapon.update({ where: { id: r.id }, data: { name: r.to } });
  }
  console.log(`Renamed ${renames.length} weapons.`);

  // Apply deletions
  if (losers.length > 0) {
    // Also clear any PlayerLoadout slots pointing at the loser ids (FK is untyped, so manual)
    const loserIds = losers.map((l) => l.id);
    const clearedW = await prisma.playerLoadout.updateMany({
      where: { weaponId:  { in: loserIds } }, data: { weaponId:  null },
    });
    const clearedP = await prisma.playerLoadout.updateMany({
      where: { pistolId:  { in: loserIds } }, data: { pistolId:  null },
    });
    const clearedS = await prisma.playerLoadout.updateMany({
      where: { specialId: { in: loserIds } }, data: { specialId: null },
    });
    console.log(`Cleared player loadout slots: weapon=${clearedW.count} pistol=${clearedP.count} special=${clearedS.count}`);

    // Delete player_unlocks pointing at these (itemType=WEAPON)
    const unlocks = await prisma.playerUnlock.deleteMany({
      where: { itemType: "WEAPON", itemId: { in: loserIds } },
    });
    console.log(`Deleted player_unlocks: ${unlocks.count}`);

    // Delete the weapons (weapon_attachments cascade)
    const del = await prisma.weapon.deleteMany({ where: { id: { in: loserIds } } });
    console.log(`Deleted weapons: ${del.count}`);
  }

  console.log("Dedupe complete.");
}

main()
  .catch((e) => { console.error("Dedupe failed:", e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
