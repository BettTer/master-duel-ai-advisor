// Deck import: deck pages on the official card database, YDKE strings, .ydk files and plain text lists.
import { existsSync, readFileSync } from "node:fs";
import { basename } from "node:path";
import { banStatus, type Banlist } from "./banlist.ts";
import type { Card } from "./cards.ts";
import { fetchText } from "./http.ts";
import { inMasterDuel, matchCards, norm, zhKinds } from "./query.ts";

export type Section = "main" | "extra" | "side";
export const SECTIONS: Section[] = ["main", "extra", "side"];

export interface DeckEntry {
  card: Card;
  count: number;
}

export interface Deck {
  name: string;
  source: string;
  main: DeckEntry[];
  extra: DeckEntry[];
  side: DeckEntry[];
  unknown: string[]; // input that matched no card
  guessed: string[]; // names matched only partially, to be confirmed
}

type Ids = Record<Section, number[]>; // one number per copy

const emptyIds = (): Ids => ({ main: [], extra: [], side: [] });

export function parseYdke(text: string): Ids {
  const match = text.trim().match(/^ydke:\/\/([^!]*)!([^!]*)!([^!]*)!?$/);
  if (!match) throw new Error("这不是有效的 YDKE 字符串。");
  const decode = (base64: string): number[] => {
    const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
    const view = new DataView(bytes.buffer);
    return Array.from({ length: Math.floor(bytes.length / 4) }, (_, i) => view.getUint32(i * 4, true));
  };
  return { main: decode(match[1]), extra: decode(match[2]), side: decode(match[3]) };
}

export function parseYdk(text: string): Ids {
  const ids = emptyIds();
  let section: Section = "main";
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (line === "#main") section = "main";
    else if (line === "#extra") section = "extra";
    else if (line === "!side") section = "side";
    else if (/^\d+$/.test(line)) ids[section].push(Number(line));
  }
  return ids;
}

/** Card database IDs per copy from a deck page's image view, plus the deck's name. */
export function parseDeckPage(html: string): { name: string; cids: Ids } {
  const cids = emptyIds();
  for (const section of SECTIONS) {
    const block = html.match(new RegExp(`<div id="${section}" class="card_set">([\\s\\S]*?)<!--#${section}-->`));
    if (block) cids[section] = [...block[1].matchAll(/card_search\.action\?ope=2&(?:amp;)?cid=(\d+)/g)].map((match) => Number(match[1]));
  }
  const title = html.match(/og:title" content="([^"|]*?)\s*\|/);
  return { name: title ? title[1].trim() : "", cids };
}

const DECK_PAGE = /https?:\/\/www\.db\.yugioh-card\.com\/yugiohdb\/member_deck\.action\?\S+/;

async function fetchDeckPage(url: string, get = fetchText): Promise<{ name: string; cids: Ids }> {
  const params = new URL(url).searchParams;
  const cgid = params.get("cgid");
  const dno = params.get("dno");
  if (!cgid || !dno) throw new Error("卡组网址里缺少 cgid 或 dno。");
  const page = parseDeckPage(await get(
    `https://www.db.yugioh-card.com/yugiohdb/member_deck.action?ope=1&cgid=${cgid}&dno=${dno}&request_locale=ja`));
  if (SECTIONS.every((section) => page.cids[section].length === 0)) {
    throw new Error("读不到这副卡组。官方卡片数据库上的卡组要设为公开，不登录才能看到；也可以把卡表的文字复制过来。");
  }
  return page;
}

const SECTION_HEADERS: [RegExp, Section][] = [
  [/^(extra|额外|エクストラ)$/, "extra"],
  [/^(side|副|备牌|サイド)$/, "side"],
  [/^(main|主|メイン|monsters?|怪兽|怪獣|モンスター|spells?|魔法|traps?|陷阱|罠)$/, "main"],
];

/** The section a header line such as "Extra Deck (15)" or "额外卡组：15 张" starts, if it is one. */
function headerSection(line: string): Section | null {
  const key = line.toLowerCase().replace(/[\d\s:：()（）[\]【】\-#!*=]|deck|cards?|卡组|卡牌|デッキ|カード|合計|合计|张|枚/g, "");
  return SECTION_HEADERS.find(([pattern]) => pattern.test(key))?.[1] ?? null;
}

type Resolved = { card: Card; partial: boolean } | { candidates: Card[] };

/** A single card for an exact name, or for a partial name only one card contains; otherwise the candidates. */
function resolveName(cards: Card[], name: string): Resolved {
  const { exact, partial } = matchCards(cards, name);
  const single = (list: Card[]) => list.length > 0 && list.every((card) => card.id === list[0].id);
  if (single(exact)) return { card: exact[0], partial: false };
  if (exact.length === 0 && single(partial)) return { card: partial[0], partial: true };
  return { candidates: (exact.length > 0 ? exact : partial).slice(0, 3) };
}

const cardLabel = (card: Card) => `「${card.cn || card.en}」`;

const isExtraDeckMonster = (card: Card) =>
  ["融合", "同调", "超量", "连接"].some((kind) => zhKinds(card).kinds.has(kind)) || /Fusion|Synchro|XYZ|Link/.test(card.typeEn);

const COUNT_PATTERNS: [RegExp, number, number][] = [
  [/^(\d+)\s*[xX×*]?\s+(.+)$/, 1, 2],
  [/^(\d+)[xX×*](.+)$/, 1, 2],
  [/^(.+?)\s*[xX×*]\s*(\d+)$/, 2, 1],
  [/^(.+?)\s+(\d+)\s*(?:张|枚|copies)?$/, 2, 1],
];

/** A plain list: one card per line with an optional count, e.g. "3 灰流丽", "Ash Blossom x3", "灰流うらら ×3". */
export function parseTextList(text: string, cards: Card[]): { entries: [Section, Card, number][]; unknown: string[]; guessed: string[] } {
  const entries: [Section, Card, number][] = [];
  const unknown: string[] = [];
  const guessed: string[] = [];
  let section: Section = "main";
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/^[\s\-*•・]+/, "").trim();
    if (!line) continue;
    // The whole line may be a card name (some names end in a number), or a count plus a name.
    const attempts: [string, number][] = [[line, 1]];
    for (const [pattern, countGroup, nameGroup] of COUNT_PATTERNS) {
      const match = line.match(pattern);
      if (match) attempts.push([match[nameGroup].trim(), Number(match[countGroup])]);
    }
    const resolved = attempts.map(([name, count]) => ({ name, count, result: resolveName(cards, name) }));
    const exact = resolved.find(({ result }) => "card" in result && !result.partial);
    if (!exact) {
      const header = headerSection(line);
      if (header) {
        section = header;
        continue;
      }
    }
    const pick = exact ?? resolved.find(({ result }) => "card" in result);
    if (!pick || !("card" in pick.result)) {
      const candidates = [...new Set(resolved.flatMap(({ result }) => ("candidates" in result ? result.candidates : [])))];
      unknown.push(candidates.length > 0 ? `${line}（可能是：${candidates.map(cardLabel).join("、")}）` : line);
      continue;
    }
    const { card, partial } = pick.result;
    if (partial) guessed.push(`${pick.name} → ${cardLabel(card)}`);
    entries.push([section === "main" && isExtraDeckMonster(card) ? "extra" : section, card, pick.count]);
  }
  return { entries, unknown, guessed };
}

function buildDeck(name: string, source: string, entries: [Section, Card, number][], unknown: string[], guessed: string[] = []): Deck {
  const deck: Deck = { name, source, main: [], extra: [], side: [], unknown, guessed };
  for (const [section, card, count] of entries) {
    const existing = deck[section].find((entry) => entry.card.id === card.id);
    if (existing) existing.count += count;
    else deck[section].push({ card, count });
  }
  return deck;
}

function fromIds(ids: Ids, lookup: Map<number, Card>, label: string): { entries: [Section, Card, number][]; unknown: string[] } {
  const entries: [Section, Card, number][] = [];
  const unknown = new Set<string>();
  for (const section of SECTIONS) {
    for (const id of ids[section]) {
      const card = lookup.get(id);
      if (card) entries.push([section, card, 1]);
      else unknown.add(`${label} ${id}`);
    }
  }
  return { entries, unknown: [...unknown] };
}

/** Read a deck from a card database URL, a YDKE string, a .ydk file or its contents, or a plain list. */
export async function readDeck(input: string, cards: Card[], get = fetchText): Promise<Deck> {
  let text = input.trim();
  let source = "";
  if (!text.includes("\n") && existsSync(text)) {
    source = basename(text);
    text = readFileSync(text, "utf8").trim();
  }
  const byPasscode = new Map<number, Card>();
  for (const card of cards) for (const id of [card.id, ...card.altIds]) if (!byPasscode.has(id)) byPasscode.set(id, card);

  if (text.startsWith("ydke://")) {
    const { entries, unknown } = fromIds(parseYdke(text), byPasscode, "卡密");
    return buildDeck("", source || "YDKE", entries, unknown);
  }
  const url = text.match(DECK_PAGE);
  if (url && !text.includes("\n")) {
    const page = await fetchDeckPage(url[0], get);
    const byCid = new Map(cards.filter((card) => card.cid).map((card) => [card.cid!, card]));
    const { entries, unknown } = fromIds(page.cids, byCid, "KONAMI ID");
    return buildDeck(page.name, "官方卡片数据库", entries, unknown);
  }
  if (/^(#main|#extra|!side)\s*$/m.test(text)) {
    const { entries, unknown } = fromIds(parseYdk(text), byPasscode, "卡密");
    return buildDeck("", source || ".ydk", entries, unknown);
  }
  const { entries, unknown, guessed } = parseTextList(text, cards);
  return buildDeck("", source || "文字卡表", entries, unknown, guessed);
}

/** The name a card counts as for the three-copy limit (规则上当作「X」 cards count as X). */
function sameNameKey(card: Card, cards: Card[]): string {
  if (card.treatedAs) return norm(card.treatedAs);
  const zh = card.descZh.match(/这个卡名在规则上当作「(.+?)」使用/);
  const target = zh ? resolveName(cards, zh[1]) : null;
  return norm(target && "card" in target ? target.card.en : card.en || card.cn);
}

const LIMITS: Record<string, number> = { forbidden: 0, limited1: 1, limited2: 2 };

/** Problems with deck size, copies, the Master Duel banlist and cards not in Master Duel. */
export function checkDeck(deck: Deck, cards: Card[], banlist: Banlist | null): string[] {
  const issues: string[] = [];
  const size = (section: Section) => deck[section].reduce((sum, entry) => sum + entry.count, 0);
  if (size("main") < 40 || size("main") > 60) issues.push(`主卡组 ${size("main")} 张，要在 40～60 张之间`);
  if (size("extra") > 15) issues.push(`额外卡组 ${size("extra")} 张，最多 15 张`);
  if (size("side") > 15) issues.push(`副卡组 ${size("side")} 张，最多 15 张`);

  const totals = new Map<number, { card: Card; count: number }>();
  for (const section of SECTIONS) {
    for (const { card, count } of deck[section]) {
      const total = totals.get(card.id) ?? { card, count: 0 };
      total.count += count;
      totals.set(card.id, total);
    }
  }
  const groups = new Map<string, { card: Card; count: number }[]>();
  for (const total of totals.values()) {
    const key = sameNameKey(total.card, cards);
    groups.set(key, [...(groups.get(key) ?? []), total]);
  }
  for (const group of groups.values()) {
    const count = group.reduce((sum, item) => sum + item.count, 0);
    if (count <= 3) continue;
    const parts = group.map((item) => `${cardLabel(item.card)} ${item.count} 张`).join("、");
    issues.push(group.length > 1 ? `同名卡超过 3 张：${parts}（规则上算同一张卡）` : `${parts}，同名卡最多 3 张`);
  }
  for (const { card, count } of totals.values()) {
    const status = banlist ? banStatus(card, banlist.current) : "unlimited";
    if (status in LIMITS && count > LIMITS[status]) {
      issues.push(status === "forbidden"
        ? `${cardLabel(card)} 在 MD 是禁止卡，卡组里有 ${count} 张`
        : `${cardLabel(card)} 在 MD 限制 ${LIMITS[status]} 张，卡组里有 ${count} 张`);
    }
    if (!inMasterDuel(card)) {
      issues.push(card.mdRarity ? `${cardLabel(card)} 还没在 MD 实装` : `${cardLabel(card)} MD 里没有这张卡`);
    }
  }
  if (deck.guessed.length > 0) issues.push(`按部分卡名认的，请确认：${deck.guessed.join("；")}`);
  if (deck.unknown.length > 0) issues.push(`没认出来：${deck.unknown.join("；")}`);
  return issues;
}
