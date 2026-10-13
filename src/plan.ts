// Opening-hand route planner: the rules engine tries every line from a fixed hand going first, and each board it
// reaches is scored by the user's tiers (三色康 > 有条件的康 > 除外·破坏·送墓·弹回·变里侧).
import type { Card } from "./cards.ts";
import type { Deck } from "./deck.ts";
import { engineKnows, loadEngineData } from "./engine-data.ts";
import { OcgLocation, OcgPosition, startEngine, type Engine } from "./engine.ts";
import { formatPlan } from "./format.ts";
import { OcgMessageType, OcgResponseType, SelectIdleCMDAction } from "../node_modules/@n1xx1/ocgcore-wasm/dist/index.js";
import { inGroup, parseGroup, type Group } from "./odds.ts";
import { norm, zhKinds } from "./query.ts";
import { hasName } from "./refs.ts";
import { archetypesOf, loadDeck } from "./service.ts";
import { availableParallelism } from "node:os";
import { Worker, isMainThread, parentPort, workerData } from "node:worker_threads";

type InArchetype = (card: Card, archetype: string) => boolean;

/**
 * What an interruption on the opponent's turn is worth. Each level is worth far more than the next, but not
 * infinitely more: spending two good cards for one better one can be a loss.
 */
export const LEVELS = [
  { name: "第0级", weight: 15 }, // cannot be responded to, such as Super Polymerization
  { name: "第一级", weight: 10 }, // negates any card's effect (三色康)
  { name: "1.5级", weight: 6 }, // between the two, such as Maxx "C"
  { name: "第二级", weight: 4 }, // a negation with a condition
  { name: "2.5级", weight: 2 }, // a negation with a very narrow condition, such as Stardust Dragon (destruction only)
  { name: "软康", weight: 2 }, // a tax or lock on the opponent's effects, such as Raiho (discard for every effect)
  { name: "第三级", weight: 1 }, // banish, destroy, send to the GY, return to the hand or Deck, change to face-down
  { name: "保护", weight: 1 }, // our cards cannot be targeted, destroyed or affected; only full immunity is worth more
];
const LEVEL_NAMES: Record<string, number> = {
  第0级: 0, 第零级: 0, 第一级: 1, "1.5级": 2, "第1.5级": 2, 第二级: 3, "2.5级": 4, "第2.5级": 4, 软康: 5, 第三级: 6, 保护: 7,
};
const REACH_DEPTH = 5;
/** An effect usable only on our own turn still helps on our next turn: a small fixed value. */
const OWN_TURN_VALUE = 1;

/** One card's value on the opponent's turn, if its conditions hold. */
interface TierLine {
  card: Card;
  level: number; // index into LEVELS
  uses: number; // how many times it can do it on the opponent's turn
  where: "field" | "grave" | "any" | "hand" | "fieldOrHand"; // field: face-up monster or a card in the spell & trap zones
  timing: "opponent" | "own" | "summon"; // usable on the opponent's turn; only on ours (Ignition); only when summoned
  /** On the opponent's turn it brings out or adds cards like this from that zone: it is worth what they are worth. */
  reach: { zone: "grave" | "deck" | "extra" | "hand" | "field"; group: Group; count: number } | null;
  besides: Group[]; // another card like this must be in the hand or on the field (e.g. a cost to send)
  inExtra: Group[]; // a card like this must still be in the Extra Deck (e.g. something it summons later)
  inGrave: Group[]; // a card like this must be in the GY (e.g. a WATER monster for Adamancipator Risen - Dragite)
}

const REACH_ZONES: Record<string, TierLine["reach"] extends infer R ? (R extends { zone: infer Z } ? Z : never) : never> = {
  墓地: "grave", 卡组: "deck", 额外: "extra", 额外卡组: "extra", 手里: "hand", 手卡: "hand", 场上: "field",
};

export interface Tiers {
  lines: TierLine[];
  problems: string[];
}

function findCard(cards: Card[], name: string): Card {
  const exact = cards.find((card) => hasName(card, name));
  if (exact) return exact;
  const partial = cards.filter((card) => [card.cn, card.md, card.en].some((cardName) => cardName && norm(cardName).includes(norm(name))));
  if (partial.length === 1) return partial[0];
  throw new Error(partial.length > 1 ? `对上了好几张：${partial.slice(0, 3).map((card) => `「${card.cn}」`).join("、")}` : "卡组里没有这张卡");
}

/**
 * Parse tiers, one line per card and one level per card:
 *   鲜花女男爵：第一级
 *   幻透翼同调龙：第二级×2
 *   再世之导神 史莫特：第一级；要 另有 「再世」卡
 *   赫焉龙 大木偶剧场龙：第二级；要 额外有 「死狱乡」怪兽；在场上或墓地
 *   三英之相剑师：第二级；自己回合
 *   混沌之双翼：第三级；召唤时
 *   卫星闪灵·淘气精灵：保护；回合外 → 墓地 2星 怪兽
 *   童话动物·小小袋鼠：回合外 → 卡组 「童话动物」怪兽；带 2 只；在场上或手里
 *   灰流丽：第二级；在手里
 */
export function parseTiers(text: string, deck: Deck, pool: Card[]): Tiers {
  const cards = [...deck.main, ...deck.extra].map((entry) => entry.card);
  const tiers: Tiers = { lines: [], problems: [] };
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim().replace(/^[-*•]\s*/, "");
    if (!line || line.startsWith("#")) continue;
    // Split at a colon; card names such as I：P百变莱娜 contain one, so prefer a split whose name is a deck card.
    const splits = [...line.matchAll(/[：:]/g)].map((match) => [line.slice(0, match.index).trim(), line.slice(match.index! + 1).trim()]);
    const head = splits.find(([candidate]) => cards.some((card) => hasName(card, candidate))) ?? splits[0];
    if (!head) {
      tiers.problems.push(`看不懂这一行："${line}"`);
      continue;
    }
    const [name, body] = head;
    try {
      const card = findCard(cards, name);
      if (tiers.lines.some((other) => other.card.id === card.id)) throw new Error("一张卡只写一行");
      const entry: TierLine = { card, level: -1, uses: 1, where: "field", timing: "opponent", reach: null, besides: [], inExtra: [], inGrave: [] };
      for (const item of body.split(/[；;]/).map((part) => part.trim()).filter(Boolean)) {
        let match: RegExpMatchArray | null;
        if ((match = item.match(/^(第0级|第零级|第一级|软康|第?1\.5级|第二级|第?2\.5级|第三级|保护)\s*(?:[×x*]\s*(\d+))?$/))) {
          if (entry.level >= 0) throw new Error("一张卡只有一个级别");
          entry.level = LEVEL_NAMES[match[1]];
          entry.uses = Number(match[2] ?? 1);
        } else if ((match = item.match(/^要\s*(?:手里或场上)?另有\s*(.+)$/))) entry.besides.push(parseGroup(match[1], pool));
        else if ((match = item.match(/^要\s*额外(?:卡组)?(?:还)?有\s*(.+)$/))) entry.inExtra.push(parseGroup(match[1], pool));
        else if ((match = item.match(/^要\s*墓地(?:里)?有\s*(.+)$/))) entry.inGrave.push(parseGroup(match[1], pool));
        else if ((match = item.match(/^回合外\s*(?:→|->)\s*(墓地|卡组|额外卡组|额外|手里|手卡|场上)\s*(.+)$/))) {
          entry.reach = { zone: REACH_ZONES[match[1]], group: parseGroup(match[2], pool), count: entry.reach?.count ?? 1 };
        } else if ((match = item.match(/^带\s*(\d+)\s*(?:只|张)?$/))) {
          if (entry.reach) entry.reach.count = Number(match[1]);
          else throw new Error("\"带 N 只\"要写在\"回合外 → …\"后面");
        }
        else if (item === "在墓地") entry.where = "grave";
        else if (item === "在场上或墓地") entry.where = "any";
        else if (item === "在手里") entry.where = "hand";
        else if (item === "在场上或手里") entry.where = "fieldOrHand";
        else if (item === "自己回合") entry.timing = "own";
        else if (item === "召唤时") entry.timing = "summon";
        else throw new Error(`看不懂"${item}"，要写一个级别（第0级、第一级、软康、1.5级、第二级、2.5级、第三级、保护，可以加×2）、回合外 → <在哪> <卡>、带 N 只、要 另有 <卡>、要 额外有 <卡>、要 墓地有 <卡>、在手里、在墓地、在场上或墓地、在场上或手里、自己回合、召唤时`);
      }
      if (entry.level < 0 && !entry.reach) throw new Error("没写级别，也没写回合外能带出什么");
      tiers.lines.push(entry);
    } catch (error) {
      tiers.problems.push(`「${name}」：${error instanceof Error ? error.message : error}`);
    }
  }
  return tiers;
}

/** A tier line with its conditions resolved to the deck's card ids, so it can be sent to worker threads. */
export interface ResolvedLine {
  card: Card;
  level: number;
  uses: number;
  where: TierLine["where"];
  timing: TierLine["timing"];
  besides: number[][];
  inExtra: number[][];
  inGrave: number[][];
  reach: { zone: "grave" | "deck" | "extra" | "hand" | "field"; ids: number[]; count: number } | null;
}

export function resolveTiers(tiers: Tiers, deckCards: Card[], inArchetype: InArchetype): ResolvedLine[] {
  const ids = (group: Group) => deckCards.filter((card) => inGroup(card, group, inArchetype)).map((card) => card.id);
  return tiers.lines.map(({ besides, inExtra, inGrave, reach, ...line }) => ({
    ...line, besides: besides.map(ids), inExtra: inExtra.map(ids), inGrave: inGrave.map(ids),
    reach: reach && { zone: reach.zone, ids: ids(reach.group), count: reach.count },
  }));
}

/** The position after our turn: the board the opponent faces and the interruptions we kept in the hand. */
export interface Board {
  value: number;
  field: Card[]; // face-up monsters
  sets: Card[]; // spells and traps in their zones
  counted: { card: Card; level: number; uses: number; place: "场上" | "墓地" | "手里" | "带出"; value: number; ownTurn: boolean; via?: Card }[];
  steps: string[];
}

/** More value first; on a tie, the shorter route. */
export function boardOrder(a: Board, b: Board): number {
  return b.value - a.value || a.steps.length - b.steps.length;
}

export interface Branch {
  first: string;
  nodes: number;
  complete: boolean;
  best: Board | null;
}

export interface PlanResult {
  boards: Board[]; // the best board for each distinct field, best first
  branches: Branch[];
  states: number;
  seconds: number;
}

interface Option { label: string; response: any }

const zoneKey = (card: any) => `${card.code}@${card.location}`;
const ATTRIBUTE_NAMES: Record<number, string> = { 1: "地", 2: "水", 4: "炎", 8: "风", 16: "光", 32: "暗", 64: "神" };

function combinations(items: any[], size: number): number[][] {
  const result: number[][] = [];
  const seen = new Set<string>();
  const pick = (start: number, chosen: number[]) => {
    if (chosen.length === size) {
      const signature = chosen.map((index) => zoneKey(items[index])).sort().join(",");
      if (!seen.has(signature)) {
        seen.add(signature);
        result.push([...chosen]);
      }
      return;
    }
    for (let index = start; index < items.length && result.length < 40; index++) pick(index + 1, [...chosen, index]);
  };
  pick(0, []);
  return result;
}

export interface Setup { hand: number[]; main: number[]; extra: number[] }
interface Explored { nodes: number; complete: boolean; boards: Board[] }

/**
 * A search over one duel: walk to a node given by the choices that lead to it, then try every line from there and
 * score each board reached at a main phase decision.
 */
/** A set of positions seen by every thread: 64-bit hashes in shared memory, open addressing. */
export const SEEN_SLOTS = 1 << 22; // 32 MB
export function sharedSeen(table: BigInt64Array): (state: string) => boolean {
  return (state) => {
    let first = 0x811c9dc5, second = 0x9747b28c;
    for (let index = 0; index < state.length; index++) {
      const code = state.charCodeAt(index);
      first = Math.imul(first ^ code, 0x01000193);
      second = Math.imul(second ^ code, 0x5bd1e995) ^ (second >>> 15);
    }
    // Signed, as the table stores it: a key with the top bit set must compare equal to what is read back.
    const key = BigInt.asIntN(64, (BigInt(first >>> 0) << 32n) | BigInt((second >>> 0) || 1));
    for (let slot = first & (SEEN_SLOTS - 1); ; slot = (slot + 1) & (SEEN_SLOTS - 1)) {
      const before = Atomics.compareExchange(table, slot, 0n, key);
      if (before === 0n) return false;
      if (before === key) return true;
    }
  };
}

function createSearcher(
  engine: Engine, setup: Setup, cardOf: (code: number) => Card | undefined, lines: ResolvedLine[], saveLimit: number,
  stopped: () => boolean = () => false, // checked at every node: another thread may have used up the shared budget
  seenBefore?: (state: string) => boolean, // shared between threads; a local set when not given
) {
  const name = (code: number) => { const card = cardOf(code); return card ? card.cn || card.en : String(code); };
  // Cards valued in the hand (hand traps) are worth something only on the opponent's turn, so the search never
  // activates them on ours. It may still summon them or use them as a cost or material, losing their value.
  const inHandValue = new Set(lines.filter((line) => line.where === "hand").map((line) => line.card.id));
  const valuedIds = new Set(lines.map((line) => line.card.id));
  const isHandTrap = (code: number) => { const card = cardOf(code); return card !== undefined && inHandValue.has(card.id); };
  const T = OcgResponseType;
  let selectionFloor = ""; // cards picked one by one are tried in one order only
  // Cards drawn by effects are random, so the search may not play them; it may still discard them as a cost.
  let drawn = new Map<number, number>();
  let handCounts: Map<number, number> | null = null;
  const fromDraw = (item: any) => {
    if (item.location !== OcgLocation.HAND || !drawn.has(item.code)) return false;
    handCounts ??= engine.cards(duel, OcgLocation.HAND).reduce((counts, info) => counts.set(info.code, (counts.get(info.code) ?? 0) + 1), new Map<number, number>());
    return (handCounts.get(item.code) ?? 0) <= drawn.get(item.code)!;
  };

  const optionsFor = (message: any, idleActives: Set<string>): Option[] => {
    if (message.player === 1) {
      if (message.type === OcgMessageType.SELECT_CHAIN) return [{ label: "", response: { type: T.SELECT_CHAIN, index: null } }];
      throw new Error(`对手要做选择（${message.type}），这种情况还没处理`);
    }
    switch (message.type) {
      case OcgMessageType.SELECT_IDLECMD: {
        const options: Option[] = [];
        const seen = new Set<string>();
        const add = (items: any[], action: number, verb: string, id: (item: any) => string) => items.forEach((item, index) => {
          if ((verb === "发动" && isHandTrap(item.code)) || fromDraw(item) || seen.has(verb + id(item))) return;
          seen.add(verb + id(item));
          options.push({ label: `${verb}「${name(item.code)}」`, response: { type: T.SELECT_IDLECMD, action, index } });
        });
        add(message.summons, SelectIdleCMDAction.SELECT_SUMMON, "通召", (item) => String(item.code));
        add(message.special_summons, SelectIdleCMDAction.SELECT_SPECIAL_SUMMON, "特召", (item) => String(item.code));
        add(message.activates, SelectIdleCMDAction.SELECT_ACTIVATE, "发动", (item) => `${item.code}:${item.description}`);
        // Endpoints first, so a good line is found early when the time runs out before the search does.
        const priority = (option: Option) => {
          const item = [message.summons, message.special_summons, message.activates][option.response.action === SelectIdleCMDAction.SELECT_ACTIVATE ? 2 : option.response.action === SelectIdleCMDAction.SELECT_SPECIAL_SUMMON ? 1 : 0][option.response.index];
          return valuedIds.has(cardOf(item.code)?.id ?? -1) ? 0 : 1;
        };
        return options.map((option, index) => ({ option, index })).sort((a, b) => priority(a.option) - priority(b.option) || a.index - b.index).map((entry) => entry.option);
      }
      case OcgMessageType.SELECT_CHAIN: {
        const options: Option[] = message.forced ? [] : [{ label: "", response: { type: T.SELECT_CHAIN, index: null } }];
        const seen = new Set<string>();
        message.selects.forEach((item: any, index: number) => {
          const id = `${item.code}:${item.description}`;
          // A quick effect that can also be used at the main phase is tried there, not in every chain window.
          if (isHandTrap(item.code) || fromDraw(item) || idleActives.has(id) || seen.has(id)) return;
          seen.add(id);
          options.push({ label: `连锁发动「${name(item.code)}」`, response: { type: T.SELECT_CHAIN, index } });
        });
        return options.length > 0 ? options : [{ label: "", response: { type: T.SELECT_CHAIN, index: 0 } }];
      }
      case OcgMessageType.SELECT_EFFECTYN:
        return [{ label: `发动「${name(message.code)}」`, response: { type: T.SELECT_EFFECTYN, yes: true } }];
      case OcgMessageType.SELECT_YESNO:
        return [{ label: "", response: { type: T.SELECT_YESNO, yes: true } }];
      case OcgMessageType.SELECT_OPTION:
        return message.options.map((_: unknown, index: number) => ({ label: `选第 ${index + 1} 个效果`, response: { type: T.SELECT_OPTION, index } }));
      case OcgMessageType.SELECT_CARD:
      case OcgMessageType.SELECT_TRIBUTE: {
        const type = message.type === OcgMessageType.SELECT_CARD ? T.SELECT_CARD : T.SELECT_TRIBUTE;
        const sizes = [...new Set([Math.max(message.min, 1), message.max])].filter((size) => size <= message.selects.length);
        return sizes.flatMap((size) => combinations(message.selects, size)).slice(0, 40).map((indicies) => ({
          label: `选 ${indicies.map((index) => name(message.selects[index].code)).join("、")}`,
          response: { type, indicies },
        }));
      }
      case OcgMessageType.SELECT_UNSELECT_CARD: {
        const options: Option[] = message.can_finish ? [{ label: "", response: { type: T.SELECT_UNSELECT_CARD, index: null } }] : [];
        const seen = new Set<string>();
        message.select_cards.forEach((item: any, index: number) => {
          if (seen.has(zoneKey(item)) || zoneKey(item) < selectionFloor) return;
          seen.add(zoneKey(item));
          options.push({ label: `选 ${name(item.code)}`, response: { type: T.SELECT_UNSELECT_CARD, index } });
        });
        return options;
      }
      case OcgMessageType.SELECT_SUM: {
        const levels = (card: any) => [card.amount & 0xffff, card.amount >>> 16].filter(Boolean);
        const mustSums = message.selects_must.reduce((sums: number[], card: any) => sums.flatMap((sum) => levels(card).map((level) => sum + level)), [0]);
        const options: Option[] = [];
        for (let size = 1; size <= Math.min(message.selects.length, 6); size++) {
          for (const indicies of combinations(message.selects, size)) {
            const sums = indicies.reduce((all: number[], index) => all.flatMap((sum) => levels(message.selects[index]).map((level) => sum + level)), mustSums);
            if (sums.includes(message.amount)) {
              options.push({ label: `选 ${indicies.map((index) => name(message.selects[index].code)).join("、")}`, response: { type: T.SELECT_SUM, indicies } });
            }
          }
        }
        return options;
      }
      case OcgMessageType.SELECT_PLACE:
      case OcgMessageType.SELECT_DISFIELD: {
        const mask = message.field_mask;
        let place = null;
        for (let sequence = 0; sequence < 7 && !place; sequence++) if (!(mask & (1 << sequence))) place = { player: 0, location: OcgLocation.MZONE, sequence };
        for (let sequence = 0; sequence < 5 && !place; sequence++) if (!(mask & (1 << (sequence + 8)))) place = { player: 0, location: OcgLocation.SZONE, sequence };
        const type = message.type === OcgMessageType.SELECT_PLACE ? T.SELECT_PLACE : T.SELECT_DISFIELD;
        return [{ label: "", response: { type, places: [place] } }];
      }
      case OcgMessageType.SELECT_POSITION: {
        const position = [OcgPosition.FACEUP_ATTACK, OcgPosition.FACEUP_DEFENSE, OcgPosition.FACEDOWN_DEFENSE].find((option) => message.positions & option);
        return [{ label: "", response: { type: T.SELECT_POSITION, position } }];
      }
      case OcgMessageType.SORT_CARD:
      case OcgMessageType.SORT_CHAIN:
        return [{ label: "", response: { type: T.SORT_CARD, order: null } }];
      case OcgMessageType.ANNOUNCE_ATTRIB: {
        const bits = [1, 2, 4, 8, 16, 32, 64].filter((bit) => Number(message.available) & bit);
        if (message.count > 1) return [{ label: "", response: { type: T.ANNOUNCE_ATTRIB, attributes: bits.slice(0, message.count) } }];
        return bits.map((bit) => ({ label: `宣言${ATTRIBUTE_NAMES[bit]}属性`, response: { type: T.ANNOUNCE_ATTRIB, attributes: [bit] } }));
      }
      case OcgMessageType.ANNOUNCE_RACE: {
        // The declared type rarely changes the board: take the first ones allowed.
        const races: bigint[] = [];
        for (let bit = 1n; races.length < message.count && bit <= BigInt(message.available); bit <<= 1n) if (BigInt(message.available) & bit) races.push(bit);
        return [{ label: "", response: { type: T.ANNOUNCE_RACE, races } }];
      }
      case OcgMessageType.ANNOUNCE_NUMBER:
        return message.options.slice(0, 12).map((value: bigint) => ({ label: `宣言 ${value}`, response: { type: T.ANNOUNCE_NUMBER, value: Number(value) } }));
    }
    throw new Error(`规则引擎要一种还没处理的选择（${message.type}）`);
  };

  const duel = engine.newDuel(setup.hand, setup.main, setup.extra);

  /** What the search remembers about the line so far, besides the engine's own state. */
  interface Line {
    steps: string[];
    activations: string[];
    normalSummoned: boolean;
    idleActives: Set<string>;
    drawn: Map<number, number>;
    floor: string;
  }
  const copyLine = (line: Line): Line => ({ ...line, steps: [...line.steps], activations: [...line.activations], drawn: new Map(line.drawn) });

  /** Run until a decision worth branching on, answering the others; null when our turn is over. */
  const toDecision = (line: Line): { message: any; options: Option[] } | null => {
    while (true) {
      const message: any = engine.advance(duel, (event: any) => {
        if (event.type === OcgMessageType.CHAINING && event.controller === 0) line.activations.push(`${event.code}:${event.description}`);
        if (event.type === OcgMessageType.SUMMONING) line.normalSummoned = true;
        if (event.type === OcgMessageType.DRAW && event.player === 0) for (const card of event.drawn) line.drawn.set(card.code, (line.drawn.get(card.code) ?? 0) + 1);
      });
      handCounts = null;
      drawn = line.drawn;
      if (!message || (message.type === OcgMessageType.SELECT_IDLECMD && message.player === 1)) return null;
      if (message.type !== OcgMessageType.SELECT_UNSELECT_CARD) line.floor = "";
      selectionFloor = line.floor;
      const options = optionsFor(message, line.idleActives);
      if (message.type === OcgMessageType.SELECT_IDLECMD) line.idleActives = new Set(message.activates.map((item: any) => `${item.code}:${item.description}`));
      if (options.length === 1 && message.type !== OcgMessageType.SELECT_IDLECMD) {
        if (options[0].label) line.steps.push(options[0].label);
        engine.respond(duel, options[0].response);
        continue;
      }
      // No choice left (an order of picking materials that another path covers): a dead end, not a node.
      if (options.length === 0 && message.type !== OcgMessageType.SELECT_IDLECMD) return null;
      return { message, options };
    }
  };

  const choose = (line: Line, message: any, option: Option) => {
    if (option.label) line.steps.push(option.label);
    if (message.type === OcgMessageType.SELECT_UNSELECT_CARD && option.response.index !== null) line.floor = zoneKey(message.select_cards[option.response.index]);
    engine.respond(duel, option.response);
  };

  // Spells and traps valued on the field are set before the turn ends: setting costs nothing on our own turn.
  const valued = new Set(lines.filter((line) => line.where !== "hand").map((line) => line.card.id));
  const known = (codes: { code: number }[]) => codes.map((info) => cardOf(info.code)).filter((card): card is Card => card !== undefined);

  /** Answer every decision on its own until our next main phase decision or the opponent's turn. */
  const autoAdvance = (): any | null => {
    let opponentTurn = false;
    while (true) {
      const message: any = engine.advance(duel, (event: any) => {
        if (event.type === OcgMessageType.NEW_TURN && event.player === 1) opponentTurn = true;
      });
      if (!message || opponentTurn || message.player === 1 && message.type === OcgMessageType.SELECT_IDLECMD) return null;
      if (message.type === OcgMessageType.SELECT_IDLECMD) return message;
      selectionFloor = "";
      const options = optionsFor(message, new Set());
      // End Phase effects from the GY or banishment (such as searches) are worth using; quick effects of cards on the
      // field are not, since they would hit our own cards.
      const activate = message.type === OcgMessageType.SELECT_CHAIN
        ? options.find((option) => option.response.index !== null && [OcgLocation.GRAVE, OcgLocation.REMOVED].includes(message.selects[option.response.index].location))
        : undefined;
      engine.respond(duel, (activate ?? options[0]).response);
    }
  };

  /** Set the spells and traps the tiers value, end the turn, and score what the opponent faces. */
  const evaluate = (idle: any, steps: string[]): Board => {
    let message = idle;
    for (let guard = 0; guard < 10 && message; guard++) {
      handCounts = null;
      const index = message.spell_sets.findIndex((item: any) => valued.has(cardOf(item.code)?.id ?? -1) && !fromDraw(item));
      if (index < 0) break;
      engine.respond(duel, { type: OcgResponseType.SELECT_IDLECMD, action: SelectIdleCMDAction.SELECT_SPELL_SET, index });
      message = autoAdvance();
    }
    if (message) {
      engine.respond(duel, { type: OcgResponseType.SELECT_IDLECMD, action: SelectIdleCMDAction.TO_EP, index: null });
      autoAdvance();
    }
    const field = known(engine.cards(duel, OcgLocation.MZONE).filter((info) => info.position & OcgPosition.FACEUP));
    // A monster in a spell & trap zone (placed there as a continuous spell) is not that monster any more.
    const sets = known(engine.cards(duel, OcgLocation.SZONE)).filter((card) => !zhKinds(card).kinds.has("怪兽"));
    const grave = known(engine.cards(duel, OcgLocation.GRAVE));
    const hand = known(engine.cards(duel, OcgLocation.HAND));
    const extra = known(engine.cards(duel, OcgLocation.EXTRA));
    const notDrawn = [...hand];
    for (const [code, count] of drawn) {
      for (let i = 0; i < count; i++) {
        const index = notDrawn.findIndex((card) => card === cardOf(code));
        if (index >= 0) notDrawn.splice(index, 1);
      }
    }
    // Each card name counts once: most of these effects can be used once per turn by name.
    const counted: Board["counted"] = [];
    const countedNames = new Set<number>();
    const onBoard = [...field, ...sets];
    const deckCards = known(engine.cards(duel, OcgLocation.DECK));
    const zones = { grave, deck: deckCards, extra, hand: notDrawn, field: onBoard };
    const conditionsHold = (line: ResolvedLine, card: Card) => {
      const others = [...onBoard, ...hand].filter((other) => other !== card);
      return line.besides.every((ids) => others.some((other) => ids.includes(other.id)))
        && line.inExtra.every((ids) => extra.some((other) => ids.includes(other.id)))
        && line.inGrave.every((ids) => grave.some((other) => ids.includes(other.id)));
    };
    /**
     * What a card is worth on the opponent's turn: its own effect, plus what it brings out then (which is summoned on
     * the opponent's turn, so effects on summon count and effects for our own turn do not). `names` holds every card
     * name already counted, so nothing is counted twice however it is reached; it is extended as cards are chosen.
     */
    const worth = (card: Card, line: ResolvedLine, reached: boolean, depth: number, names: Set<number>): { value: number; chain: Board["counted"] } => {
      const chain: Board["counted"] = [];
      let value = 0;
      if (line.level >= 0 && !(reached && line.timing === "own") && !(!reached && line.timing === "summon")) {
        value = line.timing === "own" ? OWN_TURN_VALUE : LEVELS[line.level].weight * line.uses;
      }
      if (line.reach && depth < REACH_DEPTH) {
        for (let picked = 0; picked < line.reach.count; picked++) {
          // Try each candidate with its own copy of the counted names; keep the best and commit its names.
          let best: { other: Card; line: ResolvedLine; trial: Set<number>; value: number; chain: Board["counted"] } | null = null;
          const tried = new Set<number>();
          for (const other of zones[line.reach.zone]) {
            if (other === card || names.has(other.id) || tried.has(other.id) || !line.reach.ids.includes(other.id)) continue;
            tried.add(other.id);
            const otherLine = lines.find((candidate) => candidate.card.id === other.id);
            if (!otherLine || !conditionsHold(otherLine, other)) continue;
            const trial = new Set(names);
            trial.add(other.id);
            const result = worth(other, otherLine, true, depth + 1, trial);
            if (!best || result.value > best.value) best = { other, line: otherLine, trial, ...result };
          }
          if (!best || best.value <= 0) break;
          best.trial.forEach((id) => names.add(id));
          const own = best.value - best.chain.reduce((sum, item) => sum + item.value, 0);
          chain.push({ card: best.other, level: best.line.level, uses: best.line.uses, place: "带出", value: own, ownTurn: false, via: card }, ...best.chain);
          value += best.value;
        }
      }
      return { value, chain };
    };
    const consider = (cards: Card[], place: "场上" | "墓地" | "手里", wheres: TierLine["where"][]) => {
      for (const card of new Set(cards)) {
        const line = lines.find((candidate) => candidate.card.id === card.id);
        if (!line || !wheres.includes(line.where) || countedNames.has(card.id)) continue;
        if (!conditionsHold(line, card)) continue;
        countedNames.add(card.id);
        const result = worth(card, line, false, 0, countedNames);
        const own = result.value - result.chain.reduce((sum, item) => sum + item.value, 0);
        if (own > 0 || result.chain.length > 0) {
          counted.push({ card, level: line.level, uses: line.uses, place, value: own, ownTurn: line.timing === "own" }, ...result.chain);
        }
      }
    };
    consider(onBoard, "场上", ["field", "any", "fieldOrHand"]);
    consider(grave, "墓地", ["grave", "any"]);
    consider(notDrawn, "手里", ["hand", "fieldOrHand"]);
    const value = counted.reduce((sum, item) => sum + item.value, 0);
    return { value, field, sets, counted, steps };
  };

  const local = new Set<string>();
  let states = 0;
  const alreadySeen = seenBefore ?? ((state: string) => local.has(state) || (local.add(state), false));
  let found = new Map<string, Board>();
  let nodes = 0;
  let budget = 0;
  // Save states along the current line so each choice continues from its parent instead of replaying the turn.
  // A save is 16 MB; past the limit, a node goes back to its nearest saved ancestor and replays the few steps since.
  let saves = 0;
  const buffers: Uint8Array[] = []; // saves are made and dropped in stack order, so their memory is reused

  const record = (board: Board) => {
    const id = [...board.field, ...board.sets].map((card) => card.id).sort().join(",");
    const known = found.get(id);
    if (!known || boardOrder(board, known) < 0) found.set(id, board);
  };

  /** Explore a decision the engine is waiting at; restore() puts the engine back at it. */
  let interrupted = false;
  const visit = (line: Line, message: any, options: Option[], restore: () => void) => {
    if (nodes >= budget || interrupted) return;
    if (stopped()) {
      interrupted = true;
      return;
    }
    nodes++;
    const state = [OcgLocation.MZONE, OcgLocation.SZONE, OcgLocation.HAND, OcgLocation.GRAVE, OcgLocation.REMOVED, OcgLocation.EXTRA]
      .map((location) => engine.cards(duel, location).map((info) => `${info.code}${info.position & OcgPosition.FACEUP ? "u" : "d"}`).sort().join(","))
      .join("|") + `|${[...line.activations].sort().join(",")}|${line.normalSummoned}|${message.type}|${options.map((option) => option.label).join(";")}|${line.floor}`;
    if (alreadySeen(state)) return;
    states++;
    const isIdle = message.type === OcgMessageType.SELECT_IDLECMD;
    let back = restore;
    let saved = false;
    if ((options.length > 1 || (isIdle && options.length > 0)) && saves < saveLimit) {
      const snapshot = engine.save(buffers[saves]);
      buffers[saves] = snapshot;
      saves++;
      saved = true;
      back = () => engine.load(snapshot);
    }
    if (isIdle) {
      drawn = line.drawn;
      record(evaluate(message, line.steps));
    }
    for (let index = 0; index < options.length && nodes < budget && !interrupted; index++) {
      if (index > 0 || isIdle) back(); // the first choice continues from here, unless scoring moved the engine on
      const child = copyLine(line);
      choose(child, message, options[index]);
      const next = toDecision(child);
      if (!next) continue;
      const parentBack = back;
      const option = options[index];
      // Without its own save, a child gets back by restoring this node and making the same choice again.
      const childRestore = () => {
        parentBack();
        const replayed = copyLine(line);
        choose(replayed, message, option);
        toDecision(replayed);
      };
      visit(child, next.message, next.options, childRestore);
    }
    if (saved) saves--;
  };

  const start = engine.save();
  const newLine = (): Line => ({ steps: [], activations: [], normalSummoned: false, idleActives: new Set(), drawn: new Map(), floor: "" });
  /** Put the engine at the node the choices lead to, from the start of the turn. */
  const navigate = (path: number[]) => {
    engine.load(start);
    const line = newLine();
    let decision = toDecision(line);
    for (const index of path) {
      if (!decision) return null;
      choose(line, decision.message, decision.options[index]);
      decision = toDecision(line);
    }
    return decision ? { line, ...decision } : null;
  };

  return {
    /** The first actions available from the opening hand. */
    firstChoices: () => navigate([])?.options.map((option) => option.label) ?? [],
    /** The number of choices at a node, and its board if it is a main phase decision. */
    expand(path: number[]): { count: number; board: Board | null } | null {
      const node = navigate(path);
      if (!node) return null;
      let board: Board | null = null;
      if (node.message.type === OcgMessageType.SELECT_IDLECMD) {
        drawn = node.line.drawn;
        board = evaluate(node.message, node.line.steps);
      }
      return { count: node.options.length, board };
    },
    /** Search below a node with a budget of nodes; the boards found, best first. */
    explore(path: number[], limit: number): Explored {
      nodes = 0;
      budget = limit;
      interrupted = false;
      found = new Map();
      const node = navigate(path);
      if (node) visit(node.line, node.message, node.options, () => { navigate(path); });
      return { nodes, complete: nodes < limit && !interrupted, boards: [...found.values()].sort(boardOrder).slice(0, 30) };
    },
    states: () => states,
  };
}

/** Merge per-task results into the boards for each distinct field and a summary per first action. */
function summarize(
  firsts: string[], results: { first: number; explored: Explored }[], taskCounts: number[], extraBoards: Board[], states: number, seconds: number,
): PlanResult {
  const best = new Map<string, Board>();
  const add = (board: Board) => {
    const id = [...board.field, ...board.sets].map((card) => card.id).sort().join(",");
    const known = best.get(id);
    if (!known || boardOrder(board, known) < 0) best.set(id, board);
  };
  extraBoards.forEach(add);
  const branches: Branch[] = firsts.map((first, index) => {
    const mine = results.filter((result) => result.first === index);
    mine.forEach((result) => result.explored.boards.forEach(add));
    const boards = mine.flatMap((result) => result.explored.boards).sort(boardOrder);
    return {
      first,
      nodes: mine.reduce((sum, result) => sum + result.explored.nodes, 0),
      complete: mine.length === taskCounts[index] && mine.every((result) => result.explored.complete),
      best: boards[0] ?? null,
    };
  });
  return { boards: [...best.values()].sort(boardOrder), branches, states, seconds };
}

/** Plan in this thread, every first action with an equal share of the budget. For tests and profiling. */
export function planHand(engine: Engine, setup: Setup, cardOf: (code: number) => Card | undefined, lines: ResolvedLine[], nodeLimit = 30000): PlanResult {
  const started = performance.now();
  const searcher = createSearcher(engine, setup, cardOf, lines, 64);
  const firsts = searcher.firstChoices();
  const share = Math.floor(nodeLimit / Math.max(firsts.length, 1));
  const results = firsts.map((_, first) => ({ first, explored: searcher.explore([first], share) }));
  return summarize(firsts, results, firsts.map(() => 1), [], searcher.states(), (performance.now() - started) / 1000);
}

interface WorkerSetup {
  role: "plan-worker";
  setup: Setup;
  cards: [number, Card][];
  lines: ResolvedLine[];
  saveLimit: number;
  shared: SharedArrayBuffer; // [nodes searched by all threads, stop flag]
  seen: SharedArrayBuffer; // positions seen by any thread
}

if (!isMainThread && (workerData as WorkerSetup | undefined)?.role === "plan-worker") void runWorker(workerData as WorkerSetup);

async function runWorker({ setup, cards, lines, saveLimit, shared, seen }: WorkerSetup) {
  const byCode = new Map(cards);
  const counters = new Int32Array(shared);
  const engine = await startEngine(await loadEngineData(Infinity));
  const stopped = () => Atomics.add(counters, 0, 1) >= 0 && Atomics.load(counters, 1) === 1;
  const searcher = createSearcher(engine, setup, (code) => byCode.get(code), lines, saveLimit, stopped, sharedSeen(new BigInt64Array(seen)));
  parentPort!.on("message", (task: { id: number; path: number[] }) => {
    parentPort!.postMessage({ id: task.id, explored: searcher.explore(task.path, Infinity), states: searcher.states() });
  });
  parentPort!.postMessage({ ready: true });
}

/**
 * Plan on several threads. The first few levels of the search tree are expanded here into tasks; each worker runs
 * its own engine and takes tasks until none are left or the shared budget of nodes or seconds runs out. Tasks from
 * different first actions take turns, so every first action gets searched. Workers do not share what they have
 * seen, so a little work is repeated, but the search finishes several times faster.
 */
export async function planParallel(
  engine: Engine, setup: Setup, cardOf: (code: number) => Card | undefined, cards: [number, Card][], lines: ResolvedLine[],
  limits: { nodes: number; seconds: number }, threads = Math.max(1, Math.min(availableParallelism() - 1, 8)),
): Promise<PlanResult> {
  const started = performance.now();
  const searcher = createSearcher(engine, setup, cardOf, lines, 8);
  const firsts = searcher.firstChoices();
  // Expand the top of the tree until there are a few tasks per thread, keeping the boards found on the way.
  let frontier = firsts.map((_, first) => ({ first, path: [first] }));
  const extraBoards: Board[] = [];
  for (let depth = 0; depth < 6 && frontier.length < threads * 12; depth++) {
    const next: typeof frontier = [];
    for (const task of frontier) {
      const node = searcher.expand(task.path);
      if (!node) continue;
      if (node.board) extraBoards.push(node.board);
      for (let index = 0; index < node.count; index++) next.push({ first: task.first, path: [...task.path, index] });
    }
    if (next.length === 0) break;
    frontier = next;
  }
  // Take tasks in turns across first actions.
  const byFirst = firsts.map((_, first) => frontier.filter((task) => task.first === first));
  const queue: { id: number; first: number; path: number[] }[] = [];
  for (let round = 0; queue.length < frontier.length; round++) {
    for (const group of byFirst) if (group[round]) queue.push({ ...group[round], id: queue.length });
  }
  const taskCounts = byFirst.map((group) => group.length);
  const taskFirst = queue.map((task) => task.first);
  const results: { first: number; explored: Explored }[] = [];
  let states = 0;
  const shared = new SharedArrayBuffer(8);
  const counters = new Int32Array(shared);
  const deadline = started + limits.seconds * 1000;
  const watch = setInterval(() => {
    if (Atomics.load(counters, 0) >= limits.nodes || performance.now() >= deadline) Atomics.store(counters, 1, 1);
  }, 50);
  // Saves cost 16 MB each: keep the threads together under about 2 GB.
  const workerSetup: WorkerSetup = {
    role: "plan-worker", setup, cards, lines, saveLimit: Math.max(8, Math.floor(128 / threads)), shared,
    seen: new SharedArrayBuffer(SEEN_SLOTS * 8),
  };
  try {
    await Promise.all(Array.from({ length: Math.min(threads, queue.length) }, () => new Promise<void>((resolve, reject) => {
      const worker = new Worker(new URL(import.meta.url), { workerData: workerSetup });
      let workerStates = 0; // positions this worker has searched so far
      const next = () => {
        const task = Atomics.load(counters, 1) === 1 ? undefined : queue.shift();
        if (task) worker.postMessage(task);
        else {
          states += workerStates;
          void worker.terminate().then(() => resolve());
        }
      };
      worker.on("message", (message: any) => {
        if (!message.ready) {
          results.push({ first: taskFirst[message.id], explored: message.explored });
          workerStates = message.states;
        }
        next();
      });
      worker.on("error", reject);
    })));
  } finally {
    clearInterval(watch);
  }
  return summarize(firsts, results, taskCounts, extraBoards, states, (performance.now() - started) / 1000);
}

/** Plan the best board for an opening hand, going first. The entry point for the command line and MCP. */
export async function planText(input: string, handText: string, tiersText: string, limits: { nodes: number; seconds: number }): Promise<string> {
  const { cards, deck } = await loadDeck(input);
  const deckCards = [...deck.main, ...deck.extra].map((entry) => entry.card);
  let data = await loadEngineData();
  if (deckCards.some((card) => !engineKnows(card, data))) data = await loadEngineData(300); // maybe added since the last check
  const missing = deckCards.filter((card) => !engineKnows(card, data));
  const code = (card: Card) => [card.id, ...card.altIds].find((id) => data.has(id)) ?? card.id;

  const pile = deck.main.flatMap((entry) => Array<Card>(entry.count).fill(entry.card));
  const names = handText.split(/[,，、;；\n]/).map((part) => part.trim()).filter(Boolean);
  if (names.length === 0 || names.length > 6) throw new Error(`起手要写 1～6 张卡，现在是 ${names.length} 张`);
  const hand = names.map((name) => {
    let index = pile.findIndex((card) => hasName(card, name));
    if (index < 0) {
      const partial = [...new Set(pile.filter((card) => [card.cn, card.md, card.en].some((cardName) => cardName && norm(cardName).includes(norm(name)))))];
      if (partial.length !== 1) throw new Error(`起手里的「${name}」${partial.length > 1 ? "对上了好几张卡" : "不在主卡组里，或者已经用完了张数"}`);
      index = pile.indexOf(partial[0]);
    }
    return pile.splice(index, 1)[0];
  });

  const tiers = parseTiers(tiersText, deck, cards);
  // Every card, so tokens and cards the engine brings in from outside the deck still get names; deck cards win.
  const byCode = new Map<number, Card>();
  for (const card of [...cards, ...deckCards]) for (const id of [code(card), card.id, ...card.altIds]) byCode.set(id, card);
  const engine = await startEngine(data);
  const setup = { hand: hand.map(code), main: pile.map(code), extra: deck.extra.flatMap((entry) => Array<number>(entry.count).fill(code(entry.card))) };
  const lines = resolveTiers(tiers, deckCards, archetypesOf(cards));
  const result = await planParallel(engine, setup, (id) => byCode.get(id), [...byCode], lines, limits);
  // Card scripts that are missing show up as missing cards; Normal Monsters simply have none.
  const libraries = [...engine.missingScripts].filter((name) => !/^c\d+\.lua$/.test(name));
  return formatPlan(hand, result, tiers.problems, missing, libraries);
}
