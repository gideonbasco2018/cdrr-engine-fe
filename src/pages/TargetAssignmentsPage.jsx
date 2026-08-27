import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  getMyTeam,
  getMemberTasks,
  getMemberTargetedTasks,
  markAsTarget,
  bulkMarkAsTarget,
  unmarkAsTarget,
} from "../api/targetAssignments";
import { getCurrentUser } from "../api/auth";
import { useColors } from "../components/targetAssignments/useColors";
import {
  ListView,
  ALL_MEMBERS_ID,
} from "../components/targetAssignments/ListView";
import { TeamDiagramView } from "../components/targetAssignments/TeamDiagramView";
import { TargetTableView } from "../components/targetAssignments/TargetTableView";
import { TargetMonitoringView } from "../components/targetAssignments/TargetMonitoringView";
import { DirectorsTargetView } from "../components/targetAssignments/DirectorsTargetView";
import { TargetModal } from "../components/targetAssignments/TargetModal";
import { DirectorsTeamDiagramView } from "../components/targetAssignments/DirectorsTeamDiagramView";
import { DirectorsMonitoringView } from "../components/targetAssignments/DirectorsMonitoringView";
// ── Groups allowed to see the CDRR Target tabs ──────────────────────
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

  // ── Team Diagram ONLY — lightweight, targeted-tasks-only fetch.
  //    Kept separate from diagramData/loadDiagramData above (which
  //    TargetTableView still uses) since the diagram only ever renders
  //    targeted cards and gets its Total/Completed/In Progress stats
  //    from `team`'s own count fields, not from a full task list. ──
  const [targetedData, setTargetedData] = useState({});
  const [targetedLoading, setTargetedLoading] = useState(false);

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

  // ── Lightweight loader for the Team Diagram — targeted tasks only,
  //    per member, in parallel. Much smaller payload than
  //    loadDiagramData above since it skips every non-targeted task. ──
  const loadTargetedData = useCallback(async (members) => {
    if (!members || members.length === 0) {
      setTargetedData({});
      return;
    }
    setTargetedLoading(true);
    try {
      const results = await Promise.all(
        members.map((m) =>
          getMemberTargetedTasks(m.member_user_id).catch(() => []),
        ),
      );
      const map = {};
      members.forEach((m, i) => {
        map[m.member_user_id] = results[i] || [];
      });
      setTargetedData(map);
    } finally {
      setTargetedLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTeam();
  }, [loadTeam]);

  useEffect(() => {
    if (selectedMemberId === ALL_MEMBERS_ID) {
      setTasks([]);
      return;
    }
    loadTasks(selectedMemberId);
  }, [selectedMemberId, loadTasks]);

  // ── Full task-history loader (loadDiagramData) — ONLY for Table view
  //    and the List view's "All Members" combined table. The Diagram
  //    view uses loadTargetedData instead (lightweight, targeted-only),
  //    triggered separately below — it should NOT also trigger this
  //    heavier loader. ──
  useEffect(() => {
    const needsDiagramData =
      activeView === "table" ||
      activeView === "monitoring" ||
      (activeView === "list" && selectedMemberId === ALL_MEMBERS_ID);
    if (needsDiagramData && team.length > 0) {
      loadDiagramData(team);
    }
  }, [activeView, selectedMemberId, team, loadDiagramData]);

  // ── Lightweight targeted-only loader — Diagram view only. ──
  useEffect(() => {
    if (activeView === "diagram" && team.length > 0) {
      loadTargetedData(team);
    }
  }, [activeView, team, loadTargetedData]);

  const allTeamTasks = useMemo(() => {
    const combined = [];
    team.forEach((m) => {
      const memberTasks = diagramData[m.member_user_id] || [];
      memberTasks.forEach((t) => {
        combined.push({
          ...t,
          member_user_id: m.member_user_id,
          member_name: m.member_name,
        });
      });
    });
    return combined;
  }, [team, diagramData]);

  const refreshAfterChange = async () => {
    const tasksRefresh =
      selectedMemberId === ALL_MEMBERS_ID
        ? loadDiagramData(team)
        : loadTasks(selectedMemberId);
    await Promise.all([tasksRefresh, loadTeam()]);
  };

  // ── Bulk-remove-target — unmarks several tasks' Target flag at once.
  //    Reuses the existing single-task unmarkAsTarget endpoint, fired
  //    in parallel per log_id (no dedicated bulk-unmark endpoint exists
  //    yet). Throws if any individual unmark fails, which the caller
  //    (ListView's confirm modal) surfaces as an error. ───────────────
  const handleBulkRemoveTarget = async (logIds) => {
    await Promise.all(logIds.map((id) => unmarkAsTarget(id)));
    await refreshAfterChange();
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
    { key: "monitoring", label: "📈 Target Monitoring" },
    ...(canSeeDirectorsTarget
      ? [
          { key: "directors", label: "🏛️ CDRR Task Assignment" },
          { key: "directorsDiagram", label: "🏛️🗺️ CDRR Team Assignment" },
          { key: "directorsMonitoring", label: "📈 CDRR Monitoring" },
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
          tasks={selectedMemberId === ALL_MEMBERS_ID ? allTeamTasks : tasks}
          tasksLoading={
            selectedMemberId === ALL_MEMBERS_ID ? diagramLoading : tasksLoading
          }
          tasksError={tasksError}
          onOpenTargetModal={openTargetModal}
          onOpenBulkModal={openBulkModal}
          onBulkRemoveTarget={handleBulkRemoveTarget}
        />
      ) : activeView === "diagram" ? (
        <TeamDiagramView
          colors={colors}
          darkMode={darkMode}
          team={team}
          diagramData={targetedData}
          diagramLoading={targetedLoading}
        />
      ) : activeView === "table" ? (
        <TargetTableView
          colors={colors}
          team={team}
          diagramData={diagramData}
          diagramLoading={diagramLoading}
        />
      ) : activeView === "monitoring" ? (
        <TargetMonitoringView
          colors={colors}
          team={team}
          diagramData={diagramData}
          diagramLoading={diagramLoading}
        />
      ) : activeView === "directors" && canSeeDirectorsTarget ? (
        <DirectorsTargetView colors={colors} />
      ) : activeView === "directorsDiagram" && canSeeDirectorsTarget ? (
        <DirectorsTeamDiagramView colors={colors} darkMode={darkMode} />
      ) : activeView === "directorsMonitoring" && canSeeDirectorsTarget ? (
        <DirectorsMonitoringView colors={colors} />
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
