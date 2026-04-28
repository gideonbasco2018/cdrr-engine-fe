import React, { useState } from "react";
import ReactDOM from "react-dom";
import {
  createFieldAuditLog,
  computeFieldChanges,
} from "../../../api/field-audit-logs";
import { CountryDropdown } from "../FilterBar";

/* ─── FixedCountryPicker — popup rendered at fixed position, escapes scroll ─── */
const COUNTRY_LIST = [
  "Afghanistan",
  "Albania",
  "Algeria",
  "Andorra",
  "Angola",
  "Argentina",
  "Armenia",
  "Australia",
  "Austria",
  "Azerbaijan",
  "Bahamas",
  "Bahrain",
  "Bangladesh",
  "Belarus",
  "Belgium",
  "Belize",
  "Benin",
  "Bhutan",
  "Bolivia",
  "Bosnia and Herzegovina",
  "Botswana",
  "Brazil",
  "Brunei",
  "Bulgaria",
  "Burkina Faso",
  "Burundi",
  "Cambodia",
  "Cameroon",
  "Canada",
  "Central African Republic",
  "Chad",
  "Chile",
  "China",
  "Colombia",
  "Comoros",
  "Congo",
  "Costa Rica",
  "Croatia",
  "Cuba",
  "Cyprus",
  "Czech Republic",
  "Denmark",
  "Djibouti",
  "Dominican Republic",
  "Ecuador",
  "Egypt",
  "El Salvador",
  "Equatorial Guinea",
  "Eritrea",
  "Estonia",
  "Ethiopia",
  "Fiji",
  "Finland",
  "France",
  "Gabon",
  "Gambia",
  "Georgia",
  "Germany",
  "Ghana",
  "Greece",
  "Guatemala",
  "Guinea",
  "Guinea-Bissau",
  "Guyana",
  "Haiti",
  "Honduras",
  "Hungary",
  "Iceland",
  "India",
  "Indonesia",
  "Iran",
  "Iraq",
  "Ireland",
  "Israel",
  "Italy",
  "Jamaica",
  "Japan",
  "Jordan",
  "Kazakhstan",
  "Kenya",
  "Kuwait",
  "Kyrgyzstan",
  "Laos",
  "Latvia",
  "Lebanon",
  "Lesotho",
  "Liberia",
  "Libya",
  "Liechtenstein",
  "Lithuania",
  "Luxembourg",
  "Madagascar",
  "Malawi",
  "Malaysia",
  "Maldives",
  "Mali",
  "Malta",
  "Mauritania",
  "Mauritius",
  "Mexico",
  "Moldova",
  "Monaco",
  "Mongolia",
  "Montenegro",
  "Morocco",
  "Mozambique",
  "Myanmar",
  "Namibia",
  "Nepal",
  "Netherlands",
  "New Zealand",
  "Nicaragua",
  "Niger",
  "Nigeria",
  "North Korea",
  "North Macedonia",
  "Norway",
  "Oman",
  "Pakistan",
  "Panama",
  "Papua New Guinea",
  "Paraguay",
  "Peru",
  "Philippines",
  "Poland",
  "Portugal",
  "Qatar",
  "Romania",
  "Russia",
  "Rwanda",
  "Saudi Arabia",
  "Senegal",
  "Serbia",
  "Sierra Leone",
  "Singapore",
  "Slovakia",
  "Slovenia",
  "Somalia",
  "South Africa",
  "South Korea",
  "South Sudan",
  "Spain",
  "Sri Lanka",
  "Sudan",
  "Suriname",
  "Sweden",
  "Switzerland",
  "Syria",
  "Taiwan",
  "Tajikistan",
  "Tanzania",
  "Thailand",
  "Togo",
  "Trinidad and Tobago",
  "Tunisia",
  "Turkey",
  "Turkmenistan",
  "Uganda",
  "Ukraine",
  "United Arab Emirates",
  "United Kingdom",
  "United States",
  "Uruguay",
  "Uzbekistan",
  "Venezuela",
  "Vietnam",
  "Yemen",
  "Zambia",
  "Zimbabwe",
];

function FixedCountryPicker({ value, onChange, dark }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });
  const triggerRef = React.useRef(null);
  const searchRef = React.useRef(null);

  const filtered = COUNTRY_LIST.filter((c) =>
    c.toLowerCase().includes(search.toLowerCase()),
  );

  const openDropdown = () => {
    if (triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 2, left: r.left, width: r.width });
    }
    setOpen(true);
    setSearch("");
    setTimeout(() => searchRef.current?.focus(), 50);
  };

  React.useEffect(() => {
    if (!open) return;
    const close = (e) => {
      if (!triggerRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const triggerStyle = {
    width: "100%",
    boxSizing: "border-box",
    padding: "0.2rem 0.42rem",
    fontSize: "0.74rem",
    border: `1.5px solid ${dark ? (open ? "#1976d2" : "#1e3a5c") : open ? "#1976d2" : "#90caf9"}`,
    borderRadius: "5px",
    background: dark ? "#0b1929" : "#e8f4fd",
    color: dark ? "#90caf9" : "#0d47a1",
    fontFamily: "sans-serif",
    fontWeight: "600",
    outline: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    userSelect: "none",
    boxShadow: open ? "0 0 0 3px rgba(25,118,210,0.22)" : "none",
    transition: "border-color 0.15s, box-shadow 0.15s",
  };

  const popup = open ? (
    <div
      style={{
        position: "fixed",
        top: `${pos.top}px`,
        left: `${pos.left}px`,
        width: `${Math.max(pos.width, 200)}px`,
        zIndex: 999999,
        background: dark ? "#0b1929" : "#ffffff",
        border: `1.5px solid ${dark ? "#1e3a5c" : "#90caf9"}`,
        borderRadius: "6px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
        display: "flex",
        flexDirection: "column",
        maxHeight: "260px",
        overflow: "hidden",
      }}
      onMouseDown={(e) => e.preventDefault()}
    >
      <div
        style={{
          padding: "0.35rem 0.5rem",
          borderBottom: `1px solid ${dark ? "#1e3a5c" : "#b3d4f5"}`,
        }}
      >
        <input
          ref={searchRef}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search country..."
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: "0.22rem 0.4rem",
            fontSize: "0.72rem",
            border: `1px solid ${dark ? "#1e3a5c" : "#90caf9"}`,
            borderRadius: "4px",
            background: dark ? "#0d2035" : "#f0f8ff",
            color: dark ? "#90caf9" : "#0d47a1",
            outline: "none",
            fontFamily: "sans-serif",
          }}
        />
      </div>
      <div style={{ overflowY: "auto", flex: 1 }}>
        {["", ...filtered].map((c, i) => {
          const label = c === "" ? "All Countries" : c;
          const isSelected = (c === "" && !value) || c === value;
          return (
            <div
              key={i}
              onMouseDown={() => {
                onChange(c);
                setOpen(false);
                setSearch("");
              }}
              style={{
                padding: "0.3rem 0.55rem",
                fontSize: "0.74rem",
                fontFamily: "sans-serif",
                fontWeight: isSelected ? "700" : "500",
                color: isSelected
                  ? dark
                    ? "#60a5fa"
                    : "#1565c0"
                  : dark
                    ? "#90caf9"
                    : "#0d47a1",
                background: isSelected
                  ? dark
                    ? "rgba(25,118,210,0.18)"
                    : "rgba(25,118,210,0.08)"
                  : "transparent",
                cursor: "pointer",
                transition: "background 0.1s",
              }}
              onMouseEnter={(e) => {
                if (!isSelected)
                  e.currentTarget.style.background = dark
                    ? "rgba(255,255,255,0.05)"
                    : "rgba(25,118,210,0.05)";
              }}
              onMouseLeave={(e) => {
                if (!isSelected)
                  e.currentTarget.style.background = "transparent";
              }}
            >
              {label}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div
            style={{
              padding: "0.5rem",
              fontSize: "0.72rem",
              color: dark ? "#4a6a8a" : "#90a4ae",
              fontFamily: "sans-serif",
              textAlign: "center",
            }}
          >
            No results
          </div>
        )}
      </div>
    </div>
  ) : null;

  return (
    <>
      <div ref={triggerRef} style={triggerStyle} onClick={openDropdown}>
        <span
          style={{
            flex: 1,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {value || "All Countries"}
        </span>
        <span
          style={{
            marginLeft: "0.3rem",
            fontSize: "0.58rem",
            flexShrink: 0,
            opacity: 0.7,
          }}
        >
          {open ? "▲" : "▼"}
        </span>
      </div>
      {typeof document !== "undefined" && open
        ? ReactDOM.createPortal(popup, document.body)
        : popup}
    </>
  );
}

/* ─── helpers defined OUTSIDE the component so React never remounts them ─── */

function FieldRow({ label, multiline, dark, children }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "190px 1fr",
        gap: "0.2rem 0.5rem",
        alignItems: multiline ? "flex-start" : "center",
        borderBottom: `1px solid ${dark ? "#1e1e1e" : "#e8edf2"}`,
        padding: "0.35rem 0",
      }}
    >
      <div
        style={{
          fontSize: "0.76rem",
          color: dark ? "#6b8099" : "#546e7a",
          fontFamily: "sans-serif",
          fontWeight: "600",
          paddingTop: multiline ? "0.32rem" : 0,
        }}
      >
        {label}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: multiline ? "flex-start" : "center",
          gap: "0.28rem",
          minWidth: 0,
        }}
      >
        <span
          style={{
            color: dark ? "#444" : "#90a4ae",
            fontSize: "0.8rem",
            flexShrink: 0,
            paddingTop: multiline ? "0.3rem" : 0,
          }}
        >
          :
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
      </div>
    </div>
  );
}

function SectionHead({ label, dark }) {
  return (
    <div
      style={{
        background: dark ? "#0f1e30" : "#dbeafe",
        border: `1px solid ${dark ? "#1c3d5e" : "#93c5fd"}`,
        borderRadius: "5px",
        padding: "0.26rem 0.6rem",
        fontSize: "0.68rem",
        fontFamily: "sans-serif",
        fontWeight: "700",
        color: dark ? "#60a5fa" : "#1e40af",
        textTransform: "uppercase",
        letterSpacing: "0.07em",
        marginTop: "0.75rem",
        marginBottom: "0.1rem",
      }}
    >
      {label}
    </div>
  );
}

function FootRow({ label, value, onChange, placeholder, dark }) {
  const s = inpStyle(dark, true);
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "105px 1fr",
        gap: "0 0.35rem",
        alignItems: "center",
        marginBottom: "0.22rem",
      }}
    >
      <div
        style={{
          fontSize: "0.67rem",
          fontFamily: "sans-serif",
          fontWeight: "700",
          color: dark ? "#5a7a96" : "#546e7a",
          textTransform: "uppercase",
          letterSpacing: "0.04em",
        }}
      >
        {label}
      </div>
      <input
        style={s}
        value={value}
        onChange={onChange}
        placeholder={placeholder || ""}
        onFocus={(e) => {
          e.target.style.borderColor = "#1976d2";
          e.target.style.boxShadow = "0 0 0 3px rgba(25,118,210,0.22)";
        }}
        onBlur={(e) => {
          e.target.style.borderColor = dark ? "#1e3a5c" : "#90caf9";
          e.target.style.boxShadow = "none";
        }}
      />
    </div>
  );
}

function inpStyle(dark, small) {
  return {
    width: "100%",
    minWidth: 0,
    boxSizing: "border-box",
    padding: small ? "0.2rem 0.42rem" : "0.27rem 0.5rem",
    fontSize: small ? "0.74rem" : "0.8rem",
    border: `1.5px solid ${dark ? "#1e3a5c" : "#90caf9"}`,
    borderRadius: "5px",
    background: dark ? "#0b1929" : "#e8f4fd",
    color: dark ? "#90caf9" : "#0d47a1",
    fontFamily: "sans-serif",
    fontWeight: "600",
    outline: "none",
    transition: "border-color 0.15s, box-shadow 0.15s",
    display: "block",
  };
}

function taStyle(dark) {
  return {
    ...inpStyle(dark, false),
    resize: "vertical",
    minHeight: "50px",
    lineHeight: "1.4",
  };
}

function onFocus(e) {
  e.target.style.borderColor = "#1976d2";
  e.target.style.boxShadow = "0 0 0 3px rgba(25,118,210,0.22)";
}
function onBlur(dark) {
  return (e) => {
    e.target.style.borderColor = dark ? "#1e3a5c" : "#90caf9";
    e.target.style.boxShadow = "none";
  };
}

/* ─── Field label map for diff preview ─── */
const CPR_FIELD_LABEL_MAP = {
  regNo: "Registration Number",
  prodGenName: "Generic Name",
  prodBrName: "Brand Name",
  prodDosStr: "Dosage Strength",
  prodDosForm: "Dosage Form",
  prodPharmaCat: "Pharmacologic Category",
  prodClassPrescript: "Classification",
  prodDistriShelfLife: "Approved Shelf-life",
  storageCond: "Storage Condition",
  packaging: "Packaging",
  prodManu: "Manufacturer",
  prodManuAdd: "Manufacturer Address",
  prodManuTin: "Manufacturer TIN",
  prodManuLtoNo: "Manufacturer LTO No.",
  prodManuCountry: "Manufacturer Country",
  prodTrader: "Trader",
  prodTraderAdd: "Trader Address",
  prodTraderTin: "Trader TIN",
  prodTraderLtoNo: "Trader LTO No.",
  prodTraderCountry: "Trader Country",
  prodImporter: "Importer",
  prodImporterAdd: "Importer Address",
  prodImporterTin: "Importer TIN",
  prodImporterLtoNo: "Importer LTO No.",
  prodImporterCountry: "Importer Country",
  prodDistri: "Distributor",
  prodDistriAdd: "Distributor Address",
  prodDistriTin: "Distributor TIN",
  prodDistriLtoNo: "Distributor LTO No.",
  prodDistriCountry: "Distributor Country",
  prodRepacker: "Repacker",
  prodRepackerAdd: "Repacker Address",
  prodRepackerTin: "Repacker TIN",
  prodRepackerLtoNo: "Repacker LTO No.",
  prodRepackerCountry: "Repacker Country",
  cprValidity: "CPR Validity",
  dateIssued: "Date Issued",
  cprCondRemarks: "CPR Condition / Remarks", // → DB_CPR_COND
  cprCondAddRemarks: "Additional Remarks", // → DB_CPR_COND_ADD_REMARKS
  appType: "Registration Status",
  fee: "Amount",
  orNo: "OR Number",
  dateExcelUpload: "Date",
  secpa: "SECPA No.",
  dtn: "DTN",
};

/* ─── Step Indicator ─── */
function StepIndicator({ currentStep, steps, dark }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
      {steps.map((step, i) => {
        const num = i + 1;
        const done = num < currentStep;
        const active = num === currentStep;
        return (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              flex: i < steps.length - 1 ? 1 : "none",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "0.18rem",
              }}
            >
              <div
                style={{
                  width: "26px",
                  height: "26px",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.68rem",
                  fontWeight: "800",
                  flexShrink: 0,
                  transition: "all 0.3s",
                  background: done
                    ? "#10b981"
                    : active
                      ? "#1976d2"
                      : dark
                        ? "#1a1a1a"
                        : "#e8edf2",
                  border: done
                    ? "2px solid #10b981"
                    : active
                      ? "2px solid #1976d2"
                      : `2px solid ${dark ? "#333" : "#b0bec5"}`,
                  color: done || active ? "#fff" : dark ? "#4a6a8a" : "#90a4ae",
                  boxShadow: active ? "0 0 0 3px rgba(25,118,210,0.2)" : "none",
                  fontFamily: "sans-serif",
                }}
              >
                {done ? "✓" : num}
              </div>
              <span
                style={{
                  fontSize: "0.58rem",
                  fontFamily: "sans-serif",
                  fontWeight: active ? "700" : "500",
                  color: active
                    ? "#1976d2"
                    : done
                      ? "#10b981"
                      : dark
                        ? "#4a6a8a"
                        : "#90a4ae",
                  whiteSpace: "nowrap",
                }}
              >
                {step}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                style={{
                  flex: 1,
                  height: "2px",
                  background: done ? "#10b981" : dark ? "#222" : "#e0e0e0",
                  margin: "0 4px",
                  marginBottom: "1rem",
                  transition: "background 0.3s",
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─── Diff Preview (Step 2) ─── */
function DiffPreview({ form, original, dark }) {
  const changedFields = Object.keys(CPR_FIELD_LABEL_MAP).filter(
    (k) => String(form[k] ?? "") !== String(original[k] ?? ""),
  );

  if (changedFields.length === 0) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "3rem 2rem",
          gap: "0.75rem",
        }}
      >
        <div style={{ fontSize: "2.5rem" }}>✅</div>
        <p
          style={{
            margin: 0,
            fontSize: "0.95rem",
            fontWeight: "700",
            color: dark ? "#ccc" : "#263238",
            fontFamily: "sans-serif",
          }}
        >
          No Changes Detected
        </p>
        <p
          style={{
            margin: 0,
            fontSize: "0.78rem",
            color: dark ? "#5a7a96" : "#607d8b",
            fontFamily: "sans-serif",
          }}
        >
          You haven't modified any fields. Go back to make changes.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
      {/* Banner */}
      <div
        style={{
          padding: "0.75rem 1rem",
          background: dark ? "rgba(245,158,11,0.07)" : "rgba(245,158,11,0.08)",
          border: "1px solid rgba(245,158,11,0.28)",
          borderRadius: "8px",
          display: "flex",
          alignItems: "center",
          gap: "0.65rem",
        }}
      >
        <span style={{ fontSize: "1.2rem" }}>📋</span>
        <div>
          <p
            style={{
              margin: 0,
              fontSize: "0.84rem",
              fontWeight: "700",
              color: dark ? "#e0e0e0" : "#1a237e",
              fontFamily: "sans-serif",
            }}
          >
            Review Your Changes
          </p>
          <p
            style={{
              margin: 0,
              fontSize: "0.72rem",
              color: dark ? "#5a7a96" : "#607d8b",
              fontFamily: "sans-serif",
            }}
          >
            <strong style={{ color: "#f59e0b" }}>{changedFields.length}</strong>{" "}
            field{changedFields.length > 1 ? "s" : ""} will be updated. Please
            review before saving.
          </p>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
        {[
          {
            bg: dark ? "rgba(239,68,68,0.15)" : "#fef2f2",
            border: "rgba(239,68,68,0.4)",
            label: "Original",
          },
          {
            bg: dark ? "rgba(16,185,129,0.15)" : "#f0fdf4",
            border: "rgba(16,185,129,0.4)",
            label: "New Value",
          },
        ].map(({ bg, border, label }) => (
          <div
            key={label}
            style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}
          >
            <div
              style={{
                width: "11px",
                height: "11px",
                borderRadius: "3px",
                background: bg,
                border: `1px solid ${border}`,
              }}
            />
            <span
              style={{
                fontSize: "0.66rem",
                color: dark ? "#5a7a96" : "#607d8b",
                fontFamily: "sans-serif",
              }}
            >
              {label}
            </span>
          </div>
        ))}
      </div>

      {/* Diff rows */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
        {changedFields.map((fieldKey, idx) => {
          const label = CPR_FIELD_LABEL_MAP[fieldKey] || fieldKey;
          const oldVal = String(original[fieldKey] ?? "") || "—";
          const newVal = String(form[fieldKey] ?? "") || "—";
          return (
            <div
              key={fieldKey}
              style={{
                borderRadius: "7px",
                border: `1px solid ${dark ? "#222" : "#e0e0e0"}`,
                overflow: "hidden",
              }}
            >
              {/* Field header */}
              <div
                style={{
                  padding: "0.35rem 0.8rem",
                  background: dark ? "#111" : "#f8f8f8",
                  borderBottom: `1px solid ${dark ? "#222" : "#e0e0e0"}`,
                  display: "flex",
                  alignItems: "center",
                  gap: "0.45rem",
                }}
              >
                <span
                  style={{
                    fontSize: "0.58rem",
                    fontWeight: "700",
                    color: "#f59e0b",
                    background: "rgba(245,158,11,0.12)",
                    padding: "0.08rem 0.38rem",
                    borderRadius: "4px",
                    fontFamily: "sans-serif",
                  }}
                >
                  #{idx + 1}
                </span>
                <span
                  style={{
                    fontSize: "0.68rem",
                    fontWeight: "700",
                    color: dark ? "#c8d5e8" : "#1a237e",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    fontFamily: "sans-serif",
                  }}
                >
                  {label}
                </span>
              </div>
              {/* Old → New */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
                <div
                  style={{
                    padding: "0.55rem 0.8rem",
                    background: dark ? "rgba(239,68,68,0.07)" : "#fef2f2",
                    borderRight: `1px solid ${dark ? "#222" : "#e0e0e0"}`,
                  }}
                >
                  <p
                    style={{
                      fontSize: "0.58rem",
                      fontWeight: "700",
                      color: "#ef4444",
                      margin: "0 0 0.2rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      fontFamily: "sans-serif",
                    }}
                  >
                    ✕ Original
                  </p>
                  <p
                    style={{
                      fontSize: "0.78rem",
                      color: dark ? "#fca5a5" : "#b91c1c",
                      margin: 0,
                      wordBreak: "break-word",
                      fontStyle: oldVal === "—" ? "italic" : "normal",
                      opacity: oldVal === "—" ? 0.5 : 1,
                      fontFamily: "sans-serif",
                    }}
                  >
                    {oldVal}
                  </p>
                </div>
                <div
                  style={{
                    padding: "0.55rem 0.8rem",
                    background: dark ? "rgba(16,185,129,0.07)" : "#f0fdf4",
                  }}
                >
                  <p
                    style={{
                      fontSize: "0.58rem",
                      fontWeight: "700",
                      color: "#10b981",
                      margin: "0 0 0.2rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      fontFamily: "sans-serif",
                    }}
                  >
                    ✓ New Value
                  </p>
                  <p
                    style={{
                      fontSize: "0.78rem",
                      color: dark ? "#6ee7b7" : "#065f46",
                      margin: 0,
                      wordBreak: "break-word",
                      fontStyle: newVal === "—" ? "italic" : "normal",
                      opacity: newVal === "—" ? 0.5 : 1,
                      fontFamily: "sans-serif",
                    }}
                  >
                    {newVal}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer note */}
      <div
        style={{
          padding: "0.6rem 0.9rem",
          background: dark ? "rgba(25,118,210,0.07)" : "rgba(25,118,210,0.05)",
          border: "1px solid rgba(25,118,210,0.2)",
          borderRadius: "7px",
          fontSize: "0.72rem",
          color: dark ? "#5a7a96" : "#607d8b",
          fontFamily: "sans-serif",
        }}
      >
        💡 Click <strong>Save CPR Update</strong> to confirm, or go back to
        continue editing.
      </div>
    </div>
  );
}

/* ─── Confirmation Dialog ─── */
function ConfirmDialog({ changedCount, onConfirm, onCancel, dark, saving }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        zIndex: 20000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
      }}
    >
      <div
        style={{
          background: dark ? "#141414" : "#fff",
          border: `1px solid ${dark ? "#272727" : "#dde3ea"}`,
          borderRadius: "12px",
          padding: "1.75rem",
          width: "min(420px, 92vw)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.45)",
          display: "flex",
          flexDirection: "column",
          gap: "1.1rem",
        }}
      >
        {/* Icon + title */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "0.55rem",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: "52px",
              height: "52px",
              borderRadius: "50%",
              background:
                "linear-gradient(135deg, rgba(25,118,210,0.15), rgba(25,118,210,0.08))",
              border: "2px solid rgba(25,118,210,0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.5rem",
            }}
          >
            💾
          </div>
          <p
            style={{
              margin: 0,
              fontSize: "1rem",
              fontWeight: "800",
              color: dark ? "#e0e0e0" : "#1a237e",
              fontFamily: "sans-serif",
            }}
          >
            Confirm Save
          </p>
          <p
            style={{
              margin: 0,
              fontSize: "0.8rem",
              color: dark ? "#5a7a96" : "#607d8b",
              fontFamily: "sans-serif",
              lineHeight: 1.55,
            }}
          >
            You are about to save{" "}
            <strong style={{ color: "#1976d2" }}>
              {changedCount} change{changedCount > 1 ? "s" : ""}
            </strong>{" "}
            to this CPR record. This action will update the database and cannot
            be undone without manual correction.
          </p>
        </div>

        {/* Warning */}
        <div
          style={{
            padding: "0.6rem 0.85rem",
            background: dark
              ? "rgba(245,158,11,0.08)"
              : "rgba(245,158,11,0.08)",
            border: "1px solid rgba(245,158,11,0.28)",
            borderRadius: "7px",
            fontSize: "0.72rem",
            color: dark ? "#fbbf24" : "#b45309",
            fontFamily: "sans-serif",
            display: "flex",
            alignItems: "flex-start",
            gap: "0.5rem",
          }}
        >
          <span style={{ flexShrink: 0 }}>⚠️</span>
          <span>
            Please ensure all fields are correct before proceeding. Changes will
            be reflected immediately.
          </span>
        </div>

        {/* Buttons */}
        <div
          style={{
            display: "flex",
            gap: "0.65rem",
            justifyContent: "flex-end",
          }}
        >
          <button
            onClick={onCancel}
            disabled={saving}
            style={{
              padding: "0.48rem 1.1rem",
              background: dark ? "#1e1e1e" : "#e8ecf0",
              border: `1px solid ${dark ? "#333" : "#ccc"}`,
              borderRadius: "7px",
              color: dark ? "#bbb" : "#444",
              fontSize: "0.78rem",
              fontWeight: "600",
              cursor: saving ? "not-allowed" : "pointer",
              fontFamily: "sans-serif",
              opacity: saving ? 0.6 : 1,
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={saving}
            style={{
              padding: "0.48rem 1.25rem",
              background: saving
                ? "#555"
                : "linear-gradient(135deg,#1976d2,#1565c0)",
              border: "none",
              borderRadius: "7px",
              color: "#fff",
              fontSize: "0.78rem",
              fontWeight: "700",
              cursor: saving ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.38rem",
              fontFamily: "sans-serif",
              boxShadow: saving ? "none" : "0 3px 10px rgba(25,118,210,0.36)",
              opacity: saving ? 0.8 : 1,
            }}
          >
            {saving ? (
              <>
                <span
                  style={{
                    display: "inline-block",
                    width: "11px",
                    height: "11px",
                    border: "2px solid rgba(255,255,255,0.32)",
                    borderTopColor: "#fff",
                    borderRadius: "50%",
                    animation: "cprSpin 0.7s linear infinite",
                  }}
                />
                Saving…
              </>
            ) : (
              <>✓ Yes, Save Changes</>
            )}
          </button>
        </div>
      </div>
      <style>{`@keyframes cprSpin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */

function UpdateCPRModal({
  record = {},
  onClose,
  onSuccess,
  darkMode,
  updateUploadReport,
}) {
  const D = !!darkMode;

  const initialForm = {
    regNo: record.regNo ?? record.DB_REG_NO ?? "",
    prodGenName: record.prodGenName ?? record.DB_PROD_GEN_NAME ?? "",
    prodBrName: record.prodBrName ?? record.DB_PROD_BR_NAME ?? "",
    prodDosStr: record.prodDosStr ?? record.DB_PROD_DOS_STR ?? "",
    prodDosForm: record.prodDosForm ?? record.DB_PROD_DOS_FORM ?? "",
    prodPharmaCat: record.prodPharmaCat ?? record.DB_PROD_PHARMA_CAT ?? "",
    prodClassPrescript:
      record.prodClassPrescript ?? record.DB_PROD_CLASS_PRESCRIP ?? "",
    prodDistriShelfLife:
      record.prodDistriShelfLife ?? record.DB_PROD_DISTRI_SHELF_LIFE ?? "",
    storageCond: record.storageCond ?? record.DB_STORAGE_COND ?? "",
    packaging: record.packaging ?? record.DB_PACKAGING ?? "",

    /* Manufacturer */
    prodManu: record.prodManu ?? record.DB_PROD_MANU ?? "",
    prodManuAdd: record.prodManuAdd ?? record.DB_PROD_MANU_ADD ?? "",
    prodManuTin: record.prodManuTin ?? record.DB_PROD_MANU_TIN ?? "",
    prodManuLtoNo: record.prodManuLtoNo ?? record.DB_PROD_MANU_LTO_NO ?? "",
    prodManuCountry:
      record.prodManuCountry ?? record.DB_PROD_MANU_COUNTRY ?? "",

    /* Trader */
    prodTrader: record.prodTrader ?? record.DB_PROD_TRADER ?? "",
    prodTraderAdd: record.prodTraderAdd ?? record.DB_PROD_TRADER_ADD ?? "",
    prodTraderTin: record.prodTraderTin ?? record.DB_PROD_TRADER_TIN ?? "",
    prodTraderLtoNo:
      record.prodTraderLtoNo ?? record.DB_PROD_TRADER_LTO_NO ?? "",
    prodTraderCountry:
      record.prodTraderCountry ?? record.DB_PROD_TRADER_COUNTRY ?? "",

    /* Importer */
    prodImporter: record.prodImporter ?? record.DB_PROD_IMPORTER ?? "",
    prodImporterAdd:
      record.prodImporterAdd ?? record.DB_PROD_IMPORTER_ADD ?? "",
    prodImporterTin:
      record.prodImporterTin ?? record.DB_PROD_IMPORTER_TIN ?? "",
    prodImporterLtoNo:
      record.prodImporterLtoNo ?? record.DB_PROD_IMPORTER_LTO_NO ?? "",
    prodImporterCountry:
      record.prodImporterCountry ?? record.DB_PROD_IMPORTER_COUNTRY ?? "",

    /* Distributor */
    prodDistri: record.prodDistri ?? record.DB_PROD_DISTRI ?? "",
    prodDistriAdd: record.prodDistriAdd ?? record.DB_PROD_DISTRI_ADD ?? "",
    prodDistriTin: record.prodDistriTin ?? record.DB_PROD_DISTRI_TIN ?? "",
    prodDistriLtoNo:
      record.prodDistriLtoNo ?? record.DB_PROD_DISTRI_LTO_NO ?? "",
    prodDistriCountry:
      record.prodDistriCountry ?? record.DB_PROD_DISTRI_COUNTRY ?? "",

    /* Repacker */
    prodRepacker: record.prodRepacker ?? record.DB_PROD_REPACKER ?? "",
    prodRepackerAdd:
      record.prodRepackerAdd ?? record.DB_PROD_REPACKER_ADD ?? "",
    prodRepackerTin:
      record.prodRepackerTin ?? record.DB_PROD_REPACKER_TIN ?? "",
    prodRepackerLtoNo:
      record.prodRepackerLtoNo ?? record.DB_PROD_REPACKER_LTO_NO ?? "",
    prodRepackerCountry:
      record.prodRepackerCountry ?? record.DB_PROD_REPACKER_COUNTRY ?? "",

    /* CPR fields */
    cprValidity: record.cprValidity ?? record.DB_SECPA_EXP_DATE ?? "",
    dateIssued: record.dateIssued ?? record.DB_SECPA_ISSUED_ON ?? "",
    /* cprCondRemarks → DB_CPR_COND (NOT DB_CPR_COND_REMARKS) */
    cprCondRemarks: record.cprCondRemarks ?? record.DB_CPR_COND ?? "",
    cprCondAddRemarks:
      record.cprCondAddRemarks ?? record.DB_CPR_COND_ADD_REMARKS ?? "",

    /* Registration Details bottom strip */
    appType: record.appType ?? record.DB_APP_TYPE ?? "",
    fee: record.fee ?? record.DB_FEE ?? "",
    orNo: record.orNo ?? record.DB_OR_NO ?? "",
    dateExcelUpload:
      record.dateExcelUpload ?? record.DB_DATE_EXCEL_UPLOAD ?? "",

    /* SECPA */
    secpa: record.secpa ?? record.DB_SECPA ?? "",

    /* DTN */
    dtn: String(record.dtn ?? record.DB_DTN ?? ""),
  };

  const [form, setForm] = useState(initialForm);
  const [originalForm] = useState(initialForm); // snapshot for diff
  const [currentStep, setCurrentStep] = useState(1);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  const STEPS = ["Edit CPR", "Preview Changes"];
  const totalSteps = STEPS.length;

  const upd = (field) => (e) => {
    setForm((p) => ({ ...p, [field]: e.target.value }));
    setSaved(false);
    setError(null);
  };

  const changedCount = Object.keys(CPR_FIELD_LABEL_MAP).filter(
    (k) => String(form[k] ?? "") !== String(originalForm[k] ?? ""),
  ).length;

  /* ── Map CPR form fields → DB column names ── */
  const buildPayload = (f) => ({
    DB_REG_NO: f.regNo,
    DB_PROD_GEN_NAME: f.prodGenName,
    DB_PROD_BR_NAME: f.prodBrName,
    DB_PROD_DOS_STR: f.prodDosStr,
    DB_PROD_DOS_FORM: f.prodDosForm,
    DB_PROD_PHARMA_CAT: f.prodPharmaCat,
    DB_PROD_CLASS_PRESCRIP: f.prodClassPrescript,
    DB_PROD_DISTRI_SHELF_LIFE: f.prodDistriShelfLife,
    DB_STORAGE_COND: f.storageCond,
    DB_PACKAGING: f.packaging,
    // Manufacturer
    DB_PROD_MANU: f.prodManu,
    DB_PROD_MANU_ADD: f.prodManuAdd,
    DB_PROD_MANU_TIN: f.prodManuTin,
    DB_PROD_MANU_LTO_NO: f.prodManuLtoNo,
    DB_PROD_MANU_COUNTRY: f.prodManuCountry,
    // Trader
    DB_PROD_TRADER: f.prodTrader,
    DB_PROD_TRADER_ADD: f.prodTraderAdd,
    DB_PROD_TRADER_TIN: f.prodTraderTin,
    DB_PROD_TRADER_LTO_NO: f.prodTraderLtoNo,
    DB_PROD_TRADER_COUNTRY: f.prodTraderCountry,
    // Importer
    DB_PROD_IMPORTER: f.prodImporter,
    DB_PROD_IMPORTER_ADD: f.prodImporterAdd,
    DB_PROD_IMPORTER_TIN: f.prodImporterTin,
    DB_PROD_IMPORTER_LTO_NO: f.prodImporterLtoNo,
    DB_PROD_IMPORTER_COUNTRY: f.prodImporterCountry,
    // Distributor
    DB_PROD_DISTRI: f.prodDistri,
    DB_PROD_DISTRI_ADD: f.prodDistriAdd,
    DB_PROD_DISTRI_TIN: f.prodDistriTin,
    DB_PROD_DISTRI_LTO_NO: f.prodDistriLtoNo,
    DB_PROD_DISTRI_COUNTRY: f.prodDistriCountry,
    // Repacker
    DB_PROD_REPACKER: f.prodRepacker,
    DB_PROD_REPACKER_ADD: f.prodRepackerAdd,
    DB_PROD_REPACKER_TIN: f.prodRepackerTin,
    DB_PROD_REPACKER_LTO_NO: f.prodRepackerLtoNo,
    DB_PROD_REPACKER_COUNTRY: f.prodRepackerCountry,
    // CPR — NOTE: cprCondRemarks → DB_CPR_COND (not DB_CPR_COND_REMARKS)
    DB_CPR_VALIDITY: f.cprValidity,
    DB_DATE_ISSUED: f.dateIssued,
    DB_CPR_COND: f.cprCondRemarks, // ← mapped to DB_CPR_COND
    DB_CPR_COND_ADD_REMARKS: f.cprCondAddRemarks,
    // Bottom strip
    DB_APP_TYPE: f.appType,
    DB_FEE: f.fee,
    DB_OR_NO: f.orNo,
    DB_DATE_EXCEL_UPLOAD: f.dateExcelUpload,
    DB_SECPA: f.secpa,
    DB_DTN: f.dtn,
  });

  /* ── DB-keyed label map for audit log (computeFieldChanges expects DB keys) ── */
  const CPR_DB_LABEL_MAP = {
    DB_REG_NO: "Registration Number",
    DB_PROD_GEN_NAME: "Generic Name",
    DB_PROD_BR_NAME: "Brand Name",
    DB_PROD_DOS_STR: "Dosage Strength",
    DB_PROD_DOS_FORM: "Dosage Form",
    DB_PROD_PHARMA_CAT: "Pharmacologic Category",
    DB_PROD_CLASS_PRESCRIP: "Classification",
    DB_PROD_DISTRI_SHELF_LIFE: "Approved Shelf-life",
    DB_STORAGE_COND: "Storage Condition",
    DB_PACKAGING: "Packaging",
    DB_PROD_MANU: "Manufacturer",
    DB_PROD_MANU_ADD: "Manufacturer Address",
    DB_PROD_MANU_TIN: "Manufacturer TIN",
    DB_PROD_MANU_LTO_NO: "Manufacturer LTO No.",
    DB_PROD_MANU_COUNTRY: "Manufacturer Country",
    DB_PROD_TRADER: "Trader",
    DB_PROD_TRADER_ADD: "Trader Address",
    DB_PROD_TRADER_TIN: "Trader TIN",
    DB_PROD_TRADER_LTO_NO: "Trader LTO No.",
    DB_PROD_TRADER_COUNTRY: "Trader Country",
    DB_PROD_IMPORTER: "Importer",
    DB_PROD_IMPORTER_ADD: "Importer Address",
    DB_PROD_IMPORTER_TIN: "Importer TIN",
    DB_PROD_IMPORTER_LTO_NO: "Importer LTO No.",
    DB_PROD_IMPORTER_COUNTRY: "Importer Country",
    DB_PROD_DISTRI: "Distributor",
    DB_PROD_DISTRI_ADD: "Distributor Address",
    DB_PROD_DISTRI_TIN: "Distributor TIN",
    DB_PROD_DISTRI_LTO_NO: "Distributor LTO No.",
    DB_PROD_DISTRI_COUNTRY: "Distributor Country",
    DB_PROD_REPACKER: "Repacker",
    DB_PROD_REPACKER_ADD: "Repacker Address",
    DB_PROD_REPACKER_TIN: "Repacker TIN",
    DB_PROD_REPACKER_LTO_NO: "Repacker LTO No.",
    DB_PROD_REPACKER_COUNTRY: "Repacker Country",
    DB_CPR_VALIDITY: "CPR Validity",
    DB_DATE_ISSUED: "Date Issued",
    DB_CPR_COND: "CPR Condition",
    DB_CPR_COND_ADD_REMARKS: "Additional Remarks",
    DB_APP_TYPE: "Registration Status",
    DB_FEE: "Amount",
    DB_OR_NO: "OR Number",
    DB_DATE_EXCEL_UPLOAD: "Date",
    DB_SECPA: "SECPA No.",
    DB_DTN: "DTN",
  };

  const handleSave = async () => {
    setError(null);
    setSaving(true);
    try {
      const payload = buildPayload(form);

      /* ── Build original payload (DB-keyed) for audit diff ── */
      const originalPayload = buildPayload(originalForm);

      /* ── Compute field-level changes and write audit log ── */
      const changes = computeFieldChanges(
        originalPayload,
        payload,
        CPR_DB_LABEL_MAP,
        "Update Based on CPR",
      );

      if (changes.length > 0) {
        try {
          await createFieldAuditLog({
            main_db_id: record.id,
            log_id: null,
            session_id: crypto.randomUUID(),
            changes,
          });
        } catch (auditErr) {
          console.warn(
            "⚠️ CPR Audit log failed (non-fatal):",
            auditErr.message,
          );
        }
      }

      await updateUploadReport(record.id, payload);
      setSaved(true);
      setShowConfirm(false);
      if (onSuccess) onSuccess(form);
      onClose();
    } catch (err) {
      setError(err.message || "Failed to save CPR update.");
      setShowConfirm(false);
    } finally {
      setSaving(false);
    }
  };

  const IS = inpStyle(D, false);
  const TS = taStyle(D);
  const ISS = inpStyle(D, true);
  const ob = onBlur(D);

  const I = (field, extra) => (
    <input
      style={{ ...IS, ...extra }}
      value={form[field]}
      onChange={upd(field)}
      onFocus={onFocus}
      onBlur={ob}
    />
  );
  const T = (field) => (
    <textarea
      style={TS}
      value={form[field]}
      onChange={upd(field)}
      onFocus={onFocus}
      onBlur={ob}
    />
  );

  const entityBlock = (prefix, label) => {
    const subRow = (lbl, fld, ph) => (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.12rem",
          borderBottom: `1px solid ${D ? "#1e1e1e" : "#e8edf2"}`,
          padding: "0.3rem 0",
        }}
      >
        <div
          style={{
            fontSize: "0.7rem",
            color: D ? "#6b8099" : "#546e7a",
            fontFamily: "sans-serif",
            fontWeight: "600",
          }}
        >
          {lbl}
        </div>
        <input
          style={ISS}
          value={form[fld]}
          onChange={upd(fld)}
          placeholder={ph || ""}
          onFocus={onFocus}
          onBlur={ob}
        />
      </div>
    );

    const countryField = (fld) => (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.12rem",
          borderBottom: `1px solid ${D ? "#1e1e1e" : "#e8edf2"}`,
          padding: "0.3rem 0",
          position: "relative",
          zIndex: 10,
        }}
      >
        <div
          style={{
            fontSize: "0.7rem",
            color: D ? "#6b8099" : "#546e7a",
            fontFamily: "sans-serif",
            fontWeight: "600",
          }}
        >
          Country
        </div>
        <CountryDropdown
          value={form[fld]}
          onChange={(v) => setForm((p) => ({ ...p, [fld]: v }))}
          colors={{
            inputBg: D ? "#0b1929" : "#e8f4fd",
            inputBorder: D ? "#1e3a5c" : "#90caf9",
            textPrimary: D ? "#90caf9" : "#0d47a1",
            textTertiary: D ? "#6b8099" : "#546e7a",
            cardBg: D ? "#0b1929" : "#ffffff",
            cardBorder: D ? "#1e3a5c" : "#90caf9",
          }}
          accentColor="#1976d2"
          isActive={Boolean(form[fld] && form[fld].trim() !== "")}
        />
      </div>
    );

    return (
      <>
        <FieldRow label={label} dark={D}>
          <input
            style={IS}
            value={form[prefix]}
            onChange={upd(prefix)}
            onFocus={onFocus}
            onBlur={ob}
          />
        </FieldRow>
        <FieldRow label={`${label} Address`} multiline dark={D}>
          <textarea
            style={TS}
            value={form[prefix + "Add"]}
            onChange={upd(prefix + "Add")}
            onFocus={onFocus}
            onBlur={ob}
          />
        </FieldRow>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: "0 0.5rem",
            overflow: "visible",
          }}
        >
          {subRow("TIN", prefix + "Tin", "TIN")}
          {subRow("LTO No.", prefix + "LtoNo", "LTO No.")}
          {countryField(prefix + "Country")}
        </div>
      </>
    );
  };

  return (
    <>
      {/* Confirmation dialog */}
      {showConfirm && (
        <ConfirmDialog
          changedCount={changedCount}
          onConfirm={handleSave}
          onCancel={() => setShowConfirm(false)}
          dark={D}
          saving={saving}
        />
      )}

      <div
        className="cpr-modal-root"
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.6)",
          zIndex: 10000,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "0.75rem",
        }}
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <div
          style={{
            background: D ? "#121212" : "#fff",
            border: `1px solid ${D ? "#272727" : "#dde3ea"}`,
            borderRadius: "14px",
            width: "min(920px,96vw)",
            maxHeight: "94vh",
            display: "flex",
            flexDirection: "column",
            overflow: "clip",
            boxShadow: "0 28px 72px rgba(0,0,0,0.48)",
            "--cpr-dropdown-bg": D ? "#0b1929" : "#fff",
          }}
        >
          {/* Header */}
          <div
            style={{
              background: "linear-gradient(135deg,#1565c0,#0d47a1)",
              padding: "0.78rem 1.2rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexShrink: 0,
              gap: "1rem",
            }}
          >
            <div
              style={{ display: "flex", alignItems: "center", gap: "0.55rem" }}
            >
              <span style={{ fontSize: "1rem" }}>📜</span>
              <div>
                <p
                  style={{
                    margin: 0,
                    color: "#fff",
                    fontWeight: "700",
                    fontSize: "0.85rem",
                    fontFamily: "sans-serif",
                  }}
                >
                  Update Based on CPR
                </p>
                <p
                  style={{
                    margin: 0,
                    color: "rgba(255,255,255,0.62)",
                    fontSize: "0.67rem",
                    fontFamily: "sans-serif",
                  }}
                >
                  Certificate of Product Registration Template
                  {changedCount > 0 && (
                    <span
                      style={{
                        marginLeft: "0.5rem",
                        padding: "0.05rem 0.38rem",
                        background: "rgba(245,158,11,0.25)",
                        color: "#fbbf24",
                        borderRadius: "4px",
                        fontSize: "0.65rem",
                        fontWeight: "700",
                      }}
                    >
                      ✎ {changedCount} change{changedCount > 1 ? "s" : ""}
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* Step indicator in header */}
            <div style={{ flex: 1, maxWidth: "240px" }}>
              <StepIndicator currentStep={currentStep} steps={STEPS} dark={D} />
            </div>

            <button
              onClick={onClose}
              style={{
                background: "rgba(255,255,255,0.15)",
                border: "none",
                borderRadius: "6px",
                color: "#fff",
                width: "27px",
                height: "27px",
                cursor: "pointer",
                fontSize: "1rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              ✕
            </button>
          </div>

          {/* Body */}
          <div
            style={{
              overflowY: "auto",
              flex: 1,
              padding: "1rem 1.15rem",
              isolation: "isolate",
            }}
          >
            {/* Error banner */}
            {error && (
              <div
                style={{
                  background: "rgba(239,68,68,0.1)",
                  border: "1px solid rgba(239,68,68,0.3)",
                  borderRadius: "8px",
                  padding: "0.75rem 1rem",
                  marginBottom: "0.75rem",
                  color: "#ef4444",
                  fontSize: "0.82rem",
                  fontFamily: "sans-serif",
                }}
              >
                ⚠️ {error}
              </div>
            )}

            {/* ── Step 1: CPR Form ── */}
            {currentStep === 1 && (
              <div
                style={{
                  border: `2px solid ${D ? "#252525" : "#b0bec5"}`,
                  borderRadius: "10px",
                  padding: "1rem 1.3rem",
                  background: D ? "#0c0c0c" : "#fafcff",
                  fontFamily: "'Times New Roman',Times,serif",
                  position: "relative",
                }}
              >
                {/* Watermark */}
                <div
                  style={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%,-50%) rotate(-30deg)",
                    fontSize: "5rem",
                    fontWeight: "900",
                    color: D ? "rgba(255,255,255,0.022)" : "rgba(0,0,0,0.032)",
                    pointerEvents: "none",
                    userSelect: "none",
                    whiteSpace: "nowrap",
                  }}
                >
                  FDA
                </div>

                {/* Letterhead */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "0.6rem",
                    paddingBottom: "0.5rem",
                    borderBottom: `2px solid ${D ? "#252525" : "#b0bec5"}`,
                  }}
                >
                  <div
                    style={{
                      width: "42px",
                      height: "42px",
                      borderRadius: "50%",
                      background: "linear-gradient(135deg,#1565c0,#283593)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#fff",
                      fontWeight: "900",
                      fontSize: "0.82rem",
                      fontFamily: "sans-serif",
                      flexShrink: 0,
                    }}
                  >
                    FDA
                  </div>
                  <div
                    style={{
                      flex: 1,
                      textAlign: "center",
                      fontSize: "0.67rem",
                      color: D ? "#8a9ab0" : "#455a64",
                      fontFamily: "sans-serif",
                      lineHeight: 1.5,
                    }}
                  >
                    <div
                      style={{
                        fontWeight: "700",
                        fontSize: "0.76rem",
                        color: D ? "#c8d5e8" : "#1a237e",
                      }}
                    >
                      Republic of the Philippines
                    </div>
                    <div>Department of Health</div>
                    <div
                      style={{
                        fontWeight: "700",
                        color: D ? "#d8e5f5" : "#0d47a1",
                      }}
                    >
                      FOOD AND DRUG ADMINISTRATION
                    </div>
                    <div style={{ fontSize: "0.61rem" }}>
                      Civic Drive, Filinvest Corporate City, Alabang 1781,
                      Muntinlupa, Philippines
                    </div>
                  </div>
                  <div style={{ width: "42px" }} />
                </div>

                {/* Title */}
                <div
                  style={{
                    textAlign: "center",
                    fontSize: "0.9rem",
                    fontWeight: "700",
                    letterSpacing: "0.1em",
                    color: D ? "#dde5f0" : "#1a237e",
                    margin: "0.3rem 0 0.65rem",
                    textTransform: "uppercase",
                  }}
                >
                  Certificate of Product Registration
                </div>

                {/* Preamble */}
                <p
                  style={{
                    fontSize: "0.69rem",
                    color: D ? "#6a7f99" : "#607d8b",
                    fontFamily: "sans-serif",
                    lineHeight: 1.65,
                    marginBottom: "0.75rem",
                    textAlign: "justify",
                  }}
                >
                  Pursuant to the provisions of Republic Act (R.A.) No. 3720 as
                  amended, known as the Foods, Drugs, Devices and Cosmetics Act,
                  and consistent with R.A. No. 6675, known as the Generics Act
                  of 1988, and R.A. No. 9711, otherwise known as the Food and
                  Drug Administration Act of 2009, the product described
                  hereunder has been found to conform with the requirements and
                  standards for marketing authorization of pharmaceutical
                  products per existing regulations in force as of date hereof.
                </p>

                {/* Fields */}
                <FieldRow label="Registration Number" dark={D}>
                  {I("regNo")}
                </FieldRow>

                <SectionHead label="Product Information" dark={D} />
                <FieldRow label="Generic Name" dark={D}>
                  {I("prodGenName")}
                </FieldRow>
                <FieldRow label="Brand Name" dark={D}>
                  {I("prodBrName")}
                </FieldRow>
                <FieldRow label="Dosage Strength &amp; Form" dark={D}>
                  <div style={{ display: "flex", gap: "0.35rem", minWidth: 0 }}>
                    <input
                      style={{ ...IS, width: "125px", flexShrink: 0 }}
                      value={form.prodDosStr}
                      onChange={upd("prodDosStr")}
                      placeholder="Strength"
                      onFocus={onFocus}
                      onBlur={ob}
                    />
                    <input
                      style={{ ...IS, flex: 1, minWidth: 0 }}
                      value={form.prodDosForm}
                      onChange={upd("prodDosForm")}
                      placeholder="Dosage Form"
                      onFocus={onFocus}
                      onBlur={ob}
                    />
                  </div>
                </FieldRow>
                <FieldRow label="Pharmacologic Category" dark={D}>
                  {I("prodPharmaCat")}
                </FieldRow>
                <FieldRow label="Classification" dark={D}>
                  {I("prodClassPrescript")}
                </FieldRow>
                <FieldRow label="Approved Shelf-life" dark={D}>
                  {I("prodDistriShelfLife")}
                </FieldRow>
                <FieldRow label="Storage Condition" multiline dark={D}>
                  {T("storageCond")}
                </FieldRow>
                <FieldRow label="Packaging" dark={D}>
                  {I("packaging")}
                </FieldRow>

                <SectionHead label="Manufacturer" dark={D} />
                {entityBlock("prodManu", "Manufacturer")}

                <SectionHead label="Trader (if applicable)" dark={D} />
                {entityBlock("prodTrader", "Trader")}

                <SectionHead label="Importer" dark={D} />
                {entityBlock("prodImporter", "Importer")}

                <SectionHead label="Distributor" dark={D} />
                {entityBlock("prodDistri", "Distributor")}

                <SectionHead label="Repacker (if applicable)" dark={D} />
                {entityBlock("prodRepacker", "Repacker")}

                {/* Paragraphs */}
                <div
                  style={{
                    margin: "0.85rem 0 0.45rem",
                    padding: "0.65rem 0.85rem",
                    background: D ? "#0e1c2d" : "#eff6ff",
                    borderRadius: "7px",
                    border: `1px solid ${D ? "#1c3d5e" : "#bfdbfe"}`,
                  }}
                >
                  <p
                    style={{
                      fontSize: "0.71rem",
                      fontFamily: "sans-serif",
                      color: D ? "#8aabca" : "#374151",
                      lineHeight: 1.7,
                      margin: "0 0 0.5rem",
                    }}
                  >
                    The marketing authorization shall be valid until{" "}
                    <strong style={{ color: D ? "#60a5fa" : "#1d4ed8" }}>
                      {form.cprValidity || "__________"}
                    </strong>{" "}
                    subject to the conditions listed on the reverse side. No
                    change in the formulation, labeling and commercial
                    presentation of this product shall be made at any time
                    during the effectivity of this registration without prior
                    written approval of this Office.
                  </p>
                  <p
                    style={{
                      fontSize: "0.71rem",
                      fontFamily: "sans-serif",
                      color: D ? "#8aabca" : "#374151",
                      lineHeight: 1.7,
                      margin: 0,
                    }}
                  >
                    This marketing authorization is subject to suspension,
                    cancellation or recall should any violation of R.A. No.
                    3720, R.A. No. 6675 and R.A. No. 9711 and/or regulations
                    issued thereunder involving the product be committed.
                  </p>
                </div>

                <FieldRow label="Valid Until (CPR Validity)" dark={D}>
                  {I("cprValidity")}
                </FieldRow>
                <FieldRow label="Date Issued" dark={D}>
                  {I("dateIssued")}
                </FieldRow>
                {/* Label reflects DB_CPR_COND mapping */}
                <FieldRow
                  label="CPR Condition (DB_CPR_COND)"
                  multiline
                  dark={D}
                >
                  {T("cprCondRemarks")}
                </FieldRow>
                <FieldRow label="Additional Remarks" multiline dark={D}>
                  {T("cprCondAddRemarks")}
                </FieldRow>

                {/* Witness */}
                <div
                  style={{
                    textAlign: "center",
                    margin: "0.7rem 0 0.25rem",
                    fontFamily: "sans-serif",
                    fontSize: "0.73rem",
                    color: D ? "#6a7f99" : "#607d8b",
                  }}
                >
                  Witness My Hand and Seal of this Office, this&nbsp;
                  <strong style={{ color: D ? "#90caf9" : "#1565c0" }}>
                    {form.dateIssued}
                  </strong>
                  .
                </div>
                <div
                  style={{
                    textAlign: "center",
                    fontFamily: "sans-serif",
                    fontSize: "0.73rem",
                    fontWeight: "700",
                    color: D ? "#8a9ab0" : "#37474f",
                    letterSpacing: "0.05em",
                    marginBottom: "0.65rem",
                  }}
                >
                  *BY THE AUTHORITY OF THE DIRECTOR GENERAL
                </div>

                {/* Signature */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    paddingTop: "0.55rem",
                    borderTop: `1px dashed ${D ? "#2a2a2a" : "#cfd8dc"}`,
                    marginBottom: "0.9rem",
                  }}
                >
                  <div
                    style={{
                      fontFamily: "sans-serif",
                      fontSize: "0.71rem",
                      fontWeight: "700",
                      color: D ? "#ccc" : "#263238",
                      marginTop: "0.18rem",
                    }}
                  >
                    DR. CHARMAINE ANN M. RABAGO
                  </div>
                  <div
                    style={{
                      fontFamily: "sans-serif",
                      fontSize: "0.67rem",
                      color: D ? "#6a7f99" : "#607d8b",
                    }}
                  >
                    Officer-in-Charge, Director IV
                  </div>
                  <div
                    style={{
                      fontFamily: "sans-serif",
                      fontSize: "0.67rem",
                      color: D ? "#6a7f99" : "#607d8b",
                    }}
                  >
                    Center for Drug Regulation and Research
                  </div>
                </div>

                {/* Bottom strip */}
                <div
                  style={{
                    borderTop: `2px solid ${D ? "#252525" : "#b0bec5"}`,
                    paddingTop: "0.65rem",
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "0 1.5rem",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: "0.66rem",
                        fontFamily: "sans-serif",
                        fontWeight: "700",
                        color: D ? "#6a7f99" : "#546e7a",
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        marginBottom: "0.3rem",
                      }}
                    >
                      Registration Details
                    </div>
                    <FootRow
                      label="REG. STATUS"
                      value={form.appType}
                      onChange={upd("appType")}
                      placeholder="e.g. Initial (Vet.)"
                      dark={D}
                    />
                    <FootRow
                      label="AMOUNT"
                      value={form.fee}
                      onChange={upd("fee")}
                      placeholder="e.g. Php 15,660"
                      dark={D}
                    />
                    <FootRow
                      label="OR NUMBER"
                      value={form.orNo}
                      onChange={upd("orNo")}
                      placeholder="e.g. ORe 2015779"
                      dark={D}
                    />
                    <FootRow
                      label="DATE"
                      value={form.dateExcelUpload}
                      onChange={upd("dateExcelUpload")}
                      placeholder="e.g. 05 August 2025"
                      dark={D}
                    />
                    <div
                      style={{
                        marginTop: "0.4rem",
                        fontSize: "0.6rem",
                        fontFamily: "sans-serif",
                        color: D ? "#3d5470" : "#90a4ae",
                      }}
                    >
                      *Based on FDA Order No. 2025-0026 and FDA Memorandum
                      2025-007
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: "0.66rem",
                        fontFamily: "sans-serif",
                        fontWeight: "700",
                        color: D ? "#6a7f99" : "#546e7a",
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        marginBottom: "0.3rem",
                      }}
                    >
                      SECPA Details
                    </div>
                    <FootRow
                      label="SECPA No."
                      value={form.secpa}
                      onChange={upd("secpa")}
                      placeholder="SECPA Number"
                      dark={D}
                    />
                  </div>
                </div>

                {/* DOC TRACK */}
                <div
                  style={{
                    marginTop: "0.45rem",
                    paddingTop: "0.4rem",
                    borderTop: `1px solid ${D ? "#1c1c1c" : "#e0e0e0"}`,
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.2rem",
                    fontFamily: "sans-serif",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.4rem",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "0.67rem",
                        fontWeight: "700",
                        color: D ? "#5a7a96" : "#546e7a",
                        whiteSpace: "nowrap",
                      }}
                    >
                      DOCTRACK :
                    </span>
                    <input
                      style={{
                        fontSize: "0.7rem",
                        fontFamily: "monospace",
                        fontWeight: "700",
                        color: D ? "#90caf9" : "#1565c0",
                        letterSpacing: "0.08em",
                        background: "transparent",
                        border: "none",
                        borderBottom: `1px dashed ${D ? "#1e3a5c" : "#90caf9"}`,
                        outline: "none",
                        width: "160px",
                        padding: "0.05rem 0.1rem",
                      }}
                      value={form.dtn}
                      onChange={upd("dtn")}
                      placeholder="DTN number"
                    />
                    <span
                      style={{
                        marginLeft: "auto",
                        fontSize: "0.67rem",
                        fontFamily: "monospace",
                        fontWeight: "700",
                        color: D ? "#90caf9" : "#1565c0",
                        letterSpacing: "0.04em",
                      }}
                    >
                      {form.secpa || "—"}
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-start",
                      gap: "0.08rem",
                    }}
                  >
                    <div
                      style={{
                        width: "25%",
                        height: "16px",
                        background: `repeating-linear-gradient(90deg,${D ? "#2a3f5c" : "#111"} 0,${D ? "#2a3f5c" : "#111"} 1.5px,${D ? "#0b1929" : "#fff"} 1.5px,${D ? "#0b1929" : "#fff"} 4px)`,
                        borderRadius: "1px",
                      }}
                    />
                    <div
                      style={{
                        fontSize: "0.52rem",
                        fontFamily: "monospace",
                        color: D ? "#6a7f99" : "#546e7a",
                        letterSpacing: "0.18em",
                      }}
                    >
                      {form.dtn || "DOCTRACK"}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── Step 2: Diff Preview ── */}
            {currentStep === 2 && (
              <DiffPreview form={form} original={originalForm} dark={D} />
            )}
          </div>

          {/* Footer */}
          <div
            style={{
              flexShrink: 0,
              borderTop: `1px solid ${D ? "#1e1e1e" : "#e0e0e0"}`,
              padding: "0.72rem 1.2rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "0.55rem",
              background: D ? "#0e0e0e" : "#f4f6fa",
            }}
          >
            {/* Left: status */}
            <span
              style={{
                fontSize: "0.73rem",
                fontFamily: "sans-serif",
                fontWeight: "600",
              }}
            >
              {changedCount > 0 ? (
                <span style={{ color: "#f59e0b" }}>
                  ✎ {changedCount} field{changedCount > 1 ? "s" : ""} modified
                </span>
              ) : (
                <span style={{ color: D ? "#3d5470" : "#90a4ae" }}>
                  No changes yet
                </span>
              )}
            </span>

            {/* Right: navigation buttons */}
            <div
              style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}
            >
              {saved && (
                <span
                  style={{
                    fontSize: "0.75rem",
                    color: "#4caf50",
                    fontFamily: "sans-serif",
                    fontWeight: "600",
                  }}
                >
                  ✓ Record updated successfully
                </span>
              )}

              <button
                onClick={onClose}
                style={{
                  padding: "0.4rem 0.95rem",
                  background: D ? "#1e1e1e" : "#e8ecf0",
                  border: `1px solid ${D ? "#333" : "#ccc"}`,
                  borderRadius: "7px",
                  color: D ? "#bbb" : "#444",
                  fontSize: "0.77rem",
                  fontWeight: "600",
                  cursor: "pointer",
                  fontFamily: "sans-serif",
                }}
              >
                Cancel
              </button>

              {/* Previous — only on step 2 */}
              {currentStep === 2 && (
                <button
                  onClick={() => setCurrentStep(1)}
                  style={{
                    padding: "0.4rem 0.95rem",
                    background: D ? "#1a1a1a" : "#e8ecf0",
                    border: `1px solid ${D ? "#333" : "#ccc"}`,
                    borderRadius: "7px",
                    color: D ? "#bbb" : "#444",
                    fontSize: "0.77rem",
                    fontWeight: "600",
                    cursor: "pointer",
                    fontFamily: "sans-serif",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.3rem",
                  }}
                >
                  ← Back
                </button>
              )}

              {/* Next — step 1 */}
              {currentStep === 1 && (
                <button
                  onClick={() => setCurrentStep(2)}
                  style={{
                    padding: "0.4rem 1.1rem",
                    background: "linear-gradient(135deg,#1976d2,#1565c0)",
                    border: "none",
                    borderRadius: "7px",
                    color: "#fff",
                    fontSize: "0.77rem",
                    fontWeight: "700",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.38rem",
                    fontFamily: "sans-serif",
                    boxShadow: "0 3px 10px rgba(25,118,210,0.36)",
                  }}
                >
                  Preview Changes →
                </button>
              )}

              {/* Save — step 2 */}
              {currentStep === 2 && (
                <button
                  onClick={() => changedCount > 0 && setShowConfirm(true)}
                  disabled={changedCount === 0}
                  style={{
                    padding: "0.4rem 1.05rem",
                    background:
                      changedCount === 0
                        ? D
                          ? "#222"
                          : "#ccc"
                        : "linear-gradient(135deg,#10b981,#059669)",
                    border: "none",
                    borderRadius: "7px",
                    color: "#fff",
                    fontSize: "0.77rem",
                    fontWeight: "700",
                    cursor: changedCount === 0 ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.38rem",
                    fontFamily: "sans-serif",
                    opacity: changedCount === 0 ? 0.55 : 1,
                    boxShadow:
                      changedCount === 0
                        ? "none"
                        : "0 3px 10px rgba(16,185,129,0.36)",
                  }}
                >
                  <span>💾</span>
                  Save CPR Update{changedCount > 0 ? ` (${changedCount})` : ""}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes cprSpin { to { transform: rotate(360deg) } }

        /* ── CountryDropdown popup: force solid background, proper z-index ── */
        .cpr-modal-root [class*="country"] > div > div:last-child,
        .cpr-modal-root [class*="dropdown"],
        .cpr-modal-root select + div,
        .cpr-modal-root [role="listbox"],
        .cpr-modal-root [role="option"] {
          background: var(--cpr-dropdown-bg, #fff) !important;
        }
      `}</style>
    </>
  );
}

export default UpdateCPRModal;
