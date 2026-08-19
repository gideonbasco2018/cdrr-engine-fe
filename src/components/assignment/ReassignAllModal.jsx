// FILE: src/components/assignment/ReassignAllModal.jsx
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { getUsersByGroup, getUser } from "../../api/auth";
import { reassignApplication } from "../../api/application-logs";

// ⚠️ TODO: palitan ito ng import mula sa shared config kapag na-extract na
//    natin yung STEP_GROUP_MAP (see note sa dulo)
const STEP_GROUP_MAP = {
  Decking: 2,
  "S&E": 13,
  "S&E Supervisor": 20,
  "S&E Checker": 21,
  "Quality Evaluation": 3,
  Checking: 4,
  Supervisor: 5,
  "QA Admin": 16,
  "LRD Chief Admin": 17,
  "OD-Receiving": 18,
  "OD-Releasing": 19,
  "Releasing Officer": 8,
};

const REASSIGN_REASONS = [
  "Evaluator on leave",
  "Workload balancing",
  "Expertise mismatch",
  "Evaluator request",
  "Supervisory directive",
  "Others",
];

const nowPHT = () => {
  const now = new Date();
  return now
    .toLocaleString("sv-SE", { timeZone: "Asia/Manila" })
    .replace(" ", "T");
};

/* ── Compact per-row user dropdown, SEARCHABLE ──
   Dropdown list renders in a fixed-position portal (document.body) so it
   never gets clipped or hidden by the modal's scrollable table container —
   no more "may selection ka na pero nasa ilalim, di mo makita" issue. */
function RowUserSelect({ value, onChange, users, loading, colors, darkMode }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const DROPDOWN_MAX_HEIGHT = 190;

  const updateCoords = () => {
    if (!wrapperRef.current) return;
    const rect = wrapperRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUpward =
      spaceBelow < DROPDOWN_MAX_HEIGHT + 8 && rect.top > DROPDOWN_MAX_HEIGHT;
    setCoords({
      top: openUpward ? rect.top - DROPDOWN_MAX_HEIGHT - 4 : rect.bottom + 4,
      left: rect.left,
      width: rect.width,
    });
  };

  useEffect(() => {
    function handleClickOutside(e) {
      const insideWrapper =
        wrapperRef.current && wrapperRef.current.contains(e.target);
      const insideDropdown =
        dropdownRef.current && dropdownRef.current.contains(e.target);
      if (!insideWrapper && !insideDropdown) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!open) return;
    updateCoords();
    const handle = () => updateCoords();
    window.addEventListener("scroll", handle, true);
    window.addEventListener("resize", handle);
    return () => {
      window.removeEventListener("scroll", handle, true);
      window.removeEventListener("resize", handle);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (loading) {
    return (
      <span style={{ fontSize: "0.7rem", color: colors.textTertiary }}>
        Loading…
      </span>
    );
  }
  if (!users || users.length === 0) {
    return (
      <span style={{ fontSize: "0.7rem", color: "#ef4444" }}>
        No users found
      </span>
    );
  }

  const selectedUser = users.find((u) => u.username === value);
  const displayLabel = selectedUser
    ? `${selectedUser.username} — ${selectedUser.first_name} ${selectedUser.surname}`
    : "";

  const filtered = !query
    ? users
    : users.filter((u) => {
        const haystack =
          `${u.username} ${u.first_name} ${u.surname}`.toLowerCase();
        return haystack.includes(query.toLowerCase());
      });

  return (
    <div ref={wrapperRef} style={{ position: "relative", width: "100%" }}>
      <input
        ref={inputRef}
        type="text"
        value={open ? query : displayLabel}
        placeholder="— search user —"
        onFocus={() => {
          setOpen(true);
          setQuery("");
          updateCoords();
        }}
        onChange={(e) => {
          setQuery(e.target.value);
          if (!open) setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setOpen(false);
            setQuery("");
            inputRef.current?.blur();
          }
        }}
        style={{
          width: "100%",
          padding: "0.3rem 0.5rem",
          background: darkMode ? "#1a1a1a" : "#f5f5f5",
          border: `1px solid ${value ? "#7c3aed" : colors.cardBorder}`,
          borderRadius: 6,
          color: colors.textPrimary,
          fontSize: "0.72rem",
          outline: "none",
          boxSizing: "border-box",
        }}
      />
      {open &&
        createPortal(
          <div
            ref={dropdownRef}
            style={{
              position: "fixed",
              top: coords.top,
              left: coords.left,
              width: coords.width,
              maxHeight: DROPDOWN_MAX_HEIGHT,
              overflowY: "auto",
              background: darkMode ? "#1a1a1a" : "#fff",
              border: `1px solid ${colors.cardBorder}`,
              borderRadius: 6,
              zIndex: 100000,
              boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
            }}
          >
            {value && (
              <div
                onMouseDown={() => {
                  onChange("");
                  setOpen(false);
                  setQuery("");
                }}
                style={{
                  padding: "0.35rem 0.6rem",
                  fontSize: "0.7rem",
                  cursor: "pointer",
                  color: colors.textTertiary,
                  borderBottom: `1px solid ${colors.cardBorder}`,
                }}
              >
                — clear selection —
              </div>
            )}
            {filtered.length === 0 ? (
              <div
                style={{
                  padding: "0.4rem 0.6rem",
                  fontSize: "0.7rem",
                  color: colors.textTertiary,
                }}
              >
                No matches
              </div>
            ) : (
              filtered.map((u) => (
                <div
                  key={u.id}
                  onMouseDown={() => {
                    onChange(u.username);
                    setOpen(false);
                    setQuery("");
                  }}
                  style={{
                    padding: "0.35rem 0.6rem",
                    fontSize: "0.72rem",
                    cursor: "pointer",
                    color: colors.textPrimary,
                    background:
                      u.username === value ? "#7c3aed22" : "transparent",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "#7c3aed22")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background =
                      u.username === value ? "#7c3aed22" : "transparent")
                  }
                >
                  {u.username} — {u.first_name} {u.surname}
                </div>
              ))
            )}
          </div>,
          document.body,
        )}
    </div>
  );
}

/* ── Main modal ── */
function ReassignAllModal({ records, onClose, onSuccess, colors, darkMode }) {
  // records: [{ id, mainDbId, dtn, oldRsn, applicationStep, userName, updatedAt, applicationStatus }]
  const [rows, setRows] = useState(
    records.map((r) => ({ ...r, reassignTo: "", reason: "", remarks: "" })),
  );
  const [usersByStep, setUsersByStep] = useState({});
  const [loadingSteps, setLoadingSteps] = useState({});
  const [currentUser, setCurrentUser] = useState(null);
  const [phase, setPhase] = useState("form"); // "form" | "progress" | "done"
  const [results, setResults] = useState([]);

  // ── Bulk-fill state (apply one value to every row) ──
  const [bulkUser, setBulkUser] = useState("");
  const [bulkReason, setBulkReason] = useState("");
  const [bulkRemarks, setBulkRemarks] = useState("");

  // union of users across all fetched groups, deduped by username —
  // lets the bulk "Reassigned to" field search across every step at once
  const combinedUsers = Object.values(usersByStep)
    .flat()
    .filter(Boolean)
    .filter(
      (u, idx, arr) => arr.findIndex((x) => x.username === u.username) === idx,
    );
  const combinedUsersLoading =
    Object.keys(loadingSteps).length > 0 &&
    Object.values(loadingSteps).some(Boolean) &&
    combinedUsers.length === 0;

  const applyReassignToAll = () =>
    setRows((prev) => prev.map((r) => ({ ...r, reassignTo: bulkUser })));
  const applyReasonToAll = () =>
    setRows((prev) => prev.map((r) => ({ ...r, reason: bulkReason })));
  const applyRemarksToAll = () =>
    setRows((prev) => prev.map((r) => ({ ...r, remarks: bulkRemarks })));

  useEffect(() => {
    const u = getUser();
    if (u) setCurrentUser(u);
  }, []);

  // fetch users once per distinct application_step present in selection
  useEffect(() => {
    const steps = [...new Set(records.map((r) => r.applicationStep))];
    steps.forEach((step) => {
      const groupId = STEP_GROUP_MAP[step];
      if (!groupId) return;
      setLoadingSteps((prev) => ({ ...prev, [step]: true }));
      getUsersByGroup(groupId)
        .then((users) => setUsersByStep((prev) => ({ ...prev, [step]: users })))
        .catch(() => setUsersByStep((prev) => ({ ...prev, [step]: [] })))
        .finally(() => setLoadingSteps((prev) => ({ ...prev, [step]: false })));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateRow = (id, field, value) =>
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)),
    );

  const readyRows = rows.filter((r) => r.reassignTo && r.reason);
  const canReassign = readyRows.length > 0;

  const handleReassign = async () => {
    setPhase("progress");
    const initial = readyRows.map((r) => ({ ...r, status: "pending" }));
    setResults(initial);
    const updated = [...initial];

    for (let i = 0; i < readyRows.length; i++) {
      const row = readyRows[i];
      const userObj = (usersByStep[row.applicationStep] || []).find(
        (u) => u.username === row.reassignTo,
      );
      try {
        await reassignApplication({
          main_db_id: row.mainDbId, // ✅ correct FK — not row.id
          action_type: "REASSIGNMENT",
          application_step: row.applicationStep,
          reassigned_from_user_id: null,
          reassigned_from_user_name: row.userName,
          reassigned_to_user_id: userObj?.id ?? null,
          reassigned_to_user_name: row.reassignTo,
          reassignment_reason: row.reason,
          reassignment_remarks: row.remarks || null,
          reassigned_by_user_id: currentUser?.id ?? null,
          reassigned_by_user_name: currentUser?.username ?? null,
          reassigned_at: nowPHT(),
        });
        updated[i] = { ...updated[i], status: "success" };
      } catch (err) {
        updated[i] = {
          ...updated[i],
          status: "error",
          message: err.message ?? "Failed",
        };
      }
      setResults([...updated]);
    }
    setPhase("done");
    onSuccess?.();
  };

  const successCount = results.filter((r) => r.status === "success").length;
  const errorCount = results.filter((r) => r.status === "error").length;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        zIndex: 10000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
      }}
      onClick={phase === "progress" ? undefined : onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: colors.cardBg,
          border: `1px solid ${colors.cardBorder}`,
          borderRadius: 14,
          width: "100%",
          maxWidth: 1120,
          maxHeight: "88vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
          overflow: "hidden",
        }}
      >
        {/* ── Header ── */}
        <div
          style={{
            padding: "1rem 1.4rem",
            background: "linear-gradient(135deg,#7c3aed,#6d28d9)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexShrink: 0,
          }}
        >
          <div>
            <div
              style={{ color: "#fff", fontWeight: 700, fontSize: "0.95rem" }}
            >
              🔄 Reassign All by Task
            </div>
            <div
              style={{ color: "rgba(255,255,255,0.75)", fontSize: "0.72rem" }}
            >
              {records.length} record{records.length > 1 ? "s" : ""} selected
              {currentUser && <> • {currentUser.username}</>}
            </div>
          </div>
          {phase !== "progress" && (
            <button
              onClick={onClose}
              style={{
                background: "rgba(255,255,255,0.15)",
                border: "none",
                color: "#fff",
                borderRadius: "50%",
                width: 28,
                height: 28,
                cursor: "pointer",
              }}
            >
              ×
            </button>
          )}
        </div>

        {/* ── Body: form phase = editable table ── */}
        {phase === "form" && (
          <>
            <div
              style={{
                padding: "0.75rem 1.4rem",
                borderBottom: `1px solid ${colors.cardBorder}`,
                display: "flex",
                flexWrap: "wrap",
                alignItems: "flex-end",
                gap: "0.75rem",
                background: darkMode ? "#151515" : "#f3f0fb",
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  fontSize: "0.68rem",
                  fontWeight: 700,
                  color: colors.textTertiary,
                  textTransform: "uppercase",
                  marginRight: "0.25rem",
                  alignSelf: "center",
                }}
              >
                Fill all rows:
              </span>

              <div style={{ minWidth: 210 }}>
                <RowUserSelect
                  value={bulkUser}
                  onChange={setBulkUser}
                  users={combinedUsers}
                  loading={combinedUsersLoading}
                  colors={colors}
                  darkMode={darkMode}
                />
              </div>
              <button
                onClick={applyReassignToAll}
                disabled={!bulkUser}
                style={{
                  padding: "0.35rem 0.7rem",
                  background: bulkUser ? "#7c3aed" : "#555",
                  border: "none",
                  borderRadius: 6,
                  color: "#fff",
                  fontSize: "0.68rem",
                  fontWeight: 600,
                  cursor: bulkUser ? "pointer" : "not-allowed",
                  opacity: bulkUser ? 1 : 0.6,
                }}
              >
                Apply to all
              </button>

              <select
                value={bulkReason}
                onChange={(e) => setBulkReason(e.target.value)}
                style={{
                  padding: "0.3rem 0.5rem",
                  minWidth: 160,
                  background: darkMode ? "#1a1a1a" : "#f5f5f5",
                  border: `1px solid ${bulkReason ? "#7c3aed" : colors.cardBorder}`,
                  borderRadius: 6,
                  color: colors.textPrimary,
                  fontSize: "0.72rem",
                }}
              >
                <option value="">— reason —</option>
                {REASSIGN_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
              <button
                onClick={applyReasonToAll}
                disabled={!bulkReason}
                style={{
                  padding: "0.35rem 0.7rem",
                  background: bulkReason ? "#7c3aed" : "#555",
                  border: "none",
                  borderRadius: 6,
                  color: "#fff",
                  fontSize: "0.68rem",
                  fontWeight: 600,
                  cursor: bulkReason ? "pointer" : "not-allowed",
                  opacity: bulkReason ? 1 : 0.6,
                }}
              >
                Apply to all
              </button>

              <input
                type="text"
                value={bulkRemarks}
                onChange={(e) => setBulkRemarks(e.target.value)}
                placeholder="remarks for all"
                style={{
                  padding: "0.3rem 0.5rem",
                  minWidth: 180,
                  background: darkMode ? "#1a1a1a" : "#f5f5f5",
                  border: `1px solid ${colors.cardBorder}`,
                  borderRadius: 6,
                  color: colors.textPrimary,
                  fontSize: "0.72rem",
                  boxSizing: "border-box",
                }}
              />
              <button
                onClick={applyRemarksToAll}
                style={{
                  padding: "0.35rem 0.7rem",
                  background: "#7c3aed",
                  border: "none",
                  borderRadius: 6,
                  color: "#fff",
                  fontSize: "0.68rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Apply to all
              </button>
            </div>

            <div style={{ flex: 1, overflow: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "0.75rem",
                }}
              >
                <thead
                  style={{
                    position: "sticky",
                    top: 0,
                    background: colors.tableBg,
                    zIndex: 1,
                  }}
                >
                  <tr>
                    {[
                      "#",
                      "DTN",
                      "OLD RSN",
                      "Task",
                      "Assigned To",
                      "Last Modified",
                      "Reassigned to",
                      "Reason",
                      "Remarks",
                    ].map((h) => (
                      <th
                        key={h}
                        style={{
                          padding: "0.5rem 0.6rem",
                          textAlign: "left",
                          fontSize: "0.62rem",
                          textTransform: "uppercase",
                          color: colors.textTertiary,
                          borderBottom: `1px solid ${colors.tableBorder}`,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => (
                    <tr
                      key={row.id}
                      style={{
                        background:
                          idx % 2 ? colors.tableRowOdd : colors.tableRowEven,
                      }}
                    >
                      <td
                        style={{
                          padding: "0.4rem 0.6rem",
                          borderBottom: `1px solid ${colors.tableBorder}`,
                        }}
                      >
                        {idx + 1}
                      </td>
                      <td
                        style={{
                          padding: "0.4rem 0.6rem",
                          borderBottom: `1px solid ${colors.tableBorder}`,
                          fontWeight: 600,
                        }}
                      >
                        {row.dtn}
                      </td>
                      <td
                        style={{
                          padding: "0.4rem 0.6rem",
                          borderBottom: `1px solid ${colors.tableBorder}`,
                        }}
                      >
                        {row.oldRsn ?? "N/A"}
                      </td>
                      <td
                        style={{
                          padding: "0.4rem 0.6rem",
                          borderBottom: `1px solid ${colors.tableBorder}`,
                        }}
                      >
                        {row.applicationStep}
                      </td>
                      <td
                        style={{
                          padding: "0.4rem 0.6rem",
                          borderBottom: `1px solid ${colors.tableBorder}`,
                        }}
                      >
                        {row.userName ?? "Unassigned"}
                      </td>
                      <td
                        style={{
                          padding: "0.4rem 0.6rem",
                          borderBottom: `1px solid ${colors.tableBorder}`,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {row.updatedAt
                          ? new Date(row.updatedAt).toLocaleString()
                          : "N/A"}
                      </td>
                      <td
                        style={{
                          padding: "0.4rem 0.6rem",
                          borderBottom: `1px solid ${colors.tableBorder}`,
                          minWidth: 210,
                          position: "relative",
                        }}
                      >
                        <RowUserSelect
                          value={row.reassignTo}
                          onChange={(v) => updateRow(row.id, "reassignTo", v)}
                          users={usersByStep[row.applicationStep]}
                          loading={loadingSteps[row.applicationStep]}
                          colors={colors}
                          darkMode={darkMode}
                        />
                      </td>
                      <td
                        style={{
                          padding: "0.4rem 0.6rem",
                          borderBottom: `1px solid ${colors.tableBorder}`,
                          minWidth: 160,
                        }}
                      >
                        <select
                          value={row.reason}
                          onChange={(e) =>
                            updateRow(row.id, "reason", e.target.value)
                          }
                          style={{
                            width: "100%",
                            padding: "0.3rem 0.5rem",
                            background: darkMode ? "#1a1a1a" : "#f5f5f5",
                            border: `1px solid ${row.reason ? "#7c3aed" : colors.cardBorder}`,
                            borderRadius: 6,
                            color: colors.textPrimary,
                            fontSize: "0.72rem",
                          }}
                        >
                          <option value="">— reason —</option>
                          {REASSIGN_REASONS.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td
                        style={{
                          padding: "0.4rem 0.6rem",
                          borderBottom: `1px solid ${colors.tableBorder}`,
                          minWidth: 180,
                        }}
                      >
                        <input
                          type="text"
                          value={row.remarks}
                          onChange={(e) =>
                            updateRow(row.id, "remarks", e.target.value)
                          }
                          placeholder="optional remarks"
                          style={{
                            width: "100%",
                            padding: "0.3rem 0.5rem",
                            background: darkMode ? "#1a1a1a" : "#f5f5f5",
                            border: `1px solid ${colors.cardBorder}`,
                            borderRadius: 6,
                            color: colors.textPrimary,
                            fontSize: "0.72rem",
                            boxSizing: "border-box",
                          }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div
              style={{
                padding: "0.85rem 1.4rem",
                borderTop: `1px solid ${colors.cardBorder}`,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexShrink: 0,
              }}
            >
              <span style={{ fontSize: "0.72rem", color: colors.textTertiary }}>
                {readyRows.length} of {rows.length} ready (needs assignee +
                reason)
              </span>
              <div style={{ display: "flex", gap: "0.6rem" }}>
                <button
                  onClick={onClose}
                  style={{
                    padding: "0.55rem 1.1rem",
                    background: "transparent",
                    border: `1px solid ${colors.cardBorder}`,
                    borderRadius: 8,
                    color: colors.textPrimary,
                    cursor: "pointer",
                  }}
                >
                  Close
                </button>
                <button
                  onClick={handleReassign}
                  disabled={!canReassign}
                  style={{
                    padding: "0.55rem 1.3rem",
                    background: canReassign
                      ? "linear-gradient(135deg,#7c3aed,#6d28d9)"
                      : "#555",
                    border: "none",
                    borderRadius: 8,
                    color: "#fff",
                    fontWeight: 600,
                    cursor: canReassign ? "pointer" : "not-allowed",
                    opacity: canReassign ? 1 : 0.6,
                  }}
                >
                  🔄 Reassign {readyRows.length || ""}
                </button>
              </div>
            </div>
          </>
        )}

        {/* ── Progress/done phase ── */}
        {(phase === "progress" || phase === "done") && (
          <div style={{ padding: "1.4rem", overflowY: "auto", flex: 1 }}>
            <div
              style={{
                display: "flex",
                gap: "1rem",
                marginBottom: "1rem",
                fontSize: "0.8rem",
                fontWeight: 600,
              }}
            >
              <span style={{ color: "#10b981" }}>
                ✅ Success: {successCount}
              </span>
              <span style={{ color: "#ef4444" }}>❌ Failed: {errorCount}</span>
            </div>
            {results.map((r) => (
              <div
                key={r.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "0.5rem 0.75rem",
                  marginBottom: "0.3rem",
                  background: darkMode ? "#1a1a1a" : "#f8f8f8",
                  borderRadius: 7,
                  fontSize: "0.75rem",
                }}
              >
                <span style={{ fontWeight: 600, color: "#7c3aed" }}>
                  {r.dtn}
                </span>
                <span
                  style={{
                    color:
                      r.status === "success"
                        ? "#10b981"
                        : r.status === "error"
                          ? "#ef4444"
                          : colors.textTertiary,
                  }}
                >
                  {r.status === "pending"
                    ? "Processing…"
                    : r.status === "success"
                      ? "Reassigned"
                      : r.message}
                </span>
              </div>
            ))}
            {phase === "done" && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  marginTop: "1rem",
                }}
              >
                <button
                  onClick={onClose}
                  style={{
                    padding: "0.6rem 1.5rem",
                    background: "linear-gradient(135deg,#7c3aed,#6d28d9)",
                    border: "none",
                    borderRadius: 8,
                    color: "#fff",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Close
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default ReassignAllModal;
