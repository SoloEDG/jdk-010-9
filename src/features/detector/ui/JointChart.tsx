import { memo, useMemo, type ReactNode } from "react";
import type { ScreenAnalysis } from "../lib/analysis";

const SOURCE_COLORS = ["#b8ec7b", "#7cc6ff", "#ffc767", "#ff8f8f", "#c79cff"];

export function sourceColor(index: number) {
  return SOURCE_COLORS[index % SOURCE_COLORS.length];
}


/**
 * Joint (arrival time × screen position) distribution.
 *
 * Reads the same grid the read-outs and the mission verdict use, so switching
 * between exact and binned estimators changes the drawing and the numbers
 * together, never one without the other. With several emitters the brightest
 * source in each cell sets its hue, so coincident paths stay attributable.
 */
export function JointChart({
  analysis,
  playhead,
}: {
  analysis: ScreenAnalysis;
  playhead: number;
}) {
  const W = 600,
    H = 168;
  return (
    <svg
      className="joint-chart"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      role="img"
      aria-label="到达时刻与位置的联合分布"
    >
      <HeatCells analysis={analysis} width={W} height={H} />
      <PlayheadMark
        analysis={analysis}
        playhead={playhead}
        width={W}
        height={H}
      />
    </svg>
  );
}

/**
 * The heat cells depend only on the analysis, not on the clock, so they are
 * memoised: dragging the time scrubber repaints one line, not thousands of
 * rectangles.
 */
const HeatCells = memo(function HeatCells({
  analysis,
  width,
  height,
}: {
  analysis: ScreenAnalysis;
  width: number;
  height: number;
}) {
  const g = analysis.display;
  const perSource =
    analysis.displayMode === "binned"
      ? analysis.bySourceBinned
      : analysis.bySourceExact;
  const cols = g.timeBins,
    rows = g.positionBins,
    cw = width / cols,
    rh = height / rows;
  const rects = useMemo(() => {
    let peak = 0;
    for (const v of g.cells) if (v > peak) peak = v;
    const out: ReactNode[] = [];
    for (let i = 0; i < cols; i++)
      for (let j = 0; j < rows; j++) {
        const k = i * rows + j;
        const v = g.cells[k];
        if (v <= 0 || peak <= 0) continue;
        const intensity = Math.min(1, Math.pow(v / peak, 0.45));
        out.push(
          <rect
            key={`${i}-${j}`}
            x={i * cw}
            y={height - (j + 1) * rh}
            width={Math.max(0.7, cw)}
            height={Math.max(0.7, rh)}
            fill={mixSources(perSource, k).color}
            fillOpacity={0.1 + 0.9 * intensity}
          />,
        );
      }
    return out;
  }, [g, perSource, cols, rows, cw, rh, width, height]);
  return (
    <g>
      {[0.25, 0.5, 0.75].map((f) => (
        <line
          key={f}
          x1="0"
          x2={width}
          y1={height * f}
          y2={height * f}
          stroke="#26323c"
          strokeDasharray="3 5"
        />
      ))}
      {rects}
      <line
        x1="0"
        x2={width}
        y1={height / 2}
        y2={height / 2}
        stroke="#637b8c"
        strokeDasharray="3 5"
      />
    </g>
  );
});

function PlayheadMark({
  analysis,
  playhead,
  width,
  height,
}: {
  analysis: ScreenAnalysis;
  playhead: number;
  width: number;
  height: number;
}) {
  const x = playheadX(analysis, playhead, width);
  return (
    <line x1={x} x2={x} y1="0" y2={height} stroke="#f2ffd9" strokeWidth="1.4" opacity=".85" />
  );
}

/** Pixel column of the shared clock instant inside this gate. */
export function playheadX(
  analysis: ScreenAnalysis,
  playhead: number,
  width: number,
): number {
  const f =
    (playhead - analysis.gate.start) / Math.max(1e-9, analysis.gate.width);
  return Math.max(0, Math.min(1, f)) * width;
}

/** Blend the emitter colours in one (time, position) cell. */
export function mixSources(
  perSource: Float64Array[],
  k: number,
): { color: string; best: number; index: number } {
  let total = 0,
    best = 0,
    index = -1;
  const rgb = [0, 0, 0];
  for (let s = 0; s < perSource.length; s++) {
    const v = perSource[s][k];
    if (v <= 0) continue;
    total += v;
    if (v > best) {
      best = v;
      index = s;
    }
    const c = hex(SOURCE_COLORS[s % SOURCE_COLORS.length]);
    rgb[0] += c[0] * v;
    rgb[1] += c[1] * v;
    rgb[2] += c[2] * v;
  }
  if (total <= 0) return { color: "#b5eb78", best: 0, index: -1 };
  const c = rgb.map((v) => Math.round(v / total));
  return { color: `rgb(${c[0]},${c[1]},${c[2]})`, best, index };
}

function hex(h: string): [number, number, number] {
  return [
    parseInt(h.slice(1, 3), 16),
    parseInt(h.slice(3, 5), 16),
    parseInt(h.slice(5, 7), 16),
  ];
}

/** Marginally integrated arrival-time histogram, W·ps per bin. */
export function TimeChart({
  analysis,
  playhead,
}: {
  analysis: ScreenAnalysis;
  playhead: number;
}) {
  const series =
    analysis.displayMode === "binned" ? analysis.timeBinned : analysis.timeExact;
  return (
    <svg
      className="time-chart"
      viewBox="0 0 600 76"
      preserveAspectRatio="none"
      role="img"
      aria-label="到达时间分布"
    >
      <defs>
        <linearGradient id="timefill" x2="0" y2="1">
          <stop stopColor="#b5eb78" />
          <stop offset="1" stopColor="#b5eb7822" />
        </linearGradient>
      </defs>
      {[19, 38, 57].map((y) => (
        <line
          key={y}
          x1="0"
          x2="600"
          y1={y}
          y2={y}
          stroke="#26323c"
          strokeDasharray="3 5"
        />
      ))}
      <TimeBars series={series} />
      <PlayheadMark analysis={analysis} playhead={playhead} width={600} height={74} />
    </svg>
  );
}

/** Per-bin arrival histogram bars; memoised like the heat cells. */
const TimeBars = memo(function TimeBars({ series }: { series: number[] }) {
  const peak = Math.max(1e-9, ...series);
  return (
    <g>
      {series.map((v, i) => (
        <rect
          key={i}
          x={(i * 600) / series.length}
          y={72 - (v / peak) * 66}
          width={Math.max(1, 600 / series.length - 0.8)}
          height={(v / peak) * 66}
          fill="url(#timefill)"
        />
      ))}
    </g>
  );
});
