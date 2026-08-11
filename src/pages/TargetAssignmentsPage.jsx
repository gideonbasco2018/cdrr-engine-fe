import React, { useState, useEffect, useCallback } from "react";
import {
  getMyTeam,
  getMemberTasks,
  markAsTarget,
  bulkMarkAsTarget,
  unmarkAsTarget,
} from "../api/targetAssignments";
import { getCurrentUser } from "../api/auth";
import { useColors } from "../components/targetAssignments/useColors";
import { ListView } from "../components/targetAssignments/ListView";
import { TeamDiagramView } from "../components/targetAssignments/TeamDiagramView";
import { TargetTableView } from "../components/targetAssignments/TargetTableView";
import { DirectorsTargetView } from "../components/targetAssignments/DirectorsTargetView";
import { TargetModal } from "../components/targetAssignments/TargetModal";
import { DirectorsTeamDiagramView } from "../components/targetAssignments/DirectorsTeamDiagramView";
// ── Groups na pwedeng makakita ng "Directors Target" tab ────────────
const ALLOWED_DIRECTORS_TARGET_GROUPS = ["OD", "Director", "IT"];

function userInAllowedGroups(user, allowedNames) {
  if (!user?.groups) return false;
  const allowedLower = allowedNames.map((n) => n.toLowerCase());
  return user.groups.some((g) =>
    allowedLower.includes((g.name || "").toLowerCase()),
  );
}

export default function TargetAssignmentsPage({ darkMode }) {
  const colors = useColors(darkMode);

  const [currentUser, setCurrentUser] = useState(null);
  const [team, setTeam] = useState([]);
  const [teamLoading, setTeamLoading] = useState(true);
  const [teamError, setTeamError] = useState(null);

  const [selectedMemberId, setSelectedMemberId] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [tasksError, setTasksError] = useState(null);

  // ── Modal (single-task edit or bulk mark) ───────────────────────
  const [modalTasks, setModalTasks] = useState(null); // array or null
  const [modalSubmitting, setModalSubmitting] = useState(false);

  // ── View tabs (List / Diagram / Table / Directors) ───────────────
  const [activeView, setActiveView] = useState("list");
  const [diagramData, setDiagramData] = useState({}); // { [member_user_id]: tasks[] }
  const [diagramLoading, setDiagramLoading] = useState(false);

  useEffect(() => {
    getCurrentUser()
      .then(setCurrentUser)
      .catch(() => setCurrentUser(null));
  }, []);

  const canSeeDirectorsTarget = userInAllowedGroups(
    currentUser,
    ALLOWED_DIRECTORS_TARGET_GROUPS,
  );

  const loadTeam = useCallback(async () => {
    setTeamLoading(true);
    setTeamError(null);
    try {
      const data = await getMyTeam();
      setTeam(data);
      setSelectedMemberId((prev) => prev ?? data[0]?.member_user_id ?? null);
    } catch (err) {
      setTeamError(err.message);
    } finally {
      setTeamLoading(false);
    }
  }, []);

  const loadTasks = useCallback(async (memberUserId) => {
    if (!memberUserId) {
      setTasks([]);
      return;
    }
    setTasksLoading(true);
    setTasksError(null);
    try {
      const data = await getMemberTasks(memberUserId);
      setTasks(data);
    } catch (err) {
      setTasksError(err.message);
    } finally {
      setTasksLoading(false);
    }
  }, []);

  // ── Diagram/Table views: fetch ALL tasks for EVERY team member ──
  // (kumpletong list — kailangan para sa Total/Completed/On Process counts;
  //  yung mga naka-target lang ang lalabas bilang children sa ilalim)
  const loadDiagramData = useCallback(async (members) => {
    if (!members || members.length === 0) {
      setDiagramData({});
      return;
    }
    setDiagramLoading(true);
    try {
      const results = await Promise.all(
        members.map((m) => getMemberTasks(m.member_user_id).catch(() => [])),
      );
      const map = {};
      members.forEach((m, i) => {
        map[m.member_user_id] = results[i] || [];
      });
      setDiagramData(map);
    } finally {
      setDiagramLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTeam();
  }, [loadTeam]);

  useEffect(() => {
    loadTasks(selectedMemberId);
  }, [selectedMemberId, loadTasks]);

  useEffect(() => {
    if (
      (activeView === "diagram" || activeView === "table") &&
      team.length > 0
    ) {
      loadDiagramData(team);
    }
  }, [activeView, team, loadDiagramData]);

  const refreshAfterChange = async () => {
    await Promise.all([loadTasks(selectedMemberId), loadTeam()]);
  };

  const openTargetModal = (task) => setModalTasks([task]);
  const openBulkModal = (selectedTasks) => setModalTasks(selectedTasks);
  const closeModal = () => {
    if (!modalSubmitting) setModalTasks(null);
  };

  const handleModalSubmit = async ({
    targetStartDate,
    targetEndDate,
    remarks,
  }) => {
    if (!modalTasks || modalTasks.length === 0) return;
    setModalSubmitting(true);
    try {
      if (modalTasks.length > 1) {
        await bulkMarkAsTarget(
          modalTasks.map((t) => t.log_id),
          { targetStartDate, targetEndDate, remarks },
        );
      } else {
        await markAsTarget(modalTasks[0].log_id, {
          targetStartDate,
          targetEndDate,
          remarks,
        });
      }
      await refreshAfterChange();
      setModalTasks(null);
    } catch (err) {
      setTasksError(err.message);
    } finally {
      setModalSubmitting(false);
    }
  };

  const handleRemoveTarget = async () => {
    if (!modalTasks || modalTasks.length !== 1) return;
    setModalSubmitting(true);
    try {
      await unmarkAsTarget(modalTasks[0].log_id);
      await refreshAfterChange();
      setModalTasks(null);
    } catch (err) {
      setTasksError(err.message);
    } finally {
      setModalSubmitting(false);
    }
  };

  const viewTabs = [
    { key: "list", label: "📋 List View" },
    { key: "diagram", label: "🗺️ Team Diagram" },
    { key: "table", label: "📊 Target Table" },
    ...(canSeeDirectorsTarget
      ? [
          { key: "directors", label: "🏛️ Directors Target" },
          { key: "directorsDiagram", label: "🏛️🗺️ Directors Diagram" },
        ]
      : []),
  ];

  return (
    <div
      style={{
        flex: 1,
        background: colors.pageBg,
        color: colors.textPrimary,
        height: "100%",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        padding: "1rem",
        boxSizing: "border-box",
      }}
    >
      {/* HEADER */}
      <div style={{ marginBottom: "0.75rem" }}>
        <h1 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700 }}>
          🎯 Target Assignments
        </h1>
        <p
          style={{
            margin: "0.25rem 0 0",
            fontSize: "0.8rem",
            color: colors.textSecondary,
          }}
        >
          Showing team members assigned to you as lead.
        </p>
      </div>

      {/* VIEW TABS */}
      <div
        style={{
          display: "flex",
          gap: "0.4rem",
          marginBottom: "1rem",
          borderBottom: `1px solid ${colors.cardBorder}`,
        }}
      >
        {viewTabs.map((tab) => {
          const isActive = activeView === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveView(tab.key)}
              style={{
                padding: "0.5rem 0.9rem",
                border: "none",
                background: "transparent",
                borderBottom: isActive
                  ? `2px solid ${colors.selectedBorder}`
                  : "2px solid transparent",
                color: isActive ? colors.textPrimary : colors.textTertiary,
                fontWeight: isActive ? 700 : 500,
                fontSize: "0.82rem",
                cursor: "pointer",
                marginBottom: "-1px",
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeView === "list" ? (
        <ListView
          colors={colors}
          team={team}
          teamLoading={teamLoading}
          teamError={teamError}
          selectedMemberId={selectedMemberId}
          onSelectMember={setSelectedMemberId}
          tasks={tasks}
          tasksLoading={tasksLoading}
          tasksError={tasksError}
          onOpenTargetModal={openTargetModal}
          onOpenBulkModal={openBulkModal}
        />
      ) : activeView === "diagram" ? (
        <TeamDiagramView
          colors={colors}
          darkMode={darkMode}
          team={team}
          diagramData={diagramData}
          diagramLoading={diagramLoading}
        />
      ) : activeView === "table" ? (
        <TargetTableView
          colors={colors}
          team={team}
          diagramData={diagramData}
          diagramLoading={diagramLoading}
        />
      ) : activeView === "directors" && canSeeDirectorsTarget ? (
        <DirectorsTargetView colors={colors} />
      ) : activeView === "directorsDiagram" && canSeeDirectorsTarget ? (
        <DirectorsTeamDiagramView colors={colors} />
      ) : null}

      {modalTasks && (
        <TargetModal
          colors={colors}
          tasks={modalTasks}
          onClose={closeModal}
          onSubmit={handleModalSubmit}
          onRemoveTarget={handleRemoveTarget}
          submitting={modalSubmitting}
        />
      )}
    </div>
  );
}
