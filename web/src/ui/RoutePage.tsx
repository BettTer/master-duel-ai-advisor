import { useState } from "react";
import type { Card } from "../../../src/merge.ts";
import { DRAW_PENALTY, type Board, type PlanResult, type TraceStep } from "../../../src/search.ts";
import type { CardData } from "../data/cards.ts";
import { cardName, levelColor, levelName } from "../state.ts";
import { CardChip, CardTag } from "./CardChip.tsx";

export interface RouteView {
  hand: Card[];
  result: PlanResult;
  traces: { main: TraceStep[]; interruptions: (TraceStep[] | null)[] };
  cardOf: (code: number) => Card | undefined;
  notes: string[];
}

/** A step label such as 通召「X」 or 选 A、B, as pills. */
function Label({ text }: { text: string }) {
  const opponent = text.startsWith("（对手");
  const action = text.match(/^(通召|特召|发动|连锁发动)「(.+)」$/);
  if (action) return <span className={`pill action ${action[1] === "连锁发动" ? "chain" : ""}`}><b>{action[1]}</b> {action[2]}</span>;
  if (opponent) return <span className="pill opponent">{text.replace(/^（|）$/g, "")}</span>;
  return <span className="pill choice">{text}</span>;
}

function Zones({ step, cardOf }: { step: TraceStep; cardOf: (code: number) => Card | undefined }) {
  const names = (codes: number[]) => codes.map((code) => cardOf(code)).filter((card): card is Card => !!card).map(cardName);
  const rows: [string, string[]][] = [["手", names(step.hand)], ["场", names(step.field)], ["后场", names(step.sets)], ["墓", names(step.grave)], ["除外", names(step.removed)]];
  return (
    <div className="zones">
      {rows.filter(([, list]) => list.length > 0).map(([zone, list]) => (
        <div key={zone} className="zone"><span className="zone-name">{zone}</span>{list.map((name, index) => <span key={index} className="zone-card">{name}</span>)}</div>
      ))}
    </div>
  );
}

function Timeline({ trace, cardOf }: { trace: TraceStep[]; cardOf: (code: number) => Card | undefined }) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <ol className="timeline">
      {trace.map((step, index) => (
        <li key={index} className={index === 0 ? "start" : ""}>
          <div className="step-head" onClick={() => setOpen(open === index ? null : index)}>
            <span className="step-no">{index === 0 ? "起" : index}</span>
            <span className="labels">{step.labels.length === 0 ? <span className="pill choice">{index === 0 ? "开局" : "不发动，继续"}</span> : step.labels.map((label, at) => <Label key={at} text={label} />)}</span>
          </div>
          {(open === index || index === trace.length - 1) && <Zones step={step} cardOf={cardOf} />}
        </li>
      ))}
    </ol>
  );
}

function BoardPanel({ board, title }: { board: Board; title: string }) {
  const field = board.field.map((card) => <CardTag key={card.id} card={card} />);
  const sets = board.sets.map((card) => <CardTag key={`s${card.id}`} card={card} tone="#8c96ad" />);
  const places = ["场上", "墓地", "手里", "带出"] as const;
  return (
    <div className="board">
      <h3>{title} <span className="value">价值 {board.value}</span></h3>
      <div className="board-field">{field.length > 0 ? field : <span className="muted">没有怪兽</span>}{sets.length > 0 && <span className="muted"> ｜ 后场 </span>}{sets}</div>
      {places.map((place) => {
        const items = board.counted.filter((item) => item.place === place);
        if (items.length === 0) return null;
        return (
          <div key={place} className="counted">
            <span className="muted">{place === "带出" ? "对手回合带出" : place}</span>
            {items.map((item, index) => (
              <span key={index} className="counted-item" style={{ borderColor: levelColor(item.level) }}>
                {item.via && <span className="muted">{cardName(item.via)} → </span>}{cardName(item.card)}
                <b style={{ color: levelColor(item.level) }}> {levelName(item.level)}{item.uses > 1 ? `×${item.uses}` : ""}{item.ownTurn ? "（自己回合）" : ""} {item.value}</b>
              </span>
            ))}
          </div>
        );
      })}
      {board.draws > 0 && <p className="muted">对手抽了 {board.draws} 张（每张扣 {DRAW_PENALTY}）</p>}
    </div>
  );
}

export function RoutePage({ view, data, images }: { view: RouteView | null; data: CardData; images: boolean }) {
  const [tab, setTab] = useState(0); // 0 = main route, 1.. = interruptions
  if (!view) return <div className="page"><section className="panel"><p className="muted">在「起手」页规划一手起手后，这里显示路线。</p></section></div>;
  const { result, traces, cardOf } = view;
  const best = result.boards[0];
  const interruption = tab > 0 ? result.interruptions[tab - 1] : null;
  const shownBoard = tab === 0 ? best : interruption?.board ?? null;
  const shownTrace = tab === 0 ? traces.main : traces.interruptions[tab - 1];
  return (
    <div className="page">
      <section className="panel">
        <div className="hand-row">{view.hand.map((card, index) => <CardChip key={index} card={card} banlist={data.banlist} small images={images} />)}</div>
        <div className="tabs">
          <button className={tab === 0 ? "tab active" : "tab"} onClick={() => setTab(0)}>最大场</button>
          {result.interruptions.map((item, index) => (
            <button key={index} className={tab === index + 1 ? "tab active" : "tab"} onClick={() => setTab(index + 1)}>被「{cardName(item.card)}」打断</button>
          ))}
        </div>
        {!best && <p className="muted">没有找到任何能做的动作。</p>}
        {interruption && (
          <p className="interruption">
            {interruption.opportunities === 0 ? "这条路线上没有发动的时机。" : interruption.board
              ? <>{interruption.opportunities} 个时机里最狠的：在「{interruption.after}」后发动{interruption.complete ? "" : "（没搜完）"}</>
              : "发动后做不出任何场。"}
          </p>
        )}
        {shownBoard && (
          <div className="route-grid">
            <div>
              <h3>路线</h3>
              {shownTrace ? <Timeline trace={shownTrace} cardOf={cardOf} /> : <ol className="timeline">{shownBoard.steps.map((step, index) => <li key={index}><Label text={step} /></li>)}</ol>}
            </div>
            <BoardPanel board={shownBoard} title={tab === 0 ? "终场" : "妥协场"} />
          </div>
        )}
      </section>
      {tab === 0 && (
        <section className="panel">
          <h3>其他的场</h3>
          <ul className="boards">{result.boards.slice(1, 8).map((board, index) => (
            <li key={index}><span className="value">{board.value}</span> {board.field.map(cardName).join("＋") || "（没有怪兽）"}{board.sets.length > 0 && <span className="muted">，后场 {board.sets.map(cardName).join("、")}</span>}</li>
          ))}</ul>
          <h3>第一步的每种选择</h3>
          <ul className="boards">{result.branches.map((branch, index) => (
            <li key={index}><Label text={branch.first || "（不发动，继续）"} /> {branch.complete ? `全部搜完（${branch.nodes} 个节点）` : `搜了 ${branch.nodes} 个节点，没搜完`}{branch.best && <span className="muted">，最好 {branch.best.value}</span>}</li>
          ))}</ul>
          <p className="muted">共 {result.states} 个不同局面，{result.seconds.toFixed(1)} 秒。</p>
          {view.notes.length > 0 && <ul className="issues">{view.notes.map((note, index) => <li key={index}>{note}</li>)}</ul>}
        </section>
      )}
    </div>
  );
}
