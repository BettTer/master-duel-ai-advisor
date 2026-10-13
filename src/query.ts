import type { Card } from "./merge.ts";

export function norm(value: string): string {
  return value.replace(/[\s·・\-－'"“”‘’「」『』!！?？,，.。:：<>＜＞]/g, "").toLowerCase();
}

function normText(value: string): string {
  return value.replace(/\s/g, "").replaceAll("＋", "+").toLowerCase();
}

/** In Master Duel now: it has a Master Duel rarity and its release, if known, has passed. */
export function inMasterDuel(card: Card, now = Date.now()): boolean {
  return card.mdRarity !== "" && (!card.mdRelease || Date.parse(card.mdRelease) <= now);
}

function names(card: Card): string[] {
  return [card.cn, card.md, card.sc, card.jp, card.en, ...card.aliases].filter(Boolean);
}

/** Cards whose passcode or name (any language) equals the query, and cards whose name contains it. */
export function matchCards(cards: Card[], query: string): { exact: Card[]; partial: Card[] } {
  if (/^\d+$/.test(query)) {
    const id = Number(query);
    return { exact: cards.filter((card) => card.id === id || card.altIds.includes(id)), partial: [] };
  }
  const target = norm(query);
  const exact: Card[] = [];
  const partial: Card[] = [];
  if (!target) return { exact, partial };
  for (const card of cards) {
    const normalized = names(card).map(norm);
    if (normalized.includes(target)) exact.push(card);
    else if (normalized.some((name) => name.includes(target))) partial.push(card);
  }
  return { exact, partial };
}

/** Exact matches if any, otherwise partial ones. */
export function findCards(cards: Card[], query: string): Card[] {
  const { exact, partial } = matchCards(cards, query);
  return exact.length > 0 ? exact : partial;
}

/** Card kinds, monster type and attribute parsed from the Chinese type line, e.g. "[怪兽|效果|同调] 魔法师/光". */
export function zhKinds(card: Card): { kinds: Set<string>; race: string; attr: string } {
  const match = card.typesZh.split("\n")[0].match(/\[([^\]]*)\]\s*(\S*)/);
  if (!match) return { kinds: new Set(), race: "", attr: "" };
  const [race, attr = ""] = match[2].split("/");
  return { kinds: new Set(match[1].split("|")), race, attr };
}

function tokens(card: Card) {
  const { kinds, race, attr } = zhKinds(card);
  const isMonster = card.typeEn.toLowerCase().includes("monster");
  const kindTokens = new Set([
    ...[...kinds].map((kind) => kind.toLowerCase()),
    ...card.typeline.map((word) => word.toLowerCase()),
    ...card.typeEn.toLowerCase().split(/\s+/),
  ]);
  if (!isMonster && card.raceEn) kindTokens.add(card.raceEn.toLowerCase()); // Quick-Play, Continuous, ...
  const raceTokens = new Set([race, ...(isMonster ? [card.raceEn.toLowerCase()] : [])]);
  const attrTokens = new Set([attr, card.attrEn.toLowerCase()]);
  for (const set of [kindTokens, raceTokens, attrTokens]) set.delete("");
  return { kindTokens, raceTokens, attrTokens };
}

/** "12", "4-8", "8-" or "-4". */
export function inRange(value: number | null, spec: string): boolean {
  if (value === null) return false;
  const [low, high] = spec.includes("-") ? spec.split("-") : [spec, spec];
  const bounds = [low, high].map((bound) => (bound === "" ? null : Number(bound)));
  if (bounds.some((bound) => bound !== null && Number.isNaN(bound))) throw new Error(`Bad range "${spec}"`);
  return (bounds[0] === null || value >= bounds[0]) && (bounds[1] === null || value <= bounds[1]);
}

export interface SearchFilters {
  name?: string;
  text?: string[];
  kind?: string[];
  race?: string;
  attr?: string;
  level?: string;
  link?: string;
  atk?: string;
  def?: string;
  archetype?: string;
  rarity?: string;
  allFormats?: boolean;
}

export function searchCards(cards: Card[], filters: SearchFilters): Card[] {
  const results = cards.filter((card) => {
    if (!filters.allFormats && !inMasterDuel(card)) return false;
    const { kindTokens, raceTokens, attrTokens } = tokens(card);
    if (filters.kind?.some((kind) => !kindTokens.has(kind.toLowerCase()))) return false;
    if (filters.race && !raceTokens.has(filters.race.toLowerCase())) return false;
    if (filters.attr && !attrTokens.has(filters.attr.toLowerCase())) return false;
    if (filters.level && !inRange(card.level, filters.level)) return false;
    if (filters.link && !inRange(card.link, filters.link)) return false;
    if (filters.atk && !inRange(card.atk, filters.atk)) return false;
    if (filters.def && !inRange(card.def, filters.def)) return false;
    if (filters.archetype && !card.archetype.toLowerCase().includes(filters.archetype.toLowerCase())) return false;
    if (filters.rarity && card.mdRarity !== filters.rarity.toUpperCase()) return false;
    if (filters.name && !names(card).some((name) => norm(name).includes(norm(filters.name!)))) return false;
    if (filters.text?.length) {
      const texts = `${normText(card.descZh + card.pdescZh)}\n${normText(card.descEn)}`;
      if (filters.text.some((phrase) => !texts.includes(normText(phrase)))) return false;
    }
    return true;
  });
  // Names that start with the query first ("I:P" should find I:P Masquerena before every name containing "ip").
  const query = filters.name ? norm(filters.name) : "";
  const starts = (card: Card) => (query && names(card).some((name) => norm(name).startsWith(query)) ? 0 : 1);
  const rank = (card: Card) => card.level || card.link || 0;
  return results.sort((a, b) => starts(a) - starts(b) || rank(b) - rank(a) || (a.en < b.en ? -1 : a.en > b.en ? 1 : 0));
}

/** Does a card belong to the archetype with this YGOPro code? Sub-archetype bits of the code must be present too. */
function inSet(card: Card, code: number): boolean {
  return card.setcodes.some((setcode) => (setcode & 0xfff) === (code & 0xfff) && (setcode & code & 0xf000) === (code & 0xf000));
}

/**
 * Archetype membership for names as written in card text, such as 「死狱乡」. A card belongs if its name contains
 * the word, its text says it is also treated as one, or it carries the archetype's code. The code is the one most
 * cards with the word in their Chinese name share; names alone miss members such as 赫圣之妖骑士 (a 「死狱乡」 card).
 */
export function archetypeLookup(cards: Card[]): (card: Card, archetype: string) => boolean {
  const codes = new Map<string, number | null>();
  const codeOf = (archetype: string): number | null => {
    if (!codes.has(archetype)) {
      const counts = new Map<number, number>();
      for (const card of cards) {
        if (!card.cn.includes(archetype)) continue;
        for (const code of new Set(card.setcodes)) counts.set(code, (counts.get(code) ?? 0) + 1);
      }
      const [best] = [...counts].sort((a, b) => b[1] - a[1]);
      codes.set(archetype, best && best[1] >= 2 ? best[0] : null);
    }
    return codes.get(archetype)!;
  };
  return (card, archetype) => {
    if ([card.cn, card.md, card.sc, card.jp].some((name) => name.includes(archetype))) return true;
    if (card.descZh.includes(`也当作「${archetype}」`)) return true;
    const code = codeOf(archetype);
    return code !== null && inSet(card, code);
  };
}
