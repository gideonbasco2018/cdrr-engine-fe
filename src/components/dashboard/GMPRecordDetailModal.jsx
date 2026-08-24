// Read-only glance view of a GMP record, opened from the GMP dashboard's
// Recent Applications / metric-detail rows. Deliberately simpler than
// GMPApplicationInfoModal (queue workflow tool with editing/reopen actions) —
// this is a dashboard "view details" popup, not a workflow surface.
import { useState, useEffect } from "react";
import { getGMPRecord } from "../../api/gmp";
import { FB } from "./constants";

function cleanValue(v) {
  if (v === null || v === undefined || v === "" || v === "N/A") return null;
  return String(v);
}

function FieldRow({ label, value, ui, wrap = false }) {
  const clean = cleanValue(value);
  return (
    <div
      style={{
        padding: "0.4rem 0.6rem",
        background: ui.inputBg,
        border: `1px solid ${ui.cardBorder}`,
        borderRadius: 6,
        display: "flex",
        flexDirection: "column",
        gap: 2,
        minWidth: 0,
        gridColumn: wrap ? "1 / -1" : undefined,
      }}
    >
      <span
        style={{
          fontSize: "0.62rem",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          color: ui.textMuted,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: "0.78rem",
          fontWeight: clean ? 600 : 400,
          color: clean ? ui.textPrimary : ui.textMuted,
          fontStyle: clean ? "normal" : "italic",
          whiteSpace: wrap ? "normal" : "nowrap",
          overflow: wrap ? "visible" : "hidden",
          textOverflow: wrap ? "clip" : "ellipsis",
          lineHeight: 1.4,
          wordBreak: wrap ? "break-word" : "normal",
        }}
        title={!wrap ? (clean ?? undefined) : undefined}
      >
        {clean ?? "—"}
      </span>
    </div>
  );
}

export default function GMPRecordDetailModal({ gmpId, onClose, ui, darkMode }) {
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getGMPRecord(gmpId)
      .then((rec) => {
        if (!cancelled) setRecord(rec);
      })
      .catch((err) => {
        if (!cancelled)
          setError(err?.response?.data?.detail || err.message || "Failed to load record");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [gmpId]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1100,
        background: "rgba(0,0,0,0.52)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: ui.cardBg,
          border: `1px solid ${ui.cardBorder}`,
          borderRadius: 14,
          width: "100%",
          maxWidth: 780,
          maxHeight: "88vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 8px 40px rgba(0,0,0,0.28)",
        }}
      >
        <div
          style={{
            padding: "16px 20px",
            borderBottom: `1px solid ${ui.divider}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: `${FB}18`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.2rem",
              }}
            >
              🏭
            </div>
            <div>
              <h3
                style={{
                  margin: 0,
                  fontSize: "1rem",
                  fontWeight: 700,
                  color: ui.textPrimary,
                }}
              >
                GMP Record {record?.GMP_DTN ? `— DTN ${record.GMP_DTN}` : ""}
              </h3>
              <p style={{ margin: 0, fontSize: "0.75rem", color: ui.textSub }}>
                {record?.GMP_REFERENCE_NO || "—"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: ui.inputBg,
              border: `1px solid ${ui.cardBorder}`,
              borderRadius: 8,
              width: 32,
              height: 32,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: ui.textMuted,
              fontSize: "1rem",
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ overflowY: "auto", flex: 1, minHeight: 0, padding: 16 }}>
          {loading && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: 8,
              }}
            >
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    height: 44,
                    borderRadius: 6,
                    background: ui.progressBg,
                    animation: "cdrrPulse 1.2s ease-in-out infinite",
                  }}
                />
              ))}
            </div>
          )}

          {!loading && error && (
            <div
              style={{
                padding: "2rem",
                textAlign: "center",
                color: "#e02020",
                fontSize: "0.84rem",
              }}
            >
              ⚠️ {error}
            </div>
          )}

          {!loading && !error && record && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: 8,
              }}
            >
              <FieldRow label="LTO Company" value={record.GMP_LTO_COMPANY} ui={ui} wrap />
              <FieldRow label="LTO Number" value={record.GMP_LTO_NUMBER} ui={ui} />
              <FieldRow label="Address" value={record.GMP_LTO_ADDRESS} ui={ui} wrap />
              <FieldRow label="Category" value={record.GMP_EST_CATEGORY} ui={ui} />
              <FieldRow label="Transaction Type" value={record.GMP_TRANSACTION_TYPE} ui={ui} />
              <FieldRow label="Type of Issuance" value={record.GMP_TYPE_OF_ISSUANCE} ui={ui} />
              <FieldRow label="Certificate Number" value={record.GMP_CERTIFICATE_NUMBER} ui={ui} />
              <FieldRow label="Certificate Validity" value={record.GMP_CERTIFICATE_VALIDITY} ui={ui} />
              <FieldRow label="SECPA Number" value={record.GMP_SECPA_NUMBER} ui={ui} />
              <FieldRow label="PIC/S or Non-PIC/S" value={record.GMP_PICS_NONPICS} ui={ui} />
              <FieldRow label="Foreign Manufacturer" value={record.GMP_FOREIGN_MANUFACTURER} ui={ui} wrap />
              <FieldRow label="Manufacturer Address" value={record.GMP_FOREIGN_MANUFACTURER_ADDRESS} ui={ui} wrap />
              <FieldRow label="Current Step" value={record.GMP_CURRENT_STEP} ui={ui} />
              <FieldRow label="Evaluator" value={record.GMP_EVALUATOR} ui={ui} />
              <FieldRow label="Status" value={record.GMP_APP_STATUS} ui={ui} />
              <FieldRow label="Decision" value={record.GMP_DECISION} ui={ui} wrap />
              <FieldRow label="Date Received" value={record.GMP_DATE_RECEIVED} ui={ui} />
              <FieldRow label="Released Date" value={record.GMP_RELEASED_DATE} ui={ui} />
              <FieldRow label="Remarks" value={record.GMP_REMARKS} ui={ui} wrap />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
