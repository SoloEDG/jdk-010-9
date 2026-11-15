import { useMemo, useState } from "react";
import type { LabDocument, TraceResult } from "../../../shared/document";
import { analyzeScreen } from "../lib/analysis";

export function useDetector(doc: LabDocument, result: TraceResult) {
  const [chosen, setChosen] = useState("");
  const screens = doc.items.filter((e) => e.kind === "screen");
  const screen = screens.find((e) => e.id === chosen) ?? screens[0];
  const analysis = useMemo(
    () => (screen ? analyzeScreen(doc, result, screen) : null),
    [doc, result, screen],
  );
  return { screens, screen, setChosen, analysis };
}
