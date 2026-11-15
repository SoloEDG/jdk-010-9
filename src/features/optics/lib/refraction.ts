import type { Point } from "../../../shared/document";
import { dot, mul, sub, add, norm } from "../../../shared/geometry";
export function reflect(d: Point, n: Point): Point {
  return norm(sub(d, mul(n, 2 * dot(d, n))));
}
export function refract(
  d: Point,
  normal: Point,
  n1: number,
  n2: number,
): Point | null {
  const n = dot(d, normal) > 0 ? mul(normal, -1) : normal,
    c = -dot(d, n),
    ratio = n1 / n2,
    k = 1 - ratio * ratio * (1 - c * c);
  return k < 0
    ? null
    : norm(add(mul(d, ratio), mul(n, ratio * c - Math.sqrt(k))));
}
export function materialIndex(base: number, wavelength: number) {
  return base + 0.004 * ((550 / wavelength) ** 2 - 1);
}
