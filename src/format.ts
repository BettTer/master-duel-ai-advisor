// Text output shared by the command line and the MCP server.
import { banStatus, cardKeys, entryKeys, jstDate, type BanStatus, type Banlist, type Status } from "./banlist.ts";
import type { Card } from "./cards.ts";
import { SECTIONS, type Deck, type Section } from "./deck.ts";
import type { Lock, LockPair, LockReport } from "./locks.ts";
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
