import type { Element } from "../../../shared/document";
import { defaultTiming, isEmitter, isGlass } from "../../../shared/document";

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
      label: isEmitter(e.kind) ? "光束宽度" : isGlass(e.kind) ? "器件宽度" : "器件口径",
      min: 10,
      max: 300,
      step: 1,
      unit: "mm",
    },
  ];
  if (isEmitter(e.kind))
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
        label: e.kind === "pulse" ? "脉冲峰值功率" : "光源功率",
        min: 0.1,
        max: 3,
        step: 0.1,
        unit: "W",
      },
    );
  if (e.kind === "pulse")
    common.push(
      {
        key: "pulseWidth",
        label: "脉宽 FWHM",
        min: 10,
        max: 2000,
        step: 10,
        unit: "ps",
      },
      {
        key: "period",
        label: "重复周期",
        min: 50,
        max: 5000,
        step: 10,
        unit: "ps",
      },
    );
  if (e.kind === "screen")
    common.push(
      {
        key: "gateStart",
        label: "采集起点",
        min: -5000,
        max: 5000,
        step: 50,
        unit: "ps",
      },
      {
        key: "gateWidth",
        label: "采集窗口",
        min: 100,
        max: 20000,
        step: 100,
        unit: "ps",
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
  if (isGlass(e.kind))
    common.push({
      key: "index",
      label: "折射率 nD",
      min: 1.1,
      max: 2,
      step: 0.01,
      unit: "",
    });
  if (e.kind === "glass")
    common.push({
      key: "thickness",
      label: "玻璃厚度",
      min: 5,
      max: 200,
      step: 5,
      unit: "mm",
    });
  return common;
}

export const timingDefaults = defaultTiming;
