// KONAMI does not publish Master Duel Forbidden & Limited lists in a machine-readable form.
// The banlist comes from masterduelmeta.com (current statuses plus the dated history of list
// changes), with the yaml-yugi limit regulation data (rebuilt daily from Yugipedia) as a fallback.
import { existsSync } from "node:fs";
import { DAY, ageOf, cachePath, readJson, writeText } from "./cache.ts";
import { fetchJson } from "./http.ts";
import { jstDate, type Banlist, type Entry, type Regulation, type Status } from "./banstatus.ts";

export * from "./banstatus.ts";
import { ENDPOINTS_CACHE, MDM_KNOWN_ENDPOINTS, discoverMdmEndpoints, encodeQuery, type Endpoints, type GetJson } from "./mdm.ts";

const BANLIST_CACHE = cachePath("md_banlist.json");
const BANLIST_MAX_AGE = DAY;

const MDM_STATUS: Record<string, Status> = { "Forbidden": "forbidden", "Limited 1": "limited1", "Limited 2": "limited2" };
const LIMIT_STATUS: Record<number, Status> = { 0: "forbidden", 1: "limited1", 2: "limited2" };
const YAML_YUGI_URL = "https://dawnbrandbots.github.io/yaml-yugi-limit-regulation/master-duel/{}.vector.json";

export async function readMasterDuelMeta(endpoints: Endpoints, get: GetJson = fetchJson): Promise<Omit<Banlist, "source">> {
  const rows: any[] = await get(encodeQuery(endpoints.cards));
  const statuses = new Map<string, Entry>();
  for (const row of rows) {
    if (row.banStatus in MDM_STATUS) {
      statuses.set(row.name, { id: row.konamiID ? Number(row.konamiID) : null, name: row.name, status: MDM_STATUS[row.banStatus] });
    }
  }
  if (statuses.size < 20) {
    throw new Error(`only ${statuses.size} cards with a Master Duel status; the data format may have changed`);
  }
  const changes: any[] = await get(encodeQuery(endpoints.changes));
  for (const change of changes) change.date ??= change.announced; // a few old records only have "announced"
  const now = Date.now();
  const time = (change: any) => new Date(change.date).getTime();
  const inEffect = changes.filter((change) => time(change) <= now).sort((a, b) => time(b) - time(a));
  const pending = changes.filter((change) => time(change) > now).sort((a, b) => time(a) - time(b));
  if (inEffect.length === 0) throw new Error("no list in effect");

  const current = new Map(statuses);
  let upcoming: Regulation | null = null;
  if (pending.length > 0) {
    // For the cards an announced list changes, "from" is the status in force and "to" the coming one.
    const next = new Map(statuses);
    for (const change of pending[0].changes) {
      const name: string = change.card.name;
      const known = statuses.get(name) ?? { id: null, name };
      for (const [target, field] of [[current, "from"], [next, "to"]] as const) {
        if (change[field] in MDM_STATUS) target.set(name, { ...known, status: MDM_STATUS[change[field]] });
        else target.delete(name);
      }
    }
    upcoming = { date: jstDate(pending[0].date), entries: [...next.values()] };
  }
  return { current: { date: jstDate(inEffect[0].date), entries: [...current.values()] }, upcoming };
}

async function banlistFromMasterDuelMeta(): Promise<Omit<Banlist, "source">> {
  const candidates: [string, Endpoints][] = [];
  try {
    candidates.push(["rediscovered", await discoverMdmEndpoints()]);
  } catch (error) {
    console.error(`Could not rediscover Master Duel Meta's banlist endpoints (${error}).`);
  }
  if (existsSync(ENDPOINTS_CACHE)) candidates.push(["last working", readJson(ENDPOINTS_CACHE)]);
  candidates.push(["known", MDM_KNOWN_ENDPOINTS]);

  const tried = new Set<string>();
  const errors: string[] = [];
  for (const [label, endpoints] of candidates) {
    const key = JSON.stringify(endpoints);
    if (tried.has(key)) continue;
    tried.add(key);
    try {
      const banlist = await readMasterDuelMeta(endpoints);
      writeText(ENDPOINTS_CACHE, key);
      return banlist;
    } catch (error) {
      errors.push(`${label} endpoints: ${error}`);
    }
  }
  throw new Error(errors.join("; "));
}

async function banlistFromYamlYugi(): Promise<Omit<Banlist, "source">> {
  const entries = (vector: any): Entry[] =>
    Object.entries(vector.regulation).map(([cid, limit]) => ({ cid: Number(cid), status: LIMIT_STATUS[limit as number] }));
  const current = await fetchJson(YAML_YUGI_URL.replace("{}", "current"), 15);
  let upcoming = null;
  try {
    upcoming = await fetchJson(YAML_YUGI_URL.replace("{}", "upcoming"), 15);
  } catch {
    // only published while a new list is announced but not in effect yet
  }
  return {
    current: { date: current.date, entries: entries(current) },
    upcoming: upcoming && { date: upcoming.date, entries: entries(upcoming) },
  };
}

const SOURCES: [string, () => Promise<Omit<Banlist, "source">>][] = [
  ["masterduelmeta.com", banlistFromMasterDuelMeta],
  ["yaml-yugi", banlistFromYamlYugi],
];

/** The Master Duel banlist, refreshed at most once a day; null if it could never be downloaded. */
export async function loadBanlist(force = false): Promise<Banlist | null> {
  if (force || ageOf(BANLIST_CACHE) > BANLIST_MAX_AGE) {
    const errors: string[] = [];
    let banlist: Banlist | null = null;
    for (const [source, download] of SOURCES) {
      try {
        banlist = { ...(await download()), source };
        break;
      } catch (error) {
        errors.push(`${source}: ${error}`);
      }
    }
    if (banlist) {
      writeText(BANLIST_CACHE, JSON.stringify(banlist));
    } else if (existsSync(BANLIST_CACHE)) {
      console.error(`Could not refresh the Master Duel banlist (${errors.join("; ")}); using the last downloaded copy.`);
    } else {
      console.error(`Could not download the Master Duel banlist (${errors.join("; ")}).`);
      return null;
    }
  }
  return readJson(BANLIST_CACHE);
}
