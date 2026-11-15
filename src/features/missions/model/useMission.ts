import { useState } from "react";
import type { LabDocument, TraceResult } from "../../../shared/document";
import { missions, type Mission } from "./presets";
import { evaluateMission } from "../lib/evaluate";

export function useMission(doc: LabDocument, result: TraceResult) {
  const [id, setId] = useState("focus");
  const mission = missions.find((m) => m.id === id)!;
  const evaluation = evaluateMission(mission, doc, result);
  return {
    mission,
    evaluation,
    missions,
    choose: (next: string): LabDocument => {
      setId(next);
      const found: Mission | undefined = missions.find((m) => m.id === next);
      return structuredClone(found?.doc ?? missions[0].doc);
    },
  };
}
