import type { LabDocument } from "../../../shared/document";

export interface HistoryState {
  doc: LabDocument;
  past: LabDocument[];
  future: LabDocument[];
}

export const HISTORY_LIMIT = 60;

/**
 * Every change — scene geometry, medium index, gate window, analysis mode —
 * is a document revision, so one undo stack restores the time base used by the
 * chart, the light-path animation and the mission verdict at once.
 */
export function pushHistory(
  state: HistoryState,
  next: LabDocument,
  limit = HISTORY_LIMIT,
): HistoryState {
  if (next === state.doc) return state;
  return {
    doc: next,
    past: [...state.past.slice(-(limit - 1)), state.doc],
    future: [],
  };
}

export function undoState(state: HistoryState): HistoryState {
  const prev = state.past.at(-1);
  if (!prev) return state;
  return {
    doc: prev,
    past: state.past.slice(0, -1),
    future: [state.doc, ...state.future],
  };
}

export function redoState(state: HistoryState): HistoryState {
  const next = state.future[0];
  if (!next) return state;
  return {
    doc: next,
    past: [...state.past, state.doc],
    future: state.future.slice(1),
  };
}

/** A document revision can change anything, so history keeps whole snapshots. */
export function isSameRevision(a: LabDocument, b: LabDocument): boolean {
  return a === b;
}
