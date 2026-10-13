// MCP server (stdio) exposing the same lookups as the command line, for any MCP-capable assistant.
import { McpServer } from "@modelcontextprotocol/server";
import { StdioServerTransport } from "@modelcontextprotocol/server/stdio";
import * as z from "zod/v4";
import { loadBanlist } from "./banlist.ts";
import { loadCards } from "./cards.ts";
import { formatBanlist, formatLookup, formatSearch } from "./format.ts";
import { addNote, formatNotes } from "./notes.ts";
import { searchCards } from "./query.ts";

// The working rules from SKILL.md, for clients that only see this server. Keep the two in step.
const INSTRUCTIONS = `Verified Yu-Gi-Oh! Master Duel data for deckbuilding advice. Use these tools whenever the user talks about Master Duel cards or decks.

- At the start of a Master Duel conversation, call read_notes and follow the user's preferences there. They change how you answer and what you recommend, but never relax the rules below. When the user states a lasting preference, or corrects you in a way that should still apply next time, save it with add_note and tell them in one line what you saved.
- Call lookup_cards for every card your advice depends on and quote the sentence that matters. Do not describe effects from memory.
- Use only the Master Duel banlist the tools report. TCG and OCG lists do not apply. When results show an announced change that is not in effect yet, mention it.
- When the user needs a card for a slot, call search_cards with the constraints first, show the realistic candidates with rarity and banlist status, then recommend. Card text phrases work best in Chinese, where wording is more uniform; when completeness matters, also search once without the phrase.
- Rarity is crafting cost and UR is scarce. Check what you know about the user's collection, ask if that doesn't settle it, and suggest testing in a simulator before crafting.
- Give the Chinese name in 「」 with the English name, and mention the Master Duel name (MD：…) when it differs. A card that 规则上当作「X」 shares X's copy limit.
- When a plan uses several cards with restrictions such as 这个回合，自己不是X不能从额外卡组特殊召唤, compare them and say whether they conflict.
- Card text is not a ruling. If the text doesn't settle a timing question, say so and point to the card's ygocdb page.
- Offer options with their trade-offs and let the user decide. Do not invent combo routes.
- If a lesson applies to every player (wrong card data, a rule stated badly, a search that keeps missing cards), offer to draft an issue for https://github.com/BettTer/master-duel-ai-advisor/issues/new, leaving out personal details.`;

const server = new McpServer({ name: "master-duel-ai-advisor", version: "0.2.0" }, { instructions: INSTRUCTIONS });

const text = (value: string) => ({ content: [{ type: "text" as const, text: value }] });

const range = z.string().optional().describe('"12", "4-8", "8-" or "-4"');

server.registerTool(
  "lookup_cards",
  {
    description: "Look up Master Duel cards by name (Chinese, English or Japanese, full or partial) or passcode. Returns the exact Chinese and English card text, the Chinese name shown in Master Duel, MD rarity, the current MD banlist status and any announced change. Call this before quoting or relying on any card effect.",
    inputSchema: z.object({
      queries: z.array(z.string()).min(1).max(20).describe("Card names or passcodes, one card per item"),
    }),
    annotations: { readOnlyHint: true },
  },
  async ({ queries }) => text(formatLookup(await loadCards(), await loadBanlist(), queries).text),
);

server.registerTool(
  "search_cards",
  {
    description: "Search the Master Duel card pool. All filters are optional and combined with AND. Results list names, type line, MD rarity and banlist status; Extra Deck monsters also show their materials. Use full: true when you need to compare effects.",
    inputSchema: z.object({
      name: z.string().optional().describe("Part of a name, any language"),
      text: z.array(z.string()).optional().describe("Phrases that must all appear in the card text, Chinese or English, e.g. 调整＋调整以外的怪兽1只以上"),
      kind: z.array(z.string()).optional().describe("Card kinds that must all apply, Chinese or English: 融合 同调 超量 连接 仪式 灵摆 调整 效果 通常 魔法 陷阱 速攻 永续 场地 装备 反击 / fusion, synchro, tuner, quick-play..."),
      race: z.string().optional().describe("Monster type, e.g. 龙 or dragon"),
      attr: z.string().optional().describe("Attribute, e.g. 光 or light"),
      level: range.describe('Level or Rank: "12", "4-8", "8-" or "-4"'),
      link: range,
      atk: range,
      def: range,
      archetype: z.string().optional().describe("YGOPRODeck archetype name in English, e.g. Branded"),
      rarity: z.enum(["UR", "SR", "R", "N"]).optional(),
      allFormats: z.boolean().optional().describe("Include cards that are not in Master Duel"),
      full: z.boolean().optional().describe("Include each result's full card text"),
      limit: z.number().int().min(1).max(200).optional().describe("Maximum rows, default 60"),
    }),
    annotations: { readOnlyHint: true },
  },
  async (filters) => text(formatSearch(searchCards(await loadCards(), filters), await loadBanlist(), filters)),
);

server.registerTool(
  "get_banlist",
  {
    description: "The Master Duel Forbidden & Limited list in effect, or the announced list that is not in effect yet.",
    inputSchema: z.object({
      status: z.enum(["forbidden", "limited1", "limited2"]).optional(),
      upcoming: z.boolean().optional().describe("Show the announced list instead of the one in effect"),
    }),
    annotations: { readOnlyHint: true },
  },
  async (options) => {
    const banlist = await loadBanlist();
    if (!banlist) return { ...text("Could not download the Master Duel banlist."), isError: true };
    return text(formatBanlist(await loadCards(), banlist, options));
  },
);

server.registerTool(
  "read_notes",
  {
    description: "The user's saved preferences and lessons for Master Duel advice. Read them at the start of a Master Duel conversation.",
    inputSchema: z.object({}),
    annotations: { readOnlyHint: true },
  },
  async () => text(formatNotes()),
);

server.registerTool(
  "add_note",
  {
    description: "Save a lasting preference of the user, or a correction you should remember next time. One specific sentence; not one-off details of the current conversation.",
    inputSchema: z.object({
      kind: z.enum(["preference", "lesson"]),
      text: z.string().min(1),
    }),
  },
  async ({ kind, text: entry }) => {
    addNote(kind, entry);
    return text(formatNotes());
  },
);

await server.connect(new StdioServerTransport());
