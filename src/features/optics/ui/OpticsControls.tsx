import { Eye, Compass, Play, Pause, RotateCcw } from "lucide-react";
export function OpticsControls({
  visible,
  normals,
  playing,
  onVisible,
  onNormals,
  onPlay,
  onScrub,
  onReplay,
  playhead,
  gateStart,
  gateWidth,
}: {
  visible: boolean;
  normals: boolean;
  playing: boolean;
  onVisible: () => void;
  onNormals: () => void;
  onPlay: () => void;
  onScrub: (fraction: number) => void;
  onReplay: () => void;
  playhead: number;
  gateStart: number;
  gateWidth: number;
}) {
  const fraction = gateWidth
    ? Math.max(0, Math.min(1, (playhead - gateStart) / gateWidth))
    : 0;
  return (
    <div className="optics-controls">
      <button className={visible ? "enabled" : ""} onClick={onVisible}>
        <Eye size={14} />
        光路
      </button>
      <button className={normals ? "enabled" : ""} onClick={onNormals}>
        <Compass size={14} />
        法线
      </button>
      <button
        className={playing ? "enabled" : ""}
        onClick={onPlay}
        aria-label="播放时间轴"
        title="按共同时间基准播放"
      >
        {playing ? <Pause size={14} /> : <Play size={14} />}
        时间轴
      </button>
      <input
        className="playhead"
        aria-label="时间刻度"
        type="range"
        min={0}
        max={1}
        step={0.001}
        value={fraction}
        onChange={(e) => onScrub(Number(e.target.value))}
        title="拖动查看任意时刻的光路"
      />
      <span className="playhead-readout">{playhead.toFixed(0)} ps</span>
      <button onClick={onReplay} title="从窗口起点播放">
        <RotateCcw size={13} />
      </button>
    </div>
  );
}
