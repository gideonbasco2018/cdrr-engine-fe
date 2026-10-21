// src/components/monitoring/analytics/InProgressByUserModal.jsx
// Opens from the "In Progress" KPI tile: shows how many in-progress
// applications each user currently has.
import { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { getUsersTaskSummary } from "../../../api/monitoring";
import { FB } from "./analyticsConstants";
import { neuCardBg } from "./analyticsHelpers";
import UserApplicationsModal from "./UserApplicationsModal";

const font =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const AMBER = "#f59e0b";

// The users-tasks endpoint's exact field names aren't known here, so read the
// common spellings defensively.
const nameOf = (r) =>
  r.name ??
  r.full_name ??
  r.user_name ??
  r.username ??
  r.user ??
  (r.user_id != null ? `User #${r.user_id}` : "Unknown");
const inProgressOf = (r) =>
  Number(r.tasks?.in_progress ?? r.in_progress ?? r.inProgress ?? 0) || 0;

export default function InProgressByUserModal({
  ui,
  darkMode,
  onClose,
  expectedTotal, // the In Progress number shown on the KPI tile
}) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null); // { id, name }
  const selectedRef = useRef(null);
  selectedRef.current = selected;

  const line = darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.12)";

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getUsersTaskSummary();
      const list = (res?.data ?? [])
        .map((r) => ({
          key: r.user_id ?? nameOf(r),
          id: r.user_id,
          name: nameOf(r),
          inProgress: inProgressOf(r),
        }))
        .filter((r) => r.inProgress > 0)
        .sort((a, b) => b.inProgress - a.inProgress);
      setRows(list);
    } catch (err) {
      setError(err.message || "Failed to load users.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const onKey = (e) =>
      e.key === "Escape" && !selectedRef.current && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? rows.filter((r) => r.name.toLowerCase().includes(q)) : rows;
  }, [rows, search]);

  const sum = rows.reduce((s, r) => s + r.inProgress, 0);
  const max = Math.max(...rows.map((r) => r.inProgress), 1);
  const mismatch =
    typeof expectedTotal === "number" &&
    !loading &&
    !error &&
    sum !== expectedTotal;

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(560px, 100%)",
          maxHeight: "86vh",
          display: "flex",
          flexDirection: "column",
          background: neuCardBg(darkMode),
          borderRadius: 16,
          boxShadow: "0 20px 60px rgba(0,0,0,0.45)",
          fontFamily: font,
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "14px 18px",
            borderBottom: `1px solid ${line}`,
          }}
        >
          <div>
            <div
              style={{
                fontSize: "0.95rem",
                fontWeight: 700,
                color: ui.textPrimary,
              }}
            >
              ⏳ In Progress per User
            </div>
            <div style={{ fontSize: "0.72rem", color: ui.textMuted }}>
              {loading
                ? "Loading…"
                : `${rows.length} user${rows.length !== 1 ? "s" : ""} · ${sum.toLocaleString()} in progress`}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search user…"
              autoComplete="off"
              style={{
                background: neuCardBg(darkMode),
                border: `1px solid ${line}`,
                borderRadius: 8,
                padding: "6px 10px",
                fontSize: "0.78rem",
                color: ui.textPrimary,
                outline: "none",
                width: 150,
                fontFamily: font,
                colorScheme: darkMode ? "dark" : "light",
              }}
            />
            <button
              onClick={onClose}
              title="Close (Esc)"
              style={{
                padding: "4px 10px",
                fontSize: "0.9rem",
                borderRadius: 8,
                border: `1px solid ${line}`,
                background: "transparent",
                color: ui.textPrimary,
                cursor: "pointer",
                fontFamily: font,
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", minHeight: 160 }}>
          {loading ? (
            <div
              style={{
                padding: 18,
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    height: 34,
                    borderRadius: 8,
                    background: darkMode
                      ? "rgba(255,255,255,0.06)"
                      : "rgba(0,0,0,0.06)",
                    opacity: 1 - i * 0.1,
                  }}
                />
              ))}
            </div>
          ) : error ? (
            <div
              style={{
                textAlign: "center",
                padding: 40,
                color: "#e02020",
                fontSize: "0.85rem",
              }}
            >
              ⚠️ {error}{" "}
              <button
                onClick={load}
                style={{
                  background: "none",
                  border: "none",
                  color: FB,
                  cursor: "pointer",
                  fontWeight: 700,
                  fontFamily: font,
                }}
              >
                Retry
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: 40,
                color: ui.textMuted,
                fontSize: "0.85rem",
              }}
            >
              {rows.length === 0
                ? "No in-progress applications."
                : "No users match your search."}
            </div>
          ) : (
            filtered.map((r, i) => (
              <div
                key={r.key}
                onClick={() =>
                  r.id != null && setSelected({ id: r.id, name: r.name })
                }
                title={r.id != null ? "Click to view applications" : undefined}
                style={{
                  cursor: r.id != null ? "pointer" : "default",
                  display: "grid",
                  gridTemplateColumns: "28px minmax(0,1fr) 120px 56px",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 18px",
                  borderBottom:
                    i < filtered.length - 1 ? `1px solid ${line}` : "none",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = darkMode
                    ? "rgba(255,255,255,0.04)"
                    : "rgba(0,0,0,0.03)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }
              >
                <span
                  style={{
                    fontSize: "0.72rem",
                    color: ui.textMuted,
                    textAlign: "center",
                  }}
                >
                  {i + 1}
                </span>
                <span
                  title={r.name}
                  style={{
                    fontSize: "0.82rem",
                    fontWeight: 600,
                    color: ui.textPrimary,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {r.name}
                </span>
                <div
                  style={{
                    height: 6,
                    borderRadius: 99,
                    overflow: "hidden",
                    background: darkMode
                      ? "rgba(255,255,255,0.08)"
                      : "rgba(0,0,0,0.08)",
                  }}
                >
                  <div
                    style={{
                      width: `${(r.inProgress / max) * 100}%`,
                      height: "100%",
                      background: AMBER,
                    }}
                  />
                </div>
                <span
                  style={{
                    fontSize: "0.85rem",
                    fontWeight: 800,
                    color: AMBER,
                    textAlign: "right",
                  }}
                >
                  {r.inProgress.toLocaleString()}
                </span>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {!loading && !error && rows.length > 0 && (
          <div
            style={{
              padding: "10px 18px",
              borderTop: `1px solid ${line}`,
              fontSize: "0.72rem",
              color: ui.textMuted,
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>
                {filtered.length !== rows.length
                  ? `${filtered.length} of ${rows.length} users`
                  : `${rows.length} users`}
              </span>
              <span>
                Total <b style={{ color: AMBER }}>{sum.toLocaleString()}</b>
              </span>
            </div>
            {mismatch && (
              <div style={{ color: ui.textMuted }}>
                Note: the In Progress tile shows{" "}
                {expectedTotal.toLocaleString()} applications, while the total
                above counts tasks per user. Some applications are processed in
                parallel by two users, so the same application is counted under
                each of them and the two totals can differ.
              </div>
            )}
          </div>
        )}
      </div>
      {selected && (
        <UserApplicationsModal
          user={selected}
          ui={ui}
          darkMode={darkMode}
          onClose={() => setSelected(null)}
        />
      )}
    </div>,
    document.body,
  );
}
