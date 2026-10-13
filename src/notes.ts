// The user's own preferences and lessons, kept outside the skill so updates never overwrite them.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { CONFIG_DIR, writeText } from "./cache.ts";

export const NOTES_PATH = join(CONFIG_DIR, "notes.md");

const TEMPLATE = `# Master Duel AI Advisor notes

Your preferences and the lessons the assistant should remember. Updating the skill does not change this file,
and you can edit it by hand.

## Preferences

## Lessons
`;

const HEADINGS = { preference: "## Preferences", lesson: "## Lessons" };

export type NoteKind = keyof typeof HEADINGS;

/** Append a dated entry to the end of the matching section. */
export function addEntry(notes: string, kind: NoteKind, entry: string, date: string): string {
  const heading = HEADINGS[kind];
  if (!notes.includes(heading)) notes = `${notes.replace(/\n+$/, "")}\n\n${heading}\n`;
  const start = notes.indexOf(heading) + heading.length;
  const next = notes.indexOf("\n## ", start);
  const end = next === -1 ? notes.length : next;
  const section = `${notes.slice(start, end).replace(/\n+$/, "")}\n- ${date} ${entry}\n`;
  return notes.slice(0, start) + section + notes.slice(end);
}

export function readNotes(): string | null {
  return existsSync(NOTES_PATH) ? readFileSync(NOTES_PATH, "utf8") : null;
}

export function addNote(kind: NoteKind, entry: string): void {
  const date = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD, local time
  writeText(NOTES_PATH, addEntry(readNotes() ?? TEMPLATE, kind, entry, date));
}

export function formatNotes(): string {
  return `笔记文件：${NOTES_PATH}\n${readNotes() ?? "（还没有笔记）"}`;
}
