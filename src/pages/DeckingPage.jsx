// FILE: src/pages/DeckingPage.jsx
import { useState, useEffect } from "react";
import {
  getUploadReports,
  uploadExcelFile,
  downloadTemplate,
  getAppTypes,
  getPrescriptionTypes,
  getAppStatusTypes,
  getProcessingTypes,
  exportFilteredRecords,
  updateUploadReport,
} from "../api/reports";

import FilterBar from "../components/reports/FilterBar";
import UploadButton from "../components/reports/UploadButton";
import UploadProgress from "../components/reports/UploadProgress";
import DataTable from "../components/reports/DataTable";
import EditRecordModal from "../components/reports/actions/EditRecordModal";
import { mapDataItem, getColorScheme } from "../components/reports/utils.js";
import UploadErrorModal from "../components/reports/UploadErrorModal";

import BulkReassignmentModal from "../components/reports/actions/BulkReassignmentModal";

function buildFilterParams(filters) {
  const p = {};
  if (filters.category) p.category = filters.category;
  if (filters.dosageForm) p.dosage_form = filters.dosageForm;
  if (filters.manufacturer) p.manufacturer = filters.manufacturer;
  if (filters.ltoCompany) p.lto_company = filters.ltoCompany;
  if (filters.brandName) p.brand_name = filters.brandName;
  if (filters.genericName) p.generic_name = filters.genericName;
  if (filters.dtn) p.dtn = parseInt(filters.dtn, 10);
  if (filters.entryType) p.entry_type = filters.entryType;
  if (filters.typeDocReleased) p.type_doc_released = filters.typeDocReleased;
  if (filters.dateReleasedFrom) p.date_released_from = filters.dateReleasedFrom;
  if (filters.dateReleasedTo) p.date_released_to = filters.dateReleasedTo;
  if (filters.dateReceivedCentFrom)
    p.date_received_cent_from = filters.dateReceivedCentFrom;
  if (filters.dateReceivedCentTo)
    p.date_received_cent_to = filters.dateReceivedCentTo;
  if (filters.userUploader) p.user_uploader = filters.userUploader;
  if (filters.dateExcelUploadFrom)
    p.date_excel_upload_from = filters.dateExcelUploadFrom;
  if (filters.dateExcelUploadTo)
    p.date_excel_upload_to = filters.dateExcelUploadTo;
  if (filters.manufacturerCountry)
    p.manufacturer_country = filters.manufacturerCountry;
  if (filters.trader) p.trader = filters.trader;
  if (filters.traderCountry) p.trader_country = filters.traderCountry;
  if (filters.importer) p.importer = filters.importer;
  if (filters.importerCountry) p.importer_country = filters.importerCountry;
  if (filters.distributor) p.distributor = filters.distributor;
  if (filters.distributorCountry)
    p.distributor_country = filters.distributorCountry;
  if (filters.repacker) p.repacker = filters.repacker;
  if (filters.repackerCountry) p.repacker_country = filters.repackerCountry;
  if (filters.nullDateReleased === "true") p.null_date_released = true;
  if (filters.nullDateReceivedCent === "true") p.null_date_received_cent = true;
  if (filters.dtns) p.dtns = filters.dtns;
  return p;
}

/* ── SidebarSection ── */
const ITEM_DOT_COLORS = [
  "#7c3aed",
  "#0891b2",
  "#059669",
  "#b45309",
  "#f97316",
  "#be185d",
  "#6366f1",
  "#e11d48",
  "#0ea5e9",
  "#84cc16",
  "#a855f7",
  "#14b8a6",
];

function LoadingSpinner({ darkMode, colors, progress }) {
  useEffect(() => {
    const style = document.createElement("style");
    style.id = "progress-bar-anim";
    style.textContent = `
      @keyframes bar-transition { from { width: 0% } }
    `;
    if (!document.getElementById("progress-bar-anim"))
      document.head.appendChild(style);
  }, []);

  const label =
    progress < 50
      ? "Fetching reports…"
      : progress < 100
        ? "Almost done…"
        : "Done!";

  return (
    <div
      style={{
        background: colors.cardBg,
        border: `1px solid ${colors.cardBorder}`,
        borderRadius: "12px",
        padding: "3rem",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "0.75rem",
      }}
    >
      <p
        style={{
          fontSize: "0.72rem",
          fontWeight: 600,
          color: colors.textTertiary,
          margin: 0,
          letterSpacing: "0.04em",
        }}
      >
        {label}
      </p>
      <div
        style={{
          width: 160,
          height: 2,
          background: darkMode
            ? "rgba(16,185,129,0.15)"
            : "rgba(16,185,129,0.12)",
          borderRadius: 2,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${progress}%`,
            background: "#10B981",
            borderRadius: 2,
            transition: "width 0.5s cubic-bezier(0.4,0,0.2,1)",
          }}
        />
      </div>
      <p
        style={{
          fontSize: "0.65rem",
          color: colors.textTertiary,
          margin: 0,
          opacity: 0.6,
        }}
      >
        {progress}%
      </p>
    </div>
  );
}

function SidebarSection({
  title,
  groupColor,
  items,
  activeItem,
  onItemClick,
  colors,
  darkMode,
  totalCount,
}) {
  const [isOpen, setIsOpen] = useState(true);
  const activeBg = darkMode ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.055)";
  const activeBorder = darkMode ? "rgba(255,255,255,0.13)" : "rgba(0,0,0,0.1)";
  const hoverBg = darkMode ? "#161616" : "#f0f0f0";

  return (
    <div style={{ marginBottom: 2 }}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "4px 4px 3px",
          cursor: "pointer",
          userSelect: "none",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: groupColor,
              flexShrink: 0,
              display: "inline-block",
            }}
          />
          <span
            style={{
              fontSize: "0.6rem",
              fontWeight: 700,
              color: colors.textTertiary,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            {title}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span
            style={{
              fontSize: "0.58rem",
              color: colors.textTertiary,
              background: darkMode ? "#1a1a1a" : "#e8e8e8",
              borderRadius: 4,
              padding: "1px 5px",
              fontWeight: 600,
            }}
          >
            {items.length}
          </span>
          <svg
            width="8"
            height="8"
            viewBox="0 0 10 10"
            style={{
              transform: isOpen ? "rotate(0deg)" : "rotate(-90deg)",
              transition: "transform 0.2s",
              flexShrink: 0,
            }}
          >
            <polyline
              points="1,3 5,7 9,3"
              fill="none"
              stroke={colors.textTertiary}
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>

      {isOpen && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 0,
            marginBottom: 2,
          }}
        >
          {/* All option */}
          <div
            onClick={() => onItemClick(null)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "3px 6px",
              borderRadius: 5,
              cursor: "pointer",
              background: activeItem === null ? activeBg : "transparent",
              border: `0.5px solid ${activeItem === null ? activeBorder : "transparent"}`,
            }}
            onMouseEnter={(e) => {
              if (activeItem !== null)
                e.currentTarget.style.background = hoverBg;
            }}
            onMouseLeave={(e) => {
              if (activeItem !== null)
                e.currentTarget.style.background = "transparent";
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: groupColor,
                  opacity: 0.5,
                  flexShrink: 0,
                  display: "inline-block",
                }}
              />
              <span
                style={{
                  fontSize: "0.68rem",
                  fontWeight: activeItem === null ? 600 : 400,
                  color:
                    activeItem === null
                      ? colors.textPrimary
                      : colors.textSecondary,
                }}
              >
                All
              </span>
            </div>
            <span
              style={{
                fontSize: "0.6rem",
                fontWeight: 600,
                color:
                  activeItem === null
                    ? colors.textPrimary
                    : colors.textTertiary,
                background: darkMode ? "#1a1a1a" : "#e8e8e8",
                borderRadius: 99,
                padding: "1px 6px",
                minWidth: 18,
                textAlign: "center",
              }}
            >
              {totalCount}
            </span>
          </div>

          {/* Individual items */}
          {items.map((item, idx) => {
            const displayValue = item.value || `No ${title}`;
            const filterValue = item.value === null ? "" : item.value;
            const isActive = activeItem === filterValue;
            const dot = ITEM_DOT_COLORS[idx % ITEM_DOT_COLORS.length];
            return (
              <div
                key={filterValue || `no-${title}`}
                onClick={() => onItemClick(filterValue)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "3px 6px",
                  borderRadius: 5,
                  cursor: "pointer",
                  background: isActive ? activeBg : "transparent",
                  border: `0.5px solid ${isActive ? activeBorder : "transparent"}`,
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.background = hoverBg;
                }}
                onMouseLeave={(e) => {
                  if (!isActive)
                    e.currentTarget.style.background = "transparent";
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    minWidth: 0,
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: dot,
                      flexShrink: 0,
                      display: "inline-block",
                    }}
                  />
                  <span
                    style={{
                      fontSize: "0.68rem",
                      fontWeight: isActive ? 600 : 400,
                      color: isActive
                        ? colors.textPrimary
                        : colors.textSecondary,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {displayValue}
                  </span>
                </div>
                <span
                  style={{
                    fontSize: "0.6rem",
                    fontWeight: 600,
                    color: isActive ? colors.textPrimary : colors.textTertiary,
                    background: darkMode ? "#1a1a1a" : "#e8e8e8",
                    borderRadius: 99,
                    padding: "1px 6px",
                    minWidth: 18,
                    textAlign: "center",
                    flexShrink: 0,
                  }}
                >
                  {item.count}
                </span>
              </div>
            );
          })}
        </div>
      )}

      <div
        style={{
          height: "0.5px",
          background: colors.cardBorder,
          margin: "4px 2px 3px",
        }}
      />
    </div>
  );
}

/* ── ActiveFiltersBar ── */
function ActiveFiltersBar({
  subTab,
  prescriptionTab,
  appStatusTab,
  processingTypeTab,
  onRemove,
  onClearAll,
  colors,
}) {
  const chips = [];
  if (subTab !== null)
    chips.push({
      key: "subTab",
      label: `App Type: ${subTab === "" ? "None" : subTab}`,
    });
  if (prescriptionTab !== null)
    chips.push({
      key: "prescriptionTab",
      label: `Classification: ${prescriptionTab === "" ? "None" : prescriptionTab}`,
    });
  if (appStatusTab !== null)
    chips.push({
      key: "appStatusTab",
      label: `Status: ${appStatusTab === "" ? "None" : appStatusTab}`,
    });
  if (processingTypeTab !== null)
    chips.push({
      key: "processingTypeTab",
      label: `Processing Type: ${processingTypeTab === "" ? "None" : processingTypeTab}`,
    });
  if (chips.length === 0) return null;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        flexWrap: "wrap",
        marginBottom: "0.75rem",
      }}
    >
      <span
        style={{
          fontSize: "0.72rem",
          color: colors.textTertiary,
          fontWeight: 500,
          whiteSpace: "nowrap",
        }}
      >
        Active filters:
      </span>
      {chips.map((chip) => (
        <span
          key={chip.key}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.4rem",
            padding: "0.2rem 0.65rem",
            background: "rgba(33,150,243,0.12)",
            border: "1px solid rgba(33,150,243,0.35)",
            borderRadius: "20px",
            fontSize: "0.72rem",
            color: "#2196F3",
            fontWeight: 500,
            whiteSpace: "nowrap",
          }}
        >
          {chip.label}
          <button
            onClick={() => onRemove(chip.key)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#2196F3",
              fontSize: "0.68rem",
              padding: 0,
              lineHeight: 1,
              display: "flex",
              alignItems: "center",
              opacity: 0.7,
              transition: "opacity 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = 1)}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = 0.7)}
          >
            ✕
          </button>
        </span>
      ))}
      <button
        onClick={onClearAll}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "#ef4444",
          fontSize: "0.72rem",
          fontWeight: 600,
          padding: "0 0.25rem",
        }}
      >
        Clear all
      </button>
    </div>
  );
}

/* ── DeckingPage ── */
function DeckingPage({ darkMode }) {
  const [filteredData, setFilteredData] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({});
  const [selectedRows, setSelectedRows] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(100);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [uploadReportsData, setUploadReportsData] = useState([]);
  const [statsData, setStatsData] = useState({
    total: 0,
    notDecked: 0,
    decked: 0,
  });
  const [loading, setLoading] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [activeTab, setActiveTab] = useState("all");
  const [subTab, setSubTab] = useState(null);
  const [prescriptionTab, setPrescriptionTab] = useState(null);
  const [appStatusTab, setAppStatusTab] = useState(null);
  const [processingTypeTab, setProcessingTypeTab] = useState(null);
  const [availableAppTypes, setAvailableAppTypes] = useState([]);
  const [availablePrescriptionTypes, setAvailablePrescriptionTypes] = useState(
    [],
  );
  const [availableAppStatusTypes, setAvailableAppStatusTypes] = useState([]);
  const [availableProcessingTypes, setAvailableProcessingTypes] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [sortBy, setSortBy] = useState("DB_DATE_EXCEL_UPLOAD");
  const [sortOrder, setSortOrder] = useState("desc");
  const [failedRecords, setFailedRecords] = useState([]);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showBulkReassign, setShowBulkReassign] = useState(false);
  const [exportProgress, setExportProgress] = useState(null);
  // null = hidden, or { step: 0-3, pct: 0-100 }
  const colors = getColorScheme(darkMode);

  const activeFilterCount =
    (subTab !== null ? 1 : 0) +
    (prescriptionTab !== null ? 1 : 0) +
    (appStatusTab !== null ? 1 : 0) +
    (processingTypeTab !== null ? 1 : 0);

  const iconBtn = (onClick, title, children) => (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: "26px",
        height: "26px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "transparent",
        border: `1px solid ${colors.cardBorder}`,
        borderRadius: "6px",
        cursor: "pointer",
        color: colors.textTertiary,
        fontSize: "0.7rem",
        transition: "all 0.2s ease",
        flexShrink: 0,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = darkMode ? "#1f1f1f" : "#e5e5e5";
        e.currentTarget.style.color = colors.textPrimary;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
        e.currentTarget.style.color = colors.textTertiary;
      }}
    >
      {children}
    </button>
  );

  useEffect(() => {
    let username = null;
    const userStr =
      localStorage.getItem("user") || sessionStorage.getItem("user");
    if (userStr) {
      try {
        const o = JSON.parse(userStr);
        username = o.username || o.email || o.first_name;
      } catch {
        username = userStr;
      }
    }
    if (!username)
      username =
        localStorage.getItem("username") || sessionStorage.getItem("username");
    setCurrentUser(username || "Unknown User");
  }, []);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [allData, notDeckedData, deckedData] = await Promise.all([
          getUploadReports({
            page: 1,
            pageSize: 1,
            search: "",
            status: "",
            sortBy: "DB_DATE_EXCEL_UPLOAD",
            sortOrder: "desc",
          }),
          getUploadReports({
            page: 1,
            pageSize: 1,
            search: "",
            status: "not_decked",
            sortBy: "DB_DATE_EXCEL_UPLOAD",
            sortOrder: "desc",
          }),
          getUploadReports({
            page: 1,
            pageSize: 1,
            search: "",
            status: "decked",
            sortBy: "DB_DATE_EXCEL_UPLOAD",
            sortOrder: "desc",
          }),
        ]);
        setStatsData({
          total: allData.total || 0,
          notDecked: notDeckedData.total || 0,
          decked: deckedData.total || 0,
        });
      } catch (err) {
        console.error("Failed to fetch stats:", err);
      }
    };
    fetchStats();
  }, []);

  const getStatusFilter = () => {
    if (activeTab === "not-decked") return "not_decked";
    if (activeTab === "decked") return "decked";
    return "";
  };

  useEffect(() => {
    const fetch = async () => {
      try {
        const status = getStatusFilter() || null;
        setAvailableProcessingTypes(
          await getProcessingTypes(
            status,
            subTab,
            prescriptionTab,
            appStatusTab,
          ),
        );
      } catch {
        setAvailableProcessingTypes([]);
      }
    };
    fetch();
  }, [activeTab, subTab, prescriptionTab, appStatusTab]);

  useEffect(() => {
    const fetch = async () => {
      try {
        const status = getStatusFilter() || null;
        setAvailableAppTypes(
          await getAppTypes(
            status,
            processingTypeTab,
            prescriptionTab,
            appStatusTab,
          ),
        );
      } catch {
        setAvailableAppTypes([]);
      }
    };
    fetch();
  }, [activeTab, processingTypeTab, prescriptionTab, appStatusTab]);

  useEffect(() => {
    const fetch = async () => {
      try {
        const status = getStatusFilter() || null;
        setAvailablePrescriptionTypes(
          await getPrescriptionTypes(
            status,
            subTab,
            processingTypeTab,
            appStatusTab,
          ),
        );
      } catch {
        setAvailablePrescriptionTypes([]);
      }
    };
    fetch();
  }, [activeTab, subTab, processingTypeTab, appStatusTab]);

  useEffect(() => {
    const fetch = async () => {
      try {
        const status = getStatusFilter() || null;
        setAvailableAppStatusTypes(
          await getAppStatusTypes(
            status,
            subTab,
            prescriptionTab,
            processingTypeTab,
          ),
        );
      } catch {
        setAvailableAppStatusTypes([]);
      }
    };
    fetch();
  }, [activeTab, subTab, prescriptionTab, processingTypeTab]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setLoadProgress(0);
        setTimeout(() => setLoadProgress(50), 100);
        const params = {
          page: currentPage,
          pageSize: rowsPerPage,
          search: searchTerm,
          status: getStatusFilter(),
          sortBy,
          sortOrder,
          ...buildFilterParams(filters),
        };
        if (subTab !== null)
          params.app_type = subTab === "" ? "__EMPTY__" : subTab;
        if (prescriptionTab !== null)
          params.prescription =
            prescriptionTab === "" ? "__EMPTY__" : prescriptionTab;
        if (appStatusTab !== null)
          params.app_status = appStatusTab === "" ? "__EMPTY__" : appStatusTab;
        if (processingTypeTab !== null)
          params.processing_type =
            processingTypeTab === "" ? "__EMPTY__" : processingTypeTab;
        console.log("🚀 FINAL PARAMS SENT TO API:", params);
        const json = await getUploadReports(params);
        if (!json?.data || !Array.isArray(json.data)) {
          setUploadReportsData([]);
          setFilteredData([]);
          setTotalRecords(0);
          setTotalPages(0);
          return;
        }
        const mappedData = json.data.map(mapDataItem);
        setUploadReportsData(mappedData);
        setFilteredData(mappedData);
        setTotalRecords(json.total);

        setTotalPages(json.total_pages);
        setLoadProgress(100);
        await new Promise((r) => setTimeout(r, 400));
      } catch (err) {
        console.error("Failed to fetch reports:", err);
        setUploadReportsData([]);
        setFilteredData([]);
        setTotalRecords(0);
        setTotalPages(0);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [
    currentPage,
    rowsPerPage,
    searchTerm,
    activeTab,
    subTab,
    prescriptionTab,
    appStatusTab,
    processingTypeTab,
    filters,
    sortBy,
    sortOrder,
  ]);

  const refreshData = async () => {
    try {
      setLoading(true);
      const [allData, notDeckedData, deckedData] = await Promise.all([
        getUploadReports({
          page: 1,
          pageSize: 1,
          search: "",
          status: "",
          sortBy: "DB_DATE_EXCEL_UPLOAD",
          sortOrder: "desc",
        }),
        getUploadReports({
          page: 1,
          pageSize: 1,
          search: "",
          status: "not_decked",
          sortBy: "DB_DATE_EXCEL_UPLOAD",
          sortOrder: "desc",
        }),
        getUploadReports({
          page: 1,
          pageSize: 1,
          search: "",
          status: "decked",
          sortBy: "DB_DATE_EXCEL_UPLOAD",
          sortOrder: "desc",
        }),
      ]);
      setStatsData({
        total: allData.total || 0,
        notDecked: notDeckedData.total || 0,
        decked: deckedData.total || 0,
      });
      const status = getStatusFilter() || null;
      const [processingTypes, appTypes, prescriptionTypes, appStatusTypes] =
        await Promise.all([
          getProcessingTypes(status, subTab, prescriptionTab, appStatusTab),
          getAppTypes(status, processingTypeTab, prescriptionTab, appStatusTab),
          getPrescriptionTypes(status, subTab, processingTypeTab, appStatusTab),
          getAppStatusTypes(status, subTab, prescriptionTab, processingTypeTab),
        ]);
      setAvailableProcessingTypes(processingTypes);
      setAvailableAppTypes(appTypes);
      setAvailablePrescriptionTypes(prescriptionTypes);
      setAvailableAppStatusTypes(appStatusTypes);
      const params = {
        page: currentPage,
        pageSize: rowsPerPage,
        search: searchTerm,
        status: getStatusFilter(),
        sortBy,
        sortOrder,
        ...buildFilterParams(filters),
      };
      if (subTab !== null)
        params.app_type = subTab === "" ? "__EMPTY__" : subTab;
      if (prescriptionTab !== null)
        params.prescription =
          prescriptionTab === "" ? "__EMPTY__" : prescriptionTab;
      if (appStatusTab !== null)
        params.app_status = appStatusTab === "" ? "__EMPTY__" : appStatusTab;
      if (processingTypeTab !== null)
        params.processing_type =
          processingTypeTab === "" ? "__EMPTY__" : processingTypeTab;
      const json = await getUploadReports(params);
      if (json?.data) {
        const mappedData = json.data.map(mapDataItem);
        setUploadReportsData(mappedData);
        setFilteredData(mappedData);
        setTotalRecords(json.total);
        setTotalPages(json.total_pages);
      }
    } catch (err) {
      console.error("Failed to refresh reports", err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      alert("Please upload a valid Excel file (.xlsx or .xls)");
      return;
    }
    let username = currentUser || "system";
    if (username === "system") {
      const proceed = confirm(
        '⚠️ No user detected. Upload will be attributed to "system". Continue?',
      );
      if (!proceed) {
        event.target.value = "";
        return;
      }
    }
    try {
      setUploading(true);
      setUploadProgress({
        message: `Uploading as: ${username}...`,
        percent: 0,
      });
      let currentPercent = 0;
      const result = await uploadExcelFile(file, username, (percent) => {
        currentPercent = Math.min(Math.round(percent * 0.9), 90);
        setUploadProgress({
          message: `Uploading as: ${username}...`,
          percent: currentPercent,
        });
      });
      const processingInterval = setInterval(() => {
        currentPercent = currentPercent < 99 ? currentPercent + 1 : 99;
        setUploadProgress({
          message: `Processing rows, please wait...`,
          percent: currentPercent,
        });
      }, 300);
      clearInterval(processingInterval);
      setUploadProgress({ message: `Finalizing...`, percent: 100 });
      await new Promise((resolve) => setTimeout(resolve, 500));
      setUploadProgress(null);
      setUploading(false);
      const { success, errors, duplicates_skipped, total_processed } =
        result.stats;
      const failed = result.failed_records || [];
      if (failed.length > 0) {
        setFailedRecords(failed);
        setShowErrorModal(true);
      }
      let alertMessage = `✅ Upload Complete!\n\n👤 Uploaded by: ${username}\n📊 Processed: ${total_processed} rows\n✓ Inserted: ${success} new records\n`;
      if (duplicates_skipped > 0)
        alertMessage += `⊘ Skipped: ${duplicates_skipped} duplicates\n`;
      if (errors > 0)
        alertMessage += `✗ Errors: ${errors} failed — see error log\n`;
      alert(alertMessage);
      setCurrentPage(1);
      await refreshData();
    } catch (error) {
      console.error("Upload error:", error);
      setUploadProgress(null);
      setUploading(false);
      alert(
        `❌ Upload failed: ${error.response?.data?.detail || error.message}`,
      );
    }
    event.target.value = "";
  };

  const handleDownloadTemplate = async () => {
    try {
      await downloadTemplate();
    } catch (error) {
      console.error("Download template error:", error);
      alert("Failed to download template");
    }
  };

  const handleSelectAll = () => {
    const currentPageIds = filteredData.map((row) => row.id);
    const allCurrentPageSelected = currentPageIds.every((id) =>
      selectedRows.includes(id),
    );
    if (allCurrentPageSelected) {
      setSelectedRows(
        selectedRows.filter((id) => !currentPageIds.includes(id)),
      );
    } else {
      setSelectedRows([...new Set([...selectedRows, ...currentPageIds])]);
    }
  };

  const handleSelectRow = (id) =>
    selectedRows.includes(id)
      ? setSelectedRows(selectedRows.filter((r) => r !== id))
      : setSelectedRows([...selectedRows, id]);
  const clearSelections = () => setSelectedRows([]);
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) setCurrentPage(newPage);
  };
  const handleRowsPerPageChange = (e) => {
    setRowsPerPage(Math.min(Number(e.target.value), 100));
    setCurrentPage(1);
  };
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setCurrentPage(1);
    setSelectedRows([]);
    setSubTab(null);
    setPrescriptionTab(null);
    setAppStatusTab(null);
    setProcessingTypeTab(null);
  };
  const handleSubTabChange = (value) => {
    setSubTab(value);
    setCurrentPage(1);
    setPrescriptionTab(null);
    setAppStatusTab(null);
  };
  const handlePrescriptionTabChange = (value) => {
    setPrescriptionTab(value);
    setCurrentPage(1);
    setAppStatusTab(null);
  };
  const handleAppStatusTabChange = (value) => {
    setAppStatusTab(value);
    setCurrentPage(1);
  };
  const handleProcessingTypeTabChange = (value) => {
    setProcessingTypeTab(value);
    setCurrentPage(1);
  };
  const handleSort = (dbKey, order) => {
    setSortBy(dbKey);
    setSortOrder(order);
    setCurrentPage(1);
  };
  const handleClearFilters = () => {
    setSubTab(null);
    setPrescriptionTab(null);
    setAppStatusTab(null);
    setProcessingTypeTab(null);
    setCurrentPage(1);
  };
  const handleRemoveFilter = (key) => {
    if (key === "subTab") {
      setSubTab(null);
      setPrescriptionTab(null);
      setAppStatusTab(null);
    }
    if (key === "prescriptionTab") {
      setPrescriptionTab(null);
      setAppStatusTab(null);
    }
    if (key === "appStatusTab") setAppStatusTab(null);
    if (key === "processingTypeTab") setProcessingTypeTab(null);
    setCurrentPage(1);
  };

  const handleExport = async () => {
    try {
      setExporting(true);

      // Step 1 — instant
      setExportProgress({ step: 0, pct: 0 });

      const params = {
        search: searchTerm,
        sortBy,
        sortOrder,
        ...buildFilterParams(filters),
      };
      if (getStatusFilter()) params.status = getStatusFilter();
      if (subTab !== null)
        params.app_type = subTab === "" ? "__EMPTY__" : subTab;
      if (prescriptionTab !== null)
        params.prescription =
          prescriptionTab === "" ? "__EMPTY__" : prescriptionTab;
      if (appStatusTab !== null)
        params.app_status = appStatusTab === "" ? "__EMPTY__" : appStatusTab;
      if (processingTypeTab !== null)
        params.processing_type =
          processingTypeTab === "" ? "__EMPTY__" : processingTypeTab;

      // Step 2 — fire the real call, overlay animates independently
      setExportProgress({ step: 1, pct: 0 });
      await exportFilteredRecords(params);

      // Steps 3 & 4 — quick finish
      setExportProgress({ step: 2, pct: 90 });
      await new Promise((r) => setTimeout(r, 400));
      setExportProgress({ step: 3, pct: 100 });
      await new Promise((r) => setTimeout(r, 700));
    } catch (error) {
      // your existing error handling
    } finally {
      setExportProgress(null);
      setExporting(false);
    }
  };

  const handleEdit = (record) => setEditingRecord(record);
  const handleEditSuccess = async () => {
    await refreshData();
    alert("✅ Record updated successfully!");
  };

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      {/* ── Sidebar ── */}
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
            {/* Header */}
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
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#6366f1"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                </svg>
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

            {/* Scrollable body */}
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
              {availableAppTypes.length > 0 && (
                <SidebarSection
                  title="Application Type"
                  groupColor="#6366f1"
                  items={availableAppTypes}
                  activeItem={subTab}
                  onItemClick={handleSubTabChange}
                  colors={colors}
                  darkMode={darkMode}
                  totalCount={availableAppTypes.reduce(
                    (s, a) => s + a.count,
                    0,
                  )}
                />
              )}
              {availablePrescriptionTypes.length > 0 && (
                <SidebarSection
                  title="Classification"
                  groupColor="#0891b2"
                  items={availablePrescriptionTypes}
                  activeItem={prescriptionTab}
                  onItemClick={handlePrescriptionTabChange}
                  colors={colors}
                  darkMode={darkMode}
                  totalCount={availablePrescriptionTypes.reduce(
                    (s, p) => s + p.count,
                    0,
                  )}
                />
              )}
              {availableAppStatusTypes.length > 0 && (
                <SidebarSection
                  title="All Status"
                  groupColor="#059669"
                  items={availableAppStatusTypes}
                  activeItem={appStatusTab}
                  onItemClick={handleAppStatusTabChange}
                  colors={colors}
                  darkMode={darkMode}
                  totalCount={availableAppStatusTypes.reduce(
                    (s, x) => s + x.count,
                    0,
                  )}
                />
              )}
              {availableProcessingTypes.length > 0 && (
                <SidebarSection
                  title="Processing Type"
                  groupColor="#f97316"
                  items={availableProcessingTypes}
                  activeItem={processingTypeTab}
                  onItemClick={handleProcessingTypeTabChange}
                  colors={colors}
                  darkMode={darkMode}
                  totalCount={availableProcessingTypes.reduce(
                    (s, x) => s + x.count,
                    0,
                  )}
                />
              )}
            </div>
          </>
        ) : (
          /* Collapsed */
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
            {[
              { icon: "🗂️", key: subTab, title: "Application Type" },
              { icon: "💊", key: prescriptionTab, title: "Classification" },
              { icon: "📌", key: appStatusTab, title: "All Status" },
              { icon: "⚡", key: processingTypeTab, title: "Processing Type" },
            ].map(({ icon, key, title }) => (
              <span
                key={title}
                title={title}
                onClick={() => setIsSidebarOpen(true)}
                style={{
                  fontSize: "1rem",
                  cursor: "pointer",
                  opacity: key !== null ? 1 : 0.3,
                  transition: "opacity 0.2s",
                }}
              >
                {icon}
              </span>
            ))}
          </div>
        )}
      </div>

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
            padding: "0.85rem 1.5rem 0",
            background: colors.pageBg,
            borderBottom: `1px solid ${colors.cardBorder}`,
          }}
        >
          {/* Main Tabs + Action Buttons */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginTop: "0.5rem",
              borderBottom: `2px solid ${colors.cardBorder}`,
            }}
          >
            {/* Tabs */}
            <div
              style={{
                display: "flex",
                flex: 1,
                overflowX: "auto",
                scrollbarWidth: "none",
              }}
            >
              {[
                {
                  id: "all",
                  label: "All Reports",
                  icon: "📋",
                  count: statsData.total,
                },
                {
                  id: "not-decked",
                  label: "Not Yet Decked",
                  icon: "⏳",
                  count: statsData.notDecked,
                },
                {
                  id: "decked",
                  label: "Decked",
                  icon: "✅",
                  count: statsData.decked,
                },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  style={{
                    padding: "6px 14px",
                    fontSize: "12px",
                    background: "transparent",
                    border: "none",
                    borderBottom:
                      activeTab === tab.id
                        ? "2px solid #4CAF50"
                        : "2px solid transparent",
                    color:
                      activeTab === tab.id
                        ? colors.textPrimary
                        : colors.textTertiary,
                    fontWeight: activeTab === tab.id ? 600 : 400,
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
                      background:
                        activeTab === tab.id ? "#4CAF50" : colors.badgeBg,
                      color:
                        activeTab === tab.id ? "#fff" : colors.textTertiary,
                      border: `0.5px solid ${activeTab === tab.id ? "#4CAF50" : colors.cardBorder}`,
                      fontWeight: 600,
                      minWidth: "20px",
                      textAlign: "center",
                    }}
                  >
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Action buttons — naka-fix sa kanan */}
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
              {selectedRows.length > 0 &&
                (() => {
                  const selectedRecords = filteredData.filter((r) =>
                    selectedRows.includes(r.id),
                  );
                  const hasCompleted = selectedRecords.some(
                    (r) => r.appStatus?.toLowerCase() === "completed",
                  );
                  return !hasCompleted;
                })() && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        padding: "3px 10px",
                        background: "rgba(33,150,243,0.1)",
                        border: "1px solid rgba(33,150,243,0.35)",
                        borderRadius: "6px",
                        fontSize: "11px",
                        color: "#2196F3",
                        fontWeight: 600,
                      }}
                    >
                      <span>✓ {selectedRows.length} selected</span>
                      <button
                        onClick={clearSelections}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: "#2196F3",
                          fontSize: "0.7rem",
                          padding: 0,
                          opacity: 0.7,
                          lineHeight: 1,
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.opacity = 1)
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.opacity = 0.7)
                        }
                      >
                        ✕
                      </button>
                    </div>
                    <button
                      onClick={() => setShowBulkReassign(true)}
                      style={{
                        padding: "5px 12px",
                        background: "linear-gradient(135deg,#7c3aed,#6d28d9)",
                        color: "#fff",
                        border: "none",
                        borderRadius: "6px",
                        fontSize: "11px",
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "5px",
                        height: "30px",
                        boxShadow: "0 2px 6px rgba(124,58,237,0.3)",
                      }}
                    >
                      🔄 Bulk Re-assign ({selectedRows.length})
                    </button>
                  </div>
                )}
              <button
                onClick={handleExport}
                disabled={exporting || totalRecords === 0}
                style={{
                  padding: "5px 14px",
                  background: exporting
                    ? colors.cardBorder
                    : "linear-gradient(135deg,#10B981,#059669)",
                  color: "#fff",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor:
                    exporting || totalRecords === 0 ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                  opacity: totalRecords === 0 ? 0.5 : 1,
                  boxShadow: "0 2px 6px rgba(16,185,129,0.25)",
                  height: "30px",
                }}
              >
                <span>{exporting ? "⏳" : "📥"}</span>
                <span>
                  {exporting ? "Exporting..." : `Export (${totalRecords})`}
                </span>
              </button>
              <UploadButton
                onFileSelect={handleFileSelect}
                onDownloadTemplate={handleDownloadTemplate}
                uploading={uploading}
                colors={colors}
              />
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "0.85rem 1.5rem",
            background: colors.pageBg,
          }}
        >
          <FilterBar
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            filters={filters}
            onFilterChange={setFilters}
            colors={colors}
            activeTab={activeTab}
            subTab={subTab}
            prescriptionTab={prescriptionTab}
            appStatusTab={appStatusTab}
          />
          <UploadProgress message={uploadProgress} colors={colors} />
          <ActiveFiltersBar
            subTab={subTab}
            prescriptionTab={prescriptionTab}
            appStatusTab={appStatusTab}
            processingTypeTab={processingTypeTab}
            onRemove={handleRemoveFilter}
            onClearAll={handleClearFilters}
            colors={colors}
          />

          {loading && (
            <LoadingSpinner
              darkMode={darkMode}
              colors={colors}
              progress={loadProgress}
            />
          )}

          {!loading && filteredData.length === 0 && (
            <div
              style={{
                background: colors.cardBg,
                border: `1px solid ${colors.cardBorder}`,
                borderRadius: "12px",
                padding: "3rem",
                textAlign: "center",
                color: colors.textSecondary,
              }}
            >
              <div style={{ fontSize: "1.75rem", marginBottom: "0.75rem" }}>
                📭
              </div>
              <div
                style={{
                  fontSize: "0.88rem",
                  fontWeight: 600,
                  marginBottom: "0.35rem",
                }}
              >
                No reports found
              </div>
              <div style={{ fontSize: "0.75rem" }}>
                No records found for the selected criteria
              </div>
            </div>
          )}

          {!loading && filteredData.length > 0 && (
            <DataTable
              data={filteredData}
              selectedRows={selectedRows}
              onSelectRow={handleSelectRow}
              onSelectAll={handleSelectAll}
              onClearSelections={clearSelections}
              currentPage={currentPage}
              rowsPerPage={rowsPerPage}
              totalRecords={totalRecords}
              totalPages={totalPages}
              indexOfFirstRow={(currentPage - 1) * rowsPerPage + 1}
              indexOfLastRow={Math.min(currentPage * rowsPerPage, totalRecords)}
              onPageChange={handlePageChange}
              onRowsPerPageChange={handleRowsPerPageChange}
              colors={colors}
              activeTab={activeTab}
              onRefresh={refreshData}
              onEdit={handleEdit}
              darkMode={darkMode}
              onSort={handleSort}
              sortBy={sortBy}
              sortOrder={sortOrder}
              updateUploadReport={updateUploadReport}
            />
          )}
        </div>
      </div>

      {editingRecord && (
        <EditRecordModal
          record={editingRecord}
          onClose={() => setEditingRecord(null)}
          onSuccess={handleEditSuccess}
          colors={colors}
          darkMode={darkMode}
          updateUploadReport={updateUploadReport}
        />
      )}
      {showErrorModal && (
        <UploadErrorModal
          failedRecords={failedRecords}
          onClose={() => {
            setShowErrorModal(false);
            setFailedRecords([]);
          }}
          colors={colors}
          darkMode={darkMode}
        />
      )}
      {showBulkReassign && (
        <BulkReassignmentModal
          records={filteredData.filter((r) => selectedRows.includes(r.id))}
          onClose={() => setShowBulkReassign(false)}
          onSuccess={() => {
            setShowBulkReassign(false);
            clearSelections();
            refreshData();
          }}
          colors={colors}
          darkMode={darkMode}
        />
      )}

      {exportProgress && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
        >
          <div
            style={{
              background: colors.cardBg,
              border: `1px solid ${colors.cardBorder}`,
              borderRadius: 14,
              padding: "2rem 2.5rem",
              minWidth: 300,
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
            }}
          >
            {/* header */}
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  background: "rgba(16,185,129,0.12)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 22,
                }}
              >
                📥
              </div>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontWeight: 600,
                    fontSize: 14,
                    color: colors.textPrimary,
                  }}
                >
                  {exportProgress.label}
                </div>
                <div style={{ fontSize: 12, color: colors.textSecondary }}>
                  {exportProgress.sub}
                </div>
              </div>
            </div>
            {/* bar */}
            <div
              style={{
                height: 6,
                background: colors.cardBorder,
                borderRadius: 99,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${exportProgress.pct}%`,
                  background: "#10B981",
                  borderRadius: 99,
                  transition: "width 0.4s ease",
                }}
              />
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                fontSize: 12,
                fontWeight: 600,
                color: colors.textPrimary,
              }}
            >
              {exportProgress.pct}%
            </div>
            {/* steps */}
            {[
              "Applying filters",
              "Querying records",
              "Building Excel file",
              "Downloading",
            ].map((s, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 12,
                  color:
                    i < exportProgress.step
                      ? "#10B981"
                      : i === exportProgress.step
                        ? colors.textPrimary
                        : colors.textTertiary,
                }}
              >
                <span>
                  {i < exportProgress.step
                    ? "✓"
                    : i === exportProgress.step
                      ? "●"
                      : "○"}
                </span>
                <span>{s}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default DeckingPage;
