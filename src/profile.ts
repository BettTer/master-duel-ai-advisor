// Deck profile: sample opening hands by their real probability, plan each with the rules engine, and report what
// the deck makes on average, how often it bricks, and what each card adds.
import type { Card } from "./merge.ts";
import type { Deck } from "./deck.ts";
import type { Board, Planner, ResolvedLine, Setup } from "./search.ts";

/** Where planned hands are remembered between runs: a file on Node, IndexedDB in the browser. */
export interface ProfileCache {
  get(key: string): { board: Board | null; seconds: number } | null;
  set(key: string, value: { board: Board | null; seconds: number }): void;
}

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

/**
 * Plan a sample of opening hands for a deck. Hands that come up more than once are planned once and weighted.
 * `progress` is told after each hand.
 */
export async function profileDeck(
  deck: Deck, planner: Planner, lines: ResolvedLine[], setupFor: (hand: Card[], rest: Card[]) => Setup,
  options: { hands: number; seconds: number; seed: number; label: string; cache: ProfileCache; progress?: (done: number, total: number, hand: HandResult) => void },
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
  const hands: HandResult[] = [];
  let done = 0;
  for (const [key, { hand, rest, weight }] of wanted) {
    let entry = options.cache.get(key);
    if (!entry) {
      const result = await planner.plan(setupFor(hand, rest), { nodes: 1_000_000, seconds: options.seconds }, false);
      entry = { board: result.boards[0] ?? null, seconds: result.seconds };
      options.cache.set(key, entry);
    }
    const handResult: HandResult = { key, cards: hand, weight, board: entry.board, seconds: entry.seconds };
    hands.push(handResult);
    options.progress?.(++done, wanted.size, handResult);
  }
  return { deckLabel: options.label, hands, samples: options.hands, distinct: wanted.size, seconds: (performance.now() - started) / 1000 };
}

