import type { LabDocument, TraceResult } from "../../../shared/document";
import { add, mul, dot, sub, direction, norm } from "../../../shared/geometry";
import { emit } from "./emission";
import { nearestSurface } from "./surfaces";
import { reflect, refract, materialIndex } from "./refraction";
export function trace(doc: LabDocument): TraceResult {
  const result: TraceResult = { segments: [], hits: [], truncated: 0 };
  for (const source of doc.items.filter((e) => e.kind === "source"))
    for (const ray of emit(source)) {
      let o = ray.origin,
        d = ray.direction,
        inside: string | null = null,
        power = ray.power;
      for (let bounce = 0; bounce < 32; bounce++) {
        const hit = nearestSurface(doc.items, o, d);
        const dest = hit?.point ?? add(o, mul(d, 1800));
        result.segments.push({
          from: o,
          to: dest,
          power,
          wavelength: source.wavelength,
          source: source.id,
        });
        if (!hit) break;
        const e = hit.element;
        if (e.kind === "screen") {
          result.hits.push({
            screen: e.id,
            position: dot(sub(hit.point, e), direction(e.angle)),
            power,
            wavelength: source.wavelength,
            source: source.id,
          });
          break;
        }
        if (e.kind === "mirror") d = reflect(d, hit.normal);
        if (e.kind === "lens") {
          const axis = direction(e.angle - 90),
            tangent = direction(e.angle),
            forward = dot(d, axis) >= 0 ? 1 : -1,
            u = dot(sub(hit.point, e), tangent),
            axial = Math.max(0.0001, Math.abs(dot(d, axis))),
            slope = dot(d, tangent) / axial - u / e.focal;
          d = norm(add(mul(axis, forward), mul(tangent, slope)));
        }
        if (e.kind === "prism") {
          const n = materialIndex(e.index, source.wavelength),
            exiting: boolean = inside === e.id,
            transmitted = refract(
              d,
              hit.normal,
              exiting ? n : 1,
              exiting ? 1 : n,
            );
          if (transmitted) {
            d = transmitted;
            inside = exiting ? null : e.id;
            power *= 0.96;
          } else d = reflect(d, hit.normal);
        }
        o = add(hit.point, mul(d, 0.01));
        if (bounce === 31) result.truncated++;
      }
    }
  return result;
}
