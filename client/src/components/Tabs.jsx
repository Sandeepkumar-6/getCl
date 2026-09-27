import { useRef } from "react";
import { cx } from "./UI";

// Tablist with arrow-key navigation. tabs: [{ id, label, count, needsViewer }]
export default function Tabs({ label, tabs, selected, onSelect, idPrefix = "tab" }) {
  const refs = useRef({});
  const move = (event, index) => {
    const keys = { ArrowRight: 1, ArrowLeft: -1, Home: "first", End: "last" };
    if (!(event.key in keys)) return;
    event.preventDefault();
    const step = keys[event.key];
    const nextIndex = step === "first" ? 0 : step === "last" ? tabs.length - 1 : (index + step + tabs.length) % tabs.length;
    const next = tabs[nextIndex];
    onSelect(next.id);
    refs.current[next.id]?.focus();
  };
  return (
    <div className="gc-tabs" role="tablist" aria-label={label}>
      {tabs.map((tab, index) => (
        <button
          key={tab.id}
          ref={(el) => { refs.current[tab.id] = el; }}
          type="button"
          role="tab"
          id={`${idPrefix}-${tab.id}`}
          aria-selected={selected === tab.id}
          aria-controls={selected === tab.id ? `${idPrefix}-${tab.id}-panel` : undefined}
          tabIndex={selected === tab.id ? 0 : -1}
          className="gc-tab"
          onClick={() => onSelect(tab.id)}
          onKeyDown={(e) => move(e, index)}
        >
          {tab.label}
          {tab.count > 0 && <span className={cx("gc-tab-n", tab.needsViewer && "is-action")}>{tab.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function TabPanel({ id, idPrefix = "tab", children }) {
  return (
    <div role="tabpanel" id={`${idPrefix}-${id}-panel`} aria-labelledby={`${idPrefix}-${id}`} tabIndex={0} className="gc-tabpanel">
      {children}
    </div>
  );
}
