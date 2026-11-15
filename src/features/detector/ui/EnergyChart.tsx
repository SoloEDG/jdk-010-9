import type { Measurement } from "../lib/measurement";
export function EnergyChart({ measurement: m }: { measurement: Measurement }) {
  return (
    <svg
      className="energy-chart"
      viewBox="0 0 600 100"
      preserveAspectRatio="none"
      aria-label="接收屏光能分布"
    >
      <defs>
        <linearGradient id="energy" x2="0" y2="1">
          <stop stopColor="#b5eb78" />
          <stop offset="1" stopColor="#b5eb7810" />
        </linearGradient>
      </defs>
      {[25, 50, 75].map((y) => (
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
      {m.bins.map((v, i) => (
        <rect
          key={i}
          x={(i * 600) / m.bins.length}
          y={95 - (m.peak ? v / m.peak : 0) * 85}
          width={Math.max(1, 600 / m.bins.length - 1)}
          height={(m.peak ? v / m.peak : 0) * 85}
          fill="url(#energy)"
        />
      ))}
      <line
        x1="300"
        x2="300"
        y1="0"
        y2="100"
        stroke="#637b8c"
        strokeDasharray="3 5"
      />
    </svg>
  );
}
