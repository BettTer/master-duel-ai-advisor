import assert from "node:assert/strict";
import { test } from "node:test";
import type { Deck } from "../src/deck.ts";
import { archetypeLookup } from "../src/query.ts";
import { missingTargets, parseObject, parseReferences } from "../src/refs.ts";
import { card } from "./helpers.ts";

test("parseObject reads exclusions, counts, kinds, levels and alternatives", () => {
  assert.deepEqual(parseObject("「废品大王」以外的1张「废品」卡"), {
    excluded: ["废品大王"], targets: [{ mode: "archetype", refs: ["废品"], kinds: [], level: undefined }],
  });
  assert.deepEqual(parseObject("1只4星以下的「相剑」怪兽守备表示")?.targets, [{ mode: "archetype", refs: ["相剑"], kinds: ["怪兽"], level: [0, 4] }]);
  assert.deepEqual(parseObject("1只「相剑」怪兽或「阿不思的落胤」")?.targets.map((target) => [target.mode, target.refs]), [
    ["archetype", ["相剑"]], ["name", ["阿不思的落胤"]],
  ]);
  assert.deepEqual(parseObject("1只「战士」、「星尘」同调怪兽")?.targets, [{ mode: "archetype", refs: ["战士", "星尘"], kinds: ["同调"], level: undefined }]);
  assert.deepEqual(parseObject("1张「融合」通常魔法卡")?.targets[0].subtype, "通常");
  assert.deepEqual(parseObject("有「阿不思的落胤」的卡名记述的1只怪兽")?.targets[0].mode, "mentions");
  assert.equal(parseObject("1只和那只怪兽相同种族的怪兽"), null);
});

test("parseReferences splits 或者 into options of one reference", () => {
  const granguignol = card({ cn: "赫焉龙 大木偶剧场龙", descZh: "②：……才能发动。从卡组把1只「教导」怪兽或者从额外卡组把1只「死狱乡」怪兽特殊召唤。" });
  const [reference] = parseReferences(granguignol);
  assert.equal(reference.effect, "②");
  assert.deepEqual(reference.options.map((option) => [option.zones, option.targets[0].refs]), [[["main"], ["教导"]], [["extra"], ["死狱乡"]]]);
});

const meister = card({
  id: 1, cn: "废品大王", typesZh: "[怪兽|效果] 战士/地", setcodes: [0x43],
  descZh: "①：把额外卡组1只「战士」、「星尘」同调怪兽给对方观看才能发动。\r\n②：从卡组把「废品大王」以外的1张「废品」卡加入手卡。",
});
const armor = card({ id: 2, cn: "废品铠甲", typesZh: "[怪兽|效果] 战士/地", setcodes: [0x43] });
const stardust = card({ id: 3, cn: "星尘龙", typesZh: "[怪兽|同调] 龙/风", setcodes: [0xa3] });
const granguignol = card({
  id: 4, cn: "赫焉龙 大木偶剧场龙", typesZh: "[怪兽|效果|融合] 魔法师/光",
  descZh: "②：从卡组把1只「教导」怪兽或者从额外卡组把1只「死狱乡」怪兽特殊召唤。",
});
const proskenion = card({ id: 5, cn: "死狱乡演员·镜框舞台龙", typesZh: "[怪兽|效果|融合] 恶魔/光", setcodes: [0x164] });
const despian = card({ id: 6, cn: "赫圣之妖骑士", md: "惨绝戏子・赫圣之妖骑士", typesZh: "[怪兽|效果|同调] 魔法师/光", setcodes: [0x164] });
const aluber = card({ id: 7, cn: "死狱乡的导化 阿鲁伯", typesZh: "[怪兽|效果] 恶魔/暗", setcodes: [0x164] });
const pool = [meister, armor, stardust, granguignol, proskenion, despian, aluber];
const inArchetype = archetypeLookup(pool);

const deck = (main: [typeof meister, number][], extra: [typeof meister, number][]): Deck => ({
  name: "", source: "test", unknown: [], guessed: [], side: [],
  main: main.map(([entry, count]) => ({ card: entry, count })),
  extra: extra.map(([entry, count]) => ({ card: entry, count })),
});

test("archetypeLookup recognises members by code even when the name differs", () => {
  assert.ok(inArchetype(despian, "死狱乡")); // 赫圣之妖骑士 has no 死狱乡 in its names
  assert.ok(inArchetype(armor, "废品"));
  assert.ok(!inArchetype(stardust, "废品"));
});

test("missingTargets flags references with nothing to take, not counting the card itself", () => {
  const flagged = (testDeck: Deck) => missingTargets(testDeck, inArchetype).map((reference) => `${reference.card.cn}${reference.effect}`);
  assert.deepEqual(flagged(deck([[meister, 3]], [[stardust, 1]])), ["废品大王②"]);
  assert.deepEqual(flagged(deck([[meister, 3], [armor, 1]], [[granguignol, 1]])), ["废品大王①", "赫焉龙 大木偶剧场龙②"]);
  assert.deepEqual(flagged(deck([[meister, 3], [armor, 1]], [[stardust, 1], [granguignol, 1], [despian, 1]])), []);
  assert.deepEqual(flagged(deck([[meister, 3]], [])), ["废品大王②"]); // no Extra Deck given: its references are not judged
});
