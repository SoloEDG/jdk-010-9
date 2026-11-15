import { useState } from "react";
import {
  Sun,
  Undo2,
  Redo2,
  Save,
  Grid2X2,
  MousePointer2,
  Move,
  Info,
  FlaskConical,
} from "lucide-react";
import { CatalogPanel, Inspector, createElement } from "../features/catalog";
import { Bench, ObjectList, useDocument } from "../features/bench";
import { useOptics, RayLayer, OpticsControls } from "../features/optics";
import { useDetector, DetectorPanel } from "../features/detector";
import {
  initialDocument,
  useMission,
  MissionPanel,
} from "../features/missions";
export function App() {
  const state = useDocument(initialDocument),
    optics = useOptics(state.doc),
    detector = useDetector(state.doc, optics.result),
    mission = useMission(state.doc, optics.result);
  const [grid, setGrid] = useState(true);
  const [help, setHelp] = useState(false);
  const [notice, setNotice] = useState("");
  const selected = state.doc.items.find((e) => e.id === state.selected);
  return (
    <div className="app-shell">
      <header>
        <a className="brand" href="./">
          <span className="brand-mark">
            <Sun size={23} />
          </span>
          LUMEN
          <span className="brand-divider" />
          <small>光学实验室</small>
        </a>
        <div className="document-title">
          未命名实验 <span>本地工作区</span>
        </div>
        <div className="header-actions">
          <button title="撤销" disabled={!state.canUndo} onClick={state.undo}>
            <Undo2 size={17} />
          </button>
          <button title="重做" disabled={!state.canRedo} onClick={state.redo}>
            <Redo2 size={17} />
          </button>
          <i />
          <button
            className="save-button"
            onClick={() => {
              try {
                state.save();
                setNotice("实验已保存到此浏览器");
              } catch {
                setNotice("保存失败，浏览器存储空间不足");
              }
            }}
          >
            <Save size={15} />
            {state.saved ? "已保存" : "保存实验"}
          </button>
        </div>
      </header>
      <div className="workspace-heading">
        <div>
          <span className="eyebrow">THE OPTICS PLAYGROUND</span>
          <h1>
            让光的路径，清晰可见<span>。</span>
          </h1>
        </div>
        <p>
          <i />
          二维几何光学 · 实时模拟
        </p>
      </div>
      <main>
        <aside className="left-sidebar">
          <CatalogPanel
            onAdd={(kind) => {
              if (state.doc.items.length >= 80) {
                setNotice("场景最多容纳 80 个器件");
                return;
              }
              const e = createElement(kind, state.doc.items.length);
              state.replace({ ...state.doc, items: [...state.doc.items, e] });
              state.setSelected(e.id);
            }}
          />
          <ObjectList
            doc={state.doc}
            selected={state.selected}
            onSelect={state.setSelected}
          />
        </aside>
        <div className="center">
          <section className="canvas-panel">
            <div className="canvas-toolbar">
              <div className="canvas-label">
                <FlaskConical size={15} />
                实验台<span>LIVE</span>
              </div>
              <div className="canvas-tools">
                <OpticsControls
                  visible={optics.visible}
                  normals={optics.normals}
                  onVisible={() => optics.setVisible(!optics.visible)}
                  onNormals={() => optics.setNormals(!optics.normals)}
                />
                <button
                  className={grid ? "enabled" : ""}
                  title="切换网格"
                  onClick={() => setGrid(!grid)}
                >
                  <Grid2X2 size={15} />
                </button>
              </div>
            </div>
            <div className="canvas-container">
              <Bench
                doc={state.doc}
                selected={state.selected}
                onSelect={state.setSelected}
                onUpdate={state.update}
                grid={grid}
              >
                <RayLayer
                  doc={state.doc}
                  result={optics.result}
                  visible={optics.visible}
                  normals={optics.normals}
                />
              </Bench>
              <div className="canvas-badge">
                <MousePointer2 size={13} />
                选择与拖动
              </div>
              <div className="scale">
                ━━━━ <span>100 mm</span>
              </div>
            </div>
            <div className="canvas-footer">
              <span>
                <Move size={12} />
                拖动移动器件 <i />
                方向键微调
              </span>
              <span>
                {optics.result.segments.length} 段光路 ·{" "}
                {state.doc.items.length} 个器件
              </span>
            </div>
          </section>
          <DetectorPanel
            {...detector}
            onChoose={detector.setChosen}
            onResolution={detector.setResolution}
          />
        </div>
        <aside className="right-sidebar">
          <Inspector
            element={selected}
            onUpdate={(p) => selected && state.update(selected.id, p)}
            onRemove={() => selected && state.remove(selected.id)}
          />
          <MissionPanel
            mission={mission.mission}
            evaluation={mission.evaluation}
            onChoose={(id) => {
              state.replace(mission.choose(id));
              state.setSelected(null);
            }}
          />
        </aside>
      </main>
      <footer>
        <span>
          <i />
          光路计算已更新
          {optics.result.truncated > 0 ? " · 部分光线达到追迹上限" : ""}
        </span>
        <span>{notice || "所有实验数据保存在你的浏览器中"}</span>
        <button onClick={() => setHelp(!help)}>
          <Info size={13} />
          使用指南
        </button>
      </footer>
      {help && (
        <div className="modal-backdrop" onClick={() => setHelp(false)}>
          <section className="help-modal" onClick={(e) => e.stopPropagation()}>
            <span className="eyebrow">QUICK START</span>
            <h2>在光的世界里动手探索</h2>
            <p>1. 点击左侧器件添加到实验台。</p>
            <p>2. 拖动器件改变位置；右侧调整角度、焦距与波长。</p>
            <p>3. 光线遇到接收屏后终止，底部实时显示命中能量与光斑半径。</p>
            <p>
              4.
              选择实验任务，达到测量条件时自动完成。保存实验后，刷新可恢复器件布局。
            </p>
            <p className="muted">
              透镜采用近轴薄透镜模型。棱镜使用带色散的 Snell
              折射；每条光线最多追迹 32 次。
            </p>
            <button className="save-button" onClick={() => setHelp(false)}>
              开始探索
            </button>
          </section>
        </div>
      )}
    </div>
  );
}
