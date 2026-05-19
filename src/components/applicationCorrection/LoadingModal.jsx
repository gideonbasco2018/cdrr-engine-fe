import { useState } from "react";
import { Spinner } from "./shared/Spinner";
import { getTheme } from "./theme";
import { verifyDTN } from "../../api/cpr-correction";

export function LoadingModal({
  phase,
  record,
  errorMessage,
  onContinue,
  onBack,
  darkMode,
}) {
  const t = getTheme(darkMode);
  const dm = darkMode;

  const [newDtn, setNewDtn] = useState("");
  const [newDtnTouched, setNewDtnTouched] = useState(false);
  const [newDtnError, setNewDtnError] = useState("");
  const [checkingDtn, setCheckingDtn] = useState(false);

  const isLoading = phase === "loading";
  const isSuccess = phase === "success";
  const isNotFound = phase === "not_found";
  const isNotEligible = phase === "not_eligible";
  const isError = isNotFound || isNotEligible;

  const barColor = isSuccess
    ? "linear-gradient(90deg,#3B6D11,#6BAA3A)"
    : isError
      ? "linear-gradient(90deg,#B91C1C,#EF4444)"
      : "linear-gradient(90deg,#2C5F8A,#5B9BD5,#2C5F8A)";

  const handleProceed = async () => {
    setNewDtnTouched(true);
    const trimmed = newDtn.trim();

    if (!trimmed) {
      setNewDtnError("Please enter the new DTN before proceeding.");
      return;
    }

    if (trimmed === record?.dtn) {
      setNewDtnError("New DTN must be different from the old DTN.");
      return;
    }

    setCheckingDtn(true);
    try {
      const data = await verifyDTN(trimmed);
      if (data.found) {
        setNewDtnError(
          "This DTN already exists in the system. Please enter a unique new DTN.",
        );
        return;
      }
    } catch (err) {
      // network error — payagan mag-proceed
    } finally {
      setCheckingDtn(false);
    }

    setNewDtnError("");
    onContinue(trimmed);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: dm ? "rgba(0,0,0,0.72)" : "rgba(28,26,23,0.55)",
        backdropFilter: "blur(6px)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
      }}
    >
      <div
        style={{
          background: t.cardBg,
          border: `1px solid ${t.cardBorder}`,
          borderRadius: 20,
          boxShadow: dm
            ? "0 32px 80px rgba(0,0,0,0.6)"
            : "0 32px 80px rgba(0,0,0,0.22)",
          width: "100%",
          maxWidth: 440,
          overflow: "hidden",
          animation: "lm-fadeUp 0.3s ease",
        }}
      >
        <style>{`
          @keyframes lm-fadeUp   { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
          @keyframes lm-checkPop { 0%{transform:scale(0);opacity:0} 60%{transform:scale(1.15)} 100%{transform:scale(1);opacity:1} }
          @keyframes lm-pulse    { 0%,100%{opacity:1} 50%{opacity:0.35} }
          @keyframes lm-shimmer  { from{background-position:200% 0} to{background-position:-200% 0} }
          @keyframes lm-spin     { to{transform:rotate(360deg)} }
        `}</style>

        {/* Accent bar */}
        <div
          style={{
            height: 4,
            background: barColor,
            backgroundSize: isLoading ? "200% 100%" : "100%",
            animation: isLoading ? "lm-shimmer 1.4s linear infinite" : "none",
          }}
        />

        <div style={{ padding: "1.8rem 1.75rem 1.75rem", textAlign: "center" }}>
          {/* ── Loading ── */}
          {isLoading && (
            <>
              <Spinner darkMode={dm} />
              <div style={{ marginTop: "1rem" }}>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: t.textPrimary,
                  }}
                >
                  Fetching Application Data
                </div>
                <div
                  style={{ fontSize: 13, color: t.textTertiary, marginTop: 4 }}
                >
                  Looking up DTN record, please wait...
                </div>
                <div
                  style={{
                    marginTop: "1.2rem",
                    textAlign: "left",
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                  }}
                >
                  {[
                    "Verifying DTN against registry",
                    "Retrieving application details",
                    "Loading correction flags",
                  ].map((label, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        animation: `lm-pulse 1.4s ease-in-out ${i * 0.3}s infinite`,
                      }}
                    >
                      <div
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background: t.accent,
                          flexShrink: 0,
                        }}
                      />
                      <span style={{ fontSize: 12.5, color: t.textSecondary }}>
                        {label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ── Not Found ── */}
          {isNotFound && (
            <>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: "50%",
                  background: t.errorBg,
                  border: `2px solid ${t.errorBorder}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto",
                  animation:
                    "lm-checkPop 0.4s cubic-bezier(.17,.67,.35,1.3) both",
                }}
              >
                <svg
                  width="24"
                  height="24"
                  fill="none"
                  stroke={t.errorText}
                  strokeWidth="2.5"
                  viewBox="0 0 24 24"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </div>
              <div style={{ marginTop: "0.9rem" }}>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: t.textPrimary,
                  }}
                >
                  DTN Not Found
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: t.textTertiary,
                    marginTop: 3,
                    lineHeight: 1.6,
                  }}
                >
                  {errorMessage ||
                    "The DTN you entered does not exist in the system."}
                </div>
              </div>
              <button
                onClick={onBack}
                style={{
                  marginTop: "1.2rem",
                  width: "100%",
                  padding: "9px 0",
                  background: t.accent,
                  color: "#fff",
                  border: "none",
                  borderRadius: 9,
                  fontSize: 13.5,
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 7,
                }}
              >
                ← Try Another DTN
              </button>
            </>
          )}

          {/* ── Not Eligible ── */}
          {isNotEligible && (
            <>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: "50%",
                  background: t.warnBg,
                  border: `2px solid ${t.warnBorder}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto",
                  animation:
                    "lm-checkPop 0.4s cubic-bezier(.17,.67,.35,1.3) both",
                }}
              >
                <svg
                  width="24"
                  height="24"
                  fill="none"
                  stroke={t.warnText}
                  strokeWidth="2.5"
                  viewBox="0 0 24 24"
                >
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
              <div style={{ marginTop: "0.9rem" }}>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: t.textPrimary,
                  }}
                >
                  Not Eligible for Correction
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: t.textTertiary,
                    marginTop: 3,
                    lineHeight: 1.6,
                  }}
                >
                  {errorMessage ||
                    "Only COMPLETED applications can be corrected."}
                </div>
              </div>
              <div
                style={{
                  marginTop: "1rem",
                  padding: "10px 14px",
                  background: t.warnBg,
                  border: `1px solid ${t.warnBorder}`,
                  borderRadius: 9,
                  fontSize: 12,
                  color: t.warnText,
                  textAlign: "left",
                  lineHeight: 1.6,
                }}
              >
                If you believe this is an error, please contact your
                administrator.
              </div>
              <button
                onClick={onBack}
                style={{
                  marginTop: "1rem",
                  width: "100%",
                  padding: "9px 0",
                  background: "transparent",
                  color: t.textSecondary,
                  border: `1px solid ${t.cardBorder}`,
                  borderRadius: 9,
                  fontSize: 13.5,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                ← Go Back
              </button>
            </>
          )}

          {/* ── Success ── */}
          {isSuccess && (
            <>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: "50%",
                  background: t.successBg,
                  border: `2px solid ${t.successBorder}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto",
                  animation:
                    "lm-checkPop 0.4s cubic-bezier(.17,.67,.35,1.3) both",
                }}
              >
                <svg
                  width="24"
                  height="24"
                  fill="none"
                  stroke={t.successText}
                  strokeWidth="2.5"
                  viewBox="0 0 24 24"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>

              <div style={{ marginTop: "0.9rem" }}>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: t.textPrimary,
                  }}
                >
                  Application Found!
                </div>
                <div
                  style={{ fontSize: 13, color: t.textTertiary, marginTop: 3 }}
                >
                  Record successfully retrieved.
                </div>
              </div>

              {/* Summary */}
              <div
                style={{
                  marginTop: "1.2rem",
                  background: t.inputBg,
                  border: `1px solid ${t.cardBorder}`,
                  borderRadius: 10,
                  padding: "0.85rem 1rem",
                  textAlign: "left",
                }}
              >
                <div style={{ marginBottom: 8 }}>
                  <span
                    style={{
                      fontSize: 10.5,
                      fontWeight: 700,
                      color: t.textTertiary,
                      textTransform: "uppercase",
                      letterSpacing: "0.7px",
                    }}
                  >
                    Application Summary
                  </span>
                </div>
                {[
                  ["DTN", record?.dtn],
                  ["Company", record?.ltoComp],
                  ["Product", record?.prodBrName],
                  ["App Type", record?.appType],
                  ["Date Received", record?.dateReceivedCent],
                ].map(([lbl, val]) => (
                  <div
                    key={lbl}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: 10,
                      padding: "4px 0",
                      borderBottom: `1px solid ${t.sectionBorder}`,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 11.5,
                        color: t.textTertiary,
                        flexShrink: 0,
                      }}
                    >
                      {lbl}
                    </span>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: t.textPrimary,
                        textAlign: "right",
                        wordBreak: "break-word",
                      }}
                    >
                      {val ?? "?"}
                    </span>
                  </div>
                ))}
              </div>

              {/* New DTN Input */}
              <div style={{ marginTop: "1.2rem", textAlign: "left" }}>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 11,
                    fontWeight: 700,
                    color: t.textTertiary,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    marginBottom: 7,
                  }}
                >
                  <svg
                    width="11"
                    height="11"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  New Document Tracking Number (DTN)
                </label>
                <input
                  type="text"
                  value={newDtn}
                  onChange={(e) => {
                    setNewDtn(e.target.value);
                    setNewDtnError(""); // ← clear error on type
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleProceed()}
                  placeholder="Enter new DTN..."
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding: "9px 12px",
                    fontSize: 14,
                    fontFamily: "'DM Mono', 'Courier New', monospace",
                    fontWeight: 600,
                    letterSpacing: "0.05em",
                    border: `1.5px solid ${
                      newDtnTouched && newDtnError
                        ? t.errorBorder
                        : newDtn.trim() && !newDtnError
                          ? t.successBorder
                          : t.cardBorder
                    }`,
                    borderRadius: 9,
                    background:
                      newDtnTouched && newDtnError ? t.errorBg : t.inputBg,
                    color: t.textPrimary,
                    outline: "none",
                  }}
                />
                {newDtnTouched && newDtnError && (
                  <div
                    style={{
                      marginTop: 5,
                      fontSize: 12,
                      color: t.errorText,
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                    }}
                  >
                    <svg
                      width="11"
                      height="11"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    {newDtnError}
                  </div>
                )}
                {!newDtnError && (
                  <div
                    style={{
                      marginTop: 5,
                      fontSize: 11.5,
                      color: t.textTertiary,
                    }}
                  >
                    💡 This will be the replacement DTN for the application.
                  </div>
                )}
              </div>

              <button
                onClick={handleProceed}
                disabled={checkingDtn}
                style={{
                  marginTop: "1.2rem",
                  width: "100%",
                  padding: "9px 0",
                  background: checkingDtn ? t.accentHover : t.accent,
                  color: "#fff",
                  border: "none",
                  borderRadius: 9,
                  fontSize: 13.5,
                  fontWeight: 700,
                  cursor: checkingDtn ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 7,
                  transition: "background 0.15s",
                  opacity: checkingDtn ? 0.8 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!checkingDtn)
                    e.currentTarget.style.background = t.accentHover;
                }}
                onMouseLeave={(e) => {
                  if (!checkingDtn) e.currentTarget.style.background = t.accent;
                }}
              >
                {checkingDtn ? (
                  <>
                    <span
                      style={{
                        display: "inline-block",
                        width: 13,
                        height: 13,
                        border: "2px solid rgba(255,255,255,0.3)",
                        borderTopColor: "#fff",
                        borderRadius: "50%",
                        animation: "lm-spin 0.6s linear infinite",
                      }}
                    />
                    Checking DTN...
                  </>
                ) : (
                  "Proceed to Correction Form →"
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
