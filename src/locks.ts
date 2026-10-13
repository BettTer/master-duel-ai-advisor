// Extra Deck locks such as "这个回合，自己不是同调怪兽不能从额外卡组特殊召唤", and which locks in a deck
// cannot share a turn because no Extra Deck monster in the deck satisfies both.
import type { Card } from "./cards.ts";
import { zhKinds } from "./query.ts";

type InArchetype = (card: Card, archetype: string) => boolean;

export type Timing = "whole-turn" | "rest-of-turn" | "until-next-turn" | "while-present";

/** Which Extra Deck monsters a lock still allows. Within a list any entry may match; all lists must match. */
export interface Allowed {
  kinds: string[]; // 融合 同调 超量 连接 灵摆
  archetypes: string[];
  races: string[];
  attributes: string[];
  level?: [number, number]; // inclusive range; Rank for Xyz monsters
  maxAtk?: number;
}

export interface Lock {
  card: Card;
  effect: string; // ①, ②… or "" when the lock is not tied to a numbered effect
  text: string; // the sentence as printed
  timing: Timing;
  bothPlayers: boolean;
  allowed: Allowed | "none" | null; // "none": no Extra Deck summons at all; null: wording not understood
}

const KINDS = ["融合", "同调", "超量", "连接", "灵摆"];

/** Parse the monster description between 不是 and 不能从额外卡组特殊召唤, e.g. "8星的融合·同调怪兽". */
export function parseAllowed(subject: string): Allowed | null {
  let rest = subject;
  const take = (pattern: RegExp): RegExpMatchArray[] => {
    const matches = [...rest.matchAll(pattern)];
    rest = rest.replace(pattern, " ");
    return matches;
  };
  const allowed: Allowed = { kinds: [], archetypes: [], races: [], attributes: [] };
  allowed.archetypes = take(/「([^」]+)」/g).map((match) => match[1]);
  const level = take(/(\d+)(星|阶)(以上|以下)?的?/g)[0];
  if (level) {
    const value = Number(level[1]);
    allowed.level = level[3] === "以上" ? [value, 99] : level[3] === "以下" ? [0, value] : [value, value];
  }
  const atk = take(/(?:原本)?攻击力(?:是)?(\d+)以下的?/g)[0];
  if (atk) allowed.maxAtk = Number(atk[1]);
  for (const match of take(/((?:[光暗地水炎风神]·)*[光暗地水炎风神])属性的?/g)) allowed.attributes.push(...match[1].split("·"));
  for (const match of take(/([^\s·的「」]+?族(?:·[^\s·的「」]+?族)*)/g)) {
    allowed.races.push(...match[1].split("·").map((race) => race.replace(/族$/, "")));
  }
  for (const match of take(/((?:融合|同调|超量|连接|灵摆)(?:·(?:融合|同调|超量|连接|灵摆))*)/g)) {
    allowed.kinds.push(...match[1].split("·"));
  }
  // Whatever is left should only be glue words; anything else means the wording was not understood.
  return rest.replace(/怪兽|以及|的|·|\s/g, "") === "" ? allowed : null;
}

export function allows(allowed: Allowed, card: Card, inArchetype: InArchetype): boolean {
  const { kinds, race, attr } = zhKinds(card);
  if (allowed.kinds.length > 0 && !allowed.kinds.some((kind) => kinds.has(kind))) return false;
  if (allowed.archetypes.length > 0 && !allowed.archetypes.some((archetype) => inArchetype(card, archetype))) return false;
  if (allowed.races.length > 0 && !allowed.races.includes(race)) return false;
  if (allowed.attributes.length > 0 && !allowed.attributes.includes(attr)) return false;
  if (allowed.level && (card.level === null || card.level < allowed.level[0] || card.level > allowed.level[1])) return false;
  if (allowed.maxAtk !== undefined && (card.atk === null || card.atk > allowed.maxAtk)) return false;
  return true;
}

function timingOf(context: string): Timing {
  if (/发动的回合|特殊召唤过的回合/.test(context)) return "whole-turn";
  if (/直到下次的自己回合/.test(context)) return "until-next-turn";
  if (/回合|发动后/.test(context)) return "rest-of-turn";
  return "while-present"; // "只要…" or an effect that is only the lock: it applies while the card is on the field
}

// 自己不是X不能… / 自己若非X则不能… name what is still allowed; 自己不用X不能… (a material condition) is shown as text.
const LOCK = /(双方|自己)(?:不是([^，。；]*?)不能从额外卡组特殊召唤|若非([^，。；]*?)则不能从额外卡组(?:把怪兽)?特殊召唤|不用([^，。；]*?)不能从额外卡组把怪兽特殊召唤|不能从额外卡组把怪兽特殊召唤)/g;

/** Every Extra Deck lock in a card's text, with the numbered effect it belongs to. */
export function parseLocks(card: Card): Lock[] {
  const locks: Lock[] = [];
  // Split the text into the part before ① and one part per numbered effect.
  const parts = card.descZh.split(/(?=[①②③④⑤⑥⑦⑧⑨])/);
  for (const part of parts) {
    const effect = /^[①②③④⑤⑥⑦⑧⑨]/.test(part) ? part[0] : "";
    for (const sentence of part.split(/(?<=。)/)) {
      for (const match of sentence.matchAll(LOCK)) {
        locks.push({
          card,
          effect,
          text: sentence.trim().replace(/^[①②③④⑤⑥⑦⑧⑨]：/, ""),
          timing: timingOf(sentence.slice(0, match.index)),
          bothPlayers: match[1] === "双方",
          allowed: match[4] !== undefined ? null : (match[2] ?? match[3]) === undefined ? "none" : parseAllowed(match[2] ?? match[3]),
        });
      }
    }
  }
  return locks;
}

export interface LockReport {
  lock: Lock;
  blocked: Card[]; // Extra Deck monsters in the deck the lock rules out
}

export interface LockPair {
  first: Lock;
  second: Lock;
  remaining: Card[]; // Extra Deck monsters both locks still allow
}

/** The locks in a deck, what each rules out of its Extra Deck, and the pairs that narrow it further. */
export function analyzeLocks(deckCards: Card[], extraDeck: Card[], inArchetype: InArchetype): { locks: LockReport[]; pairs: LockPair[] } {
  const locks = deckCards.flatMap(parseLocks);
  const allowedBy = (lock: Lock): Card[] | null =>
    lock.allowed === null ? null : lock.allowed === "none" ? [] : extraDeck.filter((card) => allows(lock.allowed as Allowed, card, inArchetype));
  const reports = locks.map((lock) => {
    const allowed = allowedBy(lock);
    return { lock, blocked: allowed === null ? [] : extraDeck.filter((card) => !allowed.includes(card)) };
  });
  const pairs: LockPair[] = [];
  for (let i = 0; i < locks.length; i++) {
    for (let j = i + 1; j < locks.length; j++) {
      const [first, second] = [locks[i], locks[j]];
      const [a, b] = [allowedBy(first), allowedBy(second)];
      if (first.card.id === second.card.id || !a || !b || a.length === 0 || b.length === 0) continue;
      const remaining = a.filter((card) => b.includes(card));
      if (remaining.length < Math.min(a.length, b.length)) pairs.push({ first, second, remaining });
    }
  }
  return { locks: reports, pairs };
}
