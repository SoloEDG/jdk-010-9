import type { LabDocument } from "../../../shared/document";
export function saveDocument(doc: LabDocument) {
  localStorage.setItem("lumen-document", JSON.stringify(doc));
}
export function loadDocument(): LabDocument | null {
  try {
    const v = JSON.parse(localStorage.getItem("lumen-document") ?? "null");
    if (v?.version !== 1 || !Array.isArray(v.items) || v.items.length > 80)
      return null;
    for (const e of v.items) {
      if (
        !["source", "mirror", "lens", "prism", "screen"].includes(e.kind) ||
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
    return v;
  } catch {
    return null;
  }
}
