// The operations both entry points offer: load the data, run the query, return text.
import { jstDate, loadBanlist, type Status } from "./banlist.ts";
import { cardDataInfo, loadCards, reloadIfSourcesChanged } from "./cards.ts";
import { checkDeck, readDeck, type Deck } from "./deck.ts";
import { banlistNote, formatBanlist, formatDeck, formatLookup, formatSearch } from "./format.ts";
import type { Card } from "./cards.ts";
import { analyzeLocks } from "./locks.ts";
import { archetypeLookup, inMasterDuel, searchCards, type SearchFilters } from "./query.ts";
import { missingTargets } from "./refs.ts";

const lookups = new WeakMap<Card[], ReturnType<typeof archetypeLookup>>();
function archetypesOf(cards: Card[]) {
  if (!lookups.has(cards)) lookups.set(cards, archetypeLookup(cards));
  return lookups.get(cards)!;
}

const distinctCards = (deck: Deck, sections: ("main" | "extra")[]) =>
  [...new Map(sections.flatMap((section) => deck[section]).map(({ card }) => [card.id, card])).values()];

/** Full details for each query. If one matched nothing, check right away whether a source has newer data. */
export async function lookup(queries: string[]): Promise<{ text: string; missing: boolean }> {
  const banlist = await loadBanlist();
  let result = formatLookup(await loadCards(), banlist, queries);
  if (result.missing) {
    const fresh = await reloadIfSourcesChanged();
    if (fresh) result = formatLookup(fresh, banlist, queries);
  }
  return result;
}

export async function search(filters: SearchFilters & { full?: boolean; limit?: number }): Promise<string> {
  return formatSearch(searchCards(await loadCards(), filters), await loadBanlist(), filters);
}

/** Read a deck (card database URL, YDKE, .ydk or a plain list) and check it. */
export async function importDeck(input: string): Promise<string> {
  const banlist = await loadBanlist();
  let cards = await loadCards();
  let deck = await readDeck(input, cards);
  if (deck.unknown.length > 0) {
    const fresh = await reloadIfSourcesChanged(); // the deck may contain cards from a pack released today
    if (fresh) {
      cards = fresh;
      deck = await readDeck(input, cards);
    }
  }
  const inArchetype = archetypesOf(cards);
  const locks = analyzeLocks(distinctCards(deck, ["main", "extra"]), distinctCards(deck, ["extra"]), inArchetype);
  return formatDeck(deck, checkDeck(deck, cards, banlist), banlist, locks, missingTargets(deck, inArchetype));
}

/** The banlist as text, or null if it could never be downloaded. */
export async function banlistText(options: { status?: Status; upcoming?: boolean }): Promise<string | null> {
  const banlist = await loadBanlist();
  return banlist && formatBanlist(await loadCards(), banlist, options);
}

/** Re-download everything now and describe what the data was built from. */
export async function refresh(): Promise<string> {
  const cards = await loadCards(true);
  const banlist = await loadBanlist(true);
  const { sources, mdSource } = cardDataInfo()!;
  return [
    `卡片数据 ${cards.length} 张，其中 MD 已实装 ${cards.filter((card) => inMasterDuel(card)).length} 张`,
    `数据版本：百鸽 ${sources.ygocdb?.slice(0, 8) ?? "?"}，YGOPRODeck ${sources.ygoprodeck ?? "?"}，`
      + `MD 卡池最新实装 ${sources.mdPool ? jstDate(sources.mdPool) : "?"}（MD 稀有度来源 ${mdSource}）`,
    banlistNote(banlist),
  ].join("\n");
}
