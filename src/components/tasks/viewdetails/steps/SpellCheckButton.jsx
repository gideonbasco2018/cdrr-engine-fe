import { useState } from "react";

const CHECKABLE_FIELDS = [
  "prodBrName",
  "prodGenName",
  "prodDosStr",
  "prodDosForm",
  "prodClassPrescript",
  "prodEssDrugList",
  "prodPharmaCat",
  "prodCat",
  "storageCond",
  "packaging",
  "ltoCompany",
  "ltoAdd",
  "prodManu",
  "prodManuAdd",
  "prodTrader",
  "prodTraderAdd",
  "prodImporter",
  "prodImporterAdd",
  "prodDistri",
  "prodDistriAdd",
  "prodRepacker",
  "prodRepackerAdd",
];

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

export function SpellCheckButton({
  record,
  editedFields,
  onFieldChange,
  colors,
}) {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [applied, setApplied] = useState({});
  const [open, setOpen] = useState(false);
  const [error, setError] = useState(null);

  const getCurrentVal = (fieldKey) =>
    fieldKey in editedFields
      ? editedFields[fieldKey]
      : (record[fieldKey] ?? "");

  const runSpellCheck = async () => {
    setLoading(true);
    setError(null);
    setResults(null);
    setApplied({});
    setOpen(true);

    // Build fields object — skip empty and N/A values
    const fields = {};
    CHECKABLE_FIELDS.forEach((key) => {
      const val = getCurrentVal(key);
      const trimmed = String(val ?? "").trim();
      if (trimmed && !["n/a", "na"].includes(trimmed.toLowerCase())) {
        fields[key] = trimmed;
      }
    });

    try {
      const response = await fetch(`${API_BASE}/api/spellcheck`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData?.detail ?? `Server error: ${response.status}`);
      }

      const data = await response.json();
      setResults(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Spell check error:", err);
      setError(err.message ?? "Failed to run spell check. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const applyFix = (fieldKey, corrected) => {
    onFieldChange(fieldKey, corrected);
    setApplied((prev) => ({ ...prev, [fieldKey]: true }));
  };

  const applyAll = () => {
    (results ?? []).forEach(({ fieldKey, corrected }) => {
      if (!applied[fieldKey]) onFieldChange(fieldKey, corrected);
    });
    setApplied(
      Object.fromEntries((results ?? []).map((r) => [r.fieldKey, true])),
    );
  };

  const unappliedCount = (results ?? []).filter(
    (r) => !applied[r.fieldKey],
  ).length;

  return (
    <>
      {/* ── Trigger Button ── */}
      <button
        onClick={runSpellCheck}
        disabled={loading}
        title="Spell Check — checks all text fields for spelling errors"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.35rem",
          padding: "0.35rem 0.75rem",
          background: loading
            ? "rgba(124,58,237,0.15)"
            : "linear-gradient(135deg, rgba(124,58,237,0.15), rgba(124,58,237,0.08))",
          border: "1px solid rgba(124,58,237,0.35)",
          borderRadius: "6px",
          color: "#7c3aed",
          fontSize: "0.72rem",
          fontWeight: "700",
          cursor: loading ? "not-allowed" : "pointer",
          letterSpacing: "0.02em",
          transition: "all 0.18s",
          flexShrink: 0,
        }}
        onMouseEnter={(e) => {
          if (!loading) {
            e.currentTarget.style.background =
              "linear-gradient(135deg, rgba(124,58,237,0.25), rgba(124,58,237,0.12))";
            e.currentTarget.style.borderColor = "rgba(124,58,237,0.6)";
          }
        }}
        onMouseLeave={(e) => {
          if (!loading) {
            e.currentTarget.style.background =
              "linear-gradient(135deg, rgba(124,58,237,0.15), rgba(124,58,237,0.08))";
            e.currentTarget.style.borderColor = "rgba(124,58,237,0.35)";
          }
        }}
      >
        {loading ? (
          <>
            <span
              style={{
                display: "inline-block",
                width: "10px",
                height: "10px",
                border: "2px solid rgba(124,58,237,0.3)",
                borderTop: "2px solid #7c3aed",
                borderRadius: "50%",
                animation: "spin 0.7s linear infinite",
              }}
            />
            Checking...
          </>
        ) : (
          <>✨ Spell Check</>
        )}
      </button>

      {/* ── Results Modal ── */}
      {open && (
        <>
          {/* Backdrop */}
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.45)",
              zIndex: 2000,
            }}
            onClick={() => setOpen(false)}
          />

          {/* Panel */}
          <div
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: "min(560px, 92vw)",
              maxHeight: "75vh",
              background: colors.cardBg,
              border: `1px solid ${colors.cardBorder}`,
              borderRadius: "12px",
              boxShadow: "0 24px 64px rgba(0,0,0,0.45)",
              zIndex: 2001,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              style={{
                padding: "0.85rem 1.1rem",
                borderBottom: `1px solid ${colors.cardBorder}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexShrink: 0,
                background:
                  "linear-gradient(135deg, rgba(124,58,237,0.08), rgba(124,58,237,0.03))",
              }}
            >
              <div>
                <div
                  style={{
                    fontWeight: "700",
                    fontSize: "0.9rem",
                    color: colors.textPrimary,
                    display: "flex",
                    alignItems: "center",
                    gap: "0.4rem",
                  }}
                >
                  ✨ Spell Check Results
                </div>
                <div
                  style={{
                    fontSize: "0.65rem",
                    color: colors.textTertiary,
                    marginTop: "0.1rem",
                  }}
                >
                  {loading
                    ? "Analyzing fields..."
                    : results === null
                      ? ""
                      : results.length === 0
                        ? "✓ No spelling errors found"
                        : `${results.length} possible error${results.length !== 1 ? "s" : ""} found`}
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                style={{
                  width: "26px",
                  height: "26px",
                  borderRadius: "6px",
                  border: `1px solid ${colors.cardBorder}`,
                  background: "transparent",
                  color: colors.textSecondary,
                  cursor: "pointer",
                  fontSize: "0.85rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "0.9rem 1.1rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.6rem",
              }}
            >
              {/* Loading */}
              {loading && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "2rem",
                    gap: "0.75rem",
                    color: colors.textTertiary,
                    fontSize: "0.8rem",
                  }}
                >
                  <span
                    style={{
                      display: "inline-block",
                      width: "28px",
                      height: "28px",
                      border: "3px solid rgba(124,58,237,0.2)",
                      borderTop: "3px solid #7c3aed",
                      borderRadius: "50%",
                      animation: "spin 0.7s linear infinite",
                    }}
                  />
                  Scanning fields for spelling errors...
                </div>
              )}

              {/* Error */}
              {!loading && error && (
                <div
                  style={{
                    padding: "0.75rem",
                    background: "rgba(239,68,68,0.07)",
                    border: "1px solid rgba(239,68,68,0.3)",
                    borderRadius: "6px",
                    color: "#dc2626",
                    fontSize: "0.78rem",
                  }}
                >
                  ⚠ {error}
                </div>
              )}

              {/* No errors */}
              {!loading && results?.length === 0 && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "2rem",
                    gap: "0.5rem",
                    color: "#059669",
                    fontSize: "0.85rem",
                    fontWeight: "600",
                  }}
                >
                  <span style={{ fontSize: "2rem" }}>✅</span>
                  All fields look good — no spelling errors found!
                </div>
              )}

              {/* Results list */}
              {!loading &&
                results?.map(
                  ({ fieldKey, label, original, corrected, note }) => {
                    const isApplied = applied[fieldKey];
                    return (
                      <div
                        key={fieldKey}
                        style={{
                          padding: "0.65rem 0.8rem",
                          background: isApplied
                            ? "rgba(16,185,129,0.06)"
                            : colors.inputBg,
                          border: `1px solid ${isApplied ? "rgba(16,185,129,0.3)" : colors.cardBorder}`,
                          borderLeft: `3px solid ${isApplied ? "#10b981" : "#7c3aed"}`,
                          borderRadius: "6px",
                          display: "flex",
                          flexDirection: "column",
                          gap: "0.35rem",
                        }}
                      >
                        {/* Field label */}
                        <div
                          style={{
                            fontSize: "0.62rem",
                            fontWeight: "700",
                            color: colors.textTertiary,
                            textTransform: "uppercase",
                            letterSpacing: "0.06em",
                          }}
                        >
                          {label || fieldKey}
                        </div>

                        {/* Original → Corrected */}
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                            flexWrap: "wrap",
                          }}
                        >
                          <span
                            style={{
                              fontSize: "0.78rem",
                              color: "#ef4444",
                              textDecoration: "line-through",
                              wordBreak: "break-word",
                            }}
                          >
                            {original}
                          </span>
                          <span
                            style={{
                              color: colors.textTertiary,
                              fontSize: "0.7rem",
                            }}
                          >
                            →
                          </span>
                          <span
                            style={{
                              fontSize: "0.78rem",
                              fontWeight: "600",
                              color: "#059669",
                              wordBreak: "break-word",
                            }}
                          >
                            {corrected}
                          </span>
                        </div>

                        {/* Note */}
                        {note && (
                          <div
                            style={{
                              fontSize: "0.62rem",
                              color: colors.textTertiary,
                              fontStyle: "italic",
                            }}
                          >
                            {note}
                          </div>
                        )}

                        {/* Action */}
                        <div style={{ marginTop: "0.1rem" }}>
                          {isApplied ? (
                            <span
                              style={{
                                fontSize: "0.65rem",
                                color: "#059669",
                                fontWeight: "700",
                              }}
                            >
                              ✓ Applied
                            </span>
                          ) : (
                            <button
                              onClick={() => applyFix(fieldKey, corrected)}
                              style={{
                                padding: "0.2rem 0.6rem",
                                background:
                                  "linear-gradient(135deg, #7c3aed, #6d28d9)",
                                border: "none",
                                borderRadius: "4px",
                                color: "#fff",
                                fontSize: "0.65rem",
                                fontWeight: "700",
                                cursor: "pointer",
                              }}
                            >
                              Apply Fix
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  },
                )}
            </div>

            {/* Footer */}
            {!loading && (results?.length ?? 0) > 0 && (
              <div
                style={{
                  padding: "0.65rem 1.1rem",
                  borderTop: `1px solid ${colors.cardBorder}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexShrink: 0,
                }}
              >
                <span
                  style={{ fontSize: "0.68rem", color: colors.textTertiary }}
                >
                  {unappliedCount === 0
                    ? "✓ All fixes applied"
                    : `${unappliedCount} fix${unappliedCount !== 1 ? "es" : ""} remaining`}
                </span>
                {unappliedCount > 0 && (
                  <button
                    onClick={applyAll}
                    style={{
                      padding: "0.3rem 0.8rem",
                      background: "linear-gradient(135deg, #7c3aed, #6d28d9)",
                      border: "none",
                      borderRadius: "6px",
                      color: "#fff",
                      fontSize: "0.72rem",
                      fontWeight: "700",
                      cursor: "pointer",
                      boxShadow: "0 2px 6px rgba(124,58,237,0.3)",
                    }}
                  >
                    ✨ Apply All Fixes
                  </button>
                )}
              </div>
            )}
          </div>
        </>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}
