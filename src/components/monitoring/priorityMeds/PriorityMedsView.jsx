import { useState, useEffect, useCallback } from "react";
import BreakdownPanel from "./BreakdownPanel";
import {
  getCancerMedsBreakdown,
  getRareDiseaseBreakdown,
  getFluVaccineBreakdown,
  getPneumococcalBreakdown,
} from "../../../api/priority-meds";

const FB = "#1877F2";
const font =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

const TABS = [
  {
    key: "cancer",
    label: "Cancer Meds",
    fetcher: getCancerMedsBreakdown,
    groupKey: "type",
    groupLabel: "Pharmaceutical Category",
    valueKey: "total_pending",
    valueLabel: "Total Pending",
    exportFilename: "cancer-meds-breakdown",
  },
  {
    key: "rare-disease",
    label: "Rare Disease Meds",
    fetcher: getRareDiseaseBreakdown,
    groupKey: "type",
    groupLabel: "Pharmaceutical Category",
    valueKey: "total_pending",
    valueLabel: "Total Pending",
    exportFilename: "rare-disease-meds-breakdown",
  },
  {
    key: "flu-vaccines",
    label: "Flu Vaccines",
    fetcher: getFluVaccineBreakdown,
    groupKey: "pharma_category",
    groupLabel: "Pharmaceutical Category",
    valueKey: "total_count",
    valueLabel: "Total Count",
    exportFilename: "flu-vaccine-breakdown",
  },
  {
    key: "pneumococcal",
    label: "Pneumococcal Vaccines",
    fetcher: getPneumococcalBreakdown,
    groupKey: "pharma_category",
    groupLabel: "Pharmaceutical Category",
    valueKey: "total_count",
    valueLabel: "Total Count",
    exportFilename: "pneumococcal-breakdown",
  },
];
function PriorityMedsView({ ui, darkMode }) {
  const [activeTab, setActiveTab] = useState("cancer");
  const [cache, setCache] = useState({});
  const [loadingKey, setLoadingKey] = useState(null);
  const [errorKey, setErrorKey] = useState({});

  const activeTabConfig = TABS.find((t) => t.key === activeTab);

  const loadTab = useCallback(
    async (key) => {
      if (cache[key]) return;
      const config = TABS.find((t) => t.key === key);
      setLoadingKey(key);
      try {
        const data = await config.fetcher();
        setCache((prev) => ({ ...prev, [key]: data }));
        setErrorKey((prev) => ({ ...prev, [key]: null }));
      } catch (err) {
        setErrorKey((prev) => ({ ...prev, [key]: err.message }));
      } finally {
        setLoadingKey(null);
      }
    },
    [cache],
  );

  useEffect(() => {
    loadTab(activeTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const activeData = cache[activeTab];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 14,
        fontFamily: font,
      }}
    >
      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {TABS.map((t) => {
          const active = activeTab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              style={{
                padding: "7px 16px",
                borderRadius: 99,
                border: `1px solid ${active ? FB : ui.cardBorder}`,
                background: active ? `${FB}15` : "transparent",
                color: active ? FB : ui.textMuted,
                fontSize: "0.82rem",
                fontWeight: active ? 700 : 500,
                cursor: "pointer",
                fontFamily: font,
                whiteSpace: "nowrap",
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Active panel */}
      <BreakdownPanel
        ui={ui}
        darkMode={darkMode}
        loading={loadingKey === activeTab && !activeData}
        error={errorKey[activeTab]}
        items={activeData?.items}
        grandTotal={activeData?.grand_total ?? 0}
        groupKey={activeTabConfig.groupKey}
        groupLabel={activeTabConfig.groupLabel}
        valueKey={activeTabConfig.valueKey}
        valueLabel={activeTabConfig.valueLabel}
        exportFilename={activeTabConfig.exportFilename}
      />
    </div>
  );
}

export default PriorityMedsView;
