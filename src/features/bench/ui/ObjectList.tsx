import type { LabDocument } from "../../../shared/document";
import { labels } from "../../../shared/document";
export function ObjectList({
  doc,
  selected,
  onSelect,
}: {
  doc: LabDocument;
  selected: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <section className="object-list">
      <div className="section-title">
        场景器件 <span>{String(doc.items.length).padStart(2, "0")}</span>
      </div>
      {doc.items.map((e, i) => (
        <button
          key={e.id}
          className={selected === e.id ? "active" : ""}
          onClick={() => onSelect(e.id)}
        >
          <i className={e.kind} />
          <span>
            {labels[e.kind]} {String(i + 1).padStart(2, "0")}
          </span>
          <small>
            {Math.round(e.x)}, {Math.round(e.y)}
          </small>
        </button>
      ))}
    </section>
  );
}
