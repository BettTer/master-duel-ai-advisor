import { useState } from "react";
import type { SavedDeck } from "../data/store.ts";
import { t } from "../i18n.ts";

/** The deck library: every deck the user imported, and the box to import another. */
export function LibraryPage({ decks, onImport, onOpen, onRename, onDelete }: {
  decks: SavedDeck[]; onImport: (text: string, name: string) => Promise<void>; onOpen: (id: string) => void;
  onRename: (id: string, name: string) => void; onDelete: (id: string) => void;
}) {
  const [text, setText] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function load() {
    setBusy(true);
    setError("");
    try {
      await onImport(text, name.trim() || `${t("新卡组")} ${decks.length + 1}`);
      setText("");
      setName("");
    } catch (failure) {
      setError(String(failure instanceof Error ? failure.message : failure));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="page">
      <section className="panel">
        <h2>{t("我的卡组")}</h2>
        {decks.length === 0 ? <p className="muted">{t("还没有卡组。下面导入一副，它会一直留在这个浏览器里。")}</p> : (
          <ul className="decks">{decks.map((deck) => (
            <li key={deck.id}>
              <button className="deck-open" onClick={() => onOpen(deck.id)}>{deck.name}</button>
              <span className="muted">{deck.updatedAt.slice(0, 10)}{deck.tiers ? t(" · 有终端清单") : ""}</span>
              <button className="ghost small" onClick={() => { const next = prompt(t("卡组名字"), deck.name); if (next?.trim()) onRename(deck.id, next.trim()); }}>{t("改名")}</button>
              <button className="ghost small" onClick={() => { if (confirm(`${t("删除")} ${deck.name}?`)) onDelete(deck.id); }}>{t("删除")}</button>
            </li>
          ))}</ul>
        )}
      </section>
      <section className="panel">
        <h2>{t("导入卡组")}</h2>
        <p className="muted">{t("粘贴 YDKE 字符串、.ydk 的内容，或者一行一张的卡表（`3 灰流丽`、`Ash Blossom x3`）。Master Duel 的卡组可以通过官方卡片数据库导出 YDKE。")}</p>
        <div className="row"><input value={name} onChange={(event) => setName(event.target.value)} placeholder={t("名字（可选）")} /></div>
        <textarea rows={5} value={text} onChange={(event) => setText(event.target.value)} placeholder="ydke://…" />
        <div className="row">
          <button onClick={load} disabled={busy || !text.trim()}>{t("导入")}</button>
          {error && <span className="error">{error}</span>}
        </div>
      </section>
    </div>
  );
}
