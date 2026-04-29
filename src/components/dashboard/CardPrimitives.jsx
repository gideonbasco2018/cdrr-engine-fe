import { FB } from "./constants";

// ─── Card ─────────────────────────────────────────────────────────────────────
export function Card({ children, style = {}, ui }) {
  return (
    <div
      style={{
        background:   ui.cardBg,
        border:       `1px solid ${ui.cardBorder}`,
        borderRadius: 8,
        overflow:     "hidden",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ─── CardHeader ───────────────────────────────────────────────────────────────
export function CardHeader({ title, sub, right, ui }) {
  return (
    <div
      style={{
        display:        "flex",
        alignItems:     "flex-start",
        justifyContent: "space-between",
        padding:        "14px 16px 10px",
      }}
    >
      <div>
        <h2 style={{ fontSize: "1.05rem", fontWeight: 700, color: ui.textPrimary, margin: 0 }}>
          {title}
        </h2>
        {sub && (
          <p style={{ fontSize: "0.8rem", color: ui.textSub, margin: 0, marginTop: 2 }}>
            {sub}
          </p>
        )}
      </div>
      {right}
    </div>
  );
}

// ─── SeeAll button ────────────────────────────────────────────────────────────
export function SeeAll({ onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        background:  "none",
        border:      "none",
        color:       FB,
        fontSize:    "0.84rem",
        fontWeight:  600,
        cursor:      "pointer",
        padding:     0,
        whiteSpace:  "nowrap",
      }}
    >
      See all
    </button>
  );
}
