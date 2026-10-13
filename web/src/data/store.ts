// The user's decks, kept in IndexedDB for good: the deck text, its name, its endpoint list and the last hand.
import { kvGet, kvSet } from "./db.ts";

export interface SavedDeck {
  id: string;
  name: string;
  text: string; // YDKE, .ydk contents or a card list, as imported
  tiers: string;
  draft?: string; // the endpoint draft the tiers were filled from; while tiers still equal it, a newer draft replaces them
  hand: number[]; // passcodes of the last hand planned
  createdAt: string;
  updatedAt: string;
}

const INDEX = "decks";

export async function listDecks(): Promise<SavedDeck[]> {
  const ids = (await kvGet<string[]>(INDEX)) ?? [];
  const decks = await Promise.all(ids.map((id) => kvGet<SavedDeck>(`deck:${id}`)));
  return decks.filter((deck): deck is SavedDeck => !!deck).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function saveDeck(deck: SavedDeck): Promise<void> {
  const ids = (await kvGet<string[]>(INDEX)) ?? [];
  if (!ids.includes(deck.id)) await kvSet(INDEX, [...ids, deck.id]);
  await kvSet(`deck:${deck.id}`, { ...deck, updatedAt: new Date().toISOString() });
}

export async function deleteDeck(id: string): Promise<void> {
  const ids = (await kvGet<string[]>(INDEX)) ?? [];
  await kvSet(INDEX, ids.filter((other) => other !== id));
  await kvSet(`deck:${id}`, undefined);
}

export function newDeck(name: string, text: string): SavedDeck {
  const now = new Date().toISOString();
  return { id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, name, text, tiers: "", hand: [], createdAt: now, updatedAt: now };
}
