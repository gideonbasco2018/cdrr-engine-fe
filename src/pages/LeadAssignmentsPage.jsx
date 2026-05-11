// src/pages/LeadAssignmentsPage.jsx
import { useState, useEffect, useCallback, useRef } from "react";
import { getAllUsers } from "../api/auth";
import {
  getLeadAssignments,
  createLeadAssignment,
  batchCreateLeadAssignments,
  updateLeadAssignment,
  deleteLeadAssignment,
} from "../api/lead-assignments";

// ── Avatar colours ────────────────────────────────────────────────────────────
const AVATAR_COLORS = [
  ["#6366f1", "#ede9fe"],
  ["#ec4899", "#fce7f3"],
  ["#f59e0b", "#fef3c7"],
  ["#10b981", "#d1fae5"],
  ["#3b82f6", "#dbeafe"],
  ["#ef4444", "#fee2e2"],
  ["#8b5cf6", "#ede9fe"],
  ["#06b6d4", "#cffafe"],
];
const avColor = (name = "") =>
  AVATAR_COLORS[(name.charCodeAt(0) || 0) % AVATAR_COLORS.length];

const ROLE_TABS = ["All", "Checker", "Supervisor"];
const PAGE_SIZE = 20;

// ── Helpers ───────────────────────────────────────────────────────────────────
const getInitials = (u) =>
  `${(u?.first_name || "")[0] || ""}${(u?.surname || "")[0] || ""}`.toUpperCase();

const fullName = (u) =>
  `${u?.first_name ?? ""} ${u?.surname ?? ""}`.trim() || u?.username || "—";

const formatDate = (str) =>
  str
    ? new Date(str).toLocaleDateString("en-PH", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "—";

// ── Theme helper ──────────────────────────────────────────────────────────────
const makeColors = (dark) =>
  dark
    ? {
        pageBg: "#0a0a0a",
        cardBg: "#161616",
        cardBorder: "#252525",
        textPrimary: "#fff",
        textSecondary: "#999",
        textTertiary: "#555",
        inputBg: "#1a1a1a",
        inputBorder: "#2a2a2a",
        rowHover: "#1e1e1e",
        rowBorder: "#222",
        modalOverlay: "rgba(0,0,0,0.65)",
        modalBg: "#1e1e1e",
        modalBorder: "#333",
        tabActiveBg: "#333",
        statCard: "#1a1a1a",
        panelBg: "#1a1a1a",
        dropBg: "#0a1a2a",
        dropBorder: "#3b82f6",
      }
    : {
        pageBg: "#f4f6f8",
        cardBg: "#ffffff",
        cardBorder: "#e8e8e8",
        textPrimary: "#111",
        textSecondary: "#555",
        textTertiary: "#999",
        inputBg: "#fff",
        inputBorder: "#ddd",
        rowHover: "#fafafa",
        rowBorder: "#eee",
        modalOverlay: "rgba(0,0,0,0.4)",
        modalBg: "#fff",
        modalBorder: "#e5e5e5",
        tabActiveBg: "#111",
        statCard: "#f9f9f9",
        panelBg: "#fafafa",
        dropBg: "#eff6ff",
        dropBorder: "#3b82f6",
      };

// ── Shared inline styles ──────────────────────────────────────────────────────
const inpStyle = (c) => ({
  width: "100%",
  padding: "0.6rem 0.85rem",
  borderRadius: 8,
  border: `1px solid ${c.inputBorder}`,
  background: c.inputBg,
  color: c.textPrimary,
  fontSize: "0.85rem",
  outline: "none",
  boxSizing: "border-box",
  fontFamily: "inherit",
});
const btnPrimary = {
  padding: "0.5rem 1.1rem",
  borderRadius: 8,
  border: "none",
  background: "#3b82f6",
  color: "#fff",
  fontSize: "0.85rem",
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "inherit",
};
const btnSecondary = (c) => ({
  padding: "0.5rem 1.1rem",
  borderRadius: 8,
  border: `1px solid ${c.modalBorder}`,
  background: "transparent",
  color: c.textSecondary,
  fontSize: "0.85rem",
  cursor: "pointer",
  fontFamily: "inherit",
});

// ── Avatar ────────────────────────────────────────────────────────────────────
function Avatar({ user, size = 32 }) {
  const name = fullName(user);
  const [fg, bg] = avColor(name);
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: bg,
        color: fg,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.35,
        fontWeight: 700,
        border: `2px solid ${fg}30`,
      }}
    >
      {getInitials(user)}
    </div>
  );
}

// ── Badge ─────────────────────────────────────────────────────────────────────
function Badge({ type }) {
  const map = {
    Checker: { bg: "#ede9fe", color: "#6366f1" },
    Supervisor: { bg: "#dbeafe", color: "#3b82f6" },
    Active: { bg: "#dcfce7", color: "#16a34a" },
    Inactive: { bg: "#f3f4f6", color: "#6b7280" },
  };
  const s = map[type] || map.Inactive;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "3px 10px",
        borderRadius: 20,
        fontSize: 12,
        fontWeight: 600,
        background: s.bg,
        color: s.color,
      }}
    >
      {(type === "Active" || type === "Inactive") && (
        <span style={{ fontSize: 7 }}>●</span>
      )}
      {type}
    </span>
  );
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div
      style={{
        position: "fixed",
        bottom: "1.5rem",
        right: "1.5rem",
        zIndex: 2000,
        padding: "0.85rem 1.4rem",
        borderRadius: 10,
        background: toast.type === "success" ? "#16a34a" : "#dc2626",
        color: "#fff",
        fontSize: "0.85rem",
        fontWeight: 500,
        boxShadow: "0 4px 14px rgba(0,0,0,0.25)",
        display: "flex",
        alignItems: "center",
        gap: "0.6rem",
      }}
    >
      <span>{toast.type === "success" ? "✓" : "✕"}</span>
      {toast.message}
    </div>
  );
}

// ── Transfer Modal (Create) ───────────────────────────────────────────────────
function AssignmentTransferModal({
  onClose,
  onSubmit,
  submitting,
  error,
  leadUsers,
  evaluators,
  darkMode,
  c,
}) {
  const [leadRole, setLeadRole] = useState("Checker");
  const [leadUserId, setLeadUserId] = useState("");
  const [remarks, setRemarks] = useState("");
  const [members, setMembers] = useState([]);
  const [search, setSearch] = useState("");
  const [dropActive, setDropActive] = useState(false);
  const dragging = useRef(null);

  const filteredLeads = leadUsers.filter((u) =>
    u.groups?.some((g) => g.name === leadRole),
  );
  const memberIds = new Set(members.map((m) => m.id));
  const available = evaluators.filter(
    (u) =>
      !memberIds.has(u.id) &&
      (search === "" ||
        `${u.first_name} ${u.surname} ${u.username}`
          .toLowerCase()
          .includes(search.toLowerCase())),
  );

  const addMember = (user) => setMembers((p) => [...p, user]);
  const removeMember = (id) => setMembers((p) => p.filter((m) => m.id !== id));

  const onDragStart = (user) => {
    dragging.current = user;
  };

  const onDropRight = (e) => {
    e.preventDefault();
    setDropActive(false);
    if (dragging.current && !memberIds.has(dragging.current.id))
      addMember(dragging.current);
    dragging.current = null;
  };
  const onDropLeft = (e) => {
    e.preventDefault();
    if (dragging.current && memberIds.has(dragging.current.id))
      removeMember(dragging.current.id);
    dragging.current = null;
  };

  const handleSubmit = () => {
    if (!leadUserId || members.length === 0) return;
    onSubmit({
      lead_user_id: Number(leadUserId),
      lead_role: leadRole,
      member_user_ids: members.map((m) => m.id),
      remarks: remarks || null,
    });
  };

  const inp = inpStyle(c);
  const panelStyle = {
    flex: 1,
    borderRadius: 10,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    minHeight: 0,
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 999,
        background: c.modalOverlay,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: c.modalBg,
          borderRadius: 14,
          border: `1px solid ${c.modalBorder}`,
          padding: "1.75rem",
          width: "100%",
          maxWidth: 800,
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          gap: "1.25rem",
          boxShadow: "0 8px 40px rgba(0,0,0,0.3)",
          boxSizing: "border-box",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ fontSize: "1.4rem", marginBottom: 4 }}>🔗</div>
            <h3
              style={{
                margin: 0,
                fontSize: "1.1rem",
                fontWeight: 700,
                color: c.textPrimary,
              }}
            >
              Add new assignment
            </h3>
            <p
              style={{
                margin: "2px 0 0",
                fontSize: "0.82rem",
                color: c.textSecondary,
              }}
            >
              Select a lead then drag or click + Add to assign evaluators.
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
              border: `1px solid ${c.cardBorder}`,
              borderRadius: 8,
              background: "transparent",
              color: c.textSecondary,
              cursor: "pointer",
              fontSize: "1rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ✕
          </button>
        </div>

        {/* Error */}
        {error && (
          <div
            style={{
              background: darkMode ? "#2a1010" : "#fee2e2",
              color: darkMode ? "#fca5a5" : "#dc2626",
              borderRadius: 8,
              padding: "10px 14px",
              fontSize: 13,
            }}
          >
            ⚠️ {error}
          </div>
        )}

        {/* Lead selection */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 2fr 2fr",
            gap: 12,
          }}
        >
          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.78rem",
                fontWeight: 600,
                color: c.textSecondary,
                marginBottom: 5,
              }}
            >
              Lead role
            </label>
            <select
              value={leadRole}
              onChange={(e) => {
                setLeadRole(e.target.value);
                setLeadUserId("");
              }}
              style={inp}
            >
              <option value="Checker">Checker</option>
              <option value="Supervisor">Supervisor</option>
            </select>
          </div>
          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.78rem",
                fontWeight: 600,
                color: c.textSecondary,
                marginBottom: 5,
              }}
            >
              Lead user ({leadRole})
            </label>
            <select
              value={leadUserId}
              onChange={(e) => setLeadUserId(e.target.value)}
              style={inp}
            >
              <option value="">Select {leadRole}...</option>
              {filteredLeads.map((u) => (
                <option key={u.id} value={u.id}>
                  {fullName(u)} (@{u.username})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.78rem",
                fontWeight: 600,
                color: c.textSecondary,
                marginBottom: 5,
              }}
            >
              Remarks <span style={{ fontWeight: 400 }}>(optional)</span>
            </label>
            <input
              type="text"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Compliance queue..."
              style={inp}
            />
          </div>
        </div>

        {/* Transfer panels */}
        <div
          style={{
            display: "flex",
            gap: 10,
            flex: 1,
            minHeight: 0,
            height: 340,
          }}
        >
          {/* LEFT — Available */}
          <div
            style={{
              ...panelStyle,
              border: `1px solid ${c.cardBorder}`,
              background: c.panelBg,
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={onDropLeft}
          >
            {/* Panel header */}
            <div
              style={{
                padding: "9px 14px",
                borderBottom: `1px solid ${c.cardBorder}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span
                style={{
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  color: c.textTertiary,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                All Evaluators — not added
              </span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "2px 7px",
                  borderRadius: 10,
                  background: darkMode ? "#2a2a2a" : "#e5e7eb",
                  color: c.textSecondary,
                }}
              >
                {available.length}
              </span>
            </div>

            {/* Search */}
            <div
              style={{
                padding: "8px 12px",
                borderBottom: `1px solid ${c.cardBorder}`,
              }}
            >
              <input
                type="text"
                placeholder="Search users..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ ...inp, padding: "5px 10px", fontSize: "0.8rem" }}
              />
            </div>

            {/* List */}
            <div style={{ flex: 1, overflowY: "auto" }}>
              {available.length === 0 && (
                <div
                  style={{
                    padding: "2rem",
                    textAlign: "center",
                    color: c.textTertiary,
                    fontSize: "0.82rem",
                  }}
                >
                  {search ? "No users match." : "All evaluators added."}
                </div>
              )}
              {available.map((user) => (
                <div
                  key={user.id}
                  draggable
                  onDragStart={() => onDragStart(user)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "8px 14px",
                    borderBottom: `1px solid ${c.rowBorder}`,
                    cursor: "grab",
                    transition: "background 0.12s",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = darkMode
                      ? "#222"
                      : "#f0f4ff")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 9,
                      flex: 1,
                      minWidth: 0,
                    }}
                  >
                    <span
                      style={{
                        color: c.textTertiary,
                        fontSize: 14,
                        userSelect: "none",
                      }}
                    >
                      ⠿
                    </span>
                    <Avatar user={user} size={30} />
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: 600,
                          fontSize: "0.84rem",
                          color: c.textPrimary,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {fullName(user)}
                      </div>
                      <div
                        style={{ fontSize: "0.71rem", color: c.textTertiary }}
                      >
                        @{user.username}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => addMember(user)}
                    style={{
                      padding: "3px 11px",
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 600,
                      border: "1px solid #3b82f6",
                      background: "transparent",
                      color: "#3b82f6",
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                      fontFamily: "inherit",
                      flexShrink: 0,
                      marginLeft: 8,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "#3b82f6";
                      e.currentTarget.style.color = "#fff";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.color = "#3b82f6";
                    }}
                  >
                    + Add
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Arrow */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              flexDirection: "column",
              gap: 6,
            }}
          >
            <span style={{ color: c.textTertiary, fontSize: 18 }}>→</span>
            <span
              style={{
                fontSize: "0.62rem",
                color: c.textTertiary,
                textAlign: "center",
                lineHeight: 1.3,
              }}
            >
              drag
              <br />
              or add
            </span>
            <span style={{ color: c.textTertiary, fontSize: 18 }}>←</span>
          </div>

          {/* RIGHT — Members */}
          <div
            style={{
              ...panelStyle,
              border: dropActive
                ? `1.5px solid ${c.dropBorder}`
                : members.length > 0
                  ? `1.5px solid #3b82f6`
                  : `1px solid ${c.cardBorder}`,
              background: dropActive ? c.dropBg : c.modalBg,
              transition: "border-color 0.15s, background 0.15s",
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setDropActive(true);
            }}
            onDragLeave={() => setDropActive(false)}
            onDrop={onDropRight}
          >
            {/* Panel header */}
            <div
              style={{
                padding: "9px 14px",
                borderBottom: `1px solid ${c.cardBorder}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span
                style={{
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  color: c.textTertiary,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                {leadUserId
                  ? `${filteredLeads.find((u) => String(u.id) === String(leadUserId))?.first_name ?? "Lead"}'s members`
                  : "Members"}
              </span>
              {members.length > 0 && (
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "2px 7px",
                    borderRadius: 10,
                    background: "#dbeafe",
                    color: "#3b82f6",
                  }}
                >
                  {members.length}
                </span>
              )}
            </div>

            {/* Drop hint when empty */}
            {members.length === 0 && (
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  color: c.textTertiary,
                  gap: 8,
                }}
              >
                <span style={{ fontSize: 30 }}>👥</span>
                <span style={{ fontSize: "0.82rem" }}>
                  Drag evaluators here
                </span>
                <span style={{ fontSize: "0.73rem" }}>or use + Add button</span>
              </div>
            )}

            {/* Member list */}
            <div style={{ flex: 1, overflowY: "auto" }}>
              {members.map((user, idx) => (
                <div
                  key={user.id}
                  draggable
                  onDragStart={() => onDragStart(user)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "8px 14px",
                    borderBottom:
                      idx < members.length - 1
                        ? `1px solid ${c.rowBorder}`
                        : "none",
                    transition: "background 0.12s",
                    cursor: "grab",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = darkMode
                      ? "#1e1e1e"
                      : "#fafafa")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 9,
                      flex: 1,
                      minWidth: 0,
                    }}
                  >
                    <span
                      style={{
                        color: c.textTertiary,
                        fontSize: 14,
                        userSelect: "none",
                      }}
                    >
                      ⠿
                    </span>
                    <Avatar user={user} size={30} />
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: 600,
                          fontSize: "0.84rem",
                          color: c.textPrimary,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {fullName(user)}
                      </div>
                      <div
                        style={{ fontSize: "0.71rem", color: c.textTertiary }}
                      >
                        @{user.username}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => removeMember(user.id)}
                    style={{
                      padding: "3px 10px",
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 600,
                      border: "1px solid #ef4444",
                      background: "transparent",
                      color: "#ef4444",
                      cursor: "pointer",
                      flexShrink: 0,
                      fontFamily: "inherit",
                      marginLeft: 8,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "#ef4444";
                      e.currentTarget.style.color = "#fff";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.color = "#ef4444";
                    }}
                  >
                    ✕ Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingTop: "0.75rem",
            borderTop: `1px solid ${c.cardBorder}`,
          }}
        >
          <span style={{ fontSize: "0.82rem", color: c.textSecondary }}>
            {members.length > 0
              ? `${members.length} evaluator${members.length > 1 ? "s" : ""} will be assigned`
              : "No evaluators added yet"}
          </span>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={onClose} style={btnSecondary(c)}>
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || !leadUserId || members.length === 0}
              style={{
                ...btnPrimary,
                opacity:
                  submitting || !leadUserId || members.length === 0 ? 0.5 : 1,
                cursor:
                  submitting || !leadUserId || members.length === 0
                    ? "not-allowed"
                    : "pointer",
              }}
            >
              {submitting
                ? "Saving..."
                : `Save${members.length > 0 ? ` (${members.length})` : ""}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Edit Modal ────────────────────────────────────────────────────────────────
function EditModal({ form, setForm, onClose, onSubmit, submitting, error, c }) {
  const inp = inpStyle(c);
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 999,
        background: c.modalOverlay,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: c.modalBg,
          borderRadius: 14,
          border: `1px solid ${c.modalBorder}`,
          padding: "2rem",
          width: "100%",
          maxWidth: 420,
          boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
          boxSizing: "border-box",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ fontSize: "1.4rem", marginBottom: 6 }}>✏️</div>
        <h3
          style={{
            margin: "0 0 0.25rem",
            color: c.textPrimary,
            fontSize: "1.1rem",
          }}
        >
          Edit assignment
        </h3>
        <p
          style={{
            margin: "0 0 1.4rem",
            color: c.textSecondary,
            fontSize: "0.85rem",
          }}
        >
          Update status or remarks.
        </p>

        {error && (
          <div
            style={{
              background: "#fee2e2",
              color: "#dc2626",
              borderRadius: 8,
              padding: "10px 14px",
              fontSize: 13,
              marginBottom: "1rem",
            }}
          >
            ⚠️ {error}
          </div>
        )}

        <div style={{ marginBottom: "1rem" }}>
          <label
            style={{
              display: "block",
              fontSize: "0.82rem",
              fontWeight: 600,
              color: c.textSecondary,
              marginBottom: 5,
            }}
          >
            Remarks
          </label>
          <textarea
            rows={3}
            value={form.remarks}
            onChange={(e) =>
              setForm((f) => ({ ...f, remarks: e.target.value }))
            }
            placeholder="e.g. For compliance queue..."
            style={{ ...inp, resize: "vertical", lineHeight: 1.5 }}
          />
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: "1.5rem",
          }}
        >
          <input
            type="checkbox"
            id="ea_active"
            checked={form.is_active ?? true}
            onChange={(e) =>
              setForm((f) => ({ ...f, is_active: e.target.checked }))
            }
          />
          <label
            htmlFor="ea_active"
            style={{ fontSize: 13, color: c.textPrimary, cursor: "pointer" }}
          >
            Active
          </label>
        </div>

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={btnSecondary(c)}>
            Cancel
          </button>
          <button
            onClick={onSubmit}
            disabled={submitting}
            style={{
              ...btnPrimary,
              opacity: submitting ? 0.6 : 1,
              cursor: submitting ? "not-allowed" : "pointer",
            }}
          >
            {submitting ? "Saving..." : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Delete Modal ──────────────────────────────────────────────────────────────
function DeleteModal({ target, onClose, onConfirm, deleting, c }) {
  if (!target) return null;
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 999,
        background: c.modalOverlay,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: c.modalBg,
          borderRadius: 14,
          border: `1px solid ${c.modalBorder}`,
          padding: "2rem",
          width: "100%",
          maxWidth: 380,
          boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ fontSize: "1.4rem", marginBottom: 6 }}>⚠️</div>
        <h3 style={{ margin: "0 0 0.35rem", color: c.textPrimary }}>
          Delete assignment?
        </h3>
        <p
          style={{
            margin: "0 0 1.5rem",
            color: c.textSecondary,
            fontSize: "0.88rem",
            lineHeight: 1.5,
          }}
        >
          This will permanently remove the assignment between{" "}
          <strong style={{ color: c.textPrimary }}>
            {fullName(target.lead)}
          </strong>{" "}
          and{" "}
          <strong style={{ color: c.textPrimary }}>
            {fullName(target.member)}
          </strong>
          .
        </p>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={btnSecondary(c)}>
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            style={{
              ...btnPrimary,
              background: "#dc2626",
              opacity: deleting ? 0.6 : 1,
              cursor: deleting ? "not-allowed" : "pointer",
            }}
          >
            {deleting ? "Deleting..." : "Yes, delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function LeadAssignmentsPage({ darkMode }) {
  const c = makeColors(darkMode);

  // ── Data ───────────────────────────────────────────────────────────────────
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [allUsers, setAllUsers] = useState([]);

  // ── Filters ────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState("All");
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  // ── Modal ──────────────────────────────────────────────────────────────────
  const [modalMode, setModalMode] = useState(null); // "create" | "edit"
  const [editTarget, setEditTarget] = useState(null);
  const [editForm, setEditForm] = useState({ remarks: "", is_active: true });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // ── Toast ──────────────────────────────────────────────────────────────────
  const [toast, setToast] = useState(null);
  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Derived user lists ─────────────────────────────────────────────────────
  const leadUsers = allUsers.filter((u) =>
    u.groups?.some((g) => g.name === "Checker" || g.name === "Supervisor"),
  );
  const evaluators = allUsers.filter((u) =>
    u.groups?.some((g) => g.name === "Evaluator"),
  );

  // ── Fetch users ────────────────────────────────────────────────────────────
  const fetchUsers = useCallback(async () => {
    try {
      const res = await getAllUsers();
      const users = Array.isArray(res) ? res : (res.results ?? []);
      setAllUsers(users);
    } catch {
      /* non-blocking */
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // ── Fetch assignments ──────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page,
        page_size: PAGE_SIZE,
        ...(activeTab !== "All" && { lead_role: activeTab }),
        ...(statusFilter === "active" && { is_active: true }),
        ...(statusFilter === "inactive" && { is_active: false }),
      };
      const res = await getLeadAssignments(params);
      setData(res.data);
      setTotal(res.total);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page, activeTab, statusFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);
  useEffect(() => {
    setPage(1);
  }, [activeTab, statusFilter, search]);

  // ── Client search ──────────────────────────────────────────────────────────
  const filtered = data.filter((row) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      fullName(row.lead).toLowerCase().includes(q) ||
      fullName(row.member).toLowerCase().includes(q) ||
      (row.lead?.username ?? "").toLowerCase().includes(q)
    );
  });

  // ── Stats ──────────────────────────────────────────────────────────────────
  const stats = [
    { label: "TOTAL", value: total, color: null },
    {
      label: "ACTIVE",
      value: data.filter((r) => r.is_active).length,
      color: "#16a34a",
    },
    {
      label: "CHECKERS",
      value: data.filter((r) => r.lead_role === "Checker").length,
      color: "#6366f1",
    },
    {
      label: "SUPERVISORS",
      value: data.filter((r) => r.lead_role === "Supervisor").length,
      color: "#3b82f6",
    },
  ];

  // ── Handlers ───────────────────────────────────────────────────────────────
  const openCreate = () => {
    setFormError(null);
    setModalMode("create");
  };

  const openEdit = (row) => {
    setEditTarget(row);
    setEditForm({ remarks: row.remarks || "", is_active: row.is_active });
    setFormError(null);
    setModalMode("edit");
  };

  const closeModal = () => {
    setModalMode(null);
    setEditTarget(null);
  };

  const handleCreate = async (payload) => {
    setSubmitting(true);
    setFormError(null);
    try {
      await batchCreateLeadAssignments(payload);
      showToast(
        "success",
        `${payload.member_user_ids.length} assignment(s) created.`,
      );
      closeModal();
      fetchData();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async () => {
    setSubmitting(true);
    setFormError(null);
    try {
      await updateLeadAssignment(editTarget.id, {
        is_active: editForm.is_active,
        remarks: editForm.remarks || null,
      });
      showToast("success", "Assignment updated.");
      closeModal();
      fetchData();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteLeadAssignment(deleteTarget.id);
      setDeleteTarget(null);
      showToast("success", "Assignment deleted.");
      fetchData();
    } catch (err) {
      showToast("error", err.message);
    } finally {
      setDeleting(false);
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        flex: 1,
        background: c.pageBg,
        color: c.textPrimary,
        overflow: "auto",
        padding: "1rem",
      }}
    >
      <Toast toast={toast} />

      {/* Header */}
      <div style={{ marginBottom: "0.5rem" }}>
        <h1
          style={{
            margin: 0,
            fontSize: "1.15rem",
            fontWeight: 700,
            color: c.textPrimary,
          }}
        >
          🔗 Lead Assignments
        </h1>
        <p
          style={{
            margin: "0.3rem 0 0",
            color: c.textSecondary,
            fontSize: "0.8rem",
          }}
        >
          Manage Checker &amp; Supervisor monitoring of Evaluators.
        </p>
      </div>

      {/* Stat Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4,1fr)",
          gap: ".8rem",
          marginBottom: "0.8rem",
        }}
      >
        {stats.map((s) => (
          <div
            key={s.label}
            style={{
              background: c.cardBg,
              border: `1px solid ${c.cardBorder}`,
              borderRadius: 12,
              padding: "1rem 1.25rem",
            }}
          >
            <div
              style={{
                fontSize: "0.7rem",
                color: c.textTertiary,
                fontWeight: 600,
                letterSpacing: "0.05em",
              }}
            >
              {s.label}
            </div>
            <div
              style={{
                fontSize: "1.5rem",
                fontWeight: 700,
                color: s.color || c.textPrimary,
                marginTop: 4,
              }}
            >
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* Filters bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "1.25rem",
          gap: "1rem",
          flexWrap: "wrap",
        }}
      >
        {/* Role tabs */}
        <div
          style={{
            display: "flex",
            gap: "0.35rem",
            background: c.cardBg,
            border: `1px solid ${c.cardBorder}`,
            borderRadius: 10,
            padding: "0.3rem",
          }}
        >
          {ROLE_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: "0.4rem 1rem",
                borderRadius: 8,
                border: "none",
                background: activeTab === tab ? c.tabActiveBg : "transparent",
                color: activeTab === tab ? "#fff" : c.textSecondary,
                fontSize: "0.83rem",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.15s",
                fontFamily: "inherit",
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Right controls */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            flexWrap: "wrap",
          }}
        >
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: "0.45rem 0.9rem",
              borderRadius: 8,
              border: `1px solid ${c.inputBorder}`,
              background: c.inputBg,
              color: c.textPrimary,
              fontSize: "0.85rem",
              fontFamily: "inherit",
              outline: "none",
            }}
          >
            <option value="">All status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          <input
            type="text"
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              padding: "0.45rem 1rem",
              borderRadius: 8,
              border: `1px solid ${c.inputBorder}`,
              background: c.inputBg,
              color: c.textPrimary,
              fontSize: "0.85rem",
              width: 220,
              outline: "none",
            }}
          />

          <button
            onClick={openCreate}
            style={{
              ...btnPrimary,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            + New assignment
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div
          style={{
            background: darkMode ? "#2a1010" : "#fee2e2",
            color: darkMode ? "#fca5a5" : "#dc2626",
            borderRadius: 8,
            padding: "10px 14px",
            fontSize: 13,
            marginBottom: "1rem",
          }}
        >
          ⚠️ {error}{" "}
          <button
            onClick={fetchData}
            style={{
              background: "none",
              border: "none",
              color: "#3b82f6",
              cursor: "pointer",
              fontWeight: 600,
              fontFamily: "inherit",
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Table */}
      <div
        style={{
          background: c.cardBg,
          border: `1px solid ${c.cardBorder}`,
          borderRadius: 14,
          overflow: "hidden",
        }}
      >
        {/* Table Header */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 130px 100px 130px 80px",
            gap: "1rem",
            padding: "0.7rem 1.25rem",
            background: darkMode ? "#1a1a1a" : "#f9f9f9",
            borderBottom: `1px solid ${c.cardBorder}`,
          }}
        >
          {[
            "Lead",
            "Member (Evaluator)",
            "Role",
            "Status",
            "Assigned date",
            "",
          ].map((h) => (
            <div
              key={h}
              style={{
                fontSize: "0.7rem",
                fontWeight: 700,
                color: c.textTertiary,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              {h}
            </div>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div
            style={{
              padding: "3rem",
              textAlign: "center",
              color: c.textTertiary,
            }}
          >
            Loading assignments...
          </div>
        )}

        {/* Empty */}
        {!loading && filtered.length === 0 && (
          <div
            style={{
              padding: "4rem",
              textAlign: "center",
              color: c.textTertiary,
            }}
          >
            <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>
              🔍
            </div>
            <div style={{ fontSize: "0.95rem", color: c.textSecondary }}>
              No assignments found.
            </div>
          </div>
        )}

        {/* Rows */}
        {!loading &&
          filtered.map((row, index) => {
            const rowBg =
              index % 2 === 0
                ? "transparent"
                : darkMode
                  ? "#1a1a1a"
                  : "#fafafa";
            return (
              <div
                key={row.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 130px 100px 130px 80px",
                  alignItems: "center",
                  gap: "1rem",
                  padding: "0.9rem 1.25rem",
                  background: rowBg,
                  borderBottom: `1px solid ${c.rowBorder}`,
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = c.rowHover)
                }
                onMouseLeave={(e) => (e.currentTarget.style.background = rowBg)}
              >
                {/* Lead */}
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Avatar user={row.lead} size={34} />
                  <div>
                    <div
                      style={{
                        fontWeight: 600,
                        color: c.textPrimary,
                        fontSize: "0.88rem",
                      }}
                    >
                      {fullName(row.lead)}
                    </div>
                    <div style={{ fontSize: "0.73rem", color: c.textTertiary }}>
                      @{row.lead?.username ?? ""}
                    </div>
                  </div>
                </div>

                {/* Member */}
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Avatar user={row.member} size={34} />
                  <div>
                    <div
                      style={{
                        fontWeight: 600,
                        color: c.textPrimary,
                        fontSize: "0.88rem",
                      }}
                    >
                      {fullName(row.member)}
                    </div>
                    <div style={{ fontSize: "0.73rem", color: c.textTertiary }}>
                      @{row.member?.username ?? ""}
                    </div>
                  </div>
                </div>

                <Badge type={row.lead_role} />
                <Badge type={row.is_active ? "Active" : "Inactive"} />

                <div style={{ fontSize: "0.82rem", color: c.textSecondary }}>
                  {formatDate(row.assigned_at)}
                </div>

                {/* Actions */}
                <div
                  style={{
                    display: "flex",
                    gap: 5,
                    justifyContent: "flex-end",
                  }}
                >
                  <button
                    onClick={() => openEdit(row)}
                    title="Edit"
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 6,
                      border: `1px solid ${c.cardBorder}`,
                      background: "transparent",
                      color: c.textSecondary,
                      cursor: "pointer",
                      fontSize: "0.85rem",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = darkMode
                        ? "#2a2a2a"
                        : "#f0f0f0")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "transparent")
                    }
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => setDeleteTarget(row)}
                    title="Delete"
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 6,
                      border: `1px solid ${darkMode ? "#3a1a1a" : "#fee2e2"}`,
                      background: "transparent",
                      color: "#ef4444",
                      cursor: "pointer",
                      fontSize: "0.85rem",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = darkMode
                        ? "#2a1010"
                        : "#fee2e2")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "transparent")
                    }
                  >
                    🗑️
                  </button>
                </div>
              </div>
            );
          })}

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0.85rem 1.25rem",
              borderTop: `1px solid ${c.cardBorder}`,
              background: darkMode ? "#1a1a1a" : "#f9f9f9",
            }}
          >
            <span style={{ fontSize: "0.8rem", color: c.textTertiary }}>
              Page <strong style={{ color: c.textSecondary }}>{page}</strong> of{" "}
              <strong style={{ color: c.textSecondary }}>{totalPages}</strong> —{" "}
              <strong style={{ color: c.textSecondary }}>{total}</strong> total
            </span>
            <div style={{ display: "flex", gap: "0.35rem" }}>
              {[
                {
                  label: "‹",
                  fn: () => setPage((p) => Math.max(1, p - 1)),
                  disabled: page === 1,
                },
                {
                  label: "›",
                  fn: () => setPage((p) => Math.min(totalPages, p + 1)),
                  disabled: page === totalPages,
                },
              ].map(({ label, fn, disabled }) => (
                <button
                  key={label}
                  onClick={fn}
                  disabled={disabled}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 7,
                    border: `1px solid ${c.cardBorder}`,
                    background: "transparent",
                    color: disabled ? c.textTertiary : c.textSecondary,
                    cursor: disabled ? "not-allowed" : "pointer",
                    fontSize: "0.9rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: disabled ? 0.4 : 1,
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {modalMode === "create" && (
        <AssignmentTransferModal
          onClose={closeModal}
          onSubmit={handleCreate}
          submitting={submitting}
          error={formError}
          leadUsers={leadUsers}
          evaluators={evaluators}
          darkMode={darkMode}
          c={c}
        />
      )}

      {modalMode === "edit" && (
        <EditModal
          form={editForm}
          setForm={setEditForm}
          onClose={closeModal}
          onSubmit={handleEdit}
          submitting={submitting}
          error={formError}
          c={c}
        />
      )}

      <DeleteModal
        target={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        deleting={deleting}
        c={c}
      />
    </div>
  );
}
