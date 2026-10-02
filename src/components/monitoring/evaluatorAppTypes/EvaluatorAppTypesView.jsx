// src/components/monitoring/evaluatorAppTypes/EvaluatorAppTypesView.jsx
import { useEffect, useMemo, useState } from "react";
import { getEvaluatorAppTypes } from "../../../api/evaluatorAppTypes";

const FB = "#1877F2";

const shortPrescription = (p) =>
  p === "Over-the-Counter (OTC)"
    ? "OTC"
    : p === "Prescription Drug (RX)"
      ? "RX"
      : p;

const fmtDays = (d) => (d == null ? "—" : `${d} ${d === 1 ? "day" : "days"}`);

const hdr = (ui, extra = {}) => ({
  padding: "8px 10px",
  fontSize: "0.68rem",
  fontWeight: 700,
  color: ui.textMuted,
  textAlign: "center",
  whiteSpace: "nowrap",
  borderBottom: `1px solid ${ui.divider}`,
  background: ui.cardBg,
  ...extra,
});

function StatCell({ stat, ui }) {
  const empty = !stat || stat.count === 0;
  if (empty) {
    return (
      <td
        style={{
          padding: "8px 10px",
          textAlign: "center",
          color: ui.textMuted,
        }}
      >
        —
      </td>
    );
  }

  const small = { fontSize: "0.66rem", color: ui.textMuted, lineHeight: 1.5 };
  return (
    <td
      style={{ padding: "8px 10px", textAlign: "center", whiteSpace: "nowrap" }}
    >
      <div title="Total applications decked to this evaluator">
        <span
          style={{
            fontSize: "0.86rem",
            fontWeight: 700,
            color: ui.textPrimary,
          }}
        >
          {stat.count.toLocaleString()}
        </span>{" "}
        <span style={small}>decked</span>
      </div>
      <div style={small} title="The application thread is still Open">
        <span
          style={{
            color: stat.open > 0 ? "#f59e0b" : ui.textMuted,
            fontWeight: 600,
          }}
        >
          {stat.open.toLocaleString()}
        </span>{" "}
        open
      </div>
      <div
        style={small}
        title="Average days from decked to completed (only rows that have a completion date)"
      >
        avg stay{" "}
        <span style={{ fontWeight: 600, color: ui.textSub }}>
          {fmtDays(stat.avg_days)}
        </span>
      </div>
    </td>
  );
}

function Legend({ ui }) {
  const item = { fontSize: "0.72rem", color: ui.textMuted };
  const b = { fontWeight: 700, color: ui.textPrimary };
  return (
    <div
      style={{
        display: "flex",
        gap: 18,
        flexWrap: "wrap",
        padding: "8px 12px",
        marginBottom: 14,
        background: ui.cardBg,
        border: `1px solid ${ui.cardBorder}`,
        borderRadius: 8,
      }}
    >
      <span style={item}>
        <span style={b}>decked</span> = all applications assigned to the
        evaluator
      </span>
      <span style={item}>
        <span style={{ ...b, color: "#f59e0b" }}>open</span> = the application
        thread is still Open
      </span>
      <span style={item}>
        <span style={b}>avg stay</span> = average days from decked to completed
        (completed only)
      </span>
    </div>
  );
}

function UnitSection({ unit, columns, groups, ui }) {
  const [open, setOpen] = useState(true);
  const stickyLeft = {
    position: "sticky",
    left: 0,
    zIndex: 1,
    background: ui.cardBg,
  };
  return (
    <div
      style={{
        background: ui.cardBg,
        border: `1px solid ${ui.cardBorder}`,
        borderRadius: 10,
        overflow: "hidden",
        marginBottom: 12,
      }}
    >
      <div
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "10px 14px",
          cursor: "pointer",
          borderBottom: open ? `1px solid ${ui.divider}` : "none",
        }}
      >
        <span
          style={{
            fontSize: "0.88rem",
            fontWeight: 700,
            color: ui.textPrimary,
          }}
        >
          {open ? "▾" : "▸"} {unit.unit_name}
        </span>
        <span style={{ fontSize: "0.72rem", color: ui.textMuted }}>
          {unit.members.length} member{unit.members.length !== 1 ? "s" : ""} ·{" "}
          {unit.total.toLocaleString()} decked
        </span>
      </div>

      {open && (
        <div style={{ overflowX: "auto" }}>
          <table
            style={{ borderCollapse: "collapse", width: "100%", minWidth: 600 }}
          >
            <thead>
              <tr>
                <th
                  rowSpan={2}
                  style={hdr(ui, {
                    ...stickyLeft,
                    textAlign: "left",
                    paddingLeft: 14,
                    minWidth: 180,
                  })}
                >
                  Evaluator
                </th>
                {groups.map((g) => (
                  <th
                    key={g.prescription}
                    colSpan={g.count}
                    style={hdr(ui, {
                      borderLeft: `1px solid ${ui.divider}`,
                      color: FB,
                    })}
                  >
                    {shortPrescription(g.prescription)}
                  </th>
                ))}
                <th
                  rowSpan={2}
                  style={hdr(ui, { borderLeft: `1px solid ${ui.divider}` })}
                >
                  Total decked
                </th>
              </tr>
              <tr>
                {columns.map((c, i) => (
                  <th
                    key={c.key}
                    style={hdr(ui, {
                      fontWeight: 600,
                      borderLeft:
                        i === 0 ||
                        columns[i - 1].prescription !== c.prescription
                          ? `1px solid ${ui.divider}`
                          : "none",
                    })}
                  >
                    {c.processing_type} / {c.entry_type}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {unit.members.map((m, i) => (
                <tr
                  key={m.user_id}
                  style={{
                    borderBottom:
                      i < unit.members.length - 1
                        ? `1px solid ${ui.divider}`
                        : "none",
                  }}
                >
                  <td
                    style={{
                      ...stickyLeft,
                      padding: "8px 14px",
                      fontSize: "0.82rem",
                      fontWeight: 600,
                      color: ui.textPrimary,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {m.name}
                  </td>
                  {columns.map((c) => (
                    <StatCell key={c.key} stat={m.stats[c.key]} ui={ui} />
                  ))}
                  <td
                    style={{
                      textAlign: "center",
                      fontSize: "0.88rem",
                      fontWeight: 700,
                      color: FB,
                    }}
                  >
                    {m.total.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function EvaluatorAppTypesView({ ui, darkMode }) {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [search, setSearch] = useState("");
  const [data, setData] = useState({ columns: [], units: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    getEvaluatorAppTypes({
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
    })
      .then((res) => !cancelled && setData(res))
      .catch(
        () => !cancelled && setError("Failed to load data. Please try again."),
      )
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [dateFrom, dateTo]);

  // Consecutive columns that share a prescription form one header group
  const groups = useMemo(() => {
    const out = [];
    data.columns.forEach((c) => {
      const last = out[out.length - 1];
      if (last && last.prescription === c.prescription) last.count += 1;
      else out.push({ prescription: c.prescription, count: 1 });
    });
    return out;
  }, [data.columns]);

  const units = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data.units;
    return data.units
      .map((u) => ({
        ...u,
        members: u.members.filter((m) => m.name.toLowerCase().includes(q)),
      }))
      .filter((u) => u.members.length > 0);
  }, [data.units, search]);

  const inputStyle = {
    background: ui.inputBg,
    border: `1px solid ${ui.cardBorder}`,
    borderRadius: 7,
    padding: "6px 10px",
    fontSize: "0.78rem",
    color: ui.textPrimary,
    outline: "none",
    colorScheme: darkMode ? "dark" : "light",
  };

  return (
    <div>
      <div style={{ marginBottom: 14 }}>
        <h2 style={{ margin: 0, fontSize: "1.05rem", color: ui.textPrimary }}>
          Evaluator Workload by Application Type
        </h2>
        <p
          style={{
            margin: "2px 0 0",
            fontSize: "0.76rem",
            color: ui.textMuted,
          }}
        >
          Columns are Prescription classification, then Processing type / Entry
          type.
        </p>
      </div>

      <Legend ui={ui} />

      <div
        style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}
      >
        <input
          placeholder="Search evaluator…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ ...inputStyle, width: 200 }}
        />
        <label style={{ fontSize: "0.74rem", color: ui.textMuted }}>
          From{" "}
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            style={inputStyle}
          />
        </label>
        <label style={{ fontSize: "0.74rem", color: ui.textMuted }}>
          To{" "}
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            style={inputStyle}
          />
        </label>
        {(dateFrom || dateTo) && (
          <button
            onClick={() => {
              setDateFrom("");
              setDateTo("");
            }}
            style={{
              ...inputStyle,
              cursor: "pointer",
              background: "transparent",
              color: ui.textMuted,
            }}
          >
            Reset
          </button>
        )}
      </div>

      {loading && (
        <p style={{ color: ui.textMuted, fontSize: "0.84rem" }}>Loading…</p>
      )}
      {error && (
        <p style={{ color: "#e02020", fontSize: "0.84rem" }}>{error}</p>
      )}
      {!loading && !error && units.length === 0 && (
        <p style={{ color: ui.textMuted, fontSize: "0.84rem" }}>
          No records found.
        </p>
      )}
      {!loading &&
        !error &&
        units.map((u) => (
          <UnitSection
            key={u.unit_id ?? "none"}
            unit={u}
            columns={data.columns}
            groups={groups}
            ui={ui}
          />
        ))}
    </div>
  );
}
