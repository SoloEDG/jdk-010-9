import { useMemo, useState } from "react";
import type { LabDocument } from "../../../shared/document";
import { trace } from "../lib/trace";
export function useOptics(doc: LabDocument) {
  const [visible, setVisible] = useState(true);
  const [normals, setNormals] = useState(false);
  const result = useMemo(() => trace(doc), [doc]);
  return { result, visible, setVisible, normals, setNormals };
}
