# Master Duel AI Advisor

Tools for using an AI assistant to build and tune Yu-Gi-Oh! Master Duel decks. The project focuses on the parts that are easy to get wrong in conversation: card text, the Master Duel banlist, card-pool searches, consistency calculations and conflicts between effects.

> This is an unofficial fan project. It is not affiliated with or endorsed by KONAMI. Yu-Gi-Oh! and Master Duel are trademarks of KONAMI.

[中文说明](#中文说明)

**Status:** The first tool, Master Duel card lookup, is available as a Claude Code skill and as an MCP server (see [Installation](#installation)). The rest of the roadmap is still in the design stage.

## Why this project exists

This project grew out of several months spent tuning a real Master Duel deck with an AI assistant. The assistant was useful for discussing ideas, but it kept making a few kinds of mistakes that could completely change a deckbuilding decision.

### 1. Quoting card text from memory

A small error in an effect can invalidate everything that follows. For example, Branded Opening restricts Extra Deck summons only for the rest of the turn after it resolves. If the assistant remembers it as a restriction on the entire turn, it may incorrectly rule out a Synchro Summon made before Branded Opening was activated.

### 2. Using the wrong banlist

Master Duel has its own Forbidden & Limited list. Advice based on the TCG or OCG list can include cards that are not legal in Master Duel. We ran into this several times, including confident recommendations for cards that were Forbidden in Master Duel.

### 3. Searching the full card pool

Some questions need a database, not memory. For example: which Level 12 Synchro Monsters can be made with a Level 8 monster and a Level 4 Tuner, what rarity are they, and do they appear in competitive lists? A full data search turned up a valid option that the assistant had never mentioned.

### 4. Calculating consistency

It is useful to know how often a 44-card deck opens an unplayable hand, both going first and going second. That calculation also depends on a precise definition of which hands are playable. In one test, we initially missed that a card could make a Fusion Monster with any LIGHT or DARK monster. That one missed interaction made a useful card look like a dead draw.

### 5. Finding conflicting restrictions

Cards often include restrictions such as “for the rest of this turn, you can only Special Summon X from the Extra Deck.” Individually useful cards may prevent each other from working in the same turn. Junk Meister's first effect locks the player into Synchro Monsters, while Branded Fusion locks the player into Fusion Monsters. The two lines therefore cannot be used together in one turn.

These problems mostly come down to missing data and arithmetic. This project is not an attempt to train another model. Instead, it gives an existing assistant access to exact card data, Master Duel-specific information and a few calculators. It also defines some basic rules for using them:

- Look up card text before quoting it.
- Check the Master Duel banlist before recommending a card.
- Search the full candidate pool before choosing an option.
- Ask whether the player already owns a UR before recommending that they craft it.

As of October 2026, we have not found another Master Duel project with the same scope. Tools such as ygocdb-mcp and the YGOPRODeck MCP server provide card lookup, while several research projects train agents to play the game. This project is aimed at the space between them: helping a player decide what to add to a deck, what to remove and what each change affects.

## Scope

The advisor is meant to help players compare deckbuilding choices. It provides the relevant data, points out problems and shows the cost of each option; the final decision stays with the player.

Combo generation is not part of the initial scope. An assistant cannot reliably verify a combo that it creates from scratch. Checking an existing deck and measuring the effect of a proposed change is much more practical once the underlying data is accurate. The route planner at the end of the roadmap will not rely on the assistant for this either: every line it shows will have to be checked by a duel simulation engine.

## Roadmap

1. **Card lookup with Master Duel data.** *Available now.* Exact card text in Chinese, English and Japanese; the Chinese name shown in Master Duel; Master Duel rarity and banlist status, including announced changes that are not in effect yet; and filtered searches across the full card pool.
2. **Deck import.** Load a deck from a YDKE string, a `.ydk` file or other common deck formats, so that the later tools work on the player's actual list instead of one typed out by hand.
3. **Consistency calculator.** Define which opening hands can start the deck—for example, “White Dragon works by itself; Cartesia needs any LIGHT or DARK monster”—and calculate exact brick rates going first and going second. The calculator will also show how those rates change when a card is added or removed.
4. **Restriction and reference checks.** Detect incompatible “this turn you can only...” restrictions and effects that refer to cards the deck does not contain, such as a search effect with no remaining target or a reveal cost with no valid card in the Extra Deck.
5. **Deck review and build suggestions.** Combine the previous tools into one report covering conflicts, brick rate, weak slots and possible replacements, including the trade-offs and crafting cost of each change.
6. **Theme-based deck building.** Start with a theme such as Ice Barrier, find engines that are commonly played with it, and use those results as the starting point for a list.
7. **Opening-hand route planner.** This is the long-term goal. A simulator deals an opening hand, and the player can adjust it in a small hand editor. The tool then works out the strongest end board that hand can reach, along with the fallback board if the opponent interrupts at a given point, for example with Ash Blossom & Joyous Spring, a negation effect or Maxx "C". The result is shown as a route map. The interface should be as clear, practical and good-looking as we can make it.

## Formats

- **Claude Skill.** *Available now for Claude Code.* A `SKILL.md` file and a small script. It does not require a separate hosted service or add an API bill for this project.
- **MCP server.** *Available now.* The project should work with any AI assistant, not only Claude. The same functions are exposed through MCP so that other assistants and AI clients that support MCP can use them.
- **Static site on GitHub Pages.** Card lookup, calculations and checks will run locally in the browser without an AI model. Optional AI features will use an API key supplied by the user and stored only in that browser. The hand editor and route maps from the roadmap will also be built here.

## Installation

The card lookup skill currently works with Claude Code. It needs Node.js 18 or later and an internet connection the first time it runs.

```bash
git clone https://github.com/BettTer/master-duel-ai-advisor.git
mkdir -p ~/.claude/skills
cp -R master-duel-ai-advisor/skills/master-duel-ai-advisor ~/.claude/skills/
```

To receive updates with `git pull`, link the folder instead of copying it:

```bash
ln -s "$(pwd)/master-duel-ai-advisor/skills/master-duel-ai-advisor" ~/.claude/skills/master-duel-ai-advisor
```

After that, ask Claude Code about Master Duel cards or decks as usual, and the skill will be used when it is relevant. The script can also be run on its own:

```bash
node ~/.claude/skills/master-duel-ai-advisor/scripts/mdcard.mjs card "Junk Meister"
```

The script downloads about 30 MB of card data into `~/.cache/master-duel-ai-advisor` on its first run, and again whenever one of the data sources publishes new data, such as a new Master Duel pack.

The skill has not been tested in the Claude apps (claude.ai and desktop) yet. The script needs internet access, which depends on each app's code execution settings.

### MCP server

For assistants other than Claude Code, add the MCP server to your client as a stdio server that runs `npx -y master-duel-ai-advisor`. It needs Node.js 18 or later. In Claude Desktop, for example, add this to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "master-duel-ai-advisor": {
      "command": "npx",
      "args": ["-y", "master-duel-ai-advisor"]
    }
  }
}
```

The server offers the same functions as the skill (`lookup_cards`, `search_cards`, `get_banlist`, `read_notes`, `add_note`) and includes the same working rules. In Claude Code, the skill alone is enough.

## Personal notes

The assistant keeps each player's preferences and corrections in `~/.config/master-duel-ai-advisor/notes.md`, for example that you mostly play going second or have no UR points to spare. It reads this file at the start of a conversation and adds to it when you state a lasting preference or correct it. You can also edit the file yourself. Updating the skill does not change it.

## Improving the skill

When a correction applies to every player, such as wrong card data or a rule the skill states badly, the assistant offers to draft a GitHub issue. General lessons from these issues are added to the skill.

## Data sources

- [ygocdb (百鸽)](https://ygocdb.com/): card text; Chinese, English and Japanese card names; and the Chinese names used in Master Duel.
- [YGOPRODeck API](https://ygoprodeck.com/api-guide/): English card text and other card data, and the Master Duel rarity of cards that Master Duel Meta has no release date for. Data is cached locally, images are not hotlinked, and requests stay within the API's rate limits.
- [Master Duel Meta](https://www.masterduelmeta.com/forbidden-limited-list): which cards are in Master Duel, with their rarity and release date, and the Master Duel Forbidden & Limited list, with each card's current status and a dated history of list changes, including lists that have been announced but are not in effect yet.
- [yaml-yugi limit regulation](https://github.com/DawnbrandBots/yaml-yugi-limit-regulation): the fallback banlist source, rebuilt daily from Yugipedia's record of each list. It is used only when Master Duel Meta cannot be reached.

Card text and images are copyrighted by KONAMI. This repository does not redistribute the card database, the banlist or card images. The tools fetch the required data when they run and cache it on the user's machine.

## Development

The source code is in `src/`. The skill's script, `skills/master-duel-ai-advisor/scripts/mdcard.mjs`, is a bundled build of `src/cli.ts`, so rebuild it after changing the source.

```bash
npm install
npm test
npm run typecheck
npm run build
```

## License

[Apache License 2.0](LICENSE) applies to the code and documentation in this repository. It does not cover KONAMI's card text or images.

---

## 中文说明

**Master Duel AI Advisor** 是一套配合 AI 助手使用的游戏王大师决斗（Master Duel）构筑工具，主要处理聊天时最容易出错的几件事：核对卡文、检查 MD 禁限表、筛选全卡池、计算卡手率，以及查找卡片效果之间的冲突。

> 这是一个非官方玩家项目，与 KONAMI 无关，也未得到 KONAMI 的认可。「游戏王」和「Master Duel」是 KONAMI 的商标。

**项目状态：** 第一个工具「MD 查卡」已经可以作为 Claude Code 的 Skill 和 MCP 服务使用（见[安装](#安装)）。路线图的其余部分还在设计阶段。

## 为什么做这个项目

这个项目来自一段真实的构筑经历：我们花了几个月时间，用 AI 助手调整一套 MD 卡组。AI 很适合拿来讨论思路，但在一些会直接影响构筑结论的地方，它经常出错。

### 1. 凭记忆引用卡文

卡片效果只要记错一点，后面的分析就可能全部建立在错误前提上。比如，「烙印开幕」只会在结算后限制本回合从额外卡组进行的特殊召唤。如果 AI 把它记成对整个回合的限制，就可能错误地认为玩家不能先进行同调召唤，再发动「烙印开幕」。

### 2. 使用了错误的禁限表

MD 有独立的禁限表。按照 TCG 或 OCG 禁限表给出的建议，可能包含根本不能在 MD 中使用的卡。我们不止一次遇到过这种情况，其中还包括被 AI 很有把握地推荐出来的 MD 禁止卡。

### 3. 无法完整筛选卡池

有些问题必须查数据库，不能靠记忆回答。例如：用一只 8 星怪兽和一只 4 星调整，能召唤哪些 12 星同调怪兽？它们分别是什么稀有度？有没有出现在上位卡组中？实际筛选完整数据后，我们找到了一张 AI 之前从未提到过的合法候选。

### 4. 稳定性需要计算

一套 44 张的卡组，先手和后手分别有多大概率抽到无法展开的手牌，需要实际计算。结果还取决于我们如何定义“能动”。在一次测试中，我们漏掉了某张卡可以和任意光属性或暗属性怪兽融合。少算这一条互动，就让一张有用的卡看起来像是废件。

### 5. 效果限制互相冲突

很多卡带有“这个回合，自己不是 X 不能从额外卡组特殊召唤”一类的限制。两张单独看都很好用的卡，放在同一回合里却可能互相冲突。「废品大王」的第一个效果会把额外卡组召唤限制为同调怪兽，「烙印融合」则限制为融合怪兽，因此这两条路线不能在同一回合使用。

这些问题大多不是模型训练能直接解决的，而是缺少准确数据和计算工具。这个项目不会训练新的模型，而是让现有的 AI 助手能够访问准确的卡片数据、MD 专属信息和几个计算器，同时遵守几条基本规则：

- 引用卡文之前先查原文。
- 推荐卡片之前先检查 MD 禁限表。
- 选择候选之前先筛选完整卡池。
- 推荐玩家合成 UR 之前，先确认玩家是否已经拥有这张卡。

截至 2026 年 10 月，我们还没有找到范围相同的 MD 项目。ygocdb-mcp、YGOPRODeck MCP 等工具可以给 AI 提供查卡功能，也有一些研究项目在训练 AI 打牌。这个项目做的是两者之间的部分：帮助玩家判断卡组里该加入什么、拿掉什么，以及每次调整会带来哪些变化。

## 项目范围

这个工具用于辅助玩家比较构筑方案。它负责提供数据、指出问题并列出不同选择的代价，最后仍由玩家自己决定。

第一阶段不会做 combo 生成。AI 从零写出一条 combo 后，很难可靠地自行验证。相比之下，只要底层数据准确，检查现有卡组并计算一次调整带来的变化，更容易做出可信的结果。路线图最后的展开路线规划同样不会依赖 AI 自己推演：它给出的每一条路线，都必须经过决斗模拟引擎的验证。

## 路线图

1. **带 MD 数据的查卡功能。** *已可使用。* 提供中、英、日三语的准确卡文、MD 中显示的中文卡名、MD 稀有度和禁限状态（包括已公布但尚未生效的变动），并支持按条件筛选完整卡池。
2. **卡组导入。** 支持通过 YDKE 字符串、`.ydk` 文件以及其他常见格式导入卡组，让后面的工具直接分析玩家实际使用的卡表，而不用手动逐张输入。
3. **稳定性计算器。** 先定义哪些起手可以展开，例如“白龙单卡能动；卡尔特西娅需要配一只光属性或暗属性怪兽”，再精确计算先手、后手的卡手率，以及增加或减少一张卡后概率如何变化。
4. **限制与引用检查。** 查找互相冲突的“这个回合只能……”限制，以及效果中提到但卡组里并不存在的卡，例如已经没有合法目标的检索效果，或额外卡组里没有合法卡片的展示费用。
5. **卡组体检和构筑建议。** 把前面的工具合成一份报告，列出卡片冲突、卡手率、较弱的位置和可选的替换方案，并说明每种调整的代价和合成成本。
6. **按主题构筑。** 选择一个主题，例如冰结界，查找常与它搭配的轴，并以此为起点继续调整卡组。
7. **起手展开路线规划。** 这是项目的长期目标。由模拟器发出一手起手，玩家也可以在一个小型起手编辑器里自行调整。工具随后算出这手牌能达到的最强终场，以及对手在某一步介入时的妥协场，例如对手发动「灰流丽」、无效类效果（康），或「增殖的G」。结果会以路线图的形式展示，界面会尽量做到清晰、实用、美观。

## 使用方式

- **Claude Skill。** *Claude Code 已可使用。* 内容包括一个 `SKILL.md` 和一个小脚本，不需要为这个项目单独部署服务或支付额外的 API 费用。
- **MCP 服务。** *已可使用。* 这个项目应该支持所有 AI 助手，而不只是 Claude。同一批功能通过 MCP 提供出来，让其他支持 MCP 的 AI 助手和客户端也能使用。
- **GitHub Pages 静态网页。** 查卡、计算和检查功能会直接在浏览器中运行，不依赖 AI 模型。可选的 AI 功能使用用户自己提供的 API key，并且只保存在当前浏览器中。路线图中的起手编辑器和展开路线图也会做在这里。

## 安装

目前查卡 Skill 支持 Claude Code。需要 Node.js 18 或更高版本，第一次运行时需要联网。

```bash
git clone https://github.com/BettTer/master-duel-ai-advisor.git
mkdir -p ~/.claude/skills
cp -R master-duel-ai-advisor/skills/master-duel-ai-advisor ~/.claude/skills/
```

如果想通过 `git pull` 获取更新，可以改为链接这个文件夹，而不是复制：

```bash
ln -s "$(pwd)/master-duel-ai-advisor/skills/master-duel-ai-advisor" ~/.claude/skills/master-duel-ai-advisor
```

之后照常向 Claude Code 询问 MD 的卡片或卡组问题即可，需要时它会自动使用这个 Skill。也可以直接运行脚本：

```bash
node ~/.claude/skills/master-duel-ai-advisor/scripts/mdcard.mjs card 废品大王
```

脚本第一次运行时会下载约 30 MB 的卡片数据到 `~/.cache/master-duel-ai-advisor`；之后只要有数据源发布了新数据（比如 MD 上了新卡包），就会重新下载。

这个 Skill 还没有在 Claude 客户端（claude.ai 和桌面版）中测试过。脚本需要联网，能否联网取决于各客户端的代码执行设置。

### MCP 服务

在 Claude Code 以外的 AI 助手里使用时，在客户端里添加一个 stdio 服务，运行 `npx -y master-duel-ai-advisor`，需要 Node.js 18 或更高版本。以 Claude Desktop 为例，在 `claude_desktop_config.json` 里加入：

```json
{
  "mcpServers": {
    "master-duel-ai-advisor": {
      "command": "npx",
      "args": ["-y", "master-duel-ai-advisor"]
    }
  }
}
```

这个服务提供和 Skill 相同的功能（`lookup_cards`、`search_cards`、`get_banlist`、`read_notes`、`add_note`），也带有同样的使用规则。在 Claude Code 里只用 Skill 就够了。

## 个人笔记

AI 助手会把每位玩家的偏好和纠正记在 `~/.config/master-duel-ai-advisor/notes.md` 里，比如你主要打后手，或者没有多余的 UR 点。每次对话开始时它会先读这个文件；你说出长期有效的偏好或纠正它时，它会往里添加。你也可以自己编辑这个文件。更新 Skill 不会改动它。

## 改进 Skill

如果某条纠正对所有玩家都适用，比如卡片数据有误，或者 Skill 里的某条规则写得不对，AI 助手会主动帮你起草一个 GitHub issue。这些 issue 里的通用经验会被加进 Skill。

## 数据来源

- [百鸽（ygocdb）](https://ygocdb.com/)：卡文、中英日卡名，以及 MD 中使用的中文卡名。
- [YGOPRODeck API](https://ygoprodeck.com/api-guide/)：英文卡文等卡片数据，以及 Master Duel Meta 没有实装日期的卡的 MD 稀有度。数据缓存在本地，图片不盗链，请求遵守 API 的限速要求。
- [Master Duel Meta](https://www.masterduelmeta.com/forbidden-limited-list)：哪些卡已经在 MD 实装、各自的稀有度和实装日期，以及 MD 禁限表，包括每张卡当前的禁限状态和每次禁限变动的日期记录（含已经公布但尚未生效的新表）。
- [yaml-yugi limit regulation](https://github.com/DawnbrandBots/yaml-yugi-limit-regulation)：备用的禁限表来源，每天根据 Yugipedia 对每一期禁限表的记录重新生成。只有在连不上 Master Duel Meta 时才会使用。

卡文和卡图的版权属于 KONAMI。本仓库不会重新分发卡片数据库、禁限表或卡图。工具运行时会按需获取数据，并将其缓存在用户自己的电脑上。

## 开发

源代码在 `src/` 里。Skill 用的脚本 `skills/master-duel-ai-advisor/scripts/mdcard.mjs` 是由 `src/cli.ts` 打包生成的，修改源代码后需要重新构建。

```bash
npm install
npm test
npm run typecheck
npm run build
```

## 许可证

[Apache License 2.0](LICENSE) 适用于本仓库的代码和文档，不包括 KONAMI 的卡文和卡图。
