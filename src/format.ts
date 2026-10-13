// Text output shared by the command line and the MCP server.
import { banStatus, cardKeys, entryKeys, jstDate, type BanStatus, type Banlist, type Status } from "./banlist.ts";
import type { Card } from "./cards.ts";
import { SECTIONS, type Deck, type Section } from "./deck.ts";
import type { Lock, LockPair, LockReport } from "./locks.ts";
import { groupMatches, type Group, type Odds, type OddsReport, type Rules } from "./odds.ts";
import { DRAW_PENALTY, LEVELS, type Board, type PlanResult } from "./plan.ts";
import type { HandResult, Profile } from "./profile.ts";
import type { Reference } from "./refs.ts";
import { findCards, inMasterDuel, zhKinds } from "./query.ts";

const BAN_LABEL: Record<BanStatus, string> = {
  forbidden: "禁止 Forbidden",
  limited1: "限制1 Limited 1",
  limited2: "限制2 Limited 2",
  unlimited: "无限制 Unlimited",
  unknown: "未知 Unknown",
};
const STATUSES: Status[] = ["forbidden", "limited1", "limited2"];
const EXTRA_KINDS = ["融合", "同调", "超量", "连接"];

export function namesLine(card: Card): string {
  const parts: string[] = [];
  if (card.cn) parts.push(`「${card.cn}」`);
  if (card.md && card.md !== card.cn) parts.push(`MD：${card.md}`);
  if (card.en) parts.push(card.en);
  return parts.join(" ");
}

function typesLine(card: Card): string {
  if (card.typesZh) return card.typesZh.replaceAll("\n", " ");
  const stats = card.atk !== null ? ` ATK ${card.atk} / DEF ${card.def}` : "";
  return `${card.typeEn} ${card.raceEn} ${card.attrEn}`.trim() + stats;
}

export function banText(card: Card, banlist: Banlist | null): string {
  if (!banlist) return BAN_LABEL.unknown;
  const status = banStatus(card, banlist.current);
  let text = BAN_LABEL[status];
  if (banlist.upcoming) {
    const coming = banStatus(card, banlist.upcoming);
    if (coming !== status) text += ` → ${banlist.upcoming.date} 起 ${BAN_LABEL[coming]}`;
  }
  return text;
}

export function banlistNote(banlist: Banlist | null): string {
  if (!banlist) return "MD 禁限表没能下载，禁限状态未知";
  let note = `MD 禁限表：${banlist.current.date} 生效`;
  if (banlist.upcoming) note += `；已公布 ${banlist.upcoming.date} 生效的新表`;
  return `${note}；来源 ${banlist.source}`;
}

function materials(card: Card): string {
  const isExtra = EXTRA_KINDS.some((kind) => zhKinds(card).kinds.has(kind)) || /Fusion|Synchro|XYZ|Link/.test(card.typeEn);
  const text = card.descZh || card.descEn;
  return isExtra && text ? text.split("\n")[0].trim() : "";
}

export function formatCard(card: Card, banlist: Banlist | null): string {
  let rarity = card.mdRarity || "未实装或未收录 not in MD data";
  if (card.mdRarity && !inMasterDuel(card)) rarity += `（将于 ${jstDate(card.mdRelease)} 实装）`;
  const lines = [
    `${namesLine(card)} | ${card.jp || "-"} | 卡密 ${card.id}`,
    card.typesZh || typesLine(card),
    `MD：${rarity}｜禁限：${banText(card, banlist)}（${banlistNote(banlist)}）`,
  ];
  const sameName = card.descZh.match(/这个卡名在规则上当作「(.+?)」使用/);
  const treatedAs = card.treatedAs || (sameName ? `「${sameName[1]}」` : "");
  if (treatedAs) lines.push(`规则上当作：${treatedAs}（同名卡张数合在一起算）`);
  lines.push(`百鸽页面（含裁定 Q&A）：https://ygocdb.com/card/${card.id}`);
  if (card.pdescZh) lines.push("", "灵摆效果：", card.pdescZh);
  if (card.descZh) lines.push("", "中文卡文：", card.descZh);
  if (card.descEn) lines.push("", "English text:", card.descEn);
  return lines.join("\n");
}

/** Full details for each query; `missing` is true if any query matched nothing. */
export function formatLookup(cards: Card[], banlist: Banlist | null, queries: string[]): { text: string; missing: boolean } {
  let missing = false;
  const blocks = queries.map((query) => {
    const found = findCards(cards, query);
    if (found.length === 0) {
      missing = true;
      return `没找到「${query}」。换一种语言的卡名、只输入一部分，或者用卡密再试。`;
    }
    if (found.length === 1) return formatCard(found[0], banlist);
    const lines = [`「${query}」有 ${found.length} 张卡匹配，请用完整卡名或卡密再查一次：`];
    for (const card of found.slice(0, 20)) lines.push(`  ${namesLine(card)} | 卡密 ${card.id} | ${typesLine(card)}`);
    if (found.length > 20) lines.push(`  ……还有 ${found.length - 20} 张`);
    return lines.join("\n");
  });
  return { text: blocks.join(`\n\n${"-".repeat(40)}\n\n`), missing };
}

export function formatSearch(results: Card[], banlist: Banlist | null, options: { allFormats?: boolean; full?: boolean; limit?: number }): string {
  const limit = options.limit ?? 60;
  const lines = [`共 ${results.length} 张符合条件${options.allFormats ? "（含 MD 未实装的卡）" : "（仅 MD 已实装）"}`];
  for (const card of results.slice(0, limit)) {
    lines.push(`${namesLine(card)} | ${card.id} | ${typesLine(card)} | ${card.mdRarity || "-"} | ${banText(card, banlist)}`);
    if (options.full) lines.push(`    ${(card.descZh || card.descEn).replaceAll("\n", "\n    ")}`);
    else if (materials(card)) lines.push(`    素材：${materials(card)}`);
  }
  if (results.length > limit) lines.push(`……只显示前 ${limit} 张，用 --limit 调整`);
  lines.push(`（${banlistNote(banlist)}）`);
  return lines.join("\n");
}

export function formatBanlist(cards: Card[], banlist: Banlist, options: { status?: Status; upcoming?: boolean }): string {
  const regulation = options.upcoming ? banlist.upcoming : banlist.current;
  if (!regulation) return "目前没有已公布但还没生效的新禁限表。";
  const byKey = new Map<string, Card>();
  for (const card of cards) {
    for (const key of cardKeys(card)) if (!byKey.has(key)) byKey.set(key, card);
  }
  const lines = [`Master Duel 禁限表（${regulation.date} 生效；来源 ${banlist.source}）`];
  for (const status of STATUSES) {
    if (options.status && options.status !== status) continue;
    const rows = regulation.entries
      .filter((entry) => entry.status === status)
      .map((entry) => {
        const card = entryKeys(entry).map((key) => byKey.get(key)).find(Boolean);
        return card ? `  ${namesLine(card)} | ${card.id}` : `  ${entry.name ?? `KONAMI ID ${entry.cid}`}`;
      })
      .sort();
    lines.push("", `${BAN_LABEL[status]}：${rows.length} 张`, ...rows);
  }
  return lines.join("\n");
}

const SECTION_LABEL: Record<Section, string> = { main: "主卡组", extra: "额外卡组", side: "副卡组" };

function cardList(cards: Card[], max = 6): string {
  const names = cards.slice(0, max).map((card) => `「${card.cn || card.en}」`).join("、");
  return cards.length > max ? `${names} 等 ${cards.length} 张` : names;
}

const lockName = (lock: Lock) => `「${lock.card.cn || lock.card.en}」${lock.effect}`;

function formatLocks(locks: LockReport[], pairs: LockPair[]): string[] {
  if (locks.length === 0) return [];
  const lines = ["", "额外卡组的锁："];
  for (const { lock, blocked } of locks) {
    let effect = "额外里的怪兽都不受影响";
    if (lock.allowed === null) effect = "这条限制没法自动判断，请看原文";
    else if (lock.allowed === "none") effect = "这回合完全不能从额外出怪兽";
    else if (blocked.length > 0) effect = `额外里出不来：${cardList(blocked)}`;
    const notes = [
      lock.timing === "whole-turn" ? "整回合有效，这回合之前已经出过不符合的怪兽就发动不了" : "",
      lock.timing === "while-present" ? "这张卡在场上期间一直有效" : "",
      lock.bothPlayers ? "双方都受限" : "",
    ].filter(Boolean);
    lines.push(`  - ${lockName(lock)}：${lock.text} → ${effect}${notes.length > 0 ? `（${notes.join("；")}）` : ""}`);
  }
  if (pairs.length > 0) {
    lines.push("", "同一回合一起用：");
    const sorted = [...pairs].sort((a, b) => a.remaining.length - b.remaining.length);
    for (const { first, second, remaining } of sorted) {
      lines.push(`  - ${lockName(first)} + ${lockName(second)}：${remaining.length === 0 ? "额外卡组一只都出不来" : `额外只剩${cardList(remaining)}`}`);
    }
  }
  return lines;
}

function formatMissing(missing: Reference[]): string[] {
  if (missing.length === 0) return [];
  const lines = ["", "可能没有目标（按卡名和字段判断，请确认）："];
  for (const { card, effect, text, options } of missing) {
    const zones = new Set(options.flatMap((option) => option.zones));
    const where = zones.size === 2 ? "卡组和额外卡组里都" : zones.has("extra") ? "额外卡组里" : "卡组里";
    lines.push(`  - 「${card.cn || card.en}」${effect}：${text} → ${where}没有符合的卡（这张卡自己不算）`);
  }
  return lines;
}

export function formatDeck(
  deck: Deck,
  issues: string[],
  banlist: Banlist | null,
  locks: { locks: LockReport[]; pairs: LockPair[] },
  missing: Reference[],
): string {
  const size = (section: Section) => deck[section].reduce((sum, entry) => sum + entry.count, 0);
  const byRarity = new Map<string, number>();
  for (const section of SECTIONS) {
    for (const { card, count } of deck[section]) {
      const rarity = card.mdRarity || "MD 里没有";
      byRarity.set(rarity, (byRarity.get(rarity) ?? 0) + count);
    }
  }
  const cost = ["UR", "SR", "R", "N", "MD 里没有"].filter((rarity) => byRarity.has(rarity))
    .map((rarity) => `${rarity} ${byRarity.get(rarity)} 张`).join("，");
  const lines = [
    `卡组：${deck.name || "（没有名字）"}（来源：${deck.source}）`,
    SECTIONS.map((section) => `${SECTION_LABEL[section]} ${size(section)} 张`).join("｜"),
    `稀有度（按张数）：${cost || "无"}`,
  ];
  for (const section of SECTIONS) {
    if (deck[section].length === 0) continue;
    lines.push("", `${SECTION_LABEL[section]}：`);
    for (const { card, count } of deck[section]) {
      lines.push(`  ${count} ${namesLine(card)} | ${card.mdRarity || "-"} | ${banText(card, banlist)}`);
    }
  }
  lines.push(...formatLocks(locks.locks, locks.pairs), ...formatMissing(missing));
  lines.push("", "检查：", ...(issues.length > 0 ? issues.map((issue) => `  - ${issue}`) : ["  没有发现张数、禁限或实装方面的问题。"]));
  lines.push(`（${banlistNote(banlist)}）`);
  return lines.join("\n");
}

const percent = (value: number) => `${(value * 100).toFixed(1)}%`;

function oddsLines(report: OddsReport, second: string[], base?: OddsReport): string[] {
  const change = (value: number, before?: number) => {
    if (before === undefined) return "";
    const points = (value - before) * 100;
    return `（${points >= 0 ? "+" : "−"}${Math.abs(points).toFixed(1)}）`;
  };
  const line = (label: string, odds: Odds, before?: Odds, note = "") =>
    `  ${label}：${percent(odds.playable)}${change(odds.playable, before?.playable)}，`
    + `有两个以上动点 ${percent(odds.twoOrMore)}${change(odds.twoOrMore, before?.twoOrMore)}${note}`;
  return [
    line("先手 5 张", report.first, base?.first),
    line("后手 6 张", report.second, base?.second, report.secondAlone ? `（假设：${second.join("、")}）` : ""),
    ...(report.secondAlone ? [line("后手 6 张，不靠对方", report.secondAlone, base?.secondAlone ?? undefined)] : []),
  ];
}

export function formatOdds(
  deck: Deck,
  rules: Rules,
  report: OddsReport,
  changed: { label: string; report: OddsReport } | null,
  inArchetype: (card: Card, archetype: string) => boolean,
): string {
  const lines = [
    `卡组：${deck.name || "（没有名字）"}（来源：${deck.source}）｜主卡组 ${report.size} 张`,
    "",
    "能动的概率（照下面的规则推，所有可能的起手逐一精确计算）：",
    ...oddsLines(report, rules.second),
  ];
  if (changed) lines.push("", `改成 ${changed.label} 以后：`, ...oddsLines(changed.report, rules.second, report));
  lines.push("", "规则（工具读到的；能动＝推得出\"能动\"，两个以上动点＝能用出两张不同的写了\"能动\"的卡）：");
  const count = (card: Card) => deck.main.find((entry) => entry.card.id === card.id)?.count;
  const matched = (label: string, group: Group) => {
    const entries = groupMatches(group, deck, inArchetype);
    const names = entries.slice(0, 8).map(({ card, count }) => `「${card.cn || card.en}」×${count}`).join("、");
    const total = entries.reduce((sum, entry) => sum + entry.count, 0);
    return `      ${label} ${group.text} → ${entries.length === 0 ? "主卡组里没有符合的卡" : `${names}${entries.length > 8 ? " 等" : ""}，共 ${total} 张`}`;
  };
  for (const move of rules.moves) {
    lines.push(`  - 「${move.card.cn || move.card.en}」${move.fromExtra ? "（额外）" : `×${count(move.card)}`}：${move.text}`);
    lines.push(...move.hold.map((group) => matched("手里", group)), ...move.discard.map((group) => matched("用掉", group)),
      ...move.search.map((group) => matched("拿", group)));
  }
  if (rules.second.length > 0) lines.push(`  - 后手：${rules.second.join("、")}`);
  const problems = [...rules.problems];
  if (deck.unknown.length > 0) problems.push(`卡组里有 ${deck.unknown.length} 行没认出来，没有算进去：${deck.unknown.slice(0, 3).join("；")}`);
  if (problems.length > 0) lines.push("", "请检查：", ...problems.map((problem) => `  - ${problem}`));
  return lines.join("\n");
}

const fieldText = (board: Board) => {
  const monsters = board.field.map((card) => `「${card.cn || card.en}」`).join("＋") || "（没有怪兽）";
  return board.sets.length > 0 ? `${monsters}，后场 ${board.sets.map((card) => `「${card.cn || card.en}」`).join("")}` : monsters;
};

/** A route as one line per action, with the choices it needed after an arrow. */
function routeLines(steps: string[]): string[] {
  const lines: string[] = [];
  for (const step of steps) {
    if (lines.length === 0 || /^(通召|特召|发动|连锁发动)/.test(step)) lines.push(step);
    else lines[lines.length - 1] += ` → ${step}`;
  }
  return lines.map((line, index) => `    ${index + 1}. ${line}`);
}

export function formatPlan(hand: Card[], result: PlanResult, problems: string[], missing: Card[], missingScripts: string[]): string {
  const lines = [`起手：${hand.map((card) => `「${card.cn || card.en}」`).join("")}（先手，对手不做任何事；按结束阶段处理完、对手回合开始时算）`];
  const [best, ...others] = result.boards;
  if (!best) lines.push("", "没有找到任何能做的动作。");
  else {
    lines.push("", `最大场：${fieldText(best)}`, `  价值 ${best.value}`);
    for (const place of ["场上", "墓地", "手里", "带出"] as const) {
      const items = best.counted.filter((item) => item.place === place);
      if (items.length === 0) continue;
      const text = items.map(({ card, level, uses, value, ownTurn, via }) =>
        `${via ? `「${via.cn || via.en}」→` : ""}「${card.cn || card.en}」${level >= 0 ? LEVELS[level].name : ""}${uses > 1 ? `×${uses}` : ""}${ownTurn ? "（只在自己回合用）" : ""} ${value}`).join("、");
      lines.push(`  算进去的（${place === "带出" ? "对手回合带出" : place}）：${text}`);
    }
    lines.push("  路线：", ...routeLines(best.steps));
    const alternatives = others.slice(0, 5);
    if (alternatives.length > 0) {
      lines.push("", "其他的场（每种场只列最好的一条路线）：", ...alternatives.map((board) => `  [${board.value}] ${fieldText(board)}`));
    }
  }
  if (result.interruptions.length > 0) {
    lines.push("", "被打断的情况（对手拿着这张卡，在最大场那条路线上挑对我们最狠的时机用）：");
    for (const { card, opportunities, after, board, complete } of result.interruptions) {
      const name = `「${card.cn || card.en}」`;
      if (opportunities === 0) { lines.push(`  ${name}：这条路线上没有发动的时机`); continue; }
      if (!board) { lines.push(`  ${name}：在「${after}」后发动，之后做不出任何场`); continue; }
      const draws = board.draws > 0 ? `，对手抽了 ${board.draws} 张（每张扣 ${DRAW_PENALTY}）` : "";
      lines.push(`  ${name}（${opportunities} 个时机）：在「${after}」后发动${draws} → 妥协场 ${fieldText(board)}，价值 ${board.value}${complete ? "" : "（没搜完）"}`);
      lines.push(...routeLines(board.steps).map((line) => `  ${line}`));
    }
  }
  lines.push("", "第一步的每种选择：");
  for (const branch of result.branches) {
    const how = branch.complete ? `全部搜完（${branch.nodes} 个节点）` : `搜了 ${branch.nodes} 个节点，到时间或节点上限没搜完`;
    lines.push(`  ${branch.first || "（不发动，继续）"}：${how}，最好 ${branch.best ? `[${branch.best.value}] ${fieldText(branch.best)}` : "无"}`);
  }
  const weights = LEVELS.map((level) => `${level.name} ${level.weight}`).join("、");
  lines.push(`共 ${result.states} 个不同局面，${result.seconds.toFixed(1)} 秒。价值＝对手回合能用的打断按级别加权（${weights}），乘次数；只在自己回合用的算 1。`);
  const notes = [...problems];
  if (missing.length > 0) notes.push(`规则引擎还没有这些卡的数据或脚本，结果可能不对：${missing.map((card) => `「${card.cn || card.en}」`).join("、")}`);
  if (missingScripts.length > 0) notes.push(`引擎要了但没找到的脚本：${missingScripts.join("、")}`);
  if (notes.length > 0) lines.push("", "请检查：", ...notes.map((note) => `  - ${note}`));
  return lines.join("\n");
}

const mean = (hands: HandResult[], pick: (hand: HandResult) => number) => {
  const weight = hands.reduce((sum, hand) => sum + hand.weight, 0);
  return weight === 0 ? 0 : hands.reduce((sum, hand) => sum + pick(hand) * hand.weight, 0) / weight;
};
const handValue = (hand: HandResult) => hand.board?.value ?? 0;
/** The best level the hand puts on the board or brings out on the opponent's turn; -1 when only hand traps are left. */
const bestLevel = (hand: HandResult) => Math.min(...(hand.board?.counted.filter((item) => item.place !== "手里").map((item) => item.level) ?? []), 99);
const handNames = (hand: HandResult) => hand.cards.map((card) => card.cn || card.en).join("、");

function profileLines(profile: Profile, base?: Profile): string[] {
  const total = profile.hands.reduce((sum, hand) => sum + hand.weight, 0);
  const share = (test: (hand: HandResult) => boolean) => mean(profile.hands, (hand) => (test(hand) ? 1 : 0));
  const percent = (value: number) => `${(value * 100).toFixed(0)}%`;
  const diff = (value: number, before?: number, digits = 1) => before === undefined ? "" : `（${value - before >= 0 ? "+" : "−"}${Math.abs(value - before).toFixed(digits)}）`;
  const average = mean(profile.hands, handValue);
  const lines = [`平均价值 ${average.toFixed(1)}${diff(average, base && mean(base.hands, handValue))}（${profile.samples} 手抽样，${profile.distinct} 种不同起手）`];
  const buckets: [string, (hand: HandResult) => boolean][] = [
    ["做出第一级以上的康", (hand) => bestLevel(hand) <= 1],
    ["最好只到第二级", (hand) => bestLevel(hand) >= 2 && bestLevel(hand) <= 5],
    ["只有处理或保护", (hand) => bestLevel(hand) >= 6 && bestLevel(hand) < 99],
    ["只剩手坑，场上什么都没有", (hand) => bestLevel(hand) === 99],
  ];
  for (const [label, test] of buckets) {
    const value = share(test);
    const before = base ? mean(base.hands, (hand) => (test(hand) ? 1 : 0)) : undefined;
    lines.push(`  ${label}：${percent(value)}${before === undefined ? "" : `（改前 ${percent(before)}）`}`);
  }
  const boards = new Map<string, number>();
  for (const hand of profile.hands) if (hand.board) boards.set(fieldText(hand.board), (boards.get(fieldText(hand.board)) ?? 0) + hand.weight);
  const top = [...boards].sort((a, b) => b[1] - a[1]).slice(0, 5);
  if (top.length > 0) lines.push("  最常见的终场：", ...top.map(([board, count]) => `    ${percent(count / total)} ${board}`));
  const worst = [...profile.hands].sort((a, b) => handValue(a) - handValue(b)).slice(0, 5);
  lines.push("  最差的起手：", ...worst.map((hand) => `    [${handValue(hand)}] ${handNames(hand)}${hand.board ? ` → ${fieldText(hand.board)}` : ""}`));
  return lines;
}

/** What each card adds: the average value of hands holding it against hands without it. */
function contributionLines(profile: Profile): string[] {
  const byCard = new Map<number, { card: Card; with: HandResult[]; without: HandResult[] }>();
  const cards = new Map<number, Card>();
  for (const hand of profile.hands) for (const card of hand.cards) cards.set(card.id, card);
  for (const [id, card] of cards) {
    byCard.set(id, { card, with: profile.hands.filter((hand) => hand.cards.some((other) => other.id === id)), without: profile.hands.filter((hand) => !hand.cards.some((other) => other.id === id)) });
  }
  const rows = [...byCard.values()].map(({ card, with: holding, without }) => ({
    card, count: holding.reduce((sum, hand) => sum + hand.weight, 0),
    delta: mean(holding, handValue) - mean(without, handValue),
    brick: mean(holding, (hand) => (bestLevel(hand) === 99 ? 1 : 0)),
  })).filter((row) => row.count >= 3).sort((a, b) => b.delta - a.delta);
  return ["  每张卡的贡献（起手里有它时的平均价值，减去没有它时的；至少 3 手样本）：",
    ...rows.map((row) => `    ${row.delta >= 0 ? "+" : "−"}${Math.abs(row.delta).toFixed(1)}  「${row.card.cn || row.card.en}」（${row.count} 手，其中 ${(row.brick * 100).toFixed(0)}% 只剩手坑）`)];
}

export function formatProfile(profile: Profile, changed: Profile | null, problems: string[], missing: Card[], missingScripts: string[]): string {
  const lines = [`卡组全景：${profile.deckLabel}（先手，每手最多搜 ${profile.hands[0]?.seconds.toFixed(0) ?? "?"} 秒，对手不打断）`, "", ...profileLines(profile), "", ...contributionLines(profile)];
  if (changed) lines.push("", `改成 ${changed.deckLabel} 以后：`, ...profileLines(changed, profile));
  const weights = LEVELS.map((level) => `${level.name} ${level.weight}`).join("、");
  lines.push("", `共 ${(profile.seconds + (changed?.seconds ?? 0)).toFixed(0)} 秒。价值＝对手回合能用的打断按级别加权（${weights}），乘次数；只在自己回合用的算 1。抽样的平均值大约有 ±1 的误差。`);
  const notes = [...problems];
  if (missing.length > 0) notes.push(`规则引擎还没有这些卡的数据或脚本，结果可能不对：${missing.map((card) => `「${card.cn || card.en}」`).join("、")}`);
  if (missingScripts.length > 0) notes.push(`引擎要了但没找到的脚本：${missingScripts.join("、")}`);
  if (notes.length > 0) lines.push("", "请检查：", ...notes.map((note) => `  - ${note}`));
  return lines.join("\n");
}
