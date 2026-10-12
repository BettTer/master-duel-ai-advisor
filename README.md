# Master Duel AI Advisor

Tools for using an AI assistant to build and tune Yu-Gi-Oh! Master Duel decks. The project focuses on the parts that are easy to get wrong in conversation: card text, the Master Duel banlist, card-pool searches, consistency calculations and conflicts between effects.

> This is an unofficial fan project. It is not affiliated with or endorsed by KONAMI. Yu-Gi-Oh! and Master Duel are trademarks of KONAMI.

[中文说明](#中文说明)

**Status:** This project is still in the design stage. Nothing is ready to use yet.

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

Combo generation is not part of the initial scope. An assistant cannot reliably verify a combo that it creates from scratch. Checking an existing deck and measuring the effect of a proposed change is much more practical once the underlying data is accurate.

## Roadmap

1. **Card lookup with Master Duel data.** Exact card text in Chinese, English and Japanese; the Chinese name shown in Master Duel; Master Duel rarity and banlist status; and filtered searches across the full card pool.
2. **Consistency calculator.** Define which opening hands can start the deck—for example, “White Dragon works by itself; Cartesia needs any LIGHT or DARK monster”—and calculate exact brick rates going first and going second. The calculator will also show how those rates change when a card is added or removed.
3. **Restriction and reference checks.** Detect incompatible “this turn you can only...” restrictions and effects that refer to cards the deck does not contain, such as a search effect with no remaining target or a reveal cost with no valid card in the Extra Deck.
4. **Deck review and build suggestions.** Combine the previous tools into one report covering conflicts, brick rate, weak slots and possible replacements, including the trade-offs and crafting cost of each change.
5. **Later: theme-based deck building.** Start with a theme such as Ice Barrier, find engines that are commonly played with it, and use those results as the starting point for a list.

## Planned formats

- **Claude Skill first.** A `SKILL.md` file and a few small scripts, run through Claude Code or a Claude app. This does not require a separate hosted service or add an API bill for this project.
- **MCP server later.** The same scripts exposed to other AI clients through MCP.
- **Static site on GitHub Pages.** Card lookup, calculations and checks will run locally in the browser without an AI model. Optional AI features will use an API key supplied by the user and stored only in that browser.

## Data sources

- [ygocdb (百鸽)](https://ygocdb.com/): card text; Chinese, English and Japanese card names; and the Chinese names used in Master Duel.
- [YGOPRODeck API](https://ygoprodeck.com/api-guide/): card data and Master Duel rarity. Data will be cached locally, images will not be hotlinked, and requests will stay within the API's rate limits.
- Master Duel banlist: maintained in this repository and updated when KONAMI announces a new list.

Card text and images are copyrighted by KONAMI. This repository does not redistribute the card database or card images. The tools fetch the required data when they run and cache it on the user's machine.

## License

[Apache License 2.0](LICENSE) applies to the code and documentation in this repository. It does not cover KONAMI's card text or images.

---

## 中文说明

**Master Duel AI Advisor** 是一套配合 AI 助手使用的游戏王大师决斗（Master Duel）构筑工具，主要处理聊天时最容易出错的几件事：核对卡文、检查 MD 禁限表、筛选全卡池、计算卡手率，以及查找卡片效果之间的冲突。

> 这是一个非官方玩家项目，与 KONAMI 无关，也未得到 KONAMI 的认可。「游戏王」和「Master Duel」是 KONAMI 的商标。

**项目状态：** 目前还在设计阶段，暂时没有可用版本。

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

第一阶段不会做 combo 生成。AI 从零写出一条 combo 后，很难可靠地自行验证。相比之下，只要底层数据准确，检查现有卡组并计算一次调整带来的变化，更容易做出可信的结果。

## 路线图

1. **带 MD 数据的查卡功能。** 提供中、英、日三语的准确卡文、MD 中显示的中文卡名、MD 稀有度和禁限状态，并支持按条件筛选完整卡池。
2. **稳定性计算器。** 先定义哪些起手可以展开，例如“白龙单卡能动；卡尔特西娅需要配一只光属性或暗属性怪兽”，再精确计算先手、后手的卡手率，以及增加或减少一张卡后概率如何变化。
3. **限制与引用检查。** 查找互相冲突的“这个回合只能……”限制，以及效果中提到但卡组里并不存在的卡，例如已经没有合法目标的检索效果，或额外卡组里没有合法卡片的展示费用。
4. **卡组体检和构筑建议。** 把前面的工具合成一份报告，列出卡片冲突、卡手率、较弱的位置和可选的替换方案，并说明每种调整的代价和合成成本。
5. **后续：按主题构筑。** 选择一个主题，例如冰结界，查找常与它搭配的轴，并以此为起点继续调整卡组。

## 计划提供的使用方式

- **先做 Claude Skill。** 内容包括一个 `SKILL.md` 和几个小脚本，通过 Claude Code 或 Claude 客户端运行，不需要为这个项目单独部署服务或支付额外的 API 费用。
- **之后提供 MCP 服务。** 把同一批脚本通过 MCP 提供给其他 AI 客户端。
- **GitHub Pages 静态网页。** 查卡、计算和检查功能会直接在浏览器中运行，不依赖 AI 模型。可选的 AI 功能使用用户自己提供的 API key，并且只保存在当前浏览器中。

## 数据来源

- [百鸽（ygocdb）](https://ygocdb.com/)：卡文、中英日卡名，以及 MD 中使用的中文卡名。
- [YGOPRODeck API](https://ygoprodeck.com/api-guide/)：卡片数据和 MD 稀有度。数据会缓存在本地，图片不会盗链，请求也会遵守 API 的限速要求。
- MD 禁限表：保存在本仓库中，并在 KONAMI 公布新禁限表时更新。

卡文和卡图的版权属于 KONAMI。本仓库不会重新分发卡片数据库或卡图。工具运行时会按需获取数据，并将其缓存在用户自己的电脑上。

## 许可证

[Apache License 2.0](LICENSE) 适用于本仓库的代码和文档，不包括 KONAMI 的卡文和卡图。
