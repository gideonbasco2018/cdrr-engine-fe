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
  "prodDistriShelfLife",
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
  const [selectedWords, setSelectedWords] = useState({});

  const getCurrentVal = (fieldKey) =>
    fieldKey in editedFields
      ? editedFields[fieldKey]
      : (record[fieldKey] ?? "");

  const runSpellCheck = async () => {
    setLoading(true);
    setError(null);
    setResults(null);
    setApplied({});
    setSelectedWords({});
    setOpen(true);

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

  // Apply the fully-corrected string (all errors in field)
  const applyFix = (fieldKey, corrected) => {
    onFieldChange(fieldKey, corrected);
    setApplied((prev) => ({ ...prev, [fieldKey]: true }));
    setSelectedWords((prev) => ({ ...prev, [fieldKey]: {} }));
  };

  // Apply only the selected words' fixes, leave the rest as-is
  const applyWordFix = (fieldKey, words) => {
    const selected = selectedWords[fieldKey] ?? {};
    const newValue = words
      .map((w, i) =>
        w.hasError && w.corrected && selected[i] ? w.corrected : w.original,
      )
      .join(" ");
    onFieldChange(fieldKey, newValue);

    // If ALL errored words were selected and fixed, mark card as fully applied
    const allFixed = words
      .filter((w) => w.hasError)
      .every((w) => {
        const idx = words.indexOf(w);
        return selected[idx];
      });
    if (allFixed) {
      setApplied((prev) => ({ ...prev, [fieldKey]: true }));
    }
    setSelectedWords((prev) => ({ ...prev, [fieldKey]: {} }));
  };

  const applyAll = () => {
    (results ?? []).forEach(({ fieldKey, corrected }) => {
      if (!applied[fieldKey]) onFieldChange(fieldKey, corrected);
    });
    setApplied(
      Object.fromEntries((results ?? []).map((r) => [r.fieldKey, true])),
    );
    setSelectedWords({});
  };

  // FIXED: was checking current[fieldKey] instead of current[wordIdx]
  const toggleWord = (fieldKey, wordIdx) => {
    setSelectedWords((prev) => {
      const current = prev[fieldKey] ?? {};
      return {
        ...prev,
        [fieldKey]: { ...current, [wordIdx]: !current[wordIdx] },
      };
    });
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
                  ({ fieldKey, label, original, corrected, words, note }) => {
                    const isApplied = applied[fieldKey];
                    const hasWords = Array.isArray(words) && words.length > 0;
                    const selected = selectedWords[fieldKey] ?? {};
                    const hasSelection = Object.values(selected).some(Boolean);

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

                        {/* Word-by-word tokens */}
                        {hasWords ? (
                          <>
                            <div
                              style={{
                                display: "flex",
                                flexWrap: "wrap",
                                gap: "4px",
                              }}
                            >
                              {words.map((w, i) => {
                                const isErr = w.hasError && !isApplied;
                                const isSel = !!selected[i];
                                return (
                                  <span
                                    key={i}
                                    onClick={() =>
                                      isErr && toggleWord(fieldKey, i)
                                    }
                                    title={
                                      isErr
                                        ? `Click to select — fix: "${w.corrected}"`
                                        : undefined
                                    }
                                    style={{
                                      padding: "2px 7px",
                                      borderRadius: "4px",
                                      fontSize: "0.78rem",
                                      cursor: isErr ? "pointer" : "default",
                                      userSelect: "none",
                                      transition: "all 0.12s",
                                      border: isSel
                                        ? "1px solid #7c3aed"
                                        : isErr
                                          ? "1px solid rgba(239,68,68,0.45)"
                                          : "1px solid transparent",
                                      background: isSel
                                        ? "rgba(124,58,237,0.12)"
                                        : isErr
                                          ? "rgba(239,68,68,0.07)"
                                          : "transparent",
                                      color: isSel
                                        ? "#7c3aed"
                                        : isErr
                                          ? "#dc2626"
                                          : colors.textPrimary,
                                      fontWeight: isErr ? "600" : "400",
                                      textDecoration:
                                        isErr && !isSel
                                          ? "underline wavy #ef4444"
                                          : "none",
                                    }}
                                  >
                                    {isApplied && w.hasError
                                      ? w.corrected
                                      : w.original}
                                  </span>
                                );
                              })}
                            </div>

                            {/* ── Sentence Preview ── */}
                            {!isApplied && (
                              <div
                                style={{
                                  marginTop: "0.15rem",
                                  padding: "0.4rem 0.6rem",
                                  background: hasSelection
                                    ? "rgba(124,58,237,0.05)"
                                    : "rgba(0,0,0,0.025)",
                                  border: `1px solid ${hasSelection ? "rgba(124,58,237,0.2)" : colors.cardBorder}`,
                                  borderRadius: "5px",
                                  lineHeight: "1.6",
                                }}
                              >
                                <span
                                  style={{
                                    fontSize: "0.58rem",
                                    fontWeight: "700",
                                    color: colors.textTertiary,
                                    textTransform: "uppercase",
                                    letterSpacing: "0.06em",
                                    display: "block",
                                    marginBottom: "3px",
                                  }}
                                >
                                  Preview
                                </span>
                                <span style={{ fontSize: "0.75rem" }}>
                                  {(() => {
                                    // Reconstruct the final sentence from original string
                                    // by replacing only the selected/corrected words
                                    let result = original;
                                    let offset = 0;

                                    words.forEach((w, i) => {
                                      if (!w.hasError || !w.corrected) return;
                                      const isSel = !!selected[i];
                                      const replacement = isSel
                                        ? w.corrected
                                        : w.original;

                                      // Find this word's position in the current result string
                                      const searchFrom = offset;
                                      const idx = result.indexOf(
                                        w.original,
                                        searchFrom,
                                      );
                                      if (idx === -1) return;

                                      if (isSel) {
                                        // Replace the word in the result string
                                        result =
                                          result.slice(0, idx) +
                                          replacement +
                                          result.slice(idx + w.original.length);
                                        offset = idx + replacement.length;
                                      } else {
                                        offset = idx + w.original.length;
                                      }
                                    });

                                    // Now render: split into error/non-error segments for coloring
                                    // Re-walk original to find remaining errors vs fixed
                                    let segments = [];
                                    let remaining = result;
                                    let pos = 0;
                                    const originalCopy = original;

                                    // Build segments based on words positions in original
                                    let cursorOrig = 0;
                                    let cursorResult = 0;

                                    words.forEach((w, i) => {
                                      const isSel = !!selected[i];
                                      const idxInOrig = originalCopy.indexOf(
                                        w.original,
                                        cursorOrig,
                                      );
                                      if (idxInOrig === -1) return;

                                      // Text before this word (normal)
                                      if (idxInOrig > cursorOrig) {
                                        const between = originalCopy.slice(
                                          cursorOrig,
                                          idxInOrig,
                                        );
                                        segments.push({
                                          text: between,
                                          type: "normal",
                                        });
                                      }

                                      if (w.hasError) {
                                        if (isSel) {
                                          segments.push({
                                            text: w.corrected,
                                            type: "fixed",
                                          });
                                        } else {
                                          segments.push({
                                            text: w.original,
                                            type: "error",
                                          });
                                        }
                                      } else {
                                        segments.push({
                                          text: w.original,
                                          type: "normal",
                                        });
                                      }

                                      cursorOrig =
                                        idxInOrig + w.original.length;
                                    });

                                    // Remaining text after last word
                                    if (cursorOrig < originalCopy.length) {
                                      segments.push({
                                        text: originalCopy.slice(cursorOrig),
                                        type: "normal",
                                      });
                                    }

                                    return segments.map((seg, si) => (
                                      <span
                                        key={si}
                                        style={{
                                          fontWeight:
                                            seg.type !== "normal"
                                              ? "600"
                                              : "400",
                                          color:
                                            seg.type === "fixed"
                                              ? "#059669"
                                              : seg.type === "error"
                                                ? "#dc2626"
                                                : colors.textPrimary,
                                          textDecoration:
                                            seg.type === "error"
                                              ? "underline wavy #ef4444"
                                              : "none",
                                        }}
                                      >
                                        {seg.text}
                                      </span>
                                    ));
                                  })()}
                                </span>
                              </div>
                            )}
                          </>
                        ) : (
                          /* Fallback: full string diff display */
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
                        )}

                        {/* Hint text */}
                        {!isApplied && (
                          <div
                            style={{
                              fontSize: "0.62rem",
                              color: colors.textTertiary,
                              fontStyle: "italic",
                            }}
                          >
                            {hasWords
                              ? "Click a highlighted word to select/deselect it."
                              : note || "Possible spelling error detected"}
                          </div>
                        )}

                        {/* Action buttons */}
                        <div
                          style={{
                            marginTop: "0.1rem",
                            display: "flex",
                            gap: "0.4rem",
                            flexWrap: "wrap",
                          }}
                        >
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
                          ) : hasSelection ? (
                            <>
                              <button
                                onClick={() => applyWordFix(fieldKey, words)}
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
                                Fix Selected Word
                                {Object.values(selected).filter(Boolean)
                                  .length > 1
                                  ? "s"
                                  : ""}
                              </button>
                              <button
                                onClick={() => applyFix(fieldKey, corrected)}
                                style={{
                                  padding: "0.2rem 0.6rem",
                                  background: "transparent",
                                  border: `1px solid ${colors.cardBorder}`,
                                  borderRadius: "4px",
                                  color: colors.textSecondary,
                                  fontSize: "0.65rem",
                                  fontWeight: "600",
                                  cursor: "pointer",
                                }}
                              >
                                Fix All in Field
                              </button>
                            </>
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
