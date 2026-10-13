---
name: master-duel-ai-advisor
description: Yu-Gi-Oh! Master Duel deckbuilding advisor backed by verified card data. Looks up exact card text (Chinese, English and Japanese, plus the Chinese name shown in Master Duel), Master Duel rarity and the current Master Duel Forbidden & Limited list, and searches the whole card pool by kind, level, attribute, type and card text, and reads and checks whole decks (a deck URL from the official card database, YDKE, .ydk or a card list). Use it whenever the conversation involves Yu-Gi-Oh! / 游戏王 / 遊戯王 Master Duel cards or decks, including what a card does, whether it is Forbidden or Limited (禁限), how rare it is or whether to craft it (合成, UR, SR), which cards could fill a slot ("which Level 12 Synchros can I make", "有没有不取对象的除外"), reviewing a deck list, or weighing deckbuilding trade-offs (构筑, 取舍, 卡组), even when the user doesn't say "Master Duel" or ask for a lookup.
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

`deck` reads a whole deck and checks it: every card with rarity and banlist status, the deck's rarity totals, its Extra Deck locks (额外卡组的锁: each "this turn you can only Special Summon X from the Extra Deck" restriction in the deck, which of the deck's Extra Deck monsters it rules out, and which pairs of locks leave few or no Extra Deck monsters when used in the same turn), and problems with deck size, copies (cards that 规则上当作 another card count together), the Master Duel banlist and cards not in Master Duel. It accepts:

- the URL of a deck page on the official card database (db.yugioh-card.com). Master Duel decks get there through the game's link with the card database. The deck has to be public; a private deck can't be read without logging in, and the script says so. Decks are private by default. To make one public, the user opens it for editing, taps the tag icon next to the deck name, chooses a deck type, turns the public setting on and saves;
- a YDKE string or a `.ydk` file;
- a card list, one card per line with an optional count (`3 灰流丽`, `Ash Blossom x3`, `灰流うらら ×3`), in Chinese, English or Japanese, with optional section headers such as 额外卡组 or Side Deck.

A name that only partially matches one card is accepted but listed under "按部分卡名认的，请确认"; a name that matches several cards is listed with candidates. Fix those with full names before relying on the result.

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

**Look up before you quote.** Run `card` for every card your advice depends on, and quote the sentence that matters. Small paraphrase errors flip conclusions. For example, Branded Fusion's restriction applies to the whole turn you activate it (这张卡发动的回合), so you cannot Synchro Summon first and activate it afterwards, which is exactly what a from-memory answer once claimed.

**Use the Master Duel banlist only.** Every result shows the card's MD status and which list it comes from (MD 禁限表：<date> 生效). TCG and OCG lists do not apply. When a new list has been announced but is not in effect yet, results also show the coming change (→ <date> 起 …). Mention it, because it changes whether a card is worth building around or crafting. If the script reports that it could not refresh the banlist, tell the user the statuses may be stale.

**Search the pool before recommending for a slot.** When the user needs "a card that does X", run `search` with the constraints first, show the realistic candidates with rarity and banlist status, and only then recommend. Memory misses options. A pool search once surfaced a valid Level 12 Synchro that had never come up in a long discussion.

**Treat UR as a real cost.** Rarity is crafting cost, and UR is the scarce one. Before recommending a UR, check what you already know about the user's collection (deck lists they shared, earlier conversation, saved notes); if that doesn't settle it, ask whether they own the card. If they would have to craft it, say so plainly and suggest trying the deck first, for example in a simulator such as EDOPro.

**Get names right.** Give the Chinese name in 「」 together with the English name. When the MD name differs (shown as MD：…), mention it, because that is what the player sees in game. A card that 规则上当作「X」 counts as X for the copy limit: Fallen of the White Dragon shares Fallen of Albaz's three copies.

**Check turn restrictions against each other.** Lines like 这个回合，自己不是X不能从额外卡组特殊召唤 or 这张卡发动的回合… decide whether two cards can be used in the same turn. The `deck` report lists these locks and the pairs that conflict; use it, and for cards outside a deck list compare the lock sentences yourself. A lock marked 整回合有效 also stops the card from being activated after an Extra Deck summon it doesn't allow. Junk Meister's first effect locks you into Synchro Monsters and Branded Fusion locks you into Fusion Monsters, so those two lines cannot share a turn.

**Card text is not a ruling.** If the question depends on timing or a ruling the text does not settle, say so and point to the card's ygocdb page (it lists the official Q&A) instead of guessing.

**Offer options, not orders.** Lay out the choices and their trade-offs (consistency, interaction, crafting cost) and let the user decide. Do not invent combo routes. If you describe a sequence, check each step against the card text and flag anything you could not verify.

## Data notes

- The cache lives in `~/.cache/master-duel-ai-advisor`; set `MDAA_CACHE_DIR` to put it somewhere else.
- Card data comes from ygocdb.com (names, Chinese text) and YGOPRODeck (English text). Which cards are in Master Duel, their rarity and release date come from masterduelmeta.com, with YGOPRODeck's rarity for cards it has no release date for. 未实装或未收录 means the card is not in Master Duel; 将于 <date> 实装 means it has been announced for that date. `update` prints the version of each source the data was built from.
- The banlist comes from masterduelmeta.com and falls back to the [yaml-yugi limit regulation](https://github.com/DawnbrandBots/yaml-yugi-limit-regulation) data (rebuilt daily from Yugipedia) when Master Duel Meta cannot be used. It is refreshed at most once a day, and the output names the source.
- Card text and images belong to KONAMI. The script only caches data on the user's machine.
