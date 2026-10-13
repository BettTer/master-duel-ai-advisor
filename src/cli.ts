// Command line used by the Claude skill (bundled to skills/master-duel-ai-advisor/scripts/mdcard.mjs).
import { existsSync, readFileSync } from "node:fs";
import { parseArgs } from "node:util";
import type { Status } from "./banlist.ts";
import { NOTES_PATH, addNote, formatNotes } from "./notes.ts";
import { banlistText, importDeck, lookup, odds, refresh, search } from "./service.ts";

const USAGE = `Yu-Gi-Oh! Master Duel card lookup

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

async function main(argv: string[]): Promise<number> {
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
          limit: { type: "string", default: "60" },
        },
      });
      console.log(await search({ ...values, allFormats: values["all-formats"], limit: Number(values.limit) }));
      return 0;
    }
    case "deck": {
      if (args.length === 0) break;
      console.log(await importDeck(args[0] === "-" ? readFileSync(0, "utf8") : args.join(" ")));
      return 0;
    }
    case "odds": {
      // A change starts with "-1 …", which parseArgs would take for an option unless attached with "=".
      const attached = args.map((arg, index) => (args[index - 1] === "--change" ? null : arg === "--change" ? `--change=${args[index + 1] ?? ""}` : arg));
      const { values, positionals } = parseArgs({
        args: attached.filter((arg) => arg !== null), allowPositionals: true, options: { rules: { type: "string" }, change: { type: "string" } },
      });
      if (positionals.length === 0 || !values.rules || (positionals[0] === "-" && values.rules === "-")) break;
      const deck = positionals[0] === "-" ? readFileSync(0, "utf8") : positionals.join(" ");
      const rules = values.rules === "-" ? readFileSync(0, "utf8") : existsSync(values.rules) ? readFileSync(values.rules, "utf8") : values.rules;
      console.log(await odds(deck, rules, values.change));
      return 0;
    }
    case "plan": {
      const { values, positionals } = parseArgs({
        args, allowPositionals: true,
        options: { hand: { type: "string" }, tiers: { type: "string" }, limit: { type: "string" }, seconds: { type: "string" } },
      });
      if (positionals.length === 0 || !values.hand || !values.tiers || (positionals[0] === "-" && values.tiers === "-")) break;
      const deck = positionals[0] === "-" ? readFileSync(0, "utf8") : positionals.join(" ");
      const tiers = values.tiers === "-" ? readFileSync(0, "utf8") : existsSync(values.tiers) ? readFileSync(values.tiers, "utf8") : values.tiers;
      const { planText } = await import("./plan.ts"); // the rules engine is loaded only for this command
      console.log(await planText(deck, values.hand, tiers, { nodes: Number(values.limit ?? 1_000_000), seconds: Number(values.seconds ?? 45) }));
      return 0;
    }
    case "profile": {
      const attached = args.map((arg, index) => (args[index - 1] === "--change" ? null : arg === "--change" ? `--change=${args[index + 1] ?? ""}` : arg));
      const { values, positionals } = parseArgs({
        args: attached.filter((arg) => arg !== null), allowPositionals: true,
        options: { tiers: { type: "string" }, hands: { type: "string" }, seconds: { type: "string" }, change: { type: "string" } },
      });
      if (positionals.length === 0 || !values.tiers || (positionals[0] === "-" && values.tiers === "-")) break;
      const deck = positionals[0] === "-" ? readFileSync(0, "utf8") : positionals.join(" ");
      const tiers = values.tiers === "-" ? readFileSync(0, "utf8") : existsSync(values.tiers) ? readFileSync(values.tiers, "utf8") : values.tiers;
      const { profileText } = await import("./plan.ts");
      console.log(await profileText(deck, tiers, {
        hands: Number(values.hands ?? 100), seconds: Number(values.seconds ?? 5), change: values.change || undefined, progress: (text) => console.error(text),
      }));
      return 0;
    }
    case "banlist": {
      const { values } = parseArgs({ args, options: { status: { type: "string" }, upcoming: { type: "boolean" } } });
      if (values.status && !["forbidden", "limited1", "limited2"].includes(values.status)) break;
      const text = await banlistText({ status: values.status as Status | undefined, upcoming: values.upcoming });
      if (!text) {
        console.error("没能下载 Master Duel 禁限表。");
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
        console.log(`已保存到 ${NOTES_PATH}\n`);
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
  },
);
