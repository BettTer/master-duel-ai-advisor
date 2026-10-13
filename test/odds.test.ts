import assert from "node:assert/strict";
import { test } from "node:test";
import type { Card } from "../src/cards.ts";
import type { Deck } from "../src/deck.ts";
import { changeDeck, handOdds, parseGroup, parseRules, startsInHand } from "../src/odds.ts";
import { archetypeLookup } from "../src/query.ts";
import { card } from "./helpers.ts";

const monster = (id: number, cn: string, types: string, level: number, atk: number, def: number) =>
  card({ id, cn, typesZh: `${types}\n[★${level}] ${atk}/${def}`, level, atk, def });
const archfiend = monster(1, "再世之魔神 必密巴", "[怪兽|效果] 恶魔/地", 8, 2500, 2500);
const dragon = monster(2, "再世之龙神 韦依格拉", "[怪兽|效果] 龙/风", 8, 2500, 2500);
const regenesis = card({ id: 3, cn: "再世记", typesZh: "[魔法]" });
const lubellion = monster(4, "深渊之兽 赫界龙", "[怪兽|效果|特殊召唤] 龙/光", 8, 2500, 3000);
const druiswurm = monster(5, "深渊之兽 德鲁伊鳞虫", "[怪兽|效果] 龙/暗", 6, 2500, 2000);
const meister = monster(6, "废品大王", "[怪兽|效果] 战士/地", 4, 100, 2300);
const reinforcement = card({ id: 7, cn: "增援", typesZh: "[魔法]" });
const cartesia = monster(8, "赫之圣女 卡尔特西娅", "[怪兽|效果|调整] 魔法师/光", 4, 1500, 1500);
const whiteDragon = monster(9, "白龙之落胤", "[怪兽|效果] 龙/光", 4, 1500, 1500);
const blank = card({ id: 99, cn: "空白", typesZh: "[陷阱]" });
const pool = [archfiend, dragon, regenesis, lubellion, druiswurm, meister, reinforcement, cartesia, whiteDragon, blank];
const inArchetype = archetypeLookup(pool);

const deck = (main: [Card, number][]): Deck => ({
  name: "", source: "test", unknown: [], guessed: [], extra: [], side: [],
  main: main.map(([entry, count]) => ({ card: entry, count })),
});

test("parseGroup reads card descriptions written like card text", () => {
  const group = parseGroup("4星以下 战士族 怪兽");
  assert.deepEqual([group.level, group.races, group.kinds], [[0, 4], ["战士"], ["怪兽"]]);
  assert.equal(parseGroup("攻或守是 2500 的怪兽").atkOrDef, 2500);
  assert.deepEqual(parseGroup("「深渊之兽」怪兽 「深渊之兽 赫界龙」以外"), {
    text: "「深渊之兽」怪兽 「深渊之兽 赫界龙」以外", names: [], archetypes: ["深渊之兽"], excluded: ["深渊之兽 赫界龙"],
    kinds: ["怪兽"], races: [], attributes: [],
  });
  const chaos = parseGroup("1只4～8星不能通常召唤的光暗怪兽");
  assert.deepEqual([chaos.level, chaos.kinds, chaos.attributes], [[4, 8], ["特殊召唤", "怪兽"], ["光", "暗"]]);
  assert.deepEqual(parseGroup("废品大王", pool).names, ["废品大王"]);
  assert.throws(() => parseGroup("随便什么"), /看不懂/);
});

test("a single starter's odds match the hypergeometric formula", () => {
  const rules = (text: string, testDeck: Deck) => parseRules(text, testDeck, pool);
  const oneStarter = deck([[meister, 3], [blank, 37]]);
  const { first, second } = handOdds(oneStarter, rules("废品大王：→ 能动", oneStarter), inArchetype);
  const miss = (cards: number) => (choose(37, cards) / choose(40, cards));
  assert.ok(Math.abs(first.playable - (1 - miss(5))) < 1e-12);
  assert.ok(Math.abs(second.playable - (1 - miss(6))) < 1e-12);
  assert.equal(first.twoOrMore, 0); // a second copy of the same card is not a second start

  const twoStarters = deck([[meister, 3], [archfiend, 3], [blank, 34]]);
  const both = handOdds(twoStarters, rules("废品大王：→ 能动\n必密巴：→ 能动", twoStarters), inArchetype);
  assert.ok(Math.abs(both.first.twoOrMore - (1 - 2 * miss(5) + choose(34, 5) / choose(40, 5))) < 1e-12);
});

function choose(n: number, k: number): number {
  let value = 1;
  for (let i = 1; i <= k; i++) value = (value * (n - k + i)) / i;
  return value;
}

test("searches stand in for what they find, and two-card starts need both cards", () => {
  const testDeck = deck([[archfiend, 3], [dragon, 1], [regenesis, 3], [meister, 1], [reinforcement, 1], [blank, 31]]);
  const rules = parseRules([
    "再世之魔神 必密巴：要 手里 攻或守2500 怪兽 → 能动",
    "再世记：→ 拿 「再世」怪兽",
    "废品大王：→ 能动",
    "增援：→ 拿 4星以下 战士族 怪兽",
  ].join("\n"), testDeck, pool);
  assert.deepEqual(rules.problems, []);
  const starts = (...names: string[]) => startsInHand(testDeck, rules, inArchetype, [...names, "空白", "空白", "空白"].slice(0, 5));
  assert.equal(starts("再世之魔神 必密巴"), 0);
  assert.equal(starts("再世记"), 0); // finds 必密巴, which still needs a 2500 monster
  assert.equal(starts("再世记", "再世记"), 0);
  assert.equal(starts("再世之魔神 必密巴", "再世之魔神 必密巴"), 1); // reveals the other copy
  assert.equal(starts("再世之魔神 必密巴", "再世记"), 1); // 再世记 finds 韦依格拉 to reveal
  assert.equal(starts("再世记", "再世之龙神 韦依格拉"), 1);
  assert.equal(starts("增援"), 1);
  assert.equal(starts("增援", "再世之魔神 必密巴", "再世之龙神 韦依格拉"), 2);
  assert.equal(starts("废品大王", "增援"), 1); // the only 废品大王 is already in the hand
});

test("states come from other cards going first and from the opponent going second", () => {
  const testDeck = deck([[lubellion, 2], [druiswurm, 2], [meister, 3], [blank, 33]]);
  const rules = parseRules([
    "深渊之兽 赫界龙：→ 墓地有光暗；拿 「深渊之兽」怪兽 「深渊之兽 赫界龙」以外",
    "深渊之兽 德鲁伊鳞虫：要 墓地有光暗 → 能动",
    "废品大王：要 通召 → 能动",
    "后手：墓地有光暗",
  ].join("\n"), testDeck, pool);
  const starts = (names: string[], second = false) => startsInHand(testDeck, rules, inArchetype, names, second);
  assert.equal(starts(["深渊之兽 德鲁伊鳞虫"]), 0);
  assert.equal(starts(["深渊之兽 德鲁伊鳞虫"], true), 1);
  assert.equal(starts(["深渊之兽 赫界龙"]), 1);
  assert.equal(starts(["深渊之兽 赫界龙", "废品大王"]), 2);

  const report = handOdds(testDeck, rules, inArchetype);
  assert.ok(report.secondAlone && report.second.playable > report.secondAlone.playable);
});

test("a card's lines are alternatives, and Fusion Materials from the hand are used up", () => {
  const testDeck = deck([[cartesia, 2], [whiteDragon, 3], [druiswurm, 1], [blank, 34]]);
  const rules = parseRules([
    "赫之圣女 卡尔特西娅：要 通召；素材 光暗 怪兽 → 能动",
    "赫之圣女 卡尔特西娅：要 场上有阿不思 → 能动",
    "白龙之落胤：→ 能动；场上有阿不思",
  ].join("\n"), testDeck, pool);
  const starts = (...names: string[]) => startsInHand(testDeck, rules, inArchetype, names);
  assert.equal(starts("赫之圣女 卡尔特西娅"), 0);
  assert.equal(starts("赫之圣女 卡尔特西娅", "深渊之兽 德鲁伊鳞虫"), 1);
  assert.equal(starts("赫之圣女 卡尔特西娅", "白龙之落胤"), 2);
  assert.equal(starts("赫之圣女 卡尔特西娅", "赫之圣女 卡尔特西娅", "白龙之落胤"), 2); // not one start per copy

  const materialOnly = parseRules("赫之圣女 卡尔特西娅：要 通召；素材 光暗 怪兽 → 能动\n白龙之落胤：→ 能动", testDeck, pool);
  assert.equal(startsInHand(testDeck, materialOnly, inArchetype, ["赫之圣女 卡尔特西娅", "白龙之落胤"]), 1); // 白龙 is the material
});

test("rules report what they could not use", () => {
  const testDeck = deck([[meister, 3], [blank, 37]]);
  const { problems } = parseRules("废品大王：要 墓地有光暗 → 能动\n灰流丽：→ 能动\n这一行没有冒号", testDeck, pool);
  assert.equal(problems.length, 3);
  assert.match(problems.join("\n"), /灰流丽.*没有这张卡/);
  assert.match(problems.join("\n"), /状态"墓地有光暗"有卡要/);
});

test("changeDeck removes and adds copies", () => {
  const { deck: changed, label } = changeDeck(deck([[meister, 3], [blank, 37]]), "-1 空白, +1 增援", pool);
  assert.deepEqual(changed.main.map(({ card: entry, count }) => [entry.cn, count]), [["废品大王", 3], ["空白", 36], ["增援", 1]]);
  assert.equal(label, "−1「空白」 ＋1「增援」");
});
