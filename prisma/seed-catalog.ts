import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(__dirname, "..", ".env") });
dotenv.config({ path: path.join(__dirname, "..", ".env.local"), override: true });

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// Mirror of src/lib/test-loadout-data.ts, inlined so this script can run
// inside the deployed runner image (which does not copy src/).

type Class = "ASSAULT" | "ENGINEER" | "SUPPORT" | "RECON";
type WeaponType = "PRIMARY" | "SECONDARY" | "SPECIAL";
type AttachmentSlot =
  | "OPTIC" | "UNDER_BARREL" | "HAND_GUARD" | "MUZZLE"
  | "STOCK" | "MAGAZINE" | "TACTICAL_BLOCK" | "FOREGRIP";

type Cat = { slug: string; name: string; color: string };
type Wpn = { slug: string; guid: string; name: string; price: number; zorder: number; isDefault: boolean; type: WeaponType; class: Class; catSlug: string };
type GG  = { slug: string; guid: string; name: string; price: number; zorder: number; isDefault: boolean; class: Class; catSlug: string | null };
type Att = { slug: string; guid: string; name: string; defaultPrice: number; slot: AttachmentSlot };
type Bind = { weaponSlug: string; attSlug: string; isDefault: boolean; priceOverride?: number | null };

const CATEGORIES: Cat[] = [
  { slug: "cat-assault-rifle", name: "Assault Rifle",     color: "#ED2100" },
  { slug: "cat-explosives",    name: "Explosives",        color: "#FFCE1B" },
  { slug: "cat-grenade",       name: "Grenade",           color: "#E35336" },
  { slug: "cat-launcher",      name: "Launcher",          color: "#FFB343" },
  { slug: "cat-lmg",           name: "Light Machine Gun", color: "#678DC6" },
  { slug: "cat-mg",            name: "Machine Gun",       color: "#1A4A96" },
  { slug: "cat-mine",          name: "Mine",              color: "#FF5C00" },
  { slug: "cat-pistol",        name: "Pistol",            color: "#6b7280" },
  { slug: "cat-smoke",         name: "Smoke Grenade",     color: "#6A89A7" },
  { slug: "cat-sniper",        name: "Sniper Rifle",      color: "#50C878" },
];

const WEAPONS: Wpn[] = [
  // ASSAULT
  { slug: "w-ak74-assault",         guid: "FA5C25BF66A53DCF", name: "AK-74",        price: 0,    zorder: 1, isDefault: true,  type: "PRIMARY",   class: "ASSAULT",  catSlug: "cat-assault-rifle" },
  { slug: "w-m16a2-assault",        guid: "3E413771E1834D2F", name: "M16A2",        price: 0,    zorder: 2, isDefault: false, type: "PRIMARY",   class: "ASSAULT",  catSlug: "cat-assault-rifle" },
  { slug: "w-m16a2-m203-assault",   guid: "5A987A8A13763769", name: "M16A2 + M203", price: 1600, zorder: 3, isDefault: false, type: "PRIMARY",   class: "ASSAULT",  catSlug: "cat-assault-rifle" },
  { slug: "w-vz58-assault",         guid: "9C948630078D154D", name: "VZ 58",        price: 1500, zorder: 4, isDefault: false, type: "PRIMARY",   class: "ASSAULT",  catSlug: "cat-assault-rifle" },
  { slug: "w-ak74n-assault",        guid: "96DFD2E7E63B3386", name: "AK-74N",       price: 4000, zorder: 5, isDefault: false, type: "PRIMARY",   class: "ASSAULT",  catSlug: "cat-assault-rifle" },
  { slug: "w-pm-assault",           guid: "C0F7DD85A86B2900", name: "PM",           price: 0,    zorder: 1, isDefault: true,  type: "SECONDARY", class: "ASSAULT",  catSlug: "cat-pistol" },
  { slug: "w-m9-assault",           guid: "1353C6EAD1DCFE43", name: "M9",           price: 500,  zorder: 2, isDefault: false, type: "SECONDARY", class: "ASSAULT",  catSlug: "cat-pistol" },
  // ENGINEER
  { slug: "w-aks74u-engineer",          guid: "BFEA719491610A45", name: "AKS-74U",        price: 0,    zorder: 1,  isDefault: true,  type: "PRIMARY",   class: "ENGINEER", catSlug: "cat-assault-rifle" },
  { slug: "w-aks74un-engineer",         guid: "FA0E25CE35EE945F", name: "AKS-74UN",       price: 2000, zorder: 2,  isDefault: false, type: "PRIMARY",   class: "ENGINEER", catSlug: "cat-assault-rifle" },
  { slug: "w-m16a2-carabine-engineer",  guid: "F97A4AC994231900", name: "M16A2 Carabine", price: 4000, zorder: 3,  isDefault: false, type: "PRIMARY",   class: "ENGINEER", catSlug: "cat-assault-rifle" },
  { slug: "w-pm-engineer",              guid: "C0F7DD85A86B2900", name: "PM",             price: 0,    zorder: 1,  isDefault: true,  type: "SECONDARY", class: "ENGINEER", catSlug: "cat-pistol" },
  { slug: "w-m9-engineer",              guid: "1353C6EAD1DCFE43", name: "M9",             price: 500,  zorder: 2,  isDefault: false, type: "SECONDARY", class: "ENGINEER", catSlug: "cat-pistol" },
  { slug: "w-m72-engineer",             guid: "9C5C20FB0E01E64F", name: "M72",            price: 0,    zorder: 1,  isDefault: true,  type: "SPECIAL",   class: "ENGINEER", catSlug: "cat-launcher" },
  { slug: "w-rpg75-engineer",           guid: "7C45EC94C698246B", name: "RPG 75",         price: 0,    zorder: 2,  isDefault: false, type: "SPECIAL",   class: "ENGINEER", catSlug: "cat-launcher" },
  { slug: "w-rpg22-engineer",           guid: "722CE6FEC39EE896", name: "RPG 22",         price: 0,    zorder: 3,  isDefault: false, type: "SPECIAL",   class: "ENGINEER", catSlug: "cat-launcher" },
  { slug: "w-rpg7-engineer",            guid: "7A82FE978603F137", name: "RPG 7",          price: 8000, zorder: 4,  isDefault: false, type: "SPECIAL",   class: "ENGINEER", catSlug: "cat-launcher" },
  { slug: "w-m15-engineer",             guid: "3BF82FD68BBC845C", name: "M15",            price: 3000, zorder: 50, isDefault: false, type: "SPECIAL",   class: "ENGINEER", catSlug: "cat-mine" },
  { slug: "w-tm62m-engineer",           guid: "CCC00D009D4949B0", name: "TM-62M",         price: 3000, zorder: 51, isDefault: false, type: "SPECIAL",   class: "ENGINEER", catSlug: "cat-mine" },
  // SUPPORT
  { slug: "w-m249-support",   guid: "D2B48DEBEF38D7D7", name: "M249",   price: 0,    zorder: 1,  isDefault: true,  type: "PRIMARY",   class: "SUPPORT", catSlug: "cat-mg" },
  { slug: "w-pkm-support",    guid: "A89BC9D55FFB4CD8", name: "PKM",    price: 0,    zorder: 2,  isDefault: false, type: "PRIMARY",   class: "SUPPORT", catSlug: "cat-mg" },
  { slug: "w-uk59-support",   guid: "026CE108BFB3EC03", name: "UK 59",  price: 2000, zorder: 3,  isDefault: false, type: "PRIMARY",   class: "SUPPORT", catSlug: "cat-mg" },
  { slug: "w-m60-support",    guid: "D182DCDD72BF7E34", name: "M60",    price: 3000, zorder: 4,  isDefault: false, type: "PRIMARY",   class: "SUPPORT", catSlug: "cat-mg" },
  { slug: "w-pkmn-support",   guid: "80CBC9A8D95A8A7B", name: "PKMN",   price: 6000, zorder: 5,  isDefault: false, type: "PRIMARY",   class: "SUPPORT", catSlug: "cat-mg" },
  { slug: "w-rpk74-support",  guid: "A7AF84C6C58BA3E8", name: "RPK-74", price: 1500, zorder: 50, isDefault: false, type: "PRIMARY",   class: "SUPPORT", catSlug: "cat-lmg" },
  { slug: "w-rpk74n-support", guid: "5F365605E36597FB", name: "RPK-74N",price: 4000, zorder: 51, isDefault: false, type: "PRIMARY",   class: "SUPPORT", catSlug: "cat-lmg" },
  { slug: "w-pm-support",     guid: "C0F7DD85A86B2900", name: "PM",     price: 0,    zorder: 1,  isDefault: true,  type: "SECONDARY", class: "SUPPORT", catSlug: "cat-pistol" },
  { slug: "w-m9-support",     guid: "1353C6EAD1DCFE43", name: "M9",     price: 500,  zorder: 2,  isDefault: false, type: "SECONDARY", class: "SUPPORT", catSlug: "cat-pistol" },
  // RECON
  { slug: "w-m21-recon",     guid: "B31929F65F0D0279", name: "M21",      price: 0,    zorder: 1, isDefault: true,  type: "PRIMARY",   class: "RECON", catSlug: "cat-sniper" },
  { slug: "w-m21camo-recon", guid: "8D6553BEAF8640D1", name: "M21 Camo", price: 2000, zorder: 2, isDefault: false, type: "PRIMARY",   class: "RECON", catSlug: "cat-sniper" },
  { slug: "w-svd-recon",     guid: "3EB02CDAD5F23C82", name: "SVD",      price: 4000, zorder: 3, isDefault: false, type: "PRIMARY",   class: "RECON", catSlug: "cat-sniper" },
  { slug: "w-pm-recon",      guid: "C0F7DD85A86B2900", name: "PM",       price: 0,    zorder: 1, isDefault: true,  type: "SECONDARY", class: "RECON", catSlug: "cat-pistol" },
  { slug: "w-m9-recon",      guid: "1353C6EAD1DCFE43", name: "M9",       price: 500,  zorder: 2, isDefault: false, type: "SECONDARY", class: "RECON", catSlug: "cat-pistol" },
];

const GADGETS: GG[] = [
  { slug: "g-medkit-assault",     guid: "84215EB8AF53C91C", name: "MedKit",     price: 0, zorder: 1, isDefault: true, class: "ASSAULT",  catSlug: null },
  { slug: "g-repairkit-engineer", guid: "33B2DFDCD0EBA3DB", name: "Repair Kit", price: 0, zorder: 1, isDefault: true, class: "ENGINEER", catSlug: null },
  { slug: "g-ammobag-support",    guid: "831A42E7BBB27877", name: "Ammo Bag",   price: 0, zorder: 1, isDefault: true, class: "SUPPORT",  catSlug: null },
];

const GRENADES: GG[] = [
  // ASSAULT
  { slug: "gr-rgd5-assault",      guid: "645C73791ECA1698", name: "RGD-5",      price: 0,   zorder: 1,  isDefault: true,  class: "ASSAULT", catSlug: "cat-grenade" },
  { slug: "gr-m67-assault",       guid: "E8F00BF730225B00", name: "M67",        price: 900, zorder: 2,  isDefault: false, class: "ASSAULT", catSlug: "cat-grenade" },
  { slug: "gr-rdg2-assault",      guid: "77EAE5E07DC4678A", name: "RDG-2",      price: 0,   zorder: 50, isDefault: false, class: "ASSAULT", catSlug: "cat-smoke" },
  { slug: "gr-anm8-assault",      guid: "9DB69176CEF0EE97", name: "AN-M8",      price: 300, zorder: 51, isDefault: false, class: "ASSAULT", catSlug: "cat-smoke" },
  { slug: "gr-m18green-assault",  guid: "D41D22DD1B8E921E", name: "M18 Green",  price: 600, zorder: 52, isDefault: false, class: "ASSAULT", catSlug: "cat-smoke" },
  { slug: "gr-m18red-assault",    guid: "3343A055A83CB30D", name: "M18 Red",    price: 600, zorder: 53, isDefault: false, class: "ASSAULT", catSlug: "cat-smoke" },
  { slug: "gr-m18violet-assault", guid: "14C1A0F061D9DDEE", name: "M18 Violet", price: 600, zorder: 54, isDefault: false, class: "ASSAULT", catSlug: "cat-smoke" },
  { slug: "gr-m18yellow-assault", guid: "9BBDEE253A16CC66", name: "M18 Yellow", price: 600, zorder: 55, isDefault: false, class: "ASSAULT", catSlug: "cat-smoke" },
  // ENGINEER
  { slug: "gr-rgd5-engineer", guid: "645C73791ECA1698", name: "RGD-5", price: 0,   zorder: 1, isDefault: true,  class: "ENGINEER", catSlug: "cat-grenade" },
  { slug: "gr-m67-engineer",  guid: "E8F00BF730225B00", name: "M67",   price: 900, zorder: 2, isDefault: false, class: "ENGINEER", catSlug: "cat-grenade" },
  // SUPPORT
  { slug: "gr-rgd5-support",   guid: "645C73791ECA1698", name: "RGD-5",   price: 0,    zorder: 1,  isDefault: true,  class: "SUPPORT", catSlug: "cat-grenade" },
  { slug: "gr-m67-support",    guid: "E8F00BF730225B00", name: "M67",     price: 900,  zorder: 2,  isDefault: false, class: "SUPPORT", catSlug: "cat-grenade" },
  { slug: "gr-tsh400-support", guid: "97064F8597F2D7BF", name: "TSH400g", price: 3000, zorder: 50, isDefault: false, class: "SUPPORT", catSlug: "cat-explosives" },
  { slug: "gr-m112-support",   guid: "33CBDE73AB48172A", name: "M112",    price: 3000, zorder: 51, isDefault: false, class: "SUPPORT", catSlug: "cat-explosives" },
  // RECON
  { slug: "gr-rgd5-recon", guid: "645C73791ECA1698", name: "RGD-5", price: 0,    zorder: 1,  isDefault: true,  class: "RECON", catSlug: "cat-grenade" },
  { slug: "gr-m67-recon",  guid: "E8F00BF730225B00", name: "M67",   price: 900,  zorder: 2,  isDefault: false, class: "RECON", catSlug: "cat-grenade" },
  { slug: "gr-pmn4-recon", guid: "B05A816C0BF50802", name: "PMN-4", price: 3000, zorder: 50, isDefault: false, class: "RECON", catSlug: "cat-mine" },
  { slug: "gr-m14-recon",  guid: "E4C9F0A4090CFE4D", name: "M14",   price: 3000, zorder: 51, isDefault: false, class: "RECON", catSlug: "cat-mine" },
];

const ATTACHMENTS: Att[] = [
  // OPTIC
  { slug: "att-1p29",           guid: "ACDF49FACD0701A8", name: "1P29",           defaultPrice: 300, slot: "OPTIC" },
  { slug: "att-m16-4x20",       guid: "BD496EE1B40DC510", name: "M16 4x20",       defaultPrice: 450, slot: "OPTIC" },
  { slug: "att-m16-ap2k",       guid: "08286DDBB1F33FF1", name: "M16 AP2k",       defaultPrice: 600, slot: "OPTIC" },
  { slug: "att-m21-artii",      guid: "D2018EDB1BBF4C88", name: "M21 ARTII",      defaultPrice: 0,   slot: "OPTIC" },
  { slug: "att-m21-artii-camo", guid: "304664561B760EE0", name: "M21 ARTII Camo", defaultPrice: 0,   slot: "OPTIC" },
  { slug: "att-pgo7v3",         guid: "E5E9DBBF3BFB88C6", name: "PGO-7V3",        defaultPrice: 900, slot: "OPTIC" },
  { slug: "att-pso1",           guid: "C850A33226B8F9C1", name: "PSO-1",          defaultPrice: 0,   slot: "OPTIC" },
  { slug: "att-uk59-optic",     guid: "886A96EF3F14BCD2", name: "UK 59 Optic",    defaultPrice: 600, slot: "OPTIC" },
  // UNDER_BARREL
  { slug: "att-gp25", guid: "1ABABE3551512B0A", name: "GP-25", defaultPrice: 1600, slot: "UNDER_BARREL" },
  // HAND_GUARD
  { slug: "att-m16carb-hg-base",    guid: "20BCF441EAD9F593", name: "M16 Carabine Handguard Base",    defaultPrice: 0,   slot: "HAND_GUARD" },
  { slug: "att-m16carb-hg-solid",   guid: "85C85EFC8E49B312", name: "M16 Carabine Handguard Solid",   defaultPrice: 150, slot: "HAND_GUARD" },
  { slug: "att-m16carb-hg-stripes", guid: "084D8EDB23D39D93", name: "M16 Carabine Handguard Stripes", defaultPrice: 150, slot: "HAND_GUARD" },
  { slug: "att-m16-hg-base",        guid: "FB1A7F5BC7D935E2", name: "M16 Handguard Base",             defaultPrice: 0,   slot: "HAND_GUARD" },
  { slug: "att-m16-hg-solid",       guid: "51C19F66AAC90A29", name: "M16 Handguard Solid",            defaultPrice: 150, slot: "HAND_GUARD" },
  { slug: "att-m16-hg-stripes",     guid: "1A2C3098A3F88658", name: "M16 Handguard Stripes",          defaultPrice: 150, slot: "HAND_GUARD" },
  // MUZZLE
  { slug: "att-ak74-fh",   guid: "4A815EB8B824974A", name: "AK74 FlashHider",     defaultPrice: 0,    slot: "MUZZLE" },
  { slug: "att-aks74u-fh", guid: "06D4C36A6D585275", name: "AKS-74U FlashHider",  defaultPrice: 0,    slot: "MUZZLE" },
  { slug: "att-m16-fh",    guid: "6288A1F1A5E3AC37", name: "M16 FlashHider",      defaultPrice: 0,    slot: "MUZZLE" },
  { slug: "att-m16-supp",  guid: "E52C9791E1554A5F", name: "M16 Suppressor",      defaultPrice: 1500, slot: "MUZZLE" },
  { slug: "att-pbs4",      guid: "3B96FAC169E27037", name: "PBS-4",               defaultPrice: 1500, slot: "MUZZLE" },
  // STOCK
  { slug: "att-vz58-stock-fixed",   guid: "2F4BBE174AFAF5E0", name: "VZ58 Stock Fixed",   defaultPrice: 0,   slot: "STOCK" },
  { slug: "att-vz58-stock-folding", guid: "AD045AFAFFC1AB6E", name: "VZ58 Stock Folding", defaultPrice: 150, slot: "STOCK" },
  // MAGAZINE
  { slug: "att-mag-ak74",  guid: "0A84AA5A3884176F", name: "AK 74", defaultPrice: 0, slot: "MAGAZINE" },
  { slug: "att-mag-m16a2", guid: "D8F2CA92583B23D3", name: "M16A2", defaultPrice: 0, slot: "MAGAZINE" },
  { slug: "att-mag-m21",   guid: "627255315038152A", name: "M21",   defaultPrice: 0, slot: "MAGAZINE" },
  { slug: "att-mag-m249",  guid: "06D722FC2666EB83", name: "M249",  defaultPrice: 0, slot: "MAGAZINE" },
  { slug: "att-mag-m60",   guid: "4D2C1E8F3A81F894", name: "M60",   defaultPrice: 0, slot: "MAGAZINE" },
  { slug: "att-mag-m9",    guid: "9C05543A503DB80E", name: "M9",    defaultPrice: 0, slot: "MAGAZINE" },
  { slug: "att-mag-pkm",   guid: "E5E9C5897CF47F44", name: "PKM",   defaultPrice: 0, slot: "MAGAZINE" },
  { slug: "att-mag-pm",    guid: "8B853CDD11BA916E", name: "PM",    defaultPrice: 0, slot: "MAGAZINE" },
  { slug: "att-mag-rpk74", guid: "D78C667F59829717", name: "RPK 74",defaultPrice: 0, slot: "MAGAZINE" },
  { slug: "att-mag-svd",   guid: "9CCB46C6EE632C1A", name: "SVD",   defaultPrice: 0, slot: "MAGAZINE" },
  { slug: "att-mag-uk59",  guid: "03094E059B554A9C", name: "UK 59", defaultPrice: 0, slot: "MAGAZINE" },
  { slug: "att-mag-vz58",  guid: "A827B610B7CD4158", name: "VZ 58", defaultPrice: 0, slot: "MAGAZINE" },
];

const BINDINGS: Bind[] = [
  // ASSAULT PRIMARY
  { weaponSlug: "w-ak74-assault",  attSlug: "att-gp25",    isDefault: false },
  { weaponSlug: "w-ak74-assault",  attSlug: "att-ak74-fh", isDefault: true  },
  { weaponSlug: "w-ak74-assault",  attSlug: "att-pbs4",    isDefault: false },
  { weaponSlug: "w-ak74-assault",  attSlug: "att-mag-ak74",isDefault: true  },

  { weaponSlug: "w-ak74n-assault", attSlug: "att-1p29",    isDefault: false },
  { weaponSlug: "w-ak74n-assault", attSlug: "att-gp25",    isDefault: false },
  { weaponSlug: "w-ak74n-assault", attSlug: "att-ak74-fh", isDefault: true  },
  { weaponSlug: "w-ak74n-assault", attSlug: "att-pbs4",    isDefault: false },
  { weaponSlug: "w-ak74n-assault", attSlug: "att-mag-ak74",isDefault: true  },

  { weaponSlug: "w-m16a2-assault", attSlug: "att-m16-4x20",      isDefault: false },
  { weaponSlug: "w-m16a2-assault", attSlug: "att-m16-ap2k",      isDefault: false },
  { weaponSlug: "w-m16a2-assault", attSlug: "att-m16-hg-base",   isDefault: true  },
  { weaponSlug: "w-m16a2-assault", attSlug: "att-m16-hg-solid",  isDefault: false },
  { weaponSlug: "w-m16a2-assault", attSlug: "att-m16-hg-stripes",isDefault: false },
  { weaponSlug: "w-m16a2-assault", attSlug: "att-m16-fh",        isDefault: true  },
  { weaponSlug: "w-m16a2-assault", attSlug: "att-m16-supp",      isDefault: false },
  { weaponSlug: "w-m16a2-assault", attSlug: "att-mag-m16a2",     isDefault: true  },

  { weaponSlug: "w-m16a2-m203-assault", attSlug: "att-m16-4x20",  isDefault: false },
  { weaponSlug: "w-m16a2-m203-assault", attSlug: "att-m16-ap2k",  isDefault: false },
  { weaponSlug: "w-m16a2-m203-assault", attSlug: "att-m16-fh",    isDefault: true  },
  { weaponSlug: "w-m16a2-m203-assault", attSlug: "att-m16-supp",  isDefault: false },
  { weaponSlug: "w-m16a2-m203-assault", attSlug: "att-mag-m16a2", isDefault: true  },

  { weaponSlug: "w-vz58-assault", attSlug: "att-vz58-stock-fixed",   isDefault: true  },
  { weaponSlug: "w-vz58-assault", attSlug: "att-vz58-stock-folding", isDefault: false },
  { weaponSlug: "w-vz58-assault", attSlug: "att-mag-vz58",           isDefault: true  },

  // ASSAULT SECONDARY
  { weaponSlug: "w-m9-assault", attSlug: "att-mag-m9", isDefault: true },
  { weaponSlug: "w-pm-assault", attSlug: "att-mag-pm", isDefault: true },

  // ENGINEER PRIMARY
  { weaponSlug: "w-aks74u-engineer",  attSlug: "att-aks74u-fh", isDefault: true  },
  { weaponSlug: "w-aks74u-engineer",  attSlug: "att-pbs4",      isDefault: false },
  { weaponSlug: "w-aks74u-engineer",  attSlug: "att-mag-ak74",  isDefault: true  },

  { weaponSlug: "w-aks74un-engineer", attSlug: "att-1p29",      isDefault: false },
  { weaponSlug: "w-aks74un-engineer", attSlug: "att-aks74u-fh", isDefault: true  },
  { weaponSlug: "w-aks74un-engineer", attSlug: "att-pbs4",      isDefault: false },
  { weaponSlug: "w-aks74un-engineer", attSlug: "att-mag-ak74",  isDefault: true  },

  { weaponSlug: "w-m16a2-carabine-engineer", attSlug: "att-m16-4x20",          isDefault: false },
  { weaponSlug: "w-m16a2-carabine-engineer", attSlug: "att-m16-ap2k",          isDefault: false },
  { weaponSlug: "w-m16a2-carabine-engineer", attSlug: "att-m16carb-hg-base",   isDefault: true  },
  { weaponSlug: "w-m16a2-carabine-engineer", attSlug: "att-m16carb-hg-solid",  isDefault: false },
  { weaponSlug: "w-m16a2-carabine-engineer", attSlug: "att-m16carb-hg-stripes",isDefault: false },
  { weaponSlug: "w-m16a2-carabine-engineer", attSlug: "att-m16-fh",            isDefault: true  },
  { weaponSlug: "w-m16a2-carabine-engineer", attSlug: "att-m16-supp",          isDefault: false },
  { weaponSlug: "w-m16a2-carabine-engineer", attSlug: "att-mag-m16a2",         isDefault: true  },

  // ENGINEER SECONDARY
  { weaponSlug: "w-m9-engineer", attSlug: "att-mag-m9", isDefault: true },
  { weaponSlug: "w-pm-engineer", attSlug: "att-mag-pm", isDefault: true },

  // ENGINEER SPECIAL
  { weaponSlug: "w-rpg7-engineer", attSlug: "att-pgo7v3", isDefault: false },

  // SUPPORT PRIMARY
  { weaponSlug: "w-m249-support",   attSlug: "att-mag-m249",  isDefault: true  },
  { weaponSlug: "w-m60-support",    attSlug: "att-mag-m60",   isDefault: true  },
  { weaponSlug: "w-pkm-support",    attSlug: "att-mag-pkm",   isDefault: true  },
  { weaponSlug: "w-pkmn-support",   attSlug: "att-1p29",      isDefault: false },
  { weaponSlug: "w-pkmn-support",   attSlug: "att-mag-pkm",   isDefault: true  },
  { weaponSlug: "w-rpk74-support",  attSlug: "att-mag-rpk74", isDefault: true  },
  { weaponSlug: "w-rpk74n-support", attSlug: "att-1p29",      isDefault: false },
  { weaponSlug: "w-rpk74n-support", attSlug: "att-mag-rpk74", isDefault: true  },
  { weaponSlug: "w-uk59-support",   attSlug: "att-uk59-optic",isDefault: false },
  { weaponSlug: "w-uk59-support",   attSlug: "att-mag-uk59",  isDefault: true  },

  // SUPPORT SECONDARY
  { weaponSlug: "w-m9-support", attSlug: "att-mag-m9", isDefault: true },
  { weaponSlug: "w-pm-support", attSlug: "att-mag-pm", isDefault: true },

  // RECON PRIMARY
  { weaponSlug: "w-m21-recon",     attSlug: "att-m21-artii",      isDefault: true },
  { weaponSlug: "w-m21-recon",     attSlug: "att-mag-m21",        isDefault: true },
  { weaponSlug: "w-m21camo-recon", attSlug: "att-m21-artii-camo", isDefault: true },
  { weaponSlug: "w-m21camo-recon", attSlug: "att-mag-m21",        isDefault: true },
  { weaponSlug: "w-svd-recon",     attSlug: "att-pso1",           isDefault: true },
  { weaponSlug: "w-svd-recon",     attSlug: "att-mag-svd",        isDefault: true },

  // RECON SECONDARY
  { weaponSlug: "w-m9-recon", attSlug: "att-mag-m9", isDefault: true },
  { weaponSlug: "w-pm-recon", attSlug: "att-mag-pm", isDefault: true },
];

async function main() {
  console.log("Seeding catalog (categories, weapons, attachments, gadgets, grenades, bindings)...");

  const catId = new Map<string, string>();
  for (const c of CATEGORIES) {
    const row = await prisma.weaponCategory.upsert({
      where: { name: c.name },
      update: { color: c.color },
      create: { name: c.name, color: c.color },
    });
    catId.set(c.slug, row.id);
  }
  console.log(`  ✓ ${CATEGORIES.length} categories`);

  const attId = new Map<string, string>();
  for (const a of ATTACHMENTS) {
    const row = await prisma.attachment.upsert({
      where: { guid: a.guid },
      update: { name: a.name, defaultPrice: a.defaultPrice, slot: a.slot },
      create: { guid: a.guid, name: a.name, defaultPrice: a.defaultPrice, slot: a.slot },
    });
    attId.set(a.slug, row.id);
  }
  console.log(`  ✓ ${ATTACHMENTS.length} attachments`);

  const wpnId = new Map<string, string>();
  for (const w of WEAPONS) {
    const categoryId = catId.get(w.catSlug);
    if (!categoryId) throw new Error(`Unknown category for weapon ${w.slug}: ${w.catSlug}`);
    const row = await prisma.weapon.upsert({
      where: { guid_class: { guid: w.guid, class: w.class } },
      update: {
        name: w.name, price: w.price, zorder: w.zorder, isDefault: w.isDefault,
        type: w.type, categoryId,
      },
      create: {
        guid: w.guid, name: w.name, price: w.price, zorder: w.zorder, isDefault: w.isDefault,
        type: w.type, class: w.class, categoryId,
      },
    });
    wpnId.set(w.slug, row.id);
  }
  console.log(`  ✓ ${WEAPONS.length} weapons`);

  for (const g of GADGETS) {
    const categoryId = g.catSlug ? catId.get(g.catSlug) ?? null : null;
    await prisma.gadget.upsert({
      where: { guid_class: { guid: g.guid, class: g.class } },
      update: { name: g.name, price: g.price, zorder: g.zorder, isDefault: g.isDefault, categoryId },
      create: {
        guid: g.guid, name: g.name, price: g.price, zorder: g.zorder, isDefault: g.isDefault,
        class: g.class, categoryId,
      },
    });
  }
  console.log(`  ✓ ${GADGETS.length} gadgets`);

  for (const g of GRENADES) {
    const categoryId = g.catSlug ? catId.get(g.catSlug) ?? null : null;
    await prisma.grenade.upsert({
      where: { guid_class: { guid: g.guid, class: g.class } },
      update: { name: g.name, price: g.price, zorder: g.zorder, isDefault: g.isDefault, categoryId },
      create: {
        guid: g.guid, name: g.name, price: g.price, zorder: g.zorder, isDefault: g.isDefault,
        class: g.class, categoryId,
      },
    });
  }
  console.log(`  ✓ ${GRENADES.length} grenades`);

  let bound = 0;
  let skipped = 0;
  for (const b of BINDINGS) {
    const weaponId = wpnId.get(b.weaponSlug);
    const attachmentId = attId.get(b.attSlug);
    if (!weaponId || !attachmentId) {
      console.warn(`  ! Skipping binding ${b.weaponSlug} → ${b.attSlug} (missing reference)`);
      skipped++;
      continue;
    }
    await prisma.weaponAttachment.upsert({
      where: { weaponId_attachmentId: { weaponId, attachmentId } },
      update: { isDefault: b.isDefault, priceOverride: b.priceOverride ?? null },
      create: { weaponId, attachmentId, isDefault: b.isDefault, priceOverride: b.priceOverride ?? null },
    });
    bound++;
  }
  console.log(`  ✓ ${bound} weapon-attachment bindings (${skipped} skipped)`);

  console.log("Catalog seed complete.");
}

main()
  .catch((e) => { console.error("Seed failed:", e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
