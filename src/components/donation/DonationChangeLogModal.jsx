// FILE: src/components/donation/DonationChangeLogModal.jsx
import ModalShell from "./ModalShell";
import { dtlIsBlank, DTLEmptyHint } from "./dtlKit";

export default function DonationChangeLogModal({ record, entries, loading, onClose, colors, darkMode }) {
  return (
    <ModalShell
      onClose={onClose}
      icon="🕐"
      title="Change Log"
      subtitle={record.letterDtn}
      width={700}
      colors={colors}
      footer={
        <div style={{ display: "flex", justifyContent: "center" }}>
          <button
            onClick={onClose}
            style={{
              padding: "0.4rem 1.1rem",
              borderRadius: 8,
              border: "none",
              background: "#4CAF50",
              color: "#fff",
              fontSize: "0.78rem",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Close
          </button>
        </div>
      }
    >
      {loading ? (
        <p
          style={{
            textAlign: "center",
            color: colors.textTertiary,
            fontSize: "0.82rem",
            margin: "0 0 1.25rem",
          }}
        >
          Loading change log...
        </p>
      ) : entries.length === 0 ? (
        <p
          style={{
            textAlign: "center",
            color: colors.textTertiary,
            fontSize: "0.82rem",
            margin: "0 0 1.25rem",
          }}
        >
          No recorded changes for this donation yet.
        </p>
      ) : (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem",
            marginBottom: "0.5rem",
          }}
        >
          {entries.map((entry, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "0.85rem",
                border: `1px solid ${colors.cardBorder}`,
                borderRadius: 10,
                padding: "0.55rem 0.85rem",
                fontSize: "0.78rem",
              }}
            >
              <span
                style={{
                  flex: "0 0 150px",
                  fontWeight: 700,
                  color: colors.textPrimary,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {entry.field}
              </span>
              <span style={{ flex: 1, minWidth: 0, color: colors.textSecondary, wordBreak: "break-word", whiteSpace: "pre-line" }}>
                {dtlIsBlank(entry.from) ? (
                  <DTLEmptyHint colors={colors} />
                ) : (
                  <span style={{ textDecoration: "line-through", opacity: 0.6 }}>{entry.from}</span>
                )}{" "}
                →{" "}
                {dtlIsBlank(entry.to) ? (
                  <DTLEmptyHint colors={colors} />
                ) : (
                  <span style={{ color: colors.textPrimary, fontWeight: 600 }}>{entry.to}</span>
                )}
              </span>
              <span
                style={{
                  flex: "0 0 auto",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  color: colors.textTertiary,
                  fontSize: "0.7rem",
                  whiteSpace: "nowrap",
                }}
              >
                {entry.by && <span style={{ fontStyle: "italic" }}>{entry.by}</span>}
                <span>{entry.at}</span>
              </span>
            </div>
          ))}
        </div>
      )}
    </ModalShell>
  );
}
