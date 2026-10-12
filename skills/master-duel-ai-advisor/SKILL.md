---
name: master-duel-ai-advisor
description: Yu-Gi-Oh! Master Duel deckbuilding advisor backed by verified card data. Looks up exact card text (Chinese, English and Japanese, plus the Chinese name shown in Master Duel), Master Duel rarity and the current Master Duel Forbidden & Limited list, and searches the whole card pool by kind, level, attribute, type and card text. Use it whenever the conversation involves Yu-Gi-Oh! / 游戏王 / 遊戯王 Master Duel cards or decks, including what a card does, whether it is Forbidden or Limited (禁限), how rare it is or whether to craft it (合成, UR, SR), which cards could fill a slot ("which Level 12 Synchros can I make", "有没有不取对象的除外"), reviewing a deck list, or weighing deckbuilding trade-offs (构筑, 取舍, 卡组), even when the user doesn't say "Master Duel" or ask for a lookup.
---

# Master Duel AI Advisor

This skill lets you base Master Duel deckbuilding advice on the real card text, the Master Duel banlist and the full card pool instead of memory. Most bad deckbuilding advice comes from a card effect remembered slightly wrong, a banlist from the wrong format, or a candidate that was never considered. The lookup script removes all three.

## The lookup script

`scripts/mdcard.py` (Python 3, standard library only). Paths below are relative to this skill's directory.

```bash
python3 scripts/mdcard.py card 废品大王              # any language, part of a name, or a passcode
python3 scripts/mdcard.py card 53971455 79415624 "Junk Meister"   # several cards in one run
python3 scripts/mdcard.py search --kind 同调 --level 12 --text "调整＋调整以外的怪兽1只以上"
python3 scripts/mdcard.py search --kind 调整 --level 4 --attr 光 --race 魔法师
python3 scripts/mdcard.py search --kind 速攻 --text "「阿不思的落胤」"
python3 scripts/mdcard.py banlist --status limited1
python3 scripts/mdcard.py banlist --upcoming        # an announced list that is not in effect yet
python3 scripts/mdcard.py notes                     # the user's preferences and lessons (see below)
python3 scripts/mdcard.py update                    # force a refresh of cards and banlist
```

The first run downloads about 30 MB of card data and caches it in `~/.cache/master-duel-ai-advisor` (refreshed weekly), so let the user know if it takes a moment.

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

## The user's notes

Run `python3 scripts/mdcard.py notes` at the start of a Master Duel conversation. It prints the user's personal notes file (`~/.config/master-duel-ai-advisor/notes.md`, or `$MDAA_CONFIG_DIR/notes.md`), which skill updates never touch. Follow the preferences in it. They change how you answer and what you recommend, for example "mostly plays going second" or "has no UR points", but they never relax the data rules below.

When the user states a lasting preference, or corrects you in a way that should still apply next time, save it and tell them in one line what you saved:

```bash
python3 scripts/mdcard.py notes --preference "主要打后手，UR 点不够"
python3 scripts/mdcard.py notes --lesson "烙印融合锁的是发动的整个回合，不能先同调再开"
```

Keep each entry to one specific sentence. Do not save one-off details of the current deck or conversation.

Some lessons apply to every player: card data that is wrong, a rule in this skill that is stated badly, a search that keeps missing cards. When you notice one, offer to draft a GitHub issue for https://github.com/BettTer/master-duel-ai-advisor/issues/new with the lesson and a short example, leaving out personal details. The user decides whether to post it.

## Working rules

**Look up before you quote.** Run `card` for every card your advice depends on, and quote the sentence that matters. Small paraphrase errors flip conclusions. For example, Branded Fusion's restriction applies to the whole turn you activate it (这张卡发动的回合), so you cannot Synchro Summon first and activate it afterwards, which is exactly what a from-memory answer once claimed.

**Use the Master Duel banlist only.** Every result shows the card's MD status and which list it comes from (MD 禁限表：<date> 生效). TCG and OCG lists do not apply. When a new list has been announced but is not in effect yet, results also show the coming change (→ <date> 起 …). Mention it, because it changes whether a card is worth building around or crafting. If the script reports that it could not refresh the banlist, tell the user the statuses may be stale.

**Search the pool before recommending for a slot.** When the user needs "a card that does X", run `search` with the constraints first, show the realistic candidates with rarity and banlist status, and only then recommend. Memory misses options. A pool search once surfaced a valid Level 12 Synchro that had never come up in a long discussion.

**Treat UR as a real cost.** Rarity is crafting cost, and UR is the scarce one. Before recommending a UR, check what you already know about the user's collection (deck lists they shared, earlier conversation, saved notes); if that doesn't settle it, ask whether they own the card. If they would have to craft it, say so plainly and suggest trying the deck first, for example in a simulator such as EDOPro.

**Get names right.** Give the Chinese name in 「」 together with the English name. When the MD name differs (shown as MD：…), mention it, because that is what the player sees in game. A card that 规则上当作「X」 counts as X for the copy limit: Fallen of the White Dragon shares Fallen of Albaz's three copies.

**Check turn restrictions against each other.** Lines like 这个回合，自己不是X不能从额外卡组特殊召唤 or 这张卡发动的回合… decide whether two cards can be used in the same turn. When a plan relies on more than one such card, compare them and say whether they conflict. Junk Meister's first effect locks you into Synchro Monsters and Branded Fusion locks you into Fusion Monsters, so those two lines cannot share a turn.

**Card text is not a ruling.** If the question depends on timing or a ruling the text does not settle, say so and point to the card's ygocdb page (it lists the official Q&A) instead of guessing.

**Offer options, not orders.** Lay out the choices and their trade-offs (consistency, interaction, crafting cost) and let the user decide. Do not invent combo routes. If you describe a sequence, check each step against the card text and flag anything you could not verify.

## Data notes

- The cache lives in `~/.cache/master-duel-ai-advisor`; set `MDAA_CACHE_DIR` to put it somewhere else.
- Card data comes from ygocdb.com (names, Chinese text) and YGOPRODeck (English text, MD rarity). MD rarity marked 未实装或未收录 usually means the card is not in Master Duel; very new cards can also lag behind.
- The banlist comes from masterduelmeta.com and falls back to the [yaml-yugi limit regulation](https://github.com/DawnbrandBots/yaml-yugi-limit-regulation) data (rebuilt daily from Yugipedia) when Master Duel Meta cannot be used. It is refreshed at most once a day, and the output names the source.
- Card text and images belong to KONAMI. The script only caches data on the user's machine.
