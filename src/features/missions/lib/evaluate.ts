import type { LabDocument, TraceResult } from "../../../shared/document";
export function evaluateMission(
  id: string,
  doc: LabDocument,
  result: TraceResult,
) {
  const energy = doc.items
    .filter((e) => e.kind === "source")
    .reduce((s, e) => s + e.power, 0);
  const hits = result.hits;
  const received = hits.reduce((s, h) => s + h.power, 0);
  const center = received
    ? hits.reduce((s, h) => s + h.position * h.power, 0) / received
    : 0;
  const rms = received
    ? Math.sqrt(
        hits.reduce((s, h) => s + (h.position - center) ** 2 * h.power, 0) /
          received,
      )
    : Infinity;
  const ratio = energy ? received / energy : 0;
  const prism = doc.items.some((e) => e.kind === "prism");
  const complete =
    id === "focus"
      ? ratio >= 0.8 && rms <= 3
      : id === "reflection"
        ? ratio >= 0.8
        : ratio >= 0.6 && prism;
  return {
    complete,
    ratio,
    rms,
    progress: Math.min(
      1,
      id === "focus"
        ? Math.min(ratio / 0.8, 3 / Math.max(3, rms))
        : ratio / (id === "reflection" ? 0.8 : 0.6),
    ),
  };
}
