import type { Banlist } from "../../../src/banstatus.ts";
import { banStatus } from "../../../src/banstatus.ts";
import type { Card } from "../../../src/merge.ts";
import { cardName, imageUrl } from "../state.ts";

/**
 * A compact card, laid out like Master Duel's deck editor: the banlist mark top left, the rarity top right, the
 * number of copies bottom right, the name below. Optional + / − controls for the deck editor.
 */
export function CardChip({ card, count, banlist, onClick, onAdd, onRemove, draggable, small, images = true, tone }: {
  card: Card; count?: number; banlist?: Banlist | null; onClick?: () => void; onAdd?: () => void; onRemove?: () => void;
  draggable?: boolean; small?: boolean; images?: boolean; tone?: string;
}) {
  const status = banlist ? banStatus(card, banlist.current) : "unknown";
  const rarity = card.mdRarity || "";
  return (
    <div
      className={`chip rarity-${rarity || "none"} ${small ? "small" : ""} ${onClick || onAdd ? "clickable" : ""}`}
      onClick={onClick}
      onContextMenu={onRemove ? (event) => { event.preventDefault(); onRemove(); } : undefined}
      draggable={draggable}
      onDragStart={draggable ? (event) => { event.dataTransfer.setData("text/card", String(card.id)); event.dataTransfer.effectAllowed = "copy"; } : undefined}
      title={card.en}
      style={tone ? { borderColor: tone } : undefined}
    >
      <div className="chip-art">
        {images && <img src={imageUrl(card.id)} alt="" loading="lazy" draggable={false} onError={(event) => { (event.target as HTMLImageElement).style.visibility = "hidden"; }} />}
        {status !== "unlimited" && status !== "unknown" && <span className={`chip-ban ban-${status}`} aria-label={status}>{status === "limited1" ? "1" : status === "limited2" ? "2" : ""}</span>}
        {rarity && <span className={`chip-rarity rarity-${rarity}`}>{rarity}</span>}
        {count !== undefined && <span className="chip-count">{count}</span>}
        {(onAdd || onRemove) && (
          <span className="chip-edit">
            {onRemove && <button className="chip-btn" onClick={(event) => { event.stopPropagation(); onRemove(); }}>−</button>}
            {onAdd && <button className="chip-btn" onClick={(event) => { event.stopPropagation(); onAdd(); }}>＋</button>}
          </span>
        )}
      </div>
      <span className="chip-name">{cardName(card)}</span>
    </div>
  );
}

/** Just the name, for dense lists. */
export function CardTag({ card, tone }: { card: Card; tone?: string }) {
  return <span className="tag" style={tone ? { borderColor: tone, color: tone } : undefined}>{cardName(card)}</span>;
}
