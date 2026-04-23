// src/components/monitoring/records/RecordsView.jsx
import { useState } from "react";
import TasksPerUser from "./TasksPerUser";
import AllRecords from "./AllRecords";

/**
 * RecordsView
 * - Left panel: TasksPerUser (live from /monitoring/users-tasks)
 * - Right panel: AllRecords (live from /monitoring/all-records)
 *
 * Clicking a user in TasksPerUser filters AllRecords by that user_id.
 */
export default function RecordsView({ ui, darkMode }) {
  const [selectedUser, setSelectedUser] = useState(null); // { user_id, full_name, ... }

  const handleUserClick = (user) => {
    // Toggle: click same user again to deselect
    setSelectedUser((prev) => (prev?.user_id === user.user_id ? null : user));
  };

  return (
    <div
      style={{
        display: "flex",
        gap: 14,
        alignItems: "stretch",
        flexWrap: "wrap",
      }}
    >
      <TasksPerUser
        ui={ui}
        darkMode={darkMode}
        onUserClick={handleUserClick}
        selectedUserId={selectedUser?.user_id ?? null}
      />

      <div
        style={{
          flex: "1 1 360px",
          minWidth: 300,
          display: "flex",
          flexDirection: "column",
          gap: 0,
        }}
      >
        {/* Active user filter banner */}
        {selectedUser && (
          <div
            style={{
              marginBottom: 8,
              padding: "8px 14px",
              borderRadius: 8,
              background: darkMode ? "#1a2744" : "#e7f0fd",
              border: `1.5px solid #1877F2`,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
            }}
          >
            <span
              style={{
                fontSize: "0.8rem",
                fontWeight: 600,
                color: "#1877F2",
                fontFamily:
                  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif",
              }}
            >
              👤 Showing records for:{" "}
              <strong>{selectedUser.full_name || selectedUser.username}</strong>
            </span>
            <button
              onClick={() => setSelectedUser(null)}
              style={{
                background: "transparent",
                border: `1px solid #1877F2`,
                borderRadius: 6,
                color: "#1877F2",
                cursor: "pointer",
                fontSize: "0.75rem",
                fontWeight: 600,
                padding: "2px 10px",
                fontFamily:
                  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif",
              }}
            >
              ✕ Clear
            </button>
          </div>
        )}

        <AllRecords
          ui={ui}
          darkMode={darkMode}
          filterUserId={selectedUser?.user_id ?? null}
        />
      </div>
    </div>
  );
}
