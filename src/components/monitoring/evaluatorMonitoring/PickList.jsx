// src/components/monitoring/evaluatorMonitoring/PickList.jsx
// A one-choice dropdown in the look of the page (Year, Month). The closed box is
// the same as the other fields; the list is a soft card with the chosen row in
// light blue and a check mark. Click outside or Esc closes it; the arrow keys
// and Enter work too.
import { useEffect, useRef, useState } from "react";
import { Icon } from "./ui";

export default function PickList({
  value,
  options, // [{ value, label }]
  onChange,
  ariaLabel,
  heading, // small title on top of the list
  disabled = false,
  minWidth = 120,
  ui,
}) {
  const { t } = ui;
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1); // row under the keyboard
  const boxRef = useRef(null);
  const listRef = useRef(null);
  const current = options.find((o) => String(o.value) === String(value));

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  // keep the row under the keyboard (or the chosen row) in view
  useEffect(() => {
    if (!open) return;
    const i = active >= 0 ? active : options.findIndex((o) => String(o.value) === String(value));
    listRef.current?.querySelector(`[data-i="${i}"]`)?.scrollIntoView({ block: "nearest" });
  }, [open, active]); // eslint-disable-line react-hooks/exhaustive-deps

  const pick = (o) => {
    onChange(o.value);
    setOpen(false);
  };

  const onKeyDown = (e) => {
    if (disabled) return;
    if (e.key === "Escape") return setOpen(false);
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const step = e.key === "ArrowDown" ? 1 : -1;
      if (!open) {
        setOpen(true);
        setActive(options.findIndex((o) => String(o.value) === String(value)));
        return;
      }
      setActive((a) => Math.min(options.length - 1, Math.max(0, (a < 0 ? 0 : a) + step)));
    } else if (e.key === "Enter" && open && active >= 0) {
      e.preventDefault();
      pick(options[active]);
    }
  };

  return (
    <div ref={boxRef} style={{ position: "relative" }}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => {
          setOpen((o) => !o);
          setActive(-1);
        }}
        onKeyDown={onKeyDown}
        onFocus={ui.focusOn}
        onBlur={ui.focusOff}
        style={{
          ...ui.field,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          minWidth,
          padding: "0 0.6rem 0 0.8rem",
          cursor: disabled ? "default" : "pointer",
          opacity: disabled ? 0.5 : 1,
          whiteSpace: "nowrap",
        }}
      >
        <span>{current?.label ?? value}</span>
        <Icon
          name="chevron"
          size={15}
          style={{
            color: t.ink2,
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform .2s",
          }}
        />
      </button>
      {open && (
        <div
          className="em-pop"
          style={{
            position: "absolute",
            top: 42,
            right: 0,
            zIndex: 60,
            minWidth: Math.max(minWidth, 170),
            background: t.surface,
            border: `1px solid ${t.line}`,
            borderRadius: 12,
            boxShadow: t.shadowPop,
            overflow: "hidden",
          }}
        >
          {heading && (
            <div
              style={{
                padding: "0.55rem 0.9rem",
                fontSize: "0.6rem",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.09em",
                color: t.ink3,
                borderBottom: `1px solid ${t.line}`,
              }}
            >
              {heading}
            </div>
          )}
          <div
            ref={listRef}
            role="listbox"
            aria-label={ariaLabel}
            style={{ maxHeight: 280, overflowY: "auto", padding: 6 }}
          >
            {options.map((o, i) => {
              const on = String(o.value) === String(value);
              const hot = i === active;
              return (
                <button
                  key={o.value}
                  type="button"
                  role="option"
                  aria-selected={on}
                  data-i={i}
                  onClick={() => pick(o)}
                  onMouseEnter={(e) => !on && (e.currentTarget.style.background = t.rowHover)}
                  onMouseLeave={(e) =>
                    !on && (e.currentTarget.style.background = hot ? t.rowHover : "transparent")
                  }
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    width: "100%",
                    padding: "0.45rem 0.6rem",
                    textAlign: "left",
                    fontSize: "0.76rem",
                    fontWeight: on ? 600 : 400,
                    color: on ? t.blueText : t.ink,
                    background: on ? t.blueSoft : hot ? t.rowHover : "transparent",
                    border: "none",
                    borderRadius: 8,
                    cursor: "pointer",
                    transition: "background .12s",
                  }}
                >
                  {o.label}
                  {on && <Icon name="check" size={13} />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
