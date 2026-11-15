import type { LabDocument, TraceResult } from "../../../shared/document";
import { direction } from "../../../shared/geometry";
import { wavelengthColor } from "../lib/emission";

export interface RayLayerProps {
  result: TraceResult;
  visible: boolean;
  normals: boolean;
  doc: LabDocument;
  playhead: number;
}

/**
 * Light paths at the shared clock instant.
 *
 * The full geometry is drawn faintly so the bench is readable when pulses are
 * between repetitions; the portion light has actually crossed by `playhead`
 * is drawn brightly with a leading tip. `playhead === null` means the paused
 * overview, where every path is shown as geometry only.
 */
export function RayLayer({
  result,
  visible,
  normals,
  doc,
  playhead,
}: RayLayerProps) {
  return (
    <g pointerEvents="none">
      {visible &&
        result.segments.map((s, i) => {
          const period = periodOf(doc, s.source);
          const life = lifeFraction(s, playhead, period);
          const tip = {
            x: s.from.x + (s.to.x - s.from.x) * life,
            y: s.from.y + (s.to.y - s.from.y) * life,
          };
          const color = wavelengthColor(s.wavelength);
          return (
            <g key={i}>
              <line
                x1={s.from.x}
                y1={s.from.y}
                x2={s.to.x}
                y2={s.to.y}
                stroke={color}
                strokeWidth={s.inGlass ? 0.9 : 1}
                strokeDasharray={s.inGlass ? "3 5" : undefined}
                opacity={0.14}
              />
              {life > 0 && (
                <line
                  x1={s.from.x}
                  y1={s.from.y}
                  x2={tip.x}
                  y2={tip.y}
                  stroke={color}
                  strokeWidth={s.inGlass ? 1.2 : 1.5}
                  strokeDasharray={s.inGlass ? "3 4" : undefined}
                  opacity={s.inGlass ? 0.95 : 0.85}
                />
              )}
              {life > 0 && life < 1 && (
                <circle cx={tip.x} cy={tip.y} r="2.4" fill="#f2ffd9" opacity=".95" />
              )}
            </g>
          );
        })}
      {normals &&
        doc.items
          .filter((e) => e.kind !== "source" && e.kind !== "pulse")
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

function periodOf(doc: LabDocument, source: string): number | null {
  const s = doc.items.find((e) => e.id === source);
  return s?.kind === "pulse" ? Math.max(1, s.period) : null;
}

/**
 * Fraction of a segment reached by the leading edge of light at instant `now`.
 *
 * Pulses repeat every `period`, so several fronts can exist along one long
 * path. The leading front inside the segment is `elapsed - n·period` with the
 * smallest `n ≥ 0` that keeps it within the segment. This makes the animation
 * and the detector agree exactly: at the recorded arrival instant `t1` the
 * leading edge sits on the screen (fraction 1), and between repetitions on a
 * short path the stretch is dark (fraction 0).
 *
 * Continuous light fills the path and stays lit.
 */
export function lifeFraction(
  segment: { t0: number; t1: number },
  now: number,
  period: number | null,
): number {
  const span = segment.t1 - segment.t0;
  const elapsed = now - segment.t0;
  if (span <= 0) return elapsed >= 0 ? 1 : 0;
  if (!period) return elapsed <= 0 ? 0 : Math.min(1, elapsed / span);
  if (elapsed <= 0) return 0;
  const n = elapsed <= span ? 0 : Math.ceil((elapsed - span) / period);
  const front = elapsed - n * period;
  return front <= 0 ? 0 : Math.min(1, front / span);
}
