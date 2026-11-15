import type { Element } from "../../../shared/document";
export interface Parameter {
  key: keyof Element;
  label: string;
  min: number;
  max: number;
  step: number;
  unit: string;
}
export function parameters(e: Element): Parameter[] {
  const common: Parameter[] = [
    {
      key: "angle",
      label: "旋转角度",
      min: -180,
      max: 180,
      step: 1,
      unit: "°",
    },
    {
      key: "size",
      label: e.kind === "source" ? "光束宽度" : "器件口径",
      min: 10,
      max: 300,
      step: 1,
      unit: "mm",
    },
  ];
  if (e.kind === "source")
    common.push(
      {
        key: "wavelength",
        label: "波长",
        min: 380,
        max: 750,
        step: 1,
        unit: "nm",
      },
      { key: "rays", label: "采样光线", min: 3, max: 41, step: 2, unit: "条" },
      { key: "spread", label: "发散角", min: 0, max: 60, step: 1, unit: "°" },
      {
        key: "power",
        label: "光源功率",
        min: 0.1,
        max: 3,
        step: 0.1,
        unit: "W",
      },
    );
  if (e.kind === "lens")
    common.push({
      key: "focal",
      label: "焦距",
      min: -300,
      max: 400,
      step: 10,
      unit: "mm",
    });
  if (e.kind === "prism")
    common.push({
      key: "index",
      label: "折射率 nD",
      min: 1.1,
      max: 2,
      step: 0.01,
      unit: "",
    });
  return common;
}
