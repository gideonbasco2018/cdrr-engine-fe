// src/components/dashboard/GMPPostEvalStatusCard.jsx
// "Post-Evaluation Status" — FGMP Dashboard only, no CPR counterpart.
// Applications the current user finished their own part on (a COMPLETED
// step they were the assignee of) that aren't released yet. Mirrors
// RecentApplicationsCard's structure exactly (Card/CardHeader primitives,
// same row anatomy) so it reads as native to this Dashboard, not bolted on.
import { Card } from "./CardPrimitives";
import { FB } from "./constants";
import { GMP_STEP_MAP } from "../gmp/shared/constants";

function stepChipStyle(stepId) {
  const step = GMP_STEP_MAP[stepId];
  const color = step?.color ?? "#64748b";
  return { background: `${color}26`, color };
}

function fmtDay(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-PH", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

export default function GMPPostEvalStatusCard({
  ui,
  breakdown, // [{ step, count }]
  data, // rows: { gmp_id, dtn, lto_company, your_step, completed_date, current_step }
  loading,
  error,
  onRetry,
  onSeeAll,
  onRowClick,
}) {
  return (
    <Card ui={ui}>
      <div style={{ borderBottom: `1px solid ${ui.divider}` }}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            padding: "14px 16px 10px",
            gap: 10,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <h2 style={{ fontSize: "1.05rem", fontWeight: 700, color: ui.textPrimary, margin: 0 }}>
              Post-Evaluation Status
            </h2>
            {!loading && !error && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                {breakdown.length === 0 ? (
                  <span style={{ fontSize: "0.8rem", color: ui.textSub }}>
                    Nothing waiting on another step right now.
                  </span>
                ) : (
                  breakdown.map((b) => {
                    const step = GMP_STEP_MAP[b.step];
                    return (
                      <span
                        key={b.step}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 5,
                          fontSize: "0.72rem",
                          fontWeight: 700,
                          padding: "3px 10px",
                          borderRadius: 99,
                          whiteSpace: "nowrap",
                          ...stepChipStyle(b.step),
                        }}
                      >
                        {step?.icon ?? "📄"} {b.step}{" "}
                        <b style={{ fontVariantNumeric: "tabular-nums", fontWeight: 800 }}>
                          {b.count}
                        </b>
                      </span>
                    );
                  })
                )}
              </div>
            )}
          </div>
          <button
            onClick={onSeeAll}
            style={{
              background: "none",
              border: "none",
              color: FB,
              fontSize: "0.84rem",
              fontWeight: 600,
              cursor: "pointer",
              padding: 0,
              whiteSpace: "nowrap",
              flexShrink: 0,
              marginTop: 2,
            }}
          >
            See all
          </button>
        </div>
      </div>

      {loading &&
        Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "11px 16px",
              borderBottom: i < 3 ? `1px solid ${ui.divider}` : "none",
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 8,
                flexShrink: 0,
                background: ui.progressBg,
                animation: "cdrrPulse 1.2s ease-in-out infinite",
              }}
            />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
              <div
                style={{
                  width: 150,
                  height: 10,
                  borderRadius: 4,
                  background: ui.progressBg,
                  animation: "cdrrPulse 1.2s ease-in-out infinite",
                }}
              />
              <div
                style={{
                  width: 100,
                  height: 8,
                  borderRadius: 4,
                  background: ui.progressBg,
                  animation: "cdrrPulse 1.2s ease-in-out infinite",
                }}
              />
            </div>
            <div
              style={{
                width: 90,
                height: 22,
                borderRadius: 99,
                flexShrink: 0,
                background: ui.progressBg,
                animation: "cdrrPulse 1.2s ease-in-out infinite",
              }}
            />
          </div>
        ))}

      {!loading && error && (
        <div style={{ padding: "1.5rem", textAlign: "center", color: "#e02020", fontSize: "0.82rem" }}>
          ⚠️ {error}{" "}
          <button
            onClick={onRetry}
            style={{
              background: "none",
              border: "none",
              color: FB,
              cursor: "pointer",
              fontSize: "0.82rem",
              fontWeight: 600,
              fontFamily: "inherit",
            }}
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !error && data.length === 0 && (
        <div style={{ padding: "2rem", textAlign: "center", color: ui.textMuted, fontSize: "0.82rem" }}>
          Nothing here — everything you've finished has already moved to release, or nothing's been completed yet.
        </div>
      )}

      {!loading &&
        !error &&
        data.map((row, i, arr) => {
          const yourStep = GMP_STEP_MAP[row.your_step];
          const currentStep = GMP_STEP_MAP[row.current_step];
          return (
            <div
              key={row.gmp_id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "11px 16px",
                borderBottom: i < arr.length - 1 ? `1px solid ${ui.divider}` : "none",
                cursor: onRowClick ? "pointer" : "default",
              }}
              onClick={() => onRowClick && onRowClick(row)}
              onMouseEnter={(e) => (e.currentTarget.style.background = ui.hoverBg)}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 8,
                    background: yourStep ? `${yourStep.color}26` : ui.progressBg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.1rem",
                    flexShrink: 0,
                  }}
                >
                  {yourStep?.icon ?? "📄"}
                </div>
                <div style={{ minWidth: 0 }}>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "0.86rem",
                      fontWeight: 600,
                      color: ui.textPrimary,
                      fontFamily: "ui-monospace,monospace",
                    }}
                  >
                    {row.dtn || "—"}
                  </p>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "0.78rem",
                      color: ui.textSub,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      maxWidth: 220,
                    }}
                  >
                    {row.lto_company || "—"}
                  </p>
                  <p
                    style={{
                      margin: "2px 0 0",
                      fontSize: "0.72rem",
                      color: ui.textMuted,
                    }}
                  >
                    📌 Completed as {row.your_step || "—"} · {fmtDay(row.completed_date)}
                  </p>
                </div>
              </div>
              <div style={{ flexShrink: 0, marginLeft: 10 }}>
                <span
                  style={{
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    padding: "3px 10px",
                    borderRadius: 99,
                    whiteSpace: "nowrap",
                    ...(currentStep
                      ? stepChipStyle(row.current_step)
                      : { background: ui.progressBg, color: ui.textMuted }),
                  }}
                >
                  {currentStep?.icon ?? "📄"} {row.current_step || "—"}
                </span>
              </div>
            </div>
          );
        })}
    </Card>
  );
}
