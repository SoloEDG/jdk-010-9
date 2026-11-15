import type { Point } from "../../../shared/document";
export function worldPoint(svg: SVGSVGElement, x: number, y: number): Point {
  const matrix = svg.getScreenCTM();
  if (!matrix) return { x: 500, y: 300 };
  const p = new DOMPoint(x, y).matrixTransform(matrix.inverse());
  return {
    x: Math.max(20, Math.min(980, p.x)),
    y: Math.max(20, Math.min(580, p.y)),
  };
}
