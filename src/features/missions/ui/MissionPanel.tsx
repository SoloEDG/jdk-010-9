import { Check, ArrowUpRight, Target } from "lucide-react";
import { missions } from "../model/presets";
import type { evaluateMission } from "../lib/evaluate";
export function MissionPanel({
  mission,
  evaluation,
  onChoose,
}: {
  mission: (typeof missions)[number];
  evaluation: ReturnType<typeof evaluateMission>;
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
      <div className="progress-track">
        <i style={{ width: `${evaluation.progress * 100}%` }} />
      </div>
      <small className={evaluation.complete ? "success" : "muted"}>
        {evaluation.complete
          ? "实验完成 · 已达到目标"
          : "探索中 · 调整器件观察变化"}
      </small>
      <button className="reset-mission" onClick={() => onChoose(mission.id)}>
        重置本次实验 ↗
      </button>
    </section>
  );
}
