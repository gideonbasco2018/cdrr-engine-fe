import React, { useState, useMemo } from "react";
import { labelStyle, inputStyle } from "./sharedStyles";

export function DirectorsTargetModal({
  colors,
  tasks,
  onClose,
  onSubmit,
  submitting,
}) {
  const isBulk = tasks.length > 1;
  const single = !isBulk ? tasks[0] : null;

  const today = new Date().toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState("");
  const [remarks, setRemarks] = useState("");
  const [error, setError] = useState(null);
  const [periodPick, setPeriodPick] = useState("");

  // ── Quick month picker: next 12 months from today ─────────────────
  const monthChoices = useMemo(() => {
    const out = [];
    const base = new Date();
    base.setDate(1);
    for (let i = 0; i < 12; i++) {
      const d = new Date(base.getFullYear(), base.getMonth() + i, 1);
      const key = `M-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      });
      out.push({ key, label });
    }
    return out;
  }, []);

  const semesterChoices = useMemo(() => {
    const out = [];
    const year = new Date().getFullYear();
    for (const y of [year, year + 1]) {
      out.push({ key: `H1-${y}`, label: `H1 ${y} (Jan – Jun)` });
      out.push({ key: `H2-${y}`, label: `H2 ${y} (Jul – Dec)` });
    }
    return out;
  }, []);

  const toLocalIso = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const handlePeriodPick = (key) => {
    setPeriodPick(key);
    if (!key) return;

    if (key.startsWith("M-")) {
      const [, y, m] = key.split("-").map((v, i) => (i === 0 ? v : Number(v)));
      const first = new Date(Number(y), m - 1, 1);
      const last = new Date(Number(y), m, 0);
      setStartDate(toLocalIso(first));
      setEndDate(toLocalIso(last));
      return;
    }

    if (key.startsWith("H1-") || key.startsWith("H2-")) {
      const [half, yStr] = key.split("-");
      const y = Number(yStr);
      const first = half === "H1" ? new Date(y, 0, 1) : new Date(y, 6, 1);
      const last = half === "H1" ? new Date(y, 5, 30) : new Date(y, 11, 31);
      setStartDate(toLocalIso(first));
      setEndDate(toLocalIso(last));
      return;
    }
  };

  const handleSubmit = () => {
    if (!startDate || !endDate) {
      setError("Kailangan ng target start date at end date.");
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
      onClick={() => !submitting && onClose()}
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
          🏛️{" "}
          {isBulk
            ? `Mark ${tasks.length} Tasks as CDRR Target`
            : "Mark as CDRR Target"}
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

        <label style={labelStyle(colors)}>Quick Pick: Period</label>
        <select
          value={periodPick}
          onChange={(e) => handlePeriodPick(e.target.value)}
          style={{ ...inputStyle(colors), cursor: "pointer" }}
        >
          <option value="">— Select a period (optional) —</option>
          <optgroup label="Semester">
            {semesterChoices.map((sc) => (
              <option key={sc.key} value={sc.key}>
                {sc.label}
              </option>
            ))}
          </optgroup>
          <optgroup label="Month">
            {monthChoices.map((mc) => (
              <option key={mc.key} value={mc.key}>
                {mc.label}
              </option>
            ))}
          </optgroup>
        </select>

        <label style={labelStyle(colors)}>Target Start Date</label>
        <input
          type="date"
          value={startDate}
          onChange={(e) => {
            setStartDate(e.target.value);
            setPeriodPick("");
          }}
          onClick={(e) => e.currentTarget.showPicker?.()}
          style={{ ...inputStyle(colors), cursor: "pointer" }}
        />

        <label style={labelStyle(colors)}>Target End Date</label>
        <input
          type="date"
          value={endDate}
          onChange={(e) => {
            setEndDate(e.target.value);
            setPeriodPick("");
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
            justifyContent: "flex-end",
            gap: "0.5rem",
            marginTop: "0.5rem",
          }}
        >
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
              fontWeight: 700,
              cursor: submitting ? "default" : "pointer",
              opacity: submitting ? 0.7 : 1,
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            {submitting && (
              <span
                style={{
                  width: 13,
                  height: 13,
                  border: "2px solid rgba(255,255,255,0.4)",
                  borderTopColor: "#fff",
                  borderRadius: "50%",
                  display: "inline-block",
                  animation: "dt-spin 0.7s linear infinite",
                }}
              />
            )}
            {submitting ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
      <style>{`
        @keyframes dt-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default DirectorsTargetModal;
