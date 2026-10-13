// MCP server (stdio) exposing the same lookups as the command line, for any MCP-capable assistant.
import { McpServer } from "@modelcontextprotocol/server";
import { StdioServerTransport } from "@modelcontextprotocol/server/stdio";
import * as z from "zod/v4";
import packageInfo from "../package.json" with { type: "json" };
import { addNote, formatNotes } from "./notes.ts";
import { banlistText, importDeck, lookup, odds, search } from "./service.ts";

// The working rules from SKILL.md, for clients that only see this server. Keep the two in step.
const INSTRUCTIONS = `Verified Yu-Gi-Oh! Master Duel data for deckbuilding advice. Use these tools whenever the user talks about Master Duel cards or decks.

- At the start of a Master Duel conversation, call read_notes and follow the user's preferences there. They change how you answer and what you recommend, but never relax the rules below. When the user states a lasting preference, or corrects you in a way that should still apply next time, save it with add_note and tell them in one line what you saved.
- When the user shares a deck (a deck URL from the official card database db.yugioh-card.com, a YDKE string, a .ydk file or a card list), call import_deck first and mention the problems and Extra Deck lock conflicts it reports. Its list of effects that may have no target (可能没有目标) is a hint from names and archetype codes: confirm each with lookup_cards before calling a card dead.
- For consistency questions (how often the deck bricks, 卡手率, whether a change helps), call hand_odds. Write its rules from the card text, never from memory: for each Main Deck card that can help start plays, what it needs in the opening hand (another card, a discard, the Normal Summon, a state such as a LIGHT or DARK monster in the GY) and what it gives (cards it adds from the Deck, states it creates, and 能动 when the deck can go on from there to a usable end board). A card that only adds a body gives a state for other lines to need. Describe required or searched cards the way the card text does instead of listing names, so the tool finds every match. Always show the user the rules with the numbers and let them correct the rules.
- For what a given opening hand can do (最大场, 起手怎么展开, which end board), call plan_hand. First write the deck's endpoints from the card text, one line per card: its level (第0级 cannot be responded to, 第一级 negates anything, 1.5级 Maxx "C", 第二级 a conditional negate, 2.5级 a very narrow one, 软康 a tax or lock, 第三级 removal, 保护), and 回合外 → <zone> <cards> for a card whose value is what it brings out on the opponent's turn, such as Spright Elf summoning a Level 2 from the GY. Follow such chains as far as they go. Show the user the endpoint list with the result and present the route exactly as the engine found it.
- Call lookup_cards for every card your advice depends on and quote the sentence that matters. Do not describe effects from memory.
- Use only the Master Duel banlist the tools report. TCG and OCG lists do not apply. When results show an announced change that is not in effect yet, mention it.
- When the user needs a card for a slot, call search_cards with the constraints first, show the realistic candidates with rarity and banlist status, then recommend. Card text phrases work best in Chinese, where wording is more uniform; when completeness matters, also search once without the phrase.
- Rarity is crafting cost and UR is scarce. Check what you know about the user's collection, ask if that doesn't settle it, and suggest testing in a simulator before crafting.
- Give the Chinese name in 「」 with the English name, and mention the Master Duel name (MD：…) when it differs. A card that 规则上当作「X」 shares X's copy limit.
- When a plan uses several cards with restrictions such as 这个回合，自己不是X不能从额外卡组特殊召唤, compare them and say whether they conflict.
- Card text is not a ruling. If the text doesn't settle a timing question, say so and point to the card's ygocdb page.
- Offer options with their trade-offs and let the user decide. Do not invent combo routes.
- If a lesson applies to every player (wrong card data, a rule stated badly, a search that keeps missing cards), offer to draft an issue for https://github.com/BettTer/master-duel-ai-advisor/issues/new, leaving out personal details.`;

const server = new McpServer({ name: "master-duel-ai-advisor", version: packageInfo.version }, { instructions: INSTRUCTIONS });

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
  async ({ queries }) => text((await lookup(queries)).text),
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
  async (filters) => text(await search(filters)),
);

server.registerTool(
  "import_deck",
  {
    description: "Read a Master Duel deck and check it. Accepts the URL of a public deck page on the official Yu-Gi-Oh! card database (db.yugioh-card.com, which Master Duel decks can be exported to), a YDKE string, the contents of a .ydk file, or a plain list with one card per line such as \"3 灰流丽\", \"Ash Blossom & Joyous Spring x3\" or \"灰流うらら ×3\". Returns every card with its rarity and banlist status, the deck's rarity totals, its Extra Deck locks (which Extra Deck monsters each \"this turn you can only Special Summon X from the Extra Deck\" restriction rules out, and which pairs of locks leave few or none in the same turn), effects that search or Special Summon from the Deck or Extra Deck with no qualifying card in the list other than the card itself, and problems with deck size, copies, the Master Duel banlist and cards not in Master Duel.",
    inputSchema: z.object({
      deck: z.string().min(1).describe("Deck URL, YDKE string, .ydk contents or a card list"),
    }),
    annotations: { readOnlyHint: true },
  },
  async ({ deck }) => text(await importDeck(deck)),
);

server.registerTool(
  "hand_odds",
  {
    description: [
      "Exact opening-hand odds for a Master Duel deck, going first (5 cards) and going second (6 cards): how often a hand can start the deck's plays and how often it has two or more separate starts, counted over every possible hand. You write the rules from the card text, one line per card that matters:",
      "卡名：要 条件；条件 → 给；给",
      "Conditions: 手里 <cards> (another card that must be in the hand and stays there, e.g. revealed), 丢 <cards> or 素材 <cards> (a card that leaves the hand to use this one, as a cost or a Fusion Material), 通召 (uses the turn's one Normal Summon), or a state you name, such as 墓地有光暗. Leave out 要 when the card needs nothing.",
      "Gives: 拿 <cards> (adds a card from the Deck to the hand), 能动 (from here the deck reaches a usable end board), or a state. A state must be spelled the same where it is given and where it is needed.",
      "An Extra Deck monster can have a line too; its conditions are states, for example two bodies on the field.",
      "后手：<states> lists states the opponent's first turn provides when going second, e.g. 后手：墓地有光暗.",
      "<cards> is written like card text: 「卡名」, 「字段」怪兽, 4星以下, 4～8星, 光暗, 战士族, 攻或守2500, 攻守2500, 调整, 同调, 不能通常召唤, 魔法, 陷阱, 「X」以外.",
      "Example: 再世之魔神 必密巴：要 手里 攻或守2500 怪兽 → 能动 / 再世记：→ 拿 「再世」怪兽 / 深渊之兽 德鲁伊鳞虫：要 墓地有光暗 → 能动",
      "Each card is used at most once per hand; several lines for one card are alternative ways to use it, e.g. a Normal Summon line and a line for its own Special Summon condition. The result lists every line with the Main Deck cards each description matched, and any line it could not use.",
    ].join("\n"),
    inputSchema: z.object({
      deck: z.string().min(1).describe("Deck URL, YDKE string, .ydk contents or a card list"),
      rules: z.string().min(1).describe("One rule per line, as described above"),
      change: z.string().optional().describe("Compare with a changed Main Deck, e.g. \"-1 增殖的G, +1 增援\""),
    }),
    annotations: { readOnlyHint: true },
  },
  async ({ deck, rules, change }) => text(await odds(deck, rules, change)),
);

server.registerTool(
  "plan_hand",
  {
    description: [
      "The strongest board a given opening hand reaches going first, with the route, found by searching every line on EDOPro's rules engine (real card scripts enforce conditions, costs, locks and once-per-turn limits). Needs Node.js 22.13 or later; the first call downloads the engine's card database and scripts (about 60 MB). The search runs for up to `seconds` (default 45) on several threads and reports which first actions were searched completely.",
      "You write the deck's endpoints from the card text, one line per card that matters on the opponent's turn:",
      "卡名：级别[×次数]；条件…",
      "Levels, each worth far more than the next: 第0级 (cannot be responded to, e.g. Super Polymerization), 第一级 (negates any effect: Baronne de Fleur), 1.5级 (Maxx \"C\"), 第二级 (a negate with a condition: Clear Wing, Ash Blossom, Infinite Impermanence), 2.5级 (a very narrow negate: Stardust Dragon), 软康 (a tax or lock on the opponent's effects), 第三级 (banish, destroy, bounce, send to GY, face-down), 保护.",
      "Options after 分号: 回合外 → 墓地|卡组|额外|手里|场上 <cards> (on the opponent's turn it brings out such cards; it is worth what they are worth, followed as far as the chain goes), 带 N 只, 要 另有 <cards>, 要 额外有 <cards>, 要 墓地有 <cards>, 在手里 (hand traps), 在墓地, 在场上或墓地, 在场上或手里, 自己回合 (an Ignition Effect: worth 1 going first), 召唤时 (only when summoned: worth 0 unless brought out on the opponent's turn).",
      "<cards> is written like card text: 「卡名」, 「字段」怪兽, 2星, 4星以下, 光暗, 兽族, 同调, 连接.",
      "Example: 鲜花女男爵：第一级 / 幻透翼同调龙：第二级×2 / 灰流丽：第二级；在手里 / 三英之相剑师：第二级；自己回合 / 卫星闪灵·淘气精灵：保护；回合外 → 墓地 2星 怪兽 / I：P百变莱娜：回合外 → 额外 连接 怪兽；要 另有 怪兽",
      "Each card name counts once. Traps, Quick-Play Spells and Infinite Impermanence are set automatically before the turn ends. Cards drawn by effects are never played. The opponent does nothing.",
    ].join("\n"),
    inputSchema: z.object({
      deck: z.string().min(1).describe("Deck URL, YDKE string, .ydk contents or a card list"),
      hand: z.string().min(1).describe("The opening hand, card names separated by commas, e.g. \"白龙之落胤,灰流丽,无限泡影,深渊之兽 德鲁伊鳞虫,超融合\""),
      tiers: z.string().min(1).describe("The endpoint list, one line per card, as described above"),
      seconds: z.number().int().min(5).max(600).optional().describe("Time limit for the search, default 45"),
    }),
    annotations: { readOnlyHint: true },
  },
  async ({ deck, hand, tiers, seconds }) => {
    const { planText } = await import("./plan.ts"); // the rules engine is loaded only for this tool
    return text(await planText(deck, hand, tiers, { nodes: 1_000_000, seconds: seconds ?? 45 }));
  },
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
    const banlist = await banlistText(options);
    return banlist ? text(banlist) : { ...text("Could not download the Master Duel banlist."), isError: true };
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
