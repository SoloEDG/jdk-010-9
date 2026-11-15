import type { Kind, Element } from "../../../shared/document";
import { defaultTiming } from "../../../shared/document";

export const catalog: { kind: Kind; subtitle: string; symbol: string }[] = [
  { kind: "source", subtitle: "连续光束 · 可调波长", symbol: "☀" },
  { kind: "pulse", subtitle: "脉冲 · 可调脉宽与周期", symbol: "⚡" },
  { kind: "mirror", subtitle: "反射 · 可调角度", symbol: "╱" },
  { kind: "lens", subtitle: "薄透镜 · 可调焦距", symbol: "◉" },
  { kind: "prism", subtitle: "折射 · 色散模型", symbol: "△" },
  { kind: "glass", subtitle: "平行玻璃板 · 光程延迟", symbol: "▭" },
  { kind: "screen", subtitle: "时间门控 · 联合分布", symbol: "▥" },
];

export function createElement(kind: Kind, count: number): Element {
  return {
    id: crypto.randomUUID(),
    kind,
    x: 200 + ((count * 63) % 600),
    y: 270 + (count % 3) * 35,
    angle: kind === "source" || kind === "pulse" ? 0 : 90,
    size:
      kind === "source"
        ? 90
        : kind === "prism"
          ? 100
          : kind === "glass"
            ? 120
            : 180,
    power: 1,
    rays: 9,
    spread: 0,
    wavelength: 550,
    focal: 180,
    index: 1.52,
    ...defaultTiming,
  };
}
