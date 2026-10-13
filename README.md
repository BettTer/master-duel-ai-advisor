# Master Duel AI Advisor

Tools that let an AI assistant help you build and tune Yu-Gi-Oh! Master Duel decks from real data instead of memory: exact card text, Master Duel rarity and banlist, card-pool searches and deck checks.

> This is an unofficial fan project. It is not affiliated with or endorsed by KONAMI. Yu-Gi-Oh! and Master Duel are trademarks of KONAMI.

[中文说明](#中文说明)

## Installation

Every option needs Node.js 18 or later (the route planner needs 22.13 or later). The first run downloads about 30 MB of card data into `~/.cache/master-duel-ai-advisor`, and downloads it again whenever a data source publishes new data, such as a new Master Duel pack.

**Claude Code.** Install the plugin, then ask about Master Duel cards or decks as usual:

```bash
claude plugin marketplace add BettTer/master-duel-ai-advisor
claude plugin install master-duel-ai-advisor@master-duel-ai-advisor
```

To update later, run `claude plugin update master-duel-ai-advisor@master-duel-ai-advisor` and restart Claude Code.

**Other AI assistants (MCP).** Add a stdio server that runs `npx -y master-duel-ai-advisor` ([npm](https://www.npmjs.com/package/master-duel-ai-advisor)). In Claude Desktop, for example, add this to `claude_desktop_config.json`:

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

In Claude Code, use the plugin instead; installing both gives the assistant the same tools twice.

**Command line.**

```bash
npx -y -p master-duel-ai-advisor mdcard card "Junk Meister"
npx -y -p master-duel-ai-advisor mdcard deck my-deck.ydk
```

Run `mdcard` without arguments to see every command and filter.

## What it does

- **Card lookup.** Exact card text in Chinese, English and Japanese, the Chinese name shown in Master Duel, Master Duel rarity and banlist status (including announced changes that are not in effect yet), and filtered searches across the whole card pool.
- **Deck import and checks.** Reads a deck and checks its size, copies, the Master Duel banlist and cards that are not in Master Duel. It also lists the deck's Extra Deck locks and which of them leave no Extra Deck monster to summon when used in the same turn, such as Junk Meister's first effect and Branded Fusion, and effects that search or summon a card the deck does not contain, such as Junk Meister's search for a "Junk" card in a deck with no other "Junk" card.
- **Opening-hand odds.** The assistant reads the card text and writes down what each card needs in the opening hand and what it gives, for example Regenesis Archfiend needs another monster with 2500 ATK or DEF in the hand. You check those rules, and the tool counts every possible hand to give the exact chance of being able to start going first and going second, and how a change to the deck moves it.
- **Opening-hand route planner.** Give it a hand and it finds the strongest board that hand reaches going first, with the route step by step. Every line runs on EDOPro's rules engine with the real card scripts, so summoning conditions, costs, locks and once-per-turn limits are enforced rather than remembered. The assistant first writes the deck's endpoints from the card text, from unconditional negates down to removal, including cards whose value is what they bring out on the opponent's turn, such as Spright Elf; you check that list, and boards are ranked by it. Interruptions by the opponent are not simulated yet.
- **Rules for the assistant.** Look up card text before quoting it, use only the Master Duel banlist, search the whole card pool before recommending a card, and ask whether the player owns a UR before suggesting they craft it.
- **Personal notes.** The assistant keeps your preferences and corrections in `~/.config/master-duel-ai-advisor/notes.md`, which updates never change. When a correction applies to every player, it offers to draft a GitHub issue so the fix can be added for everyone.

A deck can be given in any of these forms:

- **A deck page URL from the official card database** (db.yugioh-card.com). Master Duel decks get there through the game's KONAMI ID link. The deck has to be public: open it for editing, tap the tag icon next to the deck name, choose a deck type, turn the public setting on and save.
- **A YDKE string or a `.ydk` file**, as exported by EDOPro, YGOPRODeck and similar tools.
- **A card list**, one card per line with an optional count, such as `3 灰流丽`, `Ash Blossom x3` or `灰流うらら ×3`.

## Why this project exists

This project grew out of months of tuning a real Master Duel deck with an AI assistant. The assistant was useful for discussing ideas, but it kept getting the details wrong:

- It quoted card text from memory. Branded Opening only restricts Extra Deck summons after it resolves, yet the assistant treated it as a restriction on the whole turn.
- It used the TCG or OCG banlist and confidently recommended cards that are Forbidden in Master Duel.
- It missed options that a search of the full card pool finds.
- It guessed how often a deck bricks instead of calculating it.
- It missed restrictions that stop two cards from working in the same turn, such as Junk Meister's first effect and Branded Fusion.

These are data and arithmetic problems, so this project does not train a model. It gives an existing assistant exact data, calculators and rules for using them. It helps compare deckbuilding choices; the decision stays with the player.

## Roadmap

1. **Card lookup.** *Available.*
2. **Deck import.** *Available.*
3. **Consistency calculator.** *Available.*
4. **Restriction and reference checks.** *Available.*
5. **Deck review and build suggestions.** One report with conflicts, brick rate, weak slots and replacements, including the trade-offs and crafting cost of each change.
6. **Theme-based deck building.** Start from a theme such as Ice Barrier and the engines commonly played with it.
7. **Opening-hand route planner.** *Available going first, without interruptions.* Next: the fallback board when the opponent interrupts with Ash Blossom & Joyous Spring, a negation effect or Maxx "C", then the average board over every opening hand.

A static site on GitHub Pages will run lookup, calculations and checks in the browser without an AI model, and host the hand editor and route maps.

## Data sources

- [ygocdb (百鸽)](https://ygocdb.com/): card text and names in Chinese, English and Japanese, and the Chinese names used in Master Duel.
- [YGOPRODeck API](https://ygoprodeck.com/api-guide/): English card text and other card data. Data is cached locally, images are not hotlinked, and requests stay within the API's rate limits.
- [Master Duel Meta](https://www.masterduelmeta.com/forbidden-limited-list): which cards are in Master Duel, with their rarity and release date, and the Master Duel Forbidden & Limited list.
- [yaml-yugi limit regulation](https://github.com/DawnbrandBots/yaml-yugi-limit-regulation): the fallback banlist source, used only when Master Duel Meta cannot be reached.
- [EDOPro's core](https://github.com/edo9300/ygopro-core) built for WebAssembly by [ocgcore-wasm](https://github.com/n1xx1/ocgcore-wasm), with [Project Ignis' card database](https://github.com/ProjectIgnis/BabelCDB) and [card scripts](https://github.com/ProjectIgnis/CardScripts): the rules engine behind the route planner. The database and scripts are downloaded on first use (about 60 MB) and checked for updates daily; the planner needs Node.js 22.13 or later.

Card text and images are copyrighted by KONAMI. This repository does not redistribute the card database, the banlist or card images. The tools fetch the data they need when they run and cache it on the user's machine.

## Development

The source code is in `src/`. The skill's script, `skills/master-duel-ai-advisor/scripts/mdcard.mjs`, is a bundled build of `src/cli.ts`, so rebuild it after changing the source.

```bash
npm install
npm test
npm run typecheck
npm run build
```

## License

[GNU AGPL v3 or later](LICENSE) applies to the code and documentation in this repository, the same license as the EDOPro core and card scripts the route planner runs on. Versions up to 0.5.0 were released under Apache 2.0. It does not cover KONAMI's card text or images.

---

## 中文说明

**Master Duel AI Advisor** 让 AI 助手用真实数据、而不是凭记忆，帮你构筑和调整游戏王大师决斗（Master Duel）卡组：准确的卡文、MD 稀有度和禁限、全卡池筛选，以及卡组检查。

> 这是一个非官方玩家项目，与 KONAMI 无关，也未得到 KONAMI 的认可。「游戏王」和「Master Duel」是 KONAMI 的商标。

## 安装

三种方式都需要 Node.js 18 或更高版本（路线规划需要 22.13 或更高）。第一次运行时会下载约 30 MB 的卡片数据到 `~/.cache/master-duel-ai-advisor`；之后只要有数据源发布了新数据（比如 MD 上了新卡包），就会重新下载。

**Claude Code。** 安装插件后，照常询问 MD 的卡片或卡组问题即可：

```bash
claude plugin marketplace add BettTer/master-duel-ai-advisor
claude plugin install master-duel-ai-advisor@master-duel-ai-advisor
```

之后更新用 `claude plugin update master-duel-ai-advisor@master-duel-ai-advisor`，然后重启 Claude Code。

**其他 AI 助手（MCP）。** 添加一个 stdio 服务，运行 `npx -y master-duel-ai-advisor`（已发布到 [npm](https://www.npmjs.com/package/master-duel-ai-advisor)）。以 Claude Desktop 为例，在 `claude_desktop_config.json` 里加入：

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

在 Claude Code 里请用插件，两个都装的话，同样的工具会出现两份。

**命令行。**

```bash
npx -y -p master-duel-ai-advisor mdcard card 废品大王
npx -y -p master-duel-ai-advisor mdcard deck my-deck.ydk
```

不带参数运行 `mdcard` 可以看到所有命令和筛选条件。

## 功能

- **查卡。** 中、英、日三语的准确卡文，MD 中显示的中文卡名，MD 稀有度和禁限状态（包括已公布但尚未生效的变动），以及按条件筛选完整卡池。
- **卡组导入和检查。** 读入卡组后检查张数、同名卡、MD 禁限和 MD 未实装的卡；还会列出卡组里"这回合只能从额外出 X"的锁，以及哪些锁同回合一起用时额外一只都出不来，比如「废品大王」的①和「烙印融合」；以及要检索或特殊召唤的卡在卡组里一张都没有的效果，比如卡组里没有别的「废品」卡，「废品大王」的检索就没有目标。
- **起手能动率。** AI 先读卡文，写下每张卡在起手里需要什么、能带来什么，比如「再世之魔神 必密巴」需要手里还有一只攻或守是 2500 的怪兽。你确认这些规则后，工具把所有可能的起手逐一算一遍，给出先手、后手能动的准确概率，以及改动卡组后的变化。
- **起手展开路线规划。** 给一手起手，算出先手能做到的最强终场和一步一步的路线。每条路线都在 EDOPro 的规则引擎上用真实卡片脚本跑出来，召唤条件、代价、锁、1 回合 1 次都由引擎执行，不靠记忆。AI 先照卡文写出这副卡组的终端清单，从无条件的康到处理卡，包括像「卫星闪灵·淘气精灵」这种价值在于对手回合能带出什么的卡；你核对这份清单，终场按它排序。暂时不模拟对手的打断。
- **给 AI 的使用规则。** 引用卡文前先查原文，只用 MD 禁限表，推荐卡片前先筛完整卡池，建议合成 UR 前先确认玩家有没有这张卡。
- **个人笔记。** AI 会把你的偏好和纠正记在 `~/.config/master-duel-ai-advisor/notes.md` 里，更新不会改动它。某条纠正对所有玩家都适用时，AI 会帮你起草一个 GitHub issue，让修正加进项目里。

卡组可以用下面任意一种方式提供：

- **官方卡片数据库上的卡组网址**（db.yugioh-card.com）。MD 里的卡组可以通过 KONAMI ID 联动导到数据库。卡组需要设为公开：打开卡组的编辑页面，点卡组名旁边的标签图标，选好卡组类型，打开公开设置后保存。
- **YDKE 字符串或 `.ydk` 文件**，EDOPro、YGOPRODeck 等工具都能导出。
- **纯文本卡表**，一行一张卡，可以带张数，比如 `3 灰流丽`、`Ash Blossom x3`、`灰流うらら ×3`。

## 为什么做这个项目

这个项目来自几个月用 AI 助手调整一套真实 MD 卡组的经历。AI 很适合讨论思路，但在细节上经常出错：

- 凭记忆引用卡文。「烙印开幕」只在结算后限制从额外卡组特殊召唤，AI 却当成了整个回合的限制。
- 用了 TCG 或 OCG 的禁限表，很有把握地推荐 MD 禁止卡。
- 漏掉了筛选完整卡池才能找到的候选。
- 卡手率靠估，没有实际计算。
- 没发现两张卡不能在同一回合一起用的限制，比如「废品大王」的①和「烙印融合」。

这些都是数据和计算的问题，所以这个项目不训练模型，而是给现有的 AI 助手配上准确的数据、计算工具和使用规则。它帮玩家比较构筑方案，最后仍由玩家自己决定。

## 路线图

1. **查卡。** *已可使用。*
2. **卡组导入。** *已可使用。*
3. **稳定性计算器。** *已可使用。*
4. **限制与引用检查。** *已可使用。*
5. **卡组体检和构筑建议。** 一份报告列出冲突、卡手率、较弱的位置和替换方案，并说明每种调整的代价和合成成本。
6. **按主题构筑。** 从一个主题（比如冰结界）和常与它搭配的轴开始。
7. **起手展开路线规划。** *先手、无打断的版本已可使用。* 接下来做对手用「灰流丽」、无效类效果（康）或「增殖的G」介入时的妥协场，然后是所有起手的平均终场。

GitHub Pages 上的静态网页会在浏览器里直接运行查卡、计算和检查，不依赖 AI 模型，起手编辑器和展开路线图也会做在这里。

## 数据来源

- [百鸽（ygocdb）](https://ygocdb.com/)：中、英、日卡文和卡名，以及 MD 中使用的中文卡名。
- [YGOPRODeck API](https://ygoprodeck.com/api-guide/)：英文卡文等卡片数据。数据缓存在本地，图片不盗链，请求遵守 API 的限速要求。
- [Master Duel Meta](https://www.masterduelmeta.com/forbidden-limited-list)：哪些卡已经在 MD 实装、各自的稀有度和实装日期，以及 MD 禁限表。
- [yaml-yugi limit regulation](https://github.com/DawnbrandBots/yaml-yugi-limit-regulation)：备用的禁限表来源，只有在连不上 Master Duel Meta 时才会使用。
- [EDOPro 核心](https://github.com/edo9300/ygopro-core)（由 [ocgcore-wasm](https://github.com/n1xx1/ocgcore-wasm) 编译成 WebAssembly）、[Project Ignis 的卡片数据库](https://github.com/ProjectIgnis/BabelCDB)和[卡片脚本](https://github.com/ProjectIgnis/CardScripts)：路线规划用的规则引擎。数据库和脚本第一次使用时下载（约 60 MB），每天检查更新；路线规划需要 Node.js 22.13 或更高版本。

卡文和卡图的版权属于 KONAMI。本仓库不会重新分发卡片数据库、禁限表或卡图。工具运行时会按需获取数据，并缓存在用户自己的电脑上。

## 开发

源代码在 `src/` 里。Skill 用的脚本 `skills/master-duel-ai-advisor/scripts/mdcard.mjs` 是由 `src/cli.ts` 打包生成的，修改源代码后需要重新构建。

```bash
npm install
npm test
npm run typecheck
npm run build
```

## 许可证

[GNU AGPL v3 或更高版本](LICENSE) 适用于本仓库的代码和文档，和路线规划所依赖的 EDOPro 核心与卡片脚本相同。0.5.0 及之前的版本按 Apache 2.0 发布。不包括 KONAMI 的卡文和卡图。
