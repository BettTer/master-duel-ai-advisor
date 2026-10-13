import { useState } from "react";
import type { Card } from "../../../src/merge.ts";
import { DRAW_PENALTY, type Board, type PlanResult, type TraceStep } from "../../../src/search.ts";
import type { CardData } from "../data/cards.ts";
import { cardName, levelColor, levelName } from "../state.ts";
import { CardChip, CardTag } from "./CardChip.tsx";
import { getLang, t, translateReport, sep } from "../i18n.ts";

export interface RouteView {
  hand: Card[];
  result: PlanResult;
  traces: { main: TraceStep[]; interruptions: (TraceStep[] | null)[] };
  cardOf: (code: number) => Card | undefined;
  notes: string[];
}

/** A step label such as 通召「X」 or 选 A、B, as pills. */
function Label({ text, name }: { text: string; name: (cn: string) => string }) {
  const opponent = text.startsWith("（对手");
  const action = text.match(/^(通召|特召|发动|连锁发动)「(.+)」$/);
  if (action) return <span className={`pill action ${action[1] === "连锁发动" ? "chain" : ""}`}><b>{t(action[1])}</b> {name(action[2])}</span>;
  if (opponent) return <span className="pill opponent">{translateReport(text.replace(/^（|）$/g, ""), name)}</span>;
  // Picks list card names without 「」: translate each name on its own.
  const pick = text.match(/^选 (.+)$/);
  if (pick && getLang() === "en") return <span className="pill choice">{t("选 ")}{pick[1].split("、").map(name).join(", ")}</span>;
  return <span className="pill choice">{translateReport(text, name)}</span>;
}

function Zones({ step, cardOf }: { step: TraceStep; cardOf: (code: number) => Card | undefined }) {
  const names = (codes: number[]) => codes.map((code) => cardOf(code)).filter((card): card is Card => !!card).map(cardName);
  const rows: [string, string[]][] = [["手", names(step.hand)], ["场", names(step.field)], ["后场", names(step.sets)], ["墓", names(step.grave)], ["除外", names(step.removed)]];
  return (
    <div className="zones">
      {rows.filter(([, list]) => list.length > 0).map(([zone, list]) => (
        <div key={zone} className="zone"><span className="zone-name">{t(zone)}</span>{list.map((name, index) => <span key={index} className="zone-card">{name}</span>)}</div>
      ))}
    </div>
  );
}

function Timeline({ trace, cardOf, name }: { trace: TraceStep[]; cardOf: (code: number) => Card | undefined; name: (cn: string) => string }) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <ol className="timeline">
      {trace.map((step, index) => (
        <li key={index} className={index === 0 ? "start" : ""}>
          <div className="step-head" onClick={() => setOpen(open === index ? null : index)}>
            <span className="step-no">{index === 0 ? t("起") : index}</span>
            <span className="labels">{step.labels.length === 0 ? <span className="pill choice">{index === 0 ? t("开局") : t("不发动，继续")}</span> : step.labels.map((label, at) => <Label key={at} text={label} name={name} />)}</span>
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
      <h3>{title} <span className="value">{t("价值 ")}{board.value}</span></h3>
      <div className="board-field">{field.length > 0 ? field : <span className="muted">{t("没有怪兽")}</span>}{sets.length > 0 && <span className="muted">{t(" ｜ 后场 ")}</span>}{sets}</div>
      {places.map((place) => {
        const items = board.counted.filter((item) => item.place === place);
        if (items.length === 0) return null;
        return (
          <div key={place} className="counted">
            <span className="muted">{place === "带出" ? t("对手回合带出") : t(place)}</span>
            {items.map((item, index) => (
              <span key={index} className="counted-item" style={{ borderColor: levelColor(item.level) }}>
                {item.via && <span className="muted">{cardName(item.via)} → </span>}{cardName(item.card)}
                <b style={{ color: levelColor(item.level) }}> {levelName(item.level)}{item.uses > 1 ? `×${item.uses}` : ""}{item.ownTurn ? t("（自己回合）") : ""} {item.value}</b>
              </span>
            ))}
          </div>
        );
      })}
      {board.draws > 0 && <p className="muted">{t("对手抽了 ")}{board.draws}{t(" 张（每张扣 ")}{DRAW_PENALTY}{t("）")}</p>}
    </div>
  );
}

export function RoutePage({ view, data, images }: { view: RouteView | null; data: CardData; images: boolean }) {
  const [tab, setTab] = useState(0); // 0 = main route, 1.. = interruptions
  if (!view) return <div className="page"><section className="panel"><p className="muted">{t("在「起手」页规划一手起手后，这里显示路线。")}</p></section></div>;
  const { result, traces, cardOf } = view;
  const byCn = new Map(data.cards.map((card) => [card.cn, card]));
  const name = (cn: string) => { const card = byCn.get(cn); return card ? cardName(card) : cn; };
  const report = (text: string) => translateReport(text, name);
  const best = result.boards[0];
  const interruption = tab > 0 ? result.interruptions[tab - 1] : null;
  const shownBoard = tab === 0 ? best : interruption?.board ?? null;
  const shownTrace = tab === 0 ? traces.main : traces.interruptions[tab - 1];
  return (
    <div className="page">
      <section className="panel">
        <div className="hand-row">{view.hand.map((card, index) => <CardChip key={index} card={card} banlist={data.banlist} small images={images} />)}</div>
        <div className="tabs">
          <button className={tab === 0 ? "tab active" : "tab"} onClick={() => setTab(0)}>{t("最大场")}</button>
          {result.interruptions.map((item, index) => (
            <button key={index} className={tab === index + 1 ? "tab active" : "tab"} onClick={() => setTab(index + 1)}>{getLang() === "en" ? `Under ${cardName(item.card)}` : `被「${cardName(item.card)}」打断`}</button>
          ))}
        </div>
        {!best && <p className="muted">{t("没有找到任何能做的动作。")}</p>}
        {interruption && (
          <p className="interruption">
            {interruption.opportunities === 0 ? t("这条路线上没有发动的时机。") : interruption.board
              ? <>{interruption.opportunities}{t(" 个时机里最狠的：在「")}{report(interruption.after)}{t("」后发动")}{interruption.complete ? "" : t("（没搜完）")}</>
              : t("发动后做不出任何场。")}
          </p>
        )}
        {shownBoard && (
          <div className="route-grid">
            <div>
              <h3>{t("路线")}</h3>
              {shownTrace ? <Timeline trace={shownTrace} cardOf={cardOf} name={name} /> : <ol className="timeline">{shownBoard.steps.map((step, index) => <li key={index}><Label text={step} name={name} /></li>)}</ol>}
            </div>
            <BoardPanel board={shownBoard} title={tab === 0 ? t("终场") : t("妥协场")} />
          </div>
        )}
      </section>
      {tab === 0 && (
        <section className="panel">
          <h3>{t("其他的场")}</h3>
          <ul className="boards">{result.boards.slice(1, 8).map((board, index) => (
            <li key={index}><span className="value">{board.value}</span> {board.field.map(cardName).join("＋") || t("（没有怪兽）")}{board.sets.length > 0 && <span className="muted">{t("，后场 ")}{board.sets.map(cardName).join(sep())}</span>}</li>
          ))}</ul>
          <h3>{t("第一步的每种选择")}</h3>
          <ul className="boards">{result.branches.map((branch, index) => (
            <li key={index}><Label text={branch.first || "（不发动，继续）"} name={name} /> {branch.complete ? `${t("全部搜完（")}${branch.nodes}${t(" 个节点）")}` : `${t("搜了 ")}${branch.nodes}${t(" 个节点，没搜完")}`}{branch.best && <span className="muted">{t("，最好 ")}{branch.best.value}</span>}</li>
          ))}</ul>
          <p className="muted">{t("共 ")}{result.states}{t(" 个不同局面，")}{result.seconds.toFixed(1)}{t(" 秒。")}</p>
          {view.notes.length > 0 && <ul className="issues">{view.notes.map((note, index) => <li key={index}>{note}</li>)}</ul>}
        </section>
      )}
    </div>
  );
}
