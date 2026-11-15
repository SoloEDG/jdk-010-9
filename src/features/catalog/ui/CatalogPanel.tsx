import { Plus } from "lucide-react";
import type { Kind } from "../../../shared/document";
import { labels } from "../../../shared/document";
import { catalog } from "../model/catalog";
export function CatalogPanel({ onAdd }: { onAdd: (kind: Kind) => void }) {
  return (
    <section className="catalog">
      <div className="section-title">
        光学器件 <span>05</span>
      </div>
      <p className="muted">点击添加到实验台</p>
      {catalog.map((c) => (
        <button
          className="catalog-item"
          key={c.kind}
          onClick={() => onAdd(c.kind)}
        >
          <span className={"device-icon " + c.kind}>{c.symbol}</span>
          <span>
            <strong>{labels[c.kind]}</strong>
            <small>{c.subtitle}</small>
          </span>
          <Plus size={14} />
        </button>
      ))}
      <div className="tip">
        <span>✧ 实验提示</span>
        <p>拖动器件探索光路变化，选中器件后可在右侧精确调整参数。</p>
      </div>
    </section>
  );
}
