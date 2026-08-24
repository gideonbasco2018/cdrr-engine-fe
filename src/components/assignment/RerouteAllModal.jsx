// FILE: src/components/assignment/RerouteAllModal.jsx
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { getUsersByGroup, getUser } from "../../api/auth";
import { rerouteApplication } from "../../api/application-logs";

// ⚠️ TODO: same as ReassignAllModal — extract WORKFLOW_STEPS/REROUTE_REASONS
//    into a shared config once RerouteModal.jsx (reports/actions) and this
//    file both need it. Kept duplicated here for now to avoid a cross-folder
//    import dependency.
const WORKFLOW_STEPS = [
  { key: "Decking", label: "Decking", icon: "🎯", groupId: 2 },
  { key: "S&E", label: "S&E", icon: "🧪", groupId: 13 },
  { key: "S&E Supervisor", label: "S&E Supervisor", icon: "🧑‍💼", groupId: 20 },
  { key: "S&E Checker", label: "S&E Checker", icon: "🔬", groupId: 21 },
  {
    key: "Quality Evaluation",
    label: "Quality Evaluation",
    icon: "🔍",
    groupId: 3,
  },
  { key: "Checking", label: "Checking", icon: "✅", groupId: 4 },
  { key: "Supervisor", label: "Supervisor", icon: "👤", groupId: 5 },
  { key: "QA Admin", label: "QA Admin", icon: "🛡️", groupId: 16 },
  {
    key: "LRD Chief Admin",
    label: "LRD Chief Admin",
    icon: "📌",
    groupId: 17,
  },
  { key: "OD-Receiving", label: "OD-Receiving", icon: "📥", groupId: 18 },
  { key: "OD-Releasing", label: "OD-Releasing", icon: "📤", groupId: 19 },
  {
    key: "Releasing Officer",
    label: "Releasing Officer",
    icon: "🏁",
    groupId: 8,
  },
];

const REROUTE_REASONS = [
  "Missing documents",
  "Incorrect classification",
  "Additional evaluation needed",
  "Compliance issue",
  "Director directive",
  "Applicant request",
  "System correction",
  "Others",
];

const stepObjFor = (key) => WORKFLOW_STEPS.find((s) => s.key === key);
const stepIndexFor = (key) => WORKFLOW_STEPS.findIndex((s) => s.key === key);

const nowPHT = () => {
  const now = new Date();
  return now
    .toLocaleString("sv-SE", { timeZone: "Asia/Manila" })
    .replace(" ", "T");
};

/* ── Compact per-row searchable user dropdown (same pattern as ReassignAllModal) ──
   Dropdown list renders in a fixed-position portal (document.body) so it
   never gets clipped or hidden by the modal's scrollable table container. */
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
          border: `1px solid ${value ? "#0891b2" : colors.cardBorder}`,
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
                      u.username === value ? "#0891b222" : "transparent",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "#0891b222")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background =
                      u.username === value ? "#0891b222" : "transparent")
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
function RerouteAllModal({ records, onClose, onSuccess, colors, darkMode }) {
  // records: [{ id, mainDbId, dtn, oldRsn, applicationStep, userName, updatedAt, applicationStatus }]
  const [rows, setRows] = useState(
    records.map((r) => ({
      ...r,
      targetStep: "",
      assignTo: "",
      reason: "",
      remarks: "",
    })),
  );
  const [usersByStep, setUsersByStep] = useState({});
  const [loadingSteps, setLoadingSteps] = useState({});
  const [currentUser, setCurrentUser] = useState(null);
  const [phase, setPhase] = useState("form"); // "form" | "progress" | "done"
  const [results, setResults] = useState([]);

  // ── Bulk-fill state (apply one value to every row) ──
  const [bulkTargetStep, setBulkTargetStep] = useState("");
  const [bulkAssignTo, setBulkAssignTo] = useState("");
  const [bulkReason, setBulkReason] = useState("");
  const [bulkRemarks, setBulkRemarks] = useState("");

  useEffect(() => {
    const u = getUser();
    if (u) setCurrentUser(u);
  }, []);

  // fetch users for a target step's group, once, on demand
  const ensureUsersForStep = (stepKey) => {
    if (!stepKey || usersByStep[stepKey] || loadingSteps[stepKey]) return;
    const groupId = stepObjFor(stepKey)?.groupId;
    if (!groupId) return;
    setLoadingSteps((prev) => ({ ...prev, [stepKey]: true }));
    getUsersByGroup(groupId)
      .then((users) =>
        setUsersByStep((prev) => ({ ...prev, [stepKey]: users })),
      )
      .catch(() => setUsersByStep((prev) => ({ ...prev, [stepKey]: [] })))
      .finally(() =>
        setLoadingSteps((prev) => ({ ...prev, [stepKey]: false })),
      );
  };

  const updateRow = (id, field, value) => {
    setRows((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              [field]: value,
              // changing target step invalidates whatever was picked before
              ...(field === "targetStep" ? { assignTo: "" } : {}),
            }
          : r,
      ),
    );
    if (field === "targetStep") ensureUsersForStep(value);
  };

  // union of users across every target-step group touched so far —
  // used by the bulk "Assign To" field
  const combinedUsers = Object.values(usersByStep)
    .flat()
    .filter(Boolean)
    .filter(
      (u, idx, arr) => arr.findIndex((x) => x.username === u.username) === idx,
    );
  const combinedUsersLoading =
    Object.values(loadingSteps).some(Boolean) && combinedUsers.length === 0;

  const applyTargetStepToAll = () => {
    setRows((prev) =>
      prev.map((r) => ({ ...r, targetStep: bulkTargetStep, assignTo: "" })),
    );
    ensureUsersForStep(bulkTargetStep);
  };
  const applyAssignToAll = () =>
    setRows((prev) => prev.map((r) => ({ ...r, assignTo: bulkAssignTo })));
  const applyReasonToAll = () =>
    setRows((prev) => prev.map((r) => ({ ...r, reason: bulkReason })));
  const applyRemarksToAll = () =>
    setRows((prev) => prev.map((r) => ({ ...r, remarks: bulkRemarks })));

  const rowIsReady = (r) => {
    if (!r.targetStep || !r.reason) return false;
    const hasGroup = !!stepObjFor(r.targetStep)?.groupId;
    return hasGroup ? !!r.assignTo : true;
  };
  const readyRows = rows.filter(rowIsReady);
  const canReroute = readyRows.length > 0;

  const handleReroute = async () => {
    setPhase("progress");
    const initial = readyRows.map((r) => ({ ...r, status: "pending" }));
    setResults(initial);
    const updated = [...initial];

    for (let i = 0; i < readyRows.length; i++) {
      const row = readyRows[i];
      const assignedUserObj = (usersByStep[row.targetStep] || []).find(
        (u) => u.username === row.assignTo,
      );
      try {
        await rerouteApplication({
          main_db_id: row.mainDbId,
          action_type: "REROUTE",
          application_step: row.applicationStep,
          reroute_from_step: row.applicationStep,
          reroute_target_step: row.targetStep,
          reroute_reason: row.reason,
          reroute_remarks: row.remarks || null,
          rerouted_by_user_id: currentUser?.id ?? null,
          rerouted_by_user_name: currentUser?.username ?? null,
          rerouted_at: nowPHT(),
          user_name: row.assignTo || null,
          user_id: assignedUserObj?.id ?? null,
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
          maxWidth: 1240,
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
            background: "linear-gradient(135deg,#0891b2,#0e7490)",
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
              🔀 Re-route All by Task
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
            {/* ── Bulk-fill bar ── */}
            <div
              style={{
                padding: "0.75rem 1.4rem",
                borderBottom: `1px solid ${colors.cardBorder}`,
                display: "flex",
                flexWrap: "wrap",
                alignItems: "flex-end",
                gap: "0.75rem",
                background: darkMode ? "#151515" : "#eef7f9",
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

              <select
                value={bulkTargetStep}
                onChange={(e) => setBulkTargetStep(e.target.value)}
                style={{
                  padding: "0.3rem 0.5rem",
                  minWidth: 170,
                  background: darkMode ? "#1a1a1a" : "#f5f5f5",
                  border: `1px solid ${bulkTargetStep ? "#0891b2" : colors.cardBorder}`,
                  borderRadius: 6,
                  color: colors.textPrimary,
                  fontSize: "0.72rem",
                }}
              >
                <option value="">— target step —</option>
                {WORKFLOW_STEPS.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.icon} {s.label}
                  </option>
                ))}
              </select>
              <button
                onClick={applyTargetStepToAll}
                disabled={!bulkTargetStep}
                style={{
                  padding: "0.35rem 0.7rem",
                  background: bulkTargetStep ? "#0891b2" : "#555",
                  border: "none",
                  borderRadius: 6,
                  color: "#fff",
                  fontSize: "0.68rem",
                  fontWeight: 600,
                  cursor: bulkTargetStep ? "pointer" : "not-allowed",
                  opacity: bulkTargetStep ? 1 : 0.6,
                }}
              >
                Apply to all
              </button>

              <div style={{ minWidth: 210 }}>
                <RowUserSelect
                  value={bulkAssignTo}
                  onChange={setBulkAssignTo}
                  users={combinedUsers}
                  loading={combinedUsersLoading}
                  colors={colors}
                  darkMode={darkMode}
                />
              </div>
              <button
                onClick={applyAssignToAll}
                disabled={!bulkAssignTo}
                style={{
                  padding: "0.35rem 0.7rem",
                  background: bulkAssignTo ? "#0891b2" : "#555",
                  border: "none",
                  borderRadius: 6,
                  color: "#fff",
                  fontSize: "0.68rem",
                  fontWeight: 600,
                  cursor: bulkAssignTo ? "pointer" : "not-allowed",
                  opacity: bulkAssignTo ? 1 : 0.6,
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
                  border: `1px solid ${bulkReason ? "#0891b2" : colors.cardBorder}`,
                  borderRadius: 6,
                  color: colors.textPrimary,
                  fontSize: "0.72rem",
                }}
              >
                <option value="">— reason —</option>
                {REROUTE_REASONS.map((r) => (
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
                  background: bulkReason ? "#0891b2" : "#555",
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
                  background: "#0891b2",
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
                      "Current Step",
                      "Current User",
                      "Last Modified",
                      "Target Step",
                      "Assign To",
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
                  {rows.map((row, idx) => {
                    const targetObj = stepObjFor(row.targetStep);
                    const stepHasGroup = !!targetObj?.groupId;
                    const currentIdx = stepIndexFor(row.applicationStep);
                    const targetIdx = stepIndexFor(row.targetStep);
                    const isBackward =
                      row.targetStep &&
                      currentIdx > -1 &&
                      targetIdx > -1 &&
                      targetIdx < currentIdx;

                    return (
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
                            minWidth: 170,
                          }}
                        >
                          <select
                            value={row.targetStep}
                            onChange={(e) =>
                              updateRow(row.id, "targetStep", e.target.value)
                            }
                            style={{
                              width: "100%",
                              padding: "0.3rem 0.5rem",
                              background: darkMode ? "#1a1a1a" : "#f5f5f5",
                              border: `1px solid ${row.targetStep ? "#0891b2" : colors.cardBorder}`,
                              borderRadius: 6,
                              color: colors.textPrimary,
                              fontSize: "0.72rem",
                            }}
                          >
                            <option value="">— target step —</option>
                            {WORKFLOW_STEPS.map((s) => (
                              <option key={s.key} value={s.key}>
                                {s.icon} {s.label}
                                {s.key === row.applicationStep
                                  ? " (current)"
                                  : ""}
                              </option>
                            ))}
                          </select>
                          {isBackward && (
                            <div
                              style={{
                                fontSize: "0.62rem",
                                color: "#ef4444",
                                marginTop: "0.2rem",
                              }}
                            >
                              ⚠️ backward — needs approval
                            </div>
                          )}
                        </td>
                        <td
                          style={{
                            padding: "0.4rem 0.6rem",
                            borderBottom: `1px solid ${colors.tableBorder}`,
                            minWidth: 210,
                          }}
                        >
                          {!row.targetStep ? (
                            <span
                              style={{
                                fontSize: "0.7rem",
                                color: colors.textTertiary,
                              }}
                            >
                              — pick target step first —
                            </span>
                          ) : stepHasGroup ? (
                            <RowUserSelect
                              value={row.assignTo}
                              onChange={(v) => updateRow(row.id, "assignTo", v)}
                              users={usersByStep[row.targetStep]}
                              loading={loadingSteps[row.targetStep]}
                              colors={colors}
                              darkMode={darkMode}
                            />
                          ) : (
                            <input
                              type="text"
                              value={row.assignTo}
                              onChange={(e) =>
                                updateRow(row.id, "assignTo", e.target.value)
                              }
                              placeholder="username (optional)"
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
                          )}
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
                              border: `1px solid ${row.reason ? "#0891b2" : colors.cardBorder}`,
                              borderRadius: 6,
                              color: colors.textPrimary,
                              fontSize: "0.72rem",
                            }}
                          >
                            <option value="">— reason —</option>
                            {REROUTE_REASONS.map((r) => (
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
                    );
                  })}
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
                {readyRows.length} of {rows.length} ready (needs target step +
                reason{" "}
                {rows.some((r) => stepObjFor(r.targetStep)?.groupId)
                  ? "+ assignee for grouped steps"
                  : ""}
                )
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
                  onClick={handleReroute}
                  disabled={!canReroute}
                  style={{
                    padding: "0.55rem 1.3rem",
                    background: canReroute
                      ? "linear-gradient(135deg,#0891b2,#0e7490)"
                      : "#555",
                    border: "none",
                    borderRadius: 8,
                    color: "#fff",
                    fontWeight: 600,
                    cursor: canReroute ? "pointer" : "not-allowed",
                    opacity: canReroute ? 1 : 0.6,
                  }}
                >
                  🔀 Re-route {readyRows.length || ""}
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
                <span style={{ fontWeight: 600, color: "#0891b2" }}>
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
                      ? "Rerouted"
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
                    background: "linear-gradient(135deg,#0891b2,#0e7490)",
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

export default RerouteAllModal;
