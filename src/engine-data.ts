// Data for the rules engine: ProjectIgnis' card databases (BabelCDB) and card scripts (CardScripts), the same data
// EDOPro uses. Downloaded on first use, checked for new versions daily, and kept in the cache directory.
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { unzipSync } from "fflate";
import { DAY, ageOf, cachePath, readJson, writeText } from "./cache.ts";
import type { Card } from "./cards.ts";
import { fetchBytes, fetchJson } from "./http.ts";
import { inMasterDuel } from "./query.ts";
import type { EngineCard } from "./engine.ts";

export type { EngineCard };

const BABEL_CONTENTS = "https://api.github.com/repos/ProjectIgnis/BabelCDB/contents";
const SCRIPTS_COMMIT = "https://api.github.com/repos/ProjectIgnis/CardScripts/commits?per_page=1";
const SCRIPTS_ZIP = "https://codeload.github.com/ProjectIgnis/CardScripts/zip/refs/heads/master";
const ENGINE_DIR = cachePath("engine");
const CARDS_FILE = join(ENGINE_DIR, "cards.json");
const VERSIONS_FILE = join(ENGINE_DIR, "versions.json"); // its modification time is when versions were last checked
export const SCRIPTS_DIR = join(ENGINE_DIR, "scripts");
// Where scripts are looked up, in order. A few current cards live in pre-errata (Red-Eyes Darkness Metal Dragon).
const SCRIPT_FOLDERS = ["official", "pre-release", ".", "pre-errata", "unofficial"];

interface Versions {
  databases: Record<string, string>; // file name → blob sha
  scripts: string; // commit sha
}

/** The official card databases, without Rush Duel, Skills, Goat format or unofficial cards. Later files win. */
function wanted(name: string): boolean {
  return /^(cards|release-.+|prerelease-.+)\.cdb$/.test(name) && !/rush|skill|goat|unofficial/.test(name);
}
const order = (name: string) => (name === "cards.cdb" ? 0 : name.startsWith("prerelease") ? 1 : 2);

async function latestVersions(): Promise<{ versions: Versions; urls: Record<string, string> }> {
  const [contents, commits] = await Promise.all([fetchJson(BABEL_CONTENTS), fetchJson(SCRIPTS_COMMIT)]);
  const files = (contents as any[]).filter((file) => wanted(file.name));
  if (files.length === 0 || !commits[0]?.sha) throw new Error("GitHub 返回的内容不像卡库和脚本仓库");
  return {
    versions: { databases: Object.fromEntries(files.map((file) => [file.name, file.sha])), scripts: commits[0].sha },
    urls: Object.fromEntries(files.map((file) => [file.name, file.download_url])),
  };
}

/** Read card rows from SQLite databases into engine card data. Needs node:sqlite (Node 22.13 or later). */
async function readDatabases(files: Uint8Array[]): Promise<EngineCard[]> {
  let sqlite: typeof import("node:sqlite");
  try {
    sqlite = await import("node:sqlite");
  } catch {
    throw new Error(`路线规划要读 SQLite 卡库，需要 Node.js 22.13 或更高版本（现在是 ${process.version}）`);
  }
  const cards = new Map<number, EngineCard>();
  const temp = join(ENGINE_DIR, "temp.cdb");
  mkdirSync(ENGINE_DIR, { recursive: true });
  for (const bytes of files) {
    writeFileSync(temp, bytes);
    const db = new sqlite.DatabaseSync(temp, { readOnly: true });
    const statement = db.prepare("SELECT id, alias, setcode, type, atk, def, level, race, attribute FROM datas");
    statement.setReadBigInts(true);
    for (const row of statement.all() as any[]) {
      const type = Number(row.type);
      const level = Number(row.level);
      const isLink = (type & 0x4000000) !== 0;
      const setcodes: number[] = [];
      for (let rest = BigInt.asUintN(64, row.setcode); rest > 0n; rest >>= 16n) setcodes.push(Number(rest & 0xffffn));
      cards.set(Number(row.id), {
        code: Number(row.id), alias: Number(row.alias), setcodes, type,
        attack: Number(row.atk), defense: isLink ? 0 : Number(row.def), link_marker: isLink ? Number(row.def) : 0,
        level: level & 0xff, lscale: (level >> 24) & 0xff, rscale: (level >> 16) & 0xff,
        race: Number(row.race), attribute: Number(row.attribute),
      });
    }
    db.close();
  }
  rmSync(temp, { force: true });
  return [...cards.values()];
}

async function downloadDatabases(urls: Record<string, string>): Promise<void> {
  const names = Object.keys(urls).sort((a, b) => order(a) - order(b) || a.localeCompare(b));
  const files = await Promise.all(names.map((name) => fetchBytes(urls[name], 180)));
  writeText(CARDS_FILE, JSON.stringify(await readDatabases(files)));
}

async function downloadScripts(): Promise<void> {
  console.error("Downloading card scripts for the rules engine (about 25 MB)...");
  const archive = unzipSync(await fetchBytes(SCRIPTS_ZIP, 600), {
    // Only what the engine reads: shared libraries at the top level, card folders, and the one unofficial library
    // utility.lua loads.
    filter: (file) => /^[^/]+\/((official|pre-release|pre-errata)\/)?[^/]+\.lua$|\/unofficial\/proc_unofficial\.lua$/.test(file.name),
  });
  rmSync(SCRIPTS_DIR, { recursive: true, force: true });
  for (const [name, bytes] of Object.entries(archive)) {
    const target = join(SCRIPTS_DIR, name.slice(name.indexOf("/") + 1));
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, bytes);
  }
}

let memo: Map<number, EngineCard> | null = null;

/**
 * Engine card data, downloading or updating it when needed. Versions are checked at most once per maxAge
 * seconds; if the check fails, the cached data is used.
 */
export async function loadEngineData(maxAge = DAY): Promise<Map<number, EngineCard>> {
  const cached: Versions | null = existsSync(VERSIONS_FILE) ? readJson(VERSIONS_FILE) : null;
  const complete = cached !== null && existsSync(CARDS_FILE) && existsSync(SCRIPTS_DIR);
  if (!complete || ageOf(VERSIONS_FILE) >= maxAge) {
    try {
      const { versions, urls } = await latestVersions();
      const databasesChanged = !complete || JSON.stringify(versions.databases) !== JSON.stringify(cached!.databases);
      if (databasesChanged) await downloadDatabases(urls);
      if (!complete || versions.scripts !== cached!.scripts) await downloadScripts();
      writeText(VERSIONS_FILE, JSON.stringify(versions));
      if (databasesChanged) memo = null;
    } catch (error) {
      if (!complete) throw new Error(`没能下载规则引擎的数据：${error instanceof Error ? error.message : error}`);
      console.error(`Could not check the rules engine data for updates (${error}); using the cached copy.`);
    }
  }
  memo ??= new Map((readJson(CARDS_FILE) as EngineCard[]).map((card) => [card.code, card]));
  return memo;
}

/** The script file for a name the engine asks for, such as "c55273560.lua" or "utility.lua"; null if missing. */
export function scriptPath(name: string): string | null {
  for (const folder of SCRIPT_FOLDERS) {
    const file = join(SCRIPTS_DIR, folder, name);
    if (existsSync(file)) return file;
  }
  return null;
}

/** Does the engine know this card: its data, and a script unless it is a Normal Monster without effects? */
export function engineKnows(card: Card, data: Map<number, EngineCard>): boolean {
  const code = [card.id, ...card.altIds].find((id) => data.has(id));
  if (code === undefined) return false;
  const entry = data.get(code)!;
  const base = entry.alias && Math.abs(entry.alias - entry.code) < 20 ? entry.alias : entry.code; // alternate artwork
  const isNormalMonster = (entry.type & 0x11) === 0x11 && (entry.type & 0x20) === 0;
  return isNormalMonster || scriptPath(`c${base}.lua`) !== null || scriptPath(`c${entry.code}.lua`) !== null;
}

/** Master Duel cards the engine cannot play yet. */
export function engineGaps(cards: Card[], data: Map<number, EngineCard>): Card[] {
  return cards.filter((card) => inMasterDuel(card) && !engineKnows(card, data));
}

/** Read a script for the engine from the cached scripts; null when there is none. */
export function readScriptFile(name: string): string | null {
  const file = scriptPath(name);
  return file ? readFileSync(file, "utf8") : null;
}
