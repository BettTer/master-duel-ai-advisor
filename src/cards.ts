import { existsSync, statSync } from "node:fs";
import { strFromU8, unzipSync } from "fflate";
import { DAY, ageOf, cachePath, readJson, writeText } from "./cache.ts";
import { fetchBytes, fetchJson } from "./http.ts";

const YGOCDB_ZIP = "https://ygocdb.com/api/v0/cards.zip";
const YGOPRODECK_ALL = "https://db.ygoprodeck.com/api/v7/cardinfo.php?misc=yes";
const CARDS_CACHE = cachePath("cards.json");
const CARDS_MAX_AGE = 7 * DAY;
const CACHE_VERSION = 1;

export interface Card {
  id: number;
  cid: number | null; // KONAMI card database ID, used by banlists
  altIds: number[];
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
  mdRarity: string;
  treatedAs: string;
}

function makeCard(cdb: any, ypd: any): Card {
  cdb ??= {};
  ypd ??= {};
  const misc = ypd.misc_info?.[0] ?? {};
  const text = cdb.text ?? {};
  const id: number = cdb.id ?? ypd.id;
  const aliases = new Set<string>([cdb.nwbbs_n, cdb.cnocg_n, cdb.md_en_n, ypd.name].filter(Boolean));
  return {
    id,
    cid: cdb.cid ?? misc.konami_id ?? null,
    altIds: (ypd.card_images ?? []).map((image: any) => image.id).filter((imageId: number) => imageId !== id),
    cn: cdb.cn_name ?? "",
    md: cdb.md_name ?? "",
    sc: cdb.sc_name ?? "",
    jp: cdb.jp_name ?? "",
    en: cdb.en_name || ypd.name || "",
    aliases: [...aliases].sort(),
    typesZh: text.types ?? "",
    descZh: text.desc ?? "",
    pdescZh: text.pdesc ?? "",
    typeEn: ypd.type ?? "",
    typeline: ypd.typeline ?? [],
    raceEn: ypd.race ?? "",
    attrEn: ypd.attribute ?? "",
    level: ypd.level ?? null,
    link: ypd.linkval ?? null,
    atk: ypd.atk ?? null,
    def: ypd.def ?? null,
    archetype: ypd.archetype ?? "",
    descEn: ypd.desc ?? "",
    mdRarity: misc.md_rarity ?? "",
    treatedAs: misc.treated_as ?? "",
  };
}

/** Merge ygocdb (names, Chinese text) with YGOPRODeck (English text, Master Duel rarity) by passcode. */
export function mergeCards(cdbCards: any[], ypdCards: any[]): Card[] {
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
    merged.push(makeCard(entry, ypd));
  }
  for (const card of ypdCards) {
    if (!used.has(card.id)) merged.push(makeCard(null, card));
  }
  return merged;
}

async function downloadCards(): Promise<Card[]> {
  console.error("Downloading card data (about 30 MB; first run or weekly refresh)...");
  const archive = unzipSync(await fetchBytes(YGOCDB_ZIP));
  const cdbCards = Object.values(JSON.parse(strFromU8(archive["cards.json"])));
  const ypdCards = (await fetchJson(YGOPRODECK_ALL, 180)).data;
  const cards = mergeCards(cdbCards, ypdCards);
  writeText(CARDS_CACHE, JSON.stringify({ version: CACHE_VERSION, cards }));
  return cards;
}

let memo: { mtimeMs: number; cards: Card[] } | null = null;

function readCache(): Card[] | null {
  if (!existsSync(CARDS_CACHE)) return null;
  const mtimeMs = statSync(CARDS_CACHE).mtimeMs;
  if (memo?.mtimeMs !== mtimeMs) {
    const cached = readJson(CARDS_CACHE);
    if (cached.version !== CACHE_VERSION) return null;
    memo = { mtimeMs, cards: cached.cards };
  }
  return memo.cards;
}

/** Cards from the local cache, downloading them on the first run and once a week after that. */
export async function loadCards(force = false): Promise<Card[]> {
  const cached = readCache();
  if (cached && !force && ageOf(CARDS_CACHE) < CARDS_MAX_AGE) return cached;
  try {
    return await downloadCards();
  } catch (error) {
    if (cached) {
      console.error(`Could not refresh card data (${error}); using the older cache.`);
      return cached;
    }
    throw new Error(`Could not download card data: ${error}`);
  }
}
