// src/components/monitoring/evaluatorMonitoring/CheckList.jsx
// A dropdown with tick boxes (several can be ticked, one always stays ticked),
// in the look of the other filters (see PickList). The closed box shows `label`.
import { useEffect, useRef, useState } from "react";
import { Icon } from "./ui";

export default function CheckList({
  label, // text of the closed box
  options, // [{ value, label, hint }]
  values, // the ticked values
  onToggle, // (value) => void
  ariaLabel,
  heading, // small title on top of the list
  footnote,
  allOption, // optional first row: { label, hint, on, onClick } (e.g. "All Roles")
  minWidth = 130,
  ui,
}) {
  const { t } = ui;
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={boxRef} style={{ position: "relative" }}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen((o) => !o)}
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
          cursor: "pointer",
          whiteSpace: "nowrap",
        }}
      >
        <span>{label}</span>
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
          role="listbox"
          aria-multiselectable="true"
          aria-label={ariaLabel}
          style={{
            position: "absolute",
            top: 42,
            right: 0,
            zIndex: 60,
            minWidth: 250,
            padding: 6,
            background: t.surface,
            border: `1px solid ${t.line}`,
            borderRadius: 12,
            boxShadow: t.shadowPop,
          }}
        >
          {heading && (
            <div
              style={{
                padding: "0.4rem 0.6rem 0.5rem",
                fontSize: "0.6rem",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.09em",
                color: t.ink3,
              }}
            >
              {heading}
            </div>
          )}
          {[
            ...(allOption
              ? [{ value: "__all__", ...allOption, isAll: true }]
              : []),
            ...options,
          ].map((o) => {
            const on = o.isAll ? o.on : values.includes(o.value);
            const last = !o.isAll && on && values.length === 1;
            return (
              <button
                key={o.value}
                type="button"
                role="option"
                aria-selected={on}
                onClick={() => (o.isAll ? o.onClick() : onToggle(o.value))}
                title={last ? "At least one has to stay ticked" : undefined}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  width: "100%",
                  padding: "0.5rem 0.6rem",
                  marginBottom: o.isAll ? 6 : 2,
                  textAlign: "left",
                  background: on ? t.blueSoft : "transparent",
                  border: "none",
                  borderRadius: 8,
                  color: t.ink,
                  cursor: last ? "default" : "pointer",
                  transition: "background .12s",
                }}
                onMouseEnter={(e) =>
                  !on && (e.currentTarget.style.background = t.rowHover)
                }
                onMouseLeave={(e) =>
                  !on && (e.currentTarget.style.background = "transparent")
                }
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: 18,
                    height: 18,
                    flexShrink: 0,
                    borderRadius: 6,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: on ? t.blue : "transparent",
                    border: `1.5px solid ${on ? t.blue : t.lineStrong}`,
                    color: "#ffffff",
                    transition: "background .15s, border-color .15s",
                  }}
                >
                  {on && <Icon name="check" size={12} />}
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span
                    style={{
                      display: "block",
                      fontSize: "0.76rem",
                      fontWeight: 600,
                      color: on ? t.blueText : t.ink,
                    }}
                  >
                    {o.label}
                  </span>
                  {o.hint && (
                    <span
                      style={{
                        display: "block",
                        marginTop: 1,
                        fontSize: "0.66rem",
                        color: t.ink3,
                      }}
                    >
                      {o.hint}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
          {footnote && (
            <div
              style={{
                margin: "4px 0.2rem 0",
                padding: "0.5rem 0.4rem 0.2rem",
                borderTop: `1px solid ${t.line}`,
                fontSize: "0.64rem",
                color: t.ink3,
              }}
            >
              {footnote}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
