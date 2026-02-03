// filterHelpers.js - Client-side filtering utilities

/**
 * Calculate timeline status for a single row
 * Returns: "WITHIN", "BEYOND", or null
 */
export const calculateTimelineStatus = (row) => {
  const { dateReceivedCent, dateReleased, dbTimelineCitizenCharter } = row;

  // If no dateReceivedCent or no timeline value, return null
  if (
    !dateReceivedCent ||
    !dbTimelineCitizenCharter ||
    dateReceivedCent === "N/A" ||
    dbTimelineCitizenCharter === null
  ) {
    return null;
  }

  const receivedDate = new Date(dateReceivedCent);
  const endDate =
    dateReleased && dateReleased !== "N/A"
      ? new Date(dateReleased)
      : new Date();

  // Validate dates
  if (isNaN(receivedDate.getTime()) || isNaN(endDate.getTime())) {
    return null;
  }

  // Calculate the difference in days
  const diffTime = Math.abs(endDate - receivedDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  // Compare with timeline
  const timelineValue = parseInt(dbTimelineCitizenCharter, 10);

  return diffDays <= timelineValue ? "WITHIN" : "BEYOND";
};

/**
 * Apply client-side filters to data array
 */
export const applyClientSideFilters = (data, filters) => {
  if (!data || data.length === 0) return data;

  let filteredData = [...data];

  // Filter by App Status
  if (filters.appStatus && filters.appStatus !== "all") {
    filteredData = filteredData.filter((row) => {
      const status = row.appStatus?.toUpperCase();
      const filterStatus = filters.appStatus.toUpperCase();
      return status === filterStatus;
    });
  }

  // Filter by Status Timeline
  if (filters.statusTimeline && filters.statusTimeline !== "all") {
    filteredData = filteredData.filter((row) => {
      const timelineStatus = calculateTimelineStatus(row);
      return timelineStatus === filters.statusTimeline;
    });
  }

  // Filter by Dosage Form
  if (filters.prodDosForm && filters.prodDosForm !== "all") {
    filteredData = filteredData.filter(
      (row) => row.prodDosForm === filters.prodDosForm,
    );
  }

  // Filter by Prescription Type
  if (filters.prodClassPrescript && filters.prodClassPrescript !== "all") {
    filteredData = filteredData.filter(
      (row) => row.prodClassPrescript === filters.prodClassPrescript,
    );
  }

  // Filter by Essential Drug
  if (filters.prodEssDrugList && filters.prodEssDrugList !== "all") {
    filteredData = filteredData.filter(
      (row) => row.prodEssDrugList === filters.prodEssDrugList,
    );
  }

  // Filter by App Type
  if (filters.appType && filters.appType !== "all") {
    filteredData = filteredData.filter(
      (row) => row.appType === filters.appType,
    );
  }

  // Filter by Product Category
  if (filters.prodCat && filters.prodCat !== "all") {
    filteredData = filteredData.filter(
      (row) => row.prodCat === filters.prodCat,
    );
  }

  // Filter by Manufacturer Country
  if (filters.prodManuCountry && filters.prodManuCountry.trim() !== "") {
    const searchCountry = filters.prodManuCountry.toLowerCase();
    filteredData = filteredData.filter((row) =>
      row.prodManuCountry?.toLowerCase().includes(searchCountry),
    );
  }

  // Filter by Evaluator
  if (filters.eval && filters.eval.trim() !== "") {
    const searchEval = filters.eval.toLowerCase();
    filteredData = filteredData.filter((row) =>
      row.eval?.toLowerCase().includes(searchEval),
    );
  }

  // Filter by Uploader
  if (filters.userUploader && filters.userUploader.trim() !== "") {
    const searchUploader = filters.userUploader.toLowerCase();
    filteredData = filteredData.filter((row) =>
      row.userUploader?.toLowerCase().includes(searchUploader),
    );
  }

  // Filter by Date Range
  if (filters.dateFrom || filters.dateTo) {
    filteredData = filteredData.filter((row) => {
      if (!row.dateReceivedCent || row.dateReceivedCent === "N/A") return false;

      const recordDate = new Date(row.dateReceivedCent);
      if (isNaN(recordDate.getTime())) return false;

      if (filters.dateFrom) {
        const fromDate = new Date(filters.dateFrom);
        if (recordDate < fromDate) return false;
      }

      if (filters.dateTo) {
        const toDate = new Date(filters.dateTo);
        toDate.setHours(23, 59, 59, 999); // Include entire day
        if (recordDate > toDate) return false;
      }

      return true;
    });
  }

  return filteredData;
};
