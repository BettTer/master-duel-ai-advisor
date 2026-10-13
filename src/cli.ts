// Command line used by the Claude skill (bundled to skills/master-duel-ai-advisor/scripts/mdcard.mjs).
import { parseArgs } from "node:util";
import type { Status } from "./banlist.ts";
import { NOTES_PATH, addNote, formatNotes } from "./notes.ts";
import { banlistText, lookup, refresh, search } from "./service.ts";

const USAGE = `Yu-Gi-Oh! Master Duel card lookup

  mdcard card <name or passcode>...        cards with full text (quote names that contain spaces)
  mdcard search [filters]                  search the Master Duel card pool
      --name TEXT  --text TEXT (repeatable)  --kind KIND (repeatable)  --race TYPE  --attr ATTRIBUTE
      --level N|A-B  --link N|A-B  --atk N|A-B  --def N|A-B  --archetype NAME  --rarity UR|SR|R|N
      --all-formats  --full  --limit N
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
