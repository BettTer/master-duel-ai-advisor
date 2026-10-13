---
name: master-duel-ai-advisor
description: Yu-Gi-Oh! Master Duel deckbuilding advisor backed by verified card data. Looks up exact card text (Chinese, English and Japanese, plus the Chinese name shown in Master Duel), Master Duel rarity and the current Master Duel Forbidden & Limited list, and searches the whole card pool by kind, level, attribute, type and card text, reads and checks whole decks (a deck URL from the official card database, YDKE, .ydk or a card list), and calculates exact opening-hand odds. Use it whenever the conversation involves Yu-Gi-Oh! / 游戏王 / 遊戯王 Master Duel cards or decks, including what a card does, whether it is Forbidden or Limited (禁限), how rare it is or whether to craft it (合成, UR, SR), which cards could fill a slot ("which Level 12 Synchros can I make", "有没有不取对象的除外"), reviewing a deck list, how often a deck bricks (卡手率, 先手能动), or weighing deckbuilding trade-offs (构筑, 取舍, 卡组), even when the user doesn't say "Master Duel" or ask for a lookup.
---

# Master Duel AI Advisor

This skill lets you base Master Duel deckbuilding advice on the real card text, the Master Duel banlist and the full card pool instead of memory. Most bad deckbuilding advice comes from a card effect remembered slightly wrong, a banlist from the wrong format, or a candidate that was never considered. The lookup script removes all three.

## The lookup script

`scripts/mdcard.mjs` (Node.js 18 or later, nothing to install). Paths below are relative to this skill's directory.

```bash
node scripts/mdcard.mjs card 废品大王              # any language, part of a name, or a passcode
node scripts/mdcard.mjs card 53971455 79415624 "Junk Meister"   # several cards in one run
node scripts/mdcard.mjs search --kind 同调 --level 12 --text "调整＋调整以外的怪兽1只以上"
node scripts/mdcard.mjs search --kind 调整 --level 4 --attr 光 --race 魔法师
node scripts/mdcard.mjs search --kind 速攻 --text "「阿不思的落胤」"
node scripts/mdcard.mjs deck "https://www.db.yugioh-card.com/yugiohdb/member_deck.action?ope=1&cgid=…&dno=…"
node scripts/mdcard.mjs deck "ydke://…"             # also a .ydk file path, or "-" to read a card list from standard input
node scripts/mdcard.mjs odds deck.txt --rules rules.txt --change "-1 增殖的G, +1 增援"
node scripts/mdcard.mjs plan deck.txt --hand "白龙之落胤,灰流丽,无限泡影,深渊之兽 德鲁伊鳞虫,超融合" --tiers tiers.txt
node scripts/mdcard.mjs banlist --status limited1
node scripts/mdcard.mjs banlist --upcoming        # an announced list that is not in effect yet
node scripts/mdcard.mjs notes                     # the user's preferences and lessons (see below)
node scripts/mdcard.mjs update                    # force a refresh of cards and banlist
```

The first run downloads about 30 MB of card data and caches it in `~/.cache/master-duel-ai-advisor`, so let the user know if it takes a moment. The script checks the data sources for new versions about once an hour, and right away when a card lookup finds nothing, so cards from a new pack show up without any action.

`card` prints names (YGOPro Chinese name, the MD Chinese name when it differs, English, Japanese), the type line, MD rarity, MD banlist status, any "treated as" name, a link to the card's ygocdb page, and the full Chinese and English text. It accepts several names or passcodes at once (quote names that contain spaces). If a query matches several cards, it lists them; query again with the full name or passcode.

`search` filters, all optional and combined with AND:

- `--name` part of a name in any language
- `--text` a phrase in the card text, Chinese or English (repeatable)
- `--kind` repeatable; Chinese or English: 融合 同调 超量 连接 仪式 灵摆 调整 效果 通常 / 魔法 陷阱 速攻 永续 场地 装备 反击, or fusion, synchro, tuner, quick-play...
- `--race` and `--attr`, e.g. 龙 / dragon, 光 / light
- `--level`, `--link`, `--atk`, `--def` take `12`, `4-8`, `8-` or `-4` (`--level` is Rank for Xyz)
- `--archetype` YGOPRODeck archetype name in English, e.g. `Branded`
- `--rarity` UR, SR, R or N
- `--all-formats` include cards not in Master Duel (off by default), `--full` print each result's full text, `--limit` number of rows (default 60)

Extra Deck monsters in search results show their material line, but not their effects. When you need to judge candidates by what they do (for example, "which of these can interrupt on the opponent's turn"), add `--full` instead of looking each one up separately.

Material and condition wording is more uniform in the Chinese text (for example 调整＋调整以外的怪兽1只以上), so prefer Chinese phrases for pattern searches. A phrase filter can still drop cards worded differently, so when completeness matters, run the search once without `--text` and skim what the phrase excluded.

`deck` reads a whole deck and checks it: every card with rarity and banlist status, the deck's rarity totals, its Extra Deck locks (额外卡组的锁: each "this turn you can only Special Summon X from the Extra Deck" restriction in the deck, which of the deck's Extra Deck monsters it rules out, and which pairs of locks leave few or no Extra Deck monsters when used in the same turn), effects that may have no target (可能没有目标: a search or Special Summon from the Deck or Extra Deck for which the list has no qualifying card other than the card itself), and problems with deck size, copies (cards that 规则上当作 another card count together), the Master Duel banlist and cards not in Master Duel. It accepts:

- the URL of a deck page on the official card database (db.yugioh-card.com). Master Duel decks get there through the game's link with the card database. The deck has to be public; a private deck can't be read without logging in, and the script says so. Decks are private by default. To make one public, the user opens it for editing, taps the tag icon next to the deck name, chooses a deck type, turns the public setting on and saves;
- a YDKE string or a `.ydk` file;
- a card list, one card per line with an optional count (`3 灰流丽`, `Ash Blossom x3`, `灰流うらら ×3`), in Chinese, English or Japanese, with optional section headers such as 额外卡组 or Side Deck.

A name that only partially matches one card is accepted but listed under "按部分卡名认的，请确认"; a name that matches several cards is listed with candidates. Fix those with full names before relying on the result.

## Opening-hand odds

`odds` counts every possible opening hand (5 cards going first, 6 going second) and reports how often the hand can start the deck's plays (能动) and how often it has two or more separate starts (两个以上动点, a rough measure of getting through one hand trap). The deck argument takes the same inputs as `deck`; `--rules` takes a file, `-` for standard input, or the rules text itself. `--change` also shows the odds after a change to the Main Deck.

The tool does not know which cards start the deck. You write that from the card text, one line per card that matters:

```
废品大王：→ 能动
增援：→ 拿 4星以下 战士族 怪兽
再世之魔神 必密巴：要 手里 攻或守2500 怪兽 → 能动
再世记：→ 拿 「再世」怪兽
深渊之兽 赫界龙：→ 墓地有光暗；拿 「深渊之兽」怪兽 「深渊之兽 赫界龙」以外
深渊之兽 德鲁伊鳞虫：要 墓地有光暗 → 能动
后手：墓地有光暗
```

The format is `卡名：要 条件；条件 → 给；给`:

- 条件 (what the card needs before it can be used from the opening hand): `手里 <卡>` another card that must be in the hand and stays there, such as a card revealed for a summon; `丢 <卡>` or `素材 <卡>` a card that leaves the hand to use this one, as a cost or as a Fusion Material from the hand; `通召` the turn's one Normal Summon; or a state you name, such as `墓地有光暗` or `场上有阿不思`. Leave out `要` when it needs nothing.
- 给 (what using it gets you): `拿 <卡>` a card added from the Deck to the hand; a state; and `能动` when, from here, the deck can go on to a usable end board.
- `后手：` lists states the opponent's first turn provides when going second, such as a LIGHT or DARK monster in their GY.
- `<卡>` is written the way card text describes cards: 「卡名」, 「字段」怪兽, 4星以下, 4～8星, 光暗, 战士族, 攻或守2500, 攻守2500, 调整, 同调, 不能通常召唤, 魔法, 陷阱, 「X」以外.

How to write the lines for any deck:

1. Go through every Main Deck card and read its text with `card`. Hand traps and cards that only answer the opponent's board get no line.
2. 要 comes from the text: summoning conditions, costs, reveals, targets and Normal Summons. A Level 5 or higher monster without its own way to Special Summon itself needs a tribute, so it is rarely usable alone. Going first, both GYs and the opponent's field are empty; a card that targets a monster in the GY needs a state that some other card gives.
   A card whose effect fuses with cards from the hand is a two-card start: `赫之圣女 卡尔特西娅：要 通召；素材 光暗 怪兽 → 能动` (Granguignol is Cartesia + a LIGHT or DARK monster). When a card can get onto the field in more than one way, write one line per way; they are alternatives.
3. 给 also comes from the text: what it searches, what it sends to the GY (a cost that sends a LIGHT monster gives `墓地有光暗`), and `能动` when the deck has a known next step toward an end board. A card that only adds a body gives a state, such as `场上有调整`, and the combination becomes a line on the Extra Deck monster it makes (`黑龙之艾克莉西娅：要 场上有调整；场上有6星 → 能动`).
4. Describe searched and required cards the way the text does instead of listing names. The tool matches them against the deck and prints every match, which catches cards you would overlook, such as Bystials counting as monsters with 2500 ATK.
5. Spell each state the same everywhere. The report flags a state that is needed but never given.
6. Show the user the rules together with the numbers, point out the lines you were unsure about, and rerun after their corrections. When a correction would apply to other decks too (how to read a kind of effect), save it as a lesson and offer to draft an issue.

The tool tries every order of using the hand's cards. Each card is used at most once per hand, through one of its lines. Searches need a copy left in the Deck. It does not model draws, interruptions, or states running out (two Bystials need two GY targets but one `墓地有光暗` covers both), so treat 两个以上动点 as an estimate. What a hand ends up with after an interruption is the route planner's job, not this one's.

## Opening-hand route planner

`plan` finds the best board a given opening hand can reach going first. It runs EDOPro's rules engine (ygopro-core with ProjectIgnis' card scripts), so every summon, cost, lock and once-per-turn limit is enforced by the real card scripts rather than by your reading of them. It tries every line from the hand and scores each board by tiers you write. It needs Node.js 22.13 or later, and the first run downloads the engine's card database and scripts (about 60 MB). The search runs on several threads and stops when every line has been tried; `--seconds` caps the time (default 45) and `--limit` the number of positions. After that it spends up to half as long again on interruptions: the opponent is given Ash Blossom, Infinite Impermanence and Maxx "C", every chance to use each one along the best route is tried (every target too), and the report shows, per card, the moment that hurts most and our best fallback board from there. Under Maxx "C" each card the opponent draws costs 4 points, so the fallback is where the extra summons stop paying for themselves.

The score is the value of everything we can use on the opponent's turn: monsters on the board, spells and traps set before the turn ends, hand traps kept in the hand, effects that work from the GY, and whatever those cards bring out during the opponent's turn. The search only finds routes; it is only as good as the list of endpoints (终端) you give it, so the analysis below is the part that matters.

**Endpoint analysis.** Go through every card in the Main and Extra Deck and answer, from its text:

1. *What can it do by itself on the opponent's turn?* Look for 自己·对方回合, 对方回合, 对方把…发动时, 对方…的场合, 只要…存在. Classify it:
   - 硬康: negates an activation. 第一级 negates anything (三色康); 第二级 has a condition (only monsters, only Level 5 or higher, only face-up cards); 2.5级 a very narrow one (only destruction effects).
   - 软康: a tax or lock on the opponent's effects. A monster that makes them discard for every effect, a card that stops searching, "Level 5 or higher cannot attack".
   - 处理: removes a card on the opponent's turn: banish, destroy, send to the GY, return to the hand or Deck, change to face-down, place in a spell & trap zone. Read the whole effect: Icejade Gymir Aegirine looks like protection but also banishes every copy of the card it chains to.
   - 保护: our cards cannot be targeted, destroyed or affected.
2. *What can it bring out or add on the opponent's turn?* An effect usable on their turn that Special Summons, adds to the hand, or Synchro or Link Summons. Write `回合外 → <zone> <cards>`: Spright Elf brings a Level 2 from the GY, I:P Masquerena links on their turn, Melffy Wally returns to the hand and summons two Melffy from the Deck, Desert Locusts synchros on their main phase. Such a card is worth what it brings out, followed through as far as it goes (Melffy Catty adds Pinny, Pinny synchros into Locusts, Locusts into Borreload Savage), so a card with nothing of its own can still be the most valuable one on the board.
3. *Does it fetch an endpoint on our own turn?* (LeVirtue Dragon adding Seventh Tachyon Burst, Melffy of the Forest adding Wally.) That needs no line: the search sees the fetched card.
4. *Cards none of this describes* (Super Polymerization, which cannot be responded to; Maxx "C"; Nibiru) get 第0级, 1.5级 or a level you argue for, and you ask the user before adding a new one.

Each level is worth far more than the next, but not infinitely more:

| Level | Weight | What it is | Examples |
|---|---|---|---|
| 第0级 | 15 | cannot be stopped by the opponent | Super Polymerization |
| 第一级 | 10 | 硬康 without conditions | Baronne de Fleur, Herald of the Arc Light, Borreload Savage Dragon |
| 1.5级 | 6 | not a negation, but more than one | Maxx "C" |
| 第二级 | 4 | 硬康 with a condition | Clear Wing Synchro Dragon, Spright Red, Ash Blossom, Infinite Impermanence |
| 2.5级 | 2 | 硬康 with a very narrow condition | Stardust Dragon, Underworld Goddess of the Closed World |
| 软康 | 2 | a tax or lock on the opponent's effects: above removal, well below a real negation | General Raiho of the Ice Barrier |
| 第三级 | 1 | 处理 | Snake-Eyes Vengeance Dragon, Number 4: Stealth Kragen |
| 保护 | 1 | 保护; only full immunity to everything would be worth arguing for more | Mudragon of the Swamp, Spright Elf's ① |

These numbers come from the user's own choices with their Regenesis deck: with the same materials Baronne beats Clear Wing, but they would not give up Clear Wing's two negations and an Ash Blossom kept in the hand for one Baronne; and Super Polymerization is worth keeping over making a Baronne. 软康 and 保护 are the user's calls too: a tax is worth about half a conditional negation, and protection matters little unless it is complete. Cards used up during the turn lose their value, so the search weighs costs by itself.

Write one line per card, with one level and, where it applies, what it brings out:

```
超融合：第0级
鲜花女男爵：第一级
再世之导神 史莫特：第一级；要 另有 「再世」卡
增殖的G：1.5级；在手里
幻透翼同调龙：第二级×2
三英之相剑师：第二级；自己回合
赫焉龙 大木偶剧场龙：第二级；要 额外有 「死狱乡」怪兽；在场上或墓地
灰流丽：第二级；在手里
无限泡影：第二级
卫星闪灵·淘气精灵：保护；回合外 → 墓地 2星 怪兽
I：P百变莱娜：回合外 → 额外 连接 怪兽；要 另有 怪兽
童话动物·小小袋鼠：回合外 → 卡组 「童话动物」怪兽；带 2 只；在场上或手里
童话动物·小海豹：回合外 → 额外 同调 怪兽；在手里
```

- `×2`: it can do it twice on the opponent's turn through separate effects (Clear Wing's ① and ② are each once per turn).
- `回合外 → <zone> <cards>`: zone is 墓地, 卡组, 额外, 手里 or 场上; `带 N 只` when it brings more than one. The tool checks the zone in the actual position: Elf is worth nothing with no valued Level 2 in the GY. A card brought out this way is summoned on the opponent's turn, so its 召唤时 effect counts and its 自己回合 effect does not.
- `自己回合`: its effect works only on our own turn (an Ignition Effect). Going first the opponent has nothing to hit then, so it counts a flat 1 for our next turn (Three Champions on the board is better than nothing, but mostly it is a step in the route).
- `召唤时`: its effect works only when it is summoned (Chaos Angel). Going first that moment passes with nothing to hit, so it counts 0, unless it is brought out on the opponent's turn.
- Where it counts: by default on the field. `在手里` for hand traps. Traps, Quick-Play Spells and Infinite Impermanence must be set to be used on the opponent's turn, so they count on the field and are set automatically before the turn ends. `在墓地`, `在场上或墓地`, `在场上或手里` as the text says.
- `要 另有 <卡>`: it needs another card in the hand or on the field, such as a tribute or a cost. `要 额外有 <卡>`: it summons that later, so it counts only while the card is still there. `要 墓地有 <卡>`: it works only with such a card in the GY.
- `<卡>` uses the same card-text descriptions as `odds` (「卡名」, 「字段」怪兽, 光暗, 4星以下, 兽族 and so on).
- Each card name counts once, since these effects are usually once per turn by name.

How the search works, so you can explain its result: it starts going first with the opponent doing nothing, never activates the effects of cards valued in the hand on our own turn, never plays cards drawn by effects (they are random) except as a discard, sets the valued spells and traps, ends the turn, resolves the End Phase, and scores what the opponent faces. When two boards score the same, the shorter route comes first and the others are listed; mention the ties. The report lists the best board with its route, other boards, the fallback under each hand trap, and each first action with whether its branch was searched completely. If a branch hit the limit, say that a better board may exist there. The fallbacks assume we commit to the best route until the interruption and play freely after it; they do not consider choosing a different route because the opponent might hold that card.

Show the user the tier lines together with the result and let them correct the tiers. Present the route as the engine found it; do not add steps it did not take.

## The user's notes

Run `node scripts/mdcard.mjs notes` at the start of a Master Duel conversation. It prints the user's personal notes file (`~/.config/master-duel-ai-advisor/notes.md`, or `$MDAA_CONFIG_DIR/notes.md`), which skill updates never touch. Follow the preferences in it. They change how you answer and what you recommend, for example "mostly plays going second" or "has no UR points", but they never relax the data rules below.

When the user states a lasting preference, or corrects you in a way that should still apply next time, save it and tell them in one line what you saved:

```bash
node scripts/mdcard.mjs notes --preference "主要打后手，UR 点不够"
node scripts/mdcard.mjs notes --lesson "烙印融合锁的是发动的整个回合，不能先同调再开"
```

Keep each entry to one specific sentence. Do not save one-off details of the current deck or conversation.

Some lessons apply to every player: card data that is wrong, a rule in this skill that is stated badly, a search that keeps missing cards. When you notice one, offer to draft a GitHub issue for https://github.com/BettTer/master-duel-ai-advisor/issues/new with the lesson and a short example, leaving out personal details. The user decides whether to post it.

## Working rules

**Read the deck before judging it.** When the user shares a deck, run `deck` first and mention the problems it reports. If they describe a deck in shorthand, write it out with full card names and run `deck` on that list.

**Calculate consistency, don't estimate it.** For questions like how often the deck bricks, or whether cutting or adding a card helps, run `odds` (with `--change` for comparisons) instead of estimating, and show the rules you used.

**Look up before you quote.** Run `card` for every card your advice depends on, and quote the sentence that matters. Small paraphrase errors flip conclusions. For example, Branded Fusion's restriction applies to the whole turn you activate it (这张卡发动的回合), so you cannot Synchro Summon first and activate it afterwards, which is exactly what a from-memory answer once claimed.

**Use the Master Duel banlist only.** Every result shows the card's MD status and which list it comes from (MD 禁限表：<date> 生效). TCG and OCG lists do not apply. When a new list has been announced but is not in effect yet, results also show the coming change (→ <date> 起 …). Mention it, because it changes whether a card is worth building around or crafting. If the script reports that it could not refresh the banlist, tell the user the statuses may be stale.

**Search the pool before recommending for a slot.** When the user needs "a card that does X", run `search` with the constraints first, show the realistic candidates with rarity and banlist status, and only then recommend. Memory misses options. A pool search once surfaced a valid Level 12 Synchro that had never come up in a long discussion.

**Treat UR as a real cost.** Rarity is crafting cost, and UR is the scarce one. Before recommending a UR, check what you already know about the user's collection (deck lists they shared, earlier conversation, saved notes); if that doesn't settle it, ask whether they own the card. If they would have to craft it, say so plainly and suggest trying the deck first, for example in a simulator such as EDOPro.

**Get names right.** Give the Chinese name in 「」 together with the English name. When the MD name differs (shown as MD：…), mention it, because that is what the player sees in game. A card that 规则上当作「X」 counts as X for the copy limit: Fallen of the White Dragon shares Fallen of Albaz's three copies.

**Check turn restrictions against each other.** Lines like 这个回合，自己不是X不能从额外卡组特殊召唤 or 这张卡发动的回合… decide whether two cards can be used in the same turn. The `deck` report lists these locks and the pairs that conflict; use it, and for cards outside a deck list compare the lock sentences yourself. A lock marked 整回合有效 also stops the card from being activated after an Extra Deck summon it doesn't allow. Junk Meister's first effect locks you into Synchro Monsters and Branded Fusion locks you into Fusion Monsters, so those two lines cannot share a turn.

**Treat 可能没有目标 as a hint.** The check matches card names and archetype codes and skips wording it doesn't understand, so it can miss references and occasionally flag one wrongly. Look up the card and confirm against its text before telling the user a slot is dead. A reference that only takes from the Extra Deck is not judged when the list has no Extra Deck.

**Card text is not a ruling.** If the question depends on timing or a ruling the text does not settle, say so and point to the card's ygocdb page (it lists the official Q&A) instead of guessing.

**Offer options, not orders.** Lay out the choices and their trade-offs (consistency, interaction, crafting cost) and let the user decide. Do not invent combo routes. If you describe a sequence, check each step against the card text and flag anything you could not verify.

## Data notes

- The cache lives in `~/.cache/master-duel-ai-advisor`; set `MDAA_CACHE_DIR` to put it somewhere else.
- Card data comes from ygocdb.com (names, Chinese text) and YGOPRODeck (English text). Which cards are in Master Duel, their rarity and release date come from masterduelmeta.com, with YGOPRODeck's rarity for cards it has no release date for. 未实装或未收录 means the card is not in Master Duel; 将于 <date> 实装 means it has been announced for that date. `update` prints the version of each source the data was built from.
- The banlist comes from masterduelmeta.com and falls back to the [yaml-yugi limit regulation](https://github.com/DawnbrandBots/yaml-yugi-limit-regulation) data (rebuilt daily from Yugipedia) when Master Duel Meta cannot be used. It is refreshed at most once a day, and the output names the source.
- Card text and images belong to KONAMI. The script only caches data on the user's machine.
