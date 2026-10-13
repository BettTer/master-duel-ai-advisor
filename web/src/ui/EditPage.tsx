// The deck editor: the deck on the left, a card search on the right. Drag a card from the search into the deck
// to add a copy; use the + / − on a card, or right-click it, to change the count.
import { useMemo, useState, type DragEvent } from "react";
import { banStatus } from "../../../src/banstatus.ts";
import type { Deck, DeckEntry } from "../../../src/deck.ts";
import type { Card } from "../../../src/merge.ts";
import { searchCards, zhKinds } from "../../../src/query.ts";
import type { CardData } from "../data/cards.ts";
import { t } from "../i18n.ts";
import { CardChip } from "./CardChip.tsx";
import { groupMain } from "./DeckPage.tsx";

const LIMITS: Record<string, number> = { forbidden: 0, limited1: 1, limited2: 2 };
const isExtra = (card: Card) => ["融合", "同调", "超量", "连接"].some((kind) => zhKinds(card).kinds.has(kind));

export function EditPage({ data, deck, onChange, images }: { data: CardData; deck: Deck; onChange: (deck: Deck) => void; images: boolean }) {
  const [query, setQuery] = useState("");
  const [text, setText] = useState("");
  const [message, setMessage] = useState("");
  const results = useMemo(() => (query || text ? searchCards(data.cards, { name: query || undefined, text: text ? [text] : undefined }).slice(0, 60) : []), [data, query, text]);
  const size = (entries: DeckEntry[]) => entries.reduce((sum, entry) => sum + entry.count, 0);

  const change = (card: Card, delta: number) => {
    const section = isExtra(card) ? "extra" : "main";
    const entries = deck[section].map((entry) => ({ ...entry }));
    const entry = entries.find((item) => item.card.id === card.id);
    const status = banStatus(card, data.banlist.current);
    const limit = Math.min(3, LIMITS[status] ?? 3);
    const next = (entry?.count ?? 0) + delta;
    if (next > limit) {
      setMessage(limit === 0 ? `${t("禁止卡")}：${card.cn || card.en}` : `${card.cn || card.en}${t(" 最多 ")}${limit}${t(" 张")}`);
      return;
    }
    if (delta > 0 && section === "main" && size(deck.main) >= 60) { setMessage(t("主卡组已经 60 张")); return; }
    if (delta > 0 && section === "extra" && size(deck.extra) >= 15) { setMessage(t("额外卡组已经 15 张")); return; }
    setMessage("");
    if (entry) entry.count = next;
    else entries.push({ card, count: next });
    onChange({ ...deck, [section]: entries.filter((item) => item.count > 0) });
  };
  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    const id = Number(event.dataTransfer.getData("text/card"));
    const card = data.cards.find((candidate) => candidate.id === id);
    if (card) change(card, 1);
  };
  const wall = (entries: DeckEntry[]) => entries.map(({ card, count }) => (
    <CardChip key={card.id} card={card} count={count} banlist={data.banlist} images={images} onAdd={() => change(card, 1)} onRemove={() => change(card, -1)} />
  ));
  return (
    <div className="page edit">
      <section className="panel edit-deck" onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "copy"; }} onDrop={onDrop}>
        <h2>{t("编辑")} <span className="muted">{t("主")} {size(deck.main)} · {t("额外")} {size(deck.extra)}</span></h2>
        <p className="muted">{t("从右边把卡拖进来加一张；卡上的 ＋ － 或右键改张数。")} {message && <span className="error">{message}</span>}</p>
        {deck.main.length === 0 && deck.extra.length === 0 && <p className="muted">{t("空卡组。在右边找卡，拖过来或者点一下。")}</p>}
        {groupMain(deck.main).map(([kind, entries]) => (
          <div key={kind} className="wall-group">
            <h4>{t(kind)} <span className="muted">{size(entries)}</span></h4>
            <div className="wall-cards">{wall(entries)}</div>
          </div>
        ))}
        <div className="wall-group">
          <h4>{t("额外卡组")} <span className="muted">{size(deck.extra)}</span></h4>
          <div className="wall-cards">{wall(deck.extra)}</div>
        </div>
      </section>
      <section className="panel edit-search">
        <h2>{t("找卡")}</h2>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("卡名，中、英、日都行")} />
        <input value={text} onChange={(event) => setText(event.target.value)} placeholder={t("卡文里的词")} />
        <p className="muted">{results.length > 0 ? `${results.length}${t(" 张（最多显示 60）")}` : t("只显示 MD 已实装的卡。拖到左边加入卡组。")}</p>
        <div className="wall-cards">{results.map((card) => <CardChip key={card.id} card={card} banlist={data.banlist} images={images} draggable onClick={() => change(card, 1)} />)}</div>
      </section>
    </div>
  );
}
