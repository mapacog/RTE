import { createContext, useContext, useEffect, useRef } from "react";
import { stopReadingAloud } from "./Preferences";

const ViewActiveContext = createContext(true);
export const useViewActive = () => useContext(ViewActiveContext);

export default function RetainedView({ active, children }) {
  const parentActive = useViewActive();
  const visible = active && parentActive;
  const retained = useRef(null);
  const wasVisible = useRef(visible);
  useEffect(() => {
    if (wasVisible.current && !visible) stopReadingAloud();
    wasVisible.current = visible;
  }, [visible]);
  // Keep the last visible props and mounted children until this view is revisited.
  if (visible) retained.current = children;
  if (!retained.current) return null;
  return <ViewActiveContext.Provider value={visible}>
    <div className="retained-view" hidden={!visible} inert={visible ? undefined : ""}>{retained.current}</div>
  </ViewActiveContext.Provider>;
}
