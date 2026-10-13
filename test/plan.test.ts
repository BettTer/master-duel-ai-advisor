import assert from "node:assert/strict";
import { test } from "node:test";
import type { Card } from "../src/cards.ts";
import type { Deck } from "../src/deck.ts";
import { LEVELS, SEEN_SLOTS, boardOrder, parseTiers, sharedSeen, type Board } from "../src/plan.ts";
import { card } from "./helpers.ts";

const baronne = card({ id: 1, cn: "鲜花女男爵", typesZh: "[怪兽|效果|同调] 战士/风" });
const clearWing = card({ id: 2, cn: "幻透翼同调龙", typesZh: "[怪兽|效果|同调] 龙/风" });
const sage = card({ id: 3, cn: "再世之导神 史莫特", typesZh: "[怪兽|效果] 魔法师/水" });
const granguignol = card({ id: 4, cn: "赫焉龙 大木偶剧场龙", typesZh: "[怪兽|效果|融合] 魔法师/光" });
const ash = card({ id: 5, cn: "灰流丽", typesZh: "[怪兽|效果|调整] 不死/炎" });
const superPoly = card({ id: 6, cn: "超融合", typesZh: "[魔法|速攻]" });
const deck: Deck = {
  name: "", source: "test", unknown: [], guessed: [], side: [],
  main: [sage, ash, superPoly].map((entry: Card) => ({ card: entry, count: 3 })),
  extra: [baronne, clearWing, granguignol].map((entry: Card) => ({ card: entry, count: 1 })),
};

test("parseTiers reads one level per card, uses, places and conditions", () => {
  const tiers = parseTiers([
    "鲜花女男爵：第一级",
    "幻透翼同调龙：第二级×2",
    "再世之导神 史莫特：第一级；要 另有 「再世」卡",
    "赫焉龙 大木偶剧场龙：第二级；要 额外有 「死狱乡」怪兽；在场上或墓地",
    "灰流丽：第二级；在手里",
    "超融合：第0级",
    "增殖的G：1.5级",
    "鲜花女男爵：第三级",
    "史莫特：第一级；第三级",
  ].join("\n"), deck, []);
  assert.deepEqual(tiers.lines.map((line) => [line.card.cn, LEVELS[line.level].name, line.uses, line.where, line.besides.length, line.inExtra.length]), [
    ["鲜花女男爵", "第一级", 1, "field", 0, 0],
    ["幻透翼同调龙", "第二级", 2, "field", 0, 0],
    ["再世之导神 史莫特", "第一级", 1, "field", 1, 0],
    ["赫焉龙 大木偶剧场龙", "第二级", 1, "any", 0, 1],
    ["灰流丽", "第二级", 1, "hand", 0, 0],
    ["超融合", "第0级", 1, "field", 0, 0],
  ]);
  // A card not in the deck (增殖的G), and a second line for 鲜花女男爵 and for 史莫特.
  assert.equal(tiers.problems.length, 3);
});

test("boards compare by value, then by the shorter route", () => {
  const board = (value: number, steps: number): Board => ({ value, field: [], sets: [], counted: [], steps: Array(steps).fill("") });
  assert.ok(boardOrder(board(19, 9), board(18, 2)) < 0);
  assert.ok(boardOrder(board(19, 3), board(19, 6)) < 0);
  // The user's judgments: Baronne beats two second-level negations but not three (Clear Wing's two and an Ash Blossom
  // kept in the hand), and Super Polymerization is worth more than Baronne.
  const [zero, first, , second] = LEVELS.map((level) => level.weight);
  assert.ok(first > 2 * second && first < 3 * second && zero > first);
});

test("the shared table of seen positions answers whether a position was seen before", () => {
  const seen = sharedSeen(new BigInt64Array(new SharedArrayBuffer(SEEN_SLOTS * 8)));
  assert.equal(seen("a|b|c"), false);
  assert.equal(seen("a|b|d"), false);
  assert.equal(seen("a|b|c"), true);
  for (let index = 0; index < 5000; index++) assert.equal(seen(`position ${index}`), false);
  assert.equal(seen("position 4999"), true);
});
