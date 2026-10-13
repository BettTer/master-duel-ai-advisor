// The card model and the merge of the three sources, with no files or network: shared with the web version.
/** A card in Master Duel as Master Duel Meta lists it. */
export interface MdCard {
  rarity: string; // UR, SR, R or N
  release: string; // ISO time the card arrived in Master Duel, possibly in the future
}


const YGOPRODECK_RARITY: Record<string, string> = { "Ultra Rare": "UR", "Super Rare": "SR", "Rare": "R", "Common": "N" };

export interface Card {
  id: number;
  cid: number | null; // KONAMI card database ID, used by banlists
  altIds: number[];
  setcodes: number[]; // archetype codes, as in YGOPro
  cn: string; // YGOPro Chinese name
  md: string; // Chinese name shown in Master Duel
  sc: string;
  jp: string;
  en: string;
  aliases: string[];
  typesZh: string;
  descZh: string;
  pdescZh: string;
  typeEn: string;
  typeline: string[];
  raceEn: string;
  attrEn: string;
  level: number | null;
  link: number | null;
  atk: number | null;
  def: number | null;
  archetype: string;
  descEn: string;
  mdRarity: string; // UR, SR, R or N; empty if the card is not in Master Duel
  mdRelease: string; // ISO time the card arrives in Master Duel, if Master Duel Meta knows it
  treatedAs: string;
}

/** YGOPro packs up to four 16-bit archetype codes into one number. */
function splitSetcode(setcode: number): number[] {
  const codes: number[] = [];
  for (let rest = BigInt(setcode); rest > 0n; rest >>= 16n) codes.push(Number(rest & 0xffffn));
  return codes;
}

// YGOPro's bit flags in ygocdb's `data`, for cards YGOPRODeck does not have (and for the web version, which does
// not load YGOPRODeck at all).
const ATTRIBUTES: [number, string][] = [[1, "EARTH"], [2, "WATER"], [4, "FIRE"], [8, "WIND"], [16, "LIGHT"], [32, "DARK"], [64, "DIVINE"]];
const RACES: [number, string][] = [
  [1, "Warrior"], [2, "Spellcaster"], [4, "Fairy"], [8, "Fiend"], [16, "Zombie"], [32, "Machine"], [64, "Aqua"], [128, "Pyro"],
  [256, "Rock"], [512, "Winged Beast"], [1024, "Plant"], [2048, "Insect"], [4096, "Thunder"], [8192, "Dragon"], [16384, "Beast"],
  [32768, "Beast-Warrior"], [65536, "Dinosaur"], [131072, "Fish"], [262144, "Sea Serpent"], [524288, "Reptile"], [1048576, "Psychic"],
  [2097152, "Divine-Beast"], [4194304, "Creator God"], [8388608, "Wyrm"], [16777216, "Cyberse"], [33554432, "Illusion"],
];
const flagName = (table: [number, string][], value: number) => table.find(([bit]) => value & bit)?.[1] ?? "";
const TYPE_WORDS: [number, string][] = [
  [0x2, "Spell Card"], [0x4, "Trap Card"], [0x40, "Fusion Monster"], [0x2000, "Synchro Monster"], [0x800000, "XYZ Monster"],
  [0x4000000, "Link Monster"], [0x80, "Ritual Monster"], [0x1000000, "Pendulum Monster"], [0x20, "Effect Monster"], [0x10, "Normal Monster"],
];

function makeCard(cdb: any, ypd: any, pool: Map<number, MdCard> | null): Card {
  cdb ??= {};
  ypd ??= {};
  const misc = ypd.misc_info?.[0] ?? {};
  const text = cdb.text ?? {};
  const data = cdb.data ?? {};
  const isMonster = (data.type & 0x1) !== 0;
  const isLink = (data.type & 0x4000000) !== 0;
  const id: number = cdb.id ?? ypd.id;
  const altIds: number[] = (ypd.card_images ?? []).map((image: any) => image.id).filter((imageId: number) => imageId !== id);
  const aliases = new Set<string>([cdb.nwbbs_n, cdb.cnocg_n, cdb.md_en_n, ypd.name].filter(Boolean));
  // Master Duel Meta's rarity and release date win; YGOPRODeck covers cards it has no release for,
  // such as cards that have been Forbidden since Master Duel launched.
  const md = [id, ...altIds].map((cardId) => pool?.get(cardId)).find(Boolean);
  return {
    id,
    cid: cdb.cid ?? misc.konami_id ?? null,
    altIds,
    setcodes: splitSetcode(cdb.data?.setcode ?? 0),
    cn: cdb.cn_name ?? "",
    md: cdb.md_name ?? "",
    sc: cdb.sc_name ?? "",
    jp: cdb.jp_name ?? "",
    en: cdb.en_name || ypd.name || "",
    aliases: [...aliases].sort(),
    typesZh: text.types ?? "",
    descZh: text.desc ?? "",
    pdescZh: text.pdesc ?? "",
    typeEn: ypd.type ?? (data.type ? flagName(TYPE_WORDS, data.type) : ""),
    typeline: ypd.typeline ?? [],
    raceEn: ypd.race ?? (isMonster ? flagName(RACES, data.race ?? 0) : ""),
    attrEn: ypd.attribute ?? (isMonster ? flagName(ATTRIBUTES, data.attribute ?? 0) : ""),
    level: ypd.level ?? (isMonster && !isLink ? (data.level ?? 0) & 0xff : null),
    link: ypd.linkval ?? (isLink ? (data.level ?? 0) & 0xff : null),
    atk: ypd.atk ?? (isMonster ? data.atk ?? null : null),
    def: ypd.def ?? (isMonster && !isLink ? data.def ?? null : null),
    archetype: ypd.archetype ?? "",
    descEn: ypd.desc ?? "",
    mdRarity: md?.rarity ?? YGOPRODECK_RARITY[misc.md_rarity] ?? "",
    mdRelease: md?.release ?? "",
    treatedAs: misc.treated_as ?? "",
  };
}

/** Merge ygocdb (names, Chinese text), YGOPRODeck (English text) and the Master Duel card pool by passcode. */
export function mergeCards(cdbCards: any[], ypdCards: any[], pool: Map<number, MdCard> | null): Card[] {
  const ypdById = new Map<number, any>();
  for (const card of ypdCards) {
    for (const image of card.card_images ?? []) {
      if (!ypdById.has(image.id)) ypdById.set(image.id, card);
    }
  }
  for (const card of ypdCards) ypdById.set(card.id, card);

  const merged: Card[] = [];
  const used = new Set<number>();
  for (const entry of cdbCards) {
    const ypd = ypdById.get(entry.id);
    if (ypd) used.add(ypd.id);
    merged.push(makeCard(entry, ypd, pool));
  }
  for (const card of ypdCards) {
    if (!used.has(card.id)) merged.push(makeCard(null, card, pool));
  }
  return merged;
}

