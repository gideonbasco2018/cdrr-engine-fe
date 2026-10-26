import { useCallback, useEffect, useMemo, useState } from "react";
import { getWorkflowRoles, updateWorkflowRole } from "../../api/workflow-roles";

const ROLE_INFO = {
  cashier: {
    label: "Cashier",
    icon: "💵",
    accent: "#10b981",
    description: "Can view and claim the Payment Verification/Posting pool.",
  },
  decker: {
    label: "Decker",
    icon: "🗂️",
    accent: "#6366f1",
    description: "Can view and claim the Decking pool and submit decisions.",
  },
  evaluator: {
    label: "Evaluator",
    icon: "🧪",
    accent: "#f59e0b",
    description: "Appears in the evaluator list when a decker assigns a task.",
  },
};

const FALLBACK_INFO = {
  label: "",
  icon: "📋",
  accent: "#6b7280",
  description: "",
};

const sameIds = (a, b) =>
  a.length === b.length && [...a].sort().join(",") === [...b].sort().join(",");

function GroupChip({
  group,
  colors,
  accent,
  dots = [],
  onDragStart,
  onDragEnd,
  onRemove,
}) {
  return (
    <span
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "copyMove";
        e.dataTransfer.setData("text/plain", String(group.id));
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      title={group.name}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.35rem",
        padding: "0.3rem 0.6rem",
        fontSize: "0.68rem",
        fontWeight: 600,
        borderRadius: "8px",
        border: `1px solid ${accent ? accent : colors.cardBorder}`,
        background: accent ? `${accent}22` : colors.pageBg,
        color: colors.textPrimary,
        cursor: "grab",
        userSelect: "none",
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ opacity: 0.45, fontSize: "0.6rem" }}>⠿</span>
      <span>{group.name}</span>
      {dots.length > 0 && (
        <span style={{ display: "inline-flex", gap: 3 }}>
          {dots.map((c) => (
            <span
              key={c}
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: c,
                display: "inline-block",
              }}
            />
          ))}
        </span>
      )}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${group.name}`}
          style={{
            border: "none",
            background: "transparent",
            color: colors.textTertiary,
            cursor: "pointer",
            fontSize: "0.8rem",
            lineHeight: 1,
            padding: 0,
          }}
        >
          ×
        </button>
      )}
    </span>
  );
}

function WorkflowRolesTab({ colors, showToast }) {
  const [groups, setGroups] = useState([]);
  const [saved, setSaved] = useState({}); // { roleKey: number[] }
  const [draft, setDraft] = useState({}); // { roleKey: number[] }
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState(null);
  const [search, setSearch] = useState("");
  const [drag, setDrag] = useState(null); // { groupId, from: roleKey | null }
  const [over, setOver] = useState(null); // roleKey | "pool" | null

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getWorkflowRoles();
      const map = {};
      data.roles.forEach((r) => {
        map[r.role_key] = r.group_ids;
      });
      setGroups(data.groups);
      setSaved(map);
      setDraft(map);
    } catch (err) {
      showToast("error", err.message || "Failed to load workflow roles.");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const groupById = useMemo(
    () => new Map(groups.map((g) => [g.id, g])),
    [groups],
  );
  const roleKeys = useMemo(() => Object.keys(draft), [draft]);

  const filteredGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    return groups.filter((g) => !q || g.name.toLowerCase().includes(q));
  }, [groups, search]);

  const rolesOfGroup = (groupId) =>
    roleKeys
      .filter((k) => (draft[k] || []).includes(groupId))
      .map((k) => (ROLE_INFO[k] || FALLBACK_INFO).accent);

  const addToRole = (roleKey, groupId) =>
    setDraft((prev) => {
      const cur = prev[roleKey] || [];
      return cur.includes(groupId)
        ? prev
        : { ...prev, [roleKey]: [...cur, groupId] };
    });

  const removeFromRole = (roleKey, groupId) =>
    setDraft((prev) => ({
      ...prev,
      [roleKey]: (prev[roleKey] || []).filter((id) => id !== groupId),
    }));

  const reset = (roleKey) =>
    setDraft((prev) => ({ ...prev, [roleKey]: saved[roleKey] || [] }));

  const endDrag = () => {
    setDrag(null);
    setOver(null);
  };

  const handleDrop = (e, target) => {
    e.preventDefault();
    if (!drag) return endDrag();
    if (target === "pool") {
      if (drag.from) removeFromRole(drag.from, drag.groupId);
    } else {
      addToRole(target, drag.groupId);
    }
    endDrag();
  };

  const zoneProps = (target) => ({
    onDragOver: (e) => {
      if (!drag) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = target === "pool" ? "move" : "copy";
      if (over !== target) setOver(target);
    },
    onDragLeave: (e) => {
      if (!e.currentTarget.contains(e.relatedTarget)) {
        setOver((prev) => (prev === target ? null : prev));
      }
    },
    onDrop: (e) => handleDrop(e, target),
  });

  const save = async (roleKey) => {
    const ids = draft[roleKey] || [];
    const label = (ROLE_INFO[roleKey] || {}).label || roleKey;
    if (
      ids.length === 0 &&
      !window.confirm(
        `No group is selected for "${label}". Nobody will have this role. Continue?`,
      )
    ) {
      return;
    }
    setSavingKey(roleKey);
    try {
      const result = await updateWorkflowRole(roleKey, ids);
      setSaved((prev) => ({ ...prev, [roleKey]: result.group_ids }));
      setDraft((prev) => ({ ...prev, [roleKey]: result.group_ids }));
      showToast("success", `${label} role updated.`);
    } catch (err) {
      showToast("error", err.message || "Failed to update role.");
    } finally {
      setSavingKey(null);
    }
  };

  if (loading) {
    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: colors.textTertiary,
          fontSize: "0.8rem",
        }}
      >
        Loading workflow roles...
      </div>
    );
  }

  const poolActive = over === "pool" && drag?.from;

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: "grid",
        gridTemplateColumns: "minmax(230px, 290px) 1fr",
        gap: "1rem",
        padding: "1rem",
        overflow: "hidden",
      }}
    >
      {/* ── Group pool ── */}
      <div
        {...zoneProps("pool")}
        style={{
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
          background: colors.cardBg,
          border: `1px ${poolActive ? "dashed" : "solid"} ${
            poolActive ? "#ef4444" : colors.cardBorder
          }`,
          borderRadius: "12px",
          overflow: "hidden",
          transition: "border-color 0.15s ease",
        }}
      >
        <div
          style={{
            padding: "0.75rem 0.85rem 0.6rem",
            borderBottom: `1px solid ${colors.cardBorder}`,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "0.5rem",
            }}
          >
            <span
              style={{
                fontSize: "0.65rem",
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: colors.textTertiary,
              }}
            >
              All Groups
            </span>
            <span style={{ fontSize: "0.65rem", color: colors.textTertiary }}>
              {filteredGroups.length}
            </span>
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search groups..."
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "0.4rem 0.6rem",
              fontSize: "0.72rem",
              borderRadius: "8px",
              border: `1px solid ${colors.cardBorder}`,
              background: colors.pageBg,
              color: colors.textPrimary,
              outline: "none",
            }}
          />
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "0.6rem",
              marginTop: "0.55rem",
            }}
          >
            {roleKeys.map((k) => {
              const info = ROLE_INFO[k] || FALLBACK_INFO;
              return (
                <span
                  key={k}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: "0.6rem",
                    color: colors.textTertiary,
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: info.accent,
                    }}
                  />
                  {info.label || k}
                </span>
              );
            })}
          </div>
        </div>

        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "0.75rem",
            display: "flex",
            flexWrap: "wrap",
            alignContent: "flex-start",
            gap: "0.4rem",
          }}
        >
          {filteredGroups.length === 0 ? (
            <span style={{ fontSize: "0.72rem", color: colors.textTertiary }}>
              No groups found.
            </span>
          ) : (
            filteredGroups.map((g) => (
              <GroupChip
                key={g.id}
                group={g}
                colors={colors}
                dots={rolesOfGroup(g.id)}
                onDragStart={() => setDrag({ groupId: g.id, from: null })}
                onDragEnd={endDrag}
              />
            ))
          )}
        </div>

        <div
          style={{
            padding: "0.5rem 0.85rem",
            borderTop: `1px solid ${colors.cardBorder}`,
            fontSize: "0.62rem",
            color: poolActive ? "#ef4444" : colors.textTertiary,
          }}
        >
          {poolActive
            ? "Release to remove from the role"
            : "Drag a group onto a role. Drag it back here to remove."}
        </div>
      </div>

      {/* ── Role cards ── */}
      <div
        style={{
          minHeight: 0,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: "0.85rem",
          paddingRight: "0.25rem",
        }}
      >
        {roleKeys.map((roleKey) => {
          const info = ROLE_INFO[roleKey] || {
            ...FALLBACK_INFO,
            label: roleKey,
          };
          const ids = draft[roleKey] || [];
          const dirty = !sameIds(ids, saved[roleKey] || []);
          const saving = savingKey === roleKey;
          const isOver = over === roleKey;
          const addable = groups.filter((g) => !ids.includes(g.id));

          return (
            <div
              key={roleKey}
              {...zoneProps(roleKey)}
              style={{
                background: isOver ? `${info.accent}14` : colors.cardBg,
                border: `1px ${isOver ? "dashed" : "solid"} ${
                  isOver ? info.accent : dirty ? "#f59e0b" : colors.cardBorder
                }`,
                borderLeft: `4px solid ${info.accent}`,
                borderRadius: "12px",
                padding: "0.85rem 1rem",
                transition: "background 0.15s ease, border-color 0.15s ease",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: "0.75rem",
                  flexWrap: "wrap",
                  marginBottom: "0.7rem",
                }}
              >
                <div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.45rem",
                      fontSize: "0.88rem",
                      fontWeight: 700,
                      color: colors.textPrimary,
                    }}
                  >
                    <span>{info.icon}</span>
                    <span>{info.label}</span>
                    <span
                      style={{
                        fontSize: "0.6rem",
                        fontWeight: 700,
                        padding: "1px 7px",
                        borderRadius: 999,
                        background: `${info.accent}26`,
                        color: info.accent,
                      }}
                    >
                      {ids.length} group{ids.length === 1 ? "" : "s"}
                    </span>
                    {dirty && (
                      <span
                        style={{
                          fontSize: "0.58rem",
                          fontWeight: 700,
                          color: "#f59e0b",
                        }}
                      >
                        • Unsaved
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: "0.7rem",
                      color: colors.textTertiary,
                      marginTop: "0.2rem",
                    }}
                  >
                    {info.description}
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: "0.4rem",
                    alignItems: "center",
                  }}
                >
                  <select
                    value=""
                    onChange={(e) => {
                      if (e.target.value)
                        addToRole(roleKey, Number(e.target.value));
                    }}
                    style={{
                      padding: "0.3rem 0.4rem",
                      fontSize: "0.68rem",
                      borderRadius: "6px",
                      border: `1px solid ${colors.cardBorder}`,
                      background: colors.pageBg,
                      color: colors.textSecondary,
                      maxWidth: 130,
                      cursor: "pointer",
                    }}
                  >
                    <option value="">+ Add group</option>
                    {addable.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => reset(roleKey)}
                    disabled={!dirty || saving}
                    style={{
                      padding: "0.35rem 0.75rem",
                      fontSize: "0.7rem",
                      fontWeight: 600,
                      borderRadius: "6px",
                      border: `1px solid ${colors.cardBorder}`,
                      background: "transparent",
                      color: colors.textSecondary,
                      cursor: !dirty || saving ? "not-allowed" : "pointer",
                      opacity: !dirty || saving ? 0.5 : 1,
                    }}
                  >
                    Reset
                  </button>
                  <button
                    onClick={() => save(roleKey)}
                    disabled={!dirty || saving}
                    style={{
                      padding: "0.35rem 0.85rem",
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      borderRadius: "6px",
                      border: "none",
                      background: colors.btnPrimary,
                      color: "#fff",
                      cursor: !dirty || saving ? "not-allowed" : "pointer",
                      opacity: !dirty || saving ? 0.5 : 1,
                    }}
                  >
                    {saving ? "Saving..." : "Save"}
                  </button>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "0.4rem",
                  minHeight: "2.4rem",
                  padding: "0.55rem",
                  borderRadius: "8px",
                  border: `1px dashed ${isOver ? info.accent : colors.cardBorder}`,
                  alignItems: "center",
                }}
              >
                {ids.length === 0 ? (
                  <span
                    style={{ fontSize: "0.7rem", color: colors.textTertiary }}
                  >
                    Drop a group here
                  </span>
                ) : (
                  ids.map((id) => {
                    const g = groupById.get(id);
                    if (!g) return null;
                    return (
                      <GroupChip
                        key={id}
                        group={g}
                        colors={colors}
                        accent={info.accent}
                        onDragStart={() =>
                          setDrag({ groupId: id, from: roleKey })
                        }
                        onDragEnd={endDrag}
                        onRemove={() => removeFromRole(roleKey, id)}
                      />
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default WorkflowRolesTab;
