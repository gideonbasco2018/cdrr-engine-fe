// src/components/gmp/dashboard/GMPAnalyticsTab.jsx
// "Analytics" — the historical/compositional half of FGMP Monitoring &
// Analytics: trends over time, how volume breaks down, and data worth a
// second look. Live per-record status and current workload live in the
// sibling Monitoring tab instead.
import { FadeSlideIn } from "../../monitoring/analytics/KpiCard";
import { GMPSectionCard } from "./GMPSectionCard";
import {
  SectionHeading, SkeletonBox, TrendChartPanel, StepTimingChart,
  BreakdownBarChart, MismatchList,
} from "./gmpAnalyticsShared";

export default function GMPAnalyticsTab({
  ui, darkMode, loading,
  trend, category, dtnSummary, picsCountry, nod, stepTiming,
}) {
  return (
    <div>
      {/* ── Trend ── */}
      <SectionHeading index={1} title="Applications over time" subtitle="Received, released & disapproved counts" ui={ui} />
      <FadeSlideIn delay={80} style={{ marginBottom: 16 }}>
        <GMPSectionCard title="Volume trend" ui={ui}>
          <TrendChartPanel data={trend} darkMode={darkMode} ui={ui} loading={loading} />
        </GMPSectionCard>
      </FadeSlideIn>

      {/* ── Breakdowns ── */}
      <div style={{ marginTop: 28 }}>
        <SectionHeading index={2} title="Breakdowns" subtitle="Volume sliced by category, geography and type" ui={ui} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16, marginBottom: 16 }}>
        <FadeSlideIn delay={100}>
          <GMPSectionCard title="By establishment category" ui={ui}>
            {loading ? <SkeletonBox height={160} ui={ui} /> : <BreakdownBarChart items={category?.by_est_category ?? []} ui={ui} darkMode={darkMode} emptyLabel="No category data" />}
          </GMPSectionCard>
        </FadeSlideIn>
        <FadeSlideIn delay={120}>
          <GMPSectionCard title="PIC/S vs Non-PIC/S" ui={ui}>
            {loading ? <SkeletonBox height={160} ui={ui} /> : <BreakdownBarChart items={category?.by_pics_nonpics ?? []} ui={ui} darkMode={darkMode} emptyLabel="No PIC/S data" />}
          </GMPSectionCard>
        </FadeSlideIn>
        <FadeSlideIn delay={140}>
          <GMPSectionCard title="By manufacturer country" subtitle="Parsed from address vs picscheme.org/en/members" ui={ui}>
            {loading ? <SkeletonBox height={160} ui={ui} /> : <BreakdownBarChart items={picsCountry?.by_country ?? []} ui={ui} darkMode={darkMode} emptyLabel="No manufacturer address data" />}
          </GMPSectionCard>
        </FadeSlideIn>
        <FadeSlideIn delay={160}>
          <GMPSectionCard title="Top establishments" subtitle="By record count" ui={ui}>
            {loading ? <SkeletonBox height={160} ui={ui} /> : <BreakdownBarChart items={category?.top_companies ?? []} ui={ui} darkMode={darkMode} emptyLabel="No establishment data" />}
          </GMPSectionCard>
        </FadeSlideIn>
        <FadeSlideIn delay={180}>
          <GMPSectionCard title="By type of issuance" ui={ui}>
            {loading ? <SkeletonBox height={160} ui={ui} /> : <BreakdownBarChart items={category?.by_issuance_type ?? []} ui={ui} darkMode={darkMode} emptyLabel="No issuance-type data" />}
          </GMPSectionCard>
        </FadeSlideIn>
        <FadeSlideIn delay={200}>
          <GMPSectionCard title="By transaction type" ui={ui}>
            {loading ? <SkeletonBox height={160} ui={ui} /> : <BreakdownBarChart items={category?.by_transaction_type ?? []} ui={ui} darkMode={darkMode} emptyLabel="No transaction-type data" />}
          </GMPSectionCard>
        </FadeSlideIn>
        <FadeSlideIn delay={220}>
          <GMPSectionCard title="Issuances per DTN" subtitle="How many issuance records share the same DTN" ui={ui}>
            {loading ? <SkeletonBox height={160} ui={ui} /> : (
              <BreakdownBarChart items={(dtnSummary?.issuance_count_distribution ?? []).map((d) => ({ name: d.label, count: d.count }))} ui={ui} darkMode={darkMode} emptyLabel="No DTN data" />
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
            <BreakdownBarChart items={(nod?.distribution ?? []).map((d) => ({ name: d.label, count: d.count }))} singleColor="#b9740f" ui={ui} darkMode={darkMode} emptyLabel="No NOD data" />
          )}
        </GMPSectionCard>
      </FadeSlideIn>

      {/* ── Data quality & process auditing ── */}
      <div style={{ marginTop: 28 }}>
        <SectionHeading index={4} title="Data quality & process auditing" subtitle="Records worth a second look, and where time is spent" ui={ui} />
      </div>
      <FadeSlideIn delay={260} style={{ marginBottom: 16 }}>
        <GMPSectionCard
          title="Possible PIC/S classification mismatches"
          subtitle={picsCountry
            ? `${picsCountry.mismatch_count.toLocaleString()} record${picsCountry.mismatch_count === 1 ? "" : "s"} where the selected PIC/S / Non-PIC/S value doesn't match the manufacturer's detected country — worth a second look, not confirmed errors`
            : "Records where the selected PIC/S / Non-PIC/S value doesn't match the manufacturer's detected country"}
          ui={ui}
        >
          {loading ? <SkeletonBox height={160} ui={ui} /> : (
            <MismatchList items={picsCountry?.mismatches ?? []} totalCount={picsCountry?.mismatch_count ?? 0} ui={ui} darkMode={darkMode} emptyLabel="No mismatches detected" />
          )}
        </GMPSectionCard>
      </FadeSlideIn>
      <FadeSlideIn delay={280}>
        <GMPSectionCard title="Workflow step timing" subtitle="Average calendar days spent per step, Decking → OD Releasing" ui={ui}>
          <StepTimingChart data={stepTiming} darkMode={darkMode} ui={ui} loading={loading} />
        </GMPSectionCard>
      </FadeSlideIn>
    </div>
  );
}
