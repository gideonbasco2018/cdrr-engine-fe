// FILE: src/pages/ClinicalTrialPage.jsx
import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { getColorScheme } from "../components/reports/utils.js";
import {
  getClinicalTrials,
  downloadClinicalTrialTemplate,
  exportClinicalTrials,
  uploadClinicalTrials,
  triggerFileDownload,
} from "../api/clinicalTrials.js";
import {
  SidebarSection,
  PhaseBadge,
  ProtocolBadge,
  RowActionMenu,
  ViewDetailsModal,
  UpdateModal,
  AuditLogModal,
  TABS,
} from "../components/clinicalTrial";
import { mapTrialFromApi } from "../components/clinicalTrial/clinicalTrialMappers";

function ClinicalTrialPage({ darkMode }) {
  const colors = getColorScheme(darkMode);
  const fileInputRef = useRef(null);

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [phaseFilter, setPhaseFilter] = useState(null);
  const [drugTypeFilter, setDrugTypeFilter] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRows, setSelectedRows] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [trials, setTrials] = useState([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);

  const [facetTrials, setFacetTrials] = useState([]);
  const [facetTotal, setFacetTotal] = useState(0);

  const [isExporting, setIsExporting] = useState(false);
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);

  const [openMenuRow, setOpenMenuRow] = useState(null); // { id, anchorEl, row }
  const [viewingTrial, setViewingTrial] = useState(null);
  const [editingTrial, setEditingTrial] = useState(null);
  const [auditTrial, setAuditTrial] = useState(null);

  const handleViewAuditLog = (row) => {
    setAuditTrial(row);
    setOpenMenuRow(null);
  };
  const handleToggleRowMenu = (row, e) => {
    const anchorEl = e.currentTarget;
    setOpenMenuRow((prev) =>
      prev?.id === row.id ? null : { id: row.id, anchorEl, row },
    );
  };

  const handleViewDetails = (row) => {
    setViewingTrial(row);
    setOpenMenuRow(null);
  };

  const handleOpenEdit = (row) => {
    setEditingTrial(row);
    setViewingTrial(null);
    setOpenMenuRow(null);
  };

  const [debouncedSearch, setDebouncedSearch] = useState(searchTerm);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 350);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const fetchTrials = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const { data } = await getClinicalTrials({
        search: debouncedSearch || undefined,
        phase: phaseFilter || undefined,
        drug_type: drugTypeFilter || undefined,
        page: currentPage,
        rows_per_page: rowsPerPage,
      });
      setTrials((data.data || []).map(mapTrialFromApi));
      setTotalRecords(data.total || 0);
    } catch (err) {
      setLoadError(
        err?.response?.data?.detail || "Failed to load clinical trials",
      );
      setTrials([]);
      setTotalRecords(0);
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, phaseFilter, drugTypeFilter, currentPage, rowsPerPage]);

  useEffect(() => {
    fetchTrials();
  }, [fetchTrials]);

  const fetchFacets = useCallback(async () => {
    try {
      const { data } = await getClinicalTrials({
        page: 1,
        rows_per_page: 1000,
      });
      setFacetTrials((data.data || []).map(mapTrialFromApi));
      setFacetTotal(data.total || 0);
    } catch {
      setFacetTrials([]);
      setFacetTotal(0);
    }
  }, []);

  useEffect(() => {
    fetchFacets();
  }, [fetchFacets]);

  const handleDataChanged = () => Promise.all([fetchTrials(), fetchFacets()]);

  const iconBtn = (onClick, title, children, disabled) => (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled}
      style={{
        width: "26px",
        height: "26px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "transparent",
        border: `1px solid ${colors.cardBorder}`,
        borderRadius: "6px",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        color: colors.textTertiary,
        fontSize: "0.7rem",
        transition: "all 0.2s ease",
        flexShrink: 0,
      }}
      onMouseEnter={(e) => {
        if (disabled) return;
        e.currentTarget.style.background = darkMode ? "#1f1f1f" : "#e5e5e5";
        e.currentTarget.style.color = colors.textPrimary;
      }}
      onMouseLeave={(e) => {
        if (disabled) return;
        e.currentTarget.style.background = "transparent";
        e.currentTarget.style.color = colors.textTertiary;
      }}
    >
      {children}
    </button>
  );

  const phaseItems = useMemo(() => {
    const counts = {};
    facetTrials.forEach((t) => {
      if (!t.phase) return;
      counts[t.phase] = (counts[t.phase] || 0) + 1;
    });
    return Object.entries(counts).map(([value, count]) => ({ value, count }));
  }, [facetTrials]);

  const drugTypeItems = useMemo(() => {
    const counts = {};
    facetTrials.forEach((t) => {
      if (!t.drugType) return;
      counts[t.drugType] = (counts[t.drugType] || 0) + 1;
    });
    return Object.entries(counts).map(([value, count]) => ({ value, count }));
  }, [facetTrials]);

  const totalPages = Math.max(1, Math.ceil(totalRecords / rowsPerPage));
  const page = Math.min(currentPage, totalPages);
  const indexOfFirstRow = totalRecords === 0 ? 0 : (page - 1) * rowsPerPage + 1;
  const indexOfLastRow = Math.min(page * rowsPerPage, totalRecords);
  const pageRows = trials;

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setCurrentPage(1);
    setSelectedRows([]);
    setPhaseFilter(null);
    setDrugTypeFilter(null);
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

  const activeFilterCount =
    (phaseFilter !== null ? 1 : 0) + (drugTypeFilter !== null ? 1 : 0);

  const handleDownloadTemplate = async () => {
    setIsDownloadingTemplate(true);
    try {
      const res = await downloadClinicalTrialTemplate();
      triggerFileDownload(res, "clinical_trial_upload_template.xlsx");
    } catch (err) {
      alert(err?.response?.data?.detail || "Failed to download the template.");
    } finally {
      setIsDownloadingTemplate(false);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const res = await exportClinicalTrials({
        search: debouncedSearch || undefined,
        phase: phaseFilter || undefined,
        drug_type: drugTypeFilter || undefined,
      });
      triggerFileDownload(res, "clinical_trials_export.xlsx");
    } catch (err) {
      alert(err?.response?.data?.detail || "Failed to export clinical trials.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleUploadClick = () => fileInputRef.current?.click();

  const handleFileSelected = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!/\.(xlsx|xlsm)$/i.test(file.name)) {
      alert("Only .xlsx files are supported.");
      return;
    }

    setIsUploading(true);
    setUploadResult(null);
    try {
      const { data } = await uploadClinicalTrials(file);
      setUploadResult(data);
      await handleDataChanged();
    } catch (err) {
      alert(err?.response?.data?.detail || "Upload failed.");
    } finally {
      setIsUploading(false);
    }
  };

  const columns = [
    { key: "protocolNo", label: "Protocol Number" },
    { key: "studyTitle", label: "Study Title", width: "240px" },
    { key: "phase", label: "Phase" },
    { key: "sponsorName", label: "Sponsor Name" },
    { key: "sponsorAddress", label: "Sponsor Address", width: "200px" },
    { key: "sponsorContact", label: "Sponsor Contact Info" },
    { key: "croName", label: "CRO Name" },
    { key: "croAddress", label: "CRO Address", width: "200px" },
    { key: "croContact", label: "CRO Contact Info" },
    { key: "ctRefNo", label: "CT Reference Number" },
    {
      key: "ipName",
      label: "Name of IP/Comparator/Placebo/OM",
      width: "220px",
    },
    { key: "dosageStrength", label: "Dosage Strength" },
    { key: "pharmaForm", label: "Pharmaceutical Form" },
    { key: "drugType", label: "Type of Drug" },
    { key: "ilApprovalNo", label: "IL Approval Number" },
    { key: "ilApprovalDate", label: "IL Initial Approval Date" },
    { key: "totalQtyApprove", label: "Total Qty Approved" },
  ];

  const thStyle = {
    padding: "0.45rem 0.6rem",
    textAlign: "left",
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
    fontSize: "0.55rem",
    color: colors.tableText,
    borderBottom: `1px solid ${colors.tableBorder}`,
    whiteSpace: "normal",
    wordBreak: "break-word",
  };

  const ACTIONS_COL_WIDTH = 60;
  const stickyActionsThStyle = {
    ...thStyle,
    width: `${ACTIONS_COL_WIDTH}px`,
    textAlign: "center",
    position: "sticky",
    right: 0,
    zIndex: 3,
    boxShadow: `-1px 0 0 ${colors.tableBorder}`,
  };
  const stickyActionsTdStyle = (rowBg) => ({
    padding: "0.4rem",
    borderBottom: `1px solid ${colors.tableBorder}`,
    textAlign: "center",
    position: "sticky",
    right: 0,
    zIndex: 1,
    background: rowBg,
    boxShadow: `-1px 0 0 ${colors.tableBorder}`,
  });

  const renderCell = (col, row) => {
    switch (col.key) {
      case "protocolNo":
        return <ProtocolBadge value={row.protocolNo} />;
      case "phase":
        return <PhaseBadge phase={row.phase} />;
      case "totalQtyApprove":
        return (row.totalQtyApprove ?? 0).toLocaleString();
      default:
        return row[col.key] ?? "—";
    }
  };

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xlsm"
        style={{ display: "none" }}
        onChange={handleFileSelected}
      />

      <div
        style={{
          width: isSidebarOpen ? "190px" : "44px",
          minWidth: isSidebarOpen ? "190px" : "44px",
          background: darkMode ? "#0a0a0a" : "#ffffff",
          borderRight: `1px solid ${colors.cardBorder}`,
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
          overflow: "hidden",
          transition: "width 0.25s ease, min-width 0.25s ease",
        }}
      >
        {isSidebarOpen ? (
          <>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0.6rem 0.75rem 0.6rem 0.85rem",
                borderBottom: `1px solid ${colors.cardBorder}`,
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.45rem",
                }}
              >
                <span style={{ fontSize: "0.85rem" }}>🧪</span>
                <h2
                  style={{
                    fontSize: "0.78rem",
                    fontWeight: 700,
                    color: colors.textPrimary,
                    margin: 0,
                  }}
                >
                  Quick Filters
                </h2>
                {activeFilterCount > 0 && (
                  <span
                    style={{
                      fontSize: "0.58rem",
                      fontWeight: 700,
                      background: "#6366f1",
                      color: "#fff",
                      borderRadius: 99,
                      padding: "1px 6px",
                    }}
                  >
                    {activeFilterCount}
                  </span>
                )}
              </div>
              {iconBtn(() => setIsSidebarOpen(false), "Hide filters", "◀")}
            </div>

            <div
              style={{
                flex: 1,
                overflowY: "auto",
                overflowX: "hidden",
                padding: "0.6rem 0.6rem 1rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.25rem",
              }}
            >
              <SidebarSection
                title="Study Phase"
                groupColor="#0891b2"
                items={phaseItems}
                activeItem={phaseFilter}
                onItemClick={(v) => {
                  setPhaseFilter(v);
                  setCurrentPage(1);
                }}
                colors={colors}
                darkMode={darkMode}
                totalCount={facetTotal}
              />
              <SidebarSection
                title="Type of Drug"
                groupColor="#6366f1"
                items={drugTypeItems}
                activeItem={drugTypeFilter}
                onItemClick={(v) => {
                  setDrugTypeFilter(v);
                  setCurrentPage(1);
                }}
                colors={colors}
                darkMode={darkMode}
                totalCount={facetTotal}
              />
            </div>
          </>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "0.85rem",
              padding: "0.75rem 0",
            }}
          >
            {iconBtn(() => setIsSidebarOpen(true), "Show filters", "▶")}
            {activeFilterCount > 0 && (
              <div
                onClick={() => setIsSidebarOpen(true)}
                title={`${activeFilterCount} active filter${activeFilterCount > 1 ? "s" : ""}`}
                style={{
                  width: "18px",
                  height: "18px",
                  background: "#6366f1",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.6rem",
                  fontWeight: 700,
                  color: "#fff",
                  cursor: "pointer",
                }}
              >
                {activeFilterCount}
              </div>
            )}
          </div>
        )}
      </div>

      <div
        style={{
          flex: 1,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
        }}
      >
        <div
          style={{
            padding: "0.85rem 1.5rem 0",
            background: colors.pageBg,
            borderBottom: `1px solid ${colors.cardBorder}`,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginTop: "0.5rem",
              borderBottom: `2px solid ${colors.cardBorder}`,
            }}
          >
            <div style={{ display: "flex", flex: 1, overflowX: "auto" }}>
              {TABS.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    style={{
                      padding: "6px 14px",
                      fontSize: "12px",
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
                    <span style={{ fontSize: "0.82rem" }}>{tab.icon}</span>
                    <span>{tab.label}</span>
                    <span
                      style={{
                        fontSize: "10px",
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
                      {facetTotal}
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
                disabled={isExporting}
                style={{
                  padding: "5px 14px",
                  background: "linear-gradient(135deg,#10B981,#059669)",
                  color: "#fff",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: isExporting ? "not-allowed" : "pointer",
                  opacity: isExporting ? 0.7 : 1,
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                  height: "30px",
                }}
              >
                <span>📥</span>
                <span>
                  {isExporting ? "Exporting…" : `Export (${totalRecords})`}
                </span>
              </button>
              <button
                onClick={handleDownloadTemplate}
                disabled={isDownloadingTemplate}
                style={{
                  padding: "5px 14px",
                  background: darkMode ? "#1f1f1f" : "#e5e5e5",
                  color: colors.textPrimary,
                  border: `1px solid ${colors.cardBorder}`,
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: isDownloadingTemplate ? "not-allowed" : "pointer",
                  opacity: isDownloadingTemplate ? 0.7 : 1,
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                  height: "30px",
                }}
              >
                <span>⬇️</span>
                <span>
                  {isDownloadingTemplate ? "Preparing…" : "Download Template"}
                </span>
              </button>
              <button
                onClick={handleUploadClick}
                disabled={isUploading}
                style={{
                  padding: "5px 14px",
                  background: "linear-gradient(135deg,#6366f1,#4f46e5)",
                  color: "#fff",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: isUploading ? "not-allowed" : "pointer",
                  opacity: isUploading ? 0.7 : 1,
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                  height: "30px",
                }}
              >
                <span>⬆️</span>
                <span>{isUploading ? "Uploading…" : "Upload New Trial"}</span>
              </button>
            </div>
          </div>
        </div>

        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "0.85rem 1.5rem",
            background: colors.pageBg,
          }}
        >
          {uploadResult && (
            <div
              style={{
                background: colors.cardBg,
                border: `1px solid ${colors.cardBorder}`,
                borderRadius: "10px",
                padding: "0.6rem 0.85rem",
                marginBottom: "0.5rem",
                fontSize: "0.7rem",
                color: colors.textPrimary,
                display: "flex",
                flexDirection: "column",
                gap: "0.25rem",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <strong>
                  Upload complete — {uploadResult.inserted} inserted,{" "}
                  {uploadResult.skipped} skipped (of {uploadResult.total_rows}{" "}
                  rows).
                </strong>
                <span
                  onClick={() => setUploadResult(null)}
                  style={{ cursor: "pointer", color: colors.textTertiary }}
                >
                  ✕
                </span>
              </div>
              {uploadResult.errors?.length > 0 && (
                <ul
                  style={{ margin: 0, paddingLeft: "1.1rem", color: "#ef4444" }}
                >
                  {uploadResult.errors.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {loadError && (
            <div
              style={{
                background: "#ef444415",
                border: "1px solid #ef444450",
                borderRadius: "10px",
                padding: "0.6rem 0.85rem",
                marginBottom: "0.5rem",
                fontSize: "0.7rem",
                color: "#ef4444",
              }}
            >
              {loadError}
            </div>
          )}

          <div
            style={{
              background: colors.cardBg,
              border: `1px solid ${colors.cardBorder}`,
              borderRadius: "12px",
              padding: "0.4rem 0.6rem",
              marginBottom: "0.5rem",
              display: "flex",
              gap: "0.5rem",
            }}
          >
            <input
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by protocol number, study title, sponsor, CRO, CT reference, or IP name"
              style={{
                flex: 1,
                padding: "0.25rem 0.5rem",
                fontSize: "0.65rem",
                background: colors.inputBg,
                border: `1px solid ${colors.inputBorder}`,
                borderRadius: "6px",
                color: colors.textPrimary,
                outline: "none",
              }}
            />
          </div>

          <div
            style={{
              background: colors.cardBg,
              border: `1px solid ${colors.cardBorder}`,
              borderRadius: "12px",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                padding: "0.75rem 1.25rem",
                borderBottom: `1px solid ${colors.tableBorder}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                }}
              >
                <h3
                  style={{
                    fontSize: "0.8rem",
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
                    fontSize: "0.68rem",
                    color: colors.textTertiary,
                    fontWeight: "600",
                  }}
                >
                  {totalRecords} total records
                </span>
              </div>

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
                      fontSize: "0.75rem",
                      fontWeight: 600,
                    }}
                  >
                    {selectedRows.length} selected
                  </span>
                </div>
              )}
            </div>

            <div style={{ overflowX: "auto", overflowY: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  minWidth: "1700px",
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
                    {columns.map((col) => (
                      <th
                        key={col.key}
                        style={{ ...thStyle, minWidth: col.width }}
                      >
                        {col.label}
                      </th>
                    ))}
                    <th style={stickyActionsThStyle}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td
                        colSpan={columns.length + 3}
                        style={{
                          padding: "2rem",
                          textAlign: "center",
                          color: colors.textTertiary,
                          fontSize: "0.75rem",
                        }}
                      >
                        Loading clinical trials…
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
                          fontSize: "0.75rem",
                        }}
                      >
                        No trials match the current filters.
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
                          style={{
                            background: rowBg,
                            borderLeft: isSelected
                              ? "3px solid #4CAF50"
                              : "3px solid transparent",
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
                              style={{ ...tdStyle, minWidth: col.width }}
                            >
                              {renderCell(col, row)}
                            </td>
                          ))}
                          <td style={stickyActionsTdStyle(rowBg)}>
                            <button
                              onClick={(e) => handleToggleRowMenu(row, e)}
                              style={{
                                padding: "0.4rem",
                                background:
                                  openMenuRow?.id === row.id
                                    ? darkMode
                                      ? "#1f1f1f"
                                      : "#e5e5e5"
                                    : "transparent",
                                border: `1px solid ${colors.cardBorder}`,
                                borderRadius: "6px",
                                color: colors.textPrimary,
                                cursor: "pointer",
                                width: "28px",
                                height: "28px",
                              }}
                            >
                              ⋮
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div
              style={{
                flexShrink: 0,
                borderTop: `1px solid ${colors.tableBorder}`,
                background: colors.cardBg,
                padding: "0.6rem 1rem",
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                fontSize: "0.7rem",
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
                    fontSize: "0.7rem",
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

      {openMenuRow && (
        <RowActionMenu
          anchorEl={openMenuRow.anchorEl}
          onClose={() => setOpenMenuRow(null)}
          onViewDetails={() => handleViewDetails(openMenuRow.row)}
          onUpdate={() => handleOpenEdit(openMenuRow.row)}
          onViewAuditLog={() => handleViewAuditLog(openMenuRow.row)}
          colors={colors}
          darkMode={darkMode}
        />
      )}

      {viewingTrial && (
        <ViewDetailsModal
          trial={viewingTrial}
          onClose={() => setViewingTrial(null)}
          onUpdate={handleOpenEdit}
          colors={colors}
          darkMode={darkMode}
        />
      )}

      {auditTrial && (
        <AuditLogModal
          trial={auditTrial}
          onClose={() => setAuditTrial(null)}
          colors={colors}
          darkMode={darkMode}
        />
      )}

      {editingTrial && (
        <UpdateModal
          trial={editingTrial}
          onClose={() => setEditingTrial(null)}
          onSaved={async () => {
            setEditingTrial(null);
            await handleDataChanged();
          }}
          colors={colors}
          darkMode={darkMode}
        />
      )}
    </div>
  );
}

export default ClinicalTrialPage;
