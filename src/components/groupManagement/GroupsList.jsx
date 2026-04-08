// FILE: src/components/groupManagement/GroupsList.jsx
// Revised to support drag-and-drop: each group row is its own drop zone.
// Dropping a user (from pool OR from members) onto a row assigns them to that group.

import { useState } from "react";

function GroupsList({
  groups,
  selectedGroup,
  setSelectedGroup,
  loading,
  colors,
  darkMode,
  // DnD
  dragging,
  dropTarget,
  handleDragEnter,
  handleDragLeave,
  handleDropOnGroup,
}) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredGroups = groups.filter((g) =>
    g.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div
      style={{
        background: colors.cardBg,
        border: `1px solid ${colors.cardBorder}`,
        borderRadius: "14px",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          padding: "0.9rem",
          borderBottom: `1px solid ${colors.cardBorder}`,
          flexShrink: 0,
        }}
      >
        <input
          type="text"
          placeholder="Search groups..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: "100%",
            padding: "0.3rem 0.5rem",
            borderRadius: "8px",
            border: `1px solid ${colors.inputBorder}`,
            background: colors.inputBg,
            color: colors.textPrimary,
            fontSize: "0.8rem",
            outline: "none",
            boxSizing: "border-box",
          }}
        />
      </div>

      {/* Drag hint — shown when something is being dragged */}
      {dragging && (
        <div
          style={{
            padding: "0.4rem 0.9rem",
            background: darkMode ? "#1a1a1a" : "#f5f5ff",
            borderBottom: `1px solid ${colors.rowBorder}`,
            fontSize: "0.72rem",
            color: colors.btnPrimary,
            display: "flex",
            alignItems: "center",
            gap: "0.35rem",
            flexShrink: 0,
          }}
        >
          <span>↓</span> Drop on a group to assign
        </div>
      )}

      <div style={{ flex: 1, overflowY: "auto" }}>
        {loading ? (
          <div
            style={{
              padding: "2rem",
              textAlign: "center",
              color: colors.textTertiary,
              fontSize: "0.85rem",
            }}
          >
            Loading...
          </div>
        ) : filteredGroups.length === 0 ? (
          <div style={{ padding: "2rem", textAlign: "center" }}>
            <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>📂</div>
            <div style={{ color: colors.textSecondary, fontSize: "0.85rem" }}>
              {searchQuery ? "No groups match" : "No groups yet."}
            </div>
          </div>
        ) : (
          filteredGroups.map((group) => {
            const isSelected = selectedGroup?.id === group.id;
            const zoneKey = `group-${group.id}`;
            const isDropTarget = dropTarget === zoneKey && !!dragging;
            // Don't highlight the already-selected group when dragging FROM it
            const isDraggingFromThis = dragging?.fromGroupId === group.id;

            return (
              <GroupRow
                key={group.id}
                group={group}
                isSelected={isSelected}
                isDropTarget={isDropTarget && !isDraggingFromThis}
                isDraggingFromThis={isDraggingFromThis}
                dragging={!!dragging}
                colors={colors}
                darkMode={darkMode}
                onClick={() => setSelectedGroup(group)}
                onDragOver={(e) => {
                  if (dragging && !isDraggingFromThis) e.preventDefault();
                }}
                onDragEnter={() => {
                  if (dragging && !isDraggingFromThis) handleDragEnter(zoneKey);
                }}
                onDragLeave={() => {
                  if (dragging && !isDraggingFromThis) handleDragLeave(zoneKey);
                }}
                onDrop={() => {
                  if (dragging && !isDraggingFromThis)
                    handleDropOnGroup(group.id);
                }}
              />
            );
          })
        )}
      </div>
    </div>
  );
}

function GroupRow({
  group,
  isSelected,
  isDropTarget,
  isDraggingFromThis,
  dragging,
  colors,
  darkMode,
  onClick,
  onDragOver,
  onDragEnter,
  onDragLeave,
  onDrop,
}) {
  return (
    <div
      onClick={onClick}
      onDragOver={onDragOver}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      style={{
        padding: "0.5rem .5rem",
        cursor: "pointer",
        background: isDropTarget
          ? `${colors.btnPrimary}18`
          : isSelected
            ? colors.selectedBg
            : "transparent",
        borderLeft: isDropTarget
          ? `3px solid ${colors.btnPrimary}`
          : isSelected
            ? `3px solid ${colors.btnPrimary}`
            : "3px solid transparent",
        borderBottom: `1px solid ${colors.rowBorder}`,
        transition: "all 0.15s ease",
        // Subtle ring on drop target
        boxShadow: isDropTarget
          ? `inset 0 0 0 1px ${colors.btnPrimary}44`
          : "none",
        opacity: isDraggingFromThis && dragging ? 0.5 : 1,
      }}
      onMouseEnter={(e) => {
        if (!isSelected && !isDropTarget)
          e.currentTarget.style.background = colors.rowHover;
      }}
      onMouseLeave={(e) => {
        if (!isSelected && !isDropTarget)
          e.currentTarget.style.background = "transparent";
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div
          style={{
            fontWeight: "600",
            fontSize: "0.75rem",
            color:
              isSelected || isDropTarget
                ? colors.btnPrimary
                : colors.textPrimary,
            transition: "color 0.15s",
          }}
        >
          {isDropTarget ? `→ ${group.name}` : group.name}
        </div>
        <span
          style={{
            fontSize: "0.7rem",
            fontWeight: "700",
            background: isDropTarget
              ? `${colors.btnPrimary}22`
              : darkMode
                ? "#2a2a2a"
                : "#f0f0f0",
            color: isDropTarget ? colors.btnPrimary : colors.textTertiary,
            padding: "0.15rem 0.5rem",
            borderRadius: "10px",
            transition: "all 0.15s",
          }}
        >
          {group.user_count ?? "—"}
        </span>
      </div>
      {group.description && (
        <div
          style={{
            fontSize: "0.75rem",
            color: colors.textTertiary,
            marginTop: "0.2rem",
          }}
        >
          {group.description}
        </div>
      )}
    </div>
  );
}

export default GroupsList;
