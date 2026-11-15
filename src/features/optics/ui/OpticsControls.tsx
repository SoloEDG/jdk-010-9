import { Eye, Compass } from "lucide-react";
export function OpticsControls({
  visible,
  normals,
  onVisible,
  onNormals,
}: {
  visible: boolean;
  normals: boolean;
  onVisible: () => void;
  onNormals: () => void;
}) {
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
    </div>
  );
}
