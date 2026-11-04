import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  COMMENT_TARGETS,
  FILTERS,
  FOR_EVERYONE,
  canReopen,
  canRemove,
  canReply,
  canSolve,
  filterComments,
  openCommentLines,
  openCount,
  replyCount,
  sortComments,
  stepLabel,
} from "./fgmpComments.js";
import { clickOffset, findPinElement, isRowGone, pinSpot, pinTargetFrom } from "./fgmpPins.js";

/* The comment system's yellow theme: a soft, light lemon yellow. Light fills are
   almost invisible on white, so pins, badges and the banner also get a soft
   yellow ring; text on the fills is dark olive for contrast. */
const YELLOW = "#fff176"; // fills: pins, badges, the banner
const PIN_RING = "#d9c53a"; // the soft ring round a yellow fill
const YELLOW_STRONG = "#e6d54b"; // lines: edges, outlines, borders
const YELLOW_DARK = "#7a6a00"; // small text on a light background (5.4:1 on white)
const INK = "#4a4000"; // text on a solid yellow fill (8.9:1)
const BLUE = "#1976d2"; // solved
const BLUE_BG = "#64b5f6";
export const PANEL_WIDTH = 340;

const when = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

/* Page-wide look of pinning: the crosshair, the hover outline, the flash. */
export function PinStyles() {
  return (
    <style>{`
      [data-pin-mode="1"], [data-pin-mode="1"] * { cursor: crosshair !important; }
      [data-pin-hover="1"] { outline: 2px dashed ${YELLOW_STRONG}; outline-offset: 2px; background: rgba(255,241,118,0.4); }
      [data-pin-flash="1"] { outline: 3px solid ${YELLOW_STRONG}; outline-offset: 2px; border-radius: 4px; background: rgba(255,241,118,0.8) !important; animation: pinflash 0.9s ease-in-out 2; }
      @keyframes pinflash { 50% { background: rgba(255,241,118,0.45); } }
    `}</style>
  );
}

/* Header switch: show or hide the numbered pins drawn on the page. The
   comments themselves stay in the panel either way. */
export function PinsToggle({ on, onClick, colors }) {
  return (
    <button
      type="button"
      data-pins-toggle={on ? "on" : "off"}
      aria-pressed={on}
      onClick={onClick}
      title={
        on
          ? "Hide the numbered pins on the page (the comments stay in the panel)"
          : "Show the numbered pins on the page"
      }
      style={{
        border: `1px ${on ? "solid" : "dashed"} ${colors.cardBorder}`,
        background: on ? "transparent" : colors.badgeBg || "rgba(0,0,0,0.05)",
        color: on ? colors.textPrimary : colors.textTertiary,
        borderRadius: "999px",
        padding: "0.18rem 0.65rem",
        fontSize: "0.66rem",
        fontWeight: 700,
        cursor: "pointer",
      }}
    >
      {on ? "👁 Pins" : "👁 Pins off"}
    </button>
  );
}

/* Header control, one pill with two halves that say different things: the left
   half is only the 📍 icon and starts a new comment on a spot (click a part of
   the step); the right half is the word "Comment" and opens the list. The right
   half carries a small number when comments are open, or a ✔ when all are
   solved. */
export function CommentsBar({ comments, pinMode, onComment, onOpenPanel, colors }) {
  const open = openCount(comments);
  const total = comments.length;
  const half = {
    border: "none",
    background: "transparent",
    padding: "0.2rem 0.65rem",
    fontSize: "0.66rem",
    fontWeight: 700,
    fontFamily: "inherit",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: "0.35rem",
  };
  return (
    <span
      data-comments-bar="1"
      style={{
        display: "inline-flex",
        alignItems: "stretch",
        border: `1px solid ${open ? YELLOW_STRONG : colors.cardBorder}`,
        borderRadius: "999px",
        overflow: "hidden",
        background: colors.cardBg,
      }}
    >
      <button
        type="button"
        data-comment-btn="1"
        aria-pressed={pinMode}
        aria-label="Pin a spot and comment on it"
        onClick={onComment}
        title="Pin a spot: click a part of this step, then write a comment about it"
        style={{
          ...half,
          background: pinMode ? "rgba(255,241,118,0.9)" : "transparent",
          color: pinMode ? YELLOW_DARK : colors.textPrimary,
        }}
      >
        📍
      </button>
      <button
        type="button"
        data-comments-tag="1"
        data-open={open}
        data-state={open ? "open" : total ? "solved" : "none"}
        onClick={onOpenPanel}
        title={total ? "Open the comments" : "Open the comments (none yet)"}
        style={{
          ...half,
          borderLeft: `1px solid ${open ? YELLOW_STRONG : colors.cardBorder}`,
          background: open ? "rgba(255,241,118,0.5)" : "transparent",
          color: open ? YELLOW_DARK : total ? BLUE : colors.textPrimary,
        }}
      >
        <span>💬 Comment</span>
        {open > 0 && (
          <span
            data-open-count="1"
            style={{
              background: YELLOW,
              color: INK,
              border: `1px solid ${PIN_RING}`,
              borderRadius: "999px",
              minWidth: "1.1rem",
              padding: "0 0.3rem",
              fontSize: "0.6rem",
              lineHeight: "1.1rem",
              textAlign: "center",
            }}
          >
            {open}
          </span>
        )}
        {open === 0 && total > 0 && (
          <span data-solved-mark="1" style={{ color: BLUE }}>
            ✔
          </span>
        )}
      </button>
    </span>
  );
}

/* Shown on the decision steps, before forwarding. It lists the open comments
   so nobody has to hunt for them; a click on one opens it. It never blocks
   anything. */
export function OpenCommentsWarning({ comments, onPick, onViewAll }) {
  const open = openCount(comments);
  if (!open) return null;
  const { lines, more } = openCommentLines(comments, 4);
  const link = {
    border: "none",
    background: "transparent",
    color: "#2196F3",
    fontWeight: 600,
    fontSize: "0.7rem",
    fontFamily: "inherit",
    cursor: "pointer",
    padding: 0,
  };
  return (
    <div
      data-warning="1"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.3rem",
        padding: "0.45rem 0.7rem",
        borderRadius: "8px",
        border: `1px solid ${YELLOW_STRONG}`,
        background: "rgba(255,241,118,0.4)",
        color: YELLOW_DARK,
        fontSize: "0.7rem",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem" }}>
        <b>
          ⚠ {open} open comment{open === 1 ? "" : "s"} on this application
        </b>
        <button type="button" onClick={onViewAll} style={link}>
          View all
        </button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem" }}>
        {lines.map((l) => (
          <button
            key={l.id}
            type="button"
            data-warning-item={l.id}
            onClick={() => onPick(l.id)}
            title="Open this comment"
            style={{
              ...link,
              display: "flex",
              gap: "0.4rem",
              alignItems: "baseline",
              textAlign: "left",
              color: YELLOW_DARK,
              fontWeight: 500,
            }}
          >
            <b style={{ flexShrink: 0 }}>#{l.no}</b>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {l.pinned ? "📍 " : ""}
              {l.label}
            </span>
            <span style={{ flexShrink: 0, opacity: 0.75 }}>· for {stepLabel(l.forStep)}</span>
          </button>
        ))}
        {more > 0 && <span style={{ opacity: 0.75 }}>+{more} more</span>}
      </div>
    </div>
  );
}

/* Shown while pinning. */
export function PinModeBanner({ onCancel }) {
  return (
    <div
      style={{
        position: "absolute",
        top: "0.5rem",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 30,
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
        padding: "0.4rem 0.9rem",
        borderRadius: "999px",
        background: YELLOW,
        color: INK,
        border: `1px solid ${PIN_RING}`,
        fontSize: "0.72rem",
        fontWeight: 700,
        boxShadow: "0 4px 14px rgba(0,0,0,0.25)",
      }}
    >
      <span>📍 Click the part you want to add a comment</span>
      <button
        type="button"
        onClick={onCancel}
        style={{
          border: "1px solid rgba(74,64,0,0.5)",
          background: "transparent",
          color: INK,
          borderRadius: "999px",
          padding: "0.05rem 0.55rem",
          fontSize: "0.66rem",
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        Cancel (Esc)
      </button>
    </div>
  );
}

/* While `active`, hovering lights up the part under the mouse and a click picks
   it. The click is swallowed, so nothing underneath is edited or pressed.
   onPick receives ({ key, label, element } or null when there is no named part:
   pin the whole step) and `at`, the exact spot of the click inside that part
   (or inside the step) as { fx, fy }. Esc calls onCancel. */
export function usePinMode({ active, rootRef, onPick, onCancel, extraLabels }) {
  const pick = useRef(onPick);
  const cancel = useRef(onCancel);
  pick.current = onPick;
  cancel.current = onCancel;
  useEffect(() => {
    const root = rootRef.current;
    if (!active || !root) return undefined;
    root.setAttribute("data-pin-mode", "1");
    let hovered = null;
    const setHover = (el) => {
      if (hovered === el) return;
      if (hovered) hovered.removeAttribute("data-pin-hover");
      hovered = el;
      if (el) el.setAttribute("data-pin-hover", "1");
    };
    const onMove = (e) => setHover(pinTargetFrom(e.target, extraLabels)?.element || null);
    const swallow = (e) => {
      e.preventDefault();
      e.stopPropagation();
    };
    const onClick = (e) => {
      swallow(e);
      const target = pinTargetFrom(e.target, extraLabels);
      setHover(null);
      const box = (target ? target.element : root).getBoundingClientRect();
      pick.current(target, clickOffset(box, e.clientX, e.clientY));
    };
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        cancel.current();
      }
    };
    root.addEventListener("mousemove", onMove, true);
    root.addEventListener("mousedown", swallow, true);
    root.addEventListener("click", onClick, true);
    window.addEventListener("keydown", onKey, true);
    return () => {
      root.removeAttribute("data-pin-mode");
      setHover(null);
      root.removeEventListener("mousemove", onMove, true);
      root.removeEventListener("mousedown", swallow, true);
      root.removeEventListener("click", onClick, true);
      window.removeEventListener("keydown", onKey, true);
    };
  }, [active, rootRef, extraLabels]);
}

/* Numbered pins drawn over the parts on the current step. They sit in their own
   layer beside the content (not inside it), so they never disturb the paper's
   editable text, and they are measured again whenever the content changes size,
   scrolls or is resized. A part that is not on this step (or is gone) simply
   has no marker; its comment still carries a quote of it. */
export function PinMarkers({ wrapRef, contentRef, skipRef, comments, draft, isHere, activeId, onOpen, version }) {
  const [spots, setSpots] = useState([]);
  const timer = useRef(0);

  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    const content = contentRef.current;
    if (!wrap || !content) return undefined;

    const measure = () => {
      const base = wrap.getBoundingClientRect();
      const skip = skipRef?.current || null;
      const next = [];
      // the pins on this step, plus the one being written (not saved yet)
      const list = comments.map((c) => ({ id: c.id, no: c.no, pin: c.pin, solved: c.status === "SOLVED" }));
      if (draft) list.push({ id: "__draft__", no: null, pin: draft, solved: false, isDraft: true });
      list.forEach((c) => {
        if (!c.pin || !isHere(c.pin)) return;
        // a pin on a whole step is only drawn when it has an exact spot
        if (c.pin.key.startsWith("step:") && !c.pin.at) return;
        const el = findPinElement(content, c.pin.key, skip);
        if (!el || isRowGone(content, c.pin.key)) return;
        const r = el.getBoundingClientRect();
        if (r.width === 0 && r.height === 0) return;
        // a part that lives only in the left column can be scrolled out of it
        if (skip && skip.contains(el)) {
          const box = skip.getBoundingClientRect();
          if (r.bottom < box.top || r.top > box.bottom) return;
        }
        const spot = pinSpot(r, c.pin.at);
        next.push({
          id: c.id,
          no: c.no,
          solved: c.solved,
          isDraft: !!c.isDraft,
          // the pin's point (its bottom tip) is exactly on the saved spot
          left: Math.round(spot.x - base.left - 11),
          top: Math.round(spot.y - base.top - 27),
        });
      });
      setSpots((prev) =>
        prev.length === next.length &&
        prev.every((p, i) => p.id === next[i].id && p.left === next[i].left && p.top === next[i].top && p.solved === next[i].solved && p.isDraft === next[i].isDraft)
          ? prev
          : next,
      );
    };
    // a short timer, not an animation frame: it also runs in a background tab
    const later = () => {
      clearTimeout(timer.current);
      timer.current = setTimeout(measure, 30);
    };

    measure();
    const ro = new ResizeObserver(later);
    ro.observe(content);
    const mo = new MutationObserver(later);
    mo.observe(content, { childList: true, subtree: true, characterData: true });
    window.addEventListener("resize", later);
    content.addEventListener("scroll", later, true);
    const skip = skipRef?.current;
    if (skip) skip.addEventListener("scroll", later);
    return () => {
      clearTimeout(timer.current);
      ro.disconnect();
      mo.disconnect();
      window.removeEventListener("resize", later);
      content.removeEventListener("scroll", later, true);
      if (skip) skip.removeEventListener("scroll", later);
    };
  }, [wrapRef, contentRef, skipRef, comments, draft, isHere, version]);

  return (
    <div
      style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 20 }}
      data-pin-layer="1"
    >
      {spots.map((p) => (
        <button
          key={p.id}
          type="button"
          data-pin-marker={p.id}
          onClick={p.isDraft ? undefined : () => onOpen(p.id)}
          title={p.isDraft ? "Your new comment will be pinned here" : p.solved ? "Solved comment" : "Open comment"}
          style={{
            position: "absolute",
            left: p.left,
            top: p.top,
            width: "22px",
            height: "22px",
            borderRadius: "50% 50% 50% 0",
            transform: "rotate(-45deg)",
            border: p.isDraft
              ? `2px dashed ${PIN_RING}`
              : `2px solid ${activeId === p.id ? "#1f2937" : p.solved ? "#fff" : PIN_RING}`,
            background: p.isDraft ? "#fff" : p.solved ? BLUE_BG : YELLOW,
            opacity: p.solved ? 0.6 : 1,
            boxShadow: "0 2px 6px rgba(0,0,0,0.35)",
            cursor: p.isDraft ? "default" : "pointer",
            pointerEvents: p.isDraft ? "none" : "auto",
            padding: 0,
          }}
        >
          <span
            style={{
              display: "block",
              transform: "rotate(45deg)",
              color: p.isDraft ? YELLOW_DARK : p.solved ? "#fff" : INK,
              fontSize: "0.62rem",
              fontWeight: 800,
              lineHeight: "18px",
            }}
          >
            {p.isDraft ? "+" : p.solved ? "✔" : p.no}
          </span>
        </button>
      ))}
    </div>
  );
}

/* The replies under one comment, oldest first. */
function RepliesList({ comment, colors }) {
  const replies = comment.replies || [];
  if (!replies.length) return null;
  return (
    <div
      data-replies={comment.id}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.4rem",
        marginLeft: "0.3rem",
        paddingLeft: "0.6rem",
        borderLeft: `2px solid ${colors.cardBorder}`,
      }}
    >
      {replies.map((r) => (
        <div key={r.id} data-reply={r.id} style={{ fontSize: "0.7rem", lineHeight: 1.35 }}>
          <div
            title={`Written at the ${stepLabel(r.step)} step`}
            style={{ fontSize: "0.62rem", color: colors.textTertiary }}
          >
            <b style={{ color: colors.textPrimary }}>{r.authorName}</b> · {when(r.createdAt)}
          </div>
          <div style={{ color: colors.textPrimary, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
            {r.text}
          </div>
        </div>
      ))}
    </div>
  );
}

/* The comments panel. `actingStep` is the step the viewer works at: it decides
   which comments they can mark solved and which are "for me".

   Kept light on purpose: a title, four text tabs, the comments, one small
   write box. Solved comments shrink to one line. */
export function CommentsPanel({
  comments,
  actingStep,
  userId,
  isSample,
  previewStep,
  onPreviewStep,
  draftPin,
  onClearDraft,
  onStartPin,
  onAdd,
  onSolve,
  onReopen,
  onRemove,
  onReply,
  onJump,
  activeId,
  jumpNotes,
  side,
  onClose,
  hidden,
  colors,
}) {
  const [text, setText] = useState("");
  const [forStep, setForStep] = useState(FOR_EVERYONE);
  const [filter, setFilter] = useState("all");
  const [replyingId, setReplyingId] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [showReplies, setShowReplies] = useState({}); // solved comments, by id
  const listRef = useRef(null);
  const shown = sortComments(filterComments(comments, filter, actingStep));
  const open = openCount(comments);

  // bring the picked comment into view
  useEffect(() => {
    if (!activeId || !listRef.current) return;
    const el = listRef.current.querySelector(`[data-comment="${activeId}"]`);
    if (el) el.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [activeId, filter]);

  // oldest first, so the newest is at the bottom: start there, and go there
  // when the tab changes (unless a comment was picked from a pin)
  useEffect(() => {
    const box = listRef.current;
    if (box && !activeId) box.scrollTop = box.scrollHeight;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  // a comment was just added: always show it, even after a jump to a pin
  const seen = useRef(comments.length);
  useEffect(() => {
    const box = listRef.current;
    if (comments.length > seen.current && box) box.scrollTop = box.scrollHeight;
    seen.current = comments.length;
  }, [comments.length]);

  const submit = () => {
    if (!text.trim()) return;
    onAdd({ text, forStep, pin: draftPin || null });
    setText("");
  };

  const quiet = colors.textTertiary;
  const textBtn = (color, extra) => ({
    border: "none",
    background: "transparent",
    padding: 0,
    cursor: "pointer",
    color,
    fontWeight: 600,
    fontSize: "0.68rem",
    ...extra,
  });
  const input = {
    padding: "0.4rem 0.55rem",
    fontSize: "0.72rem",
    borderRadius: "7px",
    border: `1px solid ${colors.cardBorder}`,
    background: colors.pageBg || colors.cardBg,
    color: colors.textPrimary,
    boxSizing: "border-box",
  };
  const countOf = (f) => filterComments(comments, f.value, actingStep).length;
  // tabs read left to right in the order people use them
  const tabs = ["open", "forme", "all", "solved"].map((v) => FILTERS.find((f) => f.value === v));

  const pinChip = (c) => (
    <button
      type="button"
      data-jump={c.id}
      onClick={() => onJump(c)}
      title={`${c.pin.stepLabel ? `${c.pin.stepLabel} › ` : ""}${c.pin.label}${
        c.pin.version ? ` · version ${c.pin.version}` : ""
      }. Click to show it on the page.`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.3rem",
        maxWidth: "100%",
        padding: "0.08rem 0.5rem",
        borderRadius: "999px",
        border: `1px solid ${YELLOW_STRONG}`,
        background: "rgba(255,241,118,0.35)",
        color: YELLOW_DARK,
        fontSize: "0.66rem",
        fontWeight: 700,
        cursor: "pointer",
      }}
    >
      <span style={{ flexShrink: 0 }}>📍</span>
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {c.pin.label}
      </span>
      {c.pin.version ? <span style={{ flexShrink: 0, fontWeight: 500 }}>· v{c.pin.version}</span> : null}
    </button>
  );

  return (
    <div
      data-comments-panel="1"
      style={{
        position: "absolute",
        top: 0,
        bottom: 0,
        [side === "left" ? "left" : "right"]: 0,
        width: `${PANEL_WIDTH}px`,
        maxWidth: "92%",
        zIndex: 25,
        display: hidden ? "none" : "flex",
        flexDirection: "column",
        background: colors.cardBg,
        borderLeft: side === "left" ? "none" : `1px solid ${colors.cardBorder}`,
        borderRight: side === "left" ? `1px solid ${colors.cardBorder}` : "none",
        boxShadow: "0 0 24px rgba(0,0,0,0.25)",
      }}
    >
      {/* title */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0.6rem 0.85rem 0.3rem",
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: "0.82rem", fontWeight: 700, color: colors.textPrimary }}>
          Comments
          {open ? (
            <span style={{ marginLeft: "0.45rem", fontSize: "0.68rem", fontWeight: 600, color: YELLOW_DARK }}>
              {open} open
            </span>
          ) : null}
        </span>
        <button
          type="button"
          onClick={onClose}
          title="Close"
          style={textBtn(quiet, { fontSize: "1.15rem", fontWeight: 400 })}
        >
          ×
        </button>
      </div>

      {/* tabs */}
      <div
        style={{
          display: "flex",
          gap: "1rem",
          padding: "0 0.85rem",
          borderBottom: `1px solid ${colors.cardBorder}`,
          flexShrink: 0,
        }}
      >
        {tabs.map((f) => {
          const on = filter === f.value;
          return (
            <button
              key={f.value}
              type="button"
              data-filter={f.value}
              onClick={() => setFilter(f.value)}
              style={textBtn(on ? colors.textPrimary : quiet, {
                padding: "0.35rem 0",
                borderBottom: `2px solid ${on ? YELLOW_STRONG : "transparent"}`,
                marginBottom: "-1px",
                fontWeight: on ? 700 : 500,
              })}
            >
              {f.label} {countOf(f)}
            </button>
          );
        })}
      </div>

      {/* comments */}
      <div ref={listRef} style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "0.15rem 0.85rem" }}>
        {shown.length === 0 && (
          <div style={{ fontSize: "0.7rem", color: quiet, padding: "0.8rem 0" }}>
            {comments.length === 0 ? "No comments yet." : "Nothing here."}
          </div>
        )}
        {shown.map((c) => {
          const solved = c.status === "SOLVED";
          const forMe = !solved && c.forStep === actingStep;
          const active = activeId === c.id;

          if (solved) {
            return (
              <div
                key={c.id}
                data-comment={c.id}
                data-status={c.status}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.2rem",
                  padding: "0.45rem 0.5rem 0.45rem 0.6rem",
                  borderTop: `1px solid ${colors.cardBorder}`,
                  borderLeft: `3px solid ${BLUE}`,
                  marginLeft: "-0.6rem",
                  background: active ? "rgba(25,118,210,0.12)" : "rgba(25,118,210,0.05)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", minWidth: 0 }}>
                  <b data-no={c.no} style={{ color: BLUE, fontSize: "0.7rem", flexShrink: 0 }}>
                    ✔ #{c.no}
                  </b>
                  <span
                    title={c.text}
                    style={{
                      flex: 1,
                      minWidth: 0,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      fontSize: "0.7rem",
                      color: quiet,
                    }}
                  >
                    {c.text}
                  </span>
                  {c.pin && pinChip(c)}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.62rem", color: BLUE }}>
                  <span>
                    Solved by {c.solvedByName} · {when(c.solvedAt)}
                  </span>
                  {canReopen(c) && (
                    <button type="button" style={textBtn(BLUE, { fontSize: "0.62rem" })} onClick={() => onReopen(c.id)}>
                      Reopen
                    </button>
                  )}
                </div>
                {replyCount(c) > 0 && (
                  <button
                    type="button"
                    data-replies-toggle={c.id}
                    onClick={() => setShowReplies((m) => ({ ...m, [c.id]: !m[c.id] }))}
                    style={textBtn(BLUE, { fontSize: "0.62rem", alignSelf: "flex-start" })}
                  >
                    💬 {replyCount(c)} repl{replyCount(c) === 1 ? "y" : "ies"} {showReplies[c.id] ? "▴" : "▾"}
                  </button>
                )}
                {showReplies[c.id] && <RepliesList comment={c} colors={colors} />}
                {jumpNotes && jumpNotes[c.id] && (
                  <div data-jump-note={c.id} style={{ fontSize: "0.62rem", color: "#dc2626" }}>
                    {jumpNotes[c.id]}
                  </div>
                )}
              </div>
            );
          }

          return (
            <div
              key={c.id}
              data-comment={c.id}
              data-status={c.status}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.3rem",
                padding: "0.6rem 0.5rem 0.6rem 0.6rem",
                borderTop: `1px solid ${colors.cardBorder}`,
                borderLeft: `3px solid ${YELLOW_STRONG}`,
                marginLeft: "-0.6rem",
                background: active
                  ? "rgba(255,241,118,0.5)"
                  : forMe
                    ? "rgba(255,241,118,0.3)"
                    : "transparent",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                  gap: "0.5rem",
                  fontSize: "0.64rem",
                  color: quiet,
                }}
              >
                <span title={`Written at the ${stepLabel(c.step)} step`}>
                  <b data-no={c.no} style={{ color: YELLOW_DARK, fontSize: "0.7rem", marginRight: "0.35rem" }}>#{c.no}</b>
                  <b style={{ color: colors.textPrimary, fontSize: "0.7rem" }}>{c.authorName}</b> · {when(c.createdAt)}
                </span>
                <span style={{ whiteSpace: "nowrap" }}>
                  {forMe ? (
                    <b data-for-me="1" style={{ color: YELLOW_DARK }}>
                      For you
                    </b>
                  ) : (
                    `For ${stepLabel(c.forStep)}`
                  )}
                </span>
              </div>

              {c.pin && <div>{pinChip(c)}</div>}
              {c.pin && c.pin.snapshot && (
                <div
                  data-quote={c.id}
                  title={c.pin.snapshot}
                  style={{
                    fontSize: "0.64rem",
                    fontStyle: "italic",
                    color: quiet,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  “{c.pin.snapshot}”
                </div>
              )}
              {jumpNotes && jumpNotes[c.id] && (
                <div data-jump-note={c.id} style={{ fontSize: "0.64rem", color: "#dc2626" }}>
                  {jumpNotes[c.id]}
                </div>
              )}

              <div
                style={{
                  fontSize: "0.74rem",
                  lineHeight: 1.4,
                  color: colors.textPrimary,
                  whiteSpace: "pre-wrap",
                  overflowWrap: "anywhere",
                }}
              >
                {c.text}
              </div>

              <RepliesList comment={c} colors={colors} />
              {replyingId === c.id && (
                <div data-reply-box={c.id} style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                  <textarea
                    data-reply-text="1"
                    autoFocus
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Write a reply…"
                    rows={2}
                    style={{ ...input, width: "100%", resize: "none" }}
                  />
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.6rem", alignItems: "center" }}>
                    <button
                      type="button"
                      data-reply-cancel="1"
                      style={textBtn(quiet, { fontWeight: 500 })}
                      onClick={() => {
                        setReplyingId(null);
                        setReplyText("");
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      data-reply-send="1"
                      disabled={!replyText.trim()}
                      onClick={() => {
                        onReply(c.id, replyText);
                        setReplyingId(null);
                        setReplyText("");
                      }}
                      style={{
                        border: "none",
                        borderRadius: "999px",
                        padding: "0.15rem 0.7rem",
                        background: replyText.trim() ? YELLOW : colors.cardBorder,
                        color: replyText.trim() ? INK : quiet,
                        fontSize: "0.66rem",
                        fontWeight: 700,
                        cursor: replyText.trim() ? "pointer" : "not-allowed",
                      }}
                    >
                      Send
                    </button>
                  </div>
                </div>
              )}

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                {canSolve(c, actingStep) ? (
                  <button
                    type="button"
                    onClick={() => onSolve(c.id)}
                    style={{
                      border: `1px solid ${BLUE}`,
                      background: BLUE,
                      color: "#fff",
                      borderRadius: "999px",
                      padding: "0.18rem 0.75rem",
                      fontSize: "0.66rem",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    ✔ Mark as solved
                  </button>
                ) : (
                  <span />
                )}
                <span style={{ display: "flex", gap: "0.8rem", alignItems: "center" }}>
                  {canReply(c) && replyingId !== c.id && (
                    <button
                      type="button"
                      data-reply-open={c.id}
                      style={textBtn(YELLOW_DARK, { fontWeight: 600 })}
                      onClick={() => {
                        setReplyingId(c.id);
                        setReplyText("");
                      }}
                    >
                      ↩ Reply
                    </button>
                  )}
                  {canRemove(c, userId) && (
                    <button type="button" style={textBtn("#dc2626", { fontWeight: 500 })} onClick={() => onRemove(c.id)}>
                      Remove
                    </button>
                  )}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* write */}
      <div
        style={{
          borderTop: `1px solid ${colors.cardBorder}`,
          padding: "0.55rem 0.85rem 0.45rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.4rem",
          flexShrink: 0,
        }}
      >
        {draftPin && (
          <div
            data-draft-pin="1"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "0.5rem",
              padding: "0.2rem 0.55rem",
              borderRadius: "999px",
              border: `1px solid ${YELLOW_STRONG}`,
              background: "rgba(255,241,118,0.4)",
              color: YELLOW_DARK,
              fontSize: "0.66rem",
              fontWeight: 600,
            }}
          >
            <span style={{ overflowWrap: "anywhere" }}>
              📍 {draftPin.stepLabel ? `${draftPin.stepLabel} › ` : ""}
              {draftPin.label}
              {draftPin.version ? ` · version ${draftPin.version}` : ""}
            </span>
            <button type="button" style={textBtn("#dc2626", { fontSize: "0.9rem" })} onClick={onClearDraft} title="Remove the pin">
              ×
            </button>
          </div>
        )}
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write a comment…"
          rows={2}
          style={{ ...input, width: "100%", resize: "none" }}
        />
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <button
            type="button"
            data-start-pin="1"
            onClick={onStartPin}
            title="Pin a spot on this step"
            style={textBtn(YELLOW_DARK, { border: `1px solid ${colors.cardBorder}`, borderRadius: "7px", padding: "0.3rem 0.5rem" })}
          >
            📍 {draftPin ? "Re-pin" : "Pin"}
          </button>
          <select
            data-for-select="1"
            value={forStep}
            onChange={(e) => setForStep(e.target.value)}
            title="Who is this comment for?"
            style={{ ...input, padding: "0.28rem 0.4rem", fontSize: "0.68rem" }}
          >
            {COMMENT_TARGETS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.value === FOR_EVERYONE ? "For everyone" : `For ${t.label}`}
              </option>
            ))}
          </select>
          <button
            type="button"
            data-add-comment="1"
            onClick={submit}
            disabled={!text.trim()}
            style={{
              marginLeft: "auto",
              padding: "0.32rem 0.8rem",
              borderRadius: "7px",
              border: "none",
              background: text.trim() ? "#4CAF50" : colors.cardBorder,
              color: text.trim() ? "#fff" : quiet,
              fontSize: "0.7rem",
              fontWeight: 700,
              cursor: text.trim() ? "pointer" : "not-allowed",
            }}
          >
            Add
          </button>
        </div>
        {isSample && (
          <div
            title="Test mode: comments are kept on this screen only. Nothing is saved yet, and they are gone when you close the popup."
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "0.5rem",
              paddingTop: "0.3rem",
              borderTop: `1px dashed ${colors.cardBorder}`,
              fontSize: "0.58rem",
              color: quiet,
            }}
          >
            <i>Test mode: not saved</i>
            <label style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
              Preview as
              <select
                value={previewStep}
                onChange={(e) => onPreviewStep(e.target.value)}
                style={{ ...input, padding: "0.05rem 0.25rem", fontSize: "0.58rem" }}
              >
                {COMMENT_TARGETS.filter((t) => t.value !== FOR_EVERYONE).map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}
      </div>
    </div>
  );
}
