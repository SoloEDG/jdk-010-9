/**
 * Shared time base for every timing feature.
 *
 * Distances are millimetres and times are picoseconds, so light in vacuum
 * covers C_MM_PER_PS millimetres per picosecond (≈ 0.2998 mm/ps).
 * Optical path length (OPL) is Σ n·L and arrival time is OPL / C.
 */
export const C_MM_PER_PS = 0.299792458;

export function travelTime(oplMm: number, medium = 1): number {
  return (oplMm * medium) / C_MM_PER_PS;
}

export interface TimeGate {
  /** Opening time of the acquisition window, ps. May be negative. */
  start: number;
  /** Duration of the acquisition window, ps. Always positive. */
  width: number;
}

export const gateEnd = (g: TimeGate) => g.start + g.width;
export const gateCenter = (g: TimeGate) => g.start + g.width / 2;

export function overlapLength(
  a0: number,
  a1: number,
  b0: number,
  b1: number,
): number {
  return Math.max(0, Math.min(a1, b1) - Math.max(a0, b0));
}

export function clipToGate(
  start: number,
  end: number,
  gate: TimeGate,
): { start: number; end: number } | null {
  const a = Math.max(start, gate.start),
    b = Math.min(end, gateEnd(gate));
  return b > a ? { start: a, end: b } : null;
}

export interface PulseInterval {
  /** Index of the repetition period. Negative values are pulses emitted before t=0. */
  periodIndex: number;
  start: number;
  end: number;
}

/**
 * All pulses of a periodic train that intersect the acquisition window.
 *
 * The train is treated as steady state: negative period indices are included,
 * so the tail of the period immediately before the window is never dropped.
 * Returns the intervals and how many were cut by the safety cap.
 */
export function pulseIntervals(
  arrival: number,
  width: number,
  period: number,
  gate: TimeGate,
  cap = 2048,
): { intervals: PulseInterval[]; dropped: number } {
  if (!(period > 0) || !(width > 0)) return { intervals: [], dropped: 0 };
  const first = Math.floor((gate.start - width - arrival) / period);
  const last = Math.floor((gateEnd(gate) - arrival) / period);
  const total = Math.max(0, last - first + 1);
  const startIndex = total > cap ? last - cap + 1 : first;
  const intervals: PulseInterval[] = [];
  for (let n = startIndex; n <= last; n++) {
    const start = arrival + n * period,
      end = start + width;
    if (overlapLength(start, end, gate.start, gateEnd(gate)) > 0)
      intervals.push({ periodIndex: n, start, end });
  }
  return { intervals, dropped: Math.max(0, total - cap) };
}

/** Energy (W·ps) a periodic train delivers into a window, ignoring geometry. */
export function periodicEnergy(
  power: number,
  width: number,
  period: number,
  gate: TimeGate,
): number {
  return power * pulseIntervals(0, width, period, gate).intervals.reduce(
    (sum, iv) => sum + overlapLength(iv.start, iv.end, gate.start, gateEnd(gate)),
    0,
  );
}

/** Energy a continuous source delivers into a window. */
export function continuousEnergy(power: number, gate: TimeGate): number {
  return power * gate.width;
}
