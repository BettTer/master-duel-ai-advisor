import { useState } from "react";
import type { Deck } from "../../../src/deck.ts";
import { fieldText, summarizeProfile } from "../../../src/format.ts";
import type { Card } from "../../../src/merge.ts";
import type { Profile } from "../../../src/profile.ts";
import type { CardData } from "../data/cards.ts";
import { cardName } from "../state.ts";

export function ProfilePage({ deck, profile, onRun, busy, progress, onPickHand, data }: {
  deck: Deck | null; profile: Profile | null; onRun: (hands: number, seconds: number) => void; busy: boolean; progress: string;
  onPickHand: (hand: Card[]) => void; data: CardData;
}) {
  const [hands, setHands] = useState(60);
  const [seconds, setSeconds] = useState(5);
  if (!deck) return <div className="page"><section className="panel"><p className="muted">先读入卡组，再在「起手」页写好终端清单。</p></section></div>;
  const summary = profile ? summarizeProfile(profile) : null;
  const percent = (value: number) => `${(value * 100).toFixed(0)}%`;
  void data;
  return (
    <div className="page">
      <section className="panel">
        <h2>卡组全景</h2>
        <p className="muted">按真实概率随机抽起手，每手用引擎搜几秒，看这副卡组平均做出什么、多久卡一次、每张卡贡献多少。用「起手」页的终端清单。</p>
        <div className="row">
          <label>抽 <input type="number" min={10} max={300} value={hands} onChange={(event) => setHands(Number(event.target.value))} /> 手</label>
          <label>每手 <input type="number" min={2} max={30} value={seconds} onChange={(event) => setSeconds(Number(event.target.value))} /> 秒</label>
          <button onClick={() => onRun(hands, seconds)} disabled={busy}>{busy ? "计算中…" : "开始"}</button>
          {progress && <span className="muted">{progress}</span>}
        </div>
      </section>
      {summary && profile && (
        <>
          <section className="panel">
            <h2>平均价值 <span className="value big">{summary.average.toFixed(1)}</span> <span className="muted">{profile.samples} 手抽样，{profile.distinct} 种不同起手，误差约 ±1</span></h2>
            <div className="bars">{summary.buckets.map((bucket) => (
              <div key={bucket.label} className="bar-row"><span className="bar-label">{bucket.label}</span><div className="bar"><div className="bar-fill" style={{ width: `${bucket.share * 100}%` }} /></div><span className="bar-value">{percent(bucket.share)}</span></div>
            ))}</div>
            <h3>最常见的终场</h3>
            <ul className="boards">{summary.topBoards.map(({ board, share }, index) => <li key={index}><span className="value">{percent(share)}</span> {fieldText(board)}</li>)}</ul>
            <h3>最差的起手 <span className="muted">点一下载入起手页</span></h3>
            <ul className="boards">{summary.worst.map((hand) => (
              <li key={hand.key} className="clickable" onClick={() => onPickHand(hand.cards)}><span className="value">{hand.board?.value ?? 0}</span> {hand.cards.map(cardName).join("、")}{hand.board && <span className="muted"> → {fieldText(hand.board)}</span>}</li>
            ))}</ul>
          </section>
          <section className="panel">
            <h3>每张卡的贡献 <span className="muted">起手里有它时的平均价值，减去没有它时的</span></h3>
            <div className="bars">{summary.contributions.map((row) => (
              <div key={row.card.id} className="bar-row">
                <span className="bar-label">{cardName(row.card)} <span className="muted">{row.count} 手</span></span>
                <div className="bar split"><div className={`bar-fill ${row.delta < 0 ? "negative" : ""}`} style={{ width: `${Math.min(50, Math.abs(row.delta) * 2.5)}%` }} /></div>
                <span className="bar-value">{row.delta >= 0 ? "+" : "−"}{Math.abs(row.delta).toFixed(1)}</span>
              </div>
            ))}</div>
          </section>
        </>
      )}
    </div>
  );
}
