import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  getOpenTasks,
  getOpenTaskSteps,
  getOpenTaskUsers,
} from "../../api/application-logs";
import {
  markAsDirectorsTarget,
  bulkMarkAsDirectorsTarget,
} from "../../api/targetAssignments";
import { StatusPill } from "./StatusPill";
import { DirectorsTargetModal } from "./DirectorsTargetModal";
import { inputStyle, thStyle, tdStyle } from "./sharedStyles";

const CURRENT_YEAR = new Date().getFullYear();
const DTN_YEARS = Array.from(
  { length: CURRENT_YEAR - 2015 + 2 },
  (_, i) => 2015 + i,
);
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

const pad2 = (n) => String(n).padStart(2, "0");

// Builds "YYYYMMDD" from {year, month, day} — returns undefined if incomplete.
function buildDtnDate({ year, month, day }) {
  if (!year || !month || !day) return undefined;
  return `${year}${pad2(month)}${pad2(day)}`;
}

const dtnPickerStyle = (colors) => ({
  ...inputStyle(colors),
  width: 84,
});

function DtnDatePicker({ colors, value, onChange }) {
  return (
    <>
      <select
        value={value.year}
        onChange={(e) => onChange({ ...value, year: e.target.value })}
        style={dtnPickerStyle(colors)}
      >
        <option value="">Year</option>
        {DTN_YEARS.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
      <select
        value={value.month}
        onChange={(e) => onChange({ ...value, month: e.target.value })}
        style={dtnPickerStyle(colors)}
      >
        <option value="">Month</option>
        {MONTHS.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
      <select
        value={value.day}
        onChange={(e) => onChange({ ...value, day: e.target.value })}
        style={dtnPickerStyle(colors)}
      >
        <option value="">Day</option>
        {DAYS.map((d) => (
          <option key={d} value={d}>
            {d}
          </option>
        ))}
      </select>
    </>
  );
}

export function DirectorsTargetView({ colors }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [stepFilter, setStepFilter] = useState("");
  const [steps, setSteps] = useState([]);

  // ── Current User filter ─────────────────────────────────────────
  const [userFilter, setUserFilter] = useState("");
  const [users, setUsers] = useState([]);

  // ── DTN Date Range (based on DTN digits 1-8) ────────────────────
  const [dtnFrom, setDtnFrom] = useState({ year: "", month: "", day: "" });
  const [dtnTo, setDtnTo] = useState({ year: "", month: "", day: "" });

  // ── Date Received (Center) Range ────────────────────────────────
  const [receivedFrom, setReceivedFrom] = useState("");
  const [receivedTo, setReceivedTo] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const indexOfFirstRow = (currentPage - 1) * rowsPerPage;

  const [selectedIds, setSelectedIds] = useState(new Set());
  const [modalTasks, setModalTasks] = useState(null);
  const [modalSubmitting, setModalSubmitting] = useState(false);

  const dtnDateFrom = useMemo(() => buildDtnDate(dtnFrom), [dtnFrom]);
  const dtnDateTo = useMemo(() => buildDtnDate(dtnTo), [dtnTo]);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getOpenTasks({
        page: currentPage,
        page_size: rowsPerPage,
        search: searchTerm || undefined,
        application_step: stepFilter || undefined,
        user_name: userFilter || undefined,
        dtn_date_from: dtnDateFrom,
        dtn_date_to: dtnDateTo,
        date_received_from: receivedFrom || undefined,
        date_received_to: receivedTo || undefined,
      });
      setData(res.data || []);
      setTotalRecords(res.total || 0);
      setTotalPages(Math.ceil((res.total || 0) / rowsPerPage) || 1);
    } catch (e) {
      console.error("Failed to load directors target tasks:", e);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [
    currentPage,
    rowsPerPage,
    searchTerm,
    stepFilter,
    userFilter,
    dtnDateFrom,
    dtnDateTo,
    receivedFrom,
    receivedTo,
  ]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchTerm,
    stepFilter,
    userFilter,
    dtnDateFrom,
    dtnDateTo,
    receivedFrom,
    receivedTo,
  ]);

  useEffect(() => {
    getOpenTaskSteps()
      .then((res) => setSteps(res.steps || []))
      .catch(() => setSteps([]));
    getOpenTaskUsers()
      .then((res) => setUsers(res.users || []))
      .catch(() => setUsers([]));
  }, []);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [
    currentPage,
    searchTerm,
    stepFilter,
    userFilter,
    dtnDateFrom,
    dtnDateTo,
    receivedFrom,
    receivedTo,
    data,
  ]);

  const allSelected =
    data.length > 0 && data.every((t) => selectedIds.has(t.id));

  const toggleSelectAll = () => {
    setSelectedIds((prev) =>
      allSelected ? new Set() : new Set(data.map((t) => t.id)),
    );
  };

  const toggleSelectOne = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toModalTask = (t) => ({
    log_id: t.id,
    dtn: t.dtn,
    brand_name:
      t.old_rsn && t.old_rsn !== "N/A" ? t.old_rsn : t.application_step,
    is_targeted: false,
  });

  const openBulkModal = () => {
    const selectedTasks = data.filter((t) => selectedIds.has(t.id));
    if (selectedTasks.length > 0) setModalTasks(selectedTasks.map(toModalTask));
  };

  const closeModal = () => {
    if (!modalSubmitting) setModalTasks(null);
  };

  const handleModalSubmit = async ({
    targetStartDate,
    targetEndDate,
    remarks,
  }) => {
    if (!modalTasks || modalTasks.length === 0) return;
    setModalSubmitting(true);
    try {
      if (modalTasks.length > 1) {
        await bulkMarkAsDirectorsTarget(
          modalTasks.map((t) => t.log_id),
          { targetStartDate, targetEndDate, remarks },
        );
      } else {
        await markAsDirectorsTarget(modalTasks[0].log_id, {
          targetStartDate,
          targetEndDate,
          remarks,
        });
      }
      setSelectedIds(new Set());
      setModalTasks(null);
      await fetchTasks();
    } catch (e) {
      console.error("Failed to mark as director's target:", e);
    } finally {
      setModalSubmitting(false);
    }
  };

  const clearAllFilters = () => {
    setSearchInput("");
    setSearchTerm("");
    setStepFilter("");
    setUserFilter("");
    setDtnFrom({ year: "", month: "", day: "" });
    setDtnTo({ year: "", month: "", day: "" });
    setReceivedFrom("");
    setReceivedTo("");
  };

  const hasActiveFilters =
    searchTerm ||
    stepFilter ||
    userFilter ||
    dtnDateFrom ||
    dtnDateTo ||
    receivedFrom ||
    receivedTo;

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        border: `1px solid ${colors.cardBorder}`,
        borderRadius: "10px",
        background: colors.cardBg,
        overflow: "hidden",
      }}
    >
      {/* Row 1: search / step / current user */}
      <div
        style={{
          padding: "0.6rem 1.1rem",
          borderBottom: `1px solid ${colors.cardBorder}`,
          display: "flex",
          gap: "0.6rem",
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <input
          type="text"
          placeholder="Search DTN / brand…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") setSearchTerm(searchInput);
          }}
          style={{ ...inputStyle(colors), width: 200 }}
        />
        <button
          onClick={() => setSearchTerm(searchInput)}
          style={{
            padding: "6px 12px",
            borderRadius: "6px",
            border: `1px solid ${colors.cardBorder}`,
            background: "transparent",
            color: colors.textSecondary,
            fontSize: "0.75rem",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Search
        </button>
        <select
          value={stepFilter}
          onChange={(e) => setStepFilter(e.target.value)}
          style={{ ...inputStyle(colors), width: 190 }}
        >
          <option value="">All Steps</option>
          {steps.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          value={userFilter}
          onChange={(e) => setUserFilter(e.target.value)}
          style={{ ...inputStyle(colors), width: 160 }}
        >
          <option value="">All Users</option>
          {users.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>

        <span
          style={{
            marginLeft: "auto",
            fontSize: "0.72rem",
            fontWeight: 700,
            color: colors.textSecondary,
          }}
        >
          {totalRecords} in-progress task{totalRecords !== 1 ? "s" : ""}
        </span>
        {selectedIds.size > 0 && (
          <button
            onClick={openBulkModal}
            style={{
              padding: "6px 14px",
              borderRadius: "6px",
              border: "none",
              background: colors.targetBorder,
              color: "#fff",
              fontSize: "0.78rem",
              fontWeight: 700,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            🎯 Mark {selectedIds.size} as CDRR Target
          </button>
        )}
      </div>

      {/* Row 2: DTN date range + Date received range */}
      <div
        style={{
          padding: "0.6rem 1.1rem",
          borderBottom: `1px solid ${colors.cardBorder}`,
          display: "flex",
          gap: "1.5rem",
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <span
            style={{
              fontSize: "0.68rem",
              fontWeight: 700,
              color: colors.textTertiary,
              letterSpacing: "0.03em",
            }}
          >
            DTN DATE RANGE
            <br />
            <span style={{ fontWeight: 400, fontSize: "0.62rem" }}>
              based on DTN digits 1-8
            </span>
          </span>
          <span style={{ fontSize: "0.72rem", color: colors.textSecondary }}>
            FROM
          </span>
          <DtnDatePicker
            colors={colors}
            value={dtnFrom}
            onChange={setDtnFrom}
          />
          <span style={{ fontSize: "0.72rem", color: colors.textSecondary }}>
            → TO
          </span>
          <DtnDatePicker colors={colors} value={dtnTo} onChange={setDtnTo} />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <span
            style={{
              fontSize: "0.68rem",
              fontWeight: 700,
              color: colors.textTertiary,
              letterSpacing: "0.03em",
            }}
          >
            DATE RECEIVED
            <br />
            <span style={{ fontWeight: 400, fontSize: "0.62rem" }}>
              (Center)
            </span>
          </span>
          <span style={{ fontSize: "0.72rem", color: colors.textSecondary }}>
            FROM
          </span>
          <input
            type="date"
            value={receivedFrom}
            onChange={(e) => setReceivedFrom(e.target.value)}
            style={{ ...inputStyle(colors), width: 140 }}
          />
          <span style={{ fontSize: "0.72rem", color: colors.textSecondary }}>
            → TO
          </span>
          <input
            type="date"
            value={receivedTo}
            onChange={(e) => setReceivedTo(e.target.value)}
            style={{ ...inputStyle(colors), width: 140 }}
          />
        </div>

        {hasActiveFilters && (
          <button
            onClick={clearAllFilters}
            style={{
              marginLeft: "auto",
              padding: "6px 12px",
              borderRadius: "6px",
              border: `1px solid ${colors.cardBorder}`,
              background: "transparent",
              color: colors.textSecondary,
              fontSize: "0.72rem",
              fontWeight: 600,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            ✕ Clear Filters
          </button>
        )}
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflow: "auto" }}>
        {loading ? (
          <div
            style={{
              padding: "2rem",
              textAlign: "center",
              color: colors.textTertiary,
              fontSize: "0.85rem",
            }}
          >
            Loading…
          </div>
        ) : data.length === 0 ? (
          <div
            style={{
              padding: "2rem",
              textAlign: "center",
              color: colors.textTertiary,
              fontSize: "0.85rem",
            }}
          >
            No in-progress tasks found.
          </div>
        ) : (
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "0.82rem",
            }}
          >
            <thead>
              <tr
                style={{
                  background: colors.rowHover,
                  textAlign: "left",
                  position: "sticky",
                  top: 0,
                  zIndex: 1,
                }}
              >
                <th style={{ ...thStyle(colors), width: 34 }}>
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th style={{ ...thStyle(colors), width: 44 }}>#</th>
                <th style={thStyle(colors)}>DTN</th>
                <th style={thStyle(colors)}>Old RSN</th>
                <th style={thStyle(colors)}>Application Step</th>
                <th style={thStyle(colors)}>Current User</th>
                <th style={thStyle(colors)}>Date Received (Center)</th>
                <th style={thStyle(colors)}>Last Modified</th>
                <th style={thStyle(colors)}>Status</th>
                <th style={thStyle(colors)}>CDRR Target</th>
              </tr>
            </thead>
            <tbody>
              {data.map((t, idx) => (
                <tr
                  key={t.id}
                  style={{ borderTop: `1px solid ${colors.cardBorder}` }}
                >
                  <td style={tdStyle(colors)}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(t.id)}
                      onChange={() => toggleSelectOne(t.id)}
                    />
                  </td>
                  <td style={tdStyle(colors)}>{indexOfFirstRow + idx + 1}</td>
                  <td
                    style={{
                      ...tdStyle(colors),
                      fontWeight: 600,
                      color: colors.selectedBorder,
                    }}
                  >
                    {t.dtn}
                  </td>
                  <td style={tdStyle(colors)}>{t.old_rsn || "N/A"}</td>
                  <td style={tdStyle(colors)}>{t.application_step}</td>
                  <td style={tdStyle(colors)}>{t.user_name || "—"}</td>
                  <td style={tdStyle(colors)}>
                    {t.date_received_center || "—"}
                  </td>
                  <td style={tdStyle(colors)}>
                    {t.updated_at
                      ? new Date(t.updated_at).toLocaleString("en-US", {
                          month: "numeric",
                          day: "numeric",
                          year: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                          hour12: true,
                        })
                      : "—"}
                  </td>
                  <td style={tdStyle(colors)}>
                    <StatusPill status={t.application_status} />
                  </td>
                  <td style={{ ...tdStyle(colors), maxWidth: 220 }}>
                    {t.is_directors_target ? (
                      <div>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            padding: "3px 8px",
                            borderRadius: "999px",
                            background: "rgba(168, 85, 247, 0.15)",
                            border: "1px solid #a855f7",
                            color: "#c084fc",
                            fontSize: "0.7rem",
                            fontWeight: 700,
                            whiteSpace: "nowrap",
                          }}
                        >
                          🏛️ Targeted
                        </span>
                        {t.directors_target_start_date &&
                          t.directors_target_end_date && (
                            <div
                              style={{
                                fontSize: "0.65rem",
                                color: colors.textTertiary,
                                marginTop: 2,
                              }}
                            >
                              {t.directors_target_start_date} →{" "}
                              {t.directors_target_end_date}
                            </div>
                          )}
                        {t.directors_target_remarks && (
                          <div
                            style={{
                              fontSize: "0.68rem",
                              color: colors.textSecondary,
                              marginTop: 2,
                              whiteSpace: "normal",
                              overflowWrap: "break-word",
                            }}
                          >
                            📝 {t.directors_target_remarks}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span
                        style={{
                          color: colors.textTertiary,
                          fontSize: "0.78rem",
                        }}
                      >
                        —
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination — unchanged */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "0.75rem",
          padding: "0.6rem 1.1rem",
          borderTop: `1px solid ${colors.cardBorder}`,
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            fontSize: "0.72rem",
            color: colors.textSecondary,
          }}
        >
          <span>Rows per page:</span>
          <select
            value={rowsPerPage}
            onChange={(e) => {
              setRowsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            style={{
              padding: "3px 6px",
              borderRadius: "6px",
              border: `1px solid ${colors.cardBorder}`,
              background: colors.pageBg,
              color: colors.textPrimary,
              fontSize: "0.72rem",
              cursor: "pointer",
            }}
          >
            {[25, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            style={{
              padding: "4px 8px",
              borderRadius: "6px",
              border: `1px solid ${colors.cardBorder}`,
              background: "transparent",
              color: colors.textSecondary,
              fontSize: "0.72rem",
              cursor: currentPage === 1 ? "default" : "pointer",
              opacity: currentPage === 1 ? 0.4 : 1,
            }}
          >
            ‹ Prev
          </button>
          <span
            style={{
              fontSize: "0.72rem",
              fontWeight: 600,
              padding: "0 0.3rem",
            }}
          >
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            style={{
              padding: "4px 8px",
              borderRadius: "6px",
              border: `1px solid ${colors.cardBorder}`,
              background: "transparent",
              color: colors.textSecondary,
              fontSize: "0.72rem",
              cursor: currentPage === totalPages ? "default" : "pointer",
              opacity: currentPage === totalPages ? 0.4 : 1,
            }}
          >
            Next ›
          </button>
        </div>
      </div>

      {modalTasks && (
        <DirectorsTargetModal
          colors={colors}
          tasks={modalTasks}
          onClose={closeModal}
          onSubmit={handleModalSubmit}
          submitting={modalSubmitting}
        />
      )}
    </div>
  );
}

export default DirectorsTargetView;
