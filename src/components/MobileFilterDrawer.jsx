import { useEffect, useRef } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { usePreferences } from "./Preferences";
import { useViewActive } from "./RetainedView";

export function MobileFilterButton({ onClick, label = "Filters" }) {
  const { t } = usePreferences();
  return (
    <button className="mobile-filter-button" type="button" onClick={onClick}>
      <SlidersHorizontal size={18} />
      {t(label)}
    </button>
  );
}

export default function MobileFilterDrawer({ open, title, onClose, children }) {
  const active = useViewActive();
  const dialog = useRef(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    if (!open || !active) return undefined;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.current?.querySelector("button")?.focus();
    const handleKey = event => {
      if (event.key === "Escape") { event.preventDefault(); close.current(); }
      if (event.key !== "Tab") return;
      const controls = [...dialog.current.querySelectorAll("button:not(:disabled), select:not(:disabled), a[href]")];
      const first = controls[0], last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [open, active]);
  if (!open) return null;
  return (
    <div className={`drawer-shell ${open ? "is-open" : ""}`} aria-hidden={!open}>
      <button className="drawer-backdrop" type="button" aria-label="Close filters" onClick={onClose} />
      <aside ref={dialog} className="filter-drawer" role="dialog" aria-modal="true" aria-label={title}>
        <div className="drawer-title">
          <h3>{title}</h3>
          <button type="button" aria-label="Close filters" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        {children}
      </aside>
    </div>
  );
}
