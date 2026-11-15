import type {
  Element,
  LabDocument,
  ScreenHit,
  TraceResult,
} from "../../../shared/document";
import {
  gateEnd,
  overlapLength,
  periodicEnergy,
  pulseIntervals,
  type TimeGate,
} from "../../../shared/timing";

/**
 * Resource boundaries for time-domain accumulation.
 *
 * With the documented parameter ranges (gate ≤ 20 000 ps, period ≥ 50 ps,
 * ≤ 41 rays per emitter) a single screen needs at most ~400 repetitions per
 * arriving ray, so these caps are only reachable through pathological scenes.
 * When they do trip the analysis is flagged `truncated`, never silently
 * shortened: the UI marks it and the mission verdict refuses to declare success.
 */
export const MAX_EVENTS = 60_000;
export const MAX_CELL_UPDATES = 3_000_000;

export interface GateEvent {
  screen: string;
  source: string;
  ray: string;
  position: number;
  wavelength: number;
  /** Power of the pulse, W. */
  power: number;
  /** Interval clipped to the acquisition window, ps. */
  start: number;
  end: number;
  /** Unclipped interval, ps (infinite for continuous light). */
  rawStart: number;
  rawEnd: number;
  periodIndex: number;
  /** False for a continuous source, whose light fills the whole window. */
  pulsed: boolean;
  /** Pulse duration, ps; Infinity for continuous light. */
  width: number;
}

export interface GateGrid {
  timeBins: number;
  positionBins: number;
  /** Energy per (time, position) cell, W·ps. Row-major, time major. */
  cells: Float64Array;
  /** Bin centre times, ps. */
  time: number[];
  /** Bin centre positions, mm. */
  position: number[];
}

export interface TimingError {
  /** Measured L1 difference between the exact and binned grids, W·ps. */
  l1: number;
  /** Largest single-cell difference, W·ps. */
  maxCell: number;
  /** Conservative bound on L1: 2·(pulsed energy inside the gate). */
  boundL1: number;
  /** Arrival-time uncertainty from binning, ps (one bin). */
  timeResolution: number;
  /** Position quantisation, mm (one position bin). */
  positionResolution: number;
  /** True when a bin is narrower than the narrowest pulse: binning is lossy. */
  binNarrowerThanPulse: boolean;
  /** Exact estimator's work (cell updates) versus the binned one's. */
  exactWork: number;
  binnedWork: number;
}

export interface Coincidence {
  /** Longest overlap between a pulse from one source and a pulse from another, ps. */
  overlap: number;
  sources: [string, string] | null;
  /** When that overlap starts, ps. */
  at: number | null;
  /** Whether continuous light from two sources overlaps the whole window. */
  continuous: boolean;
}

export interface ScreenAnalysis {
  gate: TimeGate;
  binWidth: number;
  posBinWidth: number;
  events: GateEvent[];
  exact: GateGrid;
  binned: GateGrid;
  /** Per-source grids in the same order as `sources`. */
  bySourceExact: Float64Array[];
  bySourceBinned: Float64Array[];
  /** Emitter ids that actually reach this screen, in scene order. */
  sources: string[];
  displayMode: "exact" | "binned";
  display: GateGrid;
  /** Marginals over arrival time, W·ps per bin. */
  timeExact: number[];
  timeBinned: number[];
  energy: number;
  energyBinned: number;
  centroidTime: number;
  spreadTime: number;
  centroidPosition: number;
  spreadPosition: number;
  /** Largest time-bin energy in the drawn grid, W·ps. */
  peakCell: number;
  error: TimingError;
  cost: { exact: number; binned: number };
  /** Arriving rays whose pulse train never overlaps the window. */
  arrivalsOutsideGate: number;
  /** True when at least one pulsed emitter reaches this screen. */
  hasPulsedArrivals: boolean;
  /** Repetitions omitted by the safety cap (resource limit, not no-signal). */
  droppedPeriods: number;
  /** True when event/cell caps were hit: the histogram is incomplete. */
  truncated: boolean;
  /** Arriving rays for this screen, before repetition expansion. */
  arrivals: ArrivalInfo[];
  perSourceEnergy: { source: string; energy: number }[];
  coincidence: Coincidence;
  /**
   * What the *displayed* grid can resolve about coincidence: longest run of
   * time bins in which two different sources both deposit energy, in ps.
   * The physical overlap is `coincidence.overlap`; when the cheap estimator
   * is displayed and bins are coarser/finer than the pulses, this can differ.
   */
  displayCoincidence: { overlap: number; sources: [string, string] | null };
}

export interface ArrivalInfo {
  source: string;
  ray: string;
  position: number;
  /** Front arrival time of the first emitted pulse, ps. */
  t: number;
  /** Optical path length from emitter to screen, mm. */
  opl: number;
  width: number;
  power: number;
}

export function sourceOf(doc: LabDocument, id: string): Element | undefined {
  return doc.items.find((e) => e.id === id);
}

/** Energy a source emits into the window per gate, W·ps. */
export function gateEnergyOfSource(source: Element, gate: TimeGate): number {
  if (source.kind !== "pulse") return source.power * gate.width;
  return periodicEnergy(source.power, source.pulseWidth, source.period, gate);
}

/** Build all in-window arrival events for one screen. */
export function eventsForScreen(
  doc: LabDocument,
  hits: ScreenHit[],
  screen: Element,
  gate: TimeGate,
  eventBudget = MAX_EVENTS,
): {
  events: GateEvent[];
  outside: number;
  droppedPeriods: number;
  truncated: boolean;
} {
  const events: GateEvent[] = [];
  let outside = 0,
    droppedPeriods = 0,
    truncated = false;
  for (const hit of hits) {
    if (hit.screen !== screen.id) continue;
    const source = sourceOf(doc, hit.source);
    if (!source) continue;
    if (source.kind !== "pulse" || !Number.isFinite(hit.width)) {
      if (events.length >= eventBudget) {
        truncated = true;
        continue;
      }
      events.push({
        screen: screen.id,
        source: source.id,
        ray: hit.ray,
        position: hit.position,
        wavelength: hit.wavelength,
        power: hit.power,
        start: gate.start,
        end: gateEnd(gate),
        rawStart: -Infinity,
        rawEnd: Infinity,
        periodIndex: 0,
        pulsed: false,
        width: Infinity,
      });
      continue;
    }
    const train = pulseIntervals(hit.t, hit.width, source.period, gate);
    droppedPeriods += train.dropped;
    if (!train.intervals.length) {
      outside++;
      continue;
    }
    for (const iv of train.intervals) {
      if (events.length >= eventBudget) {
        truncated = true;
        break;
      }
      events.push({
        screen: screen.id,
        source: source.id,
        ray: hit.ray,
        position: hit.position,
        wavelength: hit.wavelength,
        power: hit.power,
        start: Math.max(iv.start, gate.start),
        end: Math.min(iv.end, gateEnd(gate)),
        rawStart: iv.start,
        rawEnd: iv.end,
        periodIndex: iv.periodIndex,
        pulsed: true,
        width: hit.width,
      });
    }
  }
  return { events, outside, droppedPeriods, truncated };
}

function makeGrid(
  gate: TimeGate,
  timeBins: number,
  positionBins: number,
  screenSize: number,
): GateGrid {
  const bw = gate.width / timeBins,
    pw = screenSize / positionBins;
  return {
    timeBins,
    positionBins,
    cells: new Float64Array(timeBins * positionBins),
    time: Array.from({ length: timeBins }, (_, i) => gate.start + (i + 0.5) * bw),
    position: Array.from(
      { length: positionBins },
      (_, j) => (j + 0.5 - positionBins / 2) * pw,
    ),
  };
}

export function positionBin(position: number, screenSize: number, bins: number) {
  const f = position / screenSize + 0.5;
  return Math.max(0, Math.min(bins - 1, Math.floor(f * bins)));
}

/**
 * Accumulate the joint (arrival time, screen position) distribution twice.
 *
 * `exact` integrates every pulse interval against each overlapping time bin,
 * so no energy is moved; it is the true gate integral at bin resolution.
 * `binned` snaps each whole pulse into the bin holding its midpoint, at one
 * operation per pulse. Their L1 difference is measured, and bounded above by
 * twice the total in-window pulsed energy.
 */
export function accumulate(
  events: GateEvent[],
  screen: Element,
  gate: TimeGate,
  timeBins: number,
  positionBins: number,
  sourceIds: string[] = [],
) {
  const exact = makeGrid(gate, timeBins, positionBins, screen.size),
    binned = makeGrid(gate, timeBins, positionBins, screen.size);
  const bySourceExact = sourceIds.map(
      () => new Float64Array(timeBins * positionBins),
    ),
    bySourceBinned = sourceIds.map(
      () => new Float64Array(timeBins * positionBins),
    );
  const sourceIndex = new Map(sourceIds.map((id, i) => [id, i]));
  const binWidth = gate.width / timeBins;
  let costExact = 0,
    costBinned = 0,
    pulsedEnergy = 0,
    binNarrowerThanPulse = false,
    truncated = false;

  for (const ev of events) {
    const pIdx = positionBin(ev.position, screen.size, positionBins);
    const energy = ev.power * (ev.end - ev.start);
    const sIdx = sourceIndex.get(ev.source) ?? -1;
    if (!ev.pulsed) {
      // Uniform continuous illumination is identical in both estimators.
      for (let i = 0; i < timeBins; i++) {
        const b0 = gate.start + i * binWidth,
          b1 = b0 + binWidth,
          v = ev.power * overlapLength(b0, b1, ev.start, ev.end);
        const k = i * positionBins + pIdx;
        exact.cells[k] += v;
        binned.cells[k] += v;
        if (sIdx >= 0) {
          bySourceExact[sIdx][k] += v;
          bySourceBinned[sIdx][k] += v;
        }
      }
      costExact += timeBins;
      costBinned += timeBins;
      continue;
    }
    pulsedEnergy += energy;
    if (binWidth < ev.width) binNarrowerThanPulse = true;
    const i0 = Math.max(
        0,
        Math.min(timeBins - 1, Math.floor((ev.start - gate.start) / binWidth)),
      ),
      i1 = Math.max(
        0,
        Math.min(timeBins - 1, Math.floor((ev.end - gate.start) / binWidth)),
      );
    for (let i = i0; i <= i1; i++) {
      if (costExact >= MAX_CELL_UPDATES) {
        truncated = true;
        break;
      }
      const b0 = gate.start + i * binWidth,
        b1 = b0 + binWidth,
        v = ev.power * overlapLength(b0, b1, ev.start, ev.end);
      costExact++;
      if (v <= 0) continue;
      const k = i * positionBins + pIdx;
      exact.cells[k] += v;
      if (sIdx >= 0) bySourceExact[sIdx][k] += v;
    }
    // Binned: one bucket for the whole pulse, chosen by its midpoint.
    const midIdx = Math.max(
      0,
      Math.min(
        timeBins - 1,
        Math.floor(((ev.start + ev.end) / 2 - gate.start) / binWidth),
      ),
    );
    const mk = midIdx * positionBins + pIdx;
    binned.cells[mk] += energy;
    if (sIdx >= 0) bySourceBinned[sIdx][mk] += energy;
    costBinned++;
  }

  let l1 = 0,
    maxCell = 0;
  for (let i = 0; i < exact.cells.length; i++) {
    const d = Math.abs(exact.cells[i] - binned.cells[i]);
    l1 += d;
    if (d > maxCell) maxCell = d;
  }

  return {
    exact,
    binned,
    bySourceExact,
    bySourceBinned,
    timeExact: marginal(exact),
    timeBinned: marginal(binned),
    cost: { exact: costExact, binned: costBinned },
    truncated,
    error: {
      l1,
      maxCell,
      boundL1: 2 * pulsedEnergy,
      timeResolution: binWidth,
      positionResolution: screen.size / positionBins,
      binNarrowerThanPulse,
      exactWork: costExact,
      binnedWork: costBinned,
    } satisfies TimingError,
  };
}

export function marginal(g: GateGrid): number[] {
  const out = Array<number>(g.timeBins).fill(0);
  for (let i = 0; i < g.timeBins; i++)
    for (let j = 0; j < g.positionBins; j++)
      out[i] += g.cells[i * g.positionBins + j];
  return out;
}

/** Grid-derived statistics so the chart, read-outs and verdict share one basis. */
export function gridStats(g: GateGrid) {
  let e = 0;
  for (const v of g.cells) e += v;
  if (e <= 0)
    return {
      energy: 0,
      centroidTime: NaN,
      spreadTime: NaN,
      centroidPosition: NaN,
      spreadPosition: NaN,
      peak: 0,
    };
  let t = 0,
    p = 0;
  for (let i = 0; i < g.timeBins; i++)
    for (let j = 0; j < g.positionBins; j++) {
      const v = g.cells[i * g.positionBins + j];
      t += g.time[i] * v;
      p += g.position[j] * v;
    }
  const ct = t / e,
    cp = p / e;
  let tv = 0,
    pv = 0;
  for (let i = 0; i < g.timeBins; i++)
    for (let j = 0; j < g.positionBins; j++) {
      const v = g.cells[i * g.positionBins + j];
      tv += v * (g.time[i] - ct) ** 2;
      pv += v * (g.position[j] - cp) ** 2;
    }
  return {
    energy: e,
    centroidTime: ct,
    spreadTime: Math.sqrt(tv / e),
    centroidPosition: cp,
    spreadPosition: Math.sqrt(pv / e),
    peak: Math.max(0, ...marginal(g)),
  };
}

/**
 * Resolution-independent statistics, taken from the arrival events themselves
 * rather than the drawn grid. Verdicts use these, so changing the number of
 * bins changes the picture and the reported quantisation error but never flips
 * a pass/fail. A pulse is treated as a uniform interval: mean at its centre,
 * variance width²/12, which keeps the gate-integrated moments exact.
 */
export function eventStats(events: GateEvent[]) {
  let e = 0,
    t = 0,
    p = 0;
  for (const ev of events) {
    const w = ev.power * (ev.end - ev.start);
    e += w;
    t += ((ev.start + ev.end) / 2) * w;
    p += ev.position * w;
  }
  if (e <= 0)
    return {
      energy: 0,
      centroidTime: NaN,
      spreadTime: NaN,
      centroidPosition: NaN,
      spreadPosition: NaN,
    };
  const ct = t / e,
    cp = p / e;
  let tv = 0,
    pv = 0;
  for (const ev of events) {
    const w = ev.power * (ev.end - ev.start),
      mid = (ev.start + ev.end) / 2,
      half = (ev.end - ev.start) / 2;
    tv += w * ((mid - ct) ** 2 + (half * half) / 3);
    pv += w * (ev.position - cp) ** 2;
  }
  return {
    energy: e,
    centroidTime: ct,
    spreadTime: Math.sqrt(tv / e),
    centroidPosition: cp,
    spreadPosition: Math.sqrt(pv / e),
  };
}

export function analyzeScreen(
  doc: LabDocument,
  result: TraceResult,
  screen: Element,
): ScreenAnalysis {
  const gate: TimeGate = {
    start: screen.gateStart,
    width: screen.gateWidth,
  };
  const { events, outside, droppedPeriods, truncated } = eventsForScreen(
    doc,
    result.hits,
    screen,
    gate,
  );
  const timeBins = doc.analysis.timeBins,
    positionBins = doc.analysis.positionBins;
  const screenHits = result.hits.filter((h) => h.screen === screen.id);
  // Scene order keeps colours and legends stable as the geometry changes.
  const sources = doc.items
    .filter((e) => e.kind === "source" || e.kind === "pulse")
    .filter((e) => screenHits.some((h) => h.source === e.id))
    .map((e) => e.id);
  const acc = accumulate(
    events,
    screen,
    gate,
    timeBins,
    positionBins,
    sources,
  );
  const display = doc.analysis.mode === "binned" ? acc.binned : acc.exact;
  // Read-outs and verdict: unquantised. Drawn grid: quantised, for the chart.
  const stats = eventStats(events);
  const grid = gridStats(display);

  const arrivals: ArrivalInfo[] = [];
  const seenRay = new Set<string>();
  for (const h of screenHits) {
    if (seenRay.has(h.ray)) continue;
    seenRay.add(h.ray);
    arrivals.push({
      source: h.source,
      ray: h.ray,
      position: h.position,
      t: h.t,
      opl: h.opl,
      width: h.width,
      power: h.power,
    });
  }

  const perSource = new Map<string, number>();
  for (const ev of events)
    perSource.set(
      ev.source,
      (perSource.get(ev.source) ?? 0) + ev.power * (ev.end - ev.start),
    );

  return {
    gate,
    binWidth: gate.width / timeBins,
    posBinWidth: screen.size / positionBins,
    events,
    exact: acc.exact,
    binned: acc.binned,
    bySourceExact: acc.bySourceExact,
    bySourceBinned: acc.bySourceBinned,
    sources,
    displayMode: doc.analysis.mode,
    display,
    timeExact: acc.timeExact,
    timeBinned: acc.timeBinned,
    energy: stats.energy,
    energyBinned: acc.binned.cells.reduce((s, v) => s + v, 0),
    centroidTime: stats.centroidTime,
    spreadTime: stats.spreadTime,
    centroidPosition: stats.centroidPosition,
    spreadPosition: stats.spreadPosition,
    peakCell: grid.peak,
    error: acc.error,
    cost: acc.cost,
    arrivalsOutsideGate: outside,
    hasPulsedArrivals: events.some((ev) => ev.pulsed),
    droppedPeriods,
    truncated: truncated || acc.truncated,
    arrivals,
    perSourceEnergy: [...perSource.entries()].map(([source, energy]) => ({
      source,
      energy,
    })),
    coincidence: coincidence(events, gate),
    displayCoincidence: gridCoincidence(
      doc.analysis.mode === "binned" ? acc.bySourceBinned : acc.bySourceExact,
      sources,
      timeBins,
      positionBins,
      gate.width / timeBins,
    ),
  };
}

/**
 * Coincidence as the displayed grid shows it.
 *
 * A time bin is "lit" for a source when that source deposited any energy in
 * it at any position; two sources are coincident for the longest run of
 * adjacent bins lit by both. Because a bin can be lit by a pulse that merely
 * touches its edge, the grid can overstate the true overlap by up to two bins,
 * and with the binned estimator it can understate it to zero when pulses
 * smaller than a bin land in different bins. Both are bounded by
 * `2·binWidth`, which the detector reports alongside the measured value.
 */
export function gridCoincidence(
  perSource: Float64Array[],
  sources: string[],
  timeBins: number,
  positionBins: number,
  binWidth: number,
): { overlap: number; sources: [string, string] | null } {
  if (perSource.length < 2) return { overlap: 0, sources: null };
  const lit = perSource.map((g) => {
    const row = Uint8Array.from({ length: timeBins }, () => 0);
    for (let i = 0; i < timeBins; i++)
      for (let j = 0; j < positionBins; j++)
        if (g[i * positionBins + j] > 0) {
          row[i] = 1;
          break;
        }
    return row;
  });
  let best = 0,
    pair: [string, string] | null = null;
  for (let a = 0; a < lit.length; a++)
    for (let b = a + 1; b < lit.length; b++) {
      let run = 0,
        maxRun = 0;
      for (let i = 0; i < timeBins; i++) {
        if (lit[a][i] && lit[b][i]) maxRun = Math.max(maxRun, ++run);
        else run = 0;
      }
      if (maxRun > best) {
        best = maxRun;
        pair = [sources[a], sources[b]];
      }
    }
  return { overlap: best * binWidth, sources: pair };
}

/**
 * Longest overlap between one pulse of source A and one pulse of source B.
 * Computed per ordered source pair with a two-pointer sweep over the sorted
 * event intervals, so it stays linear in the number of events.
 */
export function coincidence(
  events: GateEvent[],
  gate?: TimeGate,
): Coincidence {
  const bySource = new Map<string, [number, number][]>();
  let continuous = false;
  for (const ev of events) {
    const list = bySource.get(ev.source) ?? [];
    list.push([ev.start, ev.end]);
    bySource.set(ev.source, list);
    if (!ev.pulsed) continuous = true;
  }
  for (const list of bySource.values()) list.sort((a, b) => a[0] - b[0]);
  const ids = [...bySource.keys()];
  let best = 0,
    pair: [string, string] | null = null,
    at: number | null = null;
  for (let i = 0; i < ids.length; i++)
    for (let j = i + 1; j < ids.length; j++) {
      const a = bySource.get(ids[i])!,
        b = bySource.get(ids[j])!;
      let p = 0;
      for (const [s0, e0] of a) {
        while (p < b.length && b[p][1] <= s0) p++;
        for (let q = p; q < b.length && b[q][0] < e0; q++) {
          const o = Math.min(e0, b[q][1]) - Math.max(s0, b[q][0]);
          if (o > best) {
            best = o;
            pair = [ids[i], ids[j]];
            at = Math.max(s0, b[q][0]);
          }
        }
      }
    }
  return {
    overlap: best,
    sources: pair,
    at,
    continuous: continuous && ids.length > 1 && best >= (gate?.width ?? 0) - 1e-9,
  };
}

/** Total energy all emitters put into the gate, W·ps. */
export function emittedEnergy(doc: LabDocument, gate: TimeGate): number {
  return doc.items
    .filter((e) => e.kind === "source" || e.kind === "pulse")
    .reduce((sum, e) => sum + gateEnergyOfSource(e, gate), 0);
}
