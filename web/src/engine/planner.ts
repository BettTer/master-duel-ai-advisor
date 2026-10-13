// The route planner in the browser: the engine on the main thread for expanding the tree, web workers for the
// search, scripts fetched for the deck in hand.
import type { Card } from "../../../src/merge.ts";
import type { Deck } from "../../../src/deck.ts";
import { startEngine } from "../../../src/engine.ts";
import { HAND_TRAPS, createPlanner, parseTiers, resolveTiers, type PlanWorker, type Planner, type ResolvedLine, type Setup, type Tiers, type WorkerSetup } from "../../../src/search.ts";
import { archetypeLookup } from "../../../src/query.ts";
import { libraryNames, loadEngineCards, loadScripts } from "../data/cards.ts";

export interface DeckPlanner {
  planner: Planner;
  tiers: Tiers;
  lines: ResolvedLine[];
  setupFor(hand: Card[], rest: Card[]): Setup;
  missing: Card[]; // deck cards the engine has no data for
  close(): Promise<void>;
}

const threads = () => Math.max(1, Math.min((navigator.hardwareConcurrency || 4) - 1, 8));

/** Prepare everything needed to plan hands of this deck with this endpoint list. */
export async function prepareDeck(cards: Card[], deck: Deck, tiersText: string, report: (text: string) => void = () => {}): Promise<DeckPlanner> {
  const deckCards = [...deck.main, ...deck.extra].map((entry) => entry.card);
  report("加载规则引擎的卡库…");
  const data = await loadEngineCards();
  const code = (card: Card) => [card.id, ...card.altIds].find((id) => data.has(id)) ?? card.id;
  const missing = deckCards.filter((card) => !data.has(code(card)));
  const needed = [...await libraryNames(), ...deckCards.map((card) => `c${code(card)}.lua`), ...Object.values(HAND_TRAPS).map((id) => `c${id}.lua`)];
  report(`加载 ${needed.length} 个卡片脚本…`);
  const scripts = await loadScripts(needed);
  const readScript = (name: string) => scripts.get(name) ?? null;
  const engine = await startEngine(data, readScript);
  const tiers = parseTiers(tiersText, deck, cards);
  const byCode = new Map<number, Card>();
  for (const card of [...cards, ...deckCards]) for (const id of [code(card), card.id, ...card.altIds]) byCode.set(id, card);
  const lines = resolveTiers(tiers, deckCards, archetypeLookup(cards));
  const scriptList: [string, string | null][] = [...scripts];
  const spawn = (setup: WorkerSetup): PlanWorker => {
    const worker = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });
    worker.postMessage({ init: { setup, scripts: scriptList } });
    return {
      post: (message) => worker.postMessage(message),
      onMessage: (handler) => { worker.onmessage = (event) => handler(event.data); },
      onError: (handler) => { worker.onerror = (event) => handler(event.error ?? event.message); },
      terminate: async () => worker.terminate(),
    };
  };
  const planner = createPlanner(engine, (id) => byCode.get(id), [...byCode], lines, spawn, threads());
  const extra = deck.extra.flatMap((entry) => Array<number>(entry.count).fill(code(entry.card)));
  return {
    planner, tiers, lines, missing,
    setupFor: (hand, rest) => ({ hand: hand.map(code), main: rest.map(code), extra, opponentHand: Object.values(HAND_TRAPS) }),
    close: () => planner.close(),
  };
}
