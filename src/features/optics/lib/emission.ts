import type { Element } from "../../../shared/document";
import { direction, add, mul } from "../../../shared/geometry";
export function emit(source: Element) {
  const count = Math.max(1, Math.min(41, Math.round(source.rays))),
    t = direction(source.angle + 90);
  return Array.from({ length: count }, (_, i) => {
    const q = count === 1 ? 0 : i / (count - 1) - 0.5;
    return {
      origin: add(source, mul(t, q * source.size)),
      direction: direction(source.angle + q * source.spread),
      power: source.power / count,
    };
  });
}
export function wavelengthColor(w: number) {
  if (w < 450) return "#9e7bff";
  if (w < 495) return "#63b7ff";
  if (w < 530) return "#5ff1d0";
  if (w < 580) return "#c3f275";
  if (w < 620) return "#ffc767";
  return "#ff7574";
}
