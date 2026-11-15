import { useState } from "react";
import type { LabDocument, TraceResult } from "../../../shared/document";
import { missions } from "./presets";
import { evaluateMission } from "../lib/evaluate";
export function useMission(doc: LabDocument, result: TraceResult) {
  const [id, setId] = useState("focus");
  const mission = missions.find((m) => m.id === id)!;
  const evaluation = evaluateMission(id, doc, result);
  return {
    mission,
    evaluation,
    missions,
    choose: (next: string) => {
      setId(next);
      return structuredClone(missions.find((m) => m.id === next)!.doc);
    },
  };
}
