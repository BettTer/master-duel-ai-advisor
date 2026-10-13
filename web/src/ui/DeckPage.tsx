import { checkDeck, type Deck } from "../../../src/deck.ts";
import { analyzeLocks, type LockPair, type LockReport } from "../../../src/locks.ts";
import type { Card } from "../../../src/merge.ts";
import { archetypeLookup, zhKinds } from "../../../src/query.ts";
import { missingTargets, type Reference } from "../../../src/refs.ts";
import type { CardData } from "../data/cards.ts";
import { cardName } from "../state.ts";
import { getLang, t, translateReport, sep } from "../i18n.ts";
import { describeIssue, describeLock, describeReference } from "../describe.ts";
import { CardChip } from "./CardChip.tsx";

export interface DeckAnalysis {
  issues: string[];
  locks: { locks: LockReport[]; pairs: LockPair[] };
  missing: Reference[];
}

export function analyzeDeck(deck: Deck, data: CardData): DeckAnalysis {
  const inArchetype = archetypeLookup(data.cards);
  const distinct = (sections: ("main" | "extra")[]) => [...new Map(sections.flatMap((section) => deck[section]).map(({ card }) => [card.id, card])).values()];
  return {
    issues: checkDeck(deck, data.cards, data.banlist),
    locks: analyzeLocks(distinct(["main", "extra"]), distinct(["extra"]), inArchetype),
    missing: missingTargets(deck, inArchetype),
  };
}

const KIND_ORDER = ["怪兽", "魔法", "陷阱"];
export function groupMain(entries: Deck["main"]) {
  const groups = new Map<string, Deck["main"]>(KIND_ORDER.map((kind) => [kind, []]));
  for (const entry of entries) {
    const kinds = zhKinds(entry.card).kinds;
    const kind = KIND_ORDER.find((candidate) => kinds.has(candidate)) ?? "怪兽";
    groups.get(kind)!.push(entry);
  }
  return [...groups].filter(([, list]) => list.length > 0);
}

export function DeckWall({ deck, data, onPick, images }: { deck: Deck; data: CardData; onPick?: (card: Card) => void; images: boolean }) {
  const size = (entries: Deck["main"]) => entries.reduce((sum, entry) => sum + entry.count, 0);
  return (
    <div className="wall">
      {groupMain(deck.main).map(([kind, entries]) => (
        <div key={kind} className="wall-group">
          <h4>{t(kind)} <span className="muted">{size(entries)}</span></h4>
          <div className="wall-cards">{entries.map(({ card, count }) => <CardChip key={card.id} card={card} count={count} banlist={data.banlist} onClick={onPick && (() => onPick(card))} images={images} />)}</div>
        </div>
      ))}
      {deck.extra.length > 0 && (
        <div className="wall-group">
          <h4>{t("额外卡组")} <span className="muted">{size(deck.extra)}</span></h4>
          <div className="wall-cards">{deck.extra.map(({ card, count }) => <CardChip key={card.id} card={card} count={count} banlist={data.banlist} images={images} />)}</div>
        </div>
      )}
    </div>
  );
}

export function DeckView({ data, deck, analysis, images }: { data: CardData; deck: Deck; analysis: DeckAnalysis; images: boolean }) {
  const lockName = (lock: LockReport["lock"]) => `「${cardName(lock.card)}」${lock.effect}`;
  const byCn = new Map(data.cards.map((card) => [card.cn, card]));
  const nameOf = (cn: string) => { const card = byCn.get(cn); return card ? cardName(card) : cn; };
  const report = (text: string) => translateReport(text, nameOf);
  const en = getLang() === "en";
  const issue = (text: string) => (en ? describeIssue(text, nameOf) : text);
  return (
    <div className="page">
      <section className="panel">
        <h2>{t("卡表")} <span className="muted">{t("主")} {deck.main.reduce((sum, entry) => sum + entry.count, 0)} · {t("额外")} {deck.extra.reduce((sum, entry) => sum + entry.count, 0)}</span></h2>
        <DeckWall deck={deck} data={data} images={images} />
      </section>
      <section className="panel">
        <h2>{t("检查")}</h2>
        {analysis.issues.length === 0 ? <p className="ok">{t("没有发现张数、禁限或实装方面的问题。")}</p> : <ul className="issues">{analysis.issues.map((text, index) => <li key={index}>{issue(text)}</li>)}</ul>}
        {deck.guessed.length > 0 && <p className="muted">{t("按部分卡名认的，请确认：")}{deck.guessed.join("；")}</p>}
        {deck.unknown.length > 0 && <p className="error">{t("没认出来：")}{deck.unknown.join("；")}</p>}
        {analysis.locks.locks.length > 0 && (
          <>
            <h3>{t("额外卡组的锁")}</h3>
            <ul>{analysis.locks.locks.map((item, index) => (
              <li key={index}>{en ? describeLock(item.lock, cardName) : <><b>{lockName(item.lock)}</b>：{item.lock.text}</>}{item.blocked.length > 0 && <span className="muted">{t(" → 额外里出不来：")}{item.blocked.map(cardName).join(sep())}</span>}</li>
            ))}</ul>
            {analysis.locks.pairs.length > 0 && (
              <>
                <h3>{t("同一回合一起用")}</h3>
                <ul>{analysis.locks.pairs.map((pair, index) => (
                  <li key={index}>{report(lockName(pair.first))} ＋ {report(lockName(pair.second))}: {pair.remaining.length === 0 ? <b className="error">{t("额外卡组一只都出不来")}</b> : <>{t("额外只剩 ")}{pair.remaining.map(cardName).join(sep())}</>}</li>
                ))}</ul>
              </>
            )}
          </>
        )}
        {analysis.missing.length > 0 && (
          <>
            <h3>{t("可能没有目标")} <span className="muted">{t("按卡名和字段判断，请确认")}</span></h3>
            <ul>{analysis.missing.map((reference, index) => <li key={index}>{en ? describeReference(reference, cardName) : <><b>「{cardName(reference.card)}」{reference.effect}</b>：{reference.text}</>}</li>)}</ul>
          </>
        )}
      </section>
    </div>
  );
}
