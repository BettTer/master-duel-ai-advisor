import { useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { Banlist } from "../../../src/banstatus.ts";
import { banStatus } from "../../../src/banstatus.ts";
import type { Card } from "../../../src/merge.ts";
import { getLang, t } from "../i18n.ts";
import { cardName, imageUrl } from "../state.ts";

const STATUS_TEXT: Record<string, string> = { forbidden: "禁止", limited1: "限制 1", limited2: "准限制 2", unlimited: "无限制" };
const POPOVER_WIDTH = 340;
const POPOVER_HEIGHT = 440;

/** The card's details next to the chip while the mouse is on it; the editor's count controls live here too. */
function Popover({ card, status, count, at, onAdd, onRemove, onEnter, onLeave, images }: {
  card: Card; status: string; count?: number; at: DOMRect; onAdd?: () => void; onRemove?: () => void; onEnter: () => void; onLeave: () => void; images: boolean;
}) {
  const left = at.right + 8 + POPOVER_WIDTH <= window.innerWidth ? at.right + 8 : Math.max(8, at.left - 8 - POPOVER_WIDTH);
  const top = Math.max(8, Math.min(at.top, window.innerHeight - POPOVER_HEIGHT - 8));
  const stats = [card.level !== null ? `★${card.level}` : "", card.link !== null ? `LINK-${card.link}` : "", card.atk !== null ? `ATK ${card.atk}` : "", card.def !== null ? `DEF ${card.def}` : ""].filter(Boolean).join("　");
  const text = getLang() === "en" ? card.descEn || card.descZh : card.descZh || card.descEn;
  return createPortal(
    <div
      className="popover" style={{ left, top, width: POPOVER_WIDTH }} onMouseEnter={onEnter} onMouseLeave={onLeave}
      // A portal still bubbles React events to the chip: clicks here must not count as clicks on the card.
      onClick={(event) => event.stopPropagation()} onContextMenu={(event) => { event.preventDefault(); event.stopPropagation(); }}
    >
      <div className="popover-head">
        {images && <img src={imageUrl(card.id)} alt="" />}
        <div>
          <b>{cardName(card)}</b>
          <div className="muted">{getLang() === "en" ? card.cn : card.en}</div>
          <div className="muted">{getLang() === "en" ? card.typeEn : card.typesZh.split("\n")[0]}</div>
          {stats && <div className="muted">{stats}</div>}
          <div className="popover-tags">
            {card.mdRarity ? <span className={`chip-rarity rarity-${card.mdRarity}`}>{card.mdRarity}</span> : <span className="muted">{t("未实装")}</span>}
            {STATUS_TEXT[status] && <span className={`tag ban-text ${status}`}>{t(STATUS_TEXT[status])}</span>}
          </div>
          {(onAdd || onRemove) && (
            <div className="popover-count">
              <button className="chip-btn" onClick={onRemove} disabled={!onRemove || !count}>−</button>
              <b>{count ?? 0}</b>
              <button className="chip-btn" onClick={onAdd} disabled={!onAdd}>＋</button>
            </div>
          )}
        </div>
      </div>
      <p className="popover-text">{text}</p>
    </div>,
    document.body,
  );
}

/**
 * A compact card, laid out like Master Duel's deck editor: the banlist mark top left, the rarity top right, the
 * number of copies bottom right, the name below. Hovering it shows the card's details.
 */
export function CardChip({ card, count, banlist, onClick, onAdd, onRemove, draggable, small, images = true, tone }: {
  card: Card; count?: number; banlist?: Banlist | null; onClick?: () => void; onAdd?: () => void; onRemove?: () => void;
  draggable?: boolean; small?: boolean; images?: boolean; tone?: string;
}) {
  const status = banlist ? banStatus(card, banlist.current) : "unknown";
  const rarity = card.mdRarity || "";
  const [shown, setShown] = useState<DOMRect | null>(null);
  const hideTimer = useRef<number | undefined>(undefined);
  const show = (event: React.MouseEvent<HTMLElement>) => { window.clearTimeout(hideTimer.current); setShown(event.currentTarget.getBoundingClientRect()); };
  const hideSoon = () => { window.clearTimeout(hideTimer.current); hideTimer.current = window.setTimeout(() => setShown(null), 150); };
  const hide = () => { window.clearTimeout(hideTimer.current); setShown(null); };
  let popover: ReactNode = null;
  if (shown) popover = <Popover card={card} status={status} count={count} at={shown} onAdd={onAdd} onRemove={onRemove} onEnter={() => window.clearTimeout(hideTimer.current)} onLeave={hide} images={images} />;
  return (
    <div
      className={`chip rarity-${rarity || "none"} ${small ? "small" : ""} ${onClick || onAdd ? "clickable" : ""}`}
      onClick={onClick ?? onAdd}
      onContextMenu={onRemove ? (event) => { event.preventDefault(); onRemove(); } : undefined}
      onMouseEnter={show}
      onMouseLeave={hideSoon}
      draggable={draggable}
      onDragStart={draggable ? (event) => { hide(); event.dataTransfer.setData("text/card", String(card.id)); event.dataTransfer.effectAllowed = "copy"; } : undefined}
      style={tone ? { borderColor: tone } : undefined}
    >
      <div className="chip-art">
        {images && <img src={imageUrl(card.id)} alt="" loading="lazy" draggable={false} onError={(event) => { (event.target as HTMLImageElement).style.visibility = "hidden"; }} />}
        {status !== "unlimited" && status !== "unknown" && <span className={`chip-ban ban-${status}`} aria-label={status}>{status === "limited1" ? "1" : status === "limited2" ? "2" : ""}</span>}
        {rarity && <span className={`chip-rarity rarity-${rarity}`}>{rarity}</span>}
        {count !== undefined && <span className="chip-count">{count}</span>}
      </div>
      <span className="chip-name">{cardName(card)}</span>
      {popover}
    </div>
  );
}

/** Just the name, for dense lists. */
export function CardTag({ card, tone }: { card: Card; tone?: string }) {
  return <span className="tag" style={tone ? { borderColor: tone, color: tone } : undefined}>{cardName(card)}</span>;
}
