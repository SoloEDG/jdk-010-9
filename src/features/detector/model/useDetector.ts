import { useState } from "react";
import type { LabDocument, TraceResult } from "../../../shared/document";
import { measure } from "../lib/measurement";
export function useDetector(doc: LabDocument, result: TraceResult) {
  const [chosen, setChosen] = useState("");
  const [resolution, setResolution] = useState(64);
  const screens = doc.items.filter((e) => e.kind === "screen");
  const screen = screens.find((e) => e.id === chosen) ?? screens[0];
  return {
    screens,
    screen,
    setChosen,
    resolution,
    setResolution,
    measurement: measure(screen, result.hits, resolution),
  };
}
