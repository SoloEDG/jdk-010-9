import { Check, ArrowUpRight, Target, TriangleAlert } from "lucide-react";
import { missions } from "../model/presets";
import type { Evaluation } from "../lib/evaluate";
export function MissionPanel({
  mission,
  evaluation,
  onChoose,
}: {
  mission: (typeof missions)[number];
  evaluation: Evaluation;
  onChoose: (id: string) => void;
}) {
  return (
    <section className="mission-panel">
      <div className="section-title">
        实验任务 <Target size={15} />
      </div>
      <div className="mission-tabs">
        {missions.map((m, i) => (
          <button
            key={m.id}
            className={m.id === mission.id ? "active" : ""}
            onClick={() => onChoose(m.id)}
          >
            0{i + 1}
          </button>
        ))}
      </div>
      <span className="tag">{mission.tag}</span>
      <h2>
        {mission.name}
        <ArrowUpRight size={19} />
      </h2>
      <p>{mission.description}</p>
      <div className="mission-condition">
        {evaluation.complete ? (
          <Check size={15} />
        ) : (
          <span className="circle" />
        )}
        <span>{mission.condition}</span>
      </div>
      {mission.timing && (
        <dl className="mission-metrics">
          <div>
            <dt>窗口内重合</dt>
            <dd>
              {evaluation.overlap.toFixed(0)} <em>ps</em>
            </dd>
          </div>
          <div>
            <dt>接收能量</dt>
            <dd>
              {evaluation.gateEnergy.toFixed(0)} <em>W·ps</em>
            </dd>
          </div>
        </dl>
      )}
      <div className="progress-track">
        <i style={{ width: `${evaluation.progress * 100}%` }} />
      </div>
      {evaluation.uncertain ? (
        <small className="uncertain">
          <TriangleAlert size={11} /> 有光线达到追迹上限，结论未知
        </small>
      ) : (
        <small className={evaluation.complete ? "success" : "muted"}>
          {evaluation.complete
            ? "实验完成 · 已达到目标"
            : "探索中 · 调整器件观察变化"}
        </small>
      )}
      <button className="reset-mission" onClick={() => onChoose(mission.id)}>
        重置本次实验 ↗
      </button>
    </section>
  );
}
