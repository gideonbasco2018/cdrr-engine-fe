// FILE: src/api/dashboard.js
import API from "./axios";

/**
 * Get dashboard statistics for current month
 * Uses existing /api/analytics/received endpoint
 */
export const getDashboardStats = async () => {
  console.log('🔍 Fetching dashboard stats...');

  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1; // JavaScript months are 0-indexed

  try {
    // Call existing analytics endpoint for current month
    const response = await API.get("/analytics/received", {
      params: {
        year: year,
        month: month,
      },
    });

    console.log('✅ Dashboard Stats Response:', response.data);

    // Extract data from response
    const { fdac = 0, central = 0 } = response.data;
    const totalApplications = fdac + central;

    // Calculate percentage change (you can add last month comparison later)
    // For now, just return the current month data
    return {
      total_applications: totalApplications,
      fdac_applications: fdac,
      central_applications: central,
      total_revenue: 7000000, // Mock data for now
      fda_pay: 4500000,
      fda_boost: 1200000,
      fda_shield: 1300000,
      applications_change: 8.7, // Mock data for now
    };
  } catch (error) {
    console.error('❌ Error fetching dashboard stats:', error);
    throw error;
  }
};

/**
 * Get applications data with month/year comparison
 */
export const getApplicationsComparison = async () => {
  console.log('🔍 Fetching applications comparison...');

  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1;
  
  // Get last month
  const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1;
  const lastMonthYear = currentMonth === 1 ? currentYear - 1 : currentYear;

  try {
    // Fetch current month
    const currentMonthData = await API.get("/analytics/received", {
      params: {
        year: currentYear,
        month: currentMonth,
      },
    });

    // Fetch last month
    const lastMonthData = await API.get("/analytics/received", {
      params: {
        year: lastMonthYear,
        month: lastMonth,
      },
    });

    const currentTotal = (currentMonthData.data.fdac || 0) + (currentMonthData.data.central || 0);
    const lastTotal = (lastMonthData.data.fdac || 0) + (lastMonthData.data.central || 0);

    // Calculate percentage change
    let percentageChange = 0;
    if (lastTotal > 0) {
      percentageChange = ((currentTotal - lastTotal) / lastTotal) * 100;
    } else if (currentTotal > 0) {
      percentageChange = 100;
    }

    console.log('✅ Comparison:', {
      current: currentTotal,
      last: lastTotal,
      change: percentageChange.toFixed(1) + '%'
    });

    return {
      current_month: currentTotal,
      last_month: lastTotal,
      percentage_change: parseFloat(percentageChange.toFixed(1)),
      fdac_current: currentMonthData.data.fdac || 0,
      central_current: currentMonthData.data.central || 0,
    };
  } catch (error) {
    console.error('❌ Error fetching comparison:', error);
    throw error;
  }
};

export const getReceivedByPeriod = async (breakdown = "month", year = null) => {
  console.log('🔍 Fetching received by period...', { breakdown, year });

  try {
    const params = {
      breakdown,
    };

    if (year) {
      params.year = year;
    }

    const response = await API.get("/analytics/received-by-period", {
      params,
    });

    console.log('✅ Received by period:', response.data);

    return response.data;
  } catch (error) {
    console.error('❌ Error fetching received by period:', error);
    throw error;
  }
};