import { Menu, X } from "lucide-react";
import { useState } from "react";
import { usePreferences, PreferencesControls } from "./Preferences";

const navItems = [
  ["Overview", "overview"],
  ["Regional Patterns", "regional-patterns"],
  ["Multimodal", "multimodal"],
  ["Intersections", "intersections"],
  ["Interchanges", "interchanges"],
];

export default function BrandHeader({ activePage = "overview" }) {
  const { t } = usePreferences();
  const [open, setOpen] = useState(false);

  const close = () => setOpen(false);

  return (
    <header className="brand-header">
      <a className="brand-lockup" href="#overview" aria-label="Regional Traffic Explorer home" onClick={close}>
        <img src="./assets/mapa-logo-tag-blue-grey.png" alt="MAPA logo" />
      </a>

      <nav className="desktop-nav" aria-label="Primary navigation">
        {navItems.map(([label, id]) => (
          <a key={id} href={`#${id}`} aria-current={activePage === id ? "page" : undefined}>
            {t(label)}
          </a>
        ))}
      </nav>
      <PreferencesControls />

      <button
        className="menu-button"
        type="button"
        aria-label={open ? "Close navigation menu" : "Open navigation menu"}
        aria-expanded={open}
        aria-controls="mobile-navigation"
        onClick={() => setOpen((current) => !current)}
      >
        {open ? <X size={22} /> : <Menu size={22} />}
      </button>

      <div id="mobile-navigation" className={`mobile-nav ${open ? "is-open" : ""}`} onKeyDown={event => {
        if (event.key === "Escape") { close(); document.querySelector(".menu-button")?.focus(); }
      }}>
        <nav aria-label="Mobile navigation">
          {navItems.map(([label, id]) => (
            <a key={id} href={`#${id}`} onClick={close} aria-current={activePage === id ? "page" : undefined}>
              {t(label)}
            </a>
          ))}
        </nav>
      </div>
    </header>
  );
}
