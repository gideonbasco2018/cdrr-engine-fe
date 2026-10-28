// src/components/eapplication/processes/mivn/MivnNotificationForm.jsx
// Notification Form for Minor Variation/s of Registered Pharmaceutical Product.
// 4 A4 pages. The DTN box of the paper form shows the Reference Number.
import { useState } from "react";

const LOGOS = {
  fda: "/images/fda-logo.png",
  doh: "/images/doh-logo.png",
};
const PAGE_COUNT = 4;

const php = (n) =>
  `Php ${Number(n || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

/* "10/7/2026, 10:44:30 AM" -> "10/7/2026" */
const dateOnly = (stamp) => (stamp ? String(stamp).split(",")[0].trim() : "");

/* ── Building blocks ── */
function Page({ number, children }) {
  return (
    <div
      style={{
        width: "794px",
        height: "1123px",
        boxSizing: "border-box",
        position: "relative",
        overflow: "hidden",
        flexShrink: 0,
        background: "#fff",
        color: "#111",
        padding: "40px 56px",
        fontFamily: "'Times New Roman', Times, serif",
        fontSize: "11.5px",
        lineHeight: 1.35,
        boxShadow: "0 4px 16px rgba(0,0,0,0.35)",
      }}
    >
      {children}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: "24px",
          textAlign: "center",
          fontSize: "11px",
          color: "#555",
        }}
      >
        Page {number} of {PAGE_COUNT}
      </div>
    </div>
  );
}

function Logo({ src, alt, width, height }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div
        style={{
          width,
          height,
          border: "1px dashed #999",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "10px",
          color: "#555",
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

/* Label + underlined value */
function Line({ label, value, labelWidth = 150, minHeight = 16 }) {
  return (
    <div
      style={{ display: "flex", alignItems: "flex-end", marginBottom: "3px" }}
    >
      <span style={{ width: labelWidth, flexShrink: 0, fontWeight: 700 }}>
        {label}
      </span>
      <span
        style={{
          flex: 1,
          minHeight,
          borderBottom: "1px solid #000",
          paddingLeft: "4px",
        }}
      >
        {value}
      </span>
    </div>
  );
}

const grayHead = {
  background: "#d9d9d9",
  textAlign: "center",
  fontWeight: 700,
  padding: "2px 4px",
  border: "1px solid #000",
};

/* Small box at the top right of pages 2-4 (the paper form's DTN box) */
function RefBox({ refNo }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "flex-end",
        marginBottom: "26px",
      }}
    >
      <table
        style={{
          width: "217px",
          borderCollapse: "collapse",
          border: "1px solid #000",
          fontSize: "11px",
        }}
      >
        <tbody>
          <tr>
            <td colSpan={2} style={grayHead}>
              REFERENCE NUMBER
            </td>
          </tr>
          <tr>
            <td
              colSpan={2}
              style={{
                textAlign: "center",
                fontWeight: 600,
                padding: "3px 4px",
                border: "1px solid #000",
              }}
            >
              {refNo}
            </td>
          </tr>
          <tr>
            <td
              style={{
                fontWeight: 700,
                padding: "2px 4px",
                whiteSpace: "nowrap",
                width: "1%",
                borderRight: "1px solid #000",
              }}
            >
              Received by:
            </td>
            <td />
          </tr>
        </tbody>
      </table>
    </div>
  );
}

const tableCell = {
  border: "1px solid #000",
  padding: "3px 6px",
  fontSize: "11px",
};

const DECLARATIONS = [
  "I am duly authorized to bind the establishment I represent pursuant to the authority attached to this Notification Form for Minor Variation/s of registered pharmaceutical product (Board Resolution in case of corporation and Special Power of Attorney in all other cases both of which should be duly notarized).",
  "On behalf of my company, the pharmaceutical product identified in the notification form meets all the legal requirements, and conforms to existing standards and specification requirements applicable to the said product.",
  "All conditions for the variations have been fulfilled and all required supporting documents are submitted.",
  "The particulars given in this notification are true and all data and information of relevance in relation to the notification have been supplied and that the documents enclosed are authentic or true copies.",
  "I agree that the acknowledgement of FDA of this notification shall not preclude the Food and Drug Administration (FDA) in imposing appropriate regulatory actions in the event that there is/are outright negligence on the conditions for minor variation – notification and explicit misdeclaration of the applied changes as notification; lacking and deficient documentary requirements as stipulated in current Circulars on Post-Approval Changes; subsequent findings of misrepresentation in any of the data indicated in the required documents or any of the said documents is subsequently found to be falsified of fraudulently filed; and/or in case the samples of the identified pharmaceutical product collected through post marketing surveillance shall be found not to conform to the product's registered specifications or approved labeling.",
  "The company I represent shall automatically cease and desist from further distributing the identified pharmaceutical product subject of revocation upon receipt of the notice of revocation and pending any administrative proceeding until further notice from FDA.",
];

const UNDERTAKINGS = [
  "Ensure the identified pharmaceutical product's technical and safety information is made readily available to FDA anytime when requested, and to keep records of the distribution of the products for product recall purposes.",
  "Notify FDA of any adverse events consistent with the requirements of pharmacovigilance.",
  "Respond to and cooperate fully with Food-Drug Regulation Officers (FDROs) with regard to any subsequent post-marketing activity initiated by FDA.",
  "Exhaust the remaining stocks of labeling materials and products bearing the old product information up to a maximum of one (1) year from the date of receipt of the notification, at the manufacturing level.",
  "Submit a commercial sample of the first batch of manufacturing/importation/packaging/repackaging of the subject product, for all pack sizes, including the package insert or patient information leaflet (whichever is applicable) reflecting the notified change, as soon as available.",
];

const DECLARATIONS_END = [
  "I understand that our company or establishment cannot place reliance on the acceptance of the notification by FDA in any legal proceedings concerning the above product, in the event that the identified product has failed to conform to any standards or specifications previously declared to FDA.",
  "There is/are no other change/s made to/proposed for the drug product aside from what is/are specified in the Post-Approval Changes Particulars of this Notification Form.",
];

/* payments: already posted payments, shaped as
   { orNo, dateOfPayment, amountPaid } */
export default function MivnNotificationForm({
  refNo,
  formData = {},
  payments = [],
}) {
  const f = (key) => formData[key] || "";
  // "Name, Address" for a company particulars line
  const party = (prefix) =>
    [f(prefix), f(`${prefix} Address`)].filter(Boolean).join(", ");

  const totalPaid = payments.reduce((s, p) => s + Number(p.amountPaid || 0), 0);
  const orNos = [...new Set(payments.map((p) => p.orNo).filter(Boolean))].join(
    ", ",
  );
  const orDates = [
    ...new Set(payments.map((p) => p.dateOfPayment).filter(Boolean)),
  ].join(", ");

  // MiV-N1 → N4 from Minor Notification Details; at least 3 rows like the paper form
  const changes = Object.entries(formData["Minor Notification Details"] || {})
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, v]) => ({
      label,
      current: v?.current || "",
      proposed: v?.proposed_changes || "",
    }));
  const changeRows =
    changes.length >= 3
      ? changes
      : [...changes, ...Array(3 - changes.length).fill(null)];

  const dosage = [
    f("Dosage Strength"),
    f("Dosage Form and Route of Administration"),
  ]
    .filter(Boolean)
    .join(" ");

  const payRow = (label, value) => (
    <tr>
      <td
        style={{
          ...tableCell,
          fontWeight: 700,
          width: "1%",
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </td>
      <td style={tableCell}>{value}</td>
    </tr>
  );

  return (
    <>
      {/* ───────── Page 1 ───────── */}
      <Page number={1}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "14px",
            marginBottom: "14px",
          }}
        >
          <Logo src={LOGOS.doh} alt="DOH seal" width="64px" height="64px" />
          <div
            style={{ textAlign: "center", fontSize: "11px", lineHeight: 1.3 }}
          >
            <div>Republic of the Philippines</div>
            <div>Department of Health</div>
            <div style={{ fontWeight: 700, fontSize: "12px" }}>
              FOOD AND DRUG ADMINISTRATION
            </div>
          </div>
          <Logo src={LOGOS.fda} alt="FDA logo" width="110px" height="52px" />
        </div>

        <div
          style={{
            textAlign: "center",
            fontWeight: 700,
            fontSize: "12.5px",
            marginBottom: "16px",
          }}
        >
          NOTIFICATION FORM FOR MINOR VARIATION/S OF REGISTERED
          <br />
          PHARMACEUTICAL PRODUCT
        </div>

        <div style={{ display: "flex", gap: "30px", marginBottom: "22px" }}>
          <div style={{ flex: 1 }}>
            <div
              style={{
                display: "flex",
                alignItems: "flex-end",
                width: "170px",
              }}
            >
              <b style={{ marginRight: "6px" }}>Date:</b>
              <span
                style={{
                  flex: 1,
                  borderBottom: "1px solid #000",
                  minHeight: "15px",
                }}
              >
                {dateOnly(f("Timestamp"))}
              </span>
            </div>
            <div style={{ marginTop: "34px", fontWeight: 700 }}>
              FOOD AND DRUG ADMINISTRATION
            </div>
            <div>Civic Drive, Filinvest Corporate City</div>
            <div>Alabang, Muntinlupa City</div>
          </div>

          <table
            style={{
              width: "245px",
              borderCollapse: "collapse",
              border: "1px solid #000",
              fontSize: "11px",
              alignSelf: "flex-start",
            }}
          >
            <tbody>
              <tr>
                <td colSpan={2} style={grayHead}>
                  REFERENCE NUMBER
                </td>
              </tr>
              <tr>
                <td
                  colSpan={2}
                  style={{
                    ...tableCell,
                    textAlign: "center",
                    fontWeight: 600,
                    padding: "5px 6px",
                  }}
                >
                  {refNo}
                </td>
              </tr>
              <tr>
                <td colSpan={2} style={grayHead}>
                  TO BE FILLED OUT BY FDA
                </td>
              </tr>
              {payRow("Received by:", "")}
              {payRow("Signature:", "")}
              {payRow("Date:", "")}
              <tr>
                <td colSpan={2} style={grayHead}>
                  PAYMENT DETAILS
                </td>
              </tr>
              {payRow("Amount Paid:", payments.length ? php(totalPaid) : "")}
              {payRow("OR No.:", orNos)}
              {payRow("OR Date Issued:", orDates)}
            </tbody>
          </table>
        </div>

        <div style={{ marginBottom: "6px" }}>Sir/Madam:</div>
        <div style={{ textIndent: "28px", marginBottom: "16px" }}>
          In accordance with Administrative Order No. 2013-0021 and related
          issuances, we wish to apply and notify FDA of our intention to make
          Minor Variation/s to our pharmaceutical product described below:
        </div>

        <div style={{ paddingLeft: "34px" }}>
          <div style={{ fontWeight: 700 }}>PRODUCT PARTICULARS</div>
          <div
            style={{
              fontStyle: "italic",
              fontSize: "10px",
              marginBottom: "6px",
            }}
          >
            Details should be consistent with the current CPR/CLIDP.
          </div>
        </div>
        <Line label="Generic Name" value={f("Generic Name")} />
        <Line label="Dosage Strength and Form" value={dosage} />
        <Line label="Brand Name" value={f("Brand Name")} />
        <div style={{ height: "8px" }} />
        <Line label="Approved Shelf-life" value={f("Shelf Life")} />
        <Line label="Storage Condition" value={f("Storage Condition")} />
        <Line label="Packaging/Presentation" value={f("Packaging")} />

        <div style={{ height: "14px" }} />
        <div style={{ display: "flex", gap: "30px" }}>
          <div style={{ flex: 1 }}>
            <Line
              label="FDA Registration No."
              value={f("Registration Number")}
              labelWidth={125}
            />
            <Line label="Registration Status" value="" labelWidth={125} />
          </div>
          <div style={{ flex: 1 }}>
            <Line label="Validity" value="" labelWidth={50} />
            <div
              style={{
                fontStyle: "italic",
                fontSize: "9.5px",
                paddingLeft: "50px",
              }}
            >
              State the validity or the DTN of the renewal application, if the
              CPR/CLIDP has not yet been renewed
            </div>
          </div>
        </div>

        <div style={{ paddingLeft: "34px", marginTop: "18px" }}>
          <div style={{ fontWeight: 700 }}>COMPANY PARTICULARS</div>
          <div
            style={{
              fontStyle: "italic",
              fontSize: "10px",
              marginBottom: "6px",
            }}
          >
            Details should be consistent with the current CPR/CLIDP. Complete
            name/s and address/es of the involved establishment/s should be
            reflected.
          </div>
        </div>
        <Line
          label="Manufacturer"
          value={party("Manufacturer")}
          labelWidth={110}
          minHeight={24}
        />
        <Line
          label="Trader"
          value={party("Trader")}
          labelWidth={110}
          minHeight={24}
        />
        <Line
          label="Importer"
          value={party("Importer")}
          labelWidth={110}
          minHeight={24}
        />
        <Line
          label="Distributor"
          value={party("Distributor")}
          labelWidth={110}
          minHeight={24}
        />
        <Line
          label="Packer/Repacker"
          value={party("Repacker")}
          labelWidth={110}
          minHeight={24}
        />
      </Page>

      {/* ───────── Page 2 ───────── */}
      <Page number={2}>
        <RefBox refNo={refNo} />
        <div style={{ fontWeight: 700, marginBottom: "14px" }}>
          POST-APPROVAL CHANGES PARTICULARS
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th
                colSpan={3}
                style={{
                  ...tableCell,
                  textDecoration: "underline",
                  fontWeight: 700,
                }}
              >
                Table of Changes
              </th>
            </tr>
            <tr>
              <th
                style={{
                  ...tableCell,
                  textDecoration: "underline",
                  width: "33%",
                }}
              >
                Current
              </th>
              <th
                style={{
                  ...tableCell,
                  textDecoration: "underline",
                  width: "33%",
                }}
              >
                Proposed Changes
              </th>
              <th style={{ ...tableCell, width: "34%" }}>
                <u>Specific Type of Variation</u>
                <div
                  style={{
                    fontStyle: "italic",
                    fontWeight: 400,
                    fontSize: "9px",
                  }}
                >
                  For MiV-PH-N7, indicate the original variation code applied
                  for the PCPR, e.g. MiV-PH-N7 (MaV-15)
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {changeRows.map((c, i) => (
              <tr key={i}>
                <td style={{ ...tableCell, height: "40px" }}>{c?.current}</td>
                <td style={tableCell}>{c?.proposed}</td>
                <td style={tableCell}>{c?.label}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div
          style={{
            textAlign: "center",
            fontWeight: 700,
            marginTop: "18px",
          }}
        >
          *** NOTHING FOLLOWS ***
        </div>
      </Page>

      {/* ───────── Page 3 ───────── */}
      <Page number={3}>
        <RefBox refNo={refNo} />
        <div
          style={{
            textAlign: "center",
            fontWeight: 700,
            textDecoration: "underline",
            marginBottom: "10px",
          }}
        >
          DECLARATION
        </div>
        <div
          style={{ fontSize: "11px", textAlign: "justify", lineHeight: 1.3 }}
        >
          <div style={{ marginBottom: "6px" }}>
            In support of our notification, I, the undersigned, hereby declare
            under oath that:
          </div>

          {DECLARATIONS.map((text, i) => (
            <div
              key={i}
              style={{ display: "flex", gap: "8px", marginBottom: "4px" }}
            >
              <span
                style={{ width: "16px", flexShrink: 0, textAlign: "right" }}
              >
                {i + 1}.
              </span>
              <span>{text}</span>
            </div>
          ))}

          <div style={{ display: "flex", gap: "8px", marginBottom: "2px" }}>
            <span style={{ width: "16px", flexShrink: 0, textAlign: "right" }}>
              7.
            </span>
            <span>I, or my company undertake to:</span>
          </div>
          {UNDERTAKINGS.map((text, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                gap: "6px",
                paddingLeft: "24px",
                marginBottom: "2px",
              }}
            >
              <span style={{ width: "14px", flexShrink: 0 }}>
                {String.fromCharCode(97 + i)})
              </span>
              <span>{text}</span>
            </div>
          ))}

          {DECLARATIONS_END.map((text, i) => (
            <div
              key={i}
              style={{ display: "flex", gap: "8px", marginTop: "4px" }}
            >
              <span
                style={{ width: "16px", flexShrink: 0, textAlign: "right" }}
              >
                {i + 8}.
              </span>
              <span>{text}</span>
            </div>
          ))}
        </div>
      </Page>

      {/* ───────── Page 4 ───────── */}
      <Page number={4}>
        <RefBox refNo={refNo} />

        <div style={{ display: "flex", gap: "40px", marginBottom: "26px" }}>
          {["HEAD OF REGULATORY OFFICE", "COMPANY PHARMACIST"].map((title) => (
            <div key={title} style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, marginBottom: "14px" }}>
                {title}
              </div>
              <Line label="Signature:" value="" labelWidth={78} />
              <Line label="Name:" value="" labelWidth={78} />
              <Line label="Designation:" value="" labelWidth={78} />
              <Line label="Date:" value="" labelWidth={78} />
            </div>
          ))}
        </div>

        <div style={{ marginBottom: "8px" }}>
          SUBSCRIBED AND SWORN TO BEFORE ME this{" "}
          <span
            style={{
              display: "inline-block",
              width: "60px",
              borderBottom: "1px solid #000",
            }}
          />{" "}
          personally appeared the following:
        </div>

        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            marginBottom: "18px",
          }}
        >
          <thead>
            <tr>
              {[
                "Name",
                "Residence Certificate",
                "Date Issued",
                "Place Issued",
              ].map((h) => (
                <th key={h} style={{ ...tableCell, fontWeight: 400 }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[0, 1].map((i) => (
              <tr key={i}>
                {[0, 1, 2, 3].map((c) => (
                  <td key={c} style={{ ...tableCell, height: "34px" }} />
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ marginBottom: "12px" }}>
          Known to me and to me known to be the same persons who executed the
          foregoing instrument and they acknowledged to me that the same is
          their free and voluntary act and deed.
        </div>
        <div style={{ marginBottom: "26px" }}>
          WITNESS MY HAND AND SEAL on the date and place first above written.
        </div>

        <div style={{ width: "240px", paddingLeft: "6px" }}>
          <Line label="Doc No." value="" labelWidth={64} />
          <Line label="Page No." value="" labelWidth={64} />
          <Line label="Book No." value="" labelWidth={64} />
          <Line label="Series of" value="" labelWidth={64} />
        </div>
      </Page>
    </>
  );
}
