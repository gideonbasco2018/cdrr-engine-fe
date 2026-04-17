import { useState, useRef } from "react";
import { SZ } from "../config/constants";
import { todayStr, countWorkingDays, fmtDeadline, deadlineUrgency } from "../config/helpers";

/* ── DeadlinePicker ────────────────────────────────────────────── */
export function DeadlinePicker({
  deadlineDate, workingDays, onDeadlineChange, onWorkingDaysChange, colors,
}) {
  const urgency = deadlineUrgency(deadlineDate);
  const urgencyConfig = {
    overdue: { bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.35)", color: "#dc2626", icon: "🚨", label: "OVERDUE" },
    critical: { bg: "rgba(239,68,68,0.06)", border: "rgba(239,68,68,0.25)", color: "#ef4444", icon: "🔴", label: "CRITICAL — 3 days or less" },
    warning: { bg: "rgba(245,158,11,0.06)", border: "rgba(245,158,11,0.25)", color: "#b45309", icon: "🟡", label: "WARNING — 5 days or less" },
    ok: { bg: "rgba(16,185,129,0.06)", border: "rgba(16,185,129,0.25)", color: "#059669", icon: "🟢", label: "On Track" },
  };
  const cfg = urgency ? urgencyConfig[urgency] : null;

  return (
    <div
      style={{
        padding: "0.9rem", background: "rgba(156,39,176,0.04)",
        border: "1.5px solid rgba(156,39,176,0.2)", borderRadius: "10px",
        display: "flex", flexDirection: "column", gap: "0.75rem",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <span style={{ fontSize: "0.95rem" }}>⏰</span>
        <div>
          <div style={{ fontSize: "0.75rem", fontWeight: "700", color: "#7b1fa2" }}>
            Compliance Deadline
          </div>
          <div style={{ fontSize: "0.65rem", color: colors.textTertiary, marginTop: "0.05rem" }}>
            Set working days OR pick a date — both auto-sync
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
        {/* Working Days */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
          <label style={{ fontSize: SZ.labelFs, fontWeight: "700", color: colors.textTertiary, textTransform: "uppercase", letterSpacing: "0.07em" }}>
            Working Days
          </label>
          <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
            <button
              onClick={() => onWorkingDaysChange(Math.max(1, workingDays - 1))}
              style={{ width: "26px", height: "26px", borderRadius: "5px", border: `1px solid ${colors.cardBorder}`, background: colors.inputBg, color: colors.textPrimary, fontSize: "1rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
            >−</button>
            <input
              type="number" min="1" max="365" value={workingDays}
              onChange={(e) => { const v = parseInt(e.target.value, 10); if (!isNaN(v) && v > 0) onWorkingDaysChange(v); }}
              style={{ flex: 1, padding: "0.35rem 0.3rem", background: colors.inputBg, border: "1.5px solid rgba(156,39,176,0.3)", borderRadius: "5px", color: colors.textPrimary, fontSize: "0.85rem", fontWeight: "700", outline: "none", textAlign: "center", boxSizing: "border-box" }}
              onFocus={(e) => { e.target.style.borderColor = "#9c27b0"; }}
              onBlur={(e) => { e.target.style.borderColor = "rgba(156,39,176,0.3)"; }}
            />
            <button
              onClick={() => onWorkingDaysChange(workingDays + 1)}
              style={{ width: "26px", height: "26px", borderRadius: "5px", border: `1px solid ${colors.cardBorder}`, background: colors.inputBg, color: colors.textPrimary, fontSize: "1rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
            >+</button>
          </div>
          <div style={{ display: "flex", gap: "0.25rem", flexWrap: "wrap", marginTop: "0.05rem" }}>
            {[7, 15, 20, 30, 60].map((d) => (
              <button
                key={d} onClick={() => onWorkingDaysChange(d)}
                style={{ padding: "0.1rem 0.4rem", fontSize: "0.6rem", fontWeight: workingDays === d ? "700" : "500", background: workingDays === d ? "rgba(156,39,176,0.15)" : colors.inputBg, border: `1px solid ${workingDays === d ? "#9c27b0" : colors.cardBorder}`, borderRadius: "3px", color: workingDays === d ? "#7b1fa2" : colors.textTertiary, cursor: "pointer" }}
              >{d}d</button>
            ))}
          </div>
        </div>

        {/* Deadline Date */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
          <label style={{ fontSize: SZ.labelFs, fontWeight: "700", color: colors.textTertiary, textTransform: "uppercase", letterSpacing: "0.07em" }}>
            Deadline Date
          </label>
          <input
            type="date" value={deadlineDate} min={todayStr()}
            onChange={(e) => onDeadlineChange(e.target.value)}
            style={{ width: "100%", padding: "0.35rem 0.5rem", background: colors.inputBg, border: "1.5px solid rgba(156,39,176,0.3)", borderRadius: "5px", color: colors.textPrimary, fontSize: "0.78rem", outline: "none", boxSizing: "border-box" }}
            onFocus={(e) => { e.target.style.borderColor = "#9c27b0"; }}
            onBlur={(e) => { e.target.style.borderColor = "rgba(156,39,176,0.3)"; }}
          />
          {deadlineDate && (
            <div style={{ fontSize: "0.62rem", color: colors.textTertiary }}>
              📅 {fmtDeadline(deadlineDate)}
            </div>
          )}
        </div>
      </div>

      {cfg && deadlineDate && (
        <div style={{ padding: "0.5rem 0.75rem", background: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: "6px", display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.72rem", color: cfg.color, fontWeight: "600" }}>
          <span>{cfg.icon}</span>
          <span>{cfg.label}</span>
          {urgency !== "overdue" && (
            <span style={{ marginLeft: "auto", fontWeight: "400", color: colors.textTertiary }}>
              {countWorkingDays(todayStr(), deadlineDate)} working day{countWorkingDays(todayStr(), deadlineDate) !== 1 ? "s" : ""} remaining
            </span>
          )}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "flex-start", gap: "0.4rem", fontSize: "0.65rem", color: colors.textTertiary, paddingTop: "0.3rem", borderTop: `1px dashed ${colors.cardBorder}` }}>
        <span style={{ flexShrink: 0 }}>🔔</span>
        <span>The assigned compliance officer will be notified <strong>3 working days before</strong> this deadline.</span>
      </div>
    </div>
  );
}

/* ── AssigneeSearchDropdown ────────────────────────────────────── */
export function AssigneeSearchDropdown({ value, onChange, options, placeholder, colors, inp, readOnly = false }) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const triggerRef = useRef(null);

  const filtered = options.filter((u) => {
    const q = search.toLowerCase();
    return (
      u.username.toLowerCase().includes(q) ||
      `${u.first_name} ${u.surname}`.toLowerCase().includes(q)
    );
  });

  const selectedUser = options.find((u) => u.username === value);
  const displayLabel = selectedUser
    ? `${selectedUser.username} — ${selectedUser.first_name} ${selectedUser.surname}`
    : value || ""; // fallback: show raw username if user obj not found yet

  const handleOpen = () => {
    if (readOnly) return;
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setOpenUpward(window.innerHeight - rect.bottom < 280);
    }
    setOpen((o) => !o);
  };

  return (
    <div style={{ position: "relative", width: "100%" }}>
      <div
        ref={triggerRef}
        onClick={handleOpen}
        style={{
          ...inp,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          cursor: readOnly ? "not-allowed" : "pointer", userSelect: "none",
          color: value ? colors.textPrimary : colors.textTertiary,
          background: readOnly ? colors.badgeBg : colors.inputBg,
          opacity: readOnly ? 0.8 : 1,
        }}
      >
        <span style={{ fontSize: "0.82rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, minWidth: 0, fontWeight: readOnly ? "600" : "400" }}>
          {displayLabel || placeholder}
        </span>
        {!readOnly && (
          <span style={{ fontSize: "0.7rem", color: colors.textTertiary, flexShrink: 0, marginLeft: "0.4rem" }}>
            {open ? "▲" : "▼"}
          </span>
        )}
        {readOnly && (
          <span style={{ fontSize: "0.65rem", color: "#10b981", flexShrink: 0, marginLeft: "0.4rem" }}>
            🔒 Auto
          </span>
        )}
      </div>

      {open && !readOnly && (
        <div onClick={() => { setOpen(false); setSearch(""); }} style={{ position: "fixed", inset: 0, zIndex: 9998 }} />
      )}

      {open && !readOnly && (
        <div
          style={{
            position: "absolute",
            ...(openUpward ? { bottom: "100%", marginBottom: "4px" } : { top: "100%", marginTop: "4px" }),
            left: 0, right: 0, background: colors.cardBg,
            border: `1px solid ${colors.inputBorder}`, borderRadius: "7px",
            boxShadow: "0 8px 28px rgba(0,0,0,0.18)", zIndex: 9999, overflow: "hidden",
          }}
        >
          <div style={{ padding: "0.5rem" }}>
            <input
              autoFocus type="text" value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Type to search user..."
              style={{ width: "100%", padding: "0.4rem 0.6rem", background: colors.inputBg, border: `1px solid ${colors.inputBorder}`, borderRadius: "5px", color: colors.textPrimary, fontSize: "0.8rem", outline: "none", boxSizing: "border-box" }}
              onFocus={(e) => { e.target.style.borderColor = "#2196F3"; }}
              onBlur={(e) => { e.target.style.borderColor = colors.inputBorder; }}
            />
          </div>
          <div style={{ maxHeight: "200px", overflowY: "auto" }}>
            {filtered.length === 0 ? (
              <div style={{ padding: "0.75rem 1rem", fontSize: "0.78rem", color: colors.textTertiary, textAlign: "center", fontStyle: "italic" }}>
                No users found
              </div>
            ) : (
              filtered.map((u) => {
                const isSelected = u.username === value;
                return (
                  <div
                    key={u.id}
                    onClick={() => { onChange(u.username); setOpen(false); setSearch(""); }}
                    style={{ padding: "0.5rem 1rem", fontSize: "0.8rem", cursor: "pointer", background: isSelected ? "rgba(33,150,243,0.1)" : "transparent", color: isSelected ? "#2196F3" : colors.textPrimary, fontWeight: isSelected ? "600" : "400", borderLeft: isSelected ? "3px solid #2196F3" : "3px solid transparent" }}
                    onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = colors.inputBg; }}
                    onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = "transparent"; }}
                  >
                    <div style={{ fontWeight: "600" }}>{u.username}</div>
                    <div style={{ fontSize: "0.72rem", color: colors.textTertiary }}>{u.first_name} {u.surname}</div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
