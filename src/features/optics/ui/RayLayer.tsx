import type { LabDocument, TraceResult } from "../../../shared/document";
import { direction } from "../../../shared/geometry";
import { wavelengthColor } from "../lib/emission";
export function RayLayer({
  result,
  visible,
  normals,
  doc,
}: {
  result: TraceResult;
  visible: boolean;
  normals: boolean;
  doc: LabDocument;
}) {
  return (
    <g pointerEvents="none">
      {visible &&
        result.segments.map((s, i) => (
          <line
            key={i}
            x1={s.from.x}
            y1={s.from.y}
            x2={s.to.x}
            y2={s.to.y}
            stroke={wavelengthColor(s.wavelength)}
            strokeWidth="1.3"
            opacity=".7"
          />
        ))}
      {normals &&
        doc.items
          .filter((e) => e.kind !== "source")
          .map((e) => {
            const n = direction(e.angle + 90);
            return (
              <line
                key={e.id}
                x1={e.x - n.x * 50}
                y1={e.y - n.y * 50}
                x2={e.x + n.x * 50}
                y2={e.y + n.y * 50}
                stroke="#f5c778"
                strokeDasharray="4 5"
              />
            );
          })}
    </g>
  );
}
