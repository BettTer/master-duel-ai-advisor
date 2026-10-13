// The app shell: data loading, the five pages, and the state they share.
import { useEffect, useRef, useState } from "react";
import { readDeck, type Deck } from "../../src/deck.ts";
import type { Card } from "../../src/merge.ts";
import { profileDeck, type Profile } from "../../src/profile.ts";
import { type PlanResult, type TraceStep } from "../../src/search.ts";
import { loadCardData, type CardData } from "./data/cards.ts";
import { kvGet, kvSet } from "./data/db.ts";
import { prepareDeck, type DeckPlanner } from "./engine/planner.ts";
import { PAGES, readHash, writeHash, type Page } from "./state.ts";
import { DeckPage, analyzeDeck, type DeckAnalysis } from "./ui/DeckPage.tsx";
import { HandPage } from "./ui/HandPage.tsx";
import { LookupPage } from "./ui/LookupPage.tsx";
import { ProfilePage } from "./ui/ProfilePage.tsx";
import { RoutePage, type RouteView } from "./ui/RoutePage.tsx";

export function App() {
  const [data, setData] = useState<CardData | null>(null);
  const [status, setStatus] = useState("加载卡片数据…");
  const [page, setPage] = useState<Page>("deck");
  const [deck, setDeck] = useState<Deck | null>(null);
  const [analysis, setAnalysis] = useState<DeckAnalysis | null>(null);
  const [hand, setHand] = useState<Card[]>([]);
  const [tiers, setTiers] = useState(() => localStorage.getItem("tiers") ?? "");
  const [seconds, setSeconds] = useState(30);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [route, setRoute] = useState<RouteView | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [images, setImages] = useState(() => localStorage.getItem("images") !== "off");
  const prepared = useRef<{ key: string; planner: DeckPlanner } | null>(null);
  const pendingHand = useRef<number[] | null>(null);

  useEffect(() => {
    loadCardData(setStatus).then(async (loaded) => {
      setData(loaded);
      setStatus("");
      const hash = readHash();
      if (hash.deck) {
        try {
          const read = await readDeck(hash.deck, loaded.cards);
          setDeck(read);
          setAnalysis(analyzeDeck(read, loaded));
          if (hash.hand) {
            const pile = read.main.flatMap((entry) => Array<Card>(entry.count).fill(entry.card));
            setHand(hash.hand.map((id) => pile.find((card) => card.id === id || card.altIds.includes(id))).filter((card): card is Card => !!card));
            setPage("hand");
          }
        } catch {
          pendingHand.current = null;
        }
      }
    }).catch((error) => setStatus(`加载失败：${error instanceof Error ? error.message : error}`));
  }, []);
  useEffect(() => { writeHash(deck, hand); }, [deck, hand]);
  useEffect(() => { localStorage.setItem("tiers", tiers); }, [tiers]);
  useEffect(() => { localStorage.setItem("images", images ? "on" : "off"); }, [images]);

  async function plannerFor(current: Deck): Promise<DeckPlanner> {
    const key = `${JSON.stringify(current.main.map((entry) => [entry.card.id, entry.count]))}|${JSON.stringify(current.extra.map((entry) => [entry.card.id, entry.count]))}|${tiers}`;
    if (prepared.current?.key === key) return prepared.current.planner;
    await prepared.current?.planner.close();
    prepared.current = null;
    const planner = await prepareDeck(data!.cards, current, tiers, setProgress);
    prepared.current = { key, planner };
    return planner;
  }

  async function plan() {
    if (!data || !deck) return;
    setBusy(true);
    setProgress("准备引擎…");
    try {
      const planner = await plannerFor(deck);
      const rest = deck.main.flatMap((entry) => Array<Card>(entry.count).fill(entry.card));
      for (const card of hand) rest.splice(rest.indexOf(card), 1);
      const setup = planner.setupFor(hand, rest);
      setProgress(`搜索中，最多 ${seconds} 秒，之后再试对手的打断…`);
      const result: PlanResult = await planner.planner.plan(setup, { nodes: 1_000_000, seconds }, true);
      const best = result.boards[0];
      const traces = {
        main: best ? planner.planner.trace(setup, best.path) : [] as TraceStep[],
        interruptions: result.interruptions.map((item) => (item.board && item.play ? planner.planner.trace(setup, item.board.path, item.play) : null)),
      };
      const byCode = new Map<number, Card>();
      for (const card of data.cards) for (const id of [card.id, ...card.altIds]) byCode.set(id, card);
      const notes = [...planner.tiers.problems];
      if (planner.missing.length > 0) notes.push(`规则引擎还没有这些卡的数据：${planner.missing.map((card) => card.cn || card.en).join("、")}`);
      setRoute({ hand: [...hand], result, traces, cardOf: (code) => byCode.get(code), notes });
      setPage("route");
      setProgress("");
    } catch (error) {
      setProgress(`出错：${error instanceof Error ? error.message : error}`);
    } finally {
      setBusy(false);
    }
  }

  async function runProfile(hands: number, perHand: number) {
    if (!data || !deck) return;
    setBusy(true);
    try {
      const planner = await plannerFor(deck);
      const key = `profile:${JSON.stringify(deck.main.map((entry) => [entry.card.id, entry.count]))}|${tiers}|${perHand}`;
      const stored = (await kvGet<Record<string, { board: any; seconds: number }>>(key)) ?? {};
      const result = await profileDeck(deck, planner.planner, planner.lines, planner.setupFor, {
        hands, seconds: perHand, seed: 20261013, label: deck.name || "现在的卡组",
        cache: { get: (hand) => stored[hand] ?? null, set: (hand, value) => { stored[hand] = value; void kvSet(key, stored); } },
        progress: (done, total, hand) => setProgress(`${done}/${total}：${hand.cards.map((card) => card.cn || card.en).join("、")} → ${hand.board?.value ?? "无"}`),
      });
      setProfile(result);
      setProgress("");
    } catch (error) {
      setProgress(`出错：${error instanceof Error ? error.message : error}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <header>
        <div className="brand">Master Duel <span>AI Advisor</span></div>
        <nav>{PAGES.map((item) => <button key={item.id} className={page === item.id ? "active" : ""} onClick={() => setPage(item.id)}>{item.label}</button>)}</nav>
        <label className="toggle"><input type="checkbox" checked={images} onChange={(event) => setImages(event.target.checked)} /> 卡图</label>
      </header>
      {status && <p className="status">{status}</p>}
      {data && page === "deck" && <DeckPage data={data} deck={deck} analysis={analysis} images={images} onDeck={(read, read2) => { setDeck(read); setAnalysis(read2); setHand([]); setRoute(null); setProfile(null); }} />}
      {data && page === "hand" && <HandPage data={data} deck={deck} hand={hand} setHand={setHand} tiers={tiers} setTiers={setTiers} seconds={seconds} setSeconds={setSeconds} onPlan={plan} busy={busy} progress={progress} images={images} />}
      {data && page === "route" && <RoutePage view={route} data={data} images={images} />}
      {data && page === "profile" && <ProfilePage deck={deck} profile={profile} onRun={runProfile} busy={busy} progress={progress} onPickHand={(cards) => { setHand(cards); setPage("hand"); }} data={data} />}
      {data && page === "lookup" && <LookupPage data={data} images={images} />}
      <footer className="muted">卡片数据来自百鸽（ygocdb.com）、Master Duel Meta、Project Ignis；规则引擎是 EDOPro 的核心。卡文和卡图的版权属于 KONAMI。{data?.builtAt && ` 数据构建于 ${data.builtAt.slice(0, 10)}。`}</footer>
    </>
  );
}
