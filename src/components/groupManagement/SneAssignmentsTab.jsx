// src/components/groupManagement/SneAssignmentsTab.jsx
import { useState, useEffect, useCallback, useMemo } from "react";
import {
  getSneMembers,
  updateSneMemberKeywords,
} from "../../api/sneAssignments";

const normalize = (value) =>
  (value || "").toLowerCase().trim().replace(/\s+/g, " ");

const sameList = (a, b) => {
  const x = [...a].sort();
  const y = [...b].sort();
  return x.length === y.length && x.every((v, i) => v === y[i]);
};

const ALL = "__all__"; // left-panel item that shows every generic name

function SneAssignmentsTab({ colors, showToast, canEdit = true }) {
  const [members, setMembers] = useState([]);
  const [drafts, setDrafts] = useState({}); // { [userId]: string[] } (unsaved state)
  const [pending, setPending] = useState([]); // keywords added in "All" view with no user yet
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [selectedMember, setSelectedMember] = useState(ALL); // ALL | userId
  const [selectedKeyword, setSelectedKeyword] = useState(null);

  const [memberSearch, setMemberSearch] = useState("");
  const [keywordSearch, setKeywordSearch] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [input, setInput] = useState("");

  const inputBg = colors.inputBg || colors.pageBg;
  const inputBorder = colors.inputBorder || colors.cardBorder;
  const accent = colors.btnPrimary || "#4CAF50";

  // ── Load ───────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getSneMembers();
      setMembers(data);
      setDrafts(Object.fromEntries(data.map((m) => [m.id, m.keywords])));
      setPending([]);
    } catch (err) {
      showToast("error", err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // ── Derived data ───────────────────────────────────────────────────
  const serverById = useMemo(
    () => Object.fromEntries(members.map((m) => [m.id, m.keywords])),
    [members],
  );

  const memberById = useMemo(
    () => Object.fromEntries(members.map((m) => [m.id, m])),
    [members],
  );

  // keyword -> [userId, ...] based on the current drafts
  const keywordMap = useMemo(() => {
    const map = {};
    members.forEach((m) =>
      (drafts[m.id] || []).forEach((k) => {
        (map[k] = map[k] || []).push(m.id);
      }),
    );
    return map;
  }, [members, drafts]);

  const dirtyIds = useMemo(
    () =>
      members
        .filter((m) => !sameList(drafts[m.id] || [], serverById[m.id] || []))
        .map((m) => m.id),
    [members, drafts, serverById],
  );

  const centerKeywords = useMemo(() => {
    const base =
      selectedMember === ALL
        ? [...new Set([...Object.keys(keywordMap), ...pending])]
        : [...(drafts[selectedMember] || [])];
    const q = normalize(keywordSearch);
    return base.sort().filter((k) => !q || k.includes(q));
  }, [selectedMember, keywordMap, pending, drafts, keywordSearch]);

  const totalKeywords = useMemo(
    () => new Set([...Object.keys(keywordMap), ...pending]).size,
    [keywordMap, pending],
  );

  const visibleMembers = members.filter((m) => {
    const q = memberSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      m.username.toLowerCase().includes(q) ||
      `${m.first_name} ${m.surname}`.toLowerCase().includes(q)
    );
  });

  const rightUsers = members.filter((m) => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      m.username.toLowerCase().includes(q) ||
      `${m.first_name} ${m.surname}`.toLowerCase().includes(q)
    );
  });

  // ── Actions ────────────────────────────────────────────────────────
  const addKeywords = () => {
    const parts = [...new Set(input.split(",").map(normalize).filter(Boolean))];
    if (parts.length === 0) return;
    if (parts.some((p) => p.length > 100)) {
      showToast("error", "Keyword is too long (max 100 characters).");
      return;
    }

    if (selectedMember === ALL) {
      // No owner yet: keep it as pending, then the right panel opens to pick users
      setPending((prev) => [
        ...new Set([...prev, ...parts.filter((p) => !keywordMap[p])]),
      ]);
    } else {
      setDrafts((prev) => ({
        ...prev,
        [selectedMember]: [
          ...new Set([...(prev[selectedMember] || []), ...parts]),
        ].sort(),
      }));
    }
    setSelectedKeyword(parts[0]);
    setUserSearch("");
    setInput("");
  };

  // Assign / unassign a user for the selected keyword (right panel)
  const toggleUser = (keyword, userId) => {
    const has = (drafts[userId] || []).includes(keyword);
    const next = has
      ? (drafts[userId] || []).filter((k) => k !== keyword)
      : [...(drafts[userId] || []), keyword].sort();

    setDrafts((prev) => ({ ...prev, [userId]: next }));

    // keep the keyword visible in "All" view even if nobody has it anymore
    const othersHave = (keywordMap[keyword] || []).some((id) => id !== userId);
    const willHaveUsers = othersHave || !has;
    setPending((prev) =>
      willHaveUsers
        ? prev.filter((k) => k !== keyword)
        : [...new Set([...prev, keyword])],
    );
  };

  // Remove a keyword: from the selected member, or from everyone in "All" view
  const removeKeyword = (keyword) => {
    if (selectedMember === ALL) {
      setDrafts((prev) =>
        Object.fromEntries(
          Object.entries(prev).map(([id, list]) => [
            id,
            list.filter((k) => k !== keyword),
          ]),
        ),
      );
      setPending((prev) => prev.filter((k) => k !== keyword));
    } else {
      setDrafts((prev) => ({
        ...prev,
        [selectedMember]: (prev[selectedMember] || []).filter(
          (k) => k !== keyword,
        ),
      }));
    }
    if (selectedKeyword === keyword) setSelectedKeyword(null);
  };

  const resetAll = () => {
    setDrafts(Object.fromEntries(members.map((m) => [m.id, m.keywords])));
    setPending([]);
  };

  const saveAll = async () => {
    setSaving(true);
    let ok = 0;
    try {
      for (const id of dirtyIds) {
        const updated = await updateSneMemberKeywords(id, drafts[id] || []);
        setMembers((prev) => prev.map((m) => (m.id === id ? updated : m)));
        setDrafts((prev) => ({ ...prev, [id]: updated.keywords }));
        ok++;
      }
      setPending((prev) => prev.filter((k) => !keywordMap[k]));
      showToast("success", `Saved changes for ${ok} member(s).`);
    } catch (err) {
      showToast(
        "error",
        `${err.message}${ok ? ` (${ok} saved before the error)` : ""}`,
      );
    } finally {
      setSaving(false);
    }
  };

  // ── Small style helpers ────────────────────────────────────────────
  const panel = {
    background: colors.cardBg,
    border: `1px solid ${colors.cardBorder}`,
    borderRadius: "10px",
    display: "flex",
    flexDirection: "column",
    minHeight: 0,
    overflow: "hidden",
  };
  const panelHeader = {
    padding: "0.6rem 0.8rem",
    borderBottom: `1px solid ${colors.cardBorder}`,
    fontSize: "0.72rem",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    color: colors.textTertiary,
  };
  const searchInput = {
    width: "100%",
    boxSizing: "border-box",
    padding: "0.4rem 0.6rem",
    background: inputBg,
    border: `1px solid ${inputBorder}`,
    borderRadius: "6px",
    color: colors.textPrimary,
    fontSize: "0.76rem",
    outline: "none",
  };
  const rowStyle = (active) => ({
    padding: "0.5rem 0.8rem",
    cursor: "pointer",
    borderLeft: `3px solid ${active ? accent : "transparent"}`,
    background: active ? `${accent}18` : "transparent",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "0.5rem",
  });
  const countBadge = {
    fontSize: "0.65rem",
    fontWeight: 700,
    color: colors.textTertiary,
    background: colors.badgeBg || colors.pageBg,
    border: `1px solid ${colors.cardBorder}`,
    borderRadius: "999px",
    padding: "0.05rem 0.45rem",
    flexShrink: 0,
  };

  const selectedMemberObj =
    selectedMember === ALL ? null : memberById[selectedMember];
  const assignedToSelected = selectedKeyword
    ? keywordMap[selectedKeyword] || []
    : [];

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        padding: "0.75rem 1rem 1rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.6rem",
      }}
    >
      {/* Top bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "0.75rem",
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            fontSize: "0.74rem",
            color: colors.textSecondary,
            lineHeight: 1.5,
            flex: 1,
            minWidth: "260px",
          }}
        >
          💡 Pick a member (or <strong>All</strong>), then a generic name to see
          who handles it. A keyword matches when it appears as a{" "}
          <strong>whole word</strong> in the generic name (<em>vitamins</em>{" "}
          does not match <em>multivitamins</em>). If several members share a
          keyword, the one with the{" "}
          <strong>fewest in-progress S&E tasks</strong> is picked. A more
          specific keyword (more words) wins over a shorter one.
        </div>
        {canEdit && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            {dirtyIds.length > 0 && (
              <span
                style={{
                  fontSize: "0.68rem",
                  fontWeight: 600,
                  color: "#f59e0b",
                  background: "#f59e0b15",
                  border: "1px solid #f59e0b40",
                  padding: "0.15rem 0.5rem",
                  borderRadius: "4px",
                }}
              >
                {dirtyIds.length} member{dirtyIds.length > 1 ? "s" : ""} with
                unsaved changes
              </span>
            )}
            <button
              type="button"
              onClick={resetAll}
              disabled={
                (dirtyIds.length === 0 && pending.length === 0) || saving
              }
              style={{
                padding: "0.4rem 0.8rem",
                background: "transparent",
                border: `1px solid ${colors.cardBorder}`,
                borderRadius: "6px",
                color: colors.textSecondary,
                fontSize: "0.75rem",
                cursor: "pointer",
                opacity:
                  (dirtyIds.length === 0 && pending.length === 0) || saving
                    ? 0.5
                    : 1,
              }}
            >
              Reset
            </button>
            <button
              type="button"
              onClick={saveAll}
              disabled={dirtyIds.length === 0 || saving}
              style={{
                padding: "0.4rem 1rem",
                background: accent,
                border: "none",
                borderRadius: "6px",
                color: "#fff",
                fontSize: "0.75rem",
                fontWeight: 700,
                cursor:
                  dirtyIds.length === 0 || saving ? "not-allowed" : "pointer",
                opacity: dirtyIds.length === 0 || saving ? 0.5 : 1,
              }}
            >
              {saving ? "Saving..." : "Save changes"}
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div
          style={{
            textAlign: "center",
            padding: "2rem",
            color: colors.textTertiary,
            fontSize: "0.8rem",
          }}
        >
          Loading S&E members...
        </div>
      ) : members.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "2rem",
            color: colors.textTertiary,
            fontSize: "0.8rem",
          }}
        >
          No active members in the S&E group.
        </div>
      ) : (
        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: "grid",
            gridTemplateColumns: "240px minmax(260px, 1fr) 300px",
            gap: "0.6rem",
          }}
        >
          {/* ── LEFT: members ── */}
          <div style={panel}>
            <div style={panelHeader}>S&E Members ({members.length})</div>
            <div style={{ padding: "0.5rem" }}>
              <input
                type="text"
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                placeholder="Search member..."
                style={searchInput}
              />
            </div>
            <div style={{ overflowY: "auto", flex: 1 }}>
              <div
                onClick={() => {
                  setSelectedMember(ALL);
                  setSelectedKeyword(null);
                }}
                style={rowStyle(selectedMember === ALL)}
              >
                <span
                  style={{
                    fontSize: "0.8rem",
                    fontWeight: 700,
                    color: colors.textPrimary,
                  }}
                >
                  📚 All generic names
                </span>
                <span style={countBadge}>{totalKeywords}</span>
              </div>
              {visibleMembers.map((m) => {
                const dirty = dirtyIds.includes(m.id);
                return (
                  <div
                    key={m.id}
                    onClick={() => {
                      setSelectedMember(m.id);
                      setSelectedKeyword(null);
                    }}
                    style={rowStyle(selectedMember === m.id)}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: "0.8rem",
                          fontWeight: 700,
                          color: colors.textPrimary,
                        }}
                      >
                        {m.username}
                        {dirty && (
                          <span
                            title="Unsaved changes"
                            style={{ color: "#f59e0b", marginLeft: 4 }}
                          >
                            ●
                          </span>
                        )}
                      </div>
                      <div
                        style={{
                          fontSize: "0.68rem",
                          color: colors.textTertiary,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {m.first_name} {m.surname}
                      </div>
                    </div>
                    <span style={countBadge}>
                      {(drafts[m.id] || []).length}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── CENTER: generic names ── */}
          <div style={panel}>
            <div style={panelHeader}>
              {selectedMemberObj
                ? `Generic names of ${selectedMemberObj.username}`
                : "All generic names"}{" "}
              ({centerKeywords.length})
            </div>

            {canEdit && (
              <div
                style={{
                  padding: "0.5rem",
                  display: "flex",
                  gap: "0.4rem",
                  borderBottom: `1px solid ${colors.cardBorder}`,
                }}
              >
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addKeywords();
                    }
                  }}
                  placeholder={
                    selectedMemberObj
                      ? `Add generic name for ${selectedMemberObj.username} (comma = many)`
                      : "Add generic name (e.g. vitamin), then pick who handles it"
                  }
                  style={{ ...searchInput, flex: 1 }}
                />
                <button
                  type="button"
                  onClick={addKeywords}
                  style={{
                    padding: "0.4rem 0.8rem",
                    background: accent,
                    border: "none",
                    borderRadius: "6px",
                    color: "#fff",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  + Add
                </button>
              </div>
            )}

            <div style={{ padding: "0.5rem 0.5rem 0.25rem" }}>
              <input
                type="text"
                value={keywordSearch}
                onChange={(e) => setKeywordSearch(e.target.value)}
                placeholder="Filter generic names..."
                style={searchInput}
              />
            </div>

            <div style={{ overflowY: "auto", flex: 1 }}>
              {centerKeywords.length === 0 && (
                <div
                  style={{
                    padding: "1.5rem",
                    textAlign: "center",
                    fontSize: "0.76rem",
                    color: colors.textTertiary,
                  }}
                >
                  No generic names yet.
                </div>
              )}
              {centerKeywords.map((kw) => {
                const ids = keywordMap[kw] || [];
                const active = selectedKeyword === kw;
                const unassigned = ids.length === 0;
                const shared = ids.length > 1;
                return (
                  <div
                    key={kw}
                    onClick={() => {
                      setSelectedKeyword(kw);
                      setUserSearch("");
                    }}
                    style={rowStyle(active)}
                  >
                    <span
                      style={{
                        fontSize: "0.8rem",
                        fontWeight: 600,
                        color: colors.textPrimary,
                      }}
                    >
                      {kw}
                    </span>
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.4rem",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "0.65rem",
                          fontWeight: 600,
                          padding: "0.05rem 0.45rem",
                          borderRadius: "999px",
                          color: unassigned
                            ? "#ef4444"
                            : shared
                              ? "#9333ea"
                              : "#2196F3",
                          background: unassigned
                            ? "#ef444415"
                            : shared
                              ? "#9333ea15"
                              : "#2196F315",
                          border: `1px solid ${
                            unassigned
                              ? "#ef444440"
                              : shared
                                ? "#9333ea40"
                                : "#2196F340"
                          }`,
                        }}
                      >
                        {unassigned ? "no one" : `👤 ${ids.length}`}
                      </span>
                      {canEdit && (
                        <button
                          type="button"
                          title={
                            selectedMemberObj
                              ? `Remove from ${selectedMemberObj.username}`
                              : "Remove from everyone"
                          }
                          onClick={(e) => {
                            e.stopPropagation();
                            removeKeyword(kw);
                          }}
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            color: colors.textTertiary,
                            fontSize: "0.75rem",
                            padding: 0,
                          }}
                        >
                          ✕
                        </button>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── RIGHT: who handles the selected generic name ── */}
          <div style={panel}>
            <div style={panelHeader}>
              {selectedKeyword ? "Assigned to" : "Assignment"}
            </div>

            {!selectedKeyword ? (
              <div
                style={{
                  padding: "1.5rem",
                  textAlign: "center",
                  fontSize: "0.76rem",
                  color: colors.textTertiary,
                  lineHeight: 1.6,
                }}
              >
                👈 Click a generic name to see which members handle it.
              </div>
            ) : (
              <>
                <div
                  style={{
                    padding: "0.6rem 0.8rem",
                    borderBottom: `1px solid ${colors.cardBorder}`,
                  }}
                >
                  <div
                    style={{
                      fontSize: "0.9rem",
                      fontWeight: 700,
                      color: colors.textPrimary,
                    }}
                  >
                    “{selectedKeyword}”
                  </div>
                  <div
                    style={{
                      fontSize: "0.7rem",
                      marginTop: "0.2rem",
                      color:
                        assignedToSelected.length === 0
                          ? "#ef4444"
                          : colors.textTertiary,
                    }}
                  >
                    {assignedToSelected.length === 0
                      ? "⚠️ No one is assigned yet. Check a member below."
                      : assignedToSelected.length === 1
                        ? `Handled by ${memberById[assignedToSelected[0]]?.username}`
                        : `Shared by ${assignedToSelected.length} members. Work is split by current workload.`}
                  </div>
                </div>

                <div style={{ padding: "0.5rem" }}>
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Search member..."
                    style={searchInput}
                  />
                </div>

                <div style={{ overflowY: "auto", flex: 1 }}>
                  {[...rightUsers]
                    .sort(
                      (a, b) =>
                        Number(assignedToSelected.includes(b.id)) -
                        Number(assignedToSelected.includes(a.id)),
                    )
                    .map((m) => {
                      const checked = assignedToSelected.includes(m.id);
                      return (
                        <label
                          key={m.id}
                          style={{
                            ...rowStyle(checked),
                            cursor: canEdit ? "pointer" : "default",
                            justifyContent: "flex-start",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={!canEdit}
                            onChange={() => toggleUser(selectedKeyword, m.id)}
                            style={{
                              accentColor: accent,
                              width: 15,
                              height: 15,
                            }}
                          />
                          <div style={{ minWidth: 0 }}>
                            <div
                              style={{
                                fontSize: "0.78rem",
                                fontWeight: 700,
                                color: colors.textPrimary,
                              }}
                            >
                              {m.username}
                            </div>
                            <div
                              style={{
                                fontSize: "0.68rem",
                                color: colors.textTertiary,
                              }}
                            >
                              {m.first_name} {m.surname}
                            </div>
                          </div>
                        </label>
                      );
                    })}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default SneAssignmentsTab;
