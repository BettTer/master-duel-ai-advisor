// English descriptions of the deck checks that the engine reports as Chinese card-text quotes: an Extra Deck lock
// is described from what it still allows, and a reference from where it takes what.
import type { Allowed, Lock } from "../../src/locks.ts";
import type { Reference, Target } from "../../src/refs.ts";
import type { Card } from "../../src/merge.ts";
import { t } from "./i18n.ts";

const KIND: Record<string, string> = { 融合: "Fusion", 同调: "Synchro", 超量: "Xyz", 连接: "Link", 灵摆: "Pendulum", 仪式: "Ritual", 效果: "Effect", 通常: "Normal", 调整: "Tuner", 怪兽: "Monster", 魔法: "Spell", 陷阱: "Trap" };
const RACE: Record<string, string> = { 战士: "Warrior", 魔法师: "Spellcaster", 天使: "Fairy", 恶魔: "Fiend", 不死: "Zombie", 机械: "Machine", 水: "Aqua", 炎: "Pyro", 岩石: "Rock", 鸟兽: "Winged Beast", 植物: "Plant", 昆虫: "Insect", 雷: "Thunder", 龙: "Dragon", 兽: "Beast", 兽战士: "Beast-Warrior", 恐龙: "Dinosaur", 鱼: "Fish", 海龙: "Sea Serpent", 爬虫类: "Reptile", 念动力: "Psychic", 幻龙: "Wyrm", 电子界: "Cyberse", 幻想魔: "Illusion" };
const ATTR: Record<string, string> = { 光: "LIGHT", 暗: "DARK", 地: "EARTH", 水: "WATER", 炎: "FIRE", 风: "WIND", 神: "DIVINE" };
const SUBTYPE: Record<string, string> = { 速攻: "Quick-Play", 永续: "Continuous", 场地: "Field", 装备: "Equip", 仪式: "Ritual", 通常: "Normal", 反击: "Counter" };

const levelText = (level: [number, number] | undefined) => !level ? "" : level[0] === level[1] ? `Level ${level[0]} ` : level[1] >= 99 ? `Level ${level[0]} or higher ` : level[0] === 0 ? `Level ${level[1]} or lower ` : `Level ${level[0]}-${level[1]} `;

export function describeAllowed(allowed: Allowed): string {
  const parts = [
    levelText(allowed.level),
    allowed.attributes.map((attribute) => ATTR[attribute] ?? attribute).join("/"),
    allowed.races.map((race) => RACE[race] ?? race).join("/"),
    allowed.archetypes.map((archetype) => `"${archetype}"`).join("/"),
    allowed.kinds.map((kind) => KIND[kind] ?? kind).join("/"),
    allowed.maxAtk !== undefined ? `with ${allowed.maxAtk} or less ATK` : "",
  ].filter(Boolean);
  return `${parts.join(" ")} monsters`.replace(/\s+/g, " ").trim();
}

export function describeLock(lock: Lock, name: (card: Card) => string): string {
  const who = lock.bothPlayers ? "Neither player" : "You";
  const when = lock.timing === "whole-turn" ? "the whole turn it is used" : lock.timing === "until-next-turn" ? "until the end of your next turn" : lock.timing === "while-present" ? "while it is on the field" : "the rest of the turn";
  const what = lock.allowed === null ? "(wording not understood)" : lock.allowed === "none" ? "cannot Special Summon from the Extra Deck" : `can only Special Summon ${describeAllowed(lock.allowed)} from the Extra Deck`;
  return `${name(lock.card)}${lock.effect}: ${who} ${what}, ${when}.`;
}

function describeTarget(target: Target): string {
  const refs = target.refs.map((ref) => `"${ref}"`).join("/");
  const kinds = [target.subtype ? SUBTYPE[target.subtype] ?? target.subtype : "", ...target.kinds.map((kind) => KIND[kind] ?? kind)].filter(Boolean).join(" ");
  const what = { name: refs, archetype: `${refs} ${kinds || "card"}`, nameContains: `${kinds || "card"} with ${refs} in its name`, mentions: `${kinds || "card"} that mentions ${refs}` }[target.mode];
  return `${levelText(target.level)}${what}`.trim();
}

export function describeReference(reference: Reference, name: (card: Card) => string): string {
  const options = reference.options.map((option) => {
    const zones = option.zones.map((zone) => (zone === "main" ? "Deck" : "Extra Deck")).join("/");
    const excluded = option.excluded.length > 0 ? ` other than ${option.excluded.map((item) => `"${item}"`).join("/")}` : "";
    return `${option.targets.map(describeTarget).join(" or ")} from the ${zones}${excluded}`;
  });
  return `${name(reference.card)}${reference.effect} takes ${options.join(", or ")}`;
}

/** The deck check sentences, which the engine writes in Chinese. */
const RULES: [RegExp, (match: RegExpMatchArray) => string][] = [
  [/^主卡组 (\d+) 张，要在 40～60 张之间$/, (m) => `Main Deck has ${m[1]} cards; it must have 40 to 60`],
  [/^额外卡组 (\d+) 张，最多 15 张$/, (m) => `Extra Deck has ${m[1]} cards; 15 at most`],
  [/^副卡组 (\d+) 张，最多 15 张$/, (m) => `Side Deck has ${m[1]} cards; 15 at most`],
  [/^同名卡超过 3 张：(.+)（规则上算同一张卡）$/, (m) => `More than 3 copies of one name: ${m[1].replace(/ (\d+) 张/g, " ×$1")} (treated as the same card)`],
  [/^(.+)，同名卡最多 3 张$/, (m) => `${m[1].replace(/ (\d+) 张/g, " ×$1")}: 3 copies at most`],
  [/^(.+) 在 MD 是禁止卡，卡组里有 (\d+) 张$/, (m) => `${m[1]} is Forbidden in Master Duel; the deck has ${m[2]}`],
  [/^(.+) 在 MD 限制 (\d+) 张，卡组里有 (\d+) 张$/, (m) => `${m[1]} is limited to ${m[2]} in Master Duel; the deck has ${m[3]}`],
  [/^(.+) 还没在 MD 实装$/, (m) => `${m[1]} is not in Master Duel yet`],
  [/^(.+) MD 里没有这张卡$/, (m) => `${m[1]} is not in Master Duel`],
  [/^(.+) (\d+) 张$/, (m) => `${m[1]} ×${m[2]}`],
];

export function describeIssue(issue: string, name: (cn: string) => string): string {
  const withNames = issue.replace(/「([^」]+)」/g, (_, cn) => `"${name(cn)}"`);
  for (const [pattern, render] of RULES) {
    const match = withNames.match(pattern);
    if (match) return render(match);
  }
  return t(withNames);
}
