// src/components/gmp/dashboard/GMPMonitoringTab.jsx
// "Monitoring" — the live/operational half of FGMP Monitoring & Analytics:
// current snapshot, per-record live status, who's carrying open work, and
// what needs attention right now. Trends and composition breakdowns live in
// the sibling Analytics tab instead.
import { FadeSlideIn } from "../../monitoring/analytics/KpiCard";
import { GMPSectionCard } from "./GMPSectionCard";
import { GMPKpiCard } from "./GMPKpiCard";
import ApplicationMonitoringTable from "./ApplicationMonitoringTable";
import { SectionHeading, SkeletonBox } from "./gmpAnalyticsShared";
import { GMPPipeline, GMPReleaseGauge, GMPAgingBar, GMPWorkloadList } from "./GMPMonitoringWidgets";

export default function GMPMonitoringTab({
  ui, darkMode, loading,
  kpiView, kpis, dtnKpis,
  workload, byStep, aging, nodKpis, summary, stepTiming,
}) {
  return (
    <div>
      {/* ── Right now: the KPI tiles ── */}
      {(kpiView === "both" || kpiView === "reference") && (
        <>
          <div style={{ fontSize: "0.74rem", fontWeight: 600, color: ui.textMuted, marginBottom: 8 }}>
            By reference record — each issuance counted separately
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(128px, 1fr))", gap: 10, marginBottom: 16 }}>
            {loading || !kpis.length
              ? Array.from({ length: 5 }).map((_, i) => <SkeletonBox key={i} height={78} borderRadius={12} ui={ui} />)
              : kpis.map((k, i) => (
                  <GMPKpiCard key={k.label} icon={k.icon} label={k.label} value={k.value} sub={k.sub} sparkline={k.sparkline} sparkLabels={k.sparkLabels} sparkUnit={k.sparkUnit} delta={k.delta} color={k.color} ui={ui} animDelay={i * 60} />
                ))}
          </div>
        </>
      )}

      {(kpiView === "both" || kpiView === "dtn") && (
        <>
          <div style={{ fontSize: "0.74rem", fontWeight: 600, color: ui.textMuted, marginBottom: 8 }}>
            By DTN — "Completed" only once every issuance under it is terminal
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(128px, 1fr))", gap: 10, marginBottom: 16 }}>
            {loading || !dtnKpis.length
              ? Array.from({ length: 5 }).map((_, i) => <SkeletonBox key={i} height={78} borderRadius={12} ui={ui} />)
              : dtnKpis.map((k, i) => (
                  <GMPKpiCard key={k.label} icon={k.icon} label={k.label} value={k.value} sub={k.sub} color={k.color} ui={ui} animDelay={i * 60} />
                ))}
          </div>
        </>
      )}

      {/* ── Where every open application sits right now ── */}
      <div style={{ marginTop: 28 }}>
        <SectionHeading index={2} icon="🧭" title="Applications by step" subtitle="How many open applications are sitting at each workflow step, right now" ui={ui} />
      </div>
      <FadeSlideIn delay={90} style={{ marginBottom: 16 }}>
        <GMPSectionCard title="Where every open application sits" subtitle="Decking → OD Releasing — hover a step to see its average hand-over time" ui={ui}>
          <GMPPipeline items={byStep} timing={stepTiming} ui={ui} loading={loading} />
        </GMPSectionCard>
      </FadeSlideIn>

      {/* ── Live application status ── */}
      <div style={{ marginTop: 28 }}>
        <SectionHeading index={3} icon="🔎" title="Live application status" subtitle="Search any DTN or establishment for its exact current state" ui={ui} />
      </div>
      <FadeSlideIn delay={100} style={{ marginBottom: 16 }}>
        <GMPSectionCard title="Application monitoring" subtitle="Live status of individual applications" ui={ui}>
          <ApplicationMonitoringTable ui={ui} darkMode={darkMode} />
        </GMPSectionCard>
      </FadeSlideIn>

      {/* ── Who's carrying the work ── */}
      <div style={{ marginTop: 28 }}>
        <SectionHeading index={4} icon="👷" title="Workload & backlog" subtitle="Who's carrying open work, and how long it's aged" ui={ui} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, marginBottom: 16 }}>
        <FadeSlideIn delay={120}>
          <GMPSectionCard title="Release rate" subtitle="Share of all records that reached final release" ui={ui}>
            <GMPReleaseGauge summary={summary} ui={ui} loading={loading} />
          </GMPSectionCard>
        </FadeSlideIn>
        <FadeSlideIn delay={140}>
          <GMPSectionCard title="Evaluator workload" subtitle="Open tasks per evaluator — hover a bar for avg TAT" ui={ui}>
            <GMPWorkloadList items={workload} ui={ui} loading={loading} />
          </GMPSectionCard>
        </FadeSlideIn>
        <FadeSlideIn delay={180}>
          <GMPSectionCard title="Backlog aging" subtitle="On Process records by days since received" ui={ui}>
            <GMPAgingBar items={aging} ui={ui} loading={loading} />
          </GMPSectionCard>
        </FadeSlideIn>
      </div>

      {/* ── What needs attention ── */}
      <div style={{ marginTop: 28 }}>
        <SectionHeading index={5} icon="📋" title="Compliance status" subtitle="Notice of Deficiency load, right now" ui={ui} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(128px, 1fr))", gap: 10 }}>
        {loading || !nodKpis.length
          ? Array.from({ length: 4 }).map((_, i) => <SkeletonBox key={i} height={78} borderRadius={12} ui={ui} />)
          : nodKpis.map((k, i) => (
              <GMPKpiCard key={k.label} icon={k.icon} label={k.label} value={k.value} sub={k.sub} color={k.color} ui={ui} animDelay={i * 60} />
            ))}
      </div>
    </div>
  );
}
