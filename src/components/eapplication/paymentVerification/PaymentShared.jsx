// src/components/eapplication/paymentVerification/PaymentShared.jsx
// Shared building blocks for the payment verification flow
// (PDF viewer, Order of Payment header/sections, confirm dialogs).
import { useEffect, useState } from "react";

const BANCNET_FEE_NOTE = "Php15.00";

const OOP_LOGOS = {
  fda: "/images/fda-logo.png",
  doh: "/images/doh-logo.png",
  bagongPilipinas: "/images/bagong-pilipinas-logo.png",
};

const php = (n) =>
  `Php ${Number(n || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const peso = (n) =>
  `₱${Number(n || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

/* ── PDF viewer. Uses an iframe when pdfUrl is provided; otherwise renders the children (paper preview) ── */
export function PdfViewer({
  colors,
  fileName,
  pdfUrl,
  defaultZoom = 0.7,
  multiPage = false, // children are already full A4 pages
  children,
  // Optional: merged into the page itself, for documents printed on a
  // letterhead (see FgmpIssuancePapers.jsx). Omitted = the plain white page.
  pageStyle,
}) {
  const [zoom, setZoom] = useState(defaultZoom);
  /* Full screen fills the window so a whole A4 page can be read at once */
  const [fullScreen, setFullScreen] = useState(false);

  useEffect(() => {
    if (!fullScreen) return;
    const onKey = (e) => e.key === "Escape" && setFullScreen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fullScreen]);
  const zoomBtn = {
    width: "24px",
    height: "24px",
    border: `1px solid ${colors.cardBorder}`,
    borderRadius: "5px",
    background: colors.cardBg,
    color: colors.textPrimary,
    cursor: "pointer",
    fontSize: "0.8rem",
    lineHeight: 1,
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        border: `1px solid ${colors.cardBorder}`,
        borderRadius: fullScreen ? 0 : "10px",
        overflow: "hidden",
        height: "100%",
        minHeight: "360px",
        ...(fullScreen && {
          position: "fixed",
          inset: 0,
          height: "100vh",
          zIndex: 10050, // above the details popup
          background: colors.cardBg,
        }),
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0.45rem 0.75rem",
          background: colors.tableBg,
          borderBottom: `1px solid ${colors.cardBorder}`,
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontSize: "0.68rem",
            fontWeight: 600,
            color: colors.textPrimary,
          }}
        >
          📄 {fileName} · A4
        </span>
        {!pdfUrl && (
          <div
            style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}
          >
            <button
              style={zoomBtn}
              onClick={() =>
                setZoom((z) => Math.max(0.3, +(z - 0.1).toFixed(1)))
              }
            >
              −
            </button>
            <span
              style={{
                fontSize: "0.62rem",
                color: colors.textTertiary,
                minWidth: "34px",
                textAlign: "center",
              }}
            >
              {Math.round(zoom * 100)}%
            </span>
            <button
              style={zoomBtn}
              onClick={() =>
                setZoom((z) => Math.min(1.5, +(z + 0.1).toFixed(1)))
              }
            >
              +
            </button>
            <button
              style={{
                ...zoomBtn,
                width: "auto",
                padding: "0 0.5rem",
                // the +/− glyphs need 0.8rem; this is text, so match the
                // toolbar's own size
                fontSize: "0.62rem",
                fontWeight: 600,
                letterSpacing: "0.01em",
                whiteSpace: "nowrap",
              }}
              title={
                fullScreen ? "Leave full screen (Esc)" : "Read full screen"
              }
              onClick={() => setFullScreen((f) => !f)}
            >
              {fullScreen ? "⤡ Exit" : "⤢ Full screen"}
            </button>
          </div>
        )}
      </div>

      {pdfUrl ? (
        <iframe
          title={fileName}
          src={pdfUrl}
          style={{ flex: 1, border: "none", width: "100%" }}
        />
      ) : multiPage ? (
        <div
          style={{
            flex: 1,
            overflow: "auto",
            background: "#6b7280",
            padding: "1rem",
          }}
        >
          <div
            style={{
              zoom,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "24px",
            }}
          >
            {children}
          </div>
        </div>
      ) : (
        <div
          style={{
            flex: 1,
            overflow: "auto",
            background: "#6b7280",
            padding: "1rem",
          }}
        >
          <div
            style={{
              zoom,
              width: "794px",
              minHeight: "1123px",
              boxSizing: "border-box",
              margin: "0 auto",
              background: "#fff",
              color: "#111",
              padding: "72px 64px",
              boxShadow: "0 4px 16px rgba(0,0,0,0.35)",
              fontSize: "14px",
              lineHeight: 1.7,
              fontFamily: "Georgia, 'Times New Roman', serif",
              ...pageStyle,
            }}
          >
            {children}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Modern step progress bar (circles + connecting lines) ── */
export function StepProgress({ steps, step, colors }) {
  const GREEN = "#4CAF50";
  const CIRCLE = 28;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        padding: "0.9rem 1.75rem 0.8rem",
        background: colors.cardBg,
        borderBottom: `1px solid ${colors.cardBorder}`,
        flexShrink: 0,
      }}
    >
      {steps.map((s, i) => {
        const active = step === s.id;
        const done = step > s.id;
        const isLast = i === steps.length - 1;

        return (
          <div
            key={s.id}
            style={{
              display: "flex",
              alignItems: "flex-start",
              flex: isLast ? "0 0 auto" : 1,
              minWidth: 0,
            }}
          >
            {/* Circle + label */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "0.4rem",
                minWidth: "96px",
                maxWidth: "150px",
              }}
            >
              <span
                style={{
                  width: `${CIRCLE}px`,
                  height: `${CIRCLE}px`,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  boxSizing: "border-box",
                  background: active || done ? GREEN : "transparent",
                  color: active || done ? "#fff" : colors.textTertiary,
                  border:
                    active || done
                      ? `2px solid ${GREEN}`
                      : `2px solid ${colors.cardBorder}`,
                  boxShadow: active ? "0 0 0 4px rgba(76,175,80,0.2)" : "none",
                  transition: "all 0.25s ease",
                }}
              >
                {done ? "✓" : s.id}
              </span>
              <span
                style={{
                  fontSize: "0.68rem",
                  lineHeight: 1.3,
                  textAlign: "center",
                  fontWeight: active ? 700 : 500,
                  color: active
                    ? colors.textPrimary
                    : done
                      ? colors.textPrimary
                      : colors.textTertiary,
                  opacity: done ? 0.75 : 1,
                  transition: "color 0.25s ease",
                }}
              >
                <span style={{ marginRight: "0.25rem" }}>{s.icon}</span>
                {s.label}
              </span>
            </div>

            {/* Connector line to the next step */}
            {!isLast && (
              <div
                style={{
                  flex: 1,
                  height: "2px",
                  marginTop: `${CIRCLE / 2 - 1}px`,
                  borderRadius: "2px",
                  background: done ? GREEN : colors.cardBorder,
                  transition: "background 0.25s ease",
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function LogoImage({ src, alt, width, height }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div
        style={{
          width,
          height,
          border: "1px dashed #999",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "11px",
          color: "#555",
          textAlign: "center",
          flexShrink: 0,
        }}
      >
        {alt}
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      onError={() => setFailed(true)}
      style={{ width, height, objectFit: "contain", flexShrink: 0 }}
    />
  );
}

/* ── Paper pieces (Order of Payment / Acknowledgement Receipt) ── */
export function OopHeader({ title, subtitle }) {
  return (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "14px",
          marginBottom: "20px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <LogoImage
            src={OOP_LOGOS.fda}
            alt="FDA logo"
            width="110px"
            height="64px"
          />
          <LogoImage
            src={OOP_LOGOS.doh}
            alt="DOH seal"
            width="64px"
            height="64px"
          />
        </div>
        <div
          style={{
            borderLeft: "1px solid #111",
            paddingLeft: "14px",
            flex: 1,
            lineHeight: 1.35,
          }}
        >
          <div style={{ fontSize: "14px" }}>Republic of the Philippines</div>
          <div style={{ fontSize: "16px" }}>Department of Health</div>
          <div style={{ fontSize: "16px", fontWeight: 700 }}>
            FOOD AND DRUG ADMINISTRATION
          </div>
        </div>
        <LogoImage
          src={OOP_LOGOS.bagongPilipinas}
          alt="Bagong Pilipinas"
          width="96px"
          height="64px"
        />
      </div>
      <div
        style={{
          textAlign: "center",
          fontSize: "22px",
          fontWeight: 700,
          letterSpacing: "1px",
          margin: "14px 0 4px",
        }}
      >
        {title}
      </div>
      {subtitle && (
        <div
          style={{
            textAlign: "center",
            fontSize: "13px",
            fontWeight: 700,
            marginBottom: "10px",
          }}
        >
          {subtitle}
        </div>
      )}
    </>
  );
}

export function OopSection({ title, rows }) {
  return (
    <div style={{ margin: "16px 0" }}>
      <div
        style={{
          fontWeight: 700,
          textDecoration: "underline",
          marginBottom: "4px",
        }}
      >
        {title}
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <tbody>
          {rows.map(([label, value, bold]) => (
            <tr key={label}>
              <td
                style={{
                  width: "38%",
                  padding: "3px 0",
                  verticalAlign: "top",
                  fontWeight: bold ? 700 : 400,
                  borderTop: bold ? "1px solid #111" : "none",
                }}
              >
                {label}
              </td>
              <td
                style={{
                  padding: "3px 0",
                  verticalAlign: "top",
                  fontWeight: bold ? 700 : 400,
                  borderTop: bold ? "1px solid #111" : "none",
                }}
              >
                {value}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function OopNotices({ bancnetAmount }) {
  return (
    <div style={{ color: "#c00000", fontSize: "12.5px", lineHeight: 1.45 }}>
      <p style={{ margin: "0 0 8px" }}>
        Your application has passed the pre-assessment phase. Please pay the
        corresponding amount indicated above. Evaluation of your application
        shall commence after a payment was made and posted on our system. Kindly
        present this document upon payment thru landbank.
      </p>
      <p style={{ margin: "0 0 8px" }}>
        If payment is made using Bancnet Online Bills Payment Facility
        (www.bancnetonline.com), an additional {BANCNET_FEE_NOTE} should be
        included to the amount due.
      </p>
      <p style={{ margin: 0, fontSize: "14px" }}>
        BancNet Amount: <strong>{php(bancnetAmount)}</strong>
      </p>
    </div>
  );
}

/* ── Confirmation dialogs ── */
export function ConfirmPostModal({
  row,
  colors,
  totalPaid,
  balance,
  hasBalance,
  onConfirm,
  onCancel,
}) {
  return (
    <div
      onClick={onCancel}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10001,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: colors.cardBg,
          border: `1px solid ${colors.cardBorder}`,
          borderRadius: "12px",
          padding: "1.25rem",
          width: "400px",
          maxWidth: "90vw",
          boxShadow: "0 12px 32px rgba(0,0,0,0.35)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            marginBottom: "0.6rem",
          }}
        >
          <span style={{ fontSize: "1.3rem" }}>❓</span>
          <h3
            style={{
              margin: 0,
              fontSize: "0.95rem",
              fontWeight: 700,
              color: colors.textPrimary,
            }}
          >
            Are you sure you want to post?
          </h3>
        </div>
        <p
          style={{
            margin: "0 0 0.6rem",
            fontSize: "0.75rem",
            color: colors.textTertiary,
            lineHeight: 1.5,
          }}
        >
          You are about to post a payment of{" "}
          <strong style={{ color: colors.textPrimary }}>
            {peso(totalPaid)}
          </strong>{" "}
          for{" "}
          <strong style={{ color: colors.textPrimary }}>
            {row.referenceNo}
          </strong>
          . This cannot be changed after posting.
        </p>
        {hasBalance && (
          <p
            style={{
              margin: "0 0 0.9rem",
              padding: "0.5rem 0.65rem",
              fontSize: "0.72rem",
              lineHeight: 1.5,
              color: "#b45309",
              background: "rgba(245,158,11,0.12)",
              border: "1px solid rgba(245,158,11,0.35)",
              borderRadius: "8px",
            }}
          >
            ⚠️ The payment is short by <strong>{peso(balance)}</strong>. An
            Additional Order of Payment will be generated for the balance.
          </p>
        )}
        <div
          style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}
        >
          <button
            onClick={onCancel}
            style={{
              padding: "0.45rem 0.9rem",
              fontSize: "0.72rem",
              fontWeight: 600,
              borderRadius: "6px",
              border: `1px solid ${colors.cardBorder}`,
              background: "transparent",
              color: colors.textPrimary,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: "0.45rem 0.9rem",
              fontSize: "0.72rem",
              fontWeight: 700,
              borderRadius: "6px",
              border: "none",
              background: "linear-gradient(135deg,#4CAF50,#43A047)",
              color: "#fff",
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(76,175,80,0.35)",
            }}
          >
            ✔ Yes, Post
          </button>
        </div>
      </div>
    </div>
  );
}

export function ConfirmAddPaymentModal({
  colors,
  payment,
  amountDue,
  paidSoFar,
  onConfirm,
  onCancel,
}) {
  const amount = Number(payment.amountPaid);
  const projected = +(paidSoFar + amount).toFixed(2);
  const diff = +(projected - amountDue).toFixed(2); // > 0 overpaid, < 0 short

  const status =
    diff > 0
      ? {
          icon: "⚠️",
          color: "#b45309",
          bg: "rgba(245,158,11,0.12)",
          border: "rgba(245,158,11,0.35)",
          text: `Overpayment: the total paid (${peso(projected)}) exceeds the amount due by ${peso(diff)}. Please confirm this is correct.`,
        }
      : diff < 0
        ? {
            icon: "⚠️",
            color: "#dc2626",
            bg: "rgba(239,68,68,0.10)",
            border: "rgba(239,68,68,0.35)",
            text: `Short payment: ${peso(-diff)} will still be unpaid after this payment. Confirm only if the payer really paid less than the amount due. You can still add another payment.`,
          }
        : {
            icon: "✅",
            color: "#059669",
            bg: "rgba(16,185,129,0.10)",
            border: "rgba(16,185,129,0.35)",
            text: "The total paid matches the amount due.",
          };

  const details = [
    ["Reference Number", payment.referenceNo],
    ["Type of Payment", payment.paymentType],
    ["OR Number", payment.orNo],
    ["Date of Payment", payment.dateOfPayment],
    ["Amount Paid", peso(amount)],
  ];

  return (
    <div
      onClick={onCancel}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10001,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: colors.cardBg,
          border: `1px solid ${colors.cardBorder}`,
          borderRadius: "12px",
          padding: "1.25rem",
          width: "420px",
          maxWidth: "90vw",
          boxShadow: "0 12px 32px rgba(0,0,0,0.35)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            marginBottom: "0.7rem",
          }}
        >
          <span style={{ fontSize: "1.3rem" }}>🧾</span>
          <h3
            style={{
              margin: 0,
              fontSize: "0.95rem",
              fontWeight: 700,
              color: colors.textPrimary,
            }}
          >
            Confirm payment details
          </h3>
        </div>

        <div
          style={{
            border: `1px solid ${colors.cardBorder}`,
            borderRadius: "8px",
            padding: "0.5rem 0.75rem",
            marginBottom: "0.7rem",
          }}
        >
          {details.map(([label, value]) => (
            <div
              key={label}
              style={{
                display: "flex",
                gap: "0.75rem",
                padding: "0.22rem 0",
                fontSize: "0.72rem",
              }}
            >
              <span
                style={{
                  width: "120px",
                  flexShrink: 0,
                  color: colors.textTertiary,
                }}
              >
                {label}
              </span>
              <span style={{ color: colors.textPrimary, fontWeight: 600 }}>
                {value}
              </span>
            </div>
          ))}
        </div>

        <div
          style={{
            border: `1px solid ${colors.cardBorder}`,
            borderRadius: "8px",
            padding: "0.5rem 0.75rem",
            marginBottom: "0.7rem",
            fontSize: "0.7rem",
            color: colors.textPrimary,
            display: "flex",
            flexDirection: "column",
            gap: "0.2rem",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: colors.textTertiary }}>Amount due</span>
            <span>{peso(amountDue)}</span>
          </div>
          {paidSoFar > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: colors.textTertiary }}>
                Already added this visit
              </span>
              <span>{peso(paidSoFar)}</span>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: colors.textTertiary }}>
              Total paid after this payment
            </span>
            <span style={{ fontWeight: 700 }}>{peso(projected)}</span>
          </div>
        </div>

        <p
          style={{
            margin: "0 0 0.9rem",
            padding: "0.5rem 0.65rem",
            fontSize: "0.72rem",
            lineHeight: 1.5,
            color: status.color,
            background: status.bg,
            border: `1px solid ${status.border}`,
            borderRadius: "8px",
          }}
        >
          {status.icon} {status.text}
        </p>

        <div
          style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}
        >
          <button
            onClick={onCancel}
            style={{
              padding: "0.45rem 0.9rem",
              fontSize: "0.72rem",
              fontWeight: 600,
              borderRadius: "6px",
              border: `1px solid ${colors.cardBorder}`,
              background: "transparent",
              color: colors.textPrimary,
              cursor: "pointer",
            }}
          >
            Go Back & Edit
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: "0.45rem 0.9rem",
              fontSize: "0.72rem",
              fontWeight: 700,
              borderRadius: "6px",
              border: "none",
              background: "linear-gradient(135deg,#4CAF50,#43A047)",
              color: "#fff",
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(76,175,80,0.35)",
            }}
          >
            ✔ Confirm & Add Payment
          </button>
        </div>
      </div>
    </div>
  );
}
