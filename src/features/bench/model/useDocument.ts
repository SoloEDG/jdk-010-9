import { useCallback, useState } from "react";
import type { Element, LabDocument } from "../../../shared/document";
import { normalizeDocument } from "../../../shared/document";
import { patchDocument } from "../../../shared/commands";
import { loadDocument, saveDocument } from "../lib/storage";
import {
  pushHistory,
  redoState,
  undoState,
  type HistoryState,
} from "../lib/history";

export function useDocument(initial: LabDocument) {
  const [state, setState] = useState<HistoryState>(() => {
    const restored = loadDocument();
    return { doc: restored ?? normalizeDocument(initial), past: [], future: [] };
  });
  const [selected, setSelected] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const { doc } = state;

  const replace = useCallback((next: LabDocument) => {
    setState((s) => pushHistory(s, normalizeDocument(next)));
    setSaved(false);
  }, []);

  const update = useCallback((id: string, patch: Partial<Element>) => {
    setState((s) =>
      pushHistory(s, normalizeDocument(patchDocument(s.doc, id, patch))),
    );
    setSaved(false);
  }, []);

  return {
    doc,
    selected,
    setSelected,
    saved,
    replace,
    update,
    remove: (id: string) => {
      replace({ ...doc, items: doc.items.filter((e) => e.id !== id) });
      setSelected(null);
    },
    save: () => {
      saveDocument(doc);
      setSaved(true);
    },
    undo: () => {
      setState(undoState);
      setSaved(false);
    },
    redo: () => {
      setState(redoState);
      setSaved(false);
    },
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
  };
}
