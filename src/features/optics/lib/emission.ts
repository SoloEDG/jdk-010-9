import type { Element } from "../../../shared/document";
import { direction, add, mul } from "../../../shared/geometry";
import { isEmitter } from "../../../shared/document";
import { C_MM_PER_PS } from "../../../shared/timing";

export interface EmittedRay {
  origin: { x: number; y: number };
  direction: { x: number; y: number };
  /** Power carried by this ray, W. */
  power: number;
  /** Stable identifier: source id plus fan index. */
  ray: string;
  /** Emission instant on the shared time base, ps. */
  emitAt: number;
}

export function emit(source: Element): EmittedRay[] {
  const count = Math.max(1, Math.min(41, Math.round(source.rays))),
    t = direction(source.angle + 90);
  return Array.from({ length: count }, (_, i) => {
    const q = count === 1 ? 0 : i / (count - 1) - 0.5;
    return {
      origin: add(source, mul(t, q * source.size)),
      direction: direction(source.angle + q * source.spread),
      power: source.power / count,
      ray: `${source.id}#${i}`,
      emitAt: 0,
    };
  });
}

/** Convert optical path length in mm to flight time in ps. */
export function oplToTime(oplMm: number): number {
  return oplMm / C_MM_PER_PS;
}

export function emitters(items: Element[]): Element[] {
  return items.filter((e) => isEmitter(e.kind));
}

export function wavelengthColor(w: number) {
  if (w < 450) return "#9e7bff";
  if (w < 495) return "#63b7ff";
  if (w < 530) return "#5ff1d0";
  if (w < 580) return "#c3f275";
  if (w < 620) return "#ffc767";
  return "#ff7574";
}
