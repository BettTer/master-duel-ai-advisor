#!/usr/bin/env node
import {
  DAY,
  DRAW_PENALTY,
  HAND_TRAPS,
  LEVELS,
  SEEN_SLOTS,
  ageOf,
  archetypesOf,
  boardOrder,
  cachePath,
  changeDeck,
  createPlanner,
  createWorkerHandler,
  drawNamed,
  fetchBytes,
  fetchJson,
  formatPlan,
  formatProfile,
  loadDeck,
  parseTiers,
  planHand,
  readJson,
  resolveTiers,
  sharedSeen,
  startEngine,
  unzipSync,
  writeText
} from "./chunk-TZOZXHST.mjs";
import "./chunk-KT3BCFM7.mjs";
import "./chunk-5P7U5YBU.mjs";

// src/plan.ts
import { availableParallelism } from "node:os";
import { Worker, isMainThread, parentPort, workerData } from "node:worker_threads";
import { createHash } from "node:crypto";
import { existsSync as existsSync2 } from "node:fs";

// src/engine-data.ts
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
var BABEL_CONTENTS = "https://api.github.com/repos/ProjectIgnis/BabelCDB/contents";
var SCRIPTS_COMMIT = "https://api.github.com/repos/ProjectIgnis/CardScripts/commits?per_page=1";
var SCRIPTS_ZIP = "https://codeload.github.com/ProjectIgnis/CardScripts/zip/refs/heads/master";
var ENGINE_DIR = cachePath("engine");
var CARDS_FILE = join(ENGINE_DIR, "cards.json");
var VERSIONS_FILE = join(ENGINE_DIR, "versions.json");
var SCRIPTS_DIR = join(ENGINE_DIR, "scripts");
var SCRIPT_FOLDERS = ["official", "pre-release", ".", "pre-errata", "unofficial"];
function wanted(name) {
  return /^(cards|release-.+|prerelease-.+)\.cdb$/.test(name) && !/rush|skill|goat|unofficial/.test(name);
}
var order = (name) => name === "cards.cdb" ? 0 : name.startsWith("prerelease") ? 1 : 2;
async function latestVersions() {
  const [contents, commits] = await Promise.all([fetchJson(BABEL_CONTENTS), fetchJson(SCRIPTS_COMMIT)]);
  const files = contents.filter((file) => wanted(file.name));
  if (files.length === 0 || !commits[0]?.sha) throw new Error("GitHub \u8FD4\u56DE\u7684\u5185\u5BB9\u4E0D\u50CF\u5361\u5E93\u548C\u811A\u672C\u4ED3\u5E93");
  return {
    versions: { databases: Object.fromEntries(files.map((file) => [file.name, file.sha])), scripts: commits[0].sha },
    urls: Object.fromEntries(files.map((file) => [file.name, file.download_url]))
  };
}
async function readDatabases(files) {
  let sqlite;
  try {
    sqlite = await import("node:sqlite");
  } catch {
    throw new Error(`\u8DEF\u7EBF\u89C4\u5212\u8981\u8BFB SQLite \u5361\u5E93\uFF0C\u9700\u8981 Node.js 22.13 \u6216\u66F4\u9AD8\u7248\u672C\uFF08\u73B0\u5728\u662F ${process.version}\uFF09`);
  }
  const cards = /* @__PURE__ */ new Map();
  const temp = join(ENGINE_DIR, "temp.cdb");
  mkdirSync(ENGINE_DIR, { recursive: true });
  for (const bytes of files) {
    writeFileSync(temp, bytes);
    const db = new sqlite.DatabaseSync(temp, { readOnly: true });
    const statement = db.prepare("SELECT id, alias, setcode, type, atk, def, level, race, attribute FROM datas");
    statement.setReadBigInts(true);
    for (const row of statement.all()) {
      const type = Number(row.type);
      const level = Number(row.level);
      const isLink = (type & 67108864) !== 0;
      const setcodes = [];
      for (let rest = BigInt.asUintN(64, row.setcode); rest > 0n; rest >>= 16n) setcodes.push(Number(rest & 0xffffn));
      cards.set(Number(row.id), {
        code: Number(row.id),
        alias: Number(row.alias),
        setcodes,
        type,
        attack: Number(row.atk),
        defense: isLink ? 0 : Number(row.def),
        link_marker: isLink ? Number(row.def) : 0,
        level: level & 255,
        lscale: level >> 24 & 255,
        rscale: level >> 16 & 255,
        race: Number(row.race),
        attribute: Number(row.attribute)
      });
    }
    db.close();
  }
  rmSync(temp, { force: true });
  return [...cards.values()];
}
async function downloadDatabases(urls) {
  const names = Object.keys(urls).sort((a, b) => order(a) - order(b) || a.localeCompare(b));
  const files = await Promise.all(names.map((name) => fetchBytes(urls[name], 180)));
  writeText(CARDS_FILE, JSON.stringify(await readDatabases(files)));
}
async function downloadScripts() {
  console.error("Downloading card scripts for the rules engine (about 25 MB)...");
  const archive = unzipSync(await fetchBytes(SCRIPTS_ZIP, 600), {
    // Only what the engine reads: shared libraries at the top level, card folders, and the one unofficial library
    // utility.lua loads.
    filter: (file) => /^[^/]+\/((official|pre-release|pre-errata)\/)?[^/]+\.lua$|\/unofficial\/proc_unofficial\.lua$/.test(file.name)
  });
  rmSync(SCRIPTS_DIR, { recursive: true, force: true });
  for (const [name, bytes] of Object.entries(archive)) {
    const target = join(SCRIPTS_DIR, name.slice(name.indexOf("/") + 1));
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, bytes);
  }
}
var memo = null;
async function loadEngineData(maxAge = DAY) {
  const cached = existsSync(VERSIONS_FILE) ? readJson(VERSIONS_FILE) : null;
  const complete = cached !== null && existsSync(CARDS_FILE) && existsSync(SCRIPTS_DIR);
  if (!complete || ageOf(VERSIONS_FILE) >= maxAge) {
    try {
      const { versions, urls } = await latestVersions();
      const databasesChanged = !complete || JSON.stringify(versions.databases) !== JSON.stringify(cached.databases);
      if (databasesChanged) await downloadDatabases(urls);
      if (!complete || versions.scripts !== cached.scripts) await downloadScripts();
      writeText(VERSIONS_FILE, JSON.stringify(versions));
      if (databasesChanged) memo = null;
    } catch (error) {
      if (!complete) throw new Error(`\u6CA1\u80FD\u4E0B\u8F7D\u89C4\u5219\u5F15\u64CE\u7684\u6570\u636E\uFF1A${error instanceof Error ? error.message : error}`);
      console.error(`Could not check the rules engine data for updates (${error}); using the cached copy.`);
    }
  }
  memo ??= new Map(readJson(CARDS_FILE).map((card) => [card.code, card]));
  return memo;
}
function scriptPath(name) {
  for (const folder of SCRIPT_FOLDERS) {
    const file = join(SCRIPTS_DIR, folder, name);
    if (existsSync(file)) return file;
  }
  return null;
}
function engineKnows(card, data) {
  const code = [card.id, ...card.altIds].find((id) => data.has(id));
  if (code === void 0) return false;
  const entry = data.get(code);
  const base = entry.alias && Math.abs(entry.alias - entry.code) < 20 ? entry.alias : entry.code;
  const isNormalMonster = (entry.type & 17) === 17 && (entry.type & 32) === 0;
  return isNormalMonster || scriptPath(`c${base}.lua`) !== null || scriptPath(`c${entry.code}.lua`) !== null;
}
function readScriptFile(name) {
  const file = scriptPath(name);
  return file ? readFileSync(file, "utf8") : null;
}

// src/profile.ts
function random(seed) {
  let state = seed >>> 0 || 1;
  return () => {
    state ^= state << 13;
    state >>>= 0;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    return state / 4294967296;
  };
}
function drawHand(pile, size, next) {
  const rest = [...pile];
  const hand = [];
  for (let i = 0; i < size && rest.length > 0; i++) hand.push(...rest.splice(Math.floor(next() * rest.length), 1));
  return { hand, rest };
}
var handKey = (hand) => hand.map((card) => card.id).sort((a, b) => a - b).join(",");
async function profileDeck(deck, planner, lines, setupFor, options) {
  const started = performance.now();
  const pile = deck.main.flatMap((entry) => Array(entry.count).fill(entry.card));
  const next = random(options.seed);
  const wanted2 = /* @__PURE__ */ new Map();
  for (let i = 0; i < options.hands; i++) {
    const drawn = drawHand(pile, 5, next);
    const key = handKey(drawn.hand);
    const known = wanted2.get(key);
    if (known) known.weight++;
    else wanted2.set(key, { ...drawn, weight: 1 });
  }
  const hands = [];
  let done = 0;
  for (const [key, { hand, rest, weight }] of wanted2) {
    let entry = options.cache.get(key);
    if (!entry) {
      const result = await planner.plan(setupFor(hand, rest), { nodes: 1e6, seconds: options.seconds }, false);
      entry = { board: result.boards[0] ?? null, seconds: result.seconds };
      options.cache.set(key, entry);
    }
    const handResult = { key, cards: hand, weight, board: entry.board, seconds: entry.seconds };
    hands.push(handResult);
    options.progress?.(++done, wanted2.size, handResult);
  }
  return { deckLabel: options.label, hands, samples: options.hands, distinct: wanted2.size, seconds: (performance.now() - started) / 1e3 };
}

// src/plan.ts
if (!isMainThread && workerData?.role === "plan-worker") void runWorker(workerData);
async function runWorker(setup) {
  const engine = await startEngine(await loadEngineData(Infinity), readScriptFile);
  const handle = createWorkerHandler(engine, setup, (message) => parentPort.postMessage(message));
  parentPort.on("message", handle);
  parentPort.postMessage({ started: true });
}
function spawnWorker(setup) {
  const worker = new Worker(new URL(import.meta.url), { workerData: setup });
  return {
    post: (message) => worker.postMessage(message),
    onMessage: (handler) => {
      worker.removeAllListeners("message");
      worker.on("message", handler);
    },
    onError: (handler) => {
      worker.removeAllListeners("error");
      worker.on("error", handler);
    },
    terminate: async () => {
      await worker.terminate();
    }
  };
}
async function prepare(input, tiersText) {
  const { cards, deck } = await loadDeck(input);
  const deckCards = [...deck.main, ...deck.extra].map((entry) => entry.card);
  let data = await loadEngineData();
  if (deckCards.some((card) => !engineKnows(card, data))) data = await loadEngineData(300);
  const missing = deckCards.filter((card) => !engineKnows(card, data));
  const code = (card) => [card.id, ...card.altIds].find((id) => data.has(id)) ?? card.id;
  const tiers = parseTiers(tiersText, deck, cards);
  const byCode = /* @__PURE__ */ new Map();
  for (const card of [...cards, ...deckCards]) for (const id of [code(card), card.id, ...card.altIds]) byCode.set(id, card);
  const engine = await startEngine(data, readScriptFile);
  const lines = resolveTiers(tiers, deckCards, archetypesOf(cards));
  const planner = createPlanner(engine, (id) => byCode.get(id), [...byCode], lines, spawnWorker, Math.max(1, Math.min(availableParallelism() - 1, 8)));
  const extra = deck.extra.flatMap((entry) => Array(entry.count).fill(code(entry.card)));
  const setupFor = (hand, rest) => ({ hand: hand.map(code), main: rest.map(code), extra, opponentHand: Object.values(HAND_TRAPS) });
  const notes = () => {
    const libraries = [...engine.missingScripts].filter((name) => !/^c\d+\.lua$/.test(name));
    return { problems: tiers.problems, missing, libraries };
  };
  return { cards, deck, tiers, lines, planner, setupFor, notes, code };
}
async function planText(input, handText, tiersText, limits) {
  const { deck, planner, setupFor, notes } = await prepare(input, tiersText);
  try {
    const { hand, rest } = drawNamed(deck, handText);
    const result = await planner.plan(setupFor(hand, rest), limits, true);
    const { problems, missing, libraries } = notes();
    return formatPlan(hand, result, problems, missing, libraries);
  } finally {
    await planner.close();
  }
}
function fileCache(deck, lines, seconds) {
  const hash = createHash("sha256");
  hash.update(deck.main.map((entry) => `${entry.card.id}x${entry.count}`).sort().join(","));
  hash.update("|" + deck.extra.map((entry) => `${entry.card.id}x${entry.count}`).sort().join(","));
  hash.update("|" + JSON.stringify(lines.map((line) => ({ ...line, card: line.card.id }))));
  hash.update(`|${seconds}|${LEVELS.map((level) => level.weight).join(",")}|v1`);
  const file = cachePath(`profiles/${hash.digest("hex").slice(0, 16)}.json`);
  const entries = existsSync2(file) ? readJson(file) : {};
  return {
    get: (key) => entries[key] ?? null,
    set: (key, value) => {
      entries[key] = value;
      writeText(file, JSON.stringify(entries));
    }
  };
}
async function profileText(input, tiersText, options) {
  const { cards, deck, lines, planner, setupFor, notes } = await prepare(input, tiersText);
  try {
    const progress = (label) => (done, total, hand) => options.progress?.(`${label}${done}/${total} ${hand.cards.map((card) => card.cn || card.en).join("\u3001")} \u2192 ${hand.board ? hand.board.value : "\u65E0"}\uFF08${hand.seconds.toFixed(0)} \u79D2\uFF09`);
    const seed = 20261013;
    const cache = fileCache(deck, lines, options.seconds);
    const base = await profileDeck(deck, planner, lines, setupFor, { hands: options.hands, seconds: options.seconds, seed, label: deck.name || "\u73B0\u5728\u7684\u5361\u7EC4", progress: progress(""), cache });
    let changed = null;
    if (options.change) {
      const { deck: other, label } = changeDeck(deck, options.change, cards);
      changed = await profileDeck(other, planner, lines, (hand, rest) => setupFor(hand, rest), { hands: options.hands, seconds: options.seconds, seed, label, progress: progress("\u6539\u52A8\u540E "), cache: fileCache(other, lines, options.seconds) });
    }
    const { problems, missing, libraries } = notes();
    return formatProfile(base, changed, problems, missing, libraries);
  } finally {
    await planner.close();
  }
}
export {
  DRAW_PENALTY,
  HAND_TRAPS,
  LEVELS,
  SEEN_SLOTS,
  boardOrder,
  createPlanner,
  createWorkerHandler,
  drawNamed,
  parseTiers,
  planHand,
  planText,
  prepare,
  profileText,
  resolveTiers,
  sharedSeen
};
