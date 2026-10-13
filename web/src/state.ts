// Shared types and the URL hash, which carries the deck and the hand so a link reproduces them.
import type { Deck } from "../../src/deck.ts";
import type { Card } from "../../src/merge.ts";
import { LEVELS } from "../../src/search.ts";

export type Sub = "overview" | "hand" | "route" | "profile";
export const SUBS: { id: Sub; label: string }[] = [
  { id: "overview", label: "卡表与检查" }, { id: "hand", label: "起手" }, { id: "route", label: "路线图" }, { id: "profile", label: "全景" },
];
/** Where the app is: the library, the lookup, or one deck's workspace. */
export type Route = { page: "library" } | { page: "lookup" } | { page: "deck"; id: string; sub: Sub };

export function parseRoute(hash: string): Route {
  const match = hash.match(/^#\/deck\/([^/]+)\/?(overview|hand|route|profile)?$/);
  if (match) return { page: "deck", id: match[1], sub: (match[2] as Sub) ?? "overview" };
  if (hash === "#/lookup") return { page: "lookup" };
  return { page: "library" };
}

export function routeHash(route: Route): string {
  return route.page === "deck" ? `#/deck/${route.id}/${route.sub}` : route.page === "lookup" ? "#/lookup" : "#/decks";
}

/** A YDKE string for a deck, so the URL can carry it. */
export function encodeYdke(deck: Deck): string {
  const section = (entries: { card: Card; count: number }[]) => {
    const ids = entries.flatMap(({ card, count }) => Array<number>(count).fill(card.id));
    const bytes = new Uint8Array(ids.length * 4);
    new DataView(bytes.buffer).setUint32; // keep the view type-checked
    ids.forEach((id, index) => new DataView(bytes.buffer).setUint32(index * 4, id, true));
    return btoa(String.fromCharCode(...bytes));
  };
  return `ydke://${section(deck.main)}!${section(deck.extra)}!${section(deck.side)}!`;
}

/** A shared link carries the deck itself and a hand: #deck=<ydke>&hand=<passcodes>. */
export function readShared(hash: string): { deck?: string; hand?: number[] } {
  if (!hash.startsWith("#deck=")) return {};
  const params = new URLSearchParams(hash.slice(1));
  const deck = params.get("deck") ?? undefined;
  const hand = params.get("hand")?.split(",").map(Number).filter((id) => id > 0);
  return { deck, hand: hand?.length ? hand : undefined };
}

export function shareLink(deck: Deck, hand: Card[]): string {
  const params = new URLSearchParams();
  params.set("deck", encodeYdke(deck));
  if (hand.length > 0) params.set("hand", hand.map((card) => card.id).join(","));
  return `${location.origin}${location.pathname}#${params}`;
}

/** Colors for endpoint levels, by index into LEVELS. */
export const LEVEL_COLORS = ["#f2c14e", "#e5484d", "#b07cf5", "#f0883e", "#3dd6c8", "#3dd6c8", "#8c96ad", "#5aa9ff"];
export const levelName = (level: number) => (level >= 0 ? LEVELS[level].name : "");
export const levelColor = (level: number) => (level >= 0 ? LEVEL_COLORS[level] : "#8c96ad");

export const imageUrl = (id: number) => `https://cdn.233.momobako.com/ygopro/pics/${id}.jpg`;
export const cardName = (card: Card) => card.cn || card.en || String(card.id);
