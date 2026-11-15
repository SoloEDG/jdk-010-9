import type { Element, ScreenHit } from "../../../shared/document";
export interface Measurement {
  bins: number[];
  energy: number;
  centroid: number;
  spread: number;
  count: number;
  peak: number;
}
export function measure(
  screen: Element | undefined,
  hits: ScreenHit[],
  resolution: number,
): Measurement {
  const valid = screen ? hits.filter((h) => h.screen === screen.id) : [];
  const bins = Array<number>(resolution).fill(0);
  let energy = 0,
    centroid = 0;
  for (const h of valid) {
    const i = Math.max(
      0,
      Math.min(
        resolution - 1,
        Math.floor((h.position / screen!.size + 0.5) * resolution),
      ),
    );
    bins[i] += h.power;
    energy += h.power;
    centroid += h.position * h.power;
  }
  centroid = energy ? centroid / energy : 0;
  const spread = energy
    ? Math.sqrt(
        valid.reduce((s, h) => s + (h.position - centroid) ** 2 * h.power, 0) /
          energy,
      )
    : 0;
  return {
    bins,
    energy,
    centroid,
    spread,
    count: valid.length,
    peak: Math.max(0, ...bins),
  };
}
