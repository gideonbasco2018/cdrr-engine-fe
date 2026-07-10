// FILE: src/components/bulk-folder-upload/FolderTreeNode.jsx
import { ChevronRight, FolderOpen } from "lucide-react";
import FileEntryItem from "./FileEntryItem";
import { countTreeItems } from "./utils/fileHelpers";

function FolderTreeNode({
  node,
  groupKeyPrefix,
  colors,
  s,
  collapsedFolders,
  toggleFolder,
  activeEntryId,
  setActiveEntryId,
  liveStatuses,
  isUploading,
  removeEntry,
}) {
  const groupKey = `${groupKeyPrefix}::${node.key}`;
  const isCollapsed = collapsedFolders.has(groupKey);
  const totalCount = countTreeItems(node);
  const childNodes = Array.from(node.children.values()).sort((a, b) =>
    a.label.localeCompare(b.label),
  );

  return (
    <div style={s.folderGroup}>
      <button
        type="button"
        onClick={() => toggleFolder(groupKey)}
        style={s.folderHeader}
      >
        <ChevronRight
          size={13}
          style={{
            transform: isCollapsed ? "rotate(0deg)" : "rotate(90deg)",
            transition: "transform 120ms ease",
            flexShrink: 0,
          }}
        />
        <FolderOpen size={14} style={{ flexShrink: 0 }} />
        <span style={s.folderLabel} title={node.label}>
          {node.label}
        </span>
        <span style={s.folderCount}>{totalCount}</span>
      </button>

      {!isCollapsed && (
        <div style={s.dtnGroupBody}>
          {childNodes.map((child) => (
            <FolderTreeNode
              key={child.key}
              node={child}
              groupKeyPrefix={groupKeyPrefix}
              colors={colors}
              s={s}
              collapsedFolders={collapsedFolders}
              toggleFolder={toggleFolder}
              activeEntryId={activeEntryId}
              setActiveEntryId={setActiveEntryId}
              liveStatuses={liveStatuses}
              isUploading={isUploading}
              removeEntry={removeEntry}
            />
          ))}
          {node.items.length > 0 && (
            <ul style={s.fileList}>
              {node.items.map((entry) => (
                <FileEntryItem
                  key={entry.id}
                  entry={entry}
                  s={s}
                  colors={colors}
                  isActive={entry.id === activeEntryId}
                  result={liveStatuses[entry.relativePath]}
                  isUploading={isUploading}
                  onSelect={() => setActiveEntryId(entry.id)}
                  onRemove={() => removeEntry(entry.id)}
                />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export default FolderTreeNode;
