// References to other cards, such as "从卡组把「废品大王」以外的1张「废品」卡加入手卡": find the ones
// that have nothing to take in the deck. Wording that is not fully understood is skipped, not guessed.
import type { Card } from "./cards.ts";
import type { Deck, DeckEntry } from "./deck.ts";
import { norm, zhKinds } from "./query.ts";

type Zone = "main" | "extra";

/** One of the alternatives a reference accepts, e.g. "「废品」卡" or "4星以下的「X」怪兽". */
export interface Target {
  mode: "name" | "archetype" | "nameContains" | "mentions";
  refs: string[]; // any of these
  kinds: string[]; // any of these card kinds (怪兽, 调整, 同调, 魔法, 陷阱…); empty = any card
  subtype?: string; // 速攻, 永续, 场地, 装备, 仪式, 通常, 反击
  level?: [number, number];
}

/** Where to take from and what qualifies. */
export interface Option {
  zones: Zone[];
  excluded: string[];
  targets: Target[];
}

/** A reference with its options: "从卡组把「A」或者从额外卡组把「B」…" has two, and either one is enough. */
export interface Reference {
  card: Card;
  effect: string;
  text: string;
  options: Option[];
}

type InArchetype = (card: Card, archetype: string) => boolean;

/** Card kinds for the words after the name, e.g. "魔法·陷阱卡", "速攻魔法卡", "同调怪兽"; null if not understood. */
function parseKinds(words: string): { kinds: string[]; subtype?: string } | null {
  let match: RegExpMatchArray | null;
  if (words === "卡") return { kinds: [] };
  if (words === "魔法·陷阱卡") return { kinds: ["魔法", "陷阱"] };
  if ((match = words.match(/^(速攻|永续|场地|装备|仪式|通常)?魔法卡$/))) return { kinds: ["魔法"], subtype: match[1] };
  if ((match = words.match(/^(永续|反击|通常)?陷阱卡$/))) return { kinds: ["陷阱"], subtype: match[1] };
  if ((match = words.match(/^(融合|同调|超量|连接|仪式|灵摆|效果|通常)怪兽$/))) return { kinds: [match[1]] };
  if (/^调整(怪兽)?$/.test(words)) return { kinds: ["调整"] };
  if (words === "怪兽") return { kinds: ["怪兽"] };
  return null;
}

function parseTarget(text: string): Target | null {
  let rest = text.trim();
  let level: [number, number] | undefined;
  const levelMatch = rest.match(/(\d+)星(以上|以下)?的?/);
  if (levelMatch) {
    const value = Number(levelMatch[1]);
    level = levelMatch[2] === "以上" ? [value, 99] : levelMatch[2] === "以下" ? [0, value] : [value, value];
    rest = rest.replace(levelMatch[0], "");
  }
  let mode: Target["mode"] = "archetype";
  let refs: string[];
  const mentions = rest.match(/^有「([^」]+)」的卡名记述的(.*)$/);
  const contains = rest.match(/^名字带有((?:「[^」]+」(?:、|或)?)+)的(.*)$/);
  if (mentions) {
    mode = "mentions";
    refs = [mentions[1]];
    rest = mentions[2];
  } else if (contains) {
    mode = "nameContains";
    refs = [...contains[1].matchAll(/「([^」]+)」/g)].map((match) => match[1]);
    rest = contains[2];
  } else {
    const quoted = rest.match(/^((?:「[^」]+」、?)+)(.*)$/);
    if (!quoted) return null;
    refs = [...quoted[1].matchAll(/「([^」]+)」/g)].map((match) => match[1]);
    rest = quoted[2];
    if (rest === "") mode = "name";
  }
  if (rest === "") return { mode, refs, kinds: [], level };
  const kinds = parseKinds(rest);
  return kinds && { mode, refs, ...kinds, level };
}

const PLACEMENT = /(里侧|表侧)?(守备|攻击)表示$|(在|到)(自己|对方)?的?场上$|无视召唤条件$|在额外怪兽区域$/;

/** Parse the object of a deck reference, e.g. "「废品大王」以外的1张「废品」卡". */
export function parseObject(object: string): { excluded: string[]; targets: Target[] } | null {
  let text = object.trim();
  while (PLACEMENT.test(text)) text = text.replace(PLACEMENT, "").trim();
  const excluded = [...text.matchAll(/「([^」]+)」以外的?/g)].map((match) => match[1]);
  text = text.replace(/「([^」]+)」以外的?/g, "").replace(/(最多)?\d+(只|张)(以内的?)?/, "").trim();
  if (!text.includes("「")) return null;
  const targets = text.split("或").map(parseTarget);
  return targets.every(Boolean) ? { excluded, targets: targets as Target[] } : null;
}

const PLACES = "(?:手卡|卡组|额外卡组|墓地|除外状态)";
const REFERENCE = new RegExp(`(?:从|把)(${PLACES}(?:[·、]${PLACES})*)(?:把|选)?([^，。；]*?)(加入手卡|特殊召唤|送去墓地|给对方观看|除外|在自己场上盖放|盖放)`, "g");
const SOURCE = new RegExp(`^从(${PLACES}(?:[·、]${PLACES})*)(?:把|选)?(.*)$`);

/** Every understood reference to cards in the deck or the Extra Deck in a card's text. */
export function parseReferences(card: Card): Reference[] {
  const references: Reference[] = [];
  for (const part of card.descZh.split(/(?=[①②③④⑤⑥⑦⑧⑨])/)) {
    const effect = /^[①②③④⑤⑥⑦⑧⑨]/.test(part) ? part[0] : "";
    for (const sentence of part.split(/(?<=。)/)) {
      for (const match of sentence.matchAll(REFERENCE)) {
        // "从卡组把1只「A」怪兽或者从额外卡组把1只「B」怪兽特殊召唤" takes from two places in one sentence.
        const [first, ...others] = match[2].split(/或者?(?=从(?:手卡|卡组|额外卡组))/);
        const pieces = [[match[1], first], ...others.map((other) => other.match(SOURCE)?.slice(1, 3) ?? ["", ""])];
        const options: (Option | null)[] = pieces.map(([from, object]) => {
          const sources = from.split(/[·、]/);
          const zones: Zone[] = [];
          if (sources.includes("卡组")) zones.push("main");
          if (sources.includes("额外卡组")) zones.push("extra");
          if (zones.length === 0 || !object.includes("「")) return null;
          const parsed = parseObject(object);
          return parsed && { zones, ...parsed };
        });
        // Skip the whole reference unless every option is understood; a missing option could be the one that works.
        if (options.every(Boolean)) {
          references.push({ card, effect, text: sentence.trim().replace(/^[①②③④⑤⑥⑦⑧⑨]：/, ""), options: options as Option[] });
        }
      }
    }
  }
  return references;
}

const names = (card: Card) => [card.cn, card.md, card.sc, card.jp, card.en, ...card.aliases].filter(Boolean);

function hasName(card: Card, name: string): boolean {
  const target = norm(name);
  const treatedAs = card.descZh.match(/这个卡名在规则上当作「(.+?)」使用/);
  return names(card).some((cardName) => norm(cardName) === target) || (!!treatedAs && norm(treatedAs[1]) === target);
}

export function matchesTarget(card: Card, target: Target, inArchetype: InArchetype): boolean {
  const refMatch = {
    name: () => target.refs.some((ref) => hasName(card, ref)),
    archetype: () => target.refs.some((ref) => inArchetype(card, ref)),
    nameContains: () => target.refs.some((ref) => [card.cn, card.md, card.sc, card.jp].some((name) => name.includes(ref))),
    mentions: () => target.refs.some((ref) => card.descZh.includes(`「${ref}」`)),
  }[target.mode]();
  if (!refMatch) return false;
  const { kinds } = zhKinds(card);
  if (target.kinds.length > 0 && !target.kinds.some((kind) => kinds.has(kind))) return false;
  if (target.subtype === "通常" && [...kinds].some((kind) => !["魔法", "陷阱"].includes(kind))) return false;
  if (target.subtype && target.subtype !== "通常" && !kinds.has(target.subtype)) return false;
  if (target.level && (card.level === null || card.level < target.level[0] || card.level > target.level[1])) return false;
  return true;
}

/** References in the deck with nothing to take in any option, apart from the card's own copy. */
export function missingTargets(deck: Deck, inArchetype: InArchetype): Reference[] {
  const zones: Record<Zone, DeckEntry[]> = { main: deck.main, extra: deck.extra };
  const sources = [...new Map([...deck.main, ...deck.extra].map(({ card }) => [card.id, card])).values()];
  const available = (source: Card, option: Option) =>
    option.zones.flatMap((zone) => zones[zone]).reduce((sum, { card, count }) => {
      if (option.excluded.some((name) => hasName(card, name))) return sum;
      if (!option.targets.some((target) => matchesTarget(card, target, inArchetype))) return sum;
      return sum + count - (card.id === source.id ? 1 : 0);
    }, 0);
  return sources.flatMap(parseReferences).filter((reference) => {
    // An option that takes from a zone the deck list doesn't include (e.g. only a main deck was given) can't be judged.
    if (reference.options.some((option) => option.zones.every((zone) => zones[zone].length === 0))) return false;
    return reference.options.every((option) => available(reference.card, option) <= 0);
  });
}
