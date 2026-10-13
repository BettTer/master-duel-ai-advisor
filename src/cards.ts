import { existsSync, statSync } from "node:fs";
import { strFromU8, unzipSync } from "fflate";
import { DAY, ageOf, cachePath, readJson, writeText } from "./cache.ts";
import { fetchBytes, fetchJson } from "./http.ts";
import { fetchMdPool, newestMdRelease, type MdCard } from "./mdm.ts";
import { mergeCards, type Card } from "./merge.ts";

export { mergeCards, type Card };

const YGOCDB_ZIP = "https://ygocdb.com/api/v0/cards.zip";
const YGOCDB_MD5 = "https://ygocdb.com/api/v0/cards.zip.md5";
const YGOPRODECK_ALL = "https://db.ygoprodeck.com/api/v7/cardinfo.php?misc=yes";
const YGOPRODECK_VERSION = "https://db.ygoprodeck.com/api/v7/checkDBVer.php";
const CARDS_CACHE = cachePath("cards.json");
const CHECKED_MARK = cachePath("cards_checked"); // its modification time is when the sources were last checked
const CARDS_MAX_AGE = 7 * DAY;
const CHECK_INTERVAL = 3600; // seconds between version checks
const CACHE_VERSION = 3;

/** Version markers of the three sources; null when a source could not be reached. */
export interface SourceVersions {
  ygocdb: string | null; // checksum of the card archive
  ygoprodeck: string | null; // database version
  mdPool: string | null; // release time of the newest Master Duel card
}

interface CardCache {
  version: number;
  builtAt: string;
  sources: SourceVersions;
  mdSource: string;
  cards: Card[];
}

export async function checkVersions(): Promise<SourceVersions> {
  const [ygocdb, ygoprodeck, mdPool] = await Promise.allSettled([
    fetchJson(YGOCDB_MD5, 15),
    fetchJson(YGOPRODECK_VERSION, 15).then((rows) => rows[0].database_version),
    newestMdRelease(),
  ]);
  const value = (result: PromiseSettledResult<unknown>) => (result.status === "fulfilled" ? String(result.value) : null);
  return { ygocdb: value(ygocdb), ygoprodeck: value(ygoprodeck), mdPool: value(mdPool) };
}

/** True if a reachable source reports a version other than the one the cache was built from. */
export function sourcesChanged(built: SourceVersions, latest: SourceVersions): boolean {
  return (Object.keys(latest) as (keyof SourceVersions)[]).some((key) => latest[key] !== null && latest[key] !== built[key]);
}

async function downloadCards(): Promise<Card[]> {
  console.error("Downloading card data (about 30 MB; first run, a source changed, or the weekly refresh)...");
  const sources = await checkVersions();
  const archive = unzipSync(await fetchBytes(YGOCDB_ZIP));
  const cdbCards = Object.values(JSON.parse(strFromU8(archive["cards.json"])));
  const ypdCards = (await fetchJson(YGOPRODECK_ALL, 180)).data;
  let pool: Map<number, MdCard> | null = null;
  try {
    pool = await fetchMdPool();
  } catch (error) {
    console.error(`Could not read the Master Duel card pool from masterduelmeta.com (${error}); using YGOPRODeck's Master Duel rarities.`);
    sources.mdPool = null;
  }
  const cards = mergeCards(cdbCards, ypdCards, pool);
  const cache: CardCache = {
    version: CACHE_VERSION,
    builtAt: new Date().toISOString(),
    sources,
    mdSource: pool ? "masterduelmeta.com" : "YGOPRODeck",
    cards,
  };
  writeText(CARDS_CACHE, JSON.stringify(cache));
  writeText(CHECKED_MARK, "");
  return cards;
}

let memo: { mtimeMs: number; cache: CardCache } | null = null;

function readCache(): CardCache | null {
  if (!existsSync(CARDS_CACHE)) return null;
  const mtimeMs = statSync(CARDS_CACHE).mtimeMs;
  if (memo?.mtimeMs !== mtimeMs) {
    const cache: CardCache = readJson(CARDS_CACHE);
    if (cache.version !== CACHE_VERSION) return null;
    memo = { mtimeMs, cache };
  }
  return memo.cache;
}

async function rebuild(cached: CardCache | null): Promise<Card[]> {
  try {
    return await downloadCards();
  } catch (error) {
    if (cached) {
      console.error(`Could not refresh card data (${error}); using the older cache.`);
      return cached.cards;
    }
    throw new Error(`Could not download card data: ${error}`);
  }
}

/** Check the sources' versions (at most once per interval) and rebuild if one changed; null if nothing changed. */
async function refreshIfChanged(cached: CardCache, interval: number): Promise<Card[] | null> {
  if (ageOf(CHECKED_MARK) < interval) return null;
  const latest = await checkVersions();
  writeText(CHECKED_MARK, "");
  return sourcesChanged(cached.sources, latest) ? rebuild(cached) : null;
}

/** Cards from the local cache. Rebuilt on the first run, when a source publishes a new version, and weekly. */
export async function loadCards(force = false): Promise<Card[]> {
  const cached = readCache();
  if (!cached || force || ageOf(CARDS_CACHE) >= CARDS_MAX_AGE) return rebuild(cached);
  return (await refreshIfChanged(cached, CHECK_INTERVAL)) ?? cached.cards;
}

/** After a lookup found nothing: check the sources right away (unless just checked) in case the card is new. */
export async function reloadIfSourcesChanged(): Promise<Card[] | null> {
  const cached = readCache();
  return cached ? refreshIfChanged(cached, 300) : null;
}

/** What the cached card data was built from. */
export function cardDataInfo(): Omit<CardCache, "cards" | "version"> | null {
  const cached = readCache();
  return cached && { builtAt: cached.builtAt, sources: cached.sources, mdSource: cached.mdSource };
}
