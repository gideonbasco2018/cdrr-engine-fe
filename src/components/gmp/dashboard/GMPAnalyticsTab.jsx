// src/components/gmp/dashboard/GMPAnalyticsTab.jsx
// "Analytics" — the historical/compositional half of FGMP Monitoring &
// Analytics: trends over time, how volume breaks down, and data worth a
// second look. Live per-record status and current workload live in the
// sibling Monitoring tab instead.
import { FadeSlideIn } from "../../monitoring/analytics/KpiCard";
import { GMPSectionCard } from "./GMPSectionCard";
import {
  SectionHeading, SkeletonBox, StepTimingChart,
  BreakdownBarChart,
} from "./gmpAnalyticsShared";
import GMPMonthlySummary from "./GMPMonthlySummary";
import GMPDataCompleteness from "./GMPDataCompleteness";
import GMPTrendOverview from "./GMPTrendOverview";
import GMPCountryBreakdown from "./GMPCountryBreakdown";

export default function GMPAnalyticsTab({
  ui, darkMode, loading,
  category, dtnSummary, picsCountry, nod, stepTiming,
  monthly, year, month, years,
}) {
  return (
    <div>
      {/* ── Manufacturer countries ── */}
      <FadeSlideIn delay={60} style={{ marginBottom: 28 }}>
        <GMPSectionCard
          title="By manufacturer country"
          subtitle="Every country, parsed from the manufacturer address — green dot = current PIC/S member"
          ui={ui}
        >
          <GMPCountryBreakdown items={picsCountry?.by_country ?? []} ui={ui} loading={loading} />
        </GMPSectionCard>
      </FadeSlideIn>

      {/* ── Trend ── */}
      <SectionHeading index={1} title="Applications over time" subtitle="Received, released, in progress & disapproved — hover for values, click a name to hide a line" ui={ui} />
      <FadeSlideIn delay={80} style={{ marginBottom: 16 }}>
        <GMPTrendOverview ui={ui} darkMode={darkMode} years={years} pageYear={year} pageMonth={month} />
      </FadeSlideIn>
      <FadeSlideIn delay={100} style={{ marginBottom: 16 }}>
        <GMPSectionCard
          title="Month by month"
          subtitle={year === "All" ? "Every month on record — change the Year filter to focus on one year" : `Each month of ${year}`}
          ui={ui}
        >
          <GMPMonthlySummary data={monthly} ui={ui} loading={loading} />
        </GMPSectionCard>
      </FadeSlideIn>

      {/* ── Breakdowns ── */}
      <div style={{ marginTop: 28 }}>
        <SectionHeading index={2} title="Breakdowns" subtitle="Volume sliced by category, geography and type" ui={ui} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16, marginBottom: 16 }}>
        <FadeSlideIn delay={100}>
          <GMPSectionCard title="By establishment category" ui={ui}>
            {loading ? <SkeletonBox height={160} ui={ui} /> : <BreakdownBarChart items={category?.by_est_category ?? []} ui={ui} darkMode={darkMode} emptyLabel="No category data" singleColor="#2f6fed" />}
          </GMPSectionCard>
        </FadeSlideIn>
        <FadeSlideIn delay={160}>
          <GMPSectionCard title="Top establishments" subtitle="By record count" ui={ui}>
            {loading ? <SkeletonBox height={160} ui={ui} /> : <BreakdownBarChart items={category?.top_companies ?? []} ui={ui} darkMode={darkMode} emptyLabel="No establishment data" singleColor="#0f8a72" />}
          </GMPSectionCard>
        </FadeSlideIn>
        <FadeSlideIn delay={180}>
          <GMPSectionCard title="By type of issuance" ui={ui}>
            {loading ? <SkeletonBox height={160} ui={ui} /> : <BreakdownBarChart items={category?.by_issuance_type ?? []} ui={ui} darkMode={darkMode} emptyLabel="No issuance-type data" singleColor="#06b6d4" />}
          </GMPSectionCard>
        </FadeSlideIn>
        <FadeSlideIn delay={200}>
          <GMPSectionCard title="By transaction type" ui={ui}>
            {loading ? <SkeletonBox height={160} ui={ui} /> : <BreakdownBarChart items={category?.by_transaction_type ?? []} ui={ui} darkMode={darkMode} emptyLabel="No transaction-type data" singleColor="#2f6fed" />}
          </GMPSectionCard>
        </FadeSlideIn>
        <FadeSlideIn delay={220}>
          <GMPSectionCard title="Issuances per DTN" subtitle="How many issuance records share the same DTN" ui={ui}>
            {loading ? <SkeletonBox height={160} ui={ui} /> : (
              <BreakdownBarChart items={(dtnSummary?.issuance_count_distribution ?? []).map((d) => ({ name: d.label, count: d.count }))} ui={ui} darkMode={darkMode} emptyLabel="No DTN data" singleColor="#7c5cff" limit={8} />
            )}
          </GMPSectionCard>
        </FadeSlideIn>
      </div>

      {/* ── NOD distribution ── */}
      <div style={{ marginTop: 28 }}>
        <SectionHeading index={3} title="NOD count distribution" subtitle="Number of deficiency notices per record" ui={ui} />
      </div>
      <FadeSlideIn delay={240} style={{ marginBottom: 16 }}>
        <GMPSectionCard title="Distribution" ui={ui}>
          {loading ? <SkeletonBox height={160} ui={ui} /> : (
            <BreakdownBarChart items={(nod?.distribution ?? []).map((d) => ({ name: d.label, count: d.count }))} singleColor="#b9740f" ui={ui} darkMode={darkMode} emptyLabel="No NOD data" limit={8} />
          )}
        </GMPSectionCard>
      </FadeSlideIn>

      {/* ── Data quality & process auditing ── */}
      <div style={{ marginTop: 28 }}>
        <SectionHeading index={4} title="Data quality & process auditing" subtitle="Records worth a second look, and where time is spent" ui={ui} />
      </div>
      <FadeSlideIn delay={240} style={{ marginBottom: 16 }}>
        <GMPSectionCard
          title="Data completeness"
          subtitle="How complete the Date Received, Released Date and Type of Issuance fields are — click a red number to see the records"
          ui={ui}
        >
          <GMPDataCompleteness ui={ui} />
        </GMPSectionCard>
      </FadeSlideIn>
      <FadeSlideIn delay={280}>
        <GMPSectionCard title="Workflow step timing" subtitle="Average working days spent per step, Decking → OD Releasing — weekends not counted" ui={ui}>
          <StepTimingChart data={stepTiming} darkMode={darkMode} ui={ui} loading={loading} />
        </GMPSectionCard>
      </FadeSlideIn>
    </div>
  );
}
