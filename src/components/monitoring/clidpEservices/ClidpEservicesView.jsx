import { useState, useEffect, useMemo, useCallback } from "react";
import ClidpBreakdownPanel from "./ClidpBreakdownPanel";
import {
  getEservicesDrugGroups,
  getEservicesDrugGroupSummary,
} from "../../../api/eservices-drug-groups";

const FB = "#1877F2";
const font =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

const STATUS_OPTIONS = ["Pending", "Completed"];

// Current steps available when the status is Completed. Keep in sync with the
// ApplicationStep enum in the backend.
const STEP_OPTIONS = [
  "All",
  "APPLICATION",
  "PRE-ASSESSMENT",
  "EVALUATION",
  "QUALITY ASSURANCE",
  "APPROVAL",
  "PAYMENT",
];
// Default step per status. Completed starts on APPROVAL, Pending on All.
const DEFAULT_STEP_BY_STATUS = {
  Pending: "All",
  Completed: "APPROVAL",
};

// "All" means no step filter.
const resolveStep = (step) => (step !== "All" ? step : null);
const makeKey = (group, status, stepValue) =>
  `${group}:${status}:${stepValue ?? ""}`;

function ClidpEservicesView({ ui, darkMode }) {
  const [groups, setGroups] = useState([]);
  const [groupsLoading, setGroupsLoading] = useState(true);
  const [groupsError, setGroupsError] = useState(null);

  const [activeGroup, setActiveGroup] = useState(null);
  const [status, setStatus] = useState("Pending");
  const [step, setStep] = useState(DEFAULT_STEP_BY_STATUS.Pending);

  // Cache and loading/error state are keyed by "<group>:<status>:<step>".
  const [cache, setCache] = useState({});
  const [loadingKeys, setLoadingKeys] = useState({});
  const [errors, setErrors] = useState({});

  const stepValue = resolveStep(step);
  const cacheKey = activeGroup ? makeKey(activeGroup, status, stepValue) : null;
  const activeData = cacheKey ? cache[cacheKey] : undefined;

  // Load the available drug groups once (these become the tabs).
  useEffect(() => {
    let cancelled = false;
    getEservicesDrugGroups()
      .then((data) => {
        if (cancelled) return;
        setGroups(data);
        if (data.length) setActiveGroup(data[0].key);
      })
      .catch((err) => {
        if (!cancelled) setGroupsError(err.message);
      })
      .finally(() => {
        if (!cancelled) setGroupsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const loadSummary = useCallback(async (group, appStatus, appStep) => {
    const key = makeKey(group, appStatus, appStep);
    setLoadingKeys((prev) => ({ ...prev, [key]: true }));
    try {
      const data = await getEservicesDrugGroupSummary(
        group,
        appStatus,
        appStep,
      );
      setCache((prev) => ({ ...prev, [key]: data }));
      setErrors((prev) => ({ ...prev, [key]: null }));
    } catch (err) {
      setErrors((prev) => ({ ...prev, [key]: err.message }));
    } finally {
      setLoadingKeys((prev) => ({ ...prev, [key]: false }));
    }
  }, []);

  useEffect(() => {
    if (!activeGroup) return;
    if (cache[cacheKey] || loadingKeys[cacheKey]) return;
    loadSummary(activeGroup, status, stepValue);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeGroup, status, step]);

  const handleStatusChange = (newStatus) => {
    setStatus(newStatus);
    setStep(DEFAULT_STEP_BY_STATUS[newStatus]);
  };

  const handleRefresh = () => {
    if (!activeGroup) return;
    setCache((prev) => {
      const next = { ...prev };
      delete next[cacheKey];
      return next;
    });
    loadSummary(activeGroup, status, stepValue);
  };

  // Categories-only groups (e.g. cancer) have no generic name, so in that
  // case the panel shows the category as the label and hides the group column.
  const { items, hasGenericName } = useMemo(() => {
    const raw = activeData?.items ?? [];
    return {
      hasGenericName: raw.some((row) => row.generic_name),
      items: raw.map((row) => ({
        ...row,
        pharmacologic_category: row.pharmacologic_category || "Uncategorized",
        generic_name: row.generic_name || "—",
      })),
    };
  }, [activeData]);

  const cardStyle = {
    background: ui.cardBg,
    border: `1px solid ${ui.cardBorder}`,
    borderRadius: 12,
    padding: "40px",
    textAlign: "center",
    fontSize: "0.85rem",
    fontFamily: font,
  };

  if (groupsLoading) {
    return <div style={{ ...cardStyle, color: ui.textMuted }}>Loading…</div>;
  }
  if (groupsError) {
    return <div style={{ ...cardStyle, color: "#f87171" }}>{groupsError}</div>;
  }
  if (!groups.length) {
    return (
      <div style={{ ...cardStyle, color: ui.textMuted }}>
        No drug groups available.
      </div>
    );
  }

  const pillStyle = (active, padding, fontSize) => ({
    padding,
    borderRadius: 99,
    border: `1px solid ${active ? FB : ui.cardBorder}`,
    background: active ? `${FB}15` : "transparent",
    color: active ? FB : ui.textMuted,
    fontSize,
    fontWeight: active ? 700 : 500,
    cursor: "pointer",
    fontFamily: font,
    whiteSpace: "nowrap",
  });

  const filterLabelStyle = {
    fontSize: "0.68rem",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    color: ui.textMuted,
    marginRight: 4,
  };

  const stepSuffix = stepValue ? ` · ${stepValue}` : "";
  const exportSuffix = stepValue
    ? `-${stepValue.toLowerCase().replace(/\s+/g, "-")}`
    : "";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 14,
        fontFamily: font,
      }}
    >
      {/* Drug group tabs */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {groups.map((g) => (
          <button
            key={g.key}
            onClick={() => setActiveGroup(g.key)}
            style={pillStyle(activeGroup === g.key, "7px 16px", "0.82rem")}
          >
            {g.label}
          </button>
        ))}
      </div>

      {/* Status filter + refresh */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span
            style={{
              fontSize: "0.68rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: ui.textMuted,
              marginRight: 4,
            }}
          >
            Status
          </span>
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => handleStatusChange(s)}
              style={pillStyle(status === s, "5px 14px", "0.78rem")}
            >
              {s}
            </button>
          ))}
        </div>
        <button
          onClick={handleRefresh}
          style={{
            padding: "5px 12px",
            fontSize: "0.75rem",
            fontWeight: 600,
            borderRadius: 6,
            border: `1px solid ${ui.cardBorder}`,
            background: "transparent",
            color: ui.textMuted,
            cursor: "pointer",
            fontFamily: font,
          }}
        >
          ↻ Refresh
        </button>
      </div>

      {/* Current step filter */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          flexWrap: "wrap",
        }}
      >
        <span style={filterLabelStyle}>Current Step</span>
        {STEP_OPTIONS.map((s) => (
          <button
            key={s}
            onClick={() => setStep(s)}
            style={pillStyle(step === s, "5px 14px", "0.76rem")}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Active panel */}
      <ClidpBreakdownPanel
        ui={ui}
        darkMode={darkMode}
        loading={!activeData && !errors[cacheKey]}
        error={errors[cacheKey]}
        items={items}
        grandTotal={activeData?.total_application_count ?? 0}
        showGenericName={hasGenericName}
        totalLabel={`Total ${status} Applications${stepSuffix}`}
        emptyMessage={`No ${status.toLowerCase()} applications found${stepSuffix}.`}
        exportFilename={`clidp-eservices-${activeGroup}-${status.toLowerCase()}${exportSuffix}`}
      />
    </div>
  );
}

export default ClidpEservicesView;
