import { neuCardBg, neuShadow, neuInputShadow } from "./analyticsHelpers";

export function SkeletonBox({
  width = "100%",
  height = 16,
  radius = 6,
  style: extra = {},
  darkMode,
}) {
  const shimmerBg = darkMode
    ? "linear-gradient(90deg, #252636 25%, #2f3045 50%, #252636 75%)"
    : "linear-gradient(90deg, #e8ecf2 25%, #f4f6f9 50%, #e8ecf2 75%)";
  return (
    <div
      style={{
        width,
        height,
        borderRadius: radius,
        background: shimmerBg,
        backgroundSize: "800px 100%",
        animation: "analytics-shimmer 1.4s infinite linear",
        boxShadow: darkMode
          ? "inset 1px 1px 2px rgba(0,0,0,0.12), inset -1px -1px 2px rgba(60,60,80,0.04)"
          : "inset 1px 1px 3px rgba(0,0,0,0.05), inset -1px -1px 2px rgba(255,255,255,0.7)",
        flexShrink: 0,
        ...extra,
      }}
    />
  );
}

export function KpiCardSkeleton({ darkMode, index = 0 }) {
  const accents = [
    "#1877F2",
    "#36a420",
    "#e02020",
    "#f59e0b",
    "#0891b2",
    "#9333ea",
  ];
  const accent = accents[index % accents.length];
  return (
    <div
      style={{
        background: neuCardBg(darkMode),
        borderRadius: 16,
        padding: "16px 18px",
        boxShadow: neuShadow(darkMode),
        borderTop: `3px solid ${accent}30`,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        animation:
          "analytics-fade-slide-up 0.4s ease both, analytics-pulse-soft 2s ease-in-out infinite",
        animationDelay: `${index * 70}ms`,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <SkeletonBox width={70} height={10} darkMode={darkMode} />
        <SkeletonBox width={32} height={32} radius={10} darkMode={darkMode} />
      </div>
      <SkeletonBox width={80} height={32} radius={6} darkMode={darkMode} />
      <SkeletonBox width={110} height={9} radius={4} darkMode={darkMode} />
    </div>
  );
}

export function SectionCardSkeleton({
  height = 220,
  darkMode,
  children,
  delay = 0,
}) {
  return (
    <div
      style={{
        background: neuCardBg(darkMode),
        borderRadius: 16,
        overflow: "hidden",
        boxShadow: neuShadow(darkMode),
        animation:
          "analytics-fade-slide-up 0.45s ease both, analytics-pulse-soft 2.2s ease-in-out infinite",
        animationDelay: `${delay}ms`,
      }}
    >
      <div
        style={{
          padding: "14px 18px 12px",
          display: "flex",
          gap: 10,
          alignItems: "center",
          borderBottom: `1px solid ${darkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)"}`,
        }}
      >
        <SkeletonBox width={16} height={16} radius={4} darkMode={darkMode} />
        <SkeletonBox width={160} height={14} radius={4} darkMode={darkMode} />
      </div>
      <div style={{ padding: "16px 18px" }}>
        {children || (
          <SkeletonBox
            width="100%"
            height={height}
            radius={8}
            darkMode={darkMode}
          />
        )}
      </div>
    </div>
  );
}

export function AnalyticsSkeleton({ ui, darkMode }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 16,
        background: "transparent",
        padding: 16,
        borderRadius: 20,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          flexWrap: "wrap",
          gap: 12,
          animation: "analytics-fade-slide-up 0.35s ease both",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <SkeletonBox width={220} height={18} radius={5} darkMode={darkMode} />
          <SkeletonBox width={280} height={11} radius={4} darkMode={darkMode} />
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {[200, 90, 110, 88].map((w, i) => (
            <SkeletonBox
              key={i}
              width={w}
              height={34}
              radius={12}
              darkMode={darkMode}
              style={{ boxShadow: neuShadow(darkMode) }}
            />
          ))}
        </div>
      </div>

      {/* KPI cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(6, 1fr)",
          gap: 10,
        }}
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <KpiCardSkeleton key={i} darkMode={darkMode} index={i} />
        ))}
      </div>

      {/* Trend + Donut */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 14 }}>
        <SectionCardSkeleton height={220} darkMode={darkMode} delay={480}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", gap: 14, marginBottom: 4 }}>
              {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonBox
                  key={i}
                  width={80}
                  height={10}
                  radius={4}
                  darkMode={darkMode}
                />
              ))}
            </div>
            <SkeletonBox
              width="100%"
              height={200}
              radius={8}
              darkMode={darkMode}
            />
          </div>
        </SectionCardSkeleton>
        <SectionCardSkeleton darkMode={darkMode} delay={560}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <SkeletonBox
              width={160}
              height={160}
              radius={999}
              darkMode={darkMode}
            />
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  style={{ display: "flex", flexDirection: "column", gap: 5 }}
                >
                  <SkeletonBox
                    width="90%"
                    height={10}
                    radius={4}
                    darkMode={darkMode}
                  />
                  <SkeletonBox
                    width="100%"
                    height={5}
                    radius={99}
                    darkMode={darkMode}
                  />
                </div>
              ))}
            </div>
          </div>
        </SectionCardSkeleton>
      </div>

      {/* Table */}
      <SectionCardSkeleton darkMode={darkMode} delay={640}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(6, 1fr)",
                gap: 10,
                opacity: 1 - i * 0.12,
              }}
            >
              {Array.from({ length: 6 }).map((_, j) => (
                <SkeletonBox
                  key={j}
                  width="100%"
                  height={14}
                  radius={4}
                  darkMode={darkMode}
                />
              ))}
            </div>
          ))}
        </div>
      </SectionCardSkeleton>
    </div>
  );
}
