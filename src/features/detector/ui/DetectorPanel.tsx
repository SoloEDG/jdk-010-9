import type { Element, LabDocument, TraceResult } from "../../../shared/document";
import { MAX_BOUNCES } from "../../../shared/document";
import { labels, type AnalysisSettings } from "../../../shared/document";
import type { ScreenAnalysis } from "../lib/analysis";
import { emittedEnergy } from "../lib/analysis";
import { JointChart, TimeChart, sourceColor } from "./JointChart";

export function DetectorPanel({
  screen,
  screens,
  analysis,
  doc,
  onChoose,
  onAnalysis,
  onUpdateScreen,
  playhead,
  trace,
}: {
  screen?: Element;
  screens: Element[];
  analysis: ScreenAnalysis | null;
  doc: LabDocument;
  onChoose: (id: string) => void;
  onAnalysis: (patch: Partial<AnalysisSettings>) => void;
  onUpdateScreen: (patch: Partial<Element>) => void;
  /** Shared clock instant, drawn on both charts. */
  playhead: number;
  /** Whole-scene trace summary, for the unknown / no-signal distinction. */
  trace: TraceResult;
}) {
  const gate = analysis?.gate;
  const emitted = gate ? emittedEnergy(doc, gate) : 0;
  return (
    <section className="detector">
      <div className="section-title">
        时间门控接收屏 <span className="live-dot">实时测量</span>
      </div>
      <div className="chart-heading detector-heading">
        <select
          aria-label="接收屏"
          value={screen?.id ?? ""}
          onChange={(e) => onChoose(e.target.value)}
        >
          {screens.length ? (
            screens.map((s, i) => (
              <option key={s.id} value={s.id}>
                接收屏 {i + 1} · 门宽 {Math.round(s.gateWidth)} ps
              </option>
            ))
          ) : (
            <option value="">尚无接收屏</option>
          )}
        </select>
        <div className="gate-fields">
          <label title="采集窗口起点（相对共同时间零点）">
            起
            <input
              aria-label="采集起点 ps"
              type="number"
              step={50}
              value={screen?.gateStart ?? 0}
              disabled={!screen}
              onChange={(e) =>
                onUpdateScreen({ gateStart: Number(e.target.value) })
              }
            />
          </label>
          <label title="采集窗口宽度">
            宽
            <input
              aria-label="采集窗口 ps"
              type="number"
              step={100}
              min={1}
              value={screen?.gateWidth ?? 0}
              disabled={!screen}
              onChange={(e) =>
                onUpdateScreen({ gateWidth: Number(e.target.value) })
              }
            />
          </label>
          <span className="unit">ps</span>
        </div>
      </div>
      {!analysis ? (
        <p className="empty">添加接收屏后可分析到达时间与位置</p>
      ) : (
        <div className="detector-body">
          <div className="chart-wrap">
            <div className="chart-heading">
              <span className="chart-legend">
                {analysis.sources.length === 0 ? (
                  <i style={{ color: "#637683" }}>● 无到达信号</i>
                ) : (
                  analysis.sources.map((id, i) => (
                    <i key={id} style={{ color: sourceColor(i) }}>
                      ● {nameOf(doc, id)}
                    </i>
                  ))
                )}
              </span>
              <div className="chart-tools">
                <select
                  aria-label="估计方式"
                  value={doc.analysis.mode}
                  onChange={(e) =>
                    onAnalysis({
                      mode: e.target.value as AnalysisSettings["mode"],
                    })
                  }
                >
                  <option value="exact">精确区间传播</option>
                  <option value="binned">时间分桶采样</option>
                </select>
                <select
                  aria-label="时间分桶"
                  value={doc.analysis.timeBins}
                  onChange={(e) =>
                    onAnalysis({ timeBins: Number(e.target.value) })
                  }
                >
                  {[24, 48, 64, 96, 128].map((n) => (
                    <option key={n} value={n}>
                      {n} 时间桶
                    </option>
                  ))}
                </select>
                <select
                  aria-label="位置分桶"
                  value={doc.analysis.positionBins}
                  onChange={(e) =>
                    onAnalysis({ positionBins: Number(e.target.value) })
                  }
                >
                  {[32, 64, 96, 128].map((n) => (
                    <option key={n} value={n}>
                      {n} 位置桶
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="joint-wrap">
              <JointChart analysis={analysis} playhead={playhead} />
              <TimeChart analysis={analysis} playhead={playhead} />
              <span className="axis-label y">位置 / mm</span>
              <span className="axis-label x">到达时刻 / ps</span>
            </div>
            <div className="chart-axis">
              <span>{fmt(gate!.start)} ps</span>
              <span>
                {(screen!.size / 2).toFixed(0)} ↔ −{(screen!.size / 2).toFixed(0)}{" "}
                mm
              </span>
              <span>{fmt(gate!.start + gate!.width)} ps</span>
            </div>
            <p className={`error-bound ${analysis.error.binNarrowerThanPulse ? "warn" : ""}`}>
              误差边界 · 时间桶 {analysis.binWidth.toFixed(1)} ps，位置桶{" "}
              {analysis.posBinWidth.toFixed(1)} mm；实测 L1 ={" "}
              {analysis.error.l1.toFixed(1)} W·ps（上限{" "}
              {analysis.error.boundL1.toFixed(0)}）；工作量{" "}
              {analysis.error.exactWork} / {analysis.error.binnedWork} 次单元更新
              {analysis.error.binNarrowerThanPulse
                ? " · 桶宽小于脉宽，分桶会丢峰"
                : ""}
            </p>
          </div>
          <div className="measurements">
            <div>
              <small>窗口内接收能量</small>
              <strong>
                {analysis.energy.toFixed(1)} <em>W·ps</em>
              </strong>
              <small className="sub">
                发射 {emitted.toFixed(0)} · 占比{" "}
                {emitted ? ((analysis.energy / emitted) * 100).toFixed(0) : 0}%
              </small>
            </div>
            <div>
              <small>
                {analysis.hasPulsedArrivals
                  ? "到达时刻 均值 / RMS"
                  : "照明时段中心 / RMS"}
              </small>
              <strong>
                {fmt(analysis.centroidTime)} <em>ps</em>
              </strong>
              <small className="sub">
                {analysis.hasPulsedArrivals
                  ? `± ${fmt(analysis.spreadTime)} ps · `
                  : "连续光充满窗口 · "}
                峰值桶 {analysis.peakCell.toFixed(1)} W·ps
              </small>
            </div>
            <div>
              <small>光斑中心 / RMS</small>
              <strong>
                {fmt1(analysis.centroidPosition)} <em>mm</em>
              </strong>
              <small className="sub">± {fmt1(analysis.spreadPosition)} mm</small>
            </div>
            <div>
              <small>双源重合</small>
              <strong>
                {fmt1(analysis.coincidence.overlap)} <em>ps</em>
              </strong>
              <small className="sub">
                {analysis.coincidence.sources
                  ? `${analysis.coincidence.sources.map((id) => nameOf(doc, id)).join(" ↔ ")} @ ${fmt(analysis.coincidence.at ?? 0)} ps`
                  : "窗口内无两源同时到达"}
              </small>
              <small className="sub">
                图示可分辨 {fmt1(analysis.displayCoincidence.overlap)} ps
                {Math.abs(
                  analysis.displayCoincidence.overlap -
                    analysis.coincidence.overlap,
                ) > analysis.binWidth / 2
                  ? " · 与真实重叠的差异来自分桶分辨率"
                  : ""}
              </small>
            </div>
          </div>
        </div>
      )}
      {analysis && (
        <div className="detector-status">
          {analysis.truncated && (
            <span className="badge bad">
              ⚠ 事件/单元已达资源上限，直方图不完整（与“无信号”不同）
            </span>
          )}
          {analysis.droppedPeriods > 0 && (
            <span className="badge bad">
              ⚠ 周期重叠超出上限，省略 {analysis.droppedPeriods} 个周期
            </span>
          )}
          {analysis.arrivalsOutsideGate > 0 && (
            <span className="badge neutral">
              {analysis.arrivalsOutsideGate} 条到达射线（共 {analysis.arrivals.length}{" "}
              条）的所有重复脉冲都落在窗口外
            </span>
          )}
          {analysis.events.length === 0 && trace.unknown === 0 && (
            <span className="badge neutral">
              当前窗口内没有任何到达事件（无信号，非未知）
            </span>
          )}
          {trace.unknown > 0 && (
            <span className="badge bad">
              ⚠ {trace.unknown} 条光线达到 {MAX_BOUNCES} 次交互上限 · 到达结果未知
            </span>
          )}
          {trace.unknown === 0 &&
            trace.escaped > 0 &&
            analysis.arrivals.length === 0 && (
              <span className="badge neutral">
                {trace.escaped} 条光线驶出场景 · 已确认无信号
              </span>
            )}
          {!analysis.truncated && analysis.events.length > 0 && (
            <span className="badge ok">
              时间基准一致 · {analysis.events.length} 个到达事件 /{" "}
              {analysis.arrivals.length} 条射线
            </span>
          )}
        </div>
      )}
    </section>
  );
}

function nameOf(doc: LabDocument, id: string) {
  const idx = doc.items.findIndex((e) => e.id === id);
  if (idx < 0) return "未知源";
  return `${labels[doc.items[idx].kind]} ${String(idx + 1).padStart(2, "0")}`;
}

function fmt(v: number) {
  return Number.isFinite(v) ? v.toFixed(0) : "—";
}

function fmt1(v: number) {
  return Number.isFinite(v) ? v.toFixed(1) : "—";
}
