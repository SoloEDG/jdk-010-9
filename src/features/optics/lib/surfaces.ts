import type { Element, Point } from "../../../shared/document";
import { endpoints, intersect, prismVertices, direction, add, mul } from "../../../shared/geometry";

export interface SurfaceHit {
  element: Element;
  t: number;
  point: Point;
  normal: Point;
  /** Index within the element's edge list. */
  edge: number;
}

/** Edges [a, b] that bound an optical element. Opened screens still count. */
export function edgesOf(e: Element): [Point, Point][] {
  if (e.kind === "prism") {
    const v = prismVertices(e);
    return v.map((p, i) => [p, v[(i + 1) % 3]] as [Point, Point]);
  }
  if (e.kind === "glass") {
    // Rectangular slab: `size` along the element axis, `thickness` across it.
    const along = direction(e.angle),
      across = direction(e.angle + 90),
      h = e.size / 2,
      t = Math.max(1, e.thickness) / 2;
    const corners = [
      add(add(e, mul(along, -h)), mul(across, -t)),
      add(add(e, mul(along, h)), mul(across, -t)),
      add(add(e, mul(along, h)), mul(across, t)),
      add(add(e, mul(along, -h)), mul(across, t)),
    ];
    return corners.map(
      (p, i) => [p, corners[(i + 1) % 4]] as [Point, Point],
    );
  }
  return [endpoints(e)];
}

export function nearestSurface(
  items: Element[],
  origin: Point,
  directionVec: Point,
): SurfaceHit | null {
  let best: SurfaceHit | null = null;
  for (const e of items) {
    if (e.kind === "source" || e.kind === "pulse") continue;
    const edges = edgesOf(e);
    for (let i = 0; i < edges.length; i++) {
      const [a, b] = edges[i];
      const hit = intersect(origin, directionVec, a, b);
      if (hit && (!best || hit.t < best.t))
        best = { ...hit, element: e, edge: i };
    }
  }
  return best;
}
