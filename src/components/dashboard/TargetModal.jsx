import { FB } from "./constants";

export default function TargetModal({ target, onClose, ui }) {
  if (!target) return null;

  const pct = Math.round((target.done / target.goal) * 100);

  return (
    <div
      style={{ position:"fixed", inset:0, zIndex:1000, background:"rgba(0,0,0,0.45)",
               display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background:ui.cardBg, border:`1px solid ${ui.cardBorder}`,
                 borderRadius:12, width:"100%", maxWidth:480, overflow:"hidden" }}
      >
        {/* Header */}
        <div style={{ padding:"16px 20px", borderBottom:`1px solid ${ui.divider}`,
                      display:"flex", alignItems:"flex-start", justifyContent:"space-between" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ fontSize:"1.4rem" }}>{target.icon}</span>
            <div>
              <h3 style={{ margin:0, fontSize:"0.95rem", fontWeight:700, color:ui.textPrimary }}>
                {target.label}
              </h3>
              <p style={{ margin:0, fontSize:"0.76rem", color:ui.textSub }}>
                Deadline: {target.deadline}
              </p>
            </div>
          </div>
          <button onClick={onClose}
            style={{ background:"none", border:"none", cursor:"pointer",
                     color:ui.textMuted, fontSize:"1.2rem" }}>
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ padding:"16px 20px" }}>
          <p style={{ margin:"0 0 14px", fontSize:"0.83rem", color:ui.textSub, lineHeight:1.5 }}>
            {target.description}
          </p>

          {/* Progress bar */}
          <div style={{ marginBottom:16 }}>
            <div style={{ display:"flex", justifyContent:"space-between",
                          fontSize:"0.78rem", color:ui.textMuted, marginBottom:6 }}>
              <span>{target.done} of {target.goal} completed</span>
              <span style={{ fontWeight:700, color:pct === 100 ? "#36a420" : FB }}>{pct}%</span>
            </div>
            <div style={{ height:6, borderRadius:99, background:ui.progressBg, overflow:"hidden" }}>
              <div style={{ height:"100%", borderRadius:99, width:`${pct}%`,
                            background:pct === 100 ? "#36a420" : FB }} />
            </div>
          </div>

          {/* Items list */}
          <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
            {target.items.map((item, i) => (
              <div key={i} style={{ display:"flex", alignItems:"center", gap:10,
                                    padding:"8px 10px", borderRadius:8,
                                    background:item.done ? ui.pageBg : "transparent",
                                    border:`1px solid ${item.done ? ui.cardBorder : "transparent"}` }}>
                <div style={{ width:18, height:18, borderRadius:4, flexShrink:0,
                               border:`2px solid ${item.done ? "#36a420" : ui.metricBorder}`,
                               background:item.done ? "#36a420" : "transparent",
                               display:"flex", alignItems:"center", justifyContent:"center" }}>
                  {item.done && <span style={{ color:"#fff", fontSize:"0.65rem", fontWeight:700 }}>✓</span>}
                </div>
                <span style={{ fontSize:"0.82rem",
                               color:item.done ? ui.textMuted : ui.textPrimary,
                               textDecoration:item.done ? "line-through" : "none" }}>
                  {item.name}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding:"12px 20px", borderTop:`1px solid ${ui.divider}`,
                      display:"flex", justifyContent:"flex-end" }}>
          <button onClick={onClose}
            style={{ padding:"8px 20px", borderRadius:8, background:FB, border:"none",
                     color:"#fff", fontSize:"0.84rem", fontWeight:600, cursor:"pointer" }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
