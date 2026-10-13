import assert from "node:assert/strict";
import { test } from "node:test";
import { allows, analyzeLocks, parseAllowed, parseLocks } from "../src/locks.ts";
import { card } from "./helpers.ts";

const byName = (testCard: { cn: string }, archetype: string) => testCard.cn.includes(archetype);

const meister = card({
  id: 1, cn: "废品大王",
  descZh: "这个卡名的①②③的效果1回合各能使用1次。\r\n①：把额外卡组1只「战士」、「星尘」同调怪兽给对方观看才能发动。这张卡从手卡特殊召唤。这个回合，自己不是同调怪兽不能从额外卡组特殊召唤。\r\n②：……",
});
const brandedFusion = card({
  id: 2, cn: "烙印融合",
  descZh: "这个卡名的卡在1回合只能发动1张，这张卡发动的回合，自己不是融合怪兽不能从额外卡组特殊召唤。\r\n①：……",
});
const whiteDragon = card({
  id: 3, cn: "白龙之落胤",
  descZh: "①：这张卡在手卡存在的场合……才能发动。这张卡特殊召唤。这个回合，自己不是8星的融合·同调怪兽不能从额外卡组特殊召唤。",
});
const patron = card({ id: 4, cn: "耀圣诗之狱神精", descZh: "①：自己不是同调怪兽不能从额外卡组特殊召唤。\r\n②：……" });

const extra = (id: number, cn: string, types: string, level: number) => card({ id, cn, typesZh: types, level });
const albion = extra(10, "烙印龙 白界龙", "[怪兽|效果|融合] 龙/暗\n[★8] 2500/2000", 8);
const stardust = extra(11, "星尘龙", "[怪兽|同调] 龙/风\n[★8] 2500/2000", 8);
const baronne = extra(12, "鲜花女男爵", "[怪兽|效果|同调] 植物/风\n[★10] 3000/2400", 10);

test("parseAllowed reads kinds, levels, attributes, types, archetypes and ATK", () => {
  assert.deepEqual(parseAllowed("8星的融合·同调怪兽"), { kinds: ["融合", "同调"], archetypes: [], races: [], attributes: [], level: [8, 8] });
  assert.deepEqual(parseAllowed("龙族·暗属性同调怪兽"), { kinds: ["同调"], archetypes: [], races: ["龙"], attributes: ["暗"] });
  assert.deepEqual(parseAllowed("兽族·兽战士族·鸟兽族怪兽")?.races, ["兽", "兽战士", "鸟兽"]);
  assert.deepEqual(parseAllowed("光·暗属性怪兽")?.attributes, ["光", "暗"]);
  assert.deepEqual(parseAllowed("「斩机」怪兽以及「电脑网」怪兽")?.archetypes, ["斩机", "电脑网"]);
  assert.deepEqual(parseAllowed("4阶以上的超量怪兽")?.level, [4, 99]);
  assert.equal(parseAllowed("原本攻击力是1500以下的机械族怪兽")?.maxAtk, 1500);
  assert.equal(parseAllowed("和作为对象的怪兽的其中任意种相同种族的怪兽"), null);
});

test("parseLocks finds the effect and when the lock applies", () => {
  const summary = (lockCard: typeof meister) => parseLocks(lockCard).map((lock) => [lock.effect, lock.timing]);
  assert.deepEqual(summary(meister), [["①", "rest-of-turn"]]);
  assert.deepEqual(summary(brandedFusion), [["", "whole-turn"]]);
  assert.deepEqual(summary(patron), [["①", "while-present"]]);
  const none = card({ descZh: "①：……。这个效果的发动后，直到回合结束时自己不能从额外卡组把怪兽特殊召唤。" });
  assert.equal(parseLocks(none)[0].allowed, "none");
});

test("allows checks an Extra Deck monster against a lock", () => {
  const level8FusionOrSynchro = parseAllowed("8星的融合·同调怪兽")!;
  assert.ok(allows(level8FusionOrSynchro, albion, byName));
  assert.ok(allows(level8FusionOrSynchro, stardust, byName));
  assert.ok(!allows(level8FusionOrSynchro, baronne, byName));
});

test("analyzeLocks lists what each lock rules out and pairs that narrow or empty the Extra Deck", () => {
  const { locks, pairs } = analyzeLocks([meister, brandedFusion, whiteDragon], [albion, stardust, baronne], byName);
  assert.deepEqual(locks.map(({ lock, blocked }) => [lock.card.cn, blocked.map((blockedCard) => blockedCard.cn)]), [
    ["废品大王", ["烙印龙 白界龙"]],
    ["烙印融合", ["星尘龙", "鲜花女男爵"]],
    ["白龙之落胤", ["鲜花女男爵"]],
  ]);
  assert.deepEqual(pairs.map(({ first, second, remaining }) => [first.card.cn, second.card.cn, remaining.map((left) => left.cn)]), [
    ["废品大王", "烙印融合", []],
    ["废品大王", "白龙之落胤", ["星尘龙"]],
  ]);
});
