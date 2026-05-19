import { formatDate } from "./utils";
import { getTheme } from "./theme";

export function ReviewStep({ record, deckerData, darkMode }) {
  const t = getTheme(darkMode);

  const sections = [
    { label: "DTN", value: record?.dtn },
    { label: "Company", value: record?.ltoComp },
    { label: "Product", value: record?.prodBrName },
    { label: "Application Type", value: record?.appType },
    { label: "Date Received", value: formatDate(record?.dateReceivedCent) },
  ];

  return (
    <div
      style={{
        background: t.cardBg,
        border: `1px solid ${t.cardBorder}`,
        borderRadius: 12,
        boxShadow: t.cardShadow,
        overflow: "hidden",
        marginBottom: "1rem",
      }}
    >
      <div
        style={{
          padding: "11px 16px",
          borderBottom: `1px solid ${t.cardBorder}`,
          display: "flex",
          alignItems: "center",
        }}
      >
        <span
          style={{
            fontSize: 10.5,
            fontWeight: 700,
            color: t.sectionTitle,
            textTransform: "uppercase",
            letterSpacing: "0.7px",
          }}
        >
          Review Summary
        </span>
      </div>
      <div style={{ padding: "16px" }}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {sections.map(({ label, value }, i) => (
            <div
              key={label}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 14,
                padding: "9px 0",
                borderBottom:
                  i < sections.length - 1
                    ? `1px solid ${t.sectionBorder}`
                    : "none",
              }}
            >
              <span
                style={{
                  fontSize: 12.5,
                  color: t.textTertiary,
                  flexShrink: 0,
                  minWidth: 130,
                }}
              >
                {label}
              </span>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  textAlign: "right",
                  wordBreak: "break-word",
                  color:
                    label === "Decision" && value !== "—"
                      ? t.accent
                      : t.textPrimary,
                }}
              >
                {value}
              </span>
            </div>
          ))}
        </div>
        <div
          style={{
            marginTop: 16,
            padding: "11px 14px",
            borderRadius: 9,
            background: t.warnBg,
            border: `1px solid ${t.warnBorder}`,
            color: t.warnText,
            fontSize: 12.5,
            display: "flex",
            gap: 8,
            alignItems: "flex-start",
            lineHeight: 1.55,
          }}
        >
          <svg
            width="14"
            height="14"
            fill="none"
            stroke={t.warnText}
            strokeWidth="2"
            viewBox="0 0 24 24"
            style={{ flexShrink: 0, marginTop: 1 }}
          >
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          Please review all information carefully before submitting. This action
          will create activity logs and cannot be undone.
        </div>
      </div>
    </div>
  );
}
