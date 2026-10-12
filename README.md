# Master Duel AI Advisor

AI skills that help you build and tune Yu-Gi-Oh! Master Duel decks: check card text, measure consistency, catch conflicts between cards, and weigh trade-offs before you spend crafting points.

> Unofficial fan project. Not affiliated with or endorsed by KONAMI. Yu-Gi-Oh! and Master Duel are trademarks of KONAMI.

[中文说明](#中文说明)

**Status:** early design. Nothing is usable yet. This README explains what we are building and why.

## Why this exists

General-purpose AI assistants are good at talking about Yu-Gi-Oh!. They are much less reliable at the parts of deckbuilding that actually decide games. We learned this the slow way, over several months of tuning a real Master Duel deck with an AI assistant. Almost every serious mistake fell into one of five buckets.

**1. Card text from memory.** The assistant paraphrases an effect slightly wrong, and every recommendation built on top of it falls apart. One example: it assumed Branded Fusion's restriction only starts after the card resolves, so you could Synchro Summon first and then activate it. The Master Duel text says the restriction covers the whole turn you activate it.

**2. The wrong banlist.** Master Duel has its own Forbidden & Limited list. Advice based on the TCG or OCG list recommends cards you can't put in your deck. This happened more than once: cards that are Forbidden in Master Duel got recommended with full confidence.

**3. Searching the whole card pool.** "Which Level 12 Synchro Monsters can I make with a Level 8 and a Level 4 Tuner, what rarity are they, and does anyone actually play them?" can't be answered from memory. When we pulled the data, the list included a card the assistant had never brought up.

**4. Consistency math.** How often does a 44-card list open a hand that can't do anything, going first and going second? Nobody computes that in their head. And one wrong assumption about which hands "work" can flip the conclusion. In our case, forgetting that one card could make a Fusion Monster with any LIGHT or DARK monster made it look like dead weight when it was actually pulling its slot.

**5. Hidden locks.** Many cards say "for the rest of this turn, you can only Special Summon X from the Extra Deck." Two good cards can quietly cancel each other out. Junk Meister's first effect locks you into Synchro Monsters, and Branded Fusion locks you into Fusion Monsters, so you can't run both lines in the same turn. The player found this out in a real game, but it was sitting in the card text all along.

None of these are reasoning problems. They are data problems and arithmetic problems. So this project does not train a model. It gives the assistant exact card data, Master Duel specific rules and calculators, plus a set of working rules for using them: look up the text before quoting it, check the Master Duel banlist before recommending, list the whole candidate pool before picking, and ask whether the player owns a UR before telling them to craft it.

As far as we could find (October 2026), nothing like this exists for Master Duel. There are card lookup tools for AI assistants, such as ygocdb-mcp and a YGOPRODeck MCP server, and there are research projects that train AIs to play the game. The layer in between, helping a player decide what goes into the deck and what comes out, is mostly empty.

## What it does, and what it doesn't

The advisor is built around **your deck and your choices**. It lays out the options and what each one costs, and you decide.

It does not invent combo routes. Producing a working combo from scratch is beyond what an assistant can verify. Checking a deck for problems, and measuring what a change does, is something it can do well once the data is right.

## Roadmap

1. **Card lookup with Master Duel context.** Exact card text in Chinese, English and Japanese (including the Chinese name Master Duel shows in game), Master Duel rarity, Master Duel banlist status, and filtered searches across the whole card pool.
2. **Consistency calculator.** Describe which hands can start your deck, for example "White Dragon alone works; Cartesia needs any LIGHT or DARK monster next to it", and get exact dead-hand rates going first and going second, plus what happens when you cut or add a card.
3. **Lock and reference checks.** Find "this turn you can only..." restrictions that conflict with each other, and effects that point at cards your deck doesn't run: a search with no targets left, or a reveal cost with no valid card in the Extra Deck.
4. **Deck check-up and build advice.** Combine the first three into one report: what conflicts, how often it bricks, which slots are weakest, and a few concrete swaps with their trade-offs, crafting cost included.
5. **Later: theme-based building.** Pick a theme, say Ice Barrier, and get suggestions for which engines tend to pair with it, then tune the list from there.

## How it's delivered

- **Claude Skill first.** A `SKILL.md` plus a few small scripts. You run it inside your own Claude (Claude Code or the Claude apps), so the project has no API bill.
- **MCP server later.** The same scripts, wrapped so other AI clients can use them.
- **A static web page on GitHub Pages.** Lookup, the calculator and the checks run in your browser with no AI model involved, so they are free. Any AI features on the page will use an API key you bring yourself, stored only in your own browser.

## Data sources

- [ygocdb (百鸽)](https://ygocdb.com/): card text, Chinese, English and Japanese names, and the Chinese names used in Master Duel.
- [YGOPRODeck API](https://ygoprodeck.com/api-guide/): card data and Master Duel rarity. We follow their rules: cache data locally, don't hotlink images, stay under the rate limit.
- Master Duel banlist: maintained in this repository and updated when KONAMI announces a new list.

Card text and card images are copyrighted by KONAMI. This repository does not redistribute the card database or images. Data is fetched when you use the tools and cached on your own machine.

## License

[Apache License 2.0](LICENSE). This covers the code and documents in this repository, not KONAMI's card text or images.

---

## 中文说明

**Master Duel AI Advisor** 是一套帮你构筑和调整游戏王大师决斗（Master Duel）卡组的 AI 工具：核对卡文、算卡组稳定性、找出卡和卡之间的冲突，在你花合成点之前把取舍摆清楚。

> 非官方的玩家项目，与 KONAMI 无关，也没有得到 KONAMI 认可。「游戏王」和「Master Duel」是 KONAMI 的商标。

**现状：** 还在设计阶段，目前没有能用的东西。这份 README 说明我们要做什么、为什么做。

## 为什么要做

通用的 AI 助手聊游戏王很在行，但真正决定胜负的那部分构筑工作，它们并不可靠。这是我们用几个月时间、和 AI 一起调一套真实 MD 卡组慢慢发现的。几乎所有严重的错误都能归到下面五类。

**1. 凭记忆说卡文。** AI 把一个效果记偏一点，后面所有建议都跟着塌。比如它以为「烙印融合」的限制是发动之后才开始，所以可以先同调再开它。MD 的卡文写的是"这张卡发动的回合"，整个回合都算。

**2. 用错禁限表。** MD 有自己的禁限表。照着 TCG 或 OCG 的表给建议，就会推荐你根本放不进卡组的卡。这种事发生过不止一次：MD 禁止的卡被很有把握地推荐过来。

**3. 全卡池筛选。** "★8 加 ★4 调整能同调出哪些 ★12？什么稀有度？上位卡组里有没有人用？"这种问题靠记忆答不了。我们拉数据一筛，名单里就有一张 AI 从来没提过的卡。

**4. 稳定性要算。** 一套 44 张的卡，先手和后手起手动不了的概率各是多少？没人能心算。而且"什么样的手算能动"只要判断错一条，结论就会反过来。我们就遇到过：漏算了一张卡能和任意光、暗属性怪兽融合，它看起来像在拖后腿，其实是在扛下限。

**5. 藏起来的锁。** 很多卡写着"这个回合，自己不是 X 不能从额外卡组特殊召唤"。两张都很好的卡，可能悄悄地互相抵消。「废品大王」的①会把你锁成只能出同调，「烙印融合」会把你锁成只能出融合，所以这两条线不能在同一回合走。玩家是在实战里撞上才发现的，但它一直就写在卡文里。

这五类都不是"推理"的问题，而是数据问题和算数问题。所以这个项目不训练模型，而是给 AI 配上准确的卡片数据、MD 专属的规则和计算工具，再加一套使用规矩：引用卡文前先查、推荐前先核 MD 禁限、挑卡前先列出全卡池的候选、让人合 UR 之前先问他有没有。

据我们查到的情况（2026 年 10 月），MD 方向还没有这样的东西。给 AI 用的查卡工具已经有了，比如 ygocdb-mcp 和 YGOPRODeck 的 MCP 服务；也有训练 AI 打牌的研究项目。夹在中间的那一层，帮玩家决定卡组里放什么、拿掉什么，基本是空的。

## 它做什么，不做什么

整个项目围绕**你的卡组和你的取舍**：把可选的方案和各自的代价摆出来，由你来定。

它不负责编 combo。从零生成一条能用的 combo，AI 自己没办法验证对不对。但在数据准确的前提下，给卡组挑毛病、量化一个改动带来的变化，它可以做得很好。

## 路线图

1. **带 MD 信息的查卡。** 中、英、日三语的准确卡文（包括 MD 游戏里显示的中文名），MD 稀有度、MD 禁限，以及按条件筛全卡池。
2. **稳定性计算器。** 描述哪些手能动，比如"白龙单卡就能动；卡尔特西娅要配一只光或暗属性怪兽"，就能精确算出先手、后手的死手率，以及砍一张或加一张之后的变化。
3. **锁和引用检查。** 找出互相冲突的"这回合只能……"限制，以及卡文指向、但卡组里没有的卡，比如检索已经没有目标，或者要亮的卡额外卡组里没有合法的。
4. **卡组体检和构筑建议。** 把前三项合成一份报告：哪里冲突、多常卡手、哪几格最弱，再给几个具体的换法和各自的代价，包括要花多少合成点。
5. **以后：按主题构筑。** 选一个主题，比如冰结界，告诉你它通常和哪些轴搭配，再从那里开始调。

## 怎么用

- **先做 Claude Skill。** 一个 `SKILL.md` 加几个小脚本，在你自己的 Claude（Claude Code 或 Claude 客户端）里用，项目本身不产生 API 费用。
- **以后做 MCP 服务器。** 同一批脚本包一层，让其他 AI 客户端也能用。
- **GitHub Pages 上的静态网页。** 查卡、计算器和各项检查都在浏览器里跑，不用任何 AI 模型，所以免费。网页上如果有 AI 功能，用的是你自己填的 API key，只存在你自己的浏览器里。

## 数据来源

- [百鸽（ygocdb）](https://ygocdb.com/)：卡文，中、英、日卡名，以及 MD 里的中文卡名。
- [YGOPRODeck API](https://ygoprodeck.com/api-guide/)：卡片数据和 MD 稀有度。我们遵守它的规则：数据本地缓存、图片不盗链、不超过限速。
- MD 禁限表：在本仓库里自己维护，KONAMI 公布新表时更新。

卡文和卡图的版权属于 KONAMI。本仓库不分发卡片数据库和卡图，数据在你使用工具时才去拉取，并缓存在你自己的电脑上。

## 许可证

[Apache License 2.0](LICENSE)。只适用于本仓库的代码和文档，不包括 KONAMI 的卡文和卡图。
