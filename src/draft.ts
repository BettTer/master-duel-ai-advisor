// A first draft of a deck's endpoint list from the card text, for the user to correct. It only recognises the
// plain patterns (negates, removal, well-known hand traps); the assistant's analysis in SKILL.md is the real thing.
import type { Deck } from "./deck.ts";
import type { Card } from "./merge.ts";

const HAND_TRAPS: Record<string, string> = {
  超融合: "第0级", 增殖的G: "1.5级；在手里", 灰流丽: "第二级；在手里", 无限泡影: "第二级", 屋敷童: "第二级；在手里", 墓穴的指名者: "第二级",
  抹杀的指名者: "第二级", 原始生命态尼比鲁: "第三级；在手里", 小丑与锁鸟: "软康；在手里", 幽鬼兔: "第三级；在手里", 深渊的宣告者: "第二级；在手里",
};

/** The part of the text from ① on, split into numbered effects. */
const effects = (card: Card) => card.descZh.split(/(?=[①②③④⑤⑥⑦⑧⑨])/).filter((part) => /^[①②③④⑤⑥⑦⑧⑨]/.test(part));
const opponentTurn = (effect: string) => /对方(回合|把|的)|自己·对方|双方的?(回合|主要阶段)|发动时|的场合才能发动/.test(effect);
const ownTurnOnly = (effect: string) => /^[①②③④⑤⑥⑦⑧⑨]：自己主要阶段|^[①②③④⑤⑥⑦⑧⑨]：1回合1次，以场上1张卡为对象才能发动。那张卡破坏/.test(effect);

/** One line per card that looks like an endpoint, in the planner's format. */
export function draftTiers(deck: Deck): string {
  const lines: string[] = [];
  const seen = new Set<number>();
  for (const { card } of [...deck.main, ...deck.extra]) {
    if (seen.has(card.id)) continue;
    seen.add(card.id);
    const name = card.cn || card.en;
    const known = Object.entries(HAND_TRAPS).find(([trap]) => name.replace(/\s/g, "").includes(trap));
    if (known) {
      lines.push(`${name}：${known[1]}`);
      continue;
    }
    const parts = effects(card);
    let level = "";
    let note = "";
    for (const effect of parts) {
      if (/那个发动无效|那个效果无效|发动无效并破坏/.test(effect)) {
        // Unconditional: "魔法·陷阱·怪兽的效果发动时" with nothing narrowing it; narrowed by 包含/要让/只以…为对象/Level: 2.5级.
        const trigger = (effect.match(/[^。，]*发动时/)?.[0] ?? "").replace(/^[①②③④⑤⑥⑦⑧⑨]：/, "");
        const any = /^(对方把|对方的?)?(魔法·陷阱·怪兽的效果|怪兽的效果·魔法·陷阱卡|对方的效果|卡的效果)发动时$/.test(trigger);
        const narrow = /包含|要让|只以|星以上|以.+为对象/.test(trigger);
        const next = any ? "第一级" : narrow ? "2.5级" : "第二级";
        const rank = (value: string) => ["第一级", "第二级", "2.5级"].indexOf(value);
        if (level === "" || rank(next) < rank(level)) level = next;
        if (!opponentTurn(effect) && ownTurnOnly(effect)) note = "；自己回合";
      } else if (level === "" && /对方场上|对方的?(场上|手卡|墓地)/.test(effect) && /除外|破坏|送去墓地|回到手卡|回到卡组|里侧/.test(effect) && opponentTurn(effect)) {
        level = "第三级";
        if (ownTurnOnly(effect)) note = "；自己回合";
      }
    }
    if (level === "") continue;
    lines.push(`${name}：${level}${note}`);
  }
  return lines.join("\n");
}
