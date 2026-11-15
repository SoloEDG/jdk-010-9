import type { LabDocument } from "../../../shared/document";
import { normalizeDocument } from "../../../shared/document";

const KEY = "lumen-document-v2";
const LEGACY_KEY = "lumen-document";

export function saveDocument(doc: LabDocument) {
  localStorage.setItem(KEY, JSON.stringify(doc));
}

/** Restore a saved scene, migrating documents written before timing existed. */
export function loadDocument(): LabDocument | null {
  try {
    const raw =
      localStorage.getItem(KEY) ?? localStorage.getItem(LEGACY_KEY) ?? "null";
    const v = JSON.parse(raw);
    if (v?.version !== 1 || !Array.isArray(v.items) || v.items.length > 80)
      return null;
    for (const e of v.items) {
      if (
        ![
          "source",
          "pulse",
          "mirror",
          "lens",
          "prism",
          "glass",
          "screen",
        ].includes(e.kind) ||
        typeof e.id !== "string"
      )
        return null;
      for (const k of [
        "x",
        "y",
        "angle",
        "size",
        "power",
        "rays",
        "spread",
        "wavelength",
        "focal",
        "index",
      ])
        if (!Number.isFinite(e[k])) return null;
      if (
        e.rays < 1 ||
        e.rays > 41 ||
        e.size <= 0 ||
        e.focal === 0 ||
        e.index < 1
      )
        return null;
    }
    // Timing fields and analysis settings are defaulted, not rejected, so a
    // scene saved before this feature existed still opens.
    return normalizeDocument(v as LabDocument);
  } catch {
    return null;
  }
}
