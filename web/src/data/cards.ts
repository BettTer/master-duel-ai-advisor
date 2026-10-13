// Card data in the browser: ygocdb's archive (fetched when its checksum changes, kept in IndexedDB), the Master
// Duel pool and the banlist exported at build time, and the engine's card database.
import { strFromU8, unzipSync } from "fflate";
import type { Banlist } from "../../../src/banstatus.ts";
import type { EngineCard } from "../../../src/engine.ts";
import { mergeCards, type Card, type MdCard } from "../../../src/merge.ts";
import { kvGet, kvSet } from "./db.ts";

const YGOCDB_ZIP = "https://ygocdb.com/api/v0/cards.zip";
const YGOCDB_MD5 = "https://ygocdb.com/api/v0/cards.zip.md5";
const BASE = import.meta.env.BASE_URL;

export interface CardData {
  cards: Card[];
  banlist: Banlist;
  builtAt: string;
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return response.json() as Promise<T>;
}

/** ygocdb's card archive, downloaded only when its checksum changed since the copy in IndexedDB. */
async function ygocdbCards(report: (text: string) => void): Promise<any[]> {
  let md5 = "";
  try {
    md5 = String(await fetchJson(YGOCDB_MD5));
  } catch {
    report("百鸽的版本号拿不到，用上次的卡片数据");
  }
  const saved = await kvGet<{ md5: string; bytes: ArrayBuffer }>("ygocdb");
  let bytes = saved && (md5 === "" || saved.md5 === md5) ? saved.bytes : null;
  if (!bytes) {
    report("下载卡片数据（约 2.5 MB）…");
    const response = await fetch(YGOCDB_ZIP);
    if (!response.ok) throw new Error(`百鸽卡片数据下载失败：HTTP ${response.status}`);
    bytes = await response.arrayBuffer();
    await kvSet("ygocdb", { md5, bytes });
  }
  const archive = unzipSync(new Uint8Array(bytes));
  return Object.values(JSON.parse(strFromU8(archive["cards.json"])));
}

export async function loadCardData(report: (text: string) => void = () => {}): Promise<CardData> {
  const [cdb, pool, banlist, built, engine] = await Promise.all([
    ygocdbCards(report),
    fetchJson<[number, MdCard][]>(`${BASE}data/md-pool.json`),
    fetchJson<Banlist>(`${BASE}data/banlist.json`),
    fetchJson<{ builtAt: string }>(`${BASE}data/built.json`).catch(() => ({ builtAt: "" })),
    loadEngineCards(),
  ]);
  const cards = mergeCards(cdb, [], new Map(pool));
  // Alternate artworks have their own passcodes (deck exports use them); the engine's database lists them as
  // aliases of the original, within 20 of its code.
  const alternates = new Map<number, number[]>();
  for (const entry of engine.values()) {
    if (entry.alias && Math.abs(entry.alias - entry.code) < 20) alternates.set(entry.alias, [...(alternates.get(entry.alias) ?? []), entry.code]);
  }
  for (const card of cards) {
    const alt = alternates.get(card.id);
    if (alt) card.altIds = [...new Set([...card.altIds, ...alt])];
  }
  return { cards, banlist, builtAt: built.builtAt };
}

let engineCards: Promise<Map<number, EngineCard>> | null = null;
/** The engine's card database, exported at build time. */
export function loadEngineCards(): Promise<Map<number, EngineCard>> {
  engineCards ??= fetchJson<EngineCard[]>(`${BASE}engine/cards.json`).then((list) => new Map(list.map((card) => [card.code, card])));
  return engineCards;
}

const scriptTexts = new Map<string, string | null>();
/** Script files by name, fetched once each; null when the site has no such file. */
export async function loadScripts(names: Iterable<string>): Promise<Map<string, string | null>> {
  const missing = [...new Set(names)].filter((name) => !scriptTexts.has(name));
  await Promise.all(missing.map(async (name) => {
    const folder = /^c\d+\.lua$/.test(name) ? "official/" : "";
    for (const candidate of folder ? [`official/${name}`, `pre-release/${name}`, `pre-errata/${name}`] : [name, `unofficial/${name}`]) {
      const response = await fetch(`${BASE}engine/scripts/${candidate}`);
      if (response.ok) {
        scriptTexts.set(name, await response.text());
        return;
      }
    }
    scriptTexts.set(name, null);
  }));
  return scriptTexts;
}

/** The library scripts the engine loads for every duel. */
export async function libraryNames(): Promise<string[]> {
  return [...(await fetchJson<string[]>(`${BASE}engine/libraries.json`)), "proc_unofficial.lua"];
}
