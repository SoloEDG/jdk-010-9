export type Kind =
  | "source"
  | "pulse"
  | "mirror"
  | "lens"
  | "prism"
  | "glass"
  | "screen";

export type EmitterKind = "source" | "pulse";

export function isEmitter(kind: Kind): kind is EmitterKind {
  return kind === "source" || kind === "pulse";
}

export function isGlass(kind: Kind): boolean {
  return kind === "prism" || kind === "glass";
}

export interface Point {
  x: number;
  y: number;
}

export interface Element extends Point {
  id: string;
  kind: Kind;
  angle: number;
  size: number;
  power: number;
  rays: number;
  spread: number;
  wavelength: number;
  focal: number;
  index: number;
  /** Glass slab thickness in mm. Ignored by other devices. */
  thickness: number;
  /** Pulse duration in ps. Ignored by continuous sources. */
  pulseWidth: number;
  /** Pulse repetition period in ps. Ignored by continuous sources. */
  period: number;
  /** Time-gate opening on the shared time base, ps. Screens only. */
  gateStart: number;
  /** Time-gate duration, ps. Screens only. */
  gateWidth: number;
}

export type TimingMode = "exact" | "binned";

/**
 * Estimator settings, shared by the chart, the animation and the verdict.
 * The acquisition window itself lives on each screen, because a gated screen
 * is the device that opens its shutter.
 */
export interface AnalysisSettings {
  /** Number of time bins spanning the selected screen's gate. */
  timeBins: number;
  /** Number of position bins spanning the screen aperture. */
  positionBins: number;
  /** Exact interval propagation, or snapping pulses to time bins. */
  mode: TimingMode;
}

export interface LabDocument {
  version: 1;
  items: Element[];
  analysis: AnalysisSettings;
}

export const defaultAnalysis: AnalysisSettings = {
  timeBins: 48,
  positionBins: 64,
  mode: "exact",
};

/** Shared defaults, also used when restoring documents saved before timing. */
export const defaultTiming = {
  thickness: 80,
  pulseWidth: 120,
  period: 600,
  gateStart: 0,
  gateWidth: 6000,
};

export interface Segment {
  from: Point;
  to: Point;
  power: number;
  wavelength: number;
  source: string;
  /** One identifier per traced ray, so parallel paths stay distinguishable. */
  ray: string;
  /** Flight time from emission to the start of this segment, ps. */
  t0: number;
  /** Flight time from emission to the end of this segment, ps. */
  t1: number;
  /** Optical path length (mm) at the start / end of the segment. */
  opl0: number;
  opl1: number;
  /** Refractive index used inside this segment. */
  medium: number;
  /** Whether this segment runs inside a glass element. */
  inGlass: boolean;
}

export interface ScreenHit {
  screen: string;
  position: number;
  power: number;
  wavelength: number;
  source: string;
  ray: string;
  /** Front arrival time after emission, ps. Tail arrives at t + width. */
  t: number;
  /** Pulse duration in ps; Infinity for a continuous source. */
  width: number;
  /** Optical path length from the source to this hit, mm. */
  opl: number;
}

export interface UnknownPath {
  source: string;
  ray: string;
  /** Power still carried when the trace budget ran out, W. */
  power: number;
  /** Interactions spent before giving up. */
  bounces: number;
}

export interface TraceResult {
  segments: Segment[];
  hits: ScreenHit[];
  /** Every emitted ray, including those that never reached a screen. */
  totalRays: number;
  /** Rays that left the scene without meeting any surface (known no signal). */
  escaped: number;
  escapedPower: number;
  /** Rays that exhausted the interaction budget: outcome genuinely unknown. */
  unknown: number;
  unknownPower: number;
  unknownPaths: UnknownPath[];
}

export const labels: Record<Kind, string> = {
  source: "光源",
  pulse: "脉冲光源",
  mirror: "平面镜",
  lens: "凸透镜",
  prism: "三棱镜",
  glass: "玻璃板",
  screen: "接收屏",
};

/** Upper bound on surface interactions for one ray. */
export const MAX_BOUNCES = 32;

export function normalizeElement(e: Element): Element {
  const num = (v: unknown, fallback: number, min: number, max: number) =>
    Number.isFinite(v)
      ? Math.max(min, Math.min(max, Number(v)))
      : fallback;
  return {
    ...e,
    thickness: num(e.thickness, defaultTiming.thickness, 1, 400),
    pulseWidth: num(e.pulseWidth, defaultTiming.pulseWidth, 1, 100000),
    period: num(e.period, defaultTiming.period, 1, 1000000),
    gateStart: num(e.gateStart, defaultTiming.gateStart, -1e7, 1e7),
    gateWidth: num(e.gateWidth, defaultTiming.gateWidth, 1, 1e6),
  };
}

export function normalizeAnalysis(
  a?: Partial<AnalysisSettings> | null,
): AnalysisSettings {
  return {
    timeBins: clampInt(a?.timeBins, 8, 256, defaultAnalysis.timeBins),
    positionBins: clampInt(
      a?.positionBins,
      8,
      256,
      defaultAnalysis.positionBins,
    ),
    mode: a?.mode === "binned" ? "binned" : "exact",
  };
}

export function normalizeDocument(doc: LabDocument): LabDocument {
  return {
    version: 1,
    items: doc.items.map(normalizeElement),
    analysis: normalizeAnalysis(doc.analysis),
  };
}

function clampInt(
  value: number | undefined,
  min: number,
  max: number,
  fallback: number,
): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, Math.round(value!)));
}
