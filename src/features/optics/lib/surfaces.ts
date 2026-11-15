import type { Element, Point } from "../../../shared/document";
import { endpoints, intersect, prismVertices } from "../../../shared/geometry";
export function nearestSurface(
  items: Element[],
  origin: Point,
  direction: Point,
) {
  let best: {
    element: Element;
    t: number;
    point: Point;
    normal: Point;
  } | null = null;
  for (const e of items) {
    if (e.kind === "source") continue;
    const vertices = e.kind === "prism" ? prismVertices(e) : endpoints(e);
    const edges =
      e.kind === "prism"
        ? vertices.map((v, i) => [v, vertices[(i + 1) % 3]])
        : [vertices];
    for (const [a, b] of edges) {
      const hit = intersect(origin, direction, a, b);
      if (hit && (!best || hit.t < best.t)) best = { ...hit, element: e };
    }
  }
  return best;
}
