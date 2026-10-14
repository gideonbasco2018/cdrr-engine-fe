// src/components/monitoring/evaluatorAppTypes/EvaluatorAppTypesView.jsx
import { useEffect, useMemo, useState } from "react";
import { getEvaluatorAppTypes } from "../../../api/evaluatorAppTypes";

const FB = "#1877F2";
const DEFAULT_STEP = "QUALITY EVALUATION";
const ALL_STEPS = "__ALL__";

const shortPrescription = (p) =>
  p === "Over-the-Counter (OTC)"
    ? "OTC"
    : p === "Prescription Drug (RX)"
      ? "RX"
      : p;

const fmtDays = (d) => (d == null ? "—" : `${d} ${d === 1 ? "day" : "days"}`);

// "QUALITY EVALUATION" -> "Quality Evaluation" (keeps S&E as is)
const prettyStep = (s) =>
  s === "S&E" ? s : s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

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
      <div title="Applications decked to this user in the selected step">
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
      <div style={small} title="Thread is still Open">
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
        title="Average days from decked to completed in the selected step (completed rows only)"
      >
        avg stay{" "}
        <span style={{ fontWeight: 600, color: ui.textSub }}>
          {fmtDays(stat.avg_days)}
        </span>
      </div>
    </td>
  );
}

// Used when "All steps" is selected: one labeled block per step that has data
function AllStepsCell({ statsByStep, steps, ui }) {
  const present = steps.filter(
    (s) => statsByStep && statsByStep[s] && statsByStep[s].count > 0,
  );
  if (present.length === 0) {
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
  const small = { fontSize: "0.64rem", color: ui.textMuted, lineHeight: 1.4 };
  return (
    <td style={{ padding: "8px 10px", verticalAlign: "top" }}>
      {present.map((s, i) => {
        const st = statsByStep[s];
        return (
          <div
            key={s}
            style={{
              padding: "4px 0",
              borderTop: i === 0 ? "none" : `1px dashed ${ui.divider}`,
              whiteSpace: "nowrap",
              textAlign: "left",
            }}
          >
            <div style={{ fontSize: "0.64rem", fontWeight: 700, color: FB }}>
              {prettyStep(s)}
            </div>
            <div style={small}>
              <span
                style={{
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  color: ui.textPrimary,
                }}
              >
                {st.count.toLocaleString()}
              </span>{" "}
              decked ·{" "}
              <span
                style={{
                  color: st.open > 0 ? "#f59e0b" : ui.textMuted,
                  fontWeight: 600,
                }}
              >
                {st.open.toLocaleString()}
              </span>{" "}
              open · avg{" "}
              <span style={{ fontWeight: 600, color: ui.textSub }}>
                {fmtDays(st.avg_days)}
              </span>
            </div>
          </div>
        );
      })}
    </td>
  );
}

function Legend({ ui, stepLabel }) {
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
        <span style={b}>decked</span> = applications that reached the user in{" "}
        <span style={{ ...b, color: FB }}>{stepLabel}</span>
      </span>
      <span style={item}>
        <span style={{ ...b, color: "#f59e0b" }}>open</span> = thread is still
        Open
      </span>
      <span style={item}>
        <span style={b}>avg stay</span> = average days from decked to completed
        in {stepLabel} (completed only)
      </span>
    </div>
  );
}

// Fixed heights of the two header rows, so the second row can stick right
// below the first one.
const HEAD_ROW_1_HEIGHT = 32;
const HEAD_ROW_2_HEIGHT = 34;

function UnitSection({ unit, columns, groups, step, steps, ui }) {
  const [open, setOpen] = useState(true);
  const isAll = step === ALL_STEPS;
  const stickyLeft = {
    position: "sticky",
    left: 0,
    zIndex: 1,
    background: ui.cardBg,
  };
  // Sticky header cell. A box-shadow draws the bottom line because borders
  // of sticky cells do not follow them while scrolling in collapsed tables.
  const frozenHead = (top, zIndex, height) => ({
    position: "sticky",
    top,
    zIndex,
    boxSizing: "border-box",
    ...(height ? { height } : {}),
    boxShadow: `inset 0 -1px 0 ${ui.divider}`,
  });
  const unitTotals = unit.totals || {};
  const unitTotal = isAll
    ? Object.values(unitTotals).reduce((a, b) => a + b, 0)
    : unitTotals[step] || 0;
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
          {unitTotal.toLocaleString()} decked{isAll ? " (all steps)" : ""}
        </span>
      </div>

      {open && (
        // Both scroll directions live in this container so the header rows
        // (sticky top) and the User column (sticky left) stay frozen.
        <div style={{ overflow: "auto", maxHeight: "70vh" }}>
          <table
            style={{ borderCollapse: "collapse", width: "100%", minWidth: 600 }}
          >
            <thead>
              <tr>
                <th
                  rowSpan={2}
                  style={hdr(ui, {
                    ...stickyLeft,
                    ...frozenHead(0, 4),
                    textAlign: "left",
                    paddingLeft: 14,
                    minWidth: 180,
                  })}
                >
                  User
                </th>
                {groups.map((g) => (
                  <th
                    key={g.prescription}
                    colSpan={g.count}
                    style={hdr(ui, {
                      ...frozenHead(0, 3, HEAD_ROW_1_HEIGHT),
                      borderLeft: `1px solid ${ui.divider}`,
                      color: FB,
                    })}
                  >
                    {shortPrescription(g.prescription)}
                  </th>
                ))}
                <th
                  rowSpan={2}
                  style={hdr(ui, {
                    ...frozenHead(0, 3),
                    borderLeft: `1px solid ${ui.divider}`,
                  })}
                >
                  Total decked
                </th>
              </tr>
              <tr>
                {columns.map((c, i) => (
                  <th
                    key={c.key}
                    style={hdr(ui, {
                      ...frozenHead(HEAD_ROW_1_HEIGHT, 3, HEAD_ROW_2_HEIGHT),
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
                  {columns.map((c) =>
                    isAll ? (
                      <AllStepsCell
                        key={c.key}
                        statsByStep={m.stats[c.key]}
                        steps={steps}
                        ui={ui}
                      />
                    ) : (
                      <StatCell
                        key={c.key}
                        stat={m.stats[c.key] && m.stats[c.key][step]}
                        ui={ui}
                      />
                    ),
                  )}
                  {isAll ? (
                    <td style={{ padding: "8px 10px", verticalAlign: "top" }}>
                      {steps
                        .filter((s) => m.totals && m.totals[s] > 0)
                        .map((s) => (
                          <div
                            key={s}
                            style={{
                              fontSize: "0.7rem",
                              whiteSpace: "nowrap",
                              color: ui.textMuted,
                              lineHeight: 1.6,
                            }}
                          >
                            {prettyStep(s)}:{" "}
                            <span style={{ fontWeight: 700, color: FB }}>
                              {m.totals[s].toLocaleString()}
                            </span>
                          </div>
                        ))}
                    </td>
                  ) : (
                    <td
                      style={{
                        textAlign: "center",
                        fontSize: "0.88rem",
                        fontWeight: 700,
                        color: FB,
                      }}
                    >
                      {((m.totals && m.totals[step]) || 0).toLocaleString()}
                    </td>
                  )}
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
  const [step, setStep] = useState(DEFAULT_STEP);
  const [data, setData] = useState({ columns: [], steps: [], units: [] });
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

  // If the selected step does not exist in the data, fall back to the first one
  const activeStep = useMemo(() => {
    if (step === ALL_STEPS || data.steps.includes(step)) return step;
    return data.steps[0] || step;
  }, [data.steps, step]);
  const stepLabel =
    activeStep === ALL_STEPS ? "All steps" : prettyStep(activeStep);

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
          User Workload by Step
        </h2>
        <p
          style={{
            margin: "2px 0 0",
            fontSize: "0.76rem",
            color: ui.textMuted,
          }}
        >
          Pick a step, then see per user how many were decked, how many are
          still open, and the average stay. Columns are Product Classification,
          then Processing type / Entry type.
        </p>
      </div>

      <Legend ui={ui} stepLabel={stepLabel} />

      <div
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          marginBottom: 14,
          alignItems: "center",
        }}
      >
        <label style={{ fontSize: "0.74rem", color: ui.textMuted }}>
          Step{" "}
          <select
            value={activeStep}
            onChange={(e) => setStep(e.target.value)}
            style={{ ...inputStyle, fontWeight: 600 }}
          >
            <option value={ALL_STEPS}>All steps</option>
            {data.steps.map((s) => (
              <option key={s} value={s}>
                {prettyStep(s)}
              </option>
            ))}
          </select>
        </label>
        <input
          placeholder="Search user…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ ...inputStyle, width: 200 }}
        />
        <label style={{ fontSize: "0.74rem", color: ui.textMuted }}>
          Decked from{" "}
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            style={inputStyle}
          />
        </label>
        <label style={{ fontSize: "0.74rem", color: ui.textMuted }}>
          Decked to{" "}
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
            step={activeStep}
            steps={data.steps}
            ui={ui}
          />
        ))}
    </div>
  );
}
