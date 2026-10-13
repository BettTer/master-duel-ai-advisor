// Build-time data for the web version: the Master Duel card pool, the banlist, and the rules engine's card
// database and scripts, which the browser cannot fetch from their sources directly. Run before `vite build`.
import { cpSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { loadBanlist } from "../src/banlist.ts";
import { SCRIPTS_DIR, loadEngineData } from "../src/engine-data.ts";
import { fetchMdPool } from "../src/mdm.ts";

const out = new URL("../web/public/", import.meta.url).pathname;
mkdirSync(join(out, "data"), { recursive: true });

const pool = await fetchMdPool();
writeFileSync(join(out, "data/md-pool.json"), JSON.stringify([...pool]));
console.log(`MD pool: ${pool.size} cards`);

const banlist = await loadBanlist(true);
if (!banlist) throw new Error("no banlist");
writeFileSync(join(out, "data/banlist.json"), JSON.stringify(banlist));
console.log(`banlist: ${banlist.current.date} (${banlist.source})`);

const engineCards = await loadEngineData(0);
rmSync(join(out, "engine"), { recursive: true, force: true });
mkdirSync(join(out, "engine"), { recursive: true });
writeFileSync(join(out, "engine/cards.json"), JSON.stringify([...engineCards.values()]));
// Scripts are served one file each, so a deck only loads the few it uses; the libraries at the top level are
// listed so the browser knows what to preload.
cpSync(SCRIPTS_DIR, join(out, "engine/scripts"), { recursive: true });
const libraries = readdirSync(SCRIPTS_DIR).filter((name) => name.endsWith(".lua"));
writeFileSync(join(out, "engine/libraries.json"), JSON.stringify(libraries));
console.log(`engine: ${engineCards.size} cards, ${libraries.length} libraries, scripts copied`);
writeFileSync(join(out, "data/built.json"), JSON.stringify({ builtAt: new Date().toISOString() }));
