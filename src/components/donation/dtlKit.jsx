// FILE: src/components/donation/dtlKit.jsx
// Shared "detail modal" design-system kit used by DonationInfoModal and
// DonationUpdateModal (Application-Details-style header, stat bar, and
// collapsible label:value sections). Bundled as one file since these
// pieces are tightly coupled and none are meaningfully reusable alone.
import { useState, useContext, createContext } from "react";

export const DTL_ACCENT = "#2563eb";
export const DTL_ACCENT_BG = "#eff6ff";
export const DTL_ICON_BG = "#e0e7ff";
export const DTL_LABEL_GRAY = "#7a8190";
export const dtlIsBlank = (v) => v === null || v === undefined || v === "" || v === "—";
export function DTLEmptyHint({ colors }) {
  return (
    <span style={{ color: colors?.textTertiary, fontStyle: "italic" }}>empty</span>
  );
}

export const DTL_STATUS_TONE = {
  Approved: { bg: "#dcfce7", color: "#16a34a" },
  Disapproved: { bg: "#fee2e2", color: "#dc2626" },
  "For Evaluation": { bg: "#fef3c7", color: "#b45309" },
};
export const dtlStatusTone = (status) => DTL_STATUS_TONE[status] || { bg: "#e0e7ff", color: "#4338ca" };

export const DTLLabelWidthContext = createContext(null);

/* Shell: overlay + card + left-icon header (+ optional subtitle/stepper) + footer */
export function DTLModalFrame({ onClose, icon, title, subtitle, stepper, headerActions, footer, children, colors, minBodyHeight }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(1100px, 95vw)",
          maxHeight: "90vh",
          background: colors.cardBg,
          border: `1px solid ${colors.cardBorder}`,
          borderRadius: 14,
          boxShadow: `0 0 0 1px rgba(76,175,80,0.2),
            0 0 30px 4px rgba(76,175,80,0.22),
            0 0 60px 10px rgba(76,175,80,0.12),
            0 16px 48px rgba(0,0,0,0.35)`,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "0.85rem 1.25rem",
            borderBottom: `1px solid ${colors.cardBorder}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "1rem",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", minWidth: 0 }}>
            <span
              style={{
                width: 30,
                height: 30,
                borderRadius: 8,
                background: DTL_ACCENT_BG,
                color: DTL_ACCENT,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.95rem",
                flexShrink: 0,
              }}
            >
              {icon}
            </span>
            <div style={{ minWidth: 0 }}>
              <h2
                style={{
                  fontSize: "0.92rem",
                  fontWeight: 700,
                  color: colors.textPrimary,
                  margin: 0,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {title}
              </h2>
              {subtitle && (
                <p style={{ fontSize: "0.65rem", color: colors.textTertiary, margin: "0.1rem 0 0" }}>
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          {stepper && <div style={{ flexShrink: 0 }}>{stepper}</div>}
          {headerActions && <div style={{ flexShrink: 0, display: "flex", gap: "0.25rem" }}>{headerActions}</div>}
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              border: "none",
              background: "transparent",
              color: colors.textSecondary,
              cursor: "pointer",
              fontSize: "1rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ minHeight: minBodyHeight, maxHeight: "68vh", overflowY: "auto", padding: "0.85rem 1.25rem" }}>
          {children}
        </div>

        {footer && (
          <div
            style={{
              padding: "0.6rem 1.25rem",
              borderTop: `1px solid ${colors.cardBorder}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "0.5rem",
              flexShrink: 0,
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export function DTLStatBar({ children, colors }) {
  return (
    <div
      style={{
        padding: "0.7rem 0.9rem",
        background: colors.inputBg,
        border: `1px solid ${colors.cardBorder}`,
        borderRadius: 8,
        display: "flex",
        alignItems: "center",
        gap: "1.75rem",
        flexWrap: "wrap",
        marginBottom: "0.75rem",
      }}
    >
      {children}
    </div>
  );
}

export function DTLStatCell({ label, children, original, value, colors }) {
  const changed =
    original !== undefined &&
    (dtlIsBlank(value) ? "" : value) !== (dtlIsBlank(original) ? "" : original);
  return (
    <div>
      <div
        style={{
          fontSize: "0.6rem",
          color: changed ? "#f59e0b" : DTL_LABEL_GRAY,
          fontWeight: changed ? 700 : 400,
          marginBottom: "0.25rem",
          textTransform: "uppercase",
          letterSpacing: "0.03em",
        }}
      >
        {label}
        {changed && " •"}
      </div>
      <div style={{ fontSize: "0.78rem", fontWeight: 700 }}>{children}</div>
      {changed && (
        <div style={{ fontSize: "0.6rem", color: colors?.textTertiary, marginTop: 2, fontWeight: 400 }}>
          Original:{" "}
          {dtlIsBlank(original) ? (
            <DTLEmptyHint colors={colors} />
          ) : (
            <span style={{ textDecoration: "line-through", whiteSpace: "pre-line" }}>{original}</span>
          )}
        </div>
      )}
    </div>
  );
}

export function DTLStatusPill({ status }) {
  const tone = dtlStatusTone(status);
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.3rem",
        padding: "0.2rem 0.6rem",
        background: tone.bg,
        color: tone.color,
        borderRadius: 999,
        fontSize: "0.68rem",
        fontWeight: 700,
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: tone.color, display: "inline-block" }} />
      {status}
    </span>
  );
}

export function DTLStatusSelect({ value, onChange }) {
  const tone = dtlStatusTone(value);
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.3rem",
        padding: "0.15rem 0.5rem",
        background: tone.bg,
        borderRadius: 999,
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: tone.color }} />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          background: "transparent",
          border: "none",
          outline: "none",
          color: tone.color,
          fontSize: "0.68rem",
          fontWeight: 700,
          cursor: "pointer",
          fontFamily: "inherit",
        }}
      >
        <option value="Approved">Approved</option>
        <option value="Disapproved">Disapproved</option>
        <option value="For Evaluation">For Evaluation</option>
      </select>
    </span>
  );
}

export function DTLBarInput({ value, onChange, colors, width = "140px" }) {
  return (
    <input
      type="text"
      value={dtlIsBlank(value) ? "" : value}
      placeholder="empty"
      onChange={(e) => onChange(e.target.value)}
      style={{
        fontSize: "0.78rem",
        fontWeight: 700,
        color: colors.textPrimary,
        background: "transparent",
        border: "none",
        borderBottom: `1px dashed ${colors.cardBorder}`,
        outline: "none",
        padding: "0.1rem 0",
        width,
        fontFamily: "inherit",
      }}
      onFocus={(e) => (e.currentTarget.style.borderBottomColor = DTL_ACCENT)}
      onBlur={(e) => (e.currentTarget.style.borderBottomColor = colors.cardBorder)}
    />
  );
}

export function DTLSection({ icon, title, children, colors, labelWidth = 120, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ border: `1px solid ${colors.cardBorder}`, borderRadius: 8, marginBottom: "0.65rem" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0.6rem 0.85rem",
          background: colors.cardBg,
          border: "none",
          borderBottom: open ? `1px solid ${colors.cardBorder}` : "none",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span
            style={{
              width: 22,
              height: 22,
              borderRadius: "50%",
              background: DTL_ICON_BG,
              color: DTL_ACCENT,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "0.68rem",
              flexShrink: 0,
            }}
          >
            {icon}
          </span>
          <span style={{ fontSize: "0.76rem", fontWeight: 700, color: DTL_ACCENT }}>{title}</span>
        </span>
        <span
          style={{
            fontSize: "0.65rem",
            color: colors.textTertiary,
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform 0.2s",
          }}
        >
          ▾
        </span>
      </button>
      {open && (
        <div
          style={{
            padding: "0.75rem 0.85rem",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            rowGap: "0.5rem",
            columnGap: "1rem",
            background: colors.cardBg,
          }}
        >
          <DTLLabelWidthContext.Provider value={labelWidth}>{children}</DTLLabelWidthContext.Provider>
        </div>
      )}
    </div>
  );
}

export function DTLRow({ label, value, colors, fullWidth }) {
  const labelWidth = useContext(DTLLabelWidthContext);
  const isEmpty = dtlIsBlank(value);
  return (
    <div
      style={{
        display: "flex",
        fontSize: "0.72rem",
        gap: "0.35rem",
        alignItems: "flex-start",
        gridColumn: fullWidth ? "1 / -1" : undefined,
      }}
    >
      <span style={{ flexShrink: 0, width: labelWidth ? `${labelWidth}px` : undefined, color: DTL_LABEL_GRAY, whiteSpace: "nowrap" }}>
        {label}
      </span>
      <span style={{ color: DTL_LABEL_GRAY, flexShrink: 0 }}>:</span>
      {isEmpty ? (
        <DTLEmptyHint colors={colors} />
      ) : (
        <span style={{ color: colors.textPrimary, fontWeight: 500, wordBreak: "break-word", whiteSpace: "pre-line" }}>{value}</span>
      )}
    </div>
  );
}

export function DTLEdit({ label, value, original, onChange, colors, fullWidth, textarea, rows = 2 }) {
  const labelWidth = useContext(DTLLabelWidthContext);
  const changed =
    original !== undefined &&
    (dtlIsBlank(value) ? "" : value) !== (dtlIsBlank(original) ? "" : original);
  const baseStyle = {
    color: colors.textPrimary,
    fontWeight: 500,
    fontSize: "0.72rem",
    fontFamily: "inherit",
    background: "transparent",
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
  };
  const handleFocus = (e) => {
    e.currentTarget.style.borderColor = DTL_ACCENT;
    e.currentTarget.style.borderBottomColor = DTL_ACCENT;
  };
  const handleBlur = (e) => {
    e.currentTarget.style.borderColor = colors.cardBorder;
    e.currentTarget.style.borderBottomColor = colors.cardBorder;
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem", gridColumn: fullWidth ? "1 / -1" : undefined }}>
      <div
        style={{
          display: "flex",
          fontSize: "0.72rem",
          gap: "0.35rem",
          alignItems: textarea ? "flex-start" : "center",
        }}
      >
        <span
          style={{
            flexShrink: 0,
            width: labelWidth ? `${labelWidth}px` : undefined,
            color: changed ? "#f59e0b" : DTL_LABEL_GRAY,
            fontWeight: changed ? 700 : 400,
            whiteSpace: "nowrap",
            paddingTop: textarea ? "0.3rem" : 0,
          }}
        >
          {label}
          {changed && " •"}
        </span>
        <span style={{ color: DTL_LABEL_GRAY, flexShrink: 0, paddingTop: textarea ? "0.3rem" : 0 }}>:</span>
        {textarea ? (
          <textarea
            rows={rows}
            value={dtlIsBlank(value) ? "" : value}
            placeholder="empty"
            onChange={(e) => onChange(e.target.value)}
            style={{
              ...baseStyle,
              padding: "0.3rem 0.45rem",
              border: `1px dashed ${changed ? "#f59e0b" : colors.cardBorder}`,
              borderRadius: 5,
            }}
            onFocus={handleFocus}
            onBlur={handleBlur}
          />
        ) : (
          <input
            type="text"
            value={dtlIsBlank(value) ? "" : value}
            placeholder="empty"
            onChange={(e) => onChange(e.target.value)}
            style={{
              ...baseStyle,
              padding: "0.05rem 0",
              border: "none",
              borderBottom: `1px dashed ${changed ? "#f59e0b" : colors.cardBorder}`,
            }}
            onFocus={handleFocus}
            onBlur={handleBlur}
          />
        )}
      </div>
      {changed && (
        <div
          style={{
            fontSize: "0.62rem",
            color: colors.textTertiary,
            marginLeft: labelWidth ? `${labelWidth + 16}px` : undefined,
          }}
        >
          Original:{" "}
          {dtlIsBlank(original) ? (
            <DTLEmptyHint colors={colors} />
          ) : (
            <span style={{ textDecoration: "line-through", whiteSpace: "pre-line" }}>{original}</span>
          )}
        </div>
      )}
    </div>
  );
}

export function DTLStepIndicator({ currentStep, steps, colors }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
      {steps.map((step, i) => {
        const stepNum = i + 1;
        const isCompleted = stepNum < currentStep;
        const isActive = stepNum === currentStep;
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", flex: i < steps.length - 1 ? 1 : "none" }}>
            <div
              style={{
                width: 22,
                height: 22,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.62rem",
                fontWeight: 700,
                flexShrink: 0,
                transition: "all 0.3s ease",
                background: isCompleted ? "#10b981" : isActive ? DTL_ACCENT : colors.inputBg,
                border: isCompleted ? "2px solid #10b981" : isActive ? `2px solid ${DTL_ACCENT}` : `2px solid ${colors.cardBorder}`,
                color: isCompleted || isActive ? "#fff" : colors.textTertiary,
              }}
            >
              {isCompleted ? "✓" : stepNum}
            </div>
            <span
              style={{
                marginLeft: "0.35rem",
                marginRight: i < steps.length - 1 ? "0.35rem" : 0,
                fontSize: "0.62rem",
                fontWeight: isActive ? 700 : 500,
                color: isActive ? DTL_ACCENT : isCompleted ? "#10b981" : colors.textTertiary,
                whiteSpace: "nowrap",
              }}
            >
              {step}
            </span>
            {i < steps.length - 1 && (
              <div style={{ flex: 1, height: 2, background: isCompleted ? "#10b981" : colors.cardBorder, margin: "0 4px" }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export const DTL_OUTLINE_BTN = (colors) => ({
  padding: "0.5rem 1.1rem",
  background: colors.cardBg,
  border: `1px solid ${colors.cardBorder}`,
  borderRadius: 7,
  color: colors.textPrimary,
  fontSize: "0.75rem",
  fontWeight: 600,
  cursor: "pointer",
});
