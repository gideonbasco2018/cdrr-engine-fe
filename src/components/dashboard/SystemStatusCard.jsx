import { Card } from "./CardPrimitives";

export default function SystemStatusCard({ connections, onToggle, ui }) {
  const allActive  = connections.every((c) => c.active);
  const someInactive = connections.some((c) => !c.active);

  return (
    <Card ui={ui}>
      {/* Header */}
      <div style={{ padding:"14px 16px 10px", borderBottom:`1px solid ${ui.divider}`,
                    display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div>
          <h3 style={{ margin:0, fontSize:"0.95rem", fontWeight:700, color:ui.textPrimary }}>
            System Status
          </h3>
          <p style={{ margin:"2px 0 0", fontSize:"0.72rem",
                      color: allActive ? "#36a420" : someInactive ? "#f59e0b" : "#e02020" }}>
            {allActive
              ? "● All systems operational"
              : someInactive
                ? "● Some connections inactive"
                : "● Systems offline"}
          </p>
        </div>
        <div style={{ width:10, height:10, borderRadius:"50%",
                      background: allActive ? "#36a420" : someInactive ? "#f59e0b" : "#e02020" }} />
      </div>

      {/* Connection rows */}
      <div style={{ padding:"10px 16px 14px", display:"flex", flexDirection:"column", gap:8 }}>
        {connections.map((conn) => (
          <div key={conn.id}
            style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px",
                     borderRadius:8,
                     border:`1px solid ${conn.active ? "#36a42030" : "#e0202030"}`,
                     background: conn.active ? "#36a42008" : "#e0202008" }}>
            <div style={{ width:36, height:36, borderRadius:8, fontSize:"1rem",
                           background: conn.active ? "#36a42018" : "#e0202018",
                           display:"flex", alignItems:"center", justifyContent:"center" }}>
              {conn.icon}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <p style={{ margin:0, fontSize:"0.84rem", fontWeight:700, color:ui.textPrimary }}>
                {conn.label}
              </p>
              <p style={{ margin:0, fontSize:"0.71rem", color:ui.textMuted,
                           whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                {conn.desc}
              </p>
            </div>
            <button onClick={() => onToggle(conn.id)}
              style={{ display:"flex", alignItems:"center", gap:5, padding:"4px 10px",
                       borderRadius:99,
                       border:`1.5px solid ${conn.active ? "#36a42050" : "#e0202050"}`,
                       background: conn.active ? "#36a42015" : "#e0202015",
                       cursor:"pointer", fontFamily:"inherit" }}>
              <span style={{ width:7, height:7, borderRadius:"50%", display:"inline-block",
                              background: conn.active ? "#36a420" : "#e02020" }} />
              <span style={{ fontSize:"0.7rem", fontWeight:700,
                              color: conn.active ? "#36a420" : "#e02020" }}>
                {conn.active ? "Active" : "Inactive"}
              </span>
            </button>
          </div>
        ))}
      </div>
    </Card>
  );
}
