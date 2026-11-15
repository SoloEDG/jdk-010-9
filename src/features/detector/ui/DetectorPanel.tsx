import type { Element } from "../../../shared/document";
import type { Measurement } from "../lib/measurement";
import { EnergyChart } from "./EnergyChart";
export function DetectorPanel({
  screen,
  screens,
  measurement: m,
  onChoose,
  resolution,
  onResolution,
}: {
  screen?: Element;
  screens: Element[];
  measurement: Measurement;
  onChoose: (id: string) => void;
  resolution: number;
  onResolution: (n: number) => void;
}) {
  return (
    <section className="detector">
      <div className="section-title">
        接收屏分析 <span className="live-dot">实时测量</span>
      </div>
      <div className="detector-body">
        <div className="chart-wrap">
          <div className="chart-heading">
            <select
              aria-label="接收屏"
              value={screen?.id ?? ""}
              onChange={(e) => onChoose(e.target.value)}
            >
              {screens.length ? (
                screens.map((s, i) => (
                  <option key={s.id} value={s.id}>
                    接收屏 {i + 1}
                  </option>
                ))
              ) : (
                <option value="">尚无接收屏</option>
              )}
            </select>
            <select
              aria-label="采样精度"
              value={resolution}
              onChange={(e) => onResolution(Number(e.target.value))}
            >
              <option value="32">32 区间</option>
              <option value="64">64 区间</option>
              <option value="128">128 区间</option>
            </select>
          </div>
          <EnergyChart measurement={m} />
          <div className="chart-axis">
            <span>−{(screen?.size ?? 0) / 2} mm</span>
            <span>光轴中心</span>
            <span>+{(screen?.size ?? 0) / 2} mm</span>
          </div>
        </div>
        <div className="measurements">
          <div>
            <small>接收能量</small>
            <strong>
              {m.energy.toFixed(3)} <em>W</em>
            </strong>
          </div>
          <div>
            <small>光斑 RMS 半径</small>
            <strong>
              {m.spread.toFixed(2)} <em>mm</em>
            </strong>
          </div>
          <div>
            <small>命中光线</small>
            <strong>
              {m.count} <em>条</em>
            </strong>
          </div>
        </div>
      </div>
    </section>
  );
}
