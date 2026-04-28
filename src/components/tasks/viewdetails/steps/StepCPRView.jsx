import React, { useState } from "react";
import ReactDOM from "react-dom";

// ─── Country list (trimmed for brevity, same as UpdateCPRModal) ───
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

function CPRCountryPicker({ value, onChange, dark, disabled }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });
  const triggerRef = React.useRef(null);
  const searchRef = React.useRef(null);
  const filtered = COUNTRY_LIST.filter((c) =>
    c.toLowerCase().includes(search.toLowerCase()),
  );

  const openDropdown = () => {
    if (disabled) return;
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
    background: disabled
      ? dark
        ? "#0a1520"
        : "#f0f4f8"
      : dark
        ? "#0b1929"
        : "#e8f4fd",
    color: disabled
      ? dark
        ? "#4a6a8a"
        : "#90a4ae"
      : dark
        ? "#90caf9"
        : "#0d47a1",
    fontFamily: "sans-serif",
    fontWeight: "600",
    outline: "none",
    cursor: disabled ? "not-allowed" : "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    userSelect: "none",
    boxShadow: open ? "0 0 0 3px rgba(25,118,210,0.22)" : "none",
    transition: "border-color 0.15s, box-shadow 0.15s",
    opacity: disabled ? 0.6 : 1,
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
              {c === "" ? "All Countries" : c}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div
            style={{
              padding: "0.5rem",
              fontSize: "0.72rem",
              color: dark ? "#4a6a8a" : "#90a4ae",
              textAlign: "center",
              fontFamily: "sans-serif",
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
        {!disabled && (
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
        )}
      </div>
      {typeof document !== "undefined" && open
        ? ReactDOM.createPortal(popup, document.body)
        : popup}
    </>
  );
}

// ─── Shared helpers ───
function inpStyle(dark, small, disabled) {
  return {
    width: "100%",
    minWidth: 0,
    boxSizing: "border-box",
    padding: small ? "0.2rem 0.42rem" : "0.27rem 0.5rem",
    fontSize: small ? "0.74rem" : "0.8rem",
    border: `1.5px solid ${dark ? "#1e3a5c" : "#90caf9"}`,
    borderRadius: "5px",
    background: disabled
      ? dark
        ? "#0a1520"
        : "#f0f4f8"
      : dark
        ? "#0b1929"
        : "#e8f4fd",
    color: disabled
      ? dark
        ? "#4a6a8a"
        : "#90a4ae"
      : dark
        ? "#90caf9"
        : "#0d47a1",
    fontFamily: "sans-serif",
    fontWeight: "600",
    outline: "none",
    transition: "border-color 0.15s, box-shadow 0.15s",
    display: "block",
    cursor: disabled ? "not-allowed" : "text",
    opacity: disabled ? 0.7 : 1,
  };
}
function taStyle(dark, disabled) {
  return {
    ...inpStyle(dark, false, disabled),
    resize: "vertical",
    minHeight: "50px",
    lineHeight: "1.4",
  };
}
function onFocusFn(disabled) {
  return (e) => {
    if (disabled) return;
    e.target.style.borderColor = "#1976d2";
    e.target.style.boxShadow = "0 0 0 3px rgba(25,118,210,0.22)";
  };
}
function onBlurFn(dark) {
  return (e) => {
    e.target.style.borderColor = dark ? "#1e3a5c" : "#90caf9";
    e.target.style.boxShadow = "none";
  };
}
function toInputDate(val) {
  if (!val) return "";
  const d = new Date(val);
  if (isNaN(d.getTime())) return val;
  return d.toISOString().split("T")[0];
}

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

function FootRow({ label, value, onChange, placeholder, dark, disabled }) {
  const s = inpStyle(dark, true, disabled);
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
        readOnly={disabled}
        onFocus={onFocusFn(disabled)}
        onBlur={onBlurFn(dark)}
      />
    </div>
  );
}

// ─── Read-only static text display ───
function StaticVal({ value, dark, multiline }) {
  const style = {
    fontSize: "0.8rem",
    fontFamily: "sans-serif",
    fontWeight: "600",
    color: dark ? "#90caf9" : "#0d47a1",
    padding: "0.27rem 0.5rem",
    background: dark ? "#0a1520" : "#f0f4f8",
    border: `1.5px solid ${dark ? "#1a2f45" : "#c8dff0"}`,
    borderRadius: "5px",
    opacity: 0.75,
    whiteSpace: multiline ? "pre-wrap" : "nowrap",
    overflow: "hidden",
    textOverflow: multiline ? "unset" : "ellipsis",
    wordBreak: "break-word",
    minHeight: multiline ? "50px" : undefined,
    lineHeight: "1.4",
    display: "block",
    width: "100%",
    boxSizing: "border-box",
  };
  return (
    <span style={style}>
      {value || <span style={{ opacity: 0.4, fontStyle: "italic" }}>—</span>}
    </span>
  );
}

export function StepCPRView({
  record,
  editedFields,
  onFieldChange,
  canEdit,
  colors,
}) {
  const dark = colors?.dark ?? false;

  const fmtDate = (val) => {
    if (!val) return null;
    const d = new Date(val);
    if (isNaN(d.getTime())) return val;
    return d.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };
  // Merge record + editedFields for display/editing
  const get = (field) =>
    field in editedFields ? editedFields[field] : (record[field] ?? "");
  const set = (field) => (e) => onFieldChange(field, e.target.value);
  const setVal = (field) => (v) => onFieldChange(field, v);

  const IS = inpStyle(dark, false, !canEdit);
  const TS = taStyle(dark, !canEdit);
  const ISS = inpStyle(dark, true, !canEdit);
  const ob = onBlurFn(dark);
  const of_ = onFocusFn(!canEdit);

  const I = (field, extra) =>
    canEdit ? (
      <input
        style={{ ...IS, ...extra }}
        value={get(field)}
        onChange={set(field)}
        onFocus={of_}
        onBlur={ob}
      />
    ) : (
      <StaticVal value={get(field)} dark={dark} />
    );

  const T = (field) =>
    canEdit ? (
      <textarea
        style={TS}
        value={get(field)}
        onChange={set(field)}
        onFocus={of_}
        onBlur={ob}
      />
    ) : (
      <StaticVal value={get(field)} dark={dark} multiline />
    );

  const DateI = (field) =>
    canEdit ? (
      <input
        type="date"
        value={toInputDate(get(field))}
        onChange={set(field)}
        onFocus={of_}
        onBlur={ob}
        style={{
          ...IS,
          cursor: "pointer",
          colorScheme: dark ? "dark" : "light",
        }}
      />
    ) : (
      <StaticVal value={get(field)} dark={dark} />
    );

  const entityBlock = (prefix, label) => {
    const subRow = (lbl, fld) => (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.12rem",
          borderBottom: `1px solid ${dark ? "#1e1e1e" : "#e8edf2"}`,
          padding: "0.3rem 0",
        }}
      >
        <div
          style={{
            fontSize: "0.7rem",
            color: dark ? "#6b8099" : "#546e7a",
            fontFamily: "sans-serif",
            fontWeight: "600",
          }}
        >
          {lbl}
        </div>
        {canEdit ? (
          <input
            style={ISS}
            value={get(fld)}
            onChange={set(fld)}
            onFocus={of_}
            onBlur={ob}
          />
        ) : (
          <StaticVal value={get(fld)} dark={dark} />
        )}
      </div>
    );
    const countryField = (fld) => (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.12rem",
          borderBottom: `1px solid ${dark ? "#1e1e1e" : "#e8edf2"}`,
          padding: "0.3rem 0",
          position: "relative",
          zIndex: 10,
        }}
      >
        <div
          style={{
            fontSize: "0.7rem",
            color: dark ? "#6b8099" : "#546e7a",
            fontFamily: "sans-serif",
            fontWeight: "600",
          }}
        >
          Country
        </div>
        <CPRCountryPicker
          value={get(fld)}
          onChange={canEdit ? setVal(fld) : () => {}}
          dark={dark}
          disabled={!canEdit}
        />
      </div>
    );

    return (
      <>
        <FieldRow label={label} dark={dark}>
          {I(prefix)}
        </FieldRow>
        <FieldRow label={`${label} Address`} multiline dark={dark}>
          {T(prefix + "Add")}
        </FieldRow>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: "0 0.5rem",
            overflow: "visible",
          }}
        >
          {subRow("TIN", prefix + "Tin")}
          {subRow("LTO No.", prefix + "LtoNo")}
          {countryField(prefix + "Country")}
        </div>
      </>
    );
  };

  return (
    <div
      style={{
        border: `2px solid ${dark ? "#252525" : "#b0bec5"}`,
        borderRadius: "10px",
        padding: "1rem 1.3rem",
        background: dark ? "#0c0c0c" : "#fafcff",
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
          color: dark ? "rgba(255,255,255,0.022)" : "rgba(0,0,0,0.032)",
          pointerEvents: "none",
          userSelect: "none",
          whiteSpace: "nowrap",
        }}
      >
        FDA
      </div>

      {/* Read-only banner */}
      {!canEdit && (
        <div
          style={{
            marginBottom: "0.75rem",
            padding: "0.4rem 0.8rem",
            background: dark ? "rgba(100,100,100,0.08)" : "rgba(0,0,0,0.04)",
            border: `1px solid ${dark ? "#2a2a2a" : "#cfd8dc"}`,
            borderRadius: "6px",
            fontSize: "0.68rem",
            fontFamily: "sans-serif",
            color: dark ? "#5a7a96" : "#78909c",
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
          }}
        >
          <span>🔒</span>
          <span>View only — this application step is not editable.</span>
        </div>
      )}

      {/* Letterhead */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "0.6rem",
          paddingBottom: "0.5rem",
          borderBottom: `2px solid ${dark ? "#252525" : "#b0bec5"}`,
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
            color: dark ? "#8a9ab0" : "#455a64",
            fontFamily: "sans-serif",
            lineHeight: 1.5,
          }}
        >
          <div
            style={{
              fontWeight: "700",
              fontSize: "0.76rem",
              color: dark ? "#c8d5e8" : "#1a237e",
            }}
          >
            Republic of the Philippines
          </div>
          <div>Department of Health</div>
          <div
            style={{ fontWeight: "700", color: dark ? "#d8e5f5" : "#0d47a1" }}
          >
            FOOD AND DRUG ADMINISTRATION
          </div>
          <div style={{ fontSize: "0.61rem" }}>
            Civic Drive, Filinvest Corporate City, Alabang 1781, Muntinlupa,
            Philippines
          </div>
        </div>
        <div style={{ width: "42px" }} />
      </div>

      <div
        style={{
          textAlign: "center",
          fontSize: "0.9rem",
          fontWeight: "700",
          letterSpacing: "0.1em",
          color: dark ? "#dde5f0" : "#1a237e",
          margin: "0.3rem 0 0.65rem",
          textTransform: "uppercase",
        }}
      >
        Certificate of Product Registration
      </div>

      <p
        style={{
          fontSize: "0.69rem",
          color: dark ? "#6a7f99" : "#607d8b",
          fontFamily: "sans-serif",
          lineHeight: 1.65,
          marginBottom: "0.75rem",
          textAlign: "justify",
        }}
      >
        Pursuant to the provisions of Republic Act (R.A.) No. 3720 as amended,
        known as the Foods, Drugs, Devices and Cosmetics Act, and consistent
        with R.A. No. 6675, known as the Generics Act of 1988, and R.A. No.
        9711, otherwise known as the Food and Drug Administration Act of 2009,
        the product described hereunder has been found to conform with the
        requirements and standards for marketing authorization of pharmaceutical
        products per existing regulations in force as of date hereof.
      </p>

      <FieldRow label="Registration Number" dark={dark}>
        {I("regNo")}
      </FieldRow>

      <SectionHead label="Product Information" dark={dark} />
      <FieldRow label="Generic Name" dark={dark}>
        {I("prodGenName")}
      </FieldRow>
      <FieldRow label="Brand Name" dark={dark}>
        {I("prodBrName")}
      </FieldRow>
      <FieldRow label="Dosage Strength & Form" dark={dark}>
        <div style={{ display: "flex", gap: "0.35rem", minWidth: 0 }}>
          {canEdit ? (
            <>
              <input
                style={{ ...IS, width: "125px", flexShrink: 0 }}
                value={get("prodDosStr")}
                onChange={set("prodDosStr")}
                placeholder="Strength"
                onFocus={of_}
                onBlur={ob}
              />
              <input
                style={{ ...IS, flex: 1, minWidth: 0 }}
                value={get("prodDosForm")}
                onChange={set("prodDosForm")}
                placeholder="Dosage Form"
                onFocus={of_}
                onBlur={ob}
              />
            </>
          ) : (
            <>
              <StaticVal value={get("prodDosStr")} dark={dark} />
              <StaticVal value={get("prodDosForm")} dark={dark} />
            </>
          )}
        </div>
      </FieldRow>
      <FieldRow label="Pharmacologic Category" dark={dark}>
        {I("prodPharmaCat")}
      </FieldRow>
      <FieldRow label="Classification" dark={dark}>
        {I("prodClassPrescript")}
      </FieldRow>
      <FieldRow label="Approved Shelf-life" dark={dark}>
        {I("prodDistriShelfLife")}
      </FieldRow>
      <FieldRow label="Storage Condition" multiline dark={dark}>
        {T("storageCond")}
      </FieldRow>
      <FieldRow label="Packaging" dark={dark}>
        {I("packaging")}
      </FieldRow>

      <SectionHead label="Manufacturer" dark={dark} />
      {entityBlock("prodManu", "Manufacturer")}

      <SectionHead label="Trader (if applicable)" dark={dark} />
      {entityBlock("prodTrader", "Trader")}

      <SectionHead label="Importer" dark={dark} />
      {entityBlock("prodImporter", "Importer")}

      <SectionHead label="Distributor" dark={dark} />
      {entityBlock("prodDistri", "Distributor")}

      <SectionHead label="Repacker (if applicable)" dark={dark} />
      {entityBlock("prodRepacker", "Repacker")}

      {/* Validity paragraph */}
      <div
        style={{
          margin: "0.85rem 0 0.45rem",
          padding: "0.65rem 0.85rem",
          background: dark ? "#0e1c2d" : "#eff6ff",
          borderRadius: "7px",
          border: `1px solid ${dark ? "#1c3d5e" : "#bfdbfe"}`,
        }}
      >
        <p
          style={{
            fontSize: "0.71rem",
            fontFamily: "sans-serif",
            color: dark ? "#8aabca" : "#374151",
            lineHeight: 1.7,
            margin: "0 0 0.5rem",
          }}
        >
          The marketing authorization shall be valid until{" "}
          <strong style={{ color: dark ? "#60a5fa" : "#1d4ed8" }}>
            {fmtDate(get("secpaExpDate")) || "__________"}
          </strong>{" "}
          subject to the conditions listed on the reverse side. No change in the
          formulation, labeling and commercial presentation of this product
          shall be made at any time during the effectivity of this registration
          without prior written approval of this Office.
        </p>
        <p
          style={{
            fontSize: "0.71rem",
            fontFamily: "sans-serif",
            color: dark ? "#8aabca" : "#374151",
            lineHeight: 1.7,
            margin: 0,
          }}
        >
          This marketing authorization is subject to suspension, cancellation or
          recall should any violation of R.A. No. 3720, R.A. No. 6675 and R.A.
          No. 9711 and/or regulations issued thereunder involving the product be
          committed.
        </p>
      </div>

      <FieldRow label="Expiry date" dark={dark}>
        {DateI("secpaExpDate")}
      </FieldRow>
      <FieldRow label="Issued On / Issuance Date" dark={dark}>
        {DateI("secpaIssuedOn")}
      </FieldRow>
      <FieldRow
        label="CPR Condition/s Ticked at the back of CPR"
        multiline
        dark={dark}
      >
        {T("cprCond")}
      </FieldRow>
      <FieldRow label="Additional Remarks" multiline dark={dark}>
        {T("cprCondRemarks")}
      </FieldRow>

      {/* Witness */}
      <div
        style={{
          textAlign: "center",
          margin: "0.7rem 0 0.25rem",
          fontFamily: "sans-serif",
          fontSize: "0.73rem",
          color: dark ? "#6a7f99" : "#607d8b",
        }}
      >
        Witness My Hand and Seal of this Office, this&nbsp;
        <strong style={{ color: dark ? "#90caf9" : "#1565c0" }}>
          {fmtDate(get("secpaIssuedOn")) || "__________"}
        </strong>
        .
      </div>
      <div
        style={{
          textAlign: "center",
          fontFamily: "sans-serif",
          fontSize: "0.73rem",
          fontWeight: "700",
          color: dark ? "#8a9ab0" : "#37474f",
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
          borderTop: `1px dashed ${dark ? "#2a2a2a" : "#cfd8dc"}`,
          marginBottom: "0.9rem",
        }}
      >
        <div
          style={{
            fontFamily: "sans-serif",
            fontSize: "0.71rem",
            fontWeight: "700",
            color: dark ? "#ccc" : "#263238",
            marginTop: "0.18rem",
          }}
        >
          DR. CHARMAINE ANN M. RABAGO
        </div>
        <div
          style={{
            fontFamily: "sans-serif",
            fontSize: "0.67rem",
            color: dark ? "#6a7f99" : "#607d8b",
          }}
        >
          Officer-in-Charge, Director IV
        </div>
        <div
          style={{
            fontFamily: "sans-serif",
            fontSize: "0.67rem",
            color: dark ? "#6a7f99" : "#607d8b",
          }}
        >
          Center for Drug Regulation and Research
        </div>
      </div>

      {/* Bottom strip */}
      <div
        style={{
          borderTop: `2px solid ${dark ? "#252525" : "#b0bec5"}`,
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
              color: dark ? "#6a7f99" : "#546e7a",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              marginBottom: "0.3rem",
            }}
          >
            Registration Details
          </div>
          <FootRow
            label="REG. STATUS"
            value={get("appType")}
            onChange={set("appType")}
            placeholder="e.g. Initial (Vet.)"
            dark={dark}
            disabled={!canEdit}
          />
          <FootRow
            label="AMOUNT"
            value={get("fee")}
            onChange={set("fee")}
            placeholder="e.g. Php 15,660"
            dark={dark}
            disabled={!canEdit}
          />
          <FootRow
            label="OR NUMBER"
            value={get("orNo")}
            onChange={set("orNo")}
            placeholder="e.g. ORe 2015779"
            dark={dark}
            disabled={!canEdit}
          />
          <FootRow
            label="DATE"
            value={get("dateExcelUpload")}
            onChange={set("dateExcelUpload")}
            placeholder="e.g. 05 August 2025"
            dark={dark}
            disabled={!canEdit}
          />
          <div
            style={{
              marginTop: "0.4rem",
              fontSize: "0.6rem",
              fontFamily: "sans-serif",
              color: dark ? "#3d5470" : "#90a4ae",
            }}
          >
            *Based on FDA Order No. 2025-0026 and FDA Memorandum 2025-007
          </div>
        </div>
        <div>
          <div
            style={{
              fontSize: "0.66rem",
              fontFamily: "sans-serif",
              fontWeight: "700",
              color: dark ? "#6a7f99" : "#546e7a",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              marginBottom: "0.3rem",
            }}
          >
            SECPA Details
          </div>
          <FootRow
            label="SECPA No."
            value={get("secpa")}
            onChange={set("secpa")}
            placeholder="SECPA Number"
            dark={dark}
            disabled={!canEdit}
          />
        </div>
      </div>

      {/* DOC TRACK */}
      <div
        style={{
          marginTop: "0.45rem",
          paddingTop: "0.4rem",
          borderTop: `1px solid ${dark ? "#1c1c1c" : "#e0e0e0"}`,
          display: "flex",
          flexDirection: "column",
          gap: "0.2rem",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <span
            style={{
              fontSize: "0.67rem",
              fontWeight: "700",
              color: dark ? "#5a7a96" : "#546e7a",
              whiteSpace: "nowrap",
            }}
          >
            DOCTRACK :
          </span>
          {canEdit ? (
            <input
              style={{
                fontSize: "0.7rem",
                fontFamily: "monospace",
                fontWeight: "700",
                color: dark ? "#90caf9" : "#1565c0",
                letterSpacing: "0.08em",
                background: "transparent",
                border: "none",
                borderBottom: `1px dashed ${dark ? "#1e3a5c" : "#90caf9"}`,
                outline: "none",
                width: "160px",
                padding: "0.05rem 0.1rem",
              }}
              value={get("dtn")}
              onChange={set("dtn")}
              placeholder="DTN number"
            />
          ) : (
            <span
              style={{
                fontSize: "0.7rem",
                fontFamily: "monospace",
                fontWeight: "700",
                color: dark ? "#90caf9" : "#1565c0",
                letterSpacing: "0.08em",
              }}
            >
              {get("dtn") || "—"}
            </span>
          )}
          <span
            style={{
              marginLeft: "auto",
              fontSize: "0.67rem",
              fontFamily: "monospace",
              fontWeight: "700",
              color: dark ? "#90caf9" : "#1565c0",
              letterSpacing: "0.04em",
            }}
          >
            {get("secpa") || "—"}
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
              background: `repeating-linear-gradient(90deg,${dark ? "#2a3f5c" : "#111"} 0,${dark ? "#2a3f5c" : "#111"} 1.5px,${dark ? "#0b1929" : "#fff"} 1.5px,${dark ? "#0b1929" : "#fff"} 4px)`,
              borderRadius: "1px",
            }}
          />
          <div
            style={{
              fontSize: "0.52rem",
              fontFamily: "monospace",
              color: dark ? "#6a7f99" : "#546e7a",
              letterSpacing: "0.18em",
            }}
          >
            {get("dtn") || "DOCTRACK"}
          </div>
        </div>
      </div>
    </div>
  );
}

export default StepCPRView;
