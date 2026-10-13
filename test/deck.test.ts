import assert from "node:assert/strict";
import { test } from "node:test";
import type { Banlist } from "../src/banlist.ts";
import { checkDeck, parseDeckPage, parseTextList, parseYdk, parseYdke, readDeck } from "../src/deck.ts";
import { card } from "./helpers.ts";

const ash = card({ id: 14558127, cid: 12950, cn: "灰流丽", jp: "灰流うらら", en: "Ash Blossom & Joyous Spring", mdRarity: "UR" });
const albaz = card({ id: 68468459, cid: 16032, cn: "阿不思的落胤", en: "Fallen of Albaz", mdRarity: "UR" });
const whiteDragon = card({
  id: 73819701, cid: 20114, cn: "白龙之落胤", en: "Fallen of the White Dragon", mdRarity: "UR",
  descZh: "这个卡名在规则上当作「阿不思的落胤」使用。",
});
const brandedFusion = card({ id: 44362883, cid: 16070, cn: "烙印融合", en: "Branded Fusion", mdRarity: "UR" });
const albion = card({
  id: 87746184, cid: 16045, cn: "烙印龙 白界龙", en: "Albion the Branded Dragon", mdRarity: "UR",
  typesZh: "[怪兽|效果|融合] 龙/暗\n[★8] 2500/2000", typeEn: "Fusion Monster",
});
const lubellion = card({ id: 32731036, cn: "深渊之兽 赫界龙", en: "Bystial Lubellion" });
const dragonLubellion = card({ id: 2, cn: "神炎龙 赫界龙", en: "Lubellion the Searing Dragon" });
const utopia = card({ id: 84013237, cn: "No.39 希望皇 霍普", en: "Number 39: Utopia", typeEn: "XYZ Monster" });
const ocgOnly = card({ id: 9, cn: "未实装卡", en: "OCG Only", mdRarity: "" });
const cards = [ash, albaz, whiteDragon, brandedFusion, albion, lubellion, dragonLubellion, utopia, ocgOnly];

function ydke(main: number[], extra: number[]): string {
  const encode = (ids: number[]) => {
    const view = new DataView(new ArrayBuffer(ids.length * 4));
    ids.forEach((id, i) => view.setUint32(i * 4, id, true));
    return btoa(String.fromCharCode(...new Uint8Array(view.buffer)));
  };
  return `ydke://${encode(main)}!${encode(extra)}!!`;
}

test("parseYdke decodes little-endian passcodes per section", () => {
  assert.deepEqual(parseYdke(ydke([14558127, 14558127, 73819701], [87746184])), {
    main: [14558127, 14558127, 73819701], extra: [87746184], side: [],
  });
  assert.throws(() => parseYdke("ydke://abc"), /YDKE/);
});

test("parseYdk reads the three sections and skips comments", () => {
  const ids = parseYdk("#created by test\n#main\n14558127\n14558127\n#extra\n87746184\n!side\n73819701\n");
  assert.deepEqual(ids, { main: [14558127, 14558127], extra: [87746184], side: [73819701] });
});

test("parseDeckPage counts copies in each section of a card database deck page", () => {
  const link = (cid: number) => `<a href="/yugiohdb/card_search.action?ope=2&cid=${cid}&request_locale=ja"><img></a>`;
  const html = `<meta property="og:title" content="My Deck | 遊戯王 デッキレシピ 詳細 | 遊戯王ニューロン">`
    + `<div id="main" class="card_set"><h3>メインデッキ</h3>${link(12950).repeat(3)}${link(16070)}</div><!--#main-->`
    + `<div id="extra" class="card_set">${link(16045)}</div><!--#extra-->`
    + `<div id="side" class="card_set"></div><!--#side-->`;
  assert.deepEqual(parseDeckPage(html), { name: "My Deck", cids: { main: [12950, 12950, 12950, 16070], extra: [16045], side: [] } });
});

test("readDeck reports a deck page it cannot read, such as a private deck", async () => {
  const url = "https://www.db.yugioh-card.com/yugiohdb/member_deck.action?ope=1&cgid=abc&dno=1";
  await assert.rejects(readDeck(url, cards, async () => "<html>login</html>"), /公开/);
});

test("parseTextList reads counts, sections and names in any language", () => {
  const { entries, unknown, guessed } = parseTextList([
    "主卡组（40）", "3 灰流丽", "灰流うらら x2", "- 1 白龙之落胤", "Branded Fusion ×1",
    "烙印龙 白界龙", "No.39 希望皇 霍普", "3 赫界龙", "深渊之兽 1", "Side Deck", "2 阿不思的落胤",
  ].join("\n"), cards);
  assert.deepEqual(entries.map(([section, entry, count]) => [section, entry.en, count]), [
    ["main", "Ash Blossom & Joyous Spring", 3],
    ["main", "Ash Blossom & Joyous Spring", 2],
    ["main", "Fallen of the White Dragon", 1],
    ["main", "Branded Fusion", 1],
    ["extra", "Albion the Branded Dragon", 1], // Extra Deck monsters listed under the main deck move to the Extra Deck
    ["extra", "Number 39: Utopia", 1], // a name ending in a number is not read as a count
    ["main", "Bystial Lubellion", 1],
    ["side", "Fallen of Albaz", 2],
  ]);
  assert.deepEqual(guessed, ["深渊之兽 → 「深渊之兽 赫界龙」"]);
  assert.deepEqual(unknown, ["3 赫界龙（可能是：「深渊之兽 赫界龙」、「神炎龙 赫界龙」）"]);
});

test("checkDeck finds size, copy, banlist and Master Duel problems", async () => {
  const banlist: Banlist = {
    source: "test", upcoming: null,
    current: { date: "2026-10-06", entries: [{ id: 44362883, name: "Branded Fusion", status: "limited1" }] },
  };
  const deck = await readDeck(["3 白龙之落胤", "1 阿不思的落胤", "2 烙印融合", "1 未实装卡", "4 灰流丽"].join("\n"), cards);
  assert.deepEqual(checkDeck(deck, cards, banlist), [
    "主卡组 11 张，要在 40～60 张之间",
    "同名卡超过 3 张：「白龙之落胤」 3 张、「阿不思的落胤」 1 张（规则上算同一张卡）",
    "「灰流丽」 4 张，同名卡最多 3 张",
    "「烙印融合」 在 MD 限制 1 张，卡组里有 2 张",
    "「未实装卡」 MD 里没有这张卡",
  ]);
});
