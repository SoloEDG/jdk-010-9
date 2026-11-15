import type { Element, Kind, LabDocument } from "./document";
export interface DocumentCommands {
  select: (id: string | null) => void;
  add: (kind: Kind) => void;
  update: (id: string, patch: Partial<Element>) => void;
  remove: (id: string) => void;
  replace: (doc: LabDocument) => void;
}
export function patchDocument(
  doc: LabDocument,
  id: string,
  patch: Partial<Element>,
): LabDocument {
  return {
    ...doc,
    items: doc.items.map((e) =>
      e.id === id ? { ...e, ...patch, id: e.id, kind: e.kind } : e,
    ),
  };
}
