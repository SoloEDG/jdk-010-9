import type { Element } from "../../../shared/document";
import { prismVertices } from "../../../shared/geometry";
export function DeviceGlyph({
  e,
  selected,
}: {
  e: Element;
  selected: boolean;
}) {
  const color = selected ? "#a7f070" : "#89a3b7";
  return (
    <g>
      {selected && (
        <circle
          cx={e.x}
          cy={e.y}
          r={Math.max(25, e.size / 2 + 14)}
          fill="none"
          stroke="#a7f070"
          strokeDasharray="3 5"
          opacity=".35"
        />
      )}
      {e.kind === "prism" ? (
        <polygon
          points={prismVertices(e)
            .map((p) => `${p.x},${p.y}`)
            .join(" ")}
          fill="#78b5ff20"
          stroke="#9ecaff"
          strokeWidth="2"
        />
      ) : (
        <g transform={`translate(${e.x} ${e.y}) rotate(${e.angle})`}>
          {e.kind === "source" ? (
            <>
              <rect
                x="-23"
                y="-16"
                width="46"
                height="32"
                rx="8"
                fill="#343b23"
                stroke="#b9ed69"
              />
              <path d="M-8 -7 L8 0 -8 7Z" fill="#d7f79b" />
            </>
          ) : e.kind === "lens" ? (
            <path
              d={`M${-e.size / 2} 0 Q0 -22 ${e.size / 2} 0 Q0 22 ${-e.size / 2} 0`}
              fill="#8ed9fc30"
              stroke="#80cafa"
              strokeWidth="2"
            />
          ) : e.kind === "screen" ? (
            <>
              <line
                x1={-e.size / 2}
                x2={e.size / 2}
                stroke="#d5dae5"
                strokeWidth="7"
              />
              <line
                x1={-e.size / 2}
                x2={e.size / 2}
                y1="5"
                y2="5"
                stroke="#606f80"
                strokeWidth="3"
              />
            </>
          ) : (
            <>
              <line
                x1={-e.size / 2}
                x2={e.size / 2}
                stroke="#d1e5f8"
                strokeWidth="4"
              />
              <line
                x1={-e.size / 2}
                x2={e.size / 2}
                y1="5"
                y2="5"
                stroke="#4f6477"
                strokeWidth="5"
              />
            </>
          )}
        </g>
      )}
      <circle cx={e.x} cy={e.y} r="4" fill={color} />
    </g>
  );
}
