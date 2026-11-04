/* Comments on an FGMP application, visible to every step.

   The rules live here, apart from the screen, so they can be tested alone.
   A comment is written at one step and is "for" one step or for everyone.
   Anyone at the step it is for (or anyone, when it is for everyone) can mark
   it solved; anyone can reopen a solved one; only the writer can remove it,
   and only while it is still open.

   Every comment has a number (no) and may have replies: short notes under it. A comment can carry a pin: { stepKind, stepId, key, label, snapshot, version }
   (see fgmpPins.js). The pin keeps a quote of the part, so the comment still
   reads right when the part is hidden, changed or gone.

   For now the comments are sample data kept on the screen. They are not
   saved on the server yet. */

export const FOR_EVERYONE = "ALL";

/* "value" is the workflow step name, the same text as row.applicationStep. */
export const COMMENT_TARGETS = [
  { value: FOR_EVERYONE, label: "Everyone" },
  { value: "Decking", label: "Decker" },
  { value: "Quality Evaluation", label: "Evaluator" },
  { value: "Checker", label: "Checker" },
  { value: "Supervisor", label: "Supervisor" },
  { value: "LRD Chief", label: "LRD Chief" },
  { value: "Director", label: "Director" },
];

export const stepLabel = (step) =>
  COMMENT_TARGETS.find((t) => t.value === step)?.label || step || "";

/* True when at least one comment points at a part of the page. The pins
   toggle is only worth showing then. */
export const hasPins = (list) => (list || []).some((c) => !!c.pin);

export const openCount = (list) =>
  (list || []).filter((c) => c.status === "OPEN").length;

export const canSolve = (comment, actingStep) =>
  comment.status === "OPEN" &&
  (comment.forStep === FOR_EVERYONE || comment.forStep === actingStep);

export const canReopen = (comment) => comment.status === "SOLVED";

export const canRemove = (comment, userId) =>
  comment.status === "OPEN" && !!userId && comment.authorId === userId;

/* Like a chat: oldest first, so the newest comment ends up at the bottom next
   to the write box. A solved comment keeps its place in time; it is not moved
   to the bottom. Nothing jumps to the top because it is "for me". */
export const sortComments = (list) =>
  [...(list || [])].sort((x, y) =>
    String(x.createdAt || "").localeCompare(String(y.createdAt || "")),
  );

export const FILTERS = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "forme", label: "For me" },
  { value: "solved", label: "Solved" },
];

/* "For me" means open and addressed to the viewer's own step. */
export const filterComments = (list, filter, actingStep) =>
  (list || []).filter((c) => {
    if (filter === "open") return c.status === "OPEN";
    if (filter === "solved") return c.status === "SOLVED";
    if (filter === "forme") return c.status === "OPEN" && c.forStep === actingStep;
    return true;
  });

/* How many open pins each step has, as { stepKey: n }. stepKey is the step's
   kind, or its number when it has no kind. */
export const openPinCounts = (list) => {
  const counts = {};
  (list || []).forEach((c) => {
    if (c.status !== "OPEN" || !c.pin) return;
    const k = c.pin.stepKind || c.pin.stepId;
    if (k != null) counts[k] = (counts[k] || 0) + 1;
  });
  return counts;
};

let nextId = 1;
const newId = () => `c-${Date.now().toString(36)}-${nextId++}`;

/* author: { id, name }, step: where it is written, now: ISO time,
   pin: optional (see top of file). Every comment gets the next number (#1, #2,
   ...); a pinned comment shows that same number on the page. */
export function addComment(list, { text, forStep, author, step, now, pin }) {
  const body = (text || "").trim();
  if (!body) return list;
  const known = COMMENT_TARGETS.some((t) => t.value === forStep);
  const no = Math.max(0, ...list.map((c) => c.no || 0)) + 1;
  return [
    ...list,
    {
      id: newId(),
      text: body,
      forStep: known ? forStep : FOR_EVERYONE,
      authorId: author?.id || null,
      authorName: author?.name || "Unknown",
      step: step || "",
      createdAt: now,
      pin: pin || null,
      no,
      replies: [],
      status: "OPEN",
      solvedByName: null,
      solvedByStep: null,
      solvedAt: null,
    },
  ];
}

/* actor: { name, step, now }. Does nothing when the actor may not solve it. */
export function solveComment(list, id, actor) {
  return list.map((c) =>
    c.id === id && canSolve(c, actor.step)
      ? {
          ...c,
          status: "SOLVED",
          solvedByName: actor.name || "Unknown",
          solvedByStep: actor.step || "",
          solvedAt: actor.now,
        }
      : c,
  );
}

export const reopenComment = (list, id) =>
  list.map((c) =>
    c.id === id && canReopen(c)
      ? { ...c, status: "OPEN", solvedByName: null, solvedByStep: null, solvedAt: null }
      : c,
  );

/* actor: { id }. Does nothing unless the actor wrote it and it is still open. */
export const removeComment = (list, id, actor) =>
  list.filter((c) => !(c.id === id && canRemove(c, actor?.id)));

/* Replies: a short back-and-forth under a comment. Anyone can reply while the
   comment is open; a solved comment has to be reopened first. A reply is a
   plain note: it never changes the comment's status. */
export const canReply = (comment) => comment.status === "OPEN";

export const replyCount = (comment) => (comment.replies || []).length;

/* actor: { id, name }, step: where the reply is written, now: ISO time. Does
   nothing for an empty reply or a comment that is not open. */
export function addReply(list, id, { text, author, step, now }) {
  const body = (text || "").trim();
  if (!body) return list;
  return list.map((c) =>
    c.id === id && canReply(c)
      ? {
          ...c,
          replies: [
            ...(c.replies || []),
            {
              id: newId(),
              text: body,
              authorId: author?.id || null,
              authorName: author?.name || "Unknown",
              step: step || "",
              createdAt: now,
            },
          ],
        }
      : c,
  );
}

/* What the "before forwarding" warning lists: the open comments, oldest first,
   each with a short label (the pinned part, or the start of the text). `max`
   lines are returned and `more` says how many were left out. */
export function openCommentLines(list, max = 4) {
  const open = (list || [])
    .filter((c) => c.status === "OPEN")
    .sort((x, y) => String(x.createdAt || "").localeCompare(String(y.createdAt || "")));
  const label = (c) => {
    if (c.pin && c.pin.label) return c.pin.label;
    const t = String(c.text || "").replace(/\s+/g, " ").trim();
    return t.length > 40 ? `${t.slice(0, 39)}…` : t;
  };
  return {
    lines: open.slice(0, max).map((c) => ({
      id: c.id,
      no: c.no,
      label: label(c),
      pinned: !!c.pin,
      forStep: c.forStep,
    })),
    more: Math.max(0, open.length - max),
  };
}

/* Made-up comments so the card can be tried before the server part exists. */
export function sampleComments(now = new Date()) {
  const ago = (hours) => new Date(now.getTime() - hours * 3600 * 1000).toISOString();
  return [
    {
      id: "sample-1",
      text: "Please confirm the GMP certificate expiry date. The worksheet shows a different year.",
      forStep: "Quality Evaluation",
      authorId: "sample-checker",
      authorName: "Sample Checker",
      step: "Checker",
      createdAt: ago(40),
      pin: {
        stepKind: "worksheet",
        stepId: null,
        stepLabel: "Evaluation Worksheet",
        key: "ws:foreignCertificateValidity",
        label: "Certificate validity",
        snapshot: "(what the part showed when pinned)",
        version: 1,
      },
      no: 1,
      replies: [
        {
          id: "sample-reply-1",
          text: "I checked: the certificate says 2027. I will correct the worksheet.",
          authorId: "sample-evaluator",
          authorName: "Sample Evaluator",
          step: "Quality Evaluation",
          createdAt: ago(3),
        },
      ],
      status: "OPEN",
      solvedByName: null,
      solvedByStep: null,
      solvedAt: null,
    },
    {
      id: "sample-2",
      text: "Applicant's address on the form and on the certificate do not match. Everyone please take note.",
      forStep: FOR_EVERYONE,
      authorId: "sample-supervisor",
      authorName: "Sample Supervisor",
      step: "Supervisor",
      createdAt: ago(2),
      pin: {
        stepKind: "details",
        stepId: null,
        stepLabel: "Application Details",
        key: "field:address",
        label: "Address",
        snapshot: "(what the part showed when pinned)",
        version: null,
      },
      no: 3,
      replies: [],
      status: "OPEN",
      solvedByName: null,
      solvedByStep: null,
      solvedAt: null,
    },
    {
      id: "sample-3",
      text: "Typo in the product line. Please fix it.",
      forStep: "Quality Evaluation",
      authorId: "sample-checker",
      authorName: "Sample Checker",
      step: "Checker",
      createdAt: ago(30),
      pin: {
        stepKind: "worksheet",
        stepId: null,
        stepLabel: "Evaluation Worksheet",
        key: "ws:appliedForms",
        label: "Annex B: applied forms",
        snapshot: "(what the part showed when pinned)",
        version: 1,
      },
      no: 2,
      replies: [],
      status: "SOLVED",
      solvedByName: "Sample Evaluator",
      solvedByStep: "Quality Evaluation",
      solvedAt: ago(26),
    },
  ];
}
