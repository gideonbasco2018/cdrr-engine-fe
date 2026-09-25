// FILE: src/pages/DonationPage.jsx
import { useState, useMemo, useEffect } from "react";
import { ArrowUpDown, ChevronUp, X as XIcon } from "lucide-react";
import * as XLSX from "xlsx";
import { getColorScheme } from "../components/reports/utils.js";
import {
  getDonations,
  createDonation,
  updateDonation,
  deleteDonation,
  getDeletedDonations,
  restoreDonation,
  getDonationChangeLog,
  downloadDonationTemplate,
} from "../api/donation.js";
import {
  TABS,
  ADV_FIELDS,
  ADV_DEFAULTS,
  toDateKey,
  StatusBadge,
  DTNBadge,
  ActionMenu,
  AdvancedFilterModal,
  DonationInfoModal,
  DonationUpdateModal,
  DonationCreateModal,
  DonationChangeLogModal,
  DonationExportColumnsModal,
  DonationUploadModal,
  DeletedDonationsModal,
  DonationDeleteConfirmModal,
} from "../components/donation";

function DonationPage({ darkMode }) {
  const colors = getColorScheme(darkMode);

  const [activeTab, setActiveTab] = useState("all");
  const [sortBy, setSortBy] = useState(null);
  const [sortOrder, setSortOrder] = useState("asc");

  const handleSort = (key) => {
    if (sortBy === key) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(key);
      setSortOrder("asc");
    }
  };
  const handleResetSort = () => {
    setSortBy(null);
    setSortOrder("asc");
  };
  const isDefaultSort = sortBy === null;
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRows, setSelectedRows] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(100);

  // Advanced Filter — one filterable field per column
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [advFilters, setAdvFilters] = useState(ADV_DEFAULTS);
  const [advDraft, setAdvDraft] = useState(ADV_DEFAULTS);

  const openAdvanced = () => {
    setAdvDraft(advFilters);
    setShowAdvanced(true);
  };
  const applyAdvanced = () => {
    setAdvFilters(advDraft);
    setShowAdvanced(false);
    setCurrentPage(1);
  };
  const cancelAdvanced = () => setShowAdvanced(false);
  const resetAdvanced = () => setAdvDraft(ADV_DEFAULTS);

  const activeAdvEntries = ADV_FIELDS.filter(
    (f) => advFilters[f.key] && advFilters[f.key] !== ADV_DEFAULTS[f.key],
  ).map((f) => ({ key: f.key, label: f.label, value: advFilters[f.key] }));
  const activeAdvCount = activeAdvEntries.length;

  // Clear one active filter chip (applies immediately, no need to reopen the modal).
  const clearOneFilter = (key) => {
    setAdvFilters((prev) => ({ ...prev, [key]: ADV_DEFAULTS[key] }));
    setCurrentPage(1);
  };
  // Clear every active filter at once.
  const clearAllFilters = () => {
    setAdvFilters(ADV_DEFAULTS);
    setCurrentPage(1);
  };

  // Donation records — fetched from the API; no more mock data.
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadDonations = async () => {
    setLoading(true);
    setError(null);
    try {
      setDonations(await getDonations());
    } catch (err) {
      console.error("Failed to load donations:", err);
      setError("Failed to load donation records. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDonations();
  }, []);

  // Import / Export / Add New Donation
  const [showImportModal, setShowImportModal] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);

  // "Trash" — soft-deleted records, with a way to restore them
  const [showDeleted, setShowDeleted] = useState(false);
  const [deletedRecords, setDeletedRecords] = useState([]);
  const [deletedLoading, setDeletedLoading] = useState(false);
  const [restoringId, setRestoringId] = useState(null);

  // Row action modals — Information / Update Information / Change Log
  const [infoRecord, setInfoRecord] = useState(null);
  const [updateRecord, setUpdateRecord] = useState(null);
  const [logRecord, setLogRecord] = useState(null);
  const [logEntries, setLogEntries] = useState([]);
  const [logLoading, setLogLoading] = useState(false);
  const [savingUpdate, setSavingUpdate] = useState(false);
  const [deleteRecord, setDeleteRecord] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const handleRowAction = async (actionId, record) => {
    if (actionId === "info") {
      setInfoRecord(record);
    } else if (actionId === "update") {
      setUpdateRecord(record);
    } else if (actionId === "changelog") {
      setLogRecord(record);
      setLogLoading(true);
      try {
        setLogEntries(await getDonationChangeLog(record.id));
      } catch (err) {
        console.error("Failed to load change log:", err);
        setLogEntries([]);
      } finally {
        setLogLoading(false);
      }
    } else if (actionId === "delete") {
      setDeleteRecord(record);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteRecord) return;
    setDeleting(true);
    try {
      await deleteDonation(deleteRecord.id);
      setDonations((prev) => prev.filter((d) => d.id !== deleteRecord.id));
      setSelectedRows((prev) => prev.filter((id) => id !== deleteRecord.id));
      setDeleteRecord(null);
    } catch (err) {
      console.error("Failed to delete donation:", err);
      alert("Failed to delete this record. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  const handleSaveUpdate = async (original, updated) => {
    setSavingUpdate(true);
    try {
      const saved = await updateDonation(original.id, updated);
      setDonations((prev) => prev.map((d) => (d.id === original.id ? saved : d)));
      setUpdateRecord(null);
    } catch (err) {
      console.error("Failed to update donation:", err);
      if (err.response?.status === 409) {
        alert(
          "Someone else already saved a change to this record. Reloading the latest version — please re-apply your edit.",
        );
        setUpdateRecord(null);
        await loadDonations();
      } else {
        alert("Failed to save changes. Please try again.");
      }
    } finally {
      setSavingUpdate(false);
    }
  };

  const statsData = useMemo(
    () => ({
      total: donations.length,
      approved: donations.filter((d) => d.status === "Approved").length,
      pending: donations.filter((d) => d.status === "For Evaluation").length,
    }),
    [donations],
  );

  const filteredData = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return donations.filter((d) => {
      if (activeTab === "approved" && d.status !== "Approved") return false;
      if (activeTab === "pending" && d.status !== "For Evaluation")
        return false;

      for (const f of ADV_FIELDS) {
        const val = advFilters[f.key];
        if (!val || val === ADV_DEFAULTS[f.key]) continue;
        if (f.type === "select") {
          if (d[f.key] !== val) return false;
        } else if (f.type === "date") {
          if (toDateKey(d[f.key]) !== val) return false;
        } else if (!String(d[f.key] ?? "").toLowerCase().includes(val.toLowerCase())) {
          return false;
        }
      }

      if (!q) return true;
      return [
        d.letterDtn,
        d.registrationDtn,
        d.donationRegNo,
        d.donor,
        d.donee,
        d.productName,
        d.manufacturer,
        d.batchLotNo,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [donations, activeTab, searchTerm, advFilters]);

  const sortedData = useMemo(() => {
    if (!sortBy) return filteredData;
    const isBlank = (v) => v === null || v === undefined || v === "" || v === "—";
    return [...filteredData].sort((a, b) => {
      const av = a[sortBy];
      const bv = b[sortBy];
      const aBlank = isBlank(av);
      const bBlank = isBlank(bv);
      if (aBlank && bBlank) return 0;
      if (aBlank) return 1; // blanks always sink to the bottom
      if (bBlank) return -1;
      const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true, sensitivity: "base" });
      return sortOrder === "asc" ? cmp : -cmp;
    });
  }, [filteredData, sortBy, sortOrder]);

  const totalRecords = sortedData.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / rowsPerPage));
  const page = Math.min(currentPage, totalPages);
  const start = (page - 1) * rowsPerPage;
  const pageRows = sortedData.slice(start, start + rowsPerPage);
  const indexOfFirstRow = totalRecords === 0 ? 0 : start + 1;
  const indexOfLastRow = Math.min(start + rowsPerPage, totalRecords);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setCurrentPage(1);
    setSelectedRows([]);
    setAdvFilters(ADV_DEFAULTS);
  };

  const handleSelectAll = () => {
    const pageIds = pageRows.map((r) => r.id);
    const allSelected = pageIds.every((id) => selectedRows.includes(id));
    setSelectedRows(
      allSelected
        ? selectedRows.filter((id) => !pageIds.includes(id))
        : [...new Set([...selectedRows, ...pageIds])],
    );
  };

  const handleSelectRow = (id) =>
    setSelectedRows((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id],
    );

  const openDeleted = async () => {
    setShowDeleted(true);
    setDeletedLoading(true);
    try {
      setDeletedRecords(await getDeletedDonations());
    } catch (err) {
      console.error("Failed to load deleted donations:", err);
      setDeletedRecords([]);
    } finally {
      setDeletedLoading(false);
    }
  };

  const handleRestore = async (id) => {
    setRestoringId(id);
    try {
      const restored = await restoreDonation(id);
      setDeletedRecords((prev) => prev.filter((d) => d.id !== id));
      setDonations((prev) => [restored, ...prev]);
    } catch (err) {
      console.error("Failed to restore donation:", err);
      alert("Failed to restore this record. Please try again.");
    } finally {
      setRestoringId(null);
    }
  };

  const [showExportColumns, setShowExportColumns] = useState(false);
  const handleExport = () => {
    if (sortedData.length === 0) return;
    setShowExportColumns(true);
  };
  const handleExportConfirm = (selectedKeys) => {
    const exportCols = columns.filter((c) => selectedKeys.includes(c.key));
    const headers = exportCols.map((c) => c.label);
    const rows = sortedData.map((d) => exportCols.map((c) => d[c.key] ?? ""));
    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    worksheet["!cols"] = exportCols.map(() => ({ wch: 24 }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Donations");
    XLSX.writeFile(workbook, "donation_database_export.xlsx");
    setShowExportColumns(false);
  };

  const handleCreate = async (form) => {
    setCreating(true);
    try {
      const created = await createDonation(form);
      setDonations((prev) => [created, ...prev]);
      setShowCreate(false);
    } catch (err) {
      console.error("Failed to create donation:", err);
      // The modal already blocks a Letter DTN it knows is a duplicate, but
      // this 409 is the server's own check — the safety net for the rare
      // case where someone else inserted the same DTN in between.
      alert(
        err.response?.data?.detail ||
          "Failed to create this record. Please try again.",
      );
    } finally {
      setCreating(false);
    }
  };

  // Letter DTNs already in the (loaded) table — lets the New Donation modal
  // warn before saving instead of only finding out from a failed request.
  const existingLetterDtns = useMemo(
    () => new Set(donations.map((d) => d.letterDtn).filter((v) => v && v !== "—")),
    [donations],
  );

  const columns = [
    { key: "letterDtn", label: "Letter DTN" },
    { key: "dateReceived", label: "Date Received By Center" },
    { key: "dateReceivedByEvaluator", label: "Date Received by Evaluator" },
    { key: "donor", label: "Donor", width: "260px", noWrap: true },
    { key: "donee", label: "Donee/Recipient", width: "300px", noWrap: true },
    { key: "registrationDtn", label: "Registration DTN" },
    { key: "productName", label: "Product Name", width: "260px" },
    { key: "packaging", label: "Packaging", width: "220px" },
    { key: "manufacturer", label: "Manufacturer", width: "200px" },
    { key: "batchLotNo", label: "Batch/Lot No." },
    { key: "expirationDate", label: "Expiration Date", width: "130px" },
    { key: "totalQuantity", label: "Total Quantity" },
    { key: "validity", label: "Validity (Expired on)" },
    { key: "dateIssued", label: "Date Issue", width: "150px", noWrap: true },
    { key: "evaluator", label: "Evaluator" },
    { key: "status", label: "Status" },
    { key: "donationRegNo", label: "Donation Registration No." },
    { key: "dateForwardedToChecker", label: "Date Forwarded to Checker" },
    { key: "dateReleased", label: "Date Released from CDRR" },
    { key: "remarks", label: "Remarks", width: "220px" },
    { key: "uploadDate", label: "Upload Date", width: "150px", noWrap: true },
    { key: "uploadBy", label: "Upload By", width: "150px", noWrap: true },
  ];

  const thStyle = {
    padding: "0.45rem 0.6rem",
    textAlign: "center",
    verticalAlign: "middle",
    fontSize: "0.55rem",
    fontWeight: "600",
    color: colors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    borderBottom: `1px solid ${colors.tableBorder}`,
    whiteSpace: "nowrap",
    background: colors.tableBg,
  };

  const tdStyle = {
    padding: "0.4rem 0.6rem",
    textAlign: "center",
    verticalAlign: "middle",
    fontSize: "0.55rem",
    color: colors.tableText,
    borderBottom: `1px solid ${colors.tableBorder}`,
    // "normal" collapses newlines to spaces — a cell with several
    // batch/date entries stacked with "\n" (one donation, several lots)
    // then reads as one run-on line. "pre-line" keeps each entry on its
    // own line while still wrapping long ones normally.
    whiteSpace: "pre-line",
    wordBreak: "break-word",
  };

  const renderCell = (col, row) => {
    switch (col.key) {
      case "letterDtn":
      case "registrationDtn":
        return row[col.key] === "—" ? "—" : <DTNBadge dtn={row[col.key]} />;
      case "status":
        return <StatusBadge status={row.status} />;
      default:
        return (
          <span style={{ fontSize: "0.78rem", color: colors.tableText }}>
            {row[col.key] ?? ""}
          </span>
        );
    }
  };

  return (
    <>
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      {/* ── Main content ── */}
      <div
        style={{
          flex: 1,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "0.5rem 0.5rem 0",
            background: colors.pageBg,
            borderBottom: `1px solid ${colors.cardBorder}`,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginTop: "0.25rem",
              borderBottom: `2px solid ${colors.cardBorder}`,
            }}
          >
            <div style={{ display: "flex", flex: 1 }}>
              {TABS.map((tab) => {
                const count =
                  tab.id === "all"
                    ? statsData.total
                    : tab.id === "approved"
                      ? statsData.approved
                      : statsData.pending;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    style={{
                      padding: "6px 14px",
                      fontSize: "12.5px",
                      background: "transparent",
                      border: "none",
                      borderBottom: isActive
                        ? "2px solid #4CAF50"
                        : "2px solid transparent",
                      color: isActive
                        ? colors.textPrimary
                        : colors.textTertiary,
                      fontWeight: isActive ? 600 : 400,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      position: "relative",
                      top: "1px",
                      whiteSpace: "nowrap",
                      transition: "all 0.2s ease",
                      flexShrink: 0,
                    }}
                  >
                    <span style={{ fontSize: "0.85rem" }}>{tab.icon}</span>
                    <span>{tab.label}</span>
                    <span
                      style={{
                        fontSize: "11px",
                        padding: "1px 6px",
                        borderRadius: "999px",
                        background: isActive ? "#4CAF50" : colors.badgeBg,
                        color: isActive ? "#fff" : colors.textTertiary,
                        border: `0.5px solid ${isActive ? "#4CAF50" : colors.cardBorder}`,
                        fontWeight: 600,
                        minWidth: "20px",
                        textAlign: "center",
                      }}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            <div
              style={{
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                gap: "6px",
                paddingLeft: "10px",
                paddingBottom: "4px",
                borderLeft: `1px solid ${colors.cardBorder}`,
              }}
            >
              <button
                onClick={handleExport}
                style={{
                  padding: "5px 14px",
                  background: "linear-gradient(135deg,#10B981,#059669)",
                  color: "#fff",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "12.5px",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                  height: "30px",
                }}
              >
                <span>📥</span>
                <span>Export ({totalRecords})</span>
              </button>
              <button
                onClick={downloadDonationTemplate}
                style={{
                  padding: "5px 14px",
                  background: darkMode ? "#1f1f1f" : "#e5e5e5",
                  color: colors.textPrimary,
                  border: `1px solid ${colors.cardBorder}`,
                  borderRadius: "6px",
                  fontSize: "12.5px",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                  height: "30px",
                }}
              >
                <span>⬇️</span>
                <span>Download Template</span>
              </button>
              <button
                onClick={() => setShowImportModal(true)}
                style={{
                  padding: "5px 14px",
                  background: "linear-gradient(135deg,#6366f1,#4f46e5)",
                  color: "#fff",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "12.5px",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                  height: "30px",
                }}
              >
                <span>⬆️</span>
                <span>Import</span>
              </button>
              <button
                onClick={() => setShowCreate(true)}
                style={{
                  padding: "5px 14px",
                  background: darkMode ? "#1f1f1f" : "#ffffff",
                  color: colors.textPrimary,
                  border: `1px solid ${colors.cardBorder}`,
                  borderRadius: "6px",
                  fontSize: "12.5px",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                  height: "30px",
                }}
              >
                <span>➕</span>
                <span>New Donation</span>
              </button>
            </div>
          </div>
        </div>

        {/* Content area */}
        <div
          style={{
            flex: 1,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
            padding: "0.5rem 0.5rem",
            background: colors.pageBg,
          }}
        >
          {/* Table card */}
          <div
            style={{
              background: colors.cardBg,
              border: `1px solid ${colors.cardBorder}`,
              borderRadius: "12px",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              flex: 1,
              minHeight: 0,
            }}
          >
            <div
              style={{
                flexShrink: 0,
                padding: "0.75rem 1.25rem",
                borderBottom: `1px solid ${colors.tableBorder}`,
                display: "flex",
                alignItems: "center",
                gap: "1rem",
                flexWrap: "wrap",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  flexShrink: 0,
                }}
              >
                <h3
                  style={{
                    fontSize: "0.82rem",
                    fontWeight: "600",
                    color: colors.textPrimary,
                    margin: 0,
                  }}
                >
                  Data
                </h3>
                <span
                  style={{
                    padding: "0.2rem 0.6rem",
                    background: colors.badgeBg,
                    borderRadius: "12px",
                    fontSize: "0.72rem",
                    color: colors.textTertiary,
                    fontWeight: "600",
                    whiteSpace: "nowrap",
                  }}
                >
                  {totalRecords} total records
                </span>
              </div>

              <input
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search by DTN, donation reg. no., donor, or product"
                style={{
                  flex: "1 1 260px",
                  minWidth: 200,
                  padding: "0.35rem 0.6rem",
                  fontSize: "0.72rem",
                  background: colors.inputBg,
                  border: `1px solid ${colors.inputBorder}`,
                  borderRadius: "6px",
                  color: colors.textPrimary,
                  outline: "none",
                }}
              />

              <button
                onClick={openAdvanced}
                style={{
                  padding: "0.35rem 0.7rem",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  borderRadius: 8,
                  border: "none",
                  background: activeAdvCount > 0 ? "#43a047" : "#4CAF50",
                  color: "#fff",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  flexShrink: 0,
                  boxShadow: "0 2px 8px rgba(76,175,80,0.35)",
                }}
              >
                🔍 Filters
                {activeAdvCount > 0 && (
                  <span
                    style={{
                      background: "#fff",
                      color: "#43a047",
                      borderRadius: 99,
                      fontSize: "0.68rem",
                      fontWeight: 800,
                      padding: "1px 6px",
                      minWidth: 16,
                      textAlign: "center",
                    }}
                  >
                    {activeAdvCount}
                  </span>
                )}
              </button>

              {activeAdvCount > 0 && (
                <button
                  onClick={clearAllFilters}
                  title="Clear all filters"
                  style={{
                    padding: "0.35rem 0.7rem",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    borderRadius: 8,
                    border: `1px solid ${colors.cardBorder}`,
                    background: "transparent",
                    color: colors.textTertiary,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    flexShrink: 0,
                  }}
                >
                  <XIcon size={12} />
                  Clear Filters
                </button>
              )}

              {activeAdvEntries.length > 0 && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "0.35rem",
                  }}
                >
                  {activeAdvEntries.map((entry) => (
                    <span
                      key={entry.key}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                        padding: "0.2rem 0.3rem 0.2rem 0.55rem",
                        borderRadius: 99,
                        fontSize: "0.68rem",
                        fontWeight: 600,
                        background: colors.badgeBg,
                        color: colors.textSecondary,
                        whiteSpace: "nowrap",
                      }}
                    >
                      <strong style={{ fontWeight: 700, color: colors.textPrimary }}>
                        {entry.label}:
                      </strong>{" "}
                      {entry.value}
                      <span
                        onClick={() => clearOneFilter(entry.key)}
                        title={`Remove ${entry.label} filter`}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: 14,
                          height: 14,
                          borderRadius: "50%",
                          cursor: "pointer",
                          color: colors.textTertiary,
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "#ef4444";
                          e.currentTarget.style.color = "#fff";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "transparent";
                          e.currentTarget.style.color = colors.textTertiary;
                        }}
                      >
                        <XIcon size={9} />
                      </span>
                    </span>
                  ))}
                </div>
              )}

              {selectedRows.length > 0 && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    padding: "0.4rem 0.85rem",
                    background: colors.badgeBg,
                    borderRadius: "8px",
                  }}
                >
                  <span
                    style={{
                      color: "#4CAF50",
                      fontSize: "0.78rem",
                      fontWeight: 600,
                    }}
                  >
                    {selectedRows.length} selected
                  </span>
                </div>
              )}
            </div>

            <div style={{ flex: 1, minHeight: 0, overflowX: "auto", overflowY: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  minWidth: "2900px",
                }}
              >
                <thead>
                  <tr>
                    <th style={{ ...thStyle, width: "40px" }}>
                      <input
                        type="checkbox"
                        checked={
                          pageRows.length > 0 &&
                          pageRows.every((r) => selectedRows.includes(r.id))
                        }
                        onChange={handleSelectAll}
                        style={{
                          width: "16px",
                          height: "16px",
                          cursor: "pointer",
                          accentColor: "#4CAF50",
                        }}
                      />
                    </th>
                    <th
                      style={{ ...thStyle, width: "40px", textAlign: "center" }}
                    >
                      #
                    </th>
                    {columns.map((col) => {
                      const isSorted = sortBy === col.key;
                      return (
                        <th
                          key={col.key}
                          onClick={() => handleSort(col.key)}
                          title="Click to sort"
                          style={{
                            ...thStyle,
                            minWidth: col.width,
                            cursor: "pointer",
                            userSelect: "none",
                          }}
                        >
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                            {col.label}
                            <span
                              style={{
                                display: "inline-flex",
                                flexShrink: 0,
                                color: isSorted ? "#6366f1" : colors.textTertiary,
                                opacity: isSorted ? 1 : 0.45,
                                transition: "opacity 0.15s ease, color 0.15s ease",
                              }}
                            >
                              {isSorted ? (
                                <ChevronUp
                                  size={12}
                                  style={{
                                    transform: sortOrder === "asc" ? "rotate(0deg)" : "rotate(180deg)",
                                    transition: "transform 0.18s ease",
                                  }}
                                />
                              ) : (
                                <ArrowUpDown size={11} />
                              )}
                            </span>
                            {isSorted && !isDefaultSort && (
                              <span
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleResetSort();
                                }}
                                title="Reset sort"
                                style={{
                                  display: "inline-flex",
                                  flexShrink: 0,
                                  marginLeft: 1,
                                  color: colors.textTertiary,
                                  opacity: 0.6,
                                  transition: "opacity 0.15s ease, color 0.15s ease",
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.opacity = 1;
                                  e.currentTarget.style.color = "#ef4444";
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.opacity = 0.6;
                                  e.currentTarget.style.color = colors.textTertiary;
                                }}
                              >
                                <XIcon size={11} />
                              </span>
                            )}
                          </span>
                        </th>
                      );
                    })}
                    <th
                      style={{
                        ...thStyle,
                        width: "60px",
                        textAlign: "center",
                        position: "sticky",
                        right: 0,
                        zIndex: 2,
                      }}
                    >
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td
                        colSpan={columns.length + 3}
                        style={{
                          padding: "2rem",
                          textAlign: "center",
                          color: colors.textTertiary,
                          fontSize: "0.78rem",
                        }}
                      >
                        Loading donation records...
                      </td>
                    </tr>
                  ) : error ? (
                    <tr>
                      <td
                        colSpan={columns.length + 3}
                        style={{
                          padding: "2rem",
                          textAlign: "center",
                          color: "#ef4444",
                          fontSize: "0.78rem",
                        }}
                      >
                        {error}{" "}
                        <button
                          onClick={loadDonations}
                          style={{
                            marginLeft: 8,
                            padding: "4px 10px",
                            borderRadius: 6,
                            border: "1px solid #ef4444",
                            background: "transparent",
                            color: "#ef4444",
                            cursor: "pointer",
                            fontSize: "0.75rem",
                            fontWeight: 600,
                          }}
                        >
                          Retry
                        </button>
                      </td>
                    </tr>
                  ) : pageRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={columns.length + 3}
                        style={{
                          padding: "2rem",
                          textAlign: "center",
                          color: colors.textTertiary,
                          fontSize: "0.78rem",
                        }}
                      >
                        No donations match the current filters.
                      </td>
                    </tr>
                  ) : (
                    pageRows.map((row, index) => {
                      const isSelected = selectedRows.includes(row.id);
                      const rowBg = isSelected
                        ? "#4CAF5015"
                        : index % 2 === 0
                          ? colors.tableRowEven
                          : colors.tableRowOdd;
                      return (
                        <tr
                          key={row.id}
                          onDoubleClick={() => handleRowAction("info", row)}
                          style={{
                            background: rowBg,
                            borderLeft: isSelected
                              ? "3px solid #4CAF50"
                              : "3px solid transparent",
                            cursor: "pointer",
                          }}
                        >
                          <td
                            style={{
                              padding: "0.65rem 0.85rem",
                              borderBottom: `1px solid ${colors.tableBorder}`,
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleSelectRow(row.id)}
                              style={{
                                width: "16px",
                                height: "16px",
                                cursor: "pointer",
                                accentColor: "#4CAF50",
                              }}
                            />
                          </td>
                          <td
                            style={{
                              padding: "0.4rem 0.6rem",
                              fontSize: "0.65rem",
                              fontWeight: 700,
                              color: colors.textTertiary,
                              borderBottom: `1px solid ${colors.tableBorder}`,
                              textAlign: "center",
                            }}
                          >
                            {indexOfFirstRow + index}
                          </td>
                          {columns.map((col) => (
                            <td
                              key={col.key}
                              style={{
                                ...tdStyle,
                                minWidth: col.width,
                                whiteSpace: col.noWrap ? "nowrap" : tdStyle.whiteSpace,
                              }}
                            >
                              {renderCell(col, row)}
                            </td>
                          ))}
                          <td
                            style={{
                              padding: "0.65rem 0.85rem",
                              borderBottom: `1px solid ${colors.tableBorder}`,
                              textAlign: "center",
                              position: "sticky",
                              right: 0,
                              zIndex: 1,
                              background: rowBg,
                            }}
                          >
                            <ActionMenu
                              record={row}
                              onAction={handleRowAction}
                              colors={colors}
                              darkMode={darkMode}
                            />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination — copies the TablePagination pattern */}
            <div
              style={{
                flexShrink: 0,
                borderTop: `1px solid ${colors.tableBorder}`,
                background: colors.cardBg,
                padding: "0.6rem 1rem",
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                fontSize: "0.75rem",
                color: colors.textTertiary,
              }}
            >
              <label
                style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}
              >
                Rows per page
                <select
                  value={rowsPerPage}
                  onChange={(e) => {
                    setRowsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  style={{
                    padding: "0.2rem 0.4rem",
                    background: colors.inputBg,
                    border: `1px solid ${colors.inputBorder}`,
                    borderRadius: "5px",
                    color: colors.textPrimary,
                    fontSize: "0.75rem",
                  }}
                >
                  {[10, 25, 50, 100].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>

              <span style={{ marginLeft: "auto" }}>
                {indexOfFirstRow}–{indexOfLastRow} of {totalRecords}
              </span>

              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                style={{
                  padding: "0.2rem 0.5rem",
                  background: "transparent",
                  border: `1px solid ${colors.cardBorder}`,
                  borderRadius: "5px",
                  color: colors.textPrimary,
                  cursor: page === 1 ? "not-allowed" : "pointer",
                  opacity: page === 1 ? 0.4 : 1,
                }}
              >
                ‹
              </button>
              <span>
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={page === totalPages}
                style={{
                  padding: "0.2rem 0.5rem",
                  background: "transparent",
                  border: `1px solid ${colors.cardBorder}`,
                  borderRadius: "5px",
                  color: colors.textPrimary,
                  cursor: page === totalPages ? "not-allowed" : "pointer",
                  opacity: page === totalPages ? 0.4 : 1,
                }}
              >
                ›
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    {infoRecord && (
      <DonationInfoModal
        record={infoRecord}
        onClose={() => setInfoRecord(null)}
        onEdit={() => {
          setUpdateRecord(infoRecord);
          setInfoRecord(null);
        }}
        colors={colors}
        darkMode={darkMode}
      />
    )}
    {updateRecord && (
      <DonationUpdateModal
        record={updateRecord}
        onClose={() => setUpdateRecord(null)}
        onSave={handleSaveUpdate}
        saving={savingUpdate}
        colors={colors}
        darkMode={darkMode}
      />
    )}
    {logRecord && (
      <DonationChangeLogModal
        record={logRecord}
        entries={logEntries}
        loading={logLoading}
        onClose={() => setLogRecord(null)}
        colors={colors}
        darkMode={darkMode}
      />
    )}
    {deleteRecord && (
      <DonationDeleteConfirmModal
        record={deleteRecord}
        onClose={() => setDeleteRecord(null)}
        onConfirm={handleConfirmDelete}
        deleting={deleting}
        colors={colors}
      />
    )}
    {showCreate && (
      <DonationCreateModal
        onClose={() => setShowCreate(false)}
        onSave={handleCreate}
        saving={creating}
        existingLetterDtns={existingLetterDtns}
        colors={colors}
        darkMode={darkMode}
      />
    )}
    <AdvancedFilterModal
      open={showAdvanced}
      draft={advDraft}
      onChange={setAdvDraft}
      onApply={applyAdvanced}
      onCancel={cancelAdvanced}
      onReset={resetAdvanced}
      colors={colors}
      darkMode={darkMode}
    />
    {showImportModal && (
      <DonationUploadModal
        onClose={() => setShowImportModal(false)}
        onSuccess={loadDonations}
        colors={colors}
        darkMode={darkMode}
      />
    )}
    {showExportColumns && (
      <DonationExportColumnsModal
        columns={columns}
        onClose={() => setShowExportColumns(false)}
        onConfirm={handleExportConfirm}
        colors={colors}
        darkMode={darkMode}
      />
    )}
    {showDeleted && (
      <DeletedDonationsModal
        records={deletedRecords}
        loading={deletedLoading}
        restoringId={restoringId}
        onRestore={handleRestore}
        onClose={() => setShowDeleted(false)}
        colors={colors}
        darkMode={darkMode}
      />
    )}
    </>
  );
}

export default DonationPage;
