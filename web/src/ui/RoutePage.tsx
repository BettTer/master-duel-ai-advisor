// The route page: the routes to the best end boards merged into one tree, root at the left, end boards at the
// right. A node is a card arriving on the field (or a fork); hovering a node shows the position at that moment
// in the sidebar, as a board.
import { useMemo, useState } from "react";
import type { Card } from "../../../src/merge.ts";
import { BODY_VALUE, DRAW_PENALTY, type Board, type Interruption, type PlanResult, type TraceStep } from "../../../src/search.ts";
import type { CardData } from "../data/cards.ts";
import { cardName, imageUrl, levelColor, levelName } from "../state.ts";
import { CardChip, CardTag } from "./CardChip.tsx";
import { getLang, t, translateReport } from "../i18n.ts";

/** How many of the best boards get their route traced (the tree can expand to all of them). */
export const TRACED_ROUTES = 12;
const SHOWN_ROUTES = 5;

export interface RouteView {
  hand: Card[];
  result: PlanResult;
  traces: { boards: TraceStep[][]; interruptions: (TraceStep[] | null)[] }; // boards[i] replays result.boards[i]
  cardOf: (code: number) => Card | undefined;
  notes: string[];
}

interface Route { board: Board; trace: TraceStep[]; fallback: boolean }

/** A step label such as 通召「X」 or 选 A、B, as a pill. */
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

/** Cards in `now` that were not in `before`, as a multiset difference. */
function difference(now: number[], before: number[]): number[] {
  const rest = [...before];
  return now.filter((code) => { const at = rest.indexOf(code); if (at < 0) return true; rest.splice(at, 1); return false; });
}

function Thumb({ card, images, dim }: { card: Card; images: boolean; dim?: boolean }) {
  return (
    <span className={`sim-card ${dim ? "dim" : ""}`} title={card.en}>
      {images ? <img src={imageUrl(card.id)} alt="" loading="lazy" /> : null}
      <span className="sim-name">{cardName(card)}</span>
    </span>
  );
}

/** The sidebar board: the field as zones, the hand, and what entered or left the GY and banished pile. */
function BoardSim({ step, before, cardOf, images }: { step: TraceStep; before: TraceStep | null; cardOf: (code: number) => Card | undefined; images: boolean }) {
  const cards = (codes: number[]) => codes.map((code) => cardOf(code)).filter((card): card is Card => !!card);
  const slots = (codes: number[], dim = false) => {
    const list = cards(codes);
    return [...list.map((card, index) => <Thumb key={index} card={card} images={images} dim={dim} />), ...Array.from({ length: Math.max(0, 5 - list.length) }, (_, index) => <span key={`e${index}`} className="sim-slot" />)];
  };
  const pile = (zone: string, codes: number[], previous: number[] | null) => {
    const added = cards(previous ? difference(codes, previous) : codes);
    const gone = cards(previous ? difference(previous, codes) : []);
    return (
      <div className="sim-row">
        <span className="zone-name">{t(zone)} <span className="muted">{t(" 共 ")}{codes.length}</span></span>
        <div className="sim-pile">
          {added.length === 0 && gone.length === 0 && <span className="muted">—</span>}
          {added.length > 0 && <span className="sim-delta in">{t("新进")}</span>}{added.map((card, index) => <Thumb key={`a${index}`} card={card} images={images} />)}
          {gone.length > 0 && <span className="sim-delta out">{t("离开")}</span>}{gone.map((card, index) => <Thumb key={`g${index}`} card={card} images={images} dim />)}
        </div>
      </div>
    );
  };
  return (
    <div className="sim">
      <div className="sim-row"><span className="zone-name">{t("场上")}</span><div className="sim-zones">{slots(step.field)}</div></div>
      <div className="sim-row"><span className="zone-name">{t("后场")}</span><div className="sim-zones">{slots(step.sets, true)}</div></div>
      <div className="sim-row"><span className="zone-name">{t("手卡")}</span><div className="sim-pile">{step.hand.length === 0 ? <span className="muted">{t("空")}</span> : cards(step.hand).map((card, index) => <Thumb key={index} card={card} images={images} />)}</div></div>
      {pile("墓地", step.grave, before?.grave ?? null)}
      {pile("除外", step.removed, before?.removed ?? null)}
    </div>
  );
}

// Routes share their first steps; merged by the choice made at each step they form a tree.
interface Node { step: TraceStep; children: Node[]; keys: string[]; routes: number[]; ends: number[] }

function buildTree(routes: Route[]): Node {
  const root: Node = { step: routes[0].trace[0], children: [], keys: [], routes: [], ends: [] };
  routes.forEach((route, index) => {
    let node = root;
    node.routes.push(index);
    route.trace.slice(1).forEach((step, at) => {
      // The same choice can lead somewhere else once the opponent has acted, so the labels are part of the key.
      const key = `${route.board.path[at]}|${step.labels.join("|")}`;
      let child = node.children[node.keys.indexOf(key)];
      if (!child) {
        child = { step, children: [], keys: [], routes: [], ends: [] };
        node.children.push(child);
        node.keys.push(key);
      }
      child.routes.push(index);
      node = child;
    });
    node.ends.push(index);
  });
  return root;
}

// What is drawn: a node for every card arriving on the field, every fork and every end; the steps in between
// (effects, picks) become the label on the way in.
interface Shown { node: Node; via: string[]; added: number[]; children: Shown[]; opponent: boolean }

const onField = (step: TraceStep) => [...step.field, ...step.sets];

function collapse(node: Node): Shown {
  const children = node.children.map((child) => {
    let previous = node.step;
    let current = child;
    const via: string[] = [];
    let opponent = false;
    let added = difference(onField(current.step), onField(previous));
    while (current.children.length === 1 && current.ends.length === 0 && added.length === 0) {
      via.push(...current.step.labels);
      opponent ||= current.step.labels.some((label) => label.startsWith("（对手"));
      previous = current.step;
      current = current.children[0];
      added = difference(onField(current.step), onField(previous));
    }
    opponent ||= current.step.labels.some((label) => label.startsWith("（对手"));
    const shown = collapse(current);
    return { ...shown, via, added, opponent };
  });
  return { node, via: [], added: [], children, opponent: false };
}

/** The node the mouse is on (or pinned) and the position it grew from, for the sidebar's changes. */
interface Focus { node: Node; before: TraceStep | null }

function Tree({ shown, parent, routes, best, name, cardOf, images, focus, pinned, onHover, onPin, depth }: {
  shown: Shown; parent: TraceStep | null; routes: Route[]; best: number; name: (cn: string) => string; cardOf: (code: number) => Card | undefined; images: boolean;
  focus: Focus | null; pinned: Focus | null; onHover: (focus: Focus | null) => void; onPin: (focus: Focus) => void; depth: number;
}) {
  const node = shown.node;
  const onBest = node.routes.some((index) => !routes[index].fallback && routes[index].board.value === best);
  const labels = node.step.labels.filter((label) => !shown.via.includes(label));
  const added = shown.added.map((code) => cardOf(code)).filter((card): card is Card => !!card);
  const here: Focus = { node, before: parent };
  return (
    <div className={`tnode ${onBest ? "best" : ""}`}>
      <div
        className={`tbox ${onBest ? "best" : ""} ${focus?.node === node ? "hover" : ""} ${pinned?.node === node ? "pinned" : ""}`}
        onMouseEnter={() => onHover(here)} onMouseLeave={() => onHover(null)} onClick={() => onPin(here)}
      >
        {shown.via.length > 0 && <div className="tvia">{shown.via.map((label, index) => <Label key={index} text={label} name={name} />)}</div>}
        {shown.opponent && <span className="tdot" title={t("对手在这里发动")} />}
        {images && added.map((card, index) => <img key={index} className="tthumb" src={imageUrl(card.id)} alt="" title={card.en} loading="lazy" />)}
        {depth === 0 ? <span className="pill choice">{t("开局")}</span> : labels.length === 0 ? <span className="pill choice">{t("不发动，继续")}</span> : labels.map((label, index) => <Label key={index} text={label} name={name} />)}
        {node.ends.map((index) => {
          const route = routes[index];
          return <span key={index} className={`tvalue ${route.fallback ? "fallback" : route.board.value === best ? "best" : ""}`}>{route.fallback ? t("妥协场") : t("终场")} {route.board.value}</span>;
        })}
      </div>
      {shown.children.length > 0 && (
        <div className="tkids">
          {shown.children.map((child, index) => (
            <Tree key={index} shown={child} parent={node.step} routes={routes} best={best} name={name} cardOf={cardOf} images={images} focus={focus} pinned={pinned} onHover={onHover} onPin={onPin} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
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
        // Strongest endpoints first: 第0级, 第一级, 1.5级, 第二级, …
        const items = board.counted.filter((item) => item.place === place).sort((a, b) => a.level - b.level);
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
      {board.field.length > 0 && <p className="muted">{board.field.length}{t(" 只身体 +")}{board.field.length * BODY_VALUE}</p>}
      {board.draws > 0 && <p className="muted">{t("对手抽了 ")}{board.draws}{t(" 张（每张扣 ")}{DRAW_PENALTY}{t("）")}</p>}
    </div>
  );
}

export function RoutePage({ view, data, images }: { view: RouteView | null; data: CardData; images: boolean }) {
  const [tab, setTab] = useState(0); // 0 = main routes, 1.. = interruptions
  const [all, setAll] = useState(false);
  const [hovered, setHovered] = useState<Focus | null>(null);
  const [pinned, setPinned] = useState<Focus | null>(null);
  const routes = useMemo<Route[]>(() => {
    if (!view) return [];
    const { result, traces } = view;
    const main = result.boards.slice(0, traces.boards.length).map((board, index) => ({ board, trace: traces.boards[index], fallback: false }));
    if (tab === 0) return main.slice(0, all ? TRACED_ROUTES : SHOWN_ROUTES);
    const interruption: Interruption | undefined = result.interruptions[tab - 1];
    const trace = traces.interruptions[tab - 1];
    // The best route and the fallback together: they share the steps up to the opponent's activation.
    return interruption?.board && trace ? [main[0], { board: interruption.board, trace, fallback: true }] : main.slice(0, 1);
  }, [view, tab, all]);
  const tree = useMemo(() => (routes.length > 0 ? collapse(buildTree(routes)) : null), [routes]);
  if (!view) return <div className="page"><section className="panel"><p className="muted">{t("在「起手」页规划一手起手后，这里显示路线。")}</p></section></div>;
  const { result, cardOf } = view;
  const byCn = new Map(data.cards.map((card) => [card.cn, card]));
  const name = (cn: string) => { const card = byCn.get(cn); return card ? cardName(card) : cn; };
  const report = (text: string) => translateReport(text, name);
  const best = result.boards[0];
  const interruption = tab > 0 ? result.interruptions[tab - 1] : null;
  const shownBoard = tab === 0 ? best : interruption?.board ?? null;
  // The sidebar: the hovered node, else the pinned one, else the end of the shown board's route against its start.
  const lastRoute = routes.find((route) => route.board === shownBoard);
  const focus = hovered ?? pinned;
  const shownStep = focus ? focus.node.step : lastRoute?.trace[lastRoute.trace.length - 1] ?? null;
  const before = focus ? focus.before : lastRoute?.trace[0] ?? null;
  const select = (next: number) => { setTab(next); setPinned(null); setHovered(null); };
  return (
    <div className="page">
      <section className="panel">
        <div className="hand-row">{view.hand.map((card, index) => <CardChip key={index} card={card} banlist={data.banlist} small images={images} />)}</div>
        <div className="tabs">
          <button className={tab === 0 ? "tab active" : "tab"} onClick={() => select(0)}>{t("最大场")}</button>
          {result.interruptions.map((item, index) => (
            <button key={index} className={tab === index + 1 ? "tab active" : "tab"} onClick={() => select(index + 1)}>{getLang() === "en" ? `Under ${cardName(item.card)}` : `被「${cardName(item.card)}」打断`}</button>
          ))}
        </div>
        {!best && <p className="muted">{t("没有找到任何能做的动作。")}</p>}
        {interruption && (
          <p className="interruption">
            {interruption.opportunities === 0 ? t("这条路线上没有发动的时机。") : !interruption.board ? t("发动后做不出任何场。")
              : interruption.after === "" ? <>{t("对手回合一开始就发动了。")}{interruption.complete ? "" : t("（没搜完）")}</>
              : <>{interruption.opportunities}{t(" 个时机里最狠的：在「")}{report(interruption.after)}{t("」后发动")}{interruption.complete ? "" : t("（没搜完）")}</>}
          </p>
        )}
        <div className="route-layout">
          <div className="route-main">
            {tree && (
              <div className="tree">
                <Tree shown={tree} parent={null} routes={routes} best={best.value} name={name} cardOf={cardOf} images={images} focus={focus} pinned={pinned} onHover={setHovered} onPin={(here) => setPinned(pinned?.node === here.node ? null : here)} depth={0} />
              </div>
            )}
            {tab === 0 && view.traces.boards.length > SHOWN_ROUTES && (
              <button className="ghost small" onClick={() => setAll(!all)}>{all ? t("只看最好的 5 条") : `${t("还有 ")}${view.traces.boards.length - SHOWN_ROUTES}${t(" 条路线")}`}</button>
            )}
            {shownBoard && <BoardPanel board={shownBoard} title={tab === 0 ? t("终场") : t("妥协场")} />}
          </div>
          {shownStep && (
            <aside className="route-side">
              <p className="muted">
                {focus ? <>{t("这一步之后：")}{focus.node.step.labels.map((label, index) => <Label key={index} text={label} name={name} />)}{pinned === focus && <button className="ghost small" onClick={() => setPinned(null)}>{t("取消固定")}</button>}</> : <>{t("整条路线下来：")}<span>{t("鼠标移到节点上看那一刻的场面，点一下固定。")}</span></>}
              </p>
              <BoardSim step={shownStep} before={before} cardOf={cardOf} images={images} />
            </aside>
          )}
        </div>
      </section>
      {tab === 0 && (
        <section className="panel">
          <h3>{t("第一步的每种选择")}</h3>
          <ul className="boards">{result.branches.map((branch, index) => (
            <li key={index}><Label text={branch.first || "（不发动，继续）"} name={name} /> {branch.complete ? `${t("全部搜完（")}${branch.nodes}${t(" 个节点）")}` : `${t("搜了 ")}${branch.nodes}${t(" 个节点，没搜完")}`}{branch.best && <span className="muted">{t("，最好 ")}{branch.best.value}</span>}</li>
          ))}</ul>
          <p className="muted">{t("共 ")}{result.states}{t(" 个不同局面，")}{result.seconds.toFixed(1)}{t(" 秒。")}{result.boards.length > 1 && <>{t("不同的终场 ")}{result.boards.length}{t(" 种。")}</>}</p>
          {view.notes.length > 0 && <ul className="issues">{view.notes.map((note, index) => <li key={index}>{note}</li>)}</ul>}
        </section>
      )}
    </div>
  );
}
