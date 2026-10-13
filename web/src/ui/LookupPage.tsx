import { useMemo, useState } from "react";
import { banStatus } from "../../../src/banstatus.ts";
import type { Card } from "../../../src/merge.ts";
import { searchCards } from "../../../src/query.ts";
import type { CardData } from "../data/cards.ts";
import { cardName, imageUrl } from "../state.ts";
import { CardChip } from "./CardChip.tsx";

const BAN_TEXT: Record<string, string> = { forbidden: "禁止", limited1: "限制 1", limited2: "准限制 2", unlimited: "无限制", unknown: "未知" };

export function LookupPage({ data, images }: { data: CardData; images: boolean }) {
  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const [kind, setKind] = useState("");
  const [level, setLevel] = useState("");
  const [picked, setPicked] = useState<Card | null>(null);
  const results = useMemo(() => {
    if (!name && !text && !kind && !level) return [];
    return searchCards(data.cards, { name: name || undefined, text: text ? [text] : undefined, kind: kind ? [kind] : undefined, level: level || undefined }).slice(0, 80);
  }, [data, name, text, kind, level]);
  return (
    <div className="page lookup">
      <section className="panel">
        <h2>查卡</h2>
        <div className="row">
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="卡名，中、英、日都行" />
          <input value={text} onChange={(event) => setText(event.target.value)} placeholder="卡文里的词，比如 调整＋调整以外的怪兽1只以上" />
          <select value={kind} onChange={(event) => setKind(event.target.value)}>
            <option value="">种类</option>
            {["怪兽", "调整", "融合", "同调", "超量", "连接", "仪式", "灵摆", "魔法", "速攻", "永续", "场地", "装备", "陷阱", "反击"].map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
          <input value={level} onChange={(event) => setLevel(event.target.value)} placeholder="等级：12、4-8、8-" style={{ width: "9em" }} />
        </div>
        <p className="muted">{results.length > 0 ? `${results.length} 张（最多显示 80）` : "只显示 MD 已实装的卡。"}</p>
        <div className="wall-cards">{results.map((card) => <CardChip key={card.id} card={card} banlist={data.banlist} onClick={() => setPicked(card)} images={images} />)}</div>
      </section>
      {picked && (
        <section className="panel detail">
          {images && <img className="art" src={imageUrl(picked.id)} alt="" />}
          <div>
            <h2>{cardName(picked)} <span className="muted">{picked.en}{picked.md && picked.md !== picked.cn ? ` · MD：${picked.md}` : ""}</span></h2>
            <p>{picked.typesZh.split("\n").join(" ")} · {picked.mdRarity || "未实装"} · {BAN_TEXT[banStatus(picked, data.banlist.current)]} · <a href={`https://ygocdb.com/card/${picked.id}`} target="_blank" rel="noreferrer">百鸽（含裁定）</a></p>
            <pre>{picked.descZh}</pre>
            {picked.pdescZh && <pre>{picked.pdescZh}</pre>}
            {picked.jp && <p className="muted">{picked.jp}</p>}
          </div>
        </section>
      )}
    </div>
  );
}
