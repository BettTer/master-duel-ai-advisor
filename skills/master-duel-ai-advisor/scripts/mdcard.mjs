#!/usr/bin/env node
import {
  CONFIG_DIR,
  banlistText,
  importDeck,
  lookup,
  odds,
  refresh,
  search,
  writeText
} from "./chunks/chunk-TZOZXHST.mjs";
import "./chunks/chunk-KT3BCFM7.mjs";
import "./chunks/chunk-5P7U5YBU.mjs";

// src/cli.ts
import { existsSync as existsSync2, readFileSync as readFileSync2 } from "node:fs";
import { parseArgs } from "node:util";

// src/notes.ts
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
var NOTES_PATH = join(CONFIG_DIR, "notes.md");
var TEMPLATE = `# Master Duel AI Advisor notes

Your preferences and the lessons the assistant should remember. Updating the skill does not change this file,
and you can edit it by hand.

## Preferences

## Lessons
`;
var HEADINGS = { preference: "## Preferences", lesson: "## Lessons" };
function addEntry(notes, kind, entry, date) {
  const heading = HEADINGS[kind];
  if (!notes.includes(heading)) notes = `${notes.replace(/\n+$/, "")}

${heading}
`;
  const start = notes.indexOf(heading) + heading.length;
  const next = notes.indexOf("\n## ", start);
  const end = next === -1 ? notes.length : next;
  const section = `${notes.slice(start, end).replace(/\n+$/, "")}
- ${date} ${entry}
`;
  return notes.slice(0, start) + section + notes.slice(end);
}
function readNotes() {
  return existsSync(NOTES_PATH) ? readFileSync(NOTES_PATH, "utf8") : null;
}
function addNote(kind, entry) {
  const date = (/* @__PURE__ */ new Date()).toLocaleDateString("en-CA");
  writeText(NOTES_PATH, addEntry(readNotes() ?? TEMPLATE, kind, entry, date));
}
function formatNotes() {
  return `\u7B14\u8BB0\u6587\u4EF6\uFF1A${NOTES_PATH}
${readNotes() ?? "\uFF08\u8FD8\u6CA1\u6709\u7B14\u8BB0\uFF09"}`;
}

// src/cli.ts
var USAGE = `Yu-Gi-Oh! Master Duel card lookup

  mdcard card <name or passcode>...        cards with full text (quote names that contain spaces)
  mdcard search [filters]                  search the Master Duel card pool
      --name TEXT  --text TEXT (repeatable)  --kind KIND (repeatable)  --race TYPE  --attr ATTRIBUTE
      --level N|A-B  --link N|A-B  --atk N|A-B  --def N|A-B  --archetype NAME  --rarity UR|SR|R|N
      --all-formats  --full  --limit N
  mdcard deck <deck>                       read and check a deck: a card database deck URL, a YDKE string,
                                           a .ydk file, or a text list ("-" reads it from standard input)
  mdcard odds <deck> --rules <file|-|text> [--change "-1 A, +1 B"]
                                           opening-hand odds going first and second, from rules of what each
                                           card needs and gives (see SKILL.md); --change compares a changed deck
  mdcard plan <deck> --hand "A,B,C,D,E" --tiers <file|-|text> [--seconds 45] [--limit 1000000]
                                           the best board an opening hand reaches going first, searched with
                                           EDOPro's rules engine and scored by the tiers (see SKILL.md)
  mdcard profile <deck> --tiers <file|-|text> [--hands 100] [--seconds 5] [--change "-1 A, +1 B"]
                                           sample opening hands and plan each: average board, brick rate, what each
                                           card adds; --change compares a changed deck
  mdcard banlist [--status forbidden|limited1|limited2] [--upcoming]
  mdcard notes [--preference TEXT | --lesson TEXT]
  mdcard update                            re-download card data and the banlist now`;
async function main(argv) {
  const [command, ...args] = argv;
  switch (command) {
    case "card": {
      if (args.length === 0) break;
      const { text, missing } = await lookup(args);
      console.log(text);
      return missing ? 1 : 0;
    }
    case "search": {
      const { values } = parseArgs({
        args,
        options: {
          name: { type: "string" },
          text: { type: "string", multiple: true },
          kind: { type: "string", multiple: true },
          race: { type: "string" },
          attr: { type: "string" },
          level: { type: "string" },
          link: { type: "string" },
          atk: { type: "string" },
          def: { type: "string" },
          archetype: { type: "string" },
          rarity: { type: "string" },
          "all-formats": { type: "boolean" },
          full: { type: "boolean" },
          limit: { type: "string", default: "60" }
        }
      });
      console.log(await search({ ...values, allFormats: values["all-formats"], limit: Number(values.limit) }));
      return 0;
    }
    case "deck": {
      if (args.length === 0) break;
      console.log(await importDeck(args[0] === "-" ? readFileSync2(0, "utf8") : args.join(" ")));
      return 0;
    }
    case "odds": {
      const attached = args.map((arg, index) => args[index - 1] === "--change" ? null : arg === "--change" ? `--change=${args[index + 1] ?? ""}` : arg);
      const { values, positionals } = parseArgs({
        args: attached.filter((arg) => arg !== null),
        allowPositionals: true,
        options: { rules: { type: "string" }, change: { type: "string" } }
      });
      if (positionals.length === 0 || !values.rules || positionals[0] === "-" && values.rules === "-") break;
      const deck = positionals[0] === "-" ? readFileSync2(0, "utf8") : positionals.join(" ");
      const rules = values.rules === "-" ? readFileSync2(0, "utf8") : existsSync2(values.rules) ? readFileSync2(values.rules, "utf8") : values.rules;
      console.log(await odds(deck, rules, values.change));
      return 0;
    }
    case "plan": {
      const { values, positionals } = parseArgs({
        args,
        allowPositionals: true,
        options: { hand: { type: "string" }, tiers: { type: "string" }, limit: { type: "string" }, seconds: { type: "string" } }
      });
      if (positionals.length === 0 || !values.hand || !values.tiers || positionals[0] === "-" && values.tiers === "-") break;
      const deck = positionals[0] === "-" ? readFileSync2(0, "utf8") : positionals.join(" ");
      const tiers = values.tiers === "-" ? readFileSync2(0, "utf8") : existsSync2(values.tiers) ? readFileSync2(values.tiers, "utf8") : values.tiers;
      const { planText } = await import("./chunks/plan-3BQOXSRQ.mjs");
      console.log(await planText(deck, values.hand, tiers, { nodes: Number(values.limit ?? 1e6), seconds: Number(values.seconds ?? 45) }));
      return 0;
    }
    case "profile": {
      const attached = args.map((arg, index) => args[index - 1] === "--change" ? null : arg === "--change" ? `--change=${args[index + 1] ?? ""}` : arg);
      const { values, positionals } = parseArgs({
        args: attached.filter((arg) => arg !== null),
        allowPositionals: true,
        options: { tiers: { type: "string" }, hands: { type: "string" }, seconds: { type: "string" }, change: { type: "string" } }
      });
      if (positionals.length === 0 || !values.tiers || positionals[0] === "-" && values.tiers === "-") break;
      const deck = positionals[0] === "-" ? readFileSync2(0, "utf8") : positionals.join(" ");
      const tiers = values.tiers === "-" ? readFileSync2(0, "utf8") : existsSync2(values.tiers) ? readFileSync2(values.tiers, "utf8") : values.tiers;
      const { profileText } = await import("./chunks/plan-3BQOXSRQ.mjs");
      console.log(await profileText(deck, tiers, {
        hands: Number(values.hands ?? 100),
        seconds: Number(values.seconds ?? 5),
        change: values.change || void 0,
        progress: (text) => console.error(text)
      }));
      return 0;
    }
    case "banlist": {
      const { values } = parseArgs({ args, options: { status: { type: "string" }, upcoming: { type: "boolean" } } });
      if (values.status && !["forbidden", "limited1", "limited2"].includes(values.status)) break;
      const text = await banlistText({ status: values.status, upcoming: values.upcoming });
      if (!text) {
        console.error("\u6CA1\u80FD\u4E0B\u8F7D Master Duel \u7981\u9650\u8868\u3002");
        return 1;
      }
      console.log(text);
      return 0;
    }
    case "notes": {
      const { values } = parseArgs({ args, options: { preference: { type: "string" }, lesson: { type: "string" } } });
      if (values.preference && values.lesson) break;
      const entry = values.preference ?? values.lesson;
      if (entry) {
        addNote(values.preference ? "preference" : "lesson", entry);
        console.log(`\u5DF2\u4FDD\u5B58\u5230 ${NOTES_PATH}
`);
      }
      console.log(formatNotes());
      return 0;
    }
    case "update":
      console.log(await refresh());
      return 0;
  }
  console.error(USAGE);
  return 2;
}
main(process.argv.slice(2)).then(
  (code) => {
    process.exitCode = code;
  },
  (error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
);
