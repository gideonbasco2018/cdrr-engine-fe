// src/components/monitoring/records/RecordsView.jsx
import { useState, useEffect } from "react";
import TasksPerUser from "./TasksPerUser";
import AllRecords from "./AllRecords";

// ── Inject scrollbar styles ───────────────────────────────────────────────────
function useScrollbarStyles() {
  useEffect(() => {
    const id = "monitoring-scrollbar-style";
    let el = document.getElementById(id);
    if (!el) {
      el = document.createElement("style");
      el.id = id;
      document.head.appendChild(el);
    }

    el.textContent = `
      @keyframes skel-pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.4; }
      }
      .monitoring-scroll::-webkit-scrollbar {
        width: 3px;
        height: 3px;
      }
      .monitoring-scroll::-webkit-scrollbar-track {
        background: transparent;
      }
      .monitoring-scroll::-webkit-scrollbar-thumb {
        background: #d1d5db;
        border-radius: 99px;
      }
      .monitoring-scroll::-webkit-scrollbar-thumb:hover {
        background: #b0b6bf;
      }
      .monitoring-scroll::-webkit-scrollbar-corner {
        background: transparent;
      }
      .monitoring-scroll {
        scrollbar-width: thin;
        scrollbar-color: #d1d5db transparent;
      }
    `;

    return () => el.remove();
  }, []);
}

export default function RecordsView({ ui, darkMode }) {
  useScrollbarStyles();

  const [selectedUser, setSelectedUser] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");

  const handleUserClick = (user, clickedStatus = "all") => {
    const isSameUser = selectedUser?.user_id === user.user_id;
    if (isSameUser && clickedStatus === statusFilter) {
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

  const font =
    "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

  return (
    <div style={{ display: "flex", gap: 10, alignItems: "stretch" }}>
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
          height: "calc(100vh - 110px)",
          maxHeight: "calc(100vh - 110px)",
        }}
      >
        {/* Active filter banner */}
        {selectedUser && (
          <div
            style={{
              marginBottom: 5,
              padding: "5px 12px",
              borderRadius: 7,
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
                fontSize: "0.73rem",
                fontWeight: 600,
                color: "#1877F2",
                fontFamily: font,
              }}
            >
              👤 Showing:{" "}
              <strong>{selectedUser.full_name || selectedUser.username}</strong>
              {statusFilter !== "all" && (
                <span
                  style={{
                    marginLeft: 7,
                    padding: "1px 7px",
                    borderRadius: 99,
                    fontSize: "0.66rem",
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
                borderRadius: 5,
                color: "#1877F2",
                cursor: "pointer",
                fontSize: "0.68rem",
                fontWeight: 600,
                padding: "1px 8px",
                fontFamily: font,
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
