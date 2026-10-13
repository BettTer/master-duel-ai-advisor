// Deck profile: sample opening hands by their real probability, plan each with the rules engine, and report what
// the deck makes on average, how often it bricks, and what each card adds.
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { cachePath, readJson, writeText } from "./cache.ts";
import type { Card } from "./cards.ts";
import type { Deck } from "./deck.ts";
import { formatProfile } from "./format.ts";
import { changeDeck } from "./odds.ts";
import { LEVELS, prepare, type Board, type Planner, type ResolvedLine, type Setup } from "./plan.ts";

export interface HandResult {
  key: string; // sorted card ids
  cards: Card[];
  weight: number; // how many samples drew this hand
  board: Board | null; // the best board, or null when nothing could be done
  seconds: number;
}

export interface Profile {
  deckLabel: string;
  hands: HandResult[];
  samples: number;
  distinct: number;
  seconds: number;
}

/** A small seeded generator, so a changed deck draws the same hands where it can and reuses their results. */
export function random(seed: number): () => number {
  let state = seed >>> 0 || 1;
  return () => {
    state ^= state << 13; state >>>= 0;
    state ^= state >>> 17;
    state ^= state << 5; state >>>= 0;
    return state / 4294967296;
  };
}

/** Draw `size` cards from the pile without replacement; the seeded generator decides which. */
export function drawHand(pile: Card[], size: number, next: () => number): { hand: Card[]; rest: Card[] } {
  const rest = [...pile];
  const hand: Card[] = [];
  for (let i = 0; i < size && rest.length > 0; i++) hand.push(...rest.splice(Math.floor(next() * rest.length), 1));
  return { hand, rest };
}

export const handKey = (hand: Card[]) => hand.map((card) => card.id).sort((a, b) => a - b).join(",");

/** Results are cached per deck, endpoint list and model version, so reruns and changed decks only plan new hands. */
function cacheFile(deck: Deck, lines: ResolvedLine[], seconds: number): string {
  const hash = createHash("sha256");
  hash.update(deck.main.map((entry) => `${entry.card.id}x${entry.count}`).sort().join(","));
  hash.update("|" + deck.extra.map((entry) => `${entry.card.id}x${entry.count}`).sort().join(","));
  hash.update("|" + JSON.stringify(lines.map((line) => ({ ...line, card: line.card.id }))));
  hash.update(`|${seconds}|${LEVELS.map((level) => level.weight).join(",")}|v1`);
  return cachePath(`profiles/${hash.digest("hex").slice(0, 16)}.json`);
}

/**
 * Plan a sample of opening hands for a deck. Hands that come up more than once are planned once and weighted.
 * `progress` is told after each hand.
 */
export async function profileDeck(
  deck: Deck, planner: Planner, lines: ResolvedLine[], setupFor: (hand: Card[], rest: Card[]) => Setup,
  options: { hands: number; seconds: number; seed: number; label: string; progress?: (done: number, total: number, hand: HandResult) => void },
): Promise<Profile> {
  const started = performance.now();
  const pile = deck.main.flatMap((entry) => Array<Card>(entry.count).fill(entry.card));
  const next = random(options.seed);
  const wanted = new Map<string, { hand: Card[]; rest: Card[]; weight: number }>();
  for (let i = 0; i < options.hands; i++) {
    const drawn = drawHand(pile, 5, next);
    const key = handKey(drawn.hand);
    const known = wanted.get(key);
    if (known) known.weight++;
    else wanted.set(key, { ...drawn, weight: 1 });
  }
  const file = cacheFile(deck, lines, options.seconds);
  const cached: Record<string, { board: Board | null; seconds: number }> = existsSync(file) ? readJson(file) : {};
  const hands: HandResult[] = [];
  let done = 0;
  for (const [key, { hand, rest, weight }] of wanted) {
    let entry = cached[key];
    if (!entry) {
      const result = await planner.plan(setupFor(hand, rest), { nodes: 1_000_000, seconds: options.seconds }, false);
      entry = { board: result.boards[0] ?? null, seconds: result.seconds };
      cached[key] = entry;
      writeText(file, JSON.stringify(cached));
    }
    const handResult: HandResult = { key, cards: hand, weight, board: entry.board, seconds: entry.seconds };
    hands.push(handResult);
    options.progress?.(++done, wanted.size, handResult);
  }
  return { deckLabel: options.label, hands, samples: options.hands, distinct: wanted.size, seconds: (performance.now() - started) / 1000 };
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
    const base = await profileDeck(deck, planner, lines, setupFor, { hands: options.hands, seconds: options.seconds, seed, label: deck.name || "现在的卡组", progress: progress("") });
    let changed: Profile | null = null;
    if (options.change) {
      const { deck: other, label } = changeDeck(deck, options.change, cards);
      // The changed deck needs its own endpoint lines only if the change added a card with a line; the lines are
      // keyed by card, so the same resolved lines still apply to the cards they name.
      changed = await profileDeck(other, planner, lines, (hand, rest) => setupFor(hand, rest), { hands: options.hands, seconds: options.seconds, seed, label, progress: progress("改动后 ") });
    }
    const { problems, missing, libraries } = notes();
    return formatProfile(base, changed, problems, missing, libraries);
  } finally {
    await planner.close();
  }
}
