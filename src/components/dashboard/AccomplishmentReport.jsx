import { FB } from "./constants";
import { TARGETS_WEEKLY } from "./constants";
import { formatDateRange, daysUntil } from "./utils";

export default function AccomplishmentReport({ onClose, totals, ui, customDates }) {
  const displayPeriod  = formatDateRange(customDates?.start, customDates?.end);
  const daysLeftVal    = daysUntil(customDates?.end);
  const completedRate  =
    totals.received > 0 ? ((totals.completed / totals.received) * 100).toFixed(1) : "0.0";

  return (
    <div
      style={{ position:"fixed", inset:0, zIndex:1000, background:"rgba(0,0,0,0.5)",
               display:"flex", alignItems:"center", justifyContent:"center",
               padding:16, overflowY:"auto" }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background:ui.cardBg, border:`1px solid ${ui.cardBorder}`, borderRadius:12,
                 width:"100%", maxWidth:620, maxHeight:"90vh", display:"flex", flexDirection:"column" }}
      >
        {/* Header */}
        <div style={{ padding:"16px 20px", borderBottom:`1px solid ${ui.divider}`,
                      display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
          <div>
            <h3 style={{ margin:0, fontSize:"1rem", fontWeight:700, color:ui.textPrimary }}>
              📋 Accomplishment Report
            </h3>
            <p style={{ margin:0, fontSize:"0.76rem", color:ui.textSub, marginTop:2 }}>
              {displayPeriod} · CDRR System
            </p>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={() => window.print()}
              style={{ padding:"6px 14px", borderRadius:7, border:`1.5px solid ${FB}`,
                       background:"transparent", color:FB, fontSize:"0.8rem", fontWeight:600, cursor:"pointer" }}>
              🖨️ Print
            </button>
            <button onClick={onClose}
              style={{ background:"none", border:"none", cursor:"pointer", color:ui.textMuted, fontSize:"1.2rem", padding:4 }}>
              ✕
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ overflowY:"auto", padding:"20px" }}>
          {/* Title block */}
          <div style={{ textAlign:"center", padding:"16px", borderRadius:10,
                        background:ui.pageBg, border:`1px solid ${ui.cardBorder}`, marginBottom:20 }}>
            <div style={{ fontSize:"2rem", marginBottom:6 }}>🏢</div>
            <h2 style={{ margin:0, fontSize:"1.1rem", fontWeight:800, color:ui.textPrimary }}>
              CDRR – Accomplishment Report
            </h2>
            <p style={{ margin:0, fontSize:"0.8rem", color:ui.textSub, marginTop:4 }}>
              {displayPeriod} &nbsp;|&nbsp; Generated: March 11, 2026
            </p>
          </div>

          {/* KPI grid */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:10, marginBottom:20 }}>
            {[
              { label:"Total Received", value:totals.received,    color:"#1877F2", icon:"📥" },
              { label:"Completed",      value:totals.completed,    color:"#36a420", icon:"✅" },
              { label:"On Process",     value:totals.onProcess,    color:"#f59e0b", icon:"⏳" },
              { label:"Completed Rate", value:`${completedRate}%`, color:"#9333ea", icon:"📈" },
            ].map((s, i) => (
              <div key={i} style={{ textAlign:"center", padding:"10px 6px", borderRadius:8,
                                    border:`1px solid ${ui.cardBorder}`, background:ui.cardBg }}>
                <div style={{ fontSize:"1.2rem", marginBottom:4 }}>{s.icon}</div>
                <div style={{ fontSize:"1.2rem", fontWeight:800, color:s.color, lineHeight:1 }}>
                  {typeof s.value === "number" ? s.value.toLocaleString() : s.value}
                </div>
                <div style={{ fontSize:"0.7rem", color:ui.textSub, marginTop:3 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Narrative */}
          <div style={{ padding:"12px 14px", borderRadius:8, background:ui.pageBg,
                        border:`1px solid ${ui.cardBorder}`, fontSize:"0.82rem",
                        color:ui.textSub, lineHeight:1.7 }}>
            The CDRR system recorded a total of{" "}
            <strong style={{ color:ui.textPrimary }}>{totals.received.toLocaleString()}</strong>{" "}
            applications received for the period of{" "}
            <strong style={{ color:ui.textPrimary }}>{displayPeriod}</strong>.
            Of these,{" "}
            <strong style={{ color:"#36a420" }}>{totals.completed}</strong> were completed and{" "}
            <strong style={{ color:"#f59e0b" }}>{totals.onProcess}</strong> are currently on process,
            achieving a completion rate of{" "}
            <strong style={{ color:"#9333ea" }}>{completedRate}%</strong>
            {daysLeftVal !== null ? (
              <> with{" "}
                <strong style={{ color:ui.textPrimary }}>
                  {daysLeftVal} day{daysLeftVal !== 1 ? "s" : ""}
                </strong>{" "}remaining</>
            ) : ""}.
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding:"12px 20px", borderTop:`1px solid ${ui.divider}`,
                      display:"flex", justifyContent:"flex-end", gap:8, flexShrink:0 }}>
          <button onClick={onClose}
            style={{ padding:"8px 20px", borderRadius:8, border:`1px solid ${ui.cardBorder}`,
                     background:"transparent", color:ui.textSub, fontSize:"0.84rem",
                     fontWeight:600, cursor:"pointer" }}>
            Cancel
          </button>
          <button onClick={() => window.print()}
            style={{ padding:"8px 20px", borderRadius:8, border:"none", background:FB,
                     color:"#fff", fontSize:"0.84rem", fontWeight:600, cursor:"pointer" }}>
            🖨️ Print Report
          </button>
        </div>
      </div>
    </div>
  );
}
