// src/components/monitoring/records/RecordsView.jsx
import { useState } from "react";
import TasksPerUser from "./TasksPerUser";
import AllRecords from "./AllRecords";

export default function RecordsView({ ui, darkMode }) {
  const [selectedUser, setSelectedUser] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all"); // "all" | "completed" | "in_progress"

  const handleUserClick = (user, clickedStatus = "all") => {
    const isSameUser = selectedUser?.user_id === user.user_id;
    if (isSameUser && clickedStatus === statusFilter) {
      // deselect if same user + same column clicked
      setSelectedUser(null);
      setStatusFilter("all");
    } else {
      setSelectedUser(user);
      setStatusFilter(clickedStatus);
    }
  };

  const handleClear = () => {
    setSelectedUser(null);
    setStatusFilter("all");
  };

  const statusLabel = {
    all: "All",
    completed: "Completed",
    in_progress: "In Progress",
  }[statusFilter];

  return (
    <div
      style={{
        display: "flex",
        gap: 14,
        alignItems: "stretch",
      }}
    >
      <TasksPerUser
        ui={ui}
        darkMode={darkMode}
        onUserClick={handleUserClick}
        selectedUserId={selectedUser?.user_id ?? null}
        selectedStatus={statusFilter}
      />

      <div
        style={{
          flex: "1 1 360px",
          minWidth: 300,
          display: "flex",
          flexDirection: "column",
          gap: 0,
          // match TasksPerUser height
          height: "calc(100vh - 160px)",
          maxHeight: "calc(100vh - 160px)",
        }}
      >
        {/* Active filter banner */}
        {selectedUser && (
          <div
            style={{
              marginBottom: 8,
              padding: "8px 14px",
              borderRadius: 8,
              background: darkMode ? "#1a2744" : "#e7f0fd",
              border: "1.5px solid #1877F2",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
              flexShrink: 0,
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
              {statusFilter !== "all" && (
                <span
                  style={{
                    marginLeft: 8,
                    padding: "2px 8px",
                    borderRadius: 99,
                    fontSize: "0.72rem",
                    background:
                      statusFilter === "completed" ? "#dcfce7" : "#fef9c3",
                    color: statusFilter === "completed" ? "#15803d" : "#a16207",
                  }}
                >
                  {statusLabel}
                </span>
              )}
            </span>
            <button
              onClick={handleClear}
              style={{
                background: "transparent",
                border: "1px solid #1877F2",
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
          statusFilter={statusFilter}
        />
      </div>
    </div>
  );
}
