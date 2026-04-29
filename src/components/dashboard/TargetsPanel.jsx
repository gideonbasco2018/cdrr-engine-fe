import { FB } from "./constants";
import { TARGETS_WEEKLY } from "./constants";
import { getWorkingWeek, getWorkingDayLabels, workingDaysLeft } from "./utils";
import { Card, SeeAll } from "./CardPrimitives";

export default function TargetsPanel({ ui, onSelectTarget }) {
  const week       = getWorkingWeek();
  const workingDays = getWorkingDayLabels();
  const TODAY_STR  = "2026-03-11";
  const targets    = TARGETS_WEEKLY;

  const totalDone = targets.reduce((s, t) => s + t.done, 0);
  const totalGoal = targets.reduce((s, t) => s + t.goal, 0);
  const pct       = Math.round((totalDone / totalGoal) * 100);
  const wdLeft    = workingDaysLeft(week.end);
  const weekLabel = `${workingDays[0].monthLabel} ${workingDays[0].dateNum} – ${workingDays[4].monthLabel} ${workingDays[4].dateNum}, 2026`;

  return (
    <Card ui={ui}>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
                    padding:"14px 16px 10px" }}>
        <div>
          <h3 style={{ fontSize:"0.95rem", fontWeight:700, color:ui.textPrimary, margin:0 }}>
            Weekly Targets
          </h3>
          <p style={{ margin:"2px 0 0", fontSize:"0.72rem", color:ui.textMuted }}>
            Working days only · Mon–Fri
          </p>
        </div>
        <SeeAll />
      </div>

      <div style={{ padding:"0 16px 12px" }}>
        {/* Day pills */}
        <div style={{ display:"flex", gap:4, marginBottom:10 }}>
          {workingDays.map((wd) => {
            const isPast  = wd.dateStr < TODAY_STR;
            const isToday = wd.dateStr === TODAY_STR;
            return (
              <div key={wd.dateStr}
                style={{ flex:1, textAlign:"center", padding:"7px 2px 6px", borderRadius:8,
                         background:isToday ? FB : isPast ? `${FB}14` : ui.inputBg,
                         border:`1.5px solid ${isToday ? FB : isPast ? `${FB}35` : ui.cardBorder}`,
                         position:"relative" }}>
                <p style={{ margin:0, fontSize:"0.58rem", fontWeight:700, textTransform:"uppercase",
                             color:isToday ? "rgba(255,255,255,0.75)" : ui.textMuted }}>
                  {wd.dayLabel}
                </p>
                <p style={{ margin:"2px 0 1px", fontSize:"0.88rem", fontWeight:800, lineHeight:1,
                             color:isToday ? "#fff" : isPast ? FB : ui.textPrimary }}>
                  {wd.dateNum}
                </p>
                <p style={{ margin:0, fontSize:"0.56rem",
                             color:isToday ? "rgba(255,255,255,0.7)" : ui.textMuted }}>
                  {wd.monthLabel}
                </p>
                {isPast && (
                  <span style={{ position:"absolute", top:3, right:4,
                                 fontSize:"0.6rem", color:"#36a420", fontWeight:700 }}>✓</span>
                )}
              </div>
            );
          })}
        </div>

        {/* Week summary */}
        <div style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 10px",
                      borderRadius:7, background:`${FB}10`, border:`1px solid ${FB}28` }}>
          <span style={{ fontSize:"0.78rem" }}>📅</span>
          <div style={{ flex:1, minWidth:0 }}>
            <p style={{ margin:0, fontSize:"0.76rem", fontWeight:600, color:FB,
                         whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
              {weekLabel}
            </p>
            <p style={{ margin:0, fontSize:"0.69rem", color:ui.textMuted }}>
              {wdLeft} working day{wdLeft !== 1 ? "s" : ""} left this week
            </p>
          </div>
          <div style={{ textAlign:"center", flexShrink:0 }}>
            <p style={{ margin:0, fontSize:"1rem", fontWeight:800, color:FB, lineHeight:1 }}>{wdLeft}</p>
            <p style={{ margin:0, fontSize:"0.56rem", color:ui.textMuted, textTransform:"uppercase" }}>days</p>
          </div>
        </div>

        {/* Overall progress */}
        <div style={{ marginTop:10 }}>
          <div style={{ display:"flex", justifyContent:"space-between",
                        fontSize:"0.74rem", color:ui.textMuted, marginBottom:5 }}>
            <span>{pct}% overall completed</span>
            <span style={{ fontWeight:700, color:pct === 100 ? "#36a420" : FB }}>
              {totalDone}/{totalGoal} tasks
            </span>
          </div>
          <div style={{ height:5, borderRadius:99, background:ui.progressBg, overflow:"hidden" }}>
            <div style={{ height:"100%", width:`${pct}%`, borderRadius:99,
                          background:pct === 100 ? "#36a420" : FB }} />
          </div>
        </div>
      </div>

      {/* Target rows */}
      <div style={{ borderTop:`1px solid ${ui.divider}` }}>
        {targets.map((t) => {
          const tp = Math.round((t.done / t.goal) * 100);
          return (
            <div key={t.id} onClick={() => onSelectTarget(t)}
              style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
                       padding:"10px 16px", cursor:"pointer" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = ui.hoverBg)}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
              <div style={{ display:"flex", alignItems:"center", gap:10, flex:1, minWidth:0 }}>
                <span style={{ fontSize:"1.05rem" }}>{t.icon}</span>
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ margin:0, fontSize:"0.83rem", color:ui.textPrimary, fontWeight:500,
                               whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                    {t.label}
                  </p>
                  <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:3 }}>
                    <div style={{ flex:1, height:3, borderRadius:99, background:ui.progressBg, overflow:"hidden" }}>
                      <div style={{ height:"100%", width:`${tp}%`, borderRadius:99,
                                    background:tp === 100 ? "#36a420" : FB }} />
                    </div>
                    <span style={{ fontSize:"0.7rem", color:ui.textMuted }}>{t.done}/{t.goal}</span>
                  </div>
                </div>
              </div>
              <span style={{ color:ui.textMuted, marginLeft:8 }}>›</span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
