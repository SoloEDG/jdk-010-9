import type {
  LabDocument,
  ScreenHit,
  Segment,
  TraceResult,
} from "../../../shared/document";
import { MAX_BOUNCES, isEmitter, isGlass } from "../../../shared/document";
import { add, mul, dot, sub, direction, norm } from "../../../shared/geometry";
import { emit, oplToTime, type EmittedRay } from "./emission";
import { nearestSurface } from "./surfaces";
import { reflect, refract, materialIndex } from "./refraction";
import type { Element } from "../../../shared/document";

interface Chain {
  segments: Segment[];
  hits: ScreenHit[];
  power: number;
  escaped: boolean;
  unresolved: boolean;
  bounces: number;
}

/**
 * Trace one ray through the scene, carrying optical path length so arrival
 * times are physical, and recording which solid medium each segment traverses.
 * A ray that exhausts its interaction budget is reported as `unresolved`
 * rather than being silently treated as having left the scene.
 */
function traceRay(doc: LabDocument, source: Element, ray: EmittedRay): Chain {
  const out: Chain = {
    segments: [],
    hits: [],
    power: ray.power,
    escaped: false,
    unresolved: false,
    bounces: 0,
  };
  let o = ray.origin,
    d = ray.direction,
    inside: string | null = null,
    power = ray.power,
    opl = 0,
    // Small offset used to step off a surface; added back so OPL stays exact.
    nudge = 0;
  for (let bounce = 0; bounce < MAX_BOUNCES; bounce++) {
    out.bounces = bounce + 1;
    const hit = nearestSurface(doc.items, o, d);
    const dest = hit?.point ?? add(o, mul(d, 1800));
    const glass = inside ? doc.items.find((it) => it.id === inside) : undefined;
    const medium = glass ? materialIndex(glass.index, source.wavelength) : 1;
    const length = Math.hypot(dest.x - o.x, dest.y - o.y) + nudge;
    const nextOpl = opl + length * medium;
    out.segments.push({
      from: o,
      to: dest,
      power,
      wavelength: source.wavelength,
      source: source.id,
      ray: ray.ray,
      t0: ray.emitAt + oplToTime(opl),
      t1: ray.emitAt + oplToTime(nextOpl),
      opl0: opl,
      opl1: nextOpl,
      medium,
      inGlass: inside !== null,
    });
    out.power = power;
    if (!hit) {
      out.escaped = true;
      break;
    }
    const e = hit.element;
    if (e.kind === "screen") {
      out.hits.push({
        screen: e.id,
        position: dot(sub(hit.point, e), direction(e.angle)),
        power,
        wavelength: source.wavelength,
        source: source.id,
        ray: ray.ray,
        t: ray.emitAt + oplToTime(nextOpl),
        width: source.kind === "pulse" ? source.pulseWidth : Infinity,
        opl: nextOpl,
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
    if (isGlass(e.kind)) {
      const n = materialIndex(e.index, source.wavelength),
        exiting: boolean = inside === e.id,
        transmitted = refract(d, hit.normal, exiting ? n : 1, exiting ? 1 : n);
      if (transmitted) {
        d = transmitted;
        inside = exiting ? null : e.id;
        power *= 0.96;
      } else d = reflect(d, hit.normal);
    }
    opl = nextOpl;
    // Step off the surface by a small epsilon along the outgoing direction.
    // The epsilon is carried in `nudge` and added to the next segment length,
    // so the accumulated OPL matches the physical path.
    const step = 0.01;
    o = add(hit.point, mul(d, step));
    nudge = step;
    out.power = power;
    if (bounce === MAX_BOUNCES - 1) out.unresolved = true;
  }
  return out;
}

export function trace(doc: LabDocument): TraceResult {
  const result: TraceResult = {
    segments: [],
    hits: [],
    totalRays: 0,
    escaped: 0,
    escapedPower: 0,
    unknown: 0,
    unknownPower: 0,
    unknownPaths: [],
  };
  for (const source of doc.items.filter((e) => isEmitter(e.kind)))
    for (const ray of emit(source)) {
      result.totalRays++;
      const chain = traceRay(doc, source, ray);
      result.segments.push(...chain.segments);
      result.hits.push(...chain.hits);
      if (chain.unresolved) {
        result.unknown++;
        result.unknownPower += chain.power;
        result.unknownPaths.push({
          source: source.id,
          ray: ray.ray,
          power: chain.power,
          bounces: chain.bounces,
        });
      } else if (chain.escaped) {
        result.escaped++;
        result.escapedPower += chain.power;
      }
    }
  return result;
}
