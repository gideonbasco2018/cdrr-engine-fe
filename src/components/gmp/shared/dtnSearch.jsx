// src/components/gmp/shared/dtnSearch.jsx
// Multi-DTN search for the FGMP Queue and Tasks search boxes. Only kicks in
// when the box holds nothing but numbers (2 or more, separated by commas,
// spaces, semicolons or new lines) and at least one is a real 14-digit DTN.
// Numbers that aren't 14 digits are reported back as invalid instead of
// silently turning the whole box into a text search. Any text with letters,
// or a single number, stays a normal search.
import { useState } from "react";

const DTN_RE = /^\d{14}$/;

/** For a multi-DTN search: { dtns: unique valid DTNs, invalid: unique non-DTN
 *  numbers }, both in input order. Otherwise null (normal search). */
export function parseDtnSearch(text) {
  const tokens = String(text ?? "").split(/[\s,;]+/).filter(Boolean);
  if (tokens.length < 2 || !tokens.every((t) => /^\d+$/.test(t))) return null;
  const dtns = [...new Set(tokens.filter((t) => DTN_RE.test(t)))];
  if (dtns.length === 0) return null;
  const invalid = [...new Set(tokens.filter((t) => !DTN_RE.test(t)))];
  return { dtns, invalid };
}

/** A one-line <input> drops the line breaks of a pasted column of DTNs, gluing
 *  them into one long number — turn line breaks into ", " instead. */
export function handleMultilinePaste(e, value, setValue) {
  const text = e.clipboardData?.getData("text") ?? "";
  if (!/[\r\n]/.test(text)) return;
  e.preventDefault();
  const pasted = text.split(/\r?\n/).map((s) => s.trim()).filter(Boolean).join(", ");
  const el = e.target;
  const start = el.selectionStart ?? value.length;
  const end = el.selectionEnd ?? value.length;
  setValue(value.slice(0, start) + pasted + value.slice(end));
}

/** "10 of 12 DTNs found · Not found: …" — shown under the search box. */
export function DtnSearchSummary({ dtns, invalid = [], foundDtns, colors, note }) {
  const [copied, setCopied] = useState(false);
  if (!dtns || !foundDtns) return null;
  const found = new Set(foundDtns);
  const missing = dtns.filter((d) => !found.has(d));
  const allFound = missing.length === 0 && invalid.length === 0;

  const copyMissing = async () => {
    try {
      await navigator.clipboard.writeText(missing.join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* clipboard blocked — the list is still visible */ }
  };

  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 8, flexWrap: "wrap",
      fontSize: "0.7rem", lineHeight: 1.5, color: colors.textSecondary,
      padding: "5px 10px", borderRadius: 7,
      background: allFound ? "rgba(16,185,129,0.08)" : "rgba(245,158,11,0.1)",
      border: `1px solid ${allFound ? "rgba(16,185,129,0.25)" : "rgba(245,158,11,0.3)"}`,
    }}>
      <strong style={{ color: allFound ? "#059669" : "#b45309", whiteSpace: "nowrap" }}>
        {dtns.length - missing.length} of {dtns.length} DTNs found
      </strong>
      {missing.length > 0 && (
        <>
          <span>· Not found:</span>
          <span style={{ fontFamily: "ui-monospace,monospace", wordBreak: "break-all", flex: "1 1 200px" }}>
            {missing.join(", ")}
          </span>
          <button type="button" onClick={copyMissing} style={{
            border: "none", background: "transparent", color: "#1976d2", cursor: "pointer",
            fontSize: "0.68rem", fontWeight: 700, padding: 0, whiteSpace: "nowrap",
          }}>
            {copied ? "Copied" : "Copy not found"}
          </button>
        </>
      )}
      {invalid.length > 0 && (
        <span style={{ width: "100%", color: "#dc2626" }}>
          Not valid DTNs (must be 14 digits), skipped:{" "}
          <span style={{ fontFamily: "ui-monospace,monospace", wordBreak: "break-all" }}>{invalid.join(", ")}</span>
        </span>
      )}
      {note && <span style={{ width: "100%", color: colors.textTertiary }}>{note}</span>}
    </div>
  );
}
