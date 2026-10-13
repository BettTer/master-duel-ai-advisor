// Opening-hand route planner on Node: worker threads, engine data from the cache directory, and the text entry
// points for the command line and MCP. The search itself is in search.ts.
import { availableParallelism } from "node:os";
import { Worker, isMainThread, parentPort, workerData } from "node:worker_threads";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { cachePath, readJson, writeText } from "./cache.ts";
import type { Card } from "./cards.ts";
import type { Deck } from "./deck.ts";
import type { Board, ResolvedLine } from "./search.ts";
import { engineKnows, loadEngineData, readScriptFile } from "./engine-data.ts";
import { startEngine } from "./engine.ts";
import { formatPlan, formatProfile } from "./format.ts";
import { changeDeck } from "./odds.ts";
import { profileDeck, type HandResult, type Profile, type ProfileCache } from "./profile.ts";
import {
  HAND_TRAPS, LEVELS, createPlanner, createWorkerHandler, drawNamed, parseTiers, resolveTiers,
  type PlanWorker, type Setup, type WorkerSetup,
} from "./search.ts";
import { archetypesOf, loadDeck } from "./service.ts";

export * from "./search.ts";

if (!isMainThread && (workerData as WorkerSetup | undefined)?.role === "plan-worker") void runWorker(workerData as WorkerSetup);

async function runWorker(setup: WorkerSetup) {
  const engine = await startEngine(await loadEngineData(Infinity), readScriptFile);
  const handle = createWorkerHandler(engine, setup, (message) => parentPort!.postMessage(message));
  parentPort!.on("message", handle);
  parentPort!.postMessage({ started: true });
}

/** A Node worker thread running this module. */
function spawnWorker(setup: WorkerSetup): PlanWorker {
  const worker = new Worker(new URL(import.meta.url), { workerData: setup });
  return {
    post: (message) => worker.postMessage(message),
    onMessage: (handler) => { worker.removeAllListeners("message"); worker.on("message", handler); },
    onError: (handler) => { worker.removeAllListeners("error"); worker.on("error", handler); },
    terminate: async () => { await worker.terminate(); },
  };
}

/** Everything planText and the profile need from a deck: engine data, codes, the endpoint lines. */
export async function prepare(input: string, tiersText: string) {
  const { cards, deck } = await loadDeck(input);
  const deckCards = [...deck.main, ...deck.extra].map((entry) => entry.card);
  let data = await loadEngineData();
  if (deckCards.some((card) => !engineKnows(card, data))) data = await loadEngineData(300); // maybe added since the last check
  const missing = deckCards.filter((card) => !engineKnows(card, data));
  const code = (card: Card) => [card.id, ...card.altIds].find((id) => data.has(id)) ?? card.id;
  const tiers = parseTiers(tiersText, deck, cards);
  // Every card, so tokens and cards the engine brings in from outside the deck still get names; deck cards win.
  const byCode = new Map<number, Card>();
  for (const card of [...cards, ...deckCards]) for (const id of [code(card), card.id, ...card.altIds]) byCode.set(id, card);
  const engine = await startEngine(data, readScriptFile);
  const lines = resolveTiers(tiers, deckCards, archetypesOf(cards));
  const planner = createPlanner(engine, (id) => byCode.get(id), [...byCode], lines, spawnWorker, Math.max(1, Math.min(availableParallelism() - 1, 8)));
  const extra = deck.extra.flatMap((entry) => Array<number>(entry.count).fill(code(entry.card)));
  /** The engine setup for a hand drawn from the Main Deck. */
  const setupFor = (hand: Card[], rest: Card[]): Setup => ({ hand: hand.map(code), main: rest.map(code), extra, opponentHand: Object.values(HAND_TRAPS) });
  const notes = () => {
    const libraries = [...engine.missingScripts].filter((name) => !/^c\d+\.lua$/.test(name));
    return { problems: tiers.problems, missing, libraries };
  };
  return { cards, deck, tiers, lines, planner, setupFor, notes, code };
}

/** Plan the best board for an opening hand, going first. The entry point for the command line and MCP. */
export async function planText(input: string, handText: string, tiersText: string, limits: { nodes: number; seconds: number }): Promise<string> {
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
/** Profile results are cached per deck, endpoint list, time budget and model version, in the cache directory. */
function fileCache(deck: Deck, lines: ResolvedLine[], seconds: number): ProfileCache {
  const hash = createHash("sha256");
  hash.update(deck.main.map((entry) => `${entry.card.id}x${entry.count}`).sort().join(","));
  hash.update("|" + deck.extra.map((entry) => `${entry.card.id}x${entry.count}`).sort().join(","));
  hash.update("|" + JSON.stringify(lines.map((line) => ({ ...line, card: line.card.id }))));
  hash.update(`|${seconds}|${LEVELS.map((level) => level.weight).join(",")}|v1`);
  const file = cachePath(`profiles/${hash.digest("hex").slice(0, 16)}.json`);
  const entries: Record<string, { board: Board | null; seconds: number }> = existsSync(file) ? readJson(file) : {};
  return {
    get: (key) => entries[key] ?? null,
    set: (key, value) => { entries[key] = value; writeText(file, JSON.stringify(entries)); },
  };
}

/** Profile a deck, and a changed version of it when asked. The entry point for the command line and MCP. */
export async function profileText(
  input: string, tiersText: string, options: { hands: number; seconds: number; change?: string; progress?: (text: string) => void },
): Promise<string> {
  const { cards, deck, lines, planner, setupFor, notes } = await prepare(input, tiersText);
  try {
    const progress = (label: string) => (done: number, total: number, hand: HandResult) =>
      options.progress?.(`${label}${done}/${total} ${hand.cards.map((card) => card.cn || card.en).join("、")} → ${hand.board ? hand.board.value : "无"}（${hand.seconds.toFixed(0)} 秒）`);
    const seed = 20261013;
    const cache = fileCache(deck, lines, options.seconds);
    const base = await profileDeck(deck, planner, lines, setupFor, { hands: options.hands, seconds: options.seconds, seed, label: deck.name || "现在的卡组", progress: progress(""), cache });
    let changed: Profile | null = null;
    if (options.change) {
      const { deck: other, label } = changeDeck(deck, options.change, cards);
      // The changed deck needs its own endpoint lines only if the change added a card with a line; the lines are
      // keyed by card, so the same resolved lines still apply to the cards they name.
      changed = await profileDeck(other, planner, lines, (hand, rest) => setupFor(hand, rest), { hands: options.hands, seconds: options.seconds, seed, label, progress: progress("改动后 "), cache: fileCache(other, lines, options.seconds) });
    }
    const { problems, missing, libraries } = notes();
    return formatProfile(base, changed, problems, missing, libraries);
  } finally {
    await planner.close();
  }
}
