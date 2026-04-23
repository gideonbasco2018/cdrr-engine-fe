// src/components/monitoring/records/AllRecords.jsx
import { useState, useEffect, useCallback, useRef } from "react";
import { getAllRecords } from "../../../api/monitoring";
import ReassignmentModal from "../../reports/actions/ReassignmentModal";
import RerouteModal from "../../reports/actions/RerouteModal";
import ViewDetailsModal from "../../reports/actions/ViewDetailsModal";
import { getUploadReports } from "../../../api/reports";
import { mapDataItem } from "../../reports/utils";

const FB = "#1877F2";

const timelineColors = {
  Within: { bg: "#dcfce7", color: "#15803d" },
  Beyond: { bg: "#fef2f2", color: "#b91c1c" },
};
const timelineColorsDark = {
  Within: { bg: "#0a2e1a", color: "#4ade80" },
  Beyond: { bg: "#2e0a0a", color: "#f87171" },
};

const avatarPalette = [
  { bg: "#dbeafe", color: "#1d4ed8" },
  { bg: "#fce7f3", color: "#be185d" },
  { bg: "#d1fae5", color: "#065f46" },
  { bg: "#fef3c7", color: "#92400e" },
  { bg: "#ede9fe", color: "#5b21b6" },
  { bg: "#fee2e2", color: "#991b1b" },
  { bg: "#cffafe", color: "#0e7490" },
  { bg: "#fef9c3", color: "#713f12" },
];

// Known steps for dropdown — adjust to match your actual data
const STEP_OPTIONS = [
  "Decking",
  "Checking",
  "Quality Evaluation",
  "Releasing",
  "Encoding",
];

function nameToAvatarColor(name = "") {
  let hash = 0;
  for (let i = 0; i < name.length; i++)
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return avatarPalette[Math.abs(hash) % avatarPalette.length];
}

const PAGE_SIZE = 12;

// ── 3-dot Action Menu ─────────────────────────────────────────────────────────
function ActionMenu({ row, ui, darkMode, onAction }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const font =
    "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const actions = [
    { key: "view", icon: "👁️", label: "View Details" },
    { key: "reassign", icon: "🔄", label: "Re-assign" },
    { key: "reroute", icon: "🔀", label: "Re-route" },
  ];

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        style={{
          background: "transparent",
          border: `1px solid ${ui.cardBorder}`,
          borderRadius: 6,
          color: ui.textMuted,
          cursor: "pointer",
          padding: "3px 8px",
          fontSize: "1rem",
          lineHeight: 1,
          fontFamily: font,
          transition: "all 0.15s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = ui.hoverBg;
          e.currentTarget.style.color = ui.textPrimary;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.color = ui.textMuted;
        }}
        title="Actions"
      >
        ⋯
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            right: 0,
            top: "calc(100% + 4px)",
            background: ui.cardBg,
            border: `1px solid ${ui.cardBorder}`,
            borderRadius: 8,
            boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
            zIndex: 9999,
            minWidth: 160,
            overflow: "hidden",
          }}
        >
          {actions.map(({ key, icon, label }) => (
            <button
              key={key}
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                onAction(key, row);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                width: "100%",
                padding: "9px 14px",
                background: "transparent",
                border: "none",
                color: ui.textPrimary,
                fontSize: "0.8rem",
                fontFamily: font,
                cursor: "pointer",
                textAlign: "left",
                transition: "background 0.12s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = ui.hoverBg)
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              <span style={{ fontSize: "0.9rem" }}>{icon}</span>
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Map AllRecords row → modal record shape ───────────────────────────────────
function rowToRecord(row) {
  return {
    id: row.id,
    dtn: row.dtn,
    appStatus: row.app_status,
    mainDbId: row.id,
    prodBrName: row.drug_name,
    dateReceivedCent: row.date_received_cent,
    processingType: row.processing_type,
    estCat: row.est_cat,
    appType: row.app_type,
    ltoComp: row.lto_comp,
    ltoAdd: row.lto_add,
    eadd: row.eadd,
    tin: row.tin,
    contactNo: row.contact_no,
    ltoNo: row.lto_no,
    validity: row.validity,
    dateReceivedFdac: row.date_received_fdac,
    prodGenName: row.prod_gen_name,
    prodDosStr: row.prod_dos_str,
    prodDosForm: row.prod_dos_form,
    prodClassPrescript: row.prod_class_prescript,
    prodEssDrugList: row.prod_ess_drug_list,
    prodDistriShelfLife: row.prod_distri_shelf_life,
    prodPharmaCat: row.prod_pharma_cat,
    prodCat: row.prod_cat,
    pharmaProdCat: row.pharma_prod_cat,
    pharmaProdCatLabel: row.pharma_prod_cat_label,
    file: row.file,
    storageCond: row.storage_cond,
    packaging: row.packaging,
    suggRp: row.sugg_rp,
    noSample: row.no_sample,
    fee: row.fee,
    lrf: row.lrf,
    surc: row.surc,
    total: row.total,
    orNo: row.or_no,
    dateIssued: row.date_issued,
    prodManu: row.prod_manu,
    prodManuCountry: row.prod_manu_country,
    prodManuLtoNo: row.prod_manu_lto_no,
    prodManuTin: row.prod_manu_tin,
    prodManuAdd: row.prod_manu_add,
    prodTrader: row.prod_trader,
    prodTraderCountry: row.prod_trader_country,
    prodTraderLtoNo: row.prod_trader_lto_no,
    prodTraderTin: row.prod_trader_tin,
    prodTraderAdd: row.prod_trader_add,
    prodImporter: row.prod_importer,
    prodImporterCountry: row.prod_importer_country,
    prodImporterLtoNo: row.prod_importer_lto_no,
    prodImporterTin: row.prod_importer_tin,
    prodImporterAdd: row.prod_importer_add,
    prodDistri: row.prod_distri,
    prodDistriCountry: row.prod_distri_country,
    prodDistriLtoNo: row.prod_distri_lto_no,
    prodDistriTin: row.prod_distri_tin,
    prodDistriAdd: row.prod_distri_add,
    prodRepacker: row.prod_repacker,
    prodRepackerCountry: row.prod_repacker_country,
    prodRepackerLtoNo: row.prod_repacker_lto_no,
    prodRepackerTin: row.prod_repacker_tin,
    prodRepackerAdd: row.prod_repacker_add,
    regNo: row.reg_no,
    motherAppType: row.mother_app_type,
    oldRsn: row.old_rsn,
    certification: row.certification,
    class: row.class,
    mo: row.mo,
    ammend1: row.ammend1,
    ammend2: row.ammend2,
    ammend3: row.ammend3,
    dateDeck: row.date_deck,
    dateReleased: row.date_released,
    expiryDate: row.expiry_date,
    cprValidity: row.cpr_validity,
    dateRemarks: row.date_remarks,
    deckingSched: row.decking_sched,
    eval: row.eval,
    secpa: row.secpa,
    secpaExpDate: row.secpa_exp_date,
    secpaIssuedOn: row.secpa_issued_on,
    typeDocReleased: row.type_doc_released,
    attaReleased: row.atta_released,
    cprCond: row.cpr_cond,
    cprCondRemarks: row.cpr_cond_remarks,
    cprCondAddRemarks: row.cpr_cond_add_remarks,
    appRemarks: row.app_remarks,
    remarks1: row.remarks1,
    dbTimelineCitizenCharter: row.db_timeline_citizen_charter,
    userUploader: row.user_uploader,
    dateExcelUpload: row.date_excel_upload,
  };
}

// ── Step badge colors ─────────────────────────────────────────────────────────
const stepColors = {
  Decking: { bg: "#ede9fe", color: "#5b21b6" },
  Checking: { bg: "#dbeafe", color: "#1d4ed8" },
  "Quality Evaluation": { bg: "#fef3c7", color: "#92400e" },
  Releasing: { bg: "#dcfce7", color: "#15803d" },
  Encoding: { bg: "#fce7f3", color: "#be185d" },
};
const stepColorsDark = {
  Decking: { bg: "#2e1a4a", color: "#c4b5fd" },
  Checking: { bg: "#0a1e3a", color: "#93c5fd" },
  "Quality Evaluation": { bg: "#2a1f00", color: "#fde68a" },
  Releasing: { bg: "#0a2e1a", color: "#4ade80" },
  Encoding: { bg: "#2e0a1a", color: "#f9a8d4" },
};

export default function AllRecords({
  ui,
  darkMode,
  filterUserId = null,
  statusFilter = "all",
}) {
  const font =
    "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
  const colHdr = darkMode ? ui.sidebarBg : "#f8f9fd";

  const [records, setRecords] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortCol, setSortCol] = useState("date");
  const [sortDir, setSortDir] = useState("desc");

  // ── NEW filter states ──────────────────────────────────────────
  const [dtnSearch, setDtnSearch] = useState("");
  const [dtnInput, setDtnInput] = useState(""); // debounce buffer
  const [stepFilter, setStepFilter] = useState("");
  const [localStatusFilter, setLocalStatusFilter] = useState("");
  // ──────────────────────────────────────────────────────────────

  const [modalLoading, setModalLoading] = useState(false);
  const [activeModal, setActiveModal] = useState(null);
  const [selectedRecord, setSelectedRecord] = useState(null);

  // Debounce DTN input by 400ms
  useEffect(() => {
    const t = setTimeout(() => setDtnSearch(dtnInput), 400);
    return () => clearTimeout(t);
  }, [dtnInput]);

  const handleAction = async (actionKey, row) => {
    if (actionKey === "view") {
      setSelectedRecord(rowToRecord(row));
      setActiveModal("view");
      setModalLoading(true);
      try {
        const result = await getUploadReports({
          dtn: row.dtn,
          page: 1,
          pageSize: 1,
        });
        if (result?.data?.[0]) setSelectedRecord(mapDataItem(result.data[0]));
      } catch (err) {
        console.error("Failed to fetch full record:", err);
      } finally {
        setModalLoading(false);
      }
    } else {
      setSelectedRecord(rowToRecord(row));
      setActiveModal(actionKey);
    }
  };

  const handleCloseModal = () => {
    setActiveModal(null);
    setSelectedRecord(null);
  };

  const colors = {
    ...ui,
    cardBg: ui.cardBg,
    cardBorder: ui.cardBorder,
    textPrimary: ui.textPrimary,
    textTertiary: ui.textMuted,
    inputBg: ui.inputBg,
    inputBorder: ui.cardBorder,
  };

  const inputSt = {
    background: ui.inputBg,
    border: `1px solid ${ui.cardBorder}`,
    borderRadius: 7,
    padding: "7px 10px",
    fontSize: "0.82rem",
    color: ui.textPrimary,
    outline: "none",
    colorScheme: darkMode ? "dark" : "light",
    fontFamily: font,
  };

  const labelSt = {
    fontSize: "0.68rem",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    color: ui.textMuted,
    marginBottom: 4,
    display: "block",
    fontFamily: font,
  };

  const btnStyle = (disabled) => ({
    background: "transparent",
    border: `1px solid ${ui.cardBorder}`,
    borderRadius: 5,
    color: disabled ? ui.textMuted : ui.textPrimary,
    cursor: disabled ? "not-allowed" : "pointer",
    padding: "2px 8px",
    fontSize: "0.78rem",
    fontFamily: font,
  });

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page,
        page_size: PAGE_SIZE,
        sort_col: sortCol,
        sort_dir: sortDir,
      };
      if (filterUserId) params.user_id = filterUserId;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      if (dtnSearch) params.dtn = dtnSearch; // ← NEW
      if (stepFilter) params.app_step = stepFilter; // ← NEW

      if (localStatusFilter) {
        params.application_status = localStatusFilter;
      }
      const data = await getAllRecords(params);
      setRecords(data.data || []);
      setTotal(data.total || 0);
      setTotalPages(data.total_pages || 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [
    page,
    sortCol,
    sortDir,
    filterUserId,
    dateFrom,
    dateTo,
    dtnSearch,
    stepFilter,
    localStatusFilter,
  ]); // ← added deps

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  useEffect(() => {
    setPage(1);
  }, [
    dateFrom,
    dateTo,
    sortCol,
    sortDir,
    filterUserId,
    statusFilter,
    dtnSearch,
    stepFilter,
  ]); // ← added deps

  const toggleSort = (col) => {
    if (sortCol === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortCol(col);
      setSortDir("asc");
    }
  };

  const SortArrow = ({ col }) => {
    const active = sortCol === col;
    return (
      <span
        style={{
          marginLeft: 3,
          fontSize: "0.62rem",
          opacity: active ? 1 : 0.3,
          color: FB,
        }}
      >
        {active ? (sortDir === "asc" ? "▲" : "▼") : "⇅"}
      </span>
    );
  };

  const handleReset = () => {
    setDateFrom("");
    setDateTo("");
    setDtnInput("");
    setDtnSearch(""); // ← NEW
    setStepFilter(""); // ← NEW
    setLocalStatusFilter("");
    setSortCol("date");
    setSortDir("desc");
    setPage(1);
  };

  const TL = darkMode ? timelineColorsDark : timelineColors;
  const SP = darkMode ? stepColorsDark : stepColors;

  // 8 columns now — added Step
  const GRID = "1.4fr 1.2fr 1.8fr 1fr 1fr 1fr 0.9fr 0.6fr";

  return (
    <>
      <div
        style={{
          flex: "1 1 360px",
          minWidth: 300,
          display: "flex",
          flexDirection: "column",
          height: "calc(100vh - 160px)",
          maxHeight: "calc(100vh - 160px)",
        }}
      >
        <p
          style={{
            fontSize: "0.9rem",
            fontWeight: 700,
            color: ui.textPrimary,
            margin: "0 0 8px",
            fontFamily: font,
          }}
        >
          All Records
        </p>

        <div
          style={{
            background: ui.cardBg,
            border: `1px solid ${ui.cardBorder}`,
            borderRadius: 8,
            overflow: "hidden",
            boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
            flex: 1,
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
          }}
        >
          {/* ── Filter Bar ── */}
          <div
            style={{
              padding: "10px 14px",
              borderBottom: `1px solid ${ui.divider}`,
              background: colHdr,
              display: "flex",
              gap: 10,
              alignItems: "flex-end",
              flexWrap: "wrap",
            }}
          >
            {/* DTN Search — NEW */}
            <div>
              <label style={labelSt}>DTN</label>
              <input
                type="text"
                placeholder="Search DTN…"
                value={dtnInput}
                onChange={(e) => setDtnInput(e.target.value)}
                style={{ ...inputSt, width: 130 }}
              />
            </div>

            {/* Step Filter — NEW */}
            <div>
              <label style={labelSt}>Step</label>
              <select
                value={stepFilter}
                onChange={(e) => setStepFilter(e.target.value)}
                style={{ ...inputSt, paddingRight: 24, cursor: "pointer" }}
              >
                <option value="">All Steps</option>
                {STEP_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label style={labelSt}>Status</label>
              <select
                value={localStatusFilter}
                onChange={(e) => setLocalStatusFilter(e.target.value)}
                style={{ ...inputSt, paddingRight: 24, cursor: "pointer" }}
              >
                <option value="">All Status</option>
                <option value="COMPLETED">Completed</option>
                <option value="IN PROGRESS">In Progress</option>
              </select>
            </div>

            {/* Date Range */}
            {[
              { label: "From", val: dateFrom, set: setDateFrom },
              { label: "To", val: dateTo, set: setDateTo },
            ].map(({ label, val, set }) => (
              <div key={label}>
                <label style={labelSt}>{label}</label>
                <input
                  type="date"
                  value={val}
                  onChange={(e) => set(e.target.value)}
                  style={inputSt}
                />
              </div>
            ))}

            <button
              onClick={handleReset}
              style={{
                padding: "7px 14px",
                fontSize: "0.8rem",
                fontWeight: 500,
                borderRadius: 7,
                border: `1px solid ${ui.cardBorder}`,
                background: "transparent",
                color: ui.textMuted,
                cursor: "pointer",
                fontFamily: font,
              }}
            >
              Reset
            </button>
          </div>

          {/* ── Column Headers ── */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: GRID,
              background: colHdr,
              borderBottom: `1px solid ${ui.divider}`,
            }}
          >
            {[
              { label: "DTN", col: "dtn" },
              { label: "User", col: "user" },
              { label: "Drug / Application", col: "drug" },
              { label: "Date", col: "date" },
              { label: "Step", col: "step" }, // ← NEW
              { label: "Timeline", col: "timeline" },
              { label: "Status", col: "status" },
              { label: "Actions", col: null },
            ].map(({ label, col }) => (
              <span
                key={label}
                onClick={() => col && toggleSort(col)}
                style={{
                  fontSize: "0.67rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.07em",
                  color: col && sortCol === col ? FB : ui.textMuted,
                  textAlign: "center",
                  padding: "8px 12px",
                  cursor: col ? "pointer" : "default",
                  userSelect: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "color 0.15s",
                  fontFamily: font,
                }}
              >
                {label}
                {col && <SortArrow col={col} />}
              </span>
            ))}
          </div>

          {/* ── Table Body ── */}
          <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
            {loading ? (
              <div
                style={{
                  padding: "32px",
                  textAlign: "center",
                  color: ui.textMuted,
                  fontSize: "0.84rem",
                  fontFamily: font,
                }}
              >
                Loading records...
              </div>
            ) : error ? (
              <div
                style={{
                  padding: "20px",
                  textAlign: "center",
                  color: "#e02020",
                  fontSize: "0.8rem",
                  fontFamily: font,
                }}
              >
                {error}
              </div>
            ) : records.length === 0 ? (
              <div
                style={{
                  padding: "24px",
                  textAlign: "center",
                  color: ui.textMuted,
                  fontSize: "0.84rem",
                  fontFamily: font,
                }}
              >
                No records found
              </div>
            ) : (
              records.map((row, i) => {
                const tlStyle = TL[row.timeline] || {
                  bg: "#f3f4f6",
                  color: "#374151",
                };
                const av = nameToAvatarColor(row.user_name || "");

                const statusColors = {
                  COMPLETED: { bg: "#dcfce7", color: "#15803d" },
                  "IN PROGRESS": { bg: "#fef9c3", color: "#a16207" },
                };
                const statusColorsDark = {
                  COMPLETED: { bg: "#0a2e1a", color: "#4ade80" },
                  "IN PROGRESS": { bg: "#2a2000", color: "#fde68a" },
                };
                const statusKey = (row.app_status || "").toUpperCase();
                const sc = (darkMode ? statusColorsDark : statusColors)[
                  statusKey
                ] || { bg: "#f3f4f6", color: "#374151" };

                // Step badge
                const stepKey = row.app_step || "";
                const spStyle = SP[stepKey] || {
                  bg: darkMode ? "#1e1e2e" : "#f3f4f6",
                  color: darkMode ? "#a0a0b0" : "#374151",
                };

                return (
                  <div
                    key={`${row.id}-${i}`}
                    style={{
                      display: "grid",
                      gridTemplateColumns: GRID,
                      borderBottom:
                        i < records.length - 1
                          ? `1px solid ${ui.divider}`
                          : "none",
                      transition: "background 0.12s",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = ui.hoverBg)
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "transparent")
                    }
                  >
                    {/* DTN */}
                    <span
                      style={{
                        fontSize: "0.72rem",
                        color: FB,
                        fontWeight: 700,
                        textAlign: "center",
                        padding: "10px 12px",
                        fontFamily: "monospace",
                        alignSelf: "center",
                      }}
                    >
                      {row.dtn || "—"}
                    </span>

                    {/* User */}
                    <span
                      style={{
                        fontSize: "0.8rem",
                        color: ui.textPrimary,
                        fontWeight: 500,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 1,
                        padding: "10px 12px",
                      }}
                    >
                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 5,
                        }}
                      >
                        <span
                          style={{
                            width: 7,
                            height: 7,
                            borderRadius: "50%",
                            background: av.color,
                            flexShrink: 0,
                          }}
                        />
                        <span
                          style={{
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            maxWidth: 100,
                          }}
                        >
                          {row.user_name || "—"}
                        </span>
                      </span>
                    </span>

                    {/* Drug */}
                    <span
                      style={{
                        fontSize: "0.75rem",
                        color: ui.textSub,
                        padding: "10px 12px",
                        alignSelf: "center",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        fontFamily: font,
                      }}
                    >
                      {row.drug_name || "—"}
                    </span>

                    {/* Date */}
                    <span
                      style={{
                        fontSize: "0.8rem",
                        color: ui.textPrimary,
                        textAlign: "center",
                        padding: "10px 12px",
                        alignSelf: "center",
                        fontFamily: font,
                      }}
                    >
                      {row.date_received_cent
                        ? new Date(
                            row.date_received_cent + "T00:00:00",
                          ).toLocaleDateString("en-PH", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })
                        : "—"}
                    </span>

                    {/* Step — NEW */}
                    <span
                      style={{
                        padding: "10px 12px",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "0.68rem",
                          fontWeight: 600,
                          padding: "3px 9px",
                          borderRadius: 99,
                          background: spStyle.bg,
                          color: spStyle.color,
                          whiteSpace: "nowrap",
                          fontFamily: font,
                        }}
                      >
                        {row.app_step || "—"}
                      </span>
                    </span>

                    {/* Timeline */}
                    <span
                      style={{
                        padding: "10px 12px",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "0.71rem",
                          fontWeight: 600,
                          padding: "3px 10px",
                          borderRadius: 99,
                          background: tlStyle.bg,
                          color: tlStyle.color,
                          whiteSpace: "nowrap",
                          fontFamily: font,
                        }}
                      >
                        {row.timeline || "—"}
                      </span>
                    </span>

                    {/* Status */}
                    <span
                      style={{
                        padding: "10px 12px",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "0.7rem",
                          fontWeight: 600,
                          padding: "3px 8px",
                          borderRadius: 99,
                          background: sc.bg,
                          color: sc.color,
                          whiteSpace: "nowrap",
                          fontFamily: font,
                        }}
                      >
                        {row.app_status || "—"}
                      </span>
                    </span>

                    {/* Actions */}
                    <span
                      style={{
                        padding: "10px 12px",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    >
                      <ActionMenu
                        row={row}
                        ui={ui}
                        darkMode={darkMode}
                        onAction={handleAction}
                      />
                    </span>
                  </div>
                );
              })
            )}
          </div>

          {/* ── Footer / Pagination ── */}
          <div
            style={{
              padding: "7px 14px",
              borderTop: `1px solid ${ui.divider}`,
              background: colHdr,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span
              style={{
                fontSize: "0.73rem",
                color: ui.textMuted,
                fontFamily: font,
              }}
            >
              {total} record{total !== 1 ? "s" : ""}
              {totalPages > 1 && (
                <span style={{ marginLeft: 6 }}>
                  · page {page} of {totalPages}
                </span>
              )}
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                style={btnStyle(page === 1)}
              >
                ‹
              </button>
              <span
                style={{
                  fontSize: "0.73rem",
                  color: ui.textMuted,
                  fontFamily: font,
                }}
              >
                {page} / {totalPages || 1}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                style={btnStyle(page >= totalPages)}
              >
                ›
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Modals ── */}
      {activeModal === "view" && selectedRecord && (
        <ViewDetailsModal
          record={selectedRecord}
          onClose={handleCloseModal}
          colors={colors}
          darkMode={darkMode}
          loading={modalLoading}
        />
      )}
      {activeModal === "reassign" && selectedRecord && (
        <ReassignmentModal
          record={selectedRecord}
          onClose={handleCloseModal}
          colors={colors}
          darkMode={darkMode}
        />
      )}
      {activeModal === "reroute" && selectedRecord && (
        <RerouteModal
          record={selectedRecord}
          onClose={handleCloseModal}
          colors={colors}
          darkMode={darkMode}
        />
      )}
    </>
  );
}
