import type { Element } from "../../../shared/document";
import { direction, prismVertices } from "../../../shared/geometry";
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
      ) : e.kind === "glass" ? (
        <g transform={`translate(${e.x} ${e.y}) rotate(${e.angle})`}>
          <rect
            x={-e.size / 2}
            y={-e.thickness / 2}
            width={e.size}
            height={Math.max(4, e.thickness)}
            rx="2"
            fill="#9ecaff18"
            stroke="#9ecaff"
            strokeWidth="1.6"
          />
          <line
            x1={-e.size / 2 + 6}
            x2={e.size / 2 - 6}
            y1={-e.thickness / 2 + 6}
            y2={-e.thickness / 2 + 6}
            stroke="#9ecaff55"
          />
        </g>
      ) : (
        <g transform={`translate(${e.x} ${e.y}) rotate(${e.angle})`}>
          {e.kind === "source" || e.kind === "pulse" ? (
            <>
              <rect
                x="-23"
                y="-16"
                width="46"
                height="32"
                rx="8"
                fill={e.kind === "pulse" ? "#2e343f" : "#343b23"}
                stroke={e.kind === "pulse" ? "#8fc7f5" : "#b9ed69"}
              />
              {e.kind === "pulse" ? (
                <path
                  d="M-12 0H-4L0 -9 4 9 8 0H13"
                  fill="none"
                  stroke="#bfe4ff"
                  strokeWidth="1.8"
                />
              ) : (
                <path d="M-8 -7 L8 0 -8 7Z" fill="#d7f79b" />
              )}
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
              {/* Time-gate marker: a shutter slit on the detector face. */}
              <rect
                x={-Math.min(18, e.size / 4)}
                y="-4"
                width={Math.min(36, e.size / 2)}
                height="8"
                fill="#b5eb782a"
                stroke="#b5eb78"
                strokeWidth="1"
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
      {e.kind === "pulse" && (
        <text
          x={e.x + direction(e.angle + 90).x * -26}
          y={e.y + direction(e.angle + 90).y * -26}
          textAnchor="middle"
          fill="#9fc9e8"
          fontSize="9"
          pointerEvents="none"
        >
          τ {Math.round(e.pulseWidth)}ps · T {Math.round(e.period)}ps
        </text>
      )}
    </g>
  );
}
