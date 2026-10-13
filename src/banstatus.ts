// Banlist types and lookups that need no files or network, shared with the web version.
import type { Card } from "./merge.ts";

export type Status = "forbidden" | "limited1" | "limited2";
export type BanStatus = Status | "unlimited" | "unknown";

export interface Entry {
  id?: number | null; // passcode
  cid?: number; // KONAMI card database ID
  name?: string;
  status: Status;
}

export interface Regulation {
  date: string;
  entries: Entry[];
}

export interface Banlist {
  source: string;
  current: Regulation;
  upcoming: Regulation | null;
}

export const jstDate = (iso: string) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tokyo" }).format(new Date(iso)); // YYYY-MM-DD

export function entryKeys(entry: Entry): string[] {
  const keys: string[] = [];
  if (entry.cid) keys.push(`cid:${entry.cid}`);
  if (entry.id) keys.push(`id:${entry.id}`);
  if (entry.name) keys.push(`name:${entry.name.toLowerCase()}`);
  return keys;
}

export function cardKeys(card: Card): string[] {
  return [
    `cid:${card.cid}`,
    ...[card.id, ...card.altIds].map((id) => `id:${id}`),
    ...[card.en, ...card.aliases].filter(Boolean).map((name) => `name:${name.toLowerCase()}`),
  ];
}

const indexes = new WeakMap<Regulation, Map<string, Status>>();

export function banStatus(card: Card, regulation: Regulation): Status | "unlimited" {
  let index = indexes.get(regulation);
  if (!index) {
    index = new Map(regulation.entries.flatMap((entry) => entryKeys(entry).map((key) => [key, entry.status] as const)));
    indexes.set(regulation, index);
  }
  for (const key of cardKeys(card)) {
    const status = index.get(key);
    if (status) return status;
  }
  return "unlimited";
}
