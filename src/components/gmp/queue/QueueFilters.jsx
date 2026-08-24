// src/components/gmp/queue/QueueFilters.jsx
import React, { useState } from "react";
import { FONT } from "../shared/constants";

const ACCENT = "#6366f1";

const DOT_PALETTE = [
  "#6366f1", "#10b981", "#f59e0b", "#3b82f6", "#ef4444",
  "#8b5cf6", "#06b6d4", "#f97316", "#ec4899", "#14b8a6",
  "#84cc16", "#a855f7",
];
function dotColor(index) { return DOT_PALETTE[index % DOT_PALETTE.length]; }

const GROUP_ACCENT = {
  app_status:       "#10b981",
  est_category:     "#06b6d4",
  transaction_type: "#f97316",
  type_of_issuance: "#8b5cf6",
  // GMP Tasks page's QuickFilterSidebar groups use different keys than
  // GMP Queue's (see GMPTasksPage.jsx) — give them their own accents too,
  // instead of silently falling back to the generic indigo ACCENT.
  category:         "#06b6d4",
  status:           "#10b981",
};

// Reusable chevron icon — clearer than a text glyph, rotates smoothly
function Chevron({ open, size = 9 }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 12 12" fill="none"
      style={{
        transform: open ? "rotate(0deg)" : "rotate(-90deg)",
        transition: "transform 0.18s ease",
        flexShrink: 0, display: "block",
      }}>
      <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function FunnelIcon({ size = 13, color = ACCENT }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 16 16" fill="none"
      style={{ flexShrink: 0, display: "block" }}>
      <path
        d="M1.5 2.5H14.5L9.5 8.3V13L6.5 11.5V8.3L1.5 2.5Z"
        stroke={color} strokeWidth="1.4"
        strokeLinecap="round" strokeLinejoin="round"
        fill={`${color}15`}
      />
    </svg>
  );
}

export function TopTabs({ active, onChange, counts, colors }) {
  const tabs = [
    { id: "all",            label: "All Reports",    icon: "📋" },
    { id: "not_yet_decked", label: "Not Yet Decked", icon: "⏳" },
    { id: "decked",         label: "Decked",         icon: "✅" },
  ];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      {tabs.map((t) => {
        const isA = active === t.id;
        return (
          <button key={t.id} onClick={() => onChange(t.id)}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "7px 16px", fontSize: "0.8rem", fontFamily: FONT,
              fontWeight: isA ? 700 : 500, border: "none", background: "transparent",
              cursor: "pointer", color: isA ? colors.textPrimary : colors.textTertiary,
              borderBottom: isA ? `2px solid ${ACCENT}` : "2px solid transparent",
              transition: "all 0.15s",
            }}>
            {t.icon} {t.label}
            {counts[t.id] != null && (
              <span style={{
                fontSize: "0.65rem", fontWeight: 700, padding: "2px 7px",
                borderRadius: 99, background: isA ? ACCENT : `${ACCENT}15`,
                color: isA ? "#fff" : ACCENT,
              }}>
                {counts[t.id].toLocaleString()}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function FilterGroup({ group, active, onSelect, colors, darkMode }) {
  const [open, setOpen] = useState(true);
  const accent   = GROUP_ACCENT[group.key] ?? ACCENT;
  const nonAll   = group.items.filter(i => i.value !== "all");
  // "All" is active when the group key is "all" or not set
  const groupVal = active[group.key] ?? "all";

  const cardBorder = darkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";
  const cardBg     = darkMode ? "rgba(255,255,255,0.015)" : "#ffffff";

  return (
    <div style={{
      margin: "0 7px 6px",
      border: `1px solid ${cardBorder}`,
      borderTop: `2px solid ${accent}`,
      borderRadius: 7,
      background: cardBg,
      overflow: "hidden",
    }}>
      {/* Group header */}
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: "100%", display: "flex", alignItems: "center",
          justifyContent: "space-between",
          padding: "5px 8px",
          border: "none",
          borderBottom: open ? `1px solid ${cardBorder}` : "none",
          background: "transparent",
          cursor: "pointer",
        }}>
        <span style={{ display: "flex", alignItems: "center", gap: 5, minWidth: 0 }}>
          <span style={{
            width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
            background: accent,
          }} />
          <span style={{
            fontSize: "0.54rem", fontWeight: 700, textTransform: "uppercase",
            letterSpacing: "0.05em", color: colors.textTertiary,
            whiteSpace: "normal", lineHeight: 1.15,
          }}>
            {group.label}
          </span>
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
          <span style={{
            fontSize: "0.56rem", fontWeight: 700, padding: "1px 5px",
            borderRadius: 99,
            background: `${accent}15`,
            color: accent,
          }}>
            {nonAll.length}
          </span>
          {/* Chevron in a visible round button */}
          <span style={{
            width: 15, height: 15, borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center",
            background: darkMode ? "rgba(255,255,255,0.06)" : "#f1f2f4",
            color: colors.textTertiary,
          }}>
            <Chevron open={open} size={7} />
          </span>
        </span>
      </button>

      {open && (
        <div style={{ padding: "2px 5px 4px" }}>
          {group.items.map((item, idx) => {
            // "All" item is active when groupVal === "all"
            const isActive = item.value === "all"
              ? groupVal === "all"
              : groupVal === item.value;
            const isAll   = item.value === "all";
            const itemDot = isAll
              ? accent + "70"
              : (item.color ?? dotColor(idx - 1));

            return (
              <button
                key={item.value}
                onClick={() => onSelect(group.key, item.value)}
                style={{
                  width: "100%", display: "flex", alignItems: "flex-start",
                  justifyContent: "space-between",
                  padding: isAll ? "4px 6px" : "3px 6px",
                  margin: isAll ? "1px 0 2px" : "0",
                  borderRadius: 5,
                  background: isActive
                    ? (darkMode ? "rgba(255,255,255,0.07)" : "#e8e8e8")
                    : "transparent",
                  border: "none", cursor: "pointer", textAlign: "left",
                  transition: "background 0.1s",
                }}
                onMouseEnter={(e) => {
                  if (!isActive)
                    e.currentTarget.style.background = darkMode
                      ? "rgba(255,255,255,0.04)" : "#f2f2f2";
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.background = "transparent";
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0, flex: 1 }}>
                  <span style={{
                    width: 5, height: 5, borderRadius: "50%", flexShrink: 0,
                    background: itemDot,
                  }} />
                  <span style={{
                    fontSize: "0.66rem",
                    fontWeight: isAll ? 600 : (isActive ? 600 : 400),
                    color: isActive ? colors.textPrimary : colors.textSecondary,
                    whiteSpace: "normal", lineHeight: 1.2,
                  }}>
                    {item.label}
                  </span>
                </span>
                <span style={{
                  fontSize: "0.6rem",
                  fontWeight: isAll ? 700 : 400,
                  color: isActive ? colors.textPrimary : colors.textTertiary,
                  flexShrink: 0, marginLeft: 5, marginTop: 1,
                }}>
                  {(item.count ?? 0).toLocaleString()}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function QuickFilterSidebar({ filters, active, onSelect, collapsed, onToggle, colors, darkMode }) {
  return (
    <div style={{
      width: collapsed ? 24 : 195, flexShrink: 0, transition: "width 0.2s ease",
      background: colors.sidebarBg, borderRight: `1px solid ${colors.cardBorder}`,
      display: "flex", flexDirection: "column", overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        padding: collapsed ? "10px 4px" : "9px 10px 8px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        borderBottom: `1px solid ${colors.cardBorder}`, flexShrink: 0,
      }}>
       {!collapsed && (
          <span style={{
            fontSize: "0.72rem", fontWeight: 700, textTransform: "none",
            letterSpacing: "0", color: colors.textPrimary,
            display: "flex", alignItems: "center", gap: 6,
          }}>
            <FunnelIcon size={13} color={ACCENT} />
            Quick Filters
          </span>
        )}
        <button onClick={onToggle}
          style={{
            background: "transparent", border: "none", cursor: "pointer",
            color: colors.textTertiary, fontSize: "0.72rem", padding: 2,
            marginLeft: collapsed ? "auto" : 0, lineHeight: 1,
          }}>
          {collapsed ? "▶" : "◀"}
        </button>
      </div>

      {/* Groups */}
      {!collapsed && (
        <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
          {filters.map((group) => (
            <FilterGroup
              key={group.key}
              group={group}
              active={active}
              onSelect={onSelect}
              colors={colors}
              darkMode={darkMode}
            />
          ))}
        </div>
      )}
    </div>
  );
}