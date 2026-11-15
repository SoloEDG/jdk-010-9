export { useDetector } from "./model/useDetector";
export { DetectorPanel } from "./ui/DetectorPanel";
export {
  analyzeScreen,
  eventsForScreen,
  coincidence,
  gridStats,
  positionBin,
  emittedEnergy,
} from "./lib/analysis";
export type {
  ScreenAnalysis,
  GateEvent,
  Coincidence,
  TimingError,
} from "./lib/analysis";
