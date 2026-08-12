import React, { useState, useMemo } from "react";
import { labelStyle, inputStyle } from "./sharedStyles";

// ── Modal: single-task edit OR bulk mark, depending on tasks.length ────
export function TargetModal({
  colors,
  tasks,
  onClose,
  onSubmit,
  onRemoveTarget,
  submitting,
}) {
  const isBulk = tasks.length > 1;
  const single = !isBulk ? tasks[0] : null;

  const today = new Date().toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState(
    single?.target_start_date || today,
  );
  const [endDate, setEndDate] = useState(single?.target_end_date || "");
  const [remarks, setRemarks] = useState(single?.target_remarks || "");
  const [error, setError] = useState(null);
  const [monthPick, setMonthPick] = useState("");

  // ── Quick month picker: next 12 months from today ─────────────────
  const monthChoices = useMemo(() => {
    const out = [];
    const base = new Date();
    base.setDate(1);
    for (let i = 0; i < 12; i++) {
      const d = new Date(base.getFullYear(), base.getMonth() + i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      });
      out.push({ key, label });
    }
    return out;
  }, []);

  // Format a Date using its LOCAL y/m/d — avoids the UTC shift that
  // toISOString() causes (which can push the date back a day in
  // timezones ahead of UTC, like PHT).
  const toLocalIso = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const handleMonthPick = (key) => {
    setMonthPick(key);
    if (!key) return;
    const [y, m] = key.split("-").map(Number);
    const first = new Date(y, m - 1, 1);
    const last = new Date(y, m, 0); // day 0 of next month = last day of this month
    setStartDate(toLocalIso(first));
    setEndDate(toLocalIso(last));
  };

  const handleSubmit = () => {
    if (!startDate || !endDate) {
      setError("Target start date and end date are required.");
      return;
    }
    if (endDate < startDate) {
      setError("Target end date can't be before the start date.");
      return;
    }
    setError(null);
    onSubmit({ targetStartDate: startDate, targetEndDate: endDate, remarks });
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 380,
          maxWidth: "90vw",
          background: colors.cardBg,
          border: `1px solid ${colors.cardBorder}`,
          borderRadius: "10px",
          padding: "1.25rem",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            fontSize: "0.95rem",
            fontWeight: 700,
            marginBottom: "0.15rem",
          }}
        >
          🎯{" "}
          {isBulk
            ? `Mark ${tasks.length} Tasks as Target`
            : single.is_targeted
              ? "Edit Target"
              : "Mark as Target"}
        </div>
        <div
          style={{
            fontSize: "0.78rem",
            color: colors.textSecondary,
            marginBottom: "1rem",
          }}
        >
          {isBulk
            ? `${tasks.length} tasks selected`
            : `${single.brand_name} · DTN ${single.dtn}`}
        </div>

        <label style={labelStyle(colors)}>Quick Pick: Month</label>
        <select
          value={monthPick}
          onChange={(e) => handleMonthPick(e.target.value)}
          style={{ ...inputStyle(colors), cursor: "pointer" }}
        >
          <option value="">— Select a month (optional) —</option>
          {monthChoices.map((mc) => (
            <option key={mc.key} value={mc.key}>
              {mc.label}
            </option>
          ))}
        </select>

        <label style={labelStyle(colors)}>Target Start Date</label>
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          onClick={(e) => e.currentTarget.showPicker?.()}
          style={{ ...inputStyle(colors), cursor: "pointer" }}
        />

        <label style={labelStyle(colors)}>Target End Date</label>
        <input
          type="date"
          value={endDate}
          onChange={(e) => {
            setEndDate(e.target.value);
            setMonthPick("");
          }}
          onClick={(e) => e.currentTarget.showPicker?.()}
          style={{ ...inputStyle(colors), cursor: "pointer" }}
        />

        <label style={labelStyle(colors)}>Remarks</label>
        <textarea
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          rows={3}
          placeholder="Optional notes…"
          style={{
            ...inputStyle(colors),
            resize: "vertical",
            fontFamily: "inherit",
          }}
        />

        {error && (
          <div
            style={{
              color: "#ef4444",
              fontSize: "0.75rem",
              marginBottom: "0.75rem",
            }}
          >
            {error}
          </div>
        )}

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: "0.5rem",
          }}
        >
          <div>
            {!isBulk && single.is_targeted && (
              <button
                onClick={onRemoveTarget}
                disabled={submitting}
                style={{
                  padding: "6px 12px",
                  borderRadius: "6px",
                  border: "1px solid #ef4444",
                  background: "transparent",
                  color: "#ef4444",
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  cursor: submitting ? "default" : "pointer",
                }}
              >
                Remove Target
              </button>
            )}
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              onClick={onClose}
              disabled={submitting}
              style={{
                padding: "6px 14px",
                borderRadius: "6px",
                border: `1px solid ${colors.cardBorder}`,
                background: "transparent",
                color: colors.textSecondary,
                fontSize: "0.78rem",
                fontWeight: 600,
                cursor: submitting ? "default" : "pointer",
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              style={{
                padding: "6px 14px",
                borderRadius: "6px",
                border: "none",
                background: colors.targetBorder,
                color: "#fff",
                fontSize: "0.78rem",
                fontWeight: 600,
                cursor: submitting ? "default" : "pointer",
                opacity: submitting ? 0.7 : 1,
              }}
            >
              {submitting ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TargetModal;
