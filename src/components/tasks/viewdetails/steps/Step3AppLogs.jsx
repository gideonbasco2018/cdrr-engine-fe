import { useState, useEffect } from "react";
import { getApplicationLogs } from "../../../../api/application-logs";

const STATUS_CONFIG = {
  COMPLETED: {
    bg: "rgba(16,185,129,0.1)",
    color: "#059669",
    label: "Completed",
  },
  "IN PROGRESS": {
    bg: "rgba(33,150,243,0.1)",
    color: "#1976D2",
    label: "In progress",
  },
};

const DECISION_STYLE = (d = "") => {
  const l = d.toLowerCase();
  if (l.includes("approved") || l.includes("released"))
    return { bg: "rgba(16,185,129,0.1)", color: "#059669" };
  if (l.includes("rejected"))
    return { bg: "rgba(239,68,68,0.1)", color: "#ef4444" };
  return {
    bg: "var(--color-background-info)",
    color: "var(--color-text-info)",
  };
};

function UserAvatar({ name, size = 40 }) {
  const initials = (name ?? "?")[0].toUpperCase();
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 3,
        flexShrink: 0,
        width: 130,
      }}
    >
      <div
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          background: "rgba(99,102,241,0.13)",
          color: "#6366f1",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: size * 0.44,
          fontWeight: 600,
          flexShrink: 0,
          border: "1.5px solid rgba(99,102,241,0.18)",
        }}
      >
        {initials}
      </div>
      <span
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: "var(--color-text-tertiary)",
          fontWeight: 500,
          textAlign: "center",
          maxWidth: 90,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          lineHeight: 1.2,
        }}
      >
        {name}
      </span>
    </div>
  );
}

function StepperNode({ status, index, isLast }) {
  const isDone = status === "COMPLETED";
  const isActive = status === "IN PROGRESS";
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width: 36,
        flexShrink: 0,
        paddingTop: 14,
      }}
    >
      <div
        style={{
          width: 26,
          height: 26,
          borderRadius: "50%",
          flexShrink: 0,
          zIndex: 1,
          background: isDone
            ? "#10b981"
            : isActive
              ? "#185FA5"
              : "var(--color-background-secondary)",
          color: isDone || isActive ? "#fff" : "var(--color-text-tertiary)",
          border:
            isDone || isActive
              ? "none"
              : "0.5px solid var(--color-border-secondary)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 11,
          fontWeight: 500,
        }}
      >
        {isDone ? (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path
              d="M2 6l3 3 5-5"
              stroke="#fff"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : (
          index
        )}
      </div>
      {!isLast && (
        <div
          style={{
            flex: 1,
            width: 2,
            minHeight: 12,
            margin: "4px 0",
            background: isDone ? "#10b981" : "var(--color-border-tertiary)",
          }}
        />
      )}
    </div>
  );
}

function FieldLabel({ children }) {
  return (
    <span
      style={{
        fontSize: 9,
        fontWeight: 600,
        color: "var(--color-text-tertiary)",
        textTransform: "uppercase",
        letterSpacing: "0.07em",
        display: "block",
        marginBottom: 2,
      }}
    >
      {children}
    </span>
  );
}

function DateBlock({ startDate, accomplishedDate }) {
  const fmt = (d) =>
    d
      ? new Date(d).toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        })
      : null;

  const Row = ({ label, value, color }) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <FieldLabel>{label}</FieldLabel>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        {/* Dot */}
        <div
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: value ? color : "var(--color-border-secondary)",
            flexShrink: 0,
          }}
        />

        {/* Date value */}
        <span
          style={{
            fontSize: 11,
            color: value
              ? "var(--color-text-primary)"
              : "var(--color-text-tertiary)",
            fontStyle: value ? "normal" : "italic",
            fontWeight: value ? 500 : 400,
          }}
        >
          {value ?? "—"}
        </span>
      </div>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <Row label="Start Date" value={fmt(startDate)} color="#10b981" />

      <Row
        label="Accomplished Date"
        value={fmt(accomplishedDate)}
        color="#2196F3"
      />
    </div>
  );
}

function LogCard({ log, index, isLast }) {
  const status = log.application_status ?? "";
  const isActive = status === "IN PROGRESS";
  const statusCfg = STATUS_CONFIG[status] ?? {
    bg: "rgba(100,100,100,0.08)",
    color: "var(--color-text-tertiary)",
    label: status,
  };
  const decStyle = log.application_decision
    ? DECISION_STYLE(log.application_decision)
    : null;

  return (
    <div style={{ display: "flex", alignItems: "stretch", gap: 0 }}>
      <StepperNode
        status={status}
        index={log.del_index ?? index + 1}
        isLast={isLast}
      />

      <div style={{ flex: 1, paddingBottom: isLast ? 0 : 12 }}>
        <div
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = "0 6px 18px rgba(0,0,0,0.6)";
            e.currentTarget.style.transform = "translateY(-2px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow =
              "0 2px 8px rgba(255,255,255,0.04)";
            e.currentTarget.style.transform = "translateY(0)";
          }}
          style={{
            background: "var(--color-background-primary)",
            border: `1px solid ${isActive ? "#2196F3" : "rgba(0,0,0,0.08)"}`,
            borderRadius: "10px",
            overflow: "hidden",
            marginLeft: 10,
            boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
            borderLeft: `4px solid ${
              status === "COMPLETED"
                ? "#10b981"
                : status === "IN PROGRESS"
                  ? "#2196F3"
                  : "#6b7280"
            }`,
            transition: "all 0.15s ease",
            cursor: "default",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "8px 12px",
              borderBottom: "0.5px solid var(--color-border-tertiary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 6,
              background: isActive ? "rgba(33,150,243,0.04)" : "transparent",
            }}
          >
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "var(--color-text-primary)",
              }}
            >
              {log.application_step}
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 500,
                  padding: "2px 8px",
                  borderRadius: 20,
                  background: statusCfg.bg,
                  color: statusCfg.color,
                }}
              >
                {statusCfg.label}
              </span>
              {log.del_thread && (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 500,
                    padding: "2px 8px",
                    borderRadius: 20,
                    background:
                      log.del_thread === "Close"
                        ? "rgba(100,100,100,0.08)"
                        : "rgba(245,158,11,0.08)",
                    color:
                      log.del_thread === "Close"
                        ? "var(--color-text-secondary)"
                        : "#b45309",
                    border: `0.5px solid ${log.del_thread === "Close" ? "var(--color-border-tertiary)" : "rgba(245,158,11,0.2)"}`,
                  }}
                >
                  {log.del_thread === "Close" ? "Closed" : "Open"}
                </span>
              )}
            </div>
          </div>

          {/* Body */}
          <div
            style={{
              padding: "10px 12px",
              display: "flex",
              gap: 10,
              alignItems: "flex-start",
            }}
          >
            {/* Left: User Avatar */}
            {log.user_name && <UserAvatar name={log.user_name} size={40} />}

            {/* Right: 4-column grid */}
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              {/* Row 1: Decision | Action | Dates | Meta */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr 1fr",
                  gap: 8,
                  alignItems: "start",
                }}
              >
                {/* Decision */}
                <div>
                  <FieldLabel>Decision</FieldLabel>
                  {log.application_decision ? (
                    <span
                      style={{
                        display: "inline-flex",
                        fontSize: 11,
                        fontWeight: 500,
                        padding: "3px 8px",
                        borderRadius: 5,
                        background: decStyle.bg,
                        color: decStyle.color,
                      }}
                    >
                      {log.application_decision}
                    </span>
                  ) : (
                    <span
                      style={{
                        fontSize: 11,
                        color: "var(--color-text-tertiary)",
                        fontStyle: "italic",
                      }}
                    >
                      Pending...
                    </span>
                  )}
                </div>

                {/* Action */}
                <div>
                  <FieldLabel>Action</FieldLabel>
                  {log.action_type ? (
                    <span
                      style={{
                        display: "inline-flex",
                        fontSize: 11,
                        fontWeight: 500,
                        padding: "3px 8px",
                        borderRadius: 20,
                        background: "rgba(99,102,241,0.08)",
                        color: "#6366f1",
                        border: "0.5px solid rgba(99,102,241,0.2)",
                      }}
                    >
                      {log.action_type}
                    </span>
                  ) : (
                    <span
                      style={{
                        fontSize: 11,
                        color: "var(--color-text-tertiary)",
                      }}
                    >
                      —
                    </span>
                  )}
                </div>

                {/* Dates */}
                <DateBlock
                  startDate={log.start_date}
                  accomplishedDate={log.accomplished_date}
                />

                {/* Meta */}
                <div>
                  <FieldLabel>Meta</FieldLabel>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {log.del_index != null && (
                      <span
                        style={{
                          fontSize: 10,
                          padding: "2px 6px",
                          background: "var(--color-background-secondary)",
                          border: "0.5px solid var(--color-border-tertiary)",
                          borderRadius: 4,
                          color: "var(--color-text-tertiary)",
                        }}
                      >
                        Index: {log.del_index}
                      </span>
                    )}
                    {log.del_previous != null && (
                      <span
                        style={{
                          fontSize: 10,
                          padding: "2px 6px",
                          background: "var(--color-background-secondary)",
                          border: "0.5px solid var(--color-border-tertiary)",
                          borderRadius: 4,
                          color: "var(--color-text-tertiary)",
                        }}
                      >
                        Prev: {log.del_previous}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Row 2 (optional): Decision result + Authority + Remarks */}
              {(log.decision_result ||
                log.decision_authority_name ||
                log.application_remarks) && (
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    flexWrap: "wrap",
                    alignItems: "flex-start",
                  }}
                >
                  {log.decision_result && (
                    <div>
                      <FieldLabel>Result</FieldLabel>
                      <span
                        style={{
                          display: "inline-flex",
                          fontSize: 11,
                          fontWeight: 500,
                          padding: "3px 8px",
                          borderRadius: 20,
                          background: "rgba(8,145,178,0.08)",
                          color: "#0891b2",
                          border: "0.5px solid rgba(8,145,178,0.2)",
                        }}
                      >
                        {log.decision_result}
                      </span>
                    </div>
                  )}

                  {log.decision_authority_name && (
                    <div>
                      <FieldLabel>Authority</FieldLabel>
                      <div
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 5,
                          padding: "3px 8px",
                          borderRadius: 5,
                          background: "rgba(245,158,11,0.07)",
                          border: "0.5px solid rgba(245,158,11,0.2)",
                          fontSize: 11,
                          fontWeight: 500,
                          color: "#b45309",
                        }}
                      >
                        <div
                          style={{
                            width: 16,
                            height: 16,
                            borderRadius: "50%",
                            background:
                              "linear-gradient(135deg, #f59e0b, #d97706)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 8,
                            fontWeight: 700,
                            color: "#fff",
                            flexShrink: 0,
                          }}
                        >
                          {log.decision_authority_name[0].toUpperCase()}
                        </div>
                        {log.decision_authority_name}
                      </div>
                    </div>
                  )}

                  {log.application_remarks && (
                    <div style={{ flex: 1, minWidth: 120 }}>
                      <FieldLabel>Remarks</FieldLabel>
                      <div
                        style={{
                          padding: "6px 10px",
                          background: "var(--color-background-secondary)",
                          borderRadius: "var(--border-radius-md)",
                          borderLeft: "2px solid var(--color-border-secondary)",
                          fontSize: 11,
                          color: "var(--color-text-primary)",
                          lineHeight: 1.5,
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-word",
                        }}
                      >
                        {log.application_remarks}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Step3AppLogs({ record, colors }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!record?.mainDbId) return;
    (async () => {
      try {
        setLoading(true);
        const data = await getApplicationLogs(record.mainDbId);
        const sorted = [...(Array.isArray(data) ? data : [])].sort(
          (a, b) => (a.del_index ?? 0) - (b.del_index ?? 0),
        );
        setLogs(sorted);
      } catch {
        setError("Failed to load application logs.");
      } finally {
        setLoading(false);
      }
    })();
  }, [record?.mainDbId]);

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "2rem",
          justifyContent: "center",
          fontSize: 12,
          color: "var(--color-text-tertiary)",
        }}
      >
        <div
          style={{
            width: 14,
            height: 14,
            border: "2px solid rgba(33,150,243,0.2)",
            borderTopColor: "#2196F3",
            borderRadius: "50%",
            animation: "spin 0.6s linear infinite",
          }}
        />
        Loading application logs...
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          padding: "12px 16px",
          background: "rgba(239,68,68,0.07)",
          border: "0.5px solid rgba(239,68,68,0.2)",
          borderRadius: "var(--border-radius-md)",
          color: "#ef4444",
          fontSize: 12,
        }}
      >
        {error}
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div
        style={{
          padding: "2rem",
          textAlign: "center",
          color: "var(--color-text-tertiary)",
          fontSize: 12,
          fontStyle: "italic",
        }}
      >
        No application logs found for this record.
      </div>
    );
  }

  const completed = logs.filter(
    (l) => l.application_status === "COMPLETED",
  ).length;
  const inProgress = logs.filter(
    (l) => l.application_status === "IN PROGRESS",
  ).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {/* Summary strip */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 12px",
          marginBottom: 12,
          background: "var(--color-background-secondary)",
          borderRadius: "var(--border-radius-md)",
          fontSize: 12,
          color: "var(--color-text-secondary)",
        }}
      >
        <span>
          <strong
            style={{ color: "var(--color-text-primary)", fontWeight: 500 }}
          >
            {logs.length}
          </strong>{" "}
          log{logs.length !== 1 ? "s" : ""} · DTN{" "}
          <strong style={{ color: "#185FA5", fontWeight: 500 }}>
            {record.dtn}
          </strong>
        </span>
        <div style={{ display: "flex", gap: 6 }}>
          {completed > 0 && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 500,
                padding: "2px 8px",
                borderRadius: 20,
                background: "rgba(16,185,129,0.1)",
                color: "#059669",
              }}
            >
              {completed} completed
            </span>
          )}
          {inProgress > 0 && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 500,
                padding: "2px 8px",
                borderRadius: 20,
                background: "rgba(33,150,243,0.1)",
                color: "#1976D2",
              }}
            >
              {inProgress} in progress
            </span>
          )}
        </div>
      </div>

      {/* Log cards with stepper */}
      {logs.map((log, index) => (
        <LogCard
          key={log.id}
          log={log}
          index={index}
          isLast={index === logs.length - 1}
        />
      ))}
    </div>
  );
}
