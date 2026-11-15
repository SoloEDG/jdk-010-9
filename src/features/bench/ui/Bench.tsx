import { useRef, useState, type ReactNode } from "react";
import type { Element, LabDocument } from "../../../shared/document";
import { labels } from "../../../shared/document";
import { worldPoint } from "../lib/coordinates";
import { DeviceGlyph } from "./DeviceGlyph";
export function Bench({
  doc,
  selected,
  onSelect,
  onUpdate,
  children,
  grid,
}: {
  doc: LabDocument;
  selected: string | null;
  onSelect: (id: string | null) => void;
  onUpdate: (id: string, patch: Partial<Element>) => void;
  children: ReactNode;
  grid: boolean;
}) {
  const svg = useRef<SVGSVGElement>(null);
  const [drag, setDrag] = useState<{
    id: string;
    dx: number;
    dy: number;
    x: number;
    y: number;
  } | null>(null);
  return (
    <svg
      ref={svg}
      className="bench-svg"
      viewBox="0 0 1000 600"
      role="img"
      aria-label="交互式光学实验台"
      onPointerMove={(ev) => {
        if (drag && svg.current) {
          const p = worldPoint(svg.current, ev.clientX, ev.clientY);
          setDrag({ ...drag, x: p.x + drag.dx, y: p.y + drag.dy });
        }
      }}
      onPointerUp={() => {
        if (drag) {
          onUpdate(drag.id, {
            x: Math.max(20, Math.min(980, drag.x)),
            y: Math.max(20, Math.min(580, drag.y)),
          });
          setDrag(null);
        }
      }}
      onPointerCancel={() => setDrag(null)}
      onPointerDown={(ev) => {
        if (ev.target === ev.currentTarget) onSelect(null);
      }}
    >
      <defs>
        <pattern id="grid" width="25" height="25" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r=".9" fill="#2e3a45" />
        </pattern>
        <radialGradient id="ambience">
          <stop stopColor="#17232b" />
          <stop offset="1" stopColor="#11181f" />
        </radialGradient>
      </defs>
      <rect
        width="1000"
        height="600"
        fill="url(#ambience)"
        pointerEvents="none"
      />
      {grid && (
        <rect
          width="1000"
          height="600"
          fill="url(#grid)"
          pointerEvents="none"
        />
      )}
      <path
        d="M0 300H1000 M500 0V600"
        stroke="#2a3843"
        strokeDasharray="5 8"
        pointerEvents="none"
      />
      {children}
      {doc.items.map((e, i) => {
        const shown = drag?.id === e.id ? { ...e, x: drag.x, y: drag.y } : e;
        return (
          <g
            key={e.id}
            tabIndex={0}
            role="button"
            aria-label={labels[e.kind] + " " + (i + 1)}
            className="device"
            onKeyDown={(ev) => {
              if (ev.key === "Enter") onSelect(e.id);
              if (ev.key.startsWith("Arrow")) {
                ev.preventDefault();
                onUpdate(e.id, {
                  x: Math.max(
                    20,
                    Math.min(
                      980,
                      e.x +
                        (ev.key === "ArrowRight"
                          ? 5
                          : ev.key === "ArrowLeft"
                            ? -5
                            : 0),
                    ),
                  ),
                  y: Math.max(
                    20,
                    Math.min(
                      580,
                      e.y +
                        (ev.key === "ArrowDown"
                          ? 5
                          : ev.key === "ArrowUp"
                            ? -5
                            : 0),
                    ),
                  ),
                });
              }
            }}
            onPointerDown={(ev) => {
              ev.stopPropagation();
              ev.currentTarget.setPointerCapture(ev.pointerId);
              onSelect(e.id);
              if (svg.current) {
                const p = worldPoint(svg.current, ev.clientX, ev.clientY);
                setDrag({
                  id: e.id,
                  dx: e.x - p.x,
                  dy: e.y - p.y,
                  x: e.x,
                  y: e.y,
                });
              }
            }}
          >
            <circle
              cx={shown.x}
              cy={shown.y}
              r={Math.max(24, e.size * 0.55)}
              fill="transparent"
            />
            <DeviceGlyph e={shown} selected={selected === e.id} />
            <text
              x={shown.x}
              y={shown.y + e.size / 2 + 28}
              textAnchor="middle"
              fill="#8494a3"
              fontSize="12"
              pointerEvents="none"
            >
              {labels[e.kind]} {String(i + 1).padStart(2, "0")}
            </text>
          </g>
        );
      })}
      <text x="18" y="580" fill="#566778" fontSize="11">
        0
      </text>
      <text x="940" y="580" fill="#566778" fontSize="11">
        1000 mm
      </text>
    </svg>
  );
}
