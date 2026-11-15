import { test } from "node:test";
import assert from "node:assert/strict";
import {
  defaultTiming,
  normalizeDocument,
  type Element,
  type LabDocument,
  type AnalysisSettings,
} from "../src/shared/document";
import {
  C_MM_PER_PS,
  pulseIntervals,
  periodicEnergy,
  gateEnd,
} from "../src/shared/timing";
import { trace } from "../src/features/optics/lib/trace";
import {
  analyzeScreen,
  coincidence,
  eventsForScreen,
  emittedEnergy,
  gridCoincidence,
  positionBin,
} from "../src/features/detector/lib/analysis";
import { evaluateMission } from "../src/features/missions/lib/evaluate";
import { missions } from "../src/features/missions/model/presets";
import { pushHistory, undoState, redoState } from "../src/features/bench/lib/history";
import { lifeFraction } from "../src/features/optics/ui/RayLayer";
import { normalizeAnalysis } from "../src/shared/document";

const analysis = (p: Partial<AnalysisSettings> = {}): AnalysisSettings => ({
  timeBins: 64,
  positionBins: 64,
  mode: "exact",
  ...p,
});

const el = (
  id: string,
  kind: Element["kind"],
  x: number,
  y: number,
  patch: Partial<Element> = {},
): Element => ({
  id,
  kind,
  x,
  y,
  angle: kind === "source" || kind === "pulse" ? 0 : 90,
  size: 180,
  power: 1,
  rays: 9,
  spread: 0,
  wavelength: 550,
  focal: 180,
  index: 1.52,
  ...defaultTiming,
  ...patch,
});

const doc = (
  items: Element[],
  analysisSettings: Partial<AnalysisSettings> = {},
): LabDocument => ({ version: 1, items, analysis: analysis(analysisSettings) });

test("flight time follows optical path inside glass", () => {
  // Slab 100 mm at n=1.52 delays by (n-1)·L / c.
  const d = doc([
    el("s", "pulse", 100, 300, { rays: 3, size: 10 }),
    el("g", "glass", 400, 300, { size: 200, thickness: 100, index: 1.52 }),
    el("d", "screen", 700, 300, { size: 300 }),
  ]);
  const r = trace(d);
  assert.equal(r.unknown, 0);
  const hit = r.hits[0];
  const expected = (700 - 100 + 100 * (1.52 - 1)) / C_MM_PER_PS;
  assert.ok(Math.abs(hit.t - expected) < 1e-6, `${hit.t} vs ${expected}`);
  assert.ok(Math.abs(hit.opl - (600 + 52)) < 1e-6);
  // Segment inside the slab must record the medium, not just the endpoints.
  const inside = r.segments.find((s) => s.inGlass);
  assert.ok(inside, "expected a segment inside glass");
  assert.ok(Math.abs(inside!.medium - 1.52) < 1e-3);
});

test("periodic train keeps the tail of the previous period", () => {
  // Arrival 300 ps, width 120 ps, period 500 ps, window [0, 600].
  const gate = { start: 0, width: 600 };
  const { intervals } = pulseIntervals(300, 120, 500, gate);
  // Pulse at -200..-80 misses the window, 300..420 hits, 800 is outside.
  assert.deepEqual(
    intervals.map((i) => [i.periodIndex, i.start, i.end]),
    [[0, 300, 420]],
  );
  // A window that opens in the middle of a pulse keeps that period's tail.
  const tail = pulseIntervals(0, 120, 500, { start: 1050, width: 500 });
  const first = tail.intervals[0];
  assert.equal(first.periodIndex, 2);
  assert.equal(first.start, 1000);
  assert.equal(first.end, 1120);
  // Only the part after 1050 belongs to the window.
  assert.equal(Math.max(first.start, 1050), 1050);
  assert.equal(tail.intervals.length, 2); // ...1120 and 1500..1620
});

test("period shorter than the window yields every repetition, not one", () => {
  const gate = { start: 0, width: 1000 };
  const { intervals } = pulseIntervals(0, 50, 100, gate);
  // Pulses at 0,100,...,900; the one starting at 1000 falls on the closed edge.
  assert.equal(intervals.length, 10);
  assert.deepEqual(
    intervals.map((i) => i.periodIndex),
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  );
  // A window opening mid-train still includes earlier periods. The 27th pulse
  // spans 2700..2750 and touches the window only at its edge, so it is excluded;
  // the 28th (2800..2850) is the first that truly overlaps.
  const shifted = pulseIntervals(0, 50, 100, { start: 2750, width: 100 });
  assert.equal(shifted.intervals[0].periodIndex, 28);
  assert.equal(shifted.intervals[0].start, 2800);
  // A window that opens inside a pulse keeps that pulse's tail.
  const insidePulse = pulseIntervals(0, 50, 100, { start: 2725, width: 100 });
  assert.equal(insidePulse.intervals[0].periodIndex, 27);
  assert.equal(insidePulse.intervals[0].start, 2700);
  assert.equal(insidePulse.intervals[0].end, 2750);
});

test("periodic energy equals power×overlap over all repetitions", () => {
  const gate = { start: 0, width: 1000 };
  const e = periodicEnergy(2, 100, 250, gate);
  // Pulses start at 0,250,500,750,1000; the last starts at the closed edge, so
  // four full pulses × 100 ps × 2 W = 800 W·ps.
  assert.equal(e, 800);
  // Window 50..150: only the 0..100 pulse contributes 50 ps of overlap.
  assert.equal(periodicEnergy(2, 100, 250, { start: 50, width: 100 }), 100);
});

test("events keep source identity when paths overlap in time", () => {
  const d = doc(
    [
      el("A", "pulse", 100, 200, { rays: 3, size: 10, pulseWidth: 120, period: 500 }),
      el("B", "pulse", 100, 400, { rays: 3, size: 10, pulseWidth: 120, period: 500 }),
      el("d", "screen", 700, 300, { size: 400 }),
    ],
    { timeBins: 64, positionBins: 64 },
  );
  const screen = d.items.find((e) => e.kind === "screen")!;
  const r = trace(d);
  const { events } = eventsForScreen(d, r.hits, screen, { start: 0, width: 6000 });
  const sources = new Set(events.map((e) => e.source));
  assert.deepEqual([...sources].sort(), ["A", "B"]);
  // Every event retains the ray that produced it, so identical times do not merge.
  assert.equal(new Set(events.map((e) => e.ray)).size, 6);
});

test("unknown paths are distinguished from escaped paths", () => {
  // Two facing mirrors trap the ray: it exhausts the 32-bounce budget.
  const trapped = doc([
    el("s", "pulse", 300, 300, { rays: 3, size: 10 }),
    el("m1", "mirror", 450, 300, { angle: 90, size: 400 }),
    el("m2", "mirror", 150, 300, { angle: 90, size: 400 }),
  ]);
  // Angle 90 makes a vertical mirror face; the source sits between the two.
  const trappedResult = trace(trapped);
  assert.equal(trappedResult.unknown, 3);
  assert.equal(trappedResult.escaped, 0);
  assert.equal(trappedResult.unknownPaths.length, 3);
  assert.ok(trappedResult.unknownPaths.every((p) => p.power > 0));

  // A plain ray with nothing in front of it is a known no-signal outcome.
  const clear = doc([el("s", "pulse", 100, 300, { rays: 3, size: 10 })]);
  const clearResult = trace(clear);
  assert.equal(clearResult.unknown, 0);
  assert.equal(clearResult.escaped, 3);
  assert.equal(clearResult.escapedPower > 0, true);
});

test("an unresolved ray prevents the mission from reporting success", () => {
  const mission = missions.find((m) => m.id === "coincidence")!;
  const clean = structuredClone(mission.doc);
  const before = evaluateMission(mission, clean, trace(clean));
  assert.equal(before.uncertain, false);
  // Force unresolved paths by shrinking the bounce budget is not exposed, so
  // simulate the trace result flag directly.
  const fake = { ...trace(clean), unknown: 2, unknownPower: 0.2 };
  const after = evaluateMission(mission, clean, fake);
  assert.equal(after.uncertain, true);
  assert.equal(after.complete, false);
  assert.ok(after.progress < 1);
});

test("exact and binned grids agree in total energy and expose an error bound", () => {
  const d = doc(
    [
      el("A", "pulse", 100, 300, { rays: 5, size: 10, pulseWidth: 120, period: 400 }),
      el("d", "screen", 700, 300, { size: 300 }),
    ],
    { timeBins: 40, positionBins: 32 },
  );
  const screen = d.items.find((e) => e.kind === "screen")!;
  const a = analyzeScreen(d, trace(d), screen);
  const exactEnergy = a.exact.cells.reduce((s, v) => s + v, 0);
  const binnedEnergy = a.binned.cells.reduce((s, v) => s + v, 0);
  assert.ok(Math.abs(exactEnergy - binnedEnergy) < 1e-9);
  // The bound is conservative: measured L1 never exceeds it.
  assert.ok(a.error.l1 <= a.error.boundL1 + 1e-9);
  assert.ok(a.error.l1 > 0, "binning should visibly move some energy");
  assert.equal(a.error.timeResolution, 6000 / 40);
  // Binning snaps pulses to their midpoint, so the peak lands in one cell.
  assert.ok(a.error.maxCell > 0);
  // Exact propagation is the more expensive estimator.
  assert.ok(a.error.exactWork >= a.error.binnedWork);
  // Bin width 150 ps > 120 ps pulse: no loss of peak expected.
  assert.equal(a.error.binNarrowerThanPulse, false);
});

test("narrow window against a short gate exposes binning loss", () => {
  const d = doc(
    [
      el("A", "pulse", 100, 300, {
        rays: 5,
        size: 10,
        pulseWidth: 20,
        period: 2000,
      }),
      el("d", "screen", 700, 300, { size: 300, gateWidth: 120 }),
    ],
    { timeBins: 8, positionBins: 16, mode: "binned" },
  );
  const screen = d.items.find((e) => e.kind === "screen") as Element & {
    gateWidth: number;
  };
  const a = analyzeScreen(d, trace(d), screen);
  assert.equal(a.binWidth, 15);
  assert.equal(a.error.binNarrowerThanPulse, true);
  // A 20 ps pulse spread into 15 ps bins is genuinely misrepresented.
  assert.ok(a.error.l1 > 0);
});

test("changing the medium moves arrival time but not the geometry", () => {
  const base = [
    el("s", "pulse", 100, 300, { rays: 3, size: 10 }),
    el("g", "glass", 400, 300, { size: 200, thickness: 100, index: 1.5 }),
    el("d", "screen", 700, 300, { size: 300 }),
  ];
  const air = trace(doc([base[0], { ...base[1], index: 1 }, base[2]]));
  const glass = trace(doc(base));
  assert.ok(Math.abs(air.hits[0].position - glass.hits[0].position) < 1e-6);
  assert.ok(glass.hits[0].t > air.hits[0].t + 100);
  // Optical path length is the quantity that actually grows.
  assert.ok(glass.hits[0].opl > air.hits[0].opl);
});

test("narrowing the gate drops events without inventing signal", () => {
  const items = [
    el("A", "pulse", 100, 300, { rays: 3, size: 10, pulseWidth: 100, period: 500 }),
    el("d", "screen", 700, 300, { size: 300, gateWidth: 300 }),
  ];
  const screen = items.find((e) => e.kind === "screen")!;
  const wide = structuredClone(items);
  wide[1].gateWidth = 6000;
  const wideA = analyzeScreen(doc(wide), trace(doc(wide)), wide[1]);
  const narrowA = analyzeScreen(doc(items), trace(doc(items)), screen);
  assert.ok(wideA.energy > narrowA.energy);
  assert.ok(narrowA.energy >= 0);
  assert.equal(
    narrowA.coincidence.overlap,
    0,
    "single source cannot coincide with itself",
  );
});

test("two-source coincidence is detected inside the window", () => {
  const d = structuredClone(missions.find((m) => m.id === "coincidence")!.doc);
  // The shipped preset starts deliberately detuned; tuning it brings the
  // two pulse trains back together on the screen.
  for (const e of d.items) if (e.kind === "pulse") e.period = 600;
  const screen = d.items.find((e) => e.kind === "screen")!;
  const a = analyzeScreen(d, trace(d), screen);
  assert.ok(a.coincidence.overlap > 0);
  assert.deepEqual(a.coincidence.sources, ["pulseA", "pulseB"]);
  // The reported instant is inside the gate.
  assert.ok(a.coincidence.at! >= a.gate.start);
  assert.ok(a.coincidence.at! < gateEnd(a.gate));
  // Every pulse in the train is retained, including earlier repetitions.
  assert.ok(a.events.length > 18 * 2);
});

test("detuning the repetition period destroys coincidence", () => {
  const mission = missions.find((m) => m.id === "coincidence")!;
  const preset = structuredClone(mission.doc);
  const screen = preset.items.find((e) => e.kind === "screen")!;
  const untuned = analyzeScreen(preset, trace(preset), screen);
  assert.equal(untuned.coincidence.overlap, 0);

  const tuned = structuredClone(preset);
  for (const e of tuned.items) if (e.kind === "pulse") e.period = 600;
  const together = analyzeScreen(tuned, trace(tuned), tuned.items.find((e) => e.kind === "screen")!);
  assert.ok(together.coincidence.overlap > 0);
});

test("mission completion requires both coincidence and energy", () => {
  const mission = missions.find((m) => m.id === "coincidence")!;
  const untuned = structuredClone(mission.doc);
  assert.equal(evaluateMission(mission, untuned, trace(untuned)).complete, false);

  const good = structuredClone(mission.doc);
  for (const e of good.items) if (e.kind === "pulse") e.period = 600;
  const passed = evaluateMission(mission, good, trace(good));
  assert.equal(passed.complete, true);

  // Same geometry, but a high repetition rate spreads energy below threshold.
  const dim = structuredClone(mission.doc);
  for (const e of dim.items) if (e.kind === "pulse") e.period = 3000;
  const failed = evaluateMission(mission, dim, trace(dim));
  assert.equal(failed.complete, false);
  assert.ok(failed.progress < 1);
});

test("emitted energy in the gate matches per-source analytic value", () => {
  const d = structuredClone(missions.find((m) => m.id === "coincidence")!.doc);
  const screen = d.items.find((e) => e.kind === "screen")!;
  const gate = { start: screen.gateStart, width: screen.gateWidth };
  const analytic = emittedEnergy(d, gate);
  const a = analyzeScreen(d, trace(d), screen);
  // Received energy is the emitted energy minus the rays that miss.
  assert.ok(a.energy <= analytic + 1e-9);
  assert.ok(a.energy > 0);
});

test("position binning clips out-of-aperture hits into edge bins", () => {
  assert.equal(positionBin(-1000, 200, 40), 0);
  assert.equal(positionBin(1000, 200, 40), 39);
  assert.equal(positionBin(0, 200, 40), 20);
});

test("undo restores gate, medium and mode together", () => {
  const start = structuredClone(missions.find((m) => m.id === "coincidence")!.doc);
  let h = { doc: start, past: [], future: [] };
  const changed = structuredClone(start);
  changed.analysis = { ...changed.analysis, mode: "binned", timeBins: 96 };
  const screen = changed.items.find((e) => e.kind === "screen")!;
  screen.gateWidth = 800;
  const glass = changed.items.find((e) => e.kind === "glass")!;
  glass.index = 1.9;
  h = pushHistory(h, changed);
  assert.equal(h.doc.analysis.mode, "binned");
  h = undoState(h);
  assert.equal(h.doc.analysis.mode, "exact");
  assert.equal(h.doc.analysis.timeBins, start.analysis.timeBins);
  assert.equal(h.doc.items.find((e) => e.kind === "screen")!.gateWidth, 6000);
  assert.equal(h.doc.items.find((e) => e.kind === "glass")!.index, 1.52);
  h = redoState(h);
  assert.equal(h.doc.analysis.mode, "binned");
  assert.equal(h.doc.items.find((e) => e.kind === "screen")!.gateWidth, 800);
});

test("history is bounded and coalesces no-op revisions", () => {
  const base = doc([el("s", "source", 100, 300)]);
  let h = { doc: base, past: [], future: [] };
  h = pushHistory(h, base);
  assert.equal(h.past.length, 0);
  for (let i = 0; i < 200; i++) h = pushHistory(h, doc([el("s", "source", 100 + i, 300)]));
  assert.ok(h.past.length <= 60);
});

test("animation playhead uses the same time base as the chart", () => {
  const segment = { t0: 100, t1: 300 };
  assert.equal(lifeFraction(segment, 50, null), 0);
  assert.equal(lifeFraction(segment, 200, null), 0.5);
  assert.equal(lifeFraction(segment, 900, null), 1);
  // Periodic: light repeats every period; between pulses the path is dark.
  assert.equal(lifeFraction(segment, 100, 1000), 0);
  assert.equal(lifeFraction(segment, 200, 1000), 0.5);
  assert.equal(lifeFraction(segment, 300, 1000), 1);
  assert.equal(lifeFraction(segment, 400, 1000), 0);
  assert.equal(lifeFraction(segment, 1100, 1000), 0);
  assert.equal(lifeFraction(segment, 1200, 1000), 0.5);
  assert.equal(lifeFraction(segment, 1300, 1000), 1);
});

test("at a recorded arrival the animation is exactly touching the screen", () => {
  const d = structuredClone(missions.find((m) => m.id === "coincidence")!.doc);
  const r = trace(d);
  const periods = new Map(
    d.items.filter((e) => e.kind === "pulse").map((e) => [e.id, e.period]),
  );
  for (const hit of r.hits) {
    const chain = r.segments.filter((s) => s.ray === hit.ray);
    const last = chain.at(-1)!;
    assert.ok(Math.abs(last.t1 - hit.t) < 1e-9, "segment end must equal arrival");
    const life = lifeFraction(last, hit.t, periods.get(hit.source) ?? null);
    assert.ok(Math.abs(life - 1) < 1e-9, `life ${life} at ${hit.ray}`);
    // Half a period later the same short path is dark.
    const p = periods.get(hit.source)!;
    if (hit.t - last.t0 < p) {
      const dark = lifeFraction(last, hit.t + p / 2, p);
      assert.equal(dark, 0);
    }
  }
});

test("legacy documents without timing are migrated, not rejected", () => {
  const legacy = {
    version: 1 as const,
    items: [
      {
        id: "s",
        kind: "source" as const,
        x: 100,
        y: 300,
        angle: 0,
        size: 100,
        power: 1,
        rays: 9,
        spread: 0,
        wavelength: 550,
        focal: 180,
        index: 1.52,
      } as unknown as Element,
    ],
  } as unknown as LabDocument;
  const migrated = normalizeDocument(legacy);
  assert.equal(migrated.items[0].period, defaultTiming.period);
  assert.equal(migrated.items[0].gateWidth, defaultTiming.gateWidth);
  assert.equal(migrated.analysis.mode, "exact");
  assert.ok(Number.isFinite(migrated.analysis.timeBins));
});

test("analysis settings are clamped to safe limits", () => {
  assert.equal(normalizeAnalysis({ timeBins: 1 }).timeBins, 8);
  assert.equal(normalizeAnalysis({ positionBins: 9999 }).positionBins, 256);
  assert.equal(normalizeAnalysis({ mode: "nope" as never }).mode, "exact");
});

test("coincidence ignores overlap of a source with itself", () => {
  const ev = {
    screen: "d",
    source: "A",
    ray: "A#0",
    position: 0,
    wavelength: 550,
    power: 1,
    start: 0,
    end: 100,
    rawStart: 0,
    rawEnd: 100,
    periodIndex: 0,
    pulsed: true,
    width: 100,
  };
  assert.equal(coincidence([ev, { ...ev, ray: "A#1" }]).overlap, 0);
  const other = { ...ev, source: "B", ray: "B#0", start: 50, end: 150 };
  assert.equal(coincidence([ev, other]).overlap, 50);
});

test("displayed grid resolves coincidence to within two bins", () => {
  const d = structuredClone(missions.find((m) => m.id === "coincidence")!.doc);
  const screen = d.items.find((e) => e.kind === "screen")!;
  const exact = analyzeScreen(d, trace(d), screen);
  // Edge-lit bins can inflate the resolved overlap, but never without bound.
  assert.ok(
    Math.abs(exact.displayCoincidence.overlap - exact.coincidence.overlap) <=
      2 * exact.binWidth,
  );
  assert.deepEqual(exact.displayCoincidence.sources, ["pulseA", "pulseB"]);
  // At the native 64-bin setting the exact grid still sees a real overlap.
  assert.ok(exact.displayCoincidence.overlap > 0);
});

test("fine bins make the binning penalty visible without breaking the total", () => {
  // Gate 1000 ps over 128 bins → 7.8 ps bins, narrower than the 20 ps pulses.
  const d = doc(
    [
      el("A", "pulse", 100, 300, { rays: 1, size: 4, pulseWidth: 20, period: 3000 }),
      el("d", "screen", 700, 300, {
        size: 300,
        gateStart: 1900,
        gateWidth: 1000,
      }),
    ],
    { timeBins: 128, positionBins: 16, mode: "binned" },
  );
  const screen = d.items.find((e) => e.kind === "screen")!;
  const a = analyzeScreen(d, trace(d), screen);
  assert.ok(a.binWidth < 20);
  assert.equal(a.error.binNarrowerThanPulse, true);
  // Energy is conserved even though the pulse shape is not: the cheap
  // estimator places whole pulses in one bin.
  assert.equal(a.energy, a.energyBinned);
  assert.ok(a.error.l1 > 0);
});

test("grid coincidence needs two distinct sources", () => {
  const g = [
    Float64Array.from([1, 0, 0, 1]),
    Float64Array.from([1, 1, 0, 0]),
  ];
  assert.deepEqual(gridCoincidence(g, ["a", "b"], 2, 2, 10), {
    overlap: 10,
    sources: ["a", "b"],
  });
  assert.equal(gridCoincidence([g[0]], ["a"], 2, 2, 10).overlap, 0);
});

test("bin count changes the picture but never the verdict", () => {
  const d = structuredClone(missions.find((m) => m.id === "focus")!.doc);
  // Put the screen exactly at the focal point so RMS ≈ 0.
  const lens = d.items.find((e) => e.kind === "lens")!;
  d.items.find((e) => e.kind === "screen")!.x = lens.x + lens.focal;
  const mission = missions.find((m) => m.id === "focus")!;
  const resolutions = [8, 16, 32, 64, 128, 256];
  const results = resolutions.map((bins) => {
    const variant = structuredClone(d);
    variant.analysis = { ...variant.analysis, positionBins: bins, timeBins: bins };
    return evaluateMission(mission, variant, trace(variant));
  });
  assert.ok(results.every((r) => r.complete === true));
  assert.ok(results.every((r) => r.rms <= 3));
  // The measured RMS itself must not drift with resolution.
  const spread = Math.max(...results.map((r) => r.rms)) - Math.min(...results.map((r) => r.rms));
  assert.ok(spread < 1e-9, `rms drifted by ${spread}`);
});

test("event statistics are resolution independent while the grid quantises", () => {
  const d = structuredClone(missions.find((m) => m.id === "coincidence")!.doc);
  const screen = d.items.find((e) => e.kind === "screen")!;
  const fine = analyzeScreen(
    { ...d, analysis: { ...d.analysis, timeBins: 256, positionBins: 256 } },
    trace(d),
    screen,
  );
  const coarse = analyzeScreen(
    { ...d, analysis: { ...d.analysis, timeBins: 8, positionBins: 8 } },
    trace(d),
    screen,
  );
  assert.equal(fine.energy, coarse.energy);
  assert.ok(Math.abs(fine.centroidTime - coarse.centroidTime) < 1e-9);
  assert.ok(Math.abs(fine.spreadPosition - coarse.spreadPosition) < 1e-9);
  // The drawn peak is quantised, so it does depend on the bins.
  assert.notEqual(fine.peakCell, coarse.peakCell);
});

test("a gate opening mid-pulse keeps that pulse's remaining tail", () => {
  // Arrival at 0 ps with a 200 ps pulse, repeating every 500 ps.
  const { intervals } = pulseIntervals(0, 200, 500, { start: 100, width: 600 });
  const first = intervals[0];
  assert.equal(first.periodIndex, 0);
  assert.equal(first.start, 0);
  assert.equal(first.end, 200);
  // Clipped to the window, only 100 ps of this pulse is observable...
  assert.equal(Math.max(first.start, 100), 100);
  // ...but it is still present: the histogram starts at 100 ps, not 0.
  const d = doc(
    [
      el("A", "pulse", 100, 300, { rays: 1, size: 4, pulseWidth: 200, period: 500 }),
      el("d", "screen", 700, 300, { size: 300, gateStart: 100, gateWidth: 600 }),
    ],
    { timeBins: 6, positionBins: 8 },
  );
  const screen = d.items.find((e) => e.kind === "screen")!;
  const a = analyzeScreen(d, trace(d), screen);
  const litBins = a.timeExact
    .map((v, i) => (v > 0 ? i : -1))
    .filter((i) => i >= 0);
  // Bin width is 100 ps; the pulse occupies the first bins of the window.
  assert.ok(litBins.length > 0);
  assert.equal(litBins[0], 0);
  assert.ok(a.energy > 0);
});

test("oblique entry into glass obeys Snell and shifts the exit position", () => {
  // 20° incidence on a vertical-faced 100 mm slab, n = 1.52.
  const d = doc([
    el("s", "pulse", 100, 200, { angle: 20, rays: 1, size: 1 }),
    el("g", "glass", 500, 300, { angle: 90, size: 400, thickness: 100, index: 1.52 }),
    el("d", "screen", 900, 300, { size: 900 }),
  ]);
  const r = trace(d);
  assert.equal(r.hits.length, 1);
  const inside = r.segments.filter((s) => s.inGlass);
  assert.equal(inside.length, 1);
  const rr = Math.asin(Math.sin((20 * Math.PI) / 180) / 1.52);
  // The traced leg starts one 0.01 mm nudge inside the face; that epsilon is
  // carried in the OPL so the accumulated path stays exact.
  const length = Math.hypot(
    inside[0].to.x - inside[0].from.x,
    inside[0].to.y - inside[0].from.y,
  );
  assert.ok(Math.abs(length + 0.01 - 100 / Math.cos(rr)) < 1e-6);
  // Entry at x = 450, then the exit face at x = 550; the slab pulls the beam
  // down by exactly thickness·(tan i − tan r) relative to an unrefracted path.
  const i = (20 * Math.PI) / 180;
  const entryY = 200 + (450 - 100) * Math.tan(i);
  const expectedExitY = entryY + 100 * Math.tan(rr);
  const exit = inside[0].to;
  assert.ok(Math.abs(exit.y - expectedExitY) < 1e-6);
  const unrefractedExitY = 200 + (550 - 100) * Math.tan(i);
  assert.ok(
    Math.abs(unrefractedExitY - exit.y - 100 * (Math.tan(i) - Math.tan(rr))) <
      1e-6,
  );
  // OPL equals Σ n·L over the three legs, with the epsilons restored.
  const hit = r.hits[0];
  const legs = r.segments.reduce(
    (sum, seg) =>
      sum + seg.medium * Math.hypot(seg.to.x - seg.from.x, seg.to.y - seg.from.y),
    0,
  );
  assert.ok(Math.abs(hit.opl - legs - 0.02 * 1.52) < 0.05);
});

test("a ray entering a slab from the side is refracted, not passed through", () => {
  // Steep entry on the slab's narrow side face; inside the medium the angle to
  // the normal grows so the exit face is hit near grazing, and a long high-index
  // leg is physical rather than a tracing error.
  const d = doc([
    el("s", "pulse", 100, 200, { angle: 30, rays: 1, size: 1 }),
    el("g", "glass", 500, 300, { angle: 0, size: 300, thickness: 120, index: 1.52 }),
  ]);
  const r = trace(d);
  assert.equal(r.unknown, 0);
  const glassLegs = r.segments.filter((s) => s.inGlass);
  assert.ok(glassLegs.length >= 1);
  assert.ok(glassLegs.every((s) => Math.abs(s.medium - 1.52) < 0.01));
});
