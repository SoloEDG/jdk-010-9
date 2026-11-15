import type { LabDocument, TraceResult } from "../../../shared/document";
import { analyzeScreen, emittedEnergy } from "../../detector/lib/analysis";
import type { Mission } from "../model/presets";

export interface Evaluation {
  complete: boolean;
  /** Fraction of the light emitted into the gate that reaches the screen. */
  ratio: number;
  rms: number;
  progress: number;
  /** True when a resource limit leaves the outcome undecidable. */
  uncertain: boolean;
  /** Coincidence overlap inside the gate, ps (timing missions). */
  overlap: number;
  /** Received energy inside the gate, W·ps. */
  gateEnergy: number;
}

/**
 * Judge a mission on the same basis the chart and animation show.
 *
 * The target screen's gated analysis is the single source of truth, so a
 * pulse's peak power is never compared against a continuous source's power,
 * and narrowing the window, changing glass or switching estimator moves the
 * verdict exactly as it moves the histogram.
 */
export function evaluateMission(
  mission: Mission,
  doc: LabDocument,
  result: TraceResult,
): Evaluation {
  const screens = doc.items.filter((e) => e.kind === "screen");
  const screen =
    (mission.timing &&
      screens.find((e) => e.id === mission.timing!.screenId)) ||
    screens[0];
  const analysis = screen ? analyzeScreen(doc, result, screen) : null;

  const emitted = analysis ? emittedEnergy(doc, analysis.gate) : 0;
  const gateEnergy = analysis?.energy ?? 0;
  const ratio = emitted > 0 ? gateEnergy / emitted : 0;
  const rms = analysis ? analysis.spreadPosition : Infinity;
  const overlap = analysis?.coincidence.overlap ?? 0;

  // Unknown paths and a truncated histogram both mean "cannot decide".
  const uncertain =
    result.unknown > 0 || (analysis?.truncated ?? false);

  let complete: boolean, progress: number;
  if (mission.timing) {
    const okCoincidence = overlap >= mission.timing.minCoincidence;
    const okEnergy = gateEnergy >= mission.timing.minEnergy;
    complete = okCoincidence && okEnergy && !uncertain;
    progress = Math.min(
      1,
      Math.min(
        overlap / mission.timing.minCoincidence,
        gateEnergy / mission.timing.minEnergy,
      ),
    );
  } else {
    complete =
      mission.id === "focus"
        ? ratio >= 0.8 && rms <= 3
        : mission.id === "reflection"
          ? ratio >= 0.8
          : ratio >= 0.6 && doc.items.some((e) => e.kind === "prism");
    if (uncertain) complete = false;
    progress = Math.min(
      1,
      mission.id === "focus"
        ? Math.min(ratio / 0.8, 3 / Math.max(3, rms))
        : ratio / (mission.id === "reflection" ? 0.8 : 0.6),
    );
  }
  if (uncertain) progress = Math.min(progress, 0.99);

  return { complete, ratio, rms, progress, uncertain, overlap, gateEnergy };
}
