import type { Card } from "./cards.ts";

export const RARITY: Record<string, string> = { "Ultra Rare": "UR", "Super Rare": "SR", "Rare": "R", "Common": "N" };

export function norm(value: string): string {
  return value.replace(/[\s·・\-－'"“”‘’「」『』!！?？,，.。:：]/g, "").toLowerCase();
}

function normText(value: string): string {
  return value.replace(/\s/g, "").replaceAll("＋", "+").toLowerCase();
}

function names(card: Card): string[] {
  return [card.cn, card.md, card.sc, card.jp, card.en, ...card.aliases].filter(Boolean);
}

/** Cards matching a passcode, or a name in any language: exact matches if any, otherwise partial ones. */
export function findCards(cards: Card[], query: string): Card[] {
  if (/^\d+$/.test(query)) {
    const id = Number(query);
    return cards.filter((card) => card.id === id || card.altIds.includes(id));
  }
  const target = norm(query);
  const exact: Card[] = [];
  const partial: Card[] = [];
  for (const card of cards) {
    const normalized = names(card).map(norm);
    if (normalized.includes(target)) exact.push(card);
    else if (normalized.some((name) => name.includes(target))) partial.push(card);
  }
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
    if (!filters.allFormats && !card.mdRarity) return false;
    const { kindTokens, raceTokens, attrTokens } = tokens(card);
    if (filters.kind?.some((kind) => !kindTokens.has(kind.toLowerCase()))) return false;
    if (filters.race && !raceTokens.has(filters.race.toLowerCase())) return false;
    if (filters.attr && !attrTokens.has(filters.attr.toLowerCase())) return false;
    if (filters.level && !inRange(card.level, filters.level)) return false;
    if (filters.link && !inRange(card.link, filters.link)) return false;
    if (filters.atk && !inRange(card.atk, filters.atk)) return false;
    if (filters.def && !inRange(card.def, filters.def)) return false;
    if (filters.archetype && !card.archetype.toLowerCase().includes(filters.archetype.toLowerCase())) return false;
    if (filters.rarity && RARITY[card.mdRarity] !== filters.rarity.toUpperCase()) return false;
    if (filters.name && !names(card).some((name) => norm(name).includes(norm(filters.name!)))) return false;
    if (filters.text?.length) {
      const texts = `${normText(card.descZh + card.pdescZh)}\n${normText(card.descEn)}`;
      if (filters.text.some((phrase) => !texts.includes(normText(phrase)))) return false;
    }
    return true;
  });
  const rank = (card: Card) => card.level || card.link || 0;
  return results.sort((a, b) => rank(b) - rank(a) || (a.en < b.en ? -1 : a.en > b.en ? 1 : 0));
}
