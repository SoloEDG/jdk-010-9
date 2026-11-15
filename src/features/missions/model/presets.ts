import type { Element, LabDocument } from "../../../shared/document";
import { defaultTiming } from "../../../shared/document";

const e = (
  id: string,
  kind: Element["kind"],
  x: number,
  y: number,
  patch: Partial<Element> = {},
): Element => ({
  id,
  kind,
  x,
  y,
  angle: kind === "source" || kind === "pulse" ? 0 : 90,
  size: 180,
  power: 1,
  rays: 9,
  spread: 0,
  wavelength: 550,
  focal: 180,
  index: 1.52,
  ...defaultTiming,
  ...patch,
});

export interface Mission {
  id: string;
  name: string;
  tag: string;
  description: string;
  condition: string;
  /** Timing missions judge the gated screen instead of raw ray counts. */
  timing?: {
    screenId: string;
    minCoincidence: number;
    minEnergy: number;
  };
  doc: LabDocument;
}

export const missions: Mission[] = [
  {
    id: "focus",
    name: "寻找焦点",
    tag: "透镜成像",
    description: "移动接收屏，使平行光经凸透镜后汇聚成一个清晰光斑。",
    condition: "接收 ≥ 80% 光能，RMS 半径 ≤ 3 mm",
    doc: {
      version: 1,
      analysis: { timeBins: 48, positionBins: 64, mode: "exact" },
      items: [
        e("source", "source", 140, 300, { size: 120 }),
        e("lens", "lens", 450, 300, { size: 240 }),
        e("screen", "screen", 790, 300, { size: 230 }),
      ],
    },
  },
  {
    id: "reflection",
    name: "转折的光",
    tag: "镜面反射",
    description: "调整镜面方向，把光束转向上方的接收屏。",
    condition: "接收屏捕获 ≥ 80% 光源能量",
    doc: {
      version: 1,
      analysis: { timeBins: 48, positionBins: 64, mode: "exact" },
      items: [
        e("source", "source", 150, 370, { size: 60 }),
        e("mirror", "mirror", 500, 370, { angle: -35 }),
        e("screen", "screen", 500, 100, { angle: 0, size: 200 }),
      ],
    },
  },
  {
    id: "refraction",
    name: "穿过玻璃",
    tag: "棱镜折射",
    description: "移动接收屏，捕获穿过三棱镜的折射光束。",
    condition: "经过棱镜后，接收 ≥ 60% 光源能量",
    doc: {
      version: 1,
      analysis: { timeBins: 48, positionBins: 64, mode: "exact" },
      items: [
        e("source", "source", 130, 280, { size: 45 }),
        e("prism", "prism", 490, 300, { angle: -90, size: 170 }),
        e("screen", "screen", 800, 300, { size: 200 }),
      ],
    },
  },
  {
    id: "coincidence",
    name: "同一时刻到达",
    tag: "脉冲重合",
    description:
      "两路脉冲分别直射与绕行（两面镜与一块玻璃）后汇聚到同一接收屏。调节重复周期或移动镜面，让两路脉冲在采集窗口内同时抵达。",
    condition: "窗口内两源脉冲重合 ≥ 40 ps，且接收能量 ≥ 2000 W·ps",
    timing: { screenId: "screen", minCoincidence: 40, minEnergy: 2000 },
    doc: {
      version: 1,
      analysis: { timeBins: 64, positionBins: 64, mode: "exact" },
      items: [
        e("pulseA", "pulse", 140, 300, {
          angle: 0,
          size: 20,
          power: 1,
          pulseWidth: 120,
          period: 500,
        }),
        e("pulseB", "pulse", 140, 470, {
          angle: 0,
          size: 20,
          power: 1,
          pulseWidth: 120,
          period: 500,
        }),
        e("mirror1", "mirror", 620, 470, { angle: -45, size: 200 }),
        e("mirror2", "mirror", 620, 180, { angle: -45, size: 200 }),
        e("glass", "glass", 760, 180, {
          angle: 90,
          size: 120,
          thickness: 100,
          index: 1.52,
        }),
        e("screen", "screen", 880, 300, {
          angle: 90,
          size: 360,
          gateStart: 0,
          gateWidth: 6000,
        }),
      ],
    },
  },
];

export const initialDocument: LabDocument = missions[0].doc;
