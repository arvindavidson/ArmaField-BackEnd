import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(__dirname, "..", ".env") });
dotenv.config({ path: path.join(__dirname, "..", ".env.local"), override: true });

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// One-shot fix: re-flag the starter weapons that the bulk import accidentally
// cleared. These are the original ArmaField test-data GUIDs that
// createDefaultLoadouts looks up via findFirst(isDefault: true).
const STARTERS = [
  { guid: "FA5C25BF66A53DCF", class: "ASSAULT"  as const, label: "AK-74" },
  { guid: "BFEA719491610A45", class: "ENGINEER" as const, label: "AKS-74U" },
  { guid: "B31929F65F0D0279", class: "RECON"    as const, label: "M21" },
];

async function main() {
  for (const s of STARTERS) {
    const r = await prisma.weapon.update({
      where: { guid_class: { guid: s.guid, class: s.class } },
      data: { isDefault: true },
      select: { name: true, class: true, type: true },
    });
    console.log(`✓ ${r.class} ${r.type} ${r.name} (${s.guid}) → isDefault=true`);
  }
  console.log("Starter flags restored.");
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
