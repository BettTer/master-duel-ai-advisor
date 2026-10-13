// The app shell: the deck library, one deck's workspace (card list and checks, hand, route, profile) and the lookup.
import { useEffect, useRef, useState } from "react";
import { readDeck, type Deck } from "../../src/deck.ts";
import type { Card } from "../../src/merge.ts";
import { profileDeck, type Profile } from "../../src/profile.ts";
import type { PlanResult, TraceStep } from "../../src/search.ts";
import { loadCardData, type CardData } from "./data/cards.ts";
import { kvGet, kvSet } from "./data/db.ts";
import { deleteDeck, listDecks, newDeck, saveDeck, type SavedDeck } from "./data/store.ts";
import { prepareDeck, type DeckPlanner } from "./engine/planner.ts";
import { SUBS, parseRoute, readShared, routeHash, shareLink, type Route, type Sub } from "./state.ts";
import { getLang, setLang, t, sep } from "./i18n.ts";
import { DeckView, analyzeDeck, type DeckAnalysis } from "./ui/DeckPage.tsx";
import { HandPage } from "./ui/HandPage.tsx";
import { LibraryPage } from "./ui/LibraryPage.tsx";
import { LookupPage } from "./ui/LookupPage.tsx";
import { ProfilePage } from "./ui/ProfilePage.tsx";
import { RoutePage, type RouteView } from "./ui/RoutePage.tsx";

/** A deck opened in the workspace: the saved record, the parsed deck, and what has been computed for it. */
interface Open {
  saved: SavedDeck;
  deck: Deck;
  analysis: DeckAnalysis;
  hand: Card[];
  route: RouteView | null;
  profile: Profile | null;
}

export function App() {
  const [data, setData] = useState<CardData | null>(null);
  const [status, setStatus] = useState(t("加载卡片数据…"));
  const [lang, setLangState] = useState(getLang());
  const [route, setRoute] = useState<Route>(() => parseRoute(location.hash));
  const [decks, setDecks] = useState<SavedDeck[]>([]);
  const [open, setOpen] = useState<Open | null>(null);
  const [seconds, setSeconds] = useState(30);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [images, setImages] = useState(() => localStorage.getItem("images") !== "off");
  const prepared = useRef<{ key: string; planner: DeckPlanner } | null>(null);

  const go = (next: Route) => {
    setRoute(next);
    const hash = routeHash(next);
    if (location.hash !== hash) history.pushState(null, "", hash);
  };
  useEffect(() => {
    const onHash = () => setRoute(parseRoute(location.hash));
    addEventListener("hashchange", onHash);
    return () => removeEventListener("hashchange", onHash);
  }, []);
  useEffect(() => { localStorage.setItem("images", images ? "on" : "off"); }, [images]);

  // Load the card data, the library, and a shared link if the page was opened with one.
  useEffect(() => {
    loadCardData(setStatus).then(async (loaded) => {
      setData(loaded);
      setStatus("");
      const library = await listDecks();
      setDecks(library);
      const shared = readShared(location.hash);
      if (shared.deck) {
        const existing = library.find((deck) => deck.text === shared.deck);
        const saved = existing ?? newDeck(`${t("分享的卡组")} ${library.length + 1}`, shared.deck);
        if (!existing) {
          await saveDeck(saved);
          setDecks(await listDecks());
        }
        if (shared.hand) saved.hand = shared.hand;
        await openDeck(saved, loaded, shared.hand ? "hand" : "overview");
      }
    }).catch((error) => setStatus(`${t("加载失败：")}${error instanceof Error ? error.message : error}`));
  }, []);

  // Open the deck the route names, when it is not open yet.
  useEffect(() => {
    if (!data || route.page !== "deck" || open?.saved.id === route.id) return;
    const saved = decks.find((deck) => deck.id === route.id);
    if (saved) void openDeck(saved, data, route.sub);
    else if (decks.length > 0) go({ page: "library" });
  }, [route, data, decks]);

  async function openDeck(saved: SavedDeck, loaded: CardData, sub: Sub) {
    const deck = await readDeck(saved.text, loaded.cards);
    deck.name = saved.name;
    const pile = deck.main.flatMap((entry) => Array<Card>(entry.count).fill(entry.card));
    const hand = saved.hand.map((id) => pile.find((card) => card.id === id || card.altIds.includes(id))).filter((card): card is Card => !!card);
    setOpen({ saved, deck, analysis: analyzeDeck(deck, loaded), hand, route: null, profile: null });
    go({ page: "deck", id: saved.id, sub });
  }

  /** Change the open deck's saved record and keep the library in step. */
  async function update(changes: Partial<SavedDeck>) {
    let saved: SavedDeck | null = null;
    setOpen((current) => {
      if (!current) return current;
      saved = { ...current.saved, ...changes };
      return { ...current, saved };
    });
    await Promise.resolve(); // let React apply the update above before reading `saved`
    if (!saved && open) saved = { ...open.saved, ...changes };
    if (!saved) return;
    await saveDeck(saved);
    setDecks(await listDecks());
  }

  async function importDeck(text: string, name: string) {
    if (!data) return;
    const deck = await readDeck(text, data.cards); // throws on text that is not a deck
    const saved = newDeck(deck.name || name, text.trim());
    await saveDeck(saved);
    setDecks(await listDecks());
    await openDeck(saved, data, "overview");
  }

  async function plannerFor(current: Open): Promise<DeckPlanner> {
    const key = `${current.saved.id}|${current.saved.updatedAt}|${current.saved.tiers}`;
    if (prepared.current?.key === key) return prepared.current.planner;
    await prepared.current?.planner.close();
    prepared.current = null;
    const planner = await prepareDeck(data!.cards, current.deck, current.saved.tiers, setProgress);
    prepared.current = { key, planner };
    return planner;
  }

  async function plan() {
    if (!data || !open) return;
    setBusy(true);
    setProgress(t("准备引擎…"));
    try {
      const planner = await plannerFor(open);
      const rest = open.deck.main.flatMap((entry) => Array<Card>(entry.count).fill(entry.card));
      for (const card of open.hand) rest.splice(rest.indexOf(card), 1);
      const setup = planner.setupFor(open.hand, rest);
      setProgress(`${t("搜索中…")} ${seconds}${t(" 秒")}`);
      const result: PlanResult = await planner.planner.plan(setup, { nodes: 1_000_000, seconds }, true);
      const best = result.boards[0];
      const traces = {
        main: best ? planner.planner.trace(setup, best.path) : [] as TraceStep[],
        interruptions: result.interruptions.map((item) => (item.board && item.play ? planner.planner.trace(setup, item.board.path, item.play) : null)),
      };
      const byCode = new Map<number, Card>();
      for (const card of data.cards) for (const id of [card.id, ...card.altIds]) byCode.set(id, card);
      const notes = [...planner.tiers.problems];
      if (planner.missing.length > 0) notes.push(`${t("规则引擎还没有这些卡的数据：")}${planner.missing.map((card) => card.cn || card.en).join(sep())}`);
      const view: RouteView = { hand: [...open.hand], result, traces, cardOf: (code) => byCode.get(code), notes };
      setOpen((current) => (current ? { ...current, route: view } : current));
      await update({ hand: open.hand.map((card) => card.id) });
      go({ page: "deck", id: open.saved.id, sub: "route" });
      setProgress("");
    } catch (error) {
      setProgress(`${t("出错：")}${error instanceof Error ? error.message : error}`);
    } finally {
      setBusy(false);
    }
  }

  async function runProfile(hands: number, perHand: number) {
    if (!data || !open) return;
    setBusy(true);
    try {
      const planner = await plannerFor(open);
      const key = `profile:${open.saved.id}|${open.saved.tiers}|${perHand}`;
      const stored = (await kvGet<Record<string, { board: any; seconds: number }>>(key)) ?? {};
      const result = await profileDeck(open.deck, planner.planner, planner.lines, planner.setupFor, {
        hands, seconds: perHand, seed: 20261013, label: open.saved.name,
        cache: { get: (hand) => stored[hand] ?? null, set: (hand, value) => { stored[hand] = value; void kvSet(key, stored); } },
        progress: (done, total, hand) => setProgress(`${done}/${total}：${hand.cards.map((card) => card.cn || card.en).join(sep())} → ${hand.board?.value ?? t("无")}`),
      });
      setOpen((current) => (current ? { ...current, profile: result } : current));
      setProgress("");
    } catch (error) {
      setProgress(`${t("出错：")}${error instanceof Error ? error.message : error}`);
    } finally {
      setBusy(false);
    }
  }

  const inDeck = route.page === "deck" && open?.saved.id === route.id ? open : null;
  const sub = route.page === "deck" ? route.sub : "overview";
  return (
    <>
      <header>
        <div className="brand">Master Duel <span>AI Advisor</span></div>
        <nav>
          <button className={route.page !== "lookup" ? "active" : ""} onClick={() => go({ page: "library" })}>{t("卡组")}</button>
          <button className={route.page === "lookup" ? "active" : ""} onClick={() => go({ page: "lookup" })}>{t("查卡")}</button>
        </nav>
        <label className="toggle"><input type="checkbox" checked={images} onChange={(event) => setImages(event.target.checked)} /> {t("卡图")}</label>
        <button className="ghost small lang" onClick={() => { const next = lang === "zh" ? "en" : "zh"; setLang(next); setLangState(next); }}>{lang === "zh" ? "EN" : "中文"}</button>
      </header>
      {status && <p className="status">{status}</p>}
      {data && route.page === "library" && <LibraryPage decks={decks} onImport={importDeck} onOpen={(id) => go({ page: "deck", id, sub: "overview" })}
        onRename={async (id, name) => { const saved = decks.find((deck) => deck.id === id); if (saved) { await saveDeck({ ...saved, name }); setDecks(await listDecks()); } }}
        onDelete={async (id) => { await deleteDeck(id); setDecks(await listDecks()); if (open?.saved.id === id) setOpen(null); }} />}
      {data && route.page === "lookup" && <LookupPage data={data} images={images} />}
      {data && route.page === "deck" && inDeck && (
        <>
          <div className="workspace-head">
            <button className="ghost small" onClick={() => go({ page: "library" })}>{t("← 我的卡组")}</button>
            <h2>{inDeck.saved.name}</h2>
            <div className="tabs">{SUBS.map((item) => <button key={item.id} className={sub === item.id ? "tab active" : "tab"} onClick={() => go({ page: "deck", id: inDeck.saved.id, sub: item.id })}>{t(item.label)}</button>)}</div>
            <button className="ghost small" onClick={() => { navigator.clipboard?.writeText(shareLink(inDeck.deck, inDeck.hand)); setProgress(t("链接已复制")); }}>{t("复制分享链接")}</button>
          </div>
          {sub === "overview" && <DeckView data={data} deck={inDeck.deck} analysis={inDeck.analysis} images={images} />}
          {sub === "hand" && <HandPage data={data} deck={inDeck.deck} hand={inDeck.hand} setHand={(hand) => setOpen((current) => (current ? { ...current, hand } : current))} tiers={inDeck.saved.tiers}
            setTiers={(tiers) => void update({ tiers })} seconds={seconds} setSeconds={setSeconds} onPlan={plan} busy={busy} progress={progress} images={images} />}
          {sub === "route" && <RoutePage view={inDeck.route} data={data} images={images} />}
          {sub === "profile" && <ProfilePage deck={inDeck.deck} profile={inDeck.profile} onRun={runProfile} busy={busy} progress={progress} data={data}
            onPickHand={(cards) => { setOpen((current) => (current ? { ...current, hand: cards } : current)); go({ page: "deck", id: inDeck.saved.id, sub: "hand" }); }} />}
        </>
      )}
      {data && route.page === "deck" && !inDeck && <p className="status">{t("打开卡组…")}</p>}
      <footer className="muted">{t("卡片数据来自百鸽（ygocdb.com）、Master Duel Meta、Project Ignis；规则引擎是 EDOPro 的核心。卡文和卡图的版权属于 KONAMI。")}{data?.builtAt && `${t(" 数据构建于 ")}${data.builtAt.slice(0, 10)}.`}</footer>
    </>
  );
}
