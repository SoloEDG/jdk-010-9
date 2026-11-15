import { useEffect, useRef, useState } from "react";
import type { TimeGate } from "../../../shared/timing";

/**
 * Single animation clock for the whole bench.
 *
 * `playhead` is an instant on the same shared time base the detector uses, so
 * the light-path drawing, the time ruler and the histogram cannot drift apart.
 * Playback loops across the selected screen's acquisition window.
 */
export function usePlayhead(gate: TimeGate) {
  // Start at the end of the window so the bench opens on the steady-state
  // light path (the previous behaviour) rather than on an empty stage.
  const [playhead, setPlayhead] = useState(gate.start + gate.width);
  const [playing, setPlaying] = useState(false);
  const raf = useRef<number | null>(null);
  const last = useRef(0);

  // A new gate (different screen, resized window, undo) restarts the clock at
  // its opening instant rather than keeping a stale value.
  useEffect(() => {
    setPlayhead(gate.start + gate.width);
  }, [gate.start, gate.width]);

  useEffect(() => {
    if (!playing) return;
    // Starting a sweep from the closed end of the window restarts at its front.
    setPlayhead((t) =>
      t >= gate.start + gate.width - 1e-9 ? gate.start : t,
    );
    last.current = performance.now();
    const speed = gate.width / 6; // one sweep ≈ 6 s
    const step = (now: number) => {
      const dt = Math.min(120, now - last.current);
      last.current = now;
      setPlayhead((t) => {
        const next = t + (dt / 1000) * speed;
        return next >= gate.start + gate.width ? gate.start : next;
      });
      raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => {
      if (raf.current !== null) cancelAnimationFrame(raf.current);
      raf.current = null;
    };
  }, [playing, gate.start, gate.width]);

  return {
    playhead,
    playing,
    setPlaying,
    /** Scrub to a fraction of the gate; pauses playback. */
    scrub: (fraction: number) => {
      setPlaying(false);
      setPlayhead(gate.start + Math.max(0, Math.min(1, fraction)) * gate.width);
    },
    /** Restart the sweep from the window's opening instant. */
    replay: () => {
      setPlayhead(gate.start);
      setPlaying(true);
    },
  };
}
