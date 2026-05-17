import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(__dirname, "..", ".env") });
dotenv.config({ path: path.join(__dirname, "..", ".env.local"), override: true });

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("=== Weapon counts by (class, type) ===");
  const grouped = await prisma.weapon.groupBy({
    by: ["class", "type"],
    _count: { _all: true },
  });
  const defaultsByClass = await prisma.weapon.findMany({
    where: { isDefault: true },
    select: { class: true, type: true, name: true, guid: true },
    orderBy: [{ class: "asc" }, { type: "asc" }],
  });
  const defaultsSet = new Set(defaultsByClass.map(d => `${d.class}|${d.type}`));

  for (const g of grouped.sort((a,b) => (a.class+a.type).localeCompare(b.class+b.type))) {
    const hasDefault = defaultsSet.has(`${g.class}|${g.type}`);
    console.log(`  ${g.class.padEnd(9)} ${g.type.padEnd(9)} total=${g._count._all.toString().padStart(3)} hasDefault=${hasDefault ? "YES" : "NO!!"}`);
  }

  console.log("\n=== isDefault=true weapons ===");
  for (const d of defaultsByClass) {
    console.log(`  ${d.class.padEnd(9)} ${d.type.padEnd(9)} ${d.name.padEnd(30)} guid=${d.guid}`);
  }

  console.log("\n=== Player loadouts ===");
  const loadouts = await prisma.playerLoadout.findMany({
    include: { player: { select: { nickname: true } } },
    orderBy: [{ playerId: "asc" }, { class: "asc" }],
  });
  for (const l of loadouts) {
    const slots = [
      `pri=${l.weaponId ? "set" : "NULL"}`,
      `sec=${l.pistolId ? "set" : "NULL"}`,
      `spe=${l.specialId ? "set" : "NULL"}`,
      `gad=${l.gadgetId ? "set" : "NULL"}`,
      `gre=${l.grenadeId ? "set" : "NULL"}`,
    ].join(" ");
    console.log(`  ${l.player.nickname.padEnd(20)} ${l.class.padEnd(9)} ${slots}`);
  }

  console.log("\n=== Sample weapons for ASSAULT PRIMARY (first 5) ===");
  const sampleAsr = await prisma.weapon.findMany({
    where: { class: "ASSAULT", type: "PRIMARY" },
    select: { name: true, guid: true, price: true, isDefault: true, zorder: true },
    orderBy: { zorder: "asc" },
    take: 5,
  });
  for (const w of sampleAsr) console.log(`  z=${w.zorder} default=${w.isDefault} price=${w.price} ${w.name} ${w.guid}`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
