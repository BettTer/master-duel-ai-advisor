// Master Duel Meta (masterduelmeta.com): the Master Duel card pool, rarities and banlist.
// Its API has no public documentation, so the endpoints are re-read from the site's own scripts.
import { existsSync } from "node:fs";
import type { MdCard } from "./merge.ts";
import { cachePath, readJson } from "./cache.ts";
import { fetchJson, fetchText } from "./http.ts";

export interface Endpoints {
  cards: string;
  changes: string;
}

export type GetText = (url: string) => Promise<string>;
export type GetJson = (url: string) => Promise<any>;

export const ENDPOINTS_CACHE = cachePath("mdm_endpoints.json");

const MDM_SITE = "https://www.masterduelmeta.com";
// What Master Duel Meta's banlist page called when this was written; tried after rediscovery fails.
export const MDM_KNOWN_ENDPOINTS: Endpoints = {
  cards: `${MDM_SITE}/api/v1/cards?tcgBanStatus[$or][$exists]=true&ocgBanStatus[$or][$exists]=true`
    + "&banStatus[$or][$exists]=true&alternateArt[$ne]=true&limit=0",
  changes: `${MDM_SITE}/api/v1/banlist-changes?sort=-date`,
};

function mustMatch(text: string, pattern: RegExp, what: string): RegExpMatchArray {
  const match = text.match(pattern);
  if (!match) throw new Error(`${what} not found`);
  return match;
}

/** Read the API calls Master Duel Meta's own banlist page makes, so a change on their side is picked up. */
export async function discoverMdmEndpoints(get: GetText = fetchText): Promise<Endpoints> {
  const page = await get(`${MDM_SITE}/terms-of-service`); // any small page loads the app entry script
  const appPath = mustMatch(page, /\/_app\/immutable\/entry\/app\.[\w-]+\.js/, "app entry script")[0];
  const app = await get(MDM_SITE + appPath);
  const node = mustMatch(app, /"\/forbidden-limited-list":\[(\d+)/, "banlist route")[1];
  const nodePath = mustMatch(app, new RegExp(`nodes/${node}\\.[\\w-]+\\.js`), "banlist page script")[0];
  const nodeScript = await get(`${MDM_SITE}/_app/immutable/${nodePath}`);
  const queries = [...nodeScript.matchAll(/"((?:cards|banlist-changes)\?[^"]*)"/g)].map((match) => match[1]);
  const cardsQuery = queries.find((query) => query.startsWith("cards?") && query.includes("banStatus"));
  const changesQuery = queries.find((query) => query.startsWith("banlist-changes?"));
  if (!cardsQuery || !changesQuery) throw new Error("banlist queries not found in the page script");
  const chunks = [...nodeScript.matchAll(/chunks\/[\w.-]+\.js/g)].map((match) => match[0]);
  chunks.sort((a, b) => Number(!a.includes("Fetch")) - Number(!b.includes("Fetch"))); // the request helper first
  for (const chunk of chunks) {
    const base = (await get(`${MDM_SITE}/_app/immutable/${chunk}`)).match(/"(\/api\/v\d+\/)"/);
    if (base) return { cards: MDM_SITE + base[1] + cardsQuery, changes: MDM_SITE + base[1] + changesQuery };
  }
  throw new Error("API base path not found");
}

export const encodeQuery = (url: string) => url.replace(/[[\]$]/g, (char) => encodeURIComponent(char));

/** The API base, e.g. https://www.masterduelmeta.com/api/v1/, from the endpoints that last worked. */
function apiBase(): string {
  const endpoints: Endpoints = existsSync(ENDPOINTS_CACHE) ? readJson(ENDPOINTS_CACHE) : MDM_KNOWN_ENDPOINTS;
  return endpoints.cards.slice(0, endpoints.cards.indexOf("cards?"));
}

export type { MdCard };

/** Every card Master Duel Meta knows a Master Duel release for, by passcode. Alternate artworks are left out. */
export async function fetchMdPool(get: GetJson = fetchJson): Promise<Map<number, MdCard>> {
  const pool = new Map<number, MdCard>();
  const pageSize = 3000; // the API returns at most this many cards per request
  for (let page = 1; page <= 20; page++) {
    const rows: any[] = await get(encodeQuery(
      `${apiBase()}cards?alternateArt[$ne]=true&limit=${pageSize}&page=${page}&fields=name,rarity,konamiID,release`));
    for (const row of rows) {
      if (!row.konamiID || !row.release) continue;
      const id = Number(row.konamiID);
      const known = pool.get(id);
      if (!known || row.release < known.release) pool.set(id, { rarity: row.rarity, release: row.release });
    }
    if (rows.length < pageSize) break;
  }
  if (pool.size < 5000) throw new Error(`only ${pool.size} Master Duel cards; the data format may have changed`);
  return pool;
}

/** Release time of the newest card in Master Duel; changes whenever a pack is added. */
export async function newestMdRelease(get: GetJson = fetchJson): Promise<string> {
  const result = await get(`${apiBase()}cards?sort=-release&limit=1&fields=release`);
  const newest = Array.isArray(result) ? result[0] : result; // with limit=1 the API returns a single object
  if (!newest?.release) throw new Error("no release date");
  return newest.release;
}
