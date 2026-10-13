// Opening-hand odds. The assistant writes, for each card that matters, what it needs and what it gives
// ("必密巴：要 手里 攻或守2500 怪兽 → 能动"). This module works out which opening hands can start the deck's
// plays and counts every possible hand exactly.
import type { Card } from "./merge.ts";
import type { Deck, DeckEntry } from "./deck.ts";
import { findCards, norm, zhKinds } from "./query.ts";
import { hasName } from "./refs.ts";

type InArchetype = (card: Card, archetype: string) => boolean;

/** Cards described the way card text does, e.g. "4星以下 战士族 怪兽" or "「再世」怪兽". */
export interface Group {
  text: string;
  names: string[];
  archetypes: string[];
  excluded: string[];
  kinds: string[];
  races: string[];
  attributes: string[];
  level?: [number, number];
  atk?: number;
  def?: number;
  atkOrDef?: number;
}

const KIND_WORDS = "怪兽|魔法|陷阱|调整|同调|融合|超量|连接|灵摆|仪式|效果|通常|速攻|永续|场地|装备|反击";
const RACES = ["战士", "魔法师", "天使", "恶魔", "不死", "机械", "水", "炎", "岩石", "鸟兽", "植物", "昆虫", "雷", "龙", "兽",
  "兽战士", "恐龙", "鱼", "海龙", "爬虫类", "念动力", "幻神兽", "创造神", "幻龙", "电子界", "幻想魔"]
  .sort((a, b) => b.length - a.length).join("|");

// Tried in order at the start of what is left of the description.
const GROUP_PARTS: [RegExp, (group: Group, match: RegExpMatchArray) => void][] = [
  [/^「([^」]+)」以外的?/, (group, [, name]) => group.excluded.push(name)],
  [new RegExp(`^「([^」]+)」(?=${KIND_WORDS}|卡)`), (group, [, name]) => group.archetypes.push(name)],
  [/^「([^」]+)」/, (group, [, name]) => group.names.push(name)],
  [/^(\d+)\s*[～~\-－]\s*(\d+)\s*星/, (group, [, low, high]) => (group.level = [Number(low), Number(high)])],
  [/^(\d+)\s*星(以上|以下)?/, (group, [, value, side]) => {
    group.level = side === "以上" ? [Number(value), 99] : side === "以下" ? [0, Number(value)] : [Number(value), Number(value)];
  }],
  [/^攻(?:击力)?或守(?:备力)?\s*(?:是|为)?\s*(\d+)/, (group, [, value]) => (group.atkOrDef = Number(value))],
  [/^攻(?:击力)?(?:和|与)?守(?:备力)?\s*都?(?:是|为)?\s*(\d+)/, (group, [, value]) => (group.atk = group.def = Number(value))],
  [/^攻(?:击力)?\s*(?:是|为)?\s*(\d+)/, (group, [, value]) => (group.atk = Number(value))],
  [/^守(?:备力)?\s*(?:是|为)?\s*(\d+)/, (group, [, value]) => (group.def = Number(value))],
  [new RegExp(`^(${RACES})族`), (group, [, race]) => group.races.push(race)],
  [/^([光暗地水炎风神](?:[·、]?[光暗地水炎风神])*)(?:属性)?/, (group, [, attributes]) => {
    group.attributes.push(...attributes.replace(/[·、]/g, ""));
  }],
  [/^不能通常召唤的?/, (group) => group.kinds.push("特殊召唤")],
  [new RegExp(`^(${KIND_WORDS})`), (group, [, kind]) => group.kinds.push(kind)],
  [/^(?:\d+(?:只|张)|其他的?|另一(?:只|张)的?|卡|的|是|[\s·、])/, () => {}],
];

/** Parse a card description. A bare card name without 「」 is accepted when it names exactly one card. */
export function parseGroup(text: string, pool: Card[] = []): Group {
  const group: Group = { text: text.trim(), names: [], archetypes: [], excluded: [], kinds: [], races: [], attributes: [] };
  let rest = group.text;
  next: while (rest) {
    for (const [pattern, apply] of GROUP_PARTS) {
      const match = rest.match(pattern);
      if (match?.[0]) {
        apply(group, match);
        rest = rest.slice(match[0].length);
        continue next;
      }
    }
    const named = pool.length > 0 ? findCards(pool, group.text) : [];
    if (named.length > 0 && new Set(named.map((card) => card.cn)).size === 1) {
      return { ...group, names: [named[0].cn || named[0].en], kinds: [], races: [], attributes: [] };
    }
    throw new Error(`看不懂"${rest}"（在"${group.text}"里）`);
  }
  if (Object.values(group).every((value) => !Array.isArray(value) || value.length === 0) && group.level === undefined
    && group.atk === undefined && group.def === undefined && group.atkOrDef === undefined) {
    throw new Error(`"${group.text}"没有写是什么卡`);
  }
  return group;
}

export function inGroup(card: Card, group: Group, inArchetype: InArchetype): boolean {
  if (group.excluded.some((name) => hasName(card, name))) return false;
  if (group.names.length > 0 && !group.names.some((name) => hasName(card, name))) return false;
  if (group.archetypes.length > 0 && !group.archetypes.some((archetype) => inArchetype(card, archetype))) return false;
  const { kinds, race, attr } = zhKinds(card);
  // 魔法 and 陷阱 together ("魔法·陷阱卡") mean either; every other kind word must apply.
  const spellTrap = group.kinds.filter((kind) => kind === "魔法" || kind === "陷阱");
  if (spellTrap.length > 0 && !spellTrap.some((kind) => kinds.has(kind))) return false;
  if (group.kinds.some((kind) => kind !== "魔法" && kind !== "陷阱" && !kinds.has(kind))) return false;
  if (group.races.length > 0 && !group.races.includes(race)) return false;
  if (group.attributes.length > 0 && !group.attributes.includes(attr)) return false;
  if (group.level && (card.level === null || card.level < group.level[0] || card.level > group.level[1])) return false;
  if (group.atk !== undefined && card.atk !== group.atk) return false;
  if (group.def !== undefined && card.def !== group.def) return false;
  if (group.atkOrDef !== undefined && card.atk !== group.atkOrDef && card.def !== group.atkOrDef) return false;
  return true;
}

/** One line of the rules: using a card when its needs are met gives something. */
export interface Move {
  card: Card;
  fromExtra: boolean; // an Extra Deck monster: summoned from the Extra Deck, not played from the hand
  text: string;
  normalSummon: boolean; // uses the turn's one Normal Summon
  hold: Group[]; // another card that must be in the hand and stays there, e.g. revealed
  discard: Group[]; // a card that leaves the hand to use this one: a cost, or a Fusion Material from the hand
  needs: string[]; // states such as 墓地有光暗
  search: Group[]; // cards added from the deck to the hand
  gives: string[];
  start: boolean; // 能动
}

export interface Rules {
  moves: Move[];
  second: string[]; // states assumed when going second, from the opponent's first turn
  problems: string[];
}

const SPLIT = /[；;，,]/;
const state = (text: string) => text.replace(/\s/g, "");
const items = (text: string) => text.split(SPLIT).map((item) => item.trim()).filter(Boolean);

function deckCard(deck: Deck, name: string): { card: Card; fromExtra: boolean } {
  for (const [section, fromExtra] of [["main", false], ["extra", true]] as const) {
    const exact = deck[section].find((entry) => hasName(entry.card, name));
    if (exact) return { card: exact.card, fromExtra };
  }
  const target = norm(name);
  const partial = [...deck.main, ...deck.extra].filter(({ card }) =>
    [card.cn, card.md, card.sc, card.jp, card.en].some((cardName) => cardName && norm(cardName).includes(target)));
  if (partial.length === 1) return { card: partial[0].card, fromExtra: deck.extra.includes(partial[0]) };
  if (partial.length > 1) throw new Error(`对上了好几张：${partial.slice(0, 3).map(({ card }) => `「${card.cn || card.en}」`).join("、")}`);
  throw new Error(deck.side.some((entry) => hasName(entry.card, name)) ? "在副卡组里，没有算" : "主卡组和额外卡组里都没有这张卡");
}

/**
 * Parse rules, one per line:
 *   卡名：要 条件；条件 → 给；给      条件: 手里 <卡>, 丢/素材 <卡>, 通召, or a state; 给: 拿 <卡>, 能动, or a state
 *   后手：状态；状态                  states the opponent's turn provides when going second
 */
export function parseRules(text: string, deck: Deck, pool: Card[]): Rules {
  const rules: Rules = { moves: [], second: [], problems: [] };
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim().replace(/^[-*•]\s*/, "");
    if (!line || line.startsWith("#")) continue;
    const head = line.match(/^(.+?)\s*[：:]\s*(.*)$/);
    if (!head) {
      rules.problems.push(`看不懂这一行："${line}"`);
      continue;
    }
    const [, name, body] = head;
    if (name === "后手") {
      rules.second.push(...items(body).map(state));
      continue;
    }
    try {
      const [needText, giveText, extra] = body.split(/→|->/);
      if (giveText === undefined || extra !== undefined) throw new Error("要写成\"要 … → …\"，中间一个箭头");
      const move: Move = {
        ...deckCard(deck, name.replace(/^「(.*)」$/, "$1")), text: body.trim(), normalSummon: false,
        hold: [], discard: [], needs: [], search: [], gives: [], start: false,
      };
      for (const need of items(needText.trim().replace(/^要/, ""))) {
        let match: RegExpMatchArray | null;
        if (/^通常?召唤?$|^通召$/.test(need)) move.normalSummon = true;
        else if ((match = need.match(/^(?:手里)?(?:丢(?:掉|弃)?|素材)\s*(.+)$/))) move.discard.push(parseGroup(match[1], pool));
        else if ((match = need.match(/^手里(?:另有|还有|有|另一(?:只|张))?\s*(.+)$/))) move.hold.push(parseGroup(match[1], pool));
        else move.needs.push(state(need));
      }
      for (const give of items(giveText)) {
        let match: RegExpMatchArray | null;
        if (state(give) === "能动") move.start = true;
        else if ((match = give.match(/^(?:拿|检索)\s*(.+)$/))) move.search.push(parseGroup(match[1], pool));
        else move.gives.push(state(give));
      }
      if (move.fromExtra && (move.hold.length > 0 || move.discard.length > 0 || move.normalSummon)) {
        throw new Error("额外卡组的怪兽只能写场上、墓地这类状态当条件");
      }
      rules.moves.push(move);
    } catch (error) {
      rules.problems.push(`「${name}」：${error instanceof Error ? error.message : error}`);
    }
  }
  const given = new Set([...rules.second, ...rules.moves.flatMap((move) => move.gives)]);
  for (const need of new Set(rules.moves.flatMap((move) => move.needs))) {
    if (!given.has(need)) rules.problems.push(`状态"${need}"有卡要，但没有卡给，也不在后手假设里（两边要写得一模一样）`);
  }
  if (!rules.moves.some((move) => move.start)) rules.problems.push("没有一行写了\"能动\"，所有起手都会算成不能动");
  return rules;
}

/** Main Deck cards each description matches, for showing what the tool understood. */
export function groupMatches(group: Group, deck: Deck, inArchetype: InArchetype): DeckEntry[] {
  return deck.main.filter(({ card }) => inGroup(card, group, inArchetype));
}

export interface Odds {
  playable: number; // share of opening hands that can start
  twoOrMore: number; // share with at least two separate starts
}

export interface OddsReport {
  size: number;
  first: Odds;
  second: Odds;
  secondAlone: Odds | null; // going second without the assumed states; null if none were given
}

const choose = (() => {
  const table: number[][] = [];
  return (n: number, k: number): number => {
    if (k < 0 || k > n) return 0;
    table[n] ??= [];
    if (table[n][k] === undefined) {
      let value = 1;
      for (let i = 1; i <= k; i++) value = (value * (n - k + i)) / i;
      table[n][k] = Math.round(value);
    }
    return table[n][k];
  };
})();

/** The rules compiled against a deck, and a search for the most separate starts a hand reaches. */
function solver(deck: Deck, rules: Rules, inArchetype: InArchetype) {
  // Several lines for one card are alternative ways to use it; a card is used once per hand.
  const cardBits = new Map<number, number>();
  for (const move of rules.moves) if (!cardBits.has(move.card.id)) cardBits.set(move.card.id, 1 << cardBits.size);
  if (cardBits.size > 30) throw new Error("规则最多写 30 张卡");
  // Only cards that a rule is about or that a description matches need telling apart; the rest are one pile.
  const relevant: DeckEntry[] = [];
  const typeOf = new Map<number, number>();
  const groups = rules.moves.flatMap((move) => [...move.hold, ...move.discard, ...move.search]);
  for (const entry of deck.main) {
    if (rules.moves.some((move) => move.card.id === entry.card.id) || groups.some((group) => inGroup(entry.card, group, inArchetype))) {
      typeOf.set(entry.card.id, relevant.length);
      relevant.push(entry);
    }
  }
  const types = (group: Group) => relevant.flatMap((entry, type) => (inGroup(entry.card, group, inArchetype) ? [type] : []));
  const states = new Map<string, number>();
  const bits = (list: string[]) => list.reduce((mask, name) => {
    if (!states.has(name)) states.set(name, states.size);
    return mask | (1 << states.get(name)!);
  }, 0);
  const moves = rules.moves
    .filter((move) => move.fromExtra ? deck.extra.some((entry) => entry.card.id === move.card.id) : typeOf.has(move.card.id))
    .map((move) => ({
      bit: cardBits.get(move.card.id)!,
      type: move.fromExtra ? -1 : typeOf.get(move.card.id)!,
      normalSummon: move.normalSummon,
      hold: move.hold.map(types),
      discard: move.discard.map(types),
      search: move.search.map(types),
      needs: bits(move.needs),
      gives: bits(move.gives),
      start: move.start,
    }));
  if (states.size + rules.second.length > 30) throw new Error("状态最多 30 种");
  const secondFacts = bits(rules.second);

  // The most separate starts (up to cap) reachable from this hand; hand and deck are restored before returning.
  const starts = (hand: Int8Array, pile: Int8Array, facts: number, used: number, summoned: boolean, cap: number): number => {
    let best = 0;
    const holds = (groups: number[][], position: number): boolean => {
      if (position === groups.length) return true;
      return groups[position].some((type) => {
        if (hand[type] === 0) return false;
        hand[type]--;
        const ok = holds(groups, position + 1);
        hand[type]++;
        return ok;
      });
    };
    for (const move of moves) {
      if (best >= cap) break;
      if (used & move.bit || (move.normalSummon && summoned) || (facts & move.needs) !== move.needs) continue;
      if (move.type >= 0 && hand[move.type] === 0) continue;
      const search = (position: number): number => {
        if (position === move.search.length) {
          const gain = move.start ? 1 : 0;
          return gain >= cap ? gain : gain + starts(hand, pile, facts | move.gives, used | move.bit, summoned || move.normalSummon, cap - gain);
        }
        let result = 0;
        for (const type of move.search[position]) {
          if (pile[type] === 0 || result >= cap) continue;
          pile[type]--;
          hand[type]++;
          result = Math.max(result, search(position + 1));
          pile[type]++;
          hand[type]--;
        }
        return result;
      };
      const discard = (position: number): number => {
        if (position === move.discard.length) return holds(move.hold, 0) ? search(0) : 0;
        let result = 0;
        for (const type of move.discard[position]) {
          if (hand[type] === 0 || result >= cap) continue;
          hand[type]--;
          result = Math.max(result, discard(position + 1));
          hand[type]++;
        }
        return result;
      };
      if (move.type >= 0) hand[move.type]--;
      best = Math.max(best, discard(0));
      if (move.type >= 0) hand[move.type]++;
    }
    return best;
  };

  return { relevant, typeOf, secondFacts, starts };
}

/** Separate starts for one opening hand given by card names: 0, 1, or 2 for two or more. */
export function startsInHand(deck: Deck, rules: Rules, inArchetype: InArchetype, names: string[], second = false): number {
  const { relevant, typeOf, secondFacts, starts } = solver(deck, rules, inArchetype);
  const hand = new Int8Array(relevant.length);
  for (const name of names) {
    const entry = deck.main.find((candidate) => hasName(candidate.card, name));
    if (!entry) throw new Error(`主卡组里没有「${name}」`);
    if (typeOf.has(entry.card.id)) hand[typeOf.get(entry.card.id)!]++;
  }
  const pile = Int8Array.from(relevant, (entry, type) => entry.count - hand[type]);
  return starts(hand, pile, second ? secondFacts : 0, 0, false, 2);
}

/** Exact odds over every opening hand of the Main Deck: 5 cards going first, 6 going second. */
export function handOdds(deck: Deck, rules: Rules, inArchetype: InArchetype): OddsReport {
  const { relevant, secondFacts, starts } = solver(deck, rules, inArchetype);
  const size = deck.main.reduce((sum, entry) => sum + entry.count, 0);
  const copies = relevant.map((entry) => entry.count);
  const others = size - copies.reduce((sum, count) => sum + count, 0);
  const tally = (handSize: number, facts: number[]): Odds[] => {
    const totals = facts.map(() => ({ playable: 0, twoOrMore: 0 }));
    const hand = new Int8Array(copies.length);
    const pile = new Int8Array(copies.length);
    const visit = (type: number, left: number, weight: number) => {
      if (type === copies.length) {
        if (left > others) return;
        const share = (weight * choose(others, left)) / choose(size, handSize);
        facts.forEach((initial, index) => {
          const count = starts(hand, pile, initial, 0, false, 2);
          if (count >= 1) totals[index].playable += share;
          if (count >= 2) totals[index].twoOrMore += share;
        });
        return;
      }
      for (let count = 0; count <= Math.min(copies[type], left); count++) {
        hand[type] = count;
        pile[type] = copies[type] - count;
        visit(type + 1, left - count, weight * choose(copies[type], count));
      }
      hand[type] = 0;
      pile[type] = copies[type];
    };
    visit(0, handSize, 1);
    return totals;
  };
  const [first] = tally(5, [0]);
  const [second, secondAlone] = tally(6, rules.second.length > 0 ? [secondFacts, 0] : [0]);
  return { size, first, second, secondAlone: secondAlone ?? null };
}

/** Apply changes such as "-1 再世律, +1 增援" to the Main Deck. */
export function changeDeck(deck: Deck, change: string, pool: Card[]): { deck: Deck; label: string } {
  const main = deck.main.map((entry) => ({ ...entry }));
  const labels: string[] = [];
  for (const item of items(change)) {
    const match = item.match(/^([+\-＋－−])\s*(\d+)\s*(.+)$/);
    if (!match) throw new Error(`改动要写成"-1 卡名"或"+1 卡名"：${item}`);
    const [, sign, digits, name] = match;
    const amount = Number(digits);
    if (sign === "+" || sign === "＋") {
      const inDeck = main.find((entry) => hasName(entry.card, name));
      const found = inDeck ? [inDeck.card] : findCards(pool, name);
      if (new Set(found.map((card) => card.cn || card.en)).size !== 1) throw new Error(`「${name}」没有对上唯一一张卡`);
      if (inDeck) inDeck.count += amount;
      else main.push({ card: found[0], count: amount });
      labels.push(`＋${amount}「${found[0].cn || found[0].en}」`);
    } else {
      const entry = main.find((candidate) => hasName(candidate.card, name))
        ?? main.find((candidate) => norm(candidate.card.cn).includes(norm(name)));
      if (!entry || entry.count < amount) throw new Error(`主卡组里没有 ${amount} 张「${name}」`);
      entry.count -= amount;
      labels.push(`−${amount}「${entry.card.cn || entry.card.en}」`);
    }
  }
  return { deck: { ...deck, main: main.filter((entry) => entry.count > 0) }, label: labels.join(" ") };
}
