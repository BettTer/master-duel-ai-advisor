import type { Deck } from "../../../src/deck.ts";
import { draftTiers } from "../../../src/draft.ts";
import type { Card } from "../../../src/merge.ts";
import type { CardData } from "../data/cards.ts";
import { CardChip } from "./CardChip.tsx";
import { DeckWall } from "./DeckPage.tsx";

const TIERS_HINT = `一张卡一行，写它在对手回合最有用的效果的级别：
鲜花女男爵：第一级
幻透翼同调龙：第二级×2
灰流丽：第二级；在手里
三英之相剑师：第二级；自己回合
卫星闪灵·淘气精灵：保护；回合外 → 墓地 2星 怪兽
虹光之宣告者：第一级；回合外出`;

export function HandPage({ data, deck, hand, setHand, tiers, setTiers, seconds, setSeconds, onPlan, busy, progress, images }: {
  data: CardData; deck: Deck | null; hand: Card[]; setHand: (hand: Card[]) => void; tiers: string; setTiers: (text: string) => void;
  seconds: number; setSeconds: (seconds: number) => void; onPlan: () => void; busy: boolean; progress: string; images: boolean;
}) {
  if (!deck) return <div className="page"><section className="panel"><p className="muted">先在「卡组」页读入一副卡组。</p></section></div>;
  const pile = deck.main.flatMap((entry) => Array<Card>(entry.count).fill(entry.card));
  const add = (card: Card) => {
    if (hand.length >= 6) return;
    const inHand = hand.filter((other) => other.id === card.id).length;
    const inDeck = deck.main.find((entry) => entry.card.id === card.id)?.count ?? 0;
    if (inHand < inDeck) setHand([...hand, card]);
  };
  const random = () => {
    const rest = [...pile];
    const drawn: Card[] = [];
    for (let i = 0; i < 5 && rest.length > 0; i++) drawn.push(...rest.splice(Math.floor(Math.random() * rest.length), 1));
    setHand(drawn);
  };
  return (
    <div className="page">
      <section className="panel">
        <h2>起手</h2>
        <div className="slots">
          {Array.from({ length: 5 }, (_, index) => hand[index]
            ? <CardChip key={index} card={hand[index]} banlist={data.banlist} onClick={() => setHand(hand.filter((_, other) => other !== index))} images={images} />
            : <div key={index} className="slot-empty">{index + 1}</div>)}
          {hand.slice(5).map((card, index) => <CardChip key={5 + index} card={card} banlist={data.banlist} onClick={() => setHand(hand.filter((_, other) => other !== 5 + index))} images={images} />)}
        </div>
        <div className="row">
          <button onClick={random}>随机发一手</button>
          <button className="ghost" onClick={() => setHand([])} disabled={hand.length === 0}>清空</button>
          <span className="muted">点下面的卡加入起手，点起手里的卡拿掉。</span>
        </div>
        <DeckWall deck={{ ...deck, extra: [] }} data={data} onPick={add} images={images} />
      </section>
      <section className="panel">
        <h2>终端清单</h2>
        <p className="muted">终端＝对手回合能用的打断。级别：第0级（对面康不了，超融合）、第一级（三色康）、1.5级（增殖的G）、第二级（有条件的康）、2.5级（条件很窄）、软康（税和锁）、第三级（除外、破坏、送墓、回手）、保护。附加写法：×2、在手里、在墓地、自己回合、召唤时、回合外出、回合外 → 墓地/卡组/额外 〈卡〉[到手]、带 N 只、要 另有/额外有/墓地有 〈卡〉。</p>
        <textarea rows={10} value={tiers} onChange={(event) => setTiers(event.target.value)} placeholder={TIERS_HINT} />
        <div className="row">
          <button className="ghost" onClick={() => setTiers(draftTiers(deck))}>按卡文生成草稿</button>
          <span className="muted">草稿只认得最直白的写法（康、处理、常见手坑），级别和回合外的链条要自己核。让 AI 助手照 SKILL.md 做终端分析会准得多。</span>
        </div>
        <div className="row">
          <label>最多搜 <input type="number" min={5} max={300} value={seconds} onChange={(event) => setSeconds(Number(event.target.value))} /> 秒</label>
          <button onClick={onPlan} disabled={busy || hand.length === 0 || !tiers.trim()}>{busy ? "搜索中…" : "规划这手起手"}</button>
          {!busy && hand.length === 0 && <span className="muted">先选起手</span>}
          {!busy && hand.length > 0 && !tiers.trim() && <span className="muted">先填终端清单，或者点上面的"生成草稿"</span>}
          {progress && <span className="muted">{progress}</span>}
        </div>
      </section>
    </div>
  );
}
