// FILE: src/pages/DashboardPage.jsx
import { useState, useEffect } from "react";
import {
  getDashboardStats,
  getApplicationsComparison,
  getReceivedByPeriod,
} from "../api/dashboard";
import DashboardHeader from "../components/dashboard/DashboardHeader";
import StatsCard from "../components/dashboard/StatsCard";
import ReceivedApplicationsChart from "../components/dashboard/ReceivedApplicationsChart";
import ServicesRevenuePie from "../components/dashboard/ServicesRevenuePie";
import TopEarnersCard from "../components/dashboard/TopEarnersCard";

function DashboardPage({ darkMode, userRole = "User" }) {
  const [stats, setStats] = useState({
    totalApplications: 0,
    fdacApplications: 0,
    centralApplications: 0,
    totalRevenue: 0,
    fdaPay: 0,
    fdaBoost: 0,
    fdaShield: 0,
    applicationsChange: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [chartLoading, setChartLoading] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [chartBreakdown, setChartBreakdown] = useState("month");

  useEffect(() => {
    fetchDashboardData();
    fetchChartData();
  }, []);

  useEffect(() => {
    if (!loading) {
      fetchChartData();
    }
  }, [selectedYear, chartBreakdown]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [statsData, comparisonData] = await Promise.all([
        getDashboardStats(),
        getApplicationsComparison(),
      ]);
      setStats({
        totalApplications: statsData.total_applications || 0,
        fdacApplications: statsData.fdac_applications || 0,
        centralApplications: statsData.central_applications || 0,
        totalRevenue: statsData.total_revenue || 0,
        fdaPay: statsData.fda_pay || 0,
        fdaBoost: statsData.fda_boost || 0,
        fdaShield: statsData.fda_shield || 0,
        applicationsChange: comparisonData.percentage_change || 0,
      });
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          err.message ||
          "Failed to load dashboard data",
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchChartData = async () => {
    try {
      setChartLoading(true);
      const data = await getReceivedByPeriod(
        chartBreakdown,
        chartBreakdown === "month" ? selectedYear : null,
      );
      setChartData(data.data || []);
    } catch (err) {
      console.error("❌ Error fetching chart data:", err);
    } finally {
      setChartLoading(false);
    }
  };

  const colors = darkMode
    ? {
        pageBg: "#0a0a0a",
        cardBg: "#0f0f0f",
        cardBorder: "#1a1a1a",
        cardBorderHover: "#2a2a2a",
        textPrimary: "#fff",
        textSecondary: "#999",
        textTertiary: "#666",
        inputBg: "#1a1a1a",
        inputBorder: "#2a2a2a",
        chartBorderDashed: "#1a1a1a",
        pieCenterBg: "#0f0f0f",
      }
    : {
        pageBg: "#f8f8f8",
        cardBg: "#ffffff",
        cardBorder: "#e5e5e5",
        cardBorderHover: "#d0d0d0",
        textPrimary: "#000",
        textSecondary: "#666",
        textTertiary: "#999",
        inputBg: "#ffffff",
        inputBorder: "#e5e5e5",
        chartBorderDashed: "#e5e5e5",
        pieCenterBg: "#ffffff",
      };

  const topEarners = [
    { name: "Emma Lopez", amount: "$62,850.00", percentage: "28.5%", rank: 1 },
    {
      name: "Sarah Johnson",
      amount: "$58,420.00",
      percentage: "26.5%",
      rank: 2,
    },
    {
      name: "Michael Chen",
      amount: "$54,320.00",
      percentage: "24.7%",
      rank: 3,
    },
  ];

  const getStatsForRole = () => {
    const baseStats = [
      {
        icon: "📥", // Inbox/Received
        label: "Total Applications Received",
        value: loading ? "..." : stats.totalApplications.toLocaleString(),
        change: loading
          ? "..."
          : `${stats.applicationsChange > 0 ? "+" : ""}${stats.applicationsChange}%`,
        color: "#3b82f6",
        isPositive: stats.applicationsChange >= 0,
      },
      {
        icon: "📤", // Outbox/Released
        label: "Total Application Released",
        value: loading ? "..." : `${(stats.totalRevenue / 1000000).toFixed(1)}`,
        change: "8.7%",
        color: "#10b981",
        isPositive: true,
      },
      {
        icon: "⏳", // Hourglass/Pending
        label: "Total Application Backlogs",
        value: loading ? "..." : `${(stats.fdaPay / 1000000).toFixed(1)}`,
        change: "8.7%",
        color: "#ef4444", // Red for backlogs
        isPositive: true,
      },
      {
        icon: "⚙️", // Gear/Processing
        label: "Total Application On Process",
        value: loading ? "..." : `${(stats.fdaBoost / 1000000).toFixed(1)}`,
        change: "8.7%",
        color: "#f59e0b", // Orange for in-progress
        isPositive: true,
      },
      {
        icon: "✅", // Check/Completed
        label: "Total Application Completed but not yet released",
        value: loading ? "..." : `${(stats.fdaShield / 1000000).toFixed(1)}`,
        change: "8.7%",
        color: "#8b5cf6",
        isPositive: true,
      },
    ];
    return userRole === "User" ? baseStats.slice(1) : baseStats;
  };

  if (error) {
    return (
      <div
        style={{
          flex: 1,
          padding: "2rem",
          background: colors.pageBg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            background: colors.cardBg,
            border: `1px solid ${colors.cardBorder}`,
            borderRadius: "12px",
            padding: "2rem",
            textAlign: "center",
            maxWidth: "400px",
          }}
        >
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>⚠️</div>
          <h3
            style={{
              fontSize: "1.25rem",
              fontWeight: "600",
              color: colors.textPrimary,
              marginBottom: "0.5rem",
            }}
          >
            Failed to Load Dashboard
          </h3>
          <p
            style={{
              color: colors.textTertiary,
              fontSize: "0.9rem",
              marginBottom: "1rem",
            }}
          >
            {error}
          </p>
          <button
            onClick={fetchDashboardData}
            style={{
              padding: "0.75rem 1.5rem",
              background: "#4CAF50",
              border: "none",
              borderRadius: "8px",
              color: "#fff",
              fontSize: "0.9rem",
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            🔄 Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        flex: 1,
        padding: "2rem",
        overflowY: "auto",
        background: colors.pageBg,
        transition: "all 0.3s ease",
      }}
    >
      <DashboardHeader
        userRole={userRole}
        loading={loading}
        onRefresh={fetchDashboardData}
        colors={colors}
      />

      {/* Stats Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "1.25rem",
          marginBottom: "2rem",
        }}
      >
        {getStatsForRole().map((stat, index) => (
          <StatsCard
            key={index}
            stat={stat}
            loading={loading}
            colors={colors}
          />
        ))}
      </div>

      {/* Charts - Only for Admin and SuperAdmin */}
      {(userRole === "Admin" || userRole === "SuperAdmin") && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr",
            gap: "1.25rem",
            marginBottom: "2rem",
          }}
        >
          <ReceivedApplicationsChart
            chartData={chartData}
            chartLoading={chartLoading}
            chartBreakdown={chartBreakdown}
            selectedYear={selectedYear}
            onBreakdownChange={setChartBreakdown}
            onYearChange={setSelectedYear}
            colors={colors}
          />
          <ServicesRevenuePie colors={colors} />
        </div>
      )}

      {/* Top Earners */}
      {(userRole === "Admin" || userRole === "SuperAdmin") && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "1.25rem",
          }}
        >
          <TopEarnersCard
            title="CDRR Top Evaluators"
            icon="⭐"
            description="Most evaluated applications this month"
            earners={topEarners}
            color="#10b981"
            colors={colors}
          />
          <TopEarnersCard
            title="CDRR Top Checkers"
            icon="✅"
            description="Most verified applications this month"
            earners={topEarners}
            color="#3b82f6"
            colors={colors}
          />
        </div>
      )}

      {/* User Dashboard Message */}
      {userRole === "User" && (
        <div
          style={{
            background: colors.cardBg,
            border: `1px solid ${colors.cardBorder}`,
            borderRadius: "12px",
            padding: "3rem",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📊</div>
          <h3
            style={{
              fontSize: "1.25rem",
              fontWeight: "600",
              color: colors.textPrimary,
              marginBottom: "0.5rem",
            }}
          >
            Welcome to Your Dashboard
          </h3>
          <p style={{ color: colors.textTertiary, fontSize: "0.9rem" }}>
            Upload and manage your reports from the menu
          </p>
        </div>
      )}
    </div>
  );
}

export default DashboardPage;
