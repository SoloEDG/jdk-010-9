import { useState } from "react";
import type { LabDocument, Element } from "../../../shared/document";
import { patchDocument } from "../../../shared/commands";
import { loadDocument, saveDocument } from "../lib/storage";
export function useDocument(initial: LabDocument) {
  const [doc, setDoc] = useState(() => loadDocument() ?? initial);
  const [selected, setSelected] = useState<string | null>(null);
  const [past, setPast] = useState<LabDocument[]>([]);
  const [future, setFuture] = useState<LabDocument[]>([]);
  const [saved, setSaved] = useState(false);
  function replace(next: LabDocument) {
    setPast((p) => [...p.slice(-49), doc]);
    setFuture([]);
    setDoc(next);
    setSaved(false);
  }
  return {
    doc,
    selected,
    setSelected,
    saved,
    replace,
    update: (id: string, p: Partial<Element>) =>
      replace(patchDocument(doc, id, p)),
    remove: (id: string) => {
      replace({ ...doc, items: doc.items.filter((e) => e.id !== id) });
      setSelected(null);
    },
    save: () => {
      saveDocument(doc);
      setSaved(true);
    },
    undo: () => {
      const prev = past.at(-1);
      if (prev) {
        setFuture((f) => [doc, ...f]);
        setDoc(prev);
        setPast((p) => p.slice(0, -1));
        setSaved(false);
      }
    },
    redo: () => {
      if (future[0]) {
        setPast((p) => [...p, doc]);
        setDoc(future[0]);
        setFuture((f) => f.slice(1));
        setSaved(false);
      }
    },
    canUndo: past.length > 0,
    canRedo: future.length > 0,
  };
}
