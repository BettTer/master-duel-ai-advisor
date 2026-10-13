import type { Banlist } from "../../../src/banstatus.ts";
import { banStatus } from "../../../src/banstatus.ts";
import type { Card } from "../../../src/merge.ts";
import { cardName, imageUrl } from "../state.ts";

const BAN_BADGE: Record<string, string> = { forbidden: "禁", limited1: "限1", limited2: "准", unlimited: "", unknown: "?" };

/** A compact card: artwork, name, rarity strip and banlist badge. */
export function CardChip({ card, count, banlist, onClick, small, images = true, tone }: {
  card: Card; count?: number; banlist?: Banlist | null; onClick?: () => void; small?: boolean; images?: boolean; tone?: string;
}) {
  const status = banlist ? banStatus(card, banlist.current) : "unknown";
  const badge = BAN_BADGE[status];
  return (
    <div className={`chip rarity-${card.mdRarity || "none"} ${small ? "small" : ""} ${onClick ? "clickable" : ""}`} onClick={onClick} title={card.en} style={tone ? { borderColor: tone } : undefined}>
      {images && <img src={imageUrl(card.id)} alt="" loading="lazy" onError={(event) => { (event.target as HTMLImageElement).style.visibility = "hidden"; }} />}
      <span className="chip-name">{cardName(card)}</span>
      {count !== undefined && count > 1 && <span className="chip-count">×{count}</span>}
      {badge && <span className={`chip-ban ban-${status}`}>{badge}</span>}
    </div>
  );
}

/** Just the name, for dense lists. */
export function CardTag({ card, tone }: { card: Card; tone?: string }) {
  return <span className="tag" style={tone ? { borderColor: tone, color: tone } : undefined}>{cardName(card)}</span>;
}
