/**
 * FDA Filter Helper Utilities
 * Handles all filtering logic for the FDA Verification Portal
 */

/**
 * Check if a drug's expiry date has passed
 */
export const isExpired = (expiryDate) => {
  if (!expiryDate) return false;
  return new Date(expiryDate) < new Date();
};

/**
 * Normalize date to start of day (00:00:00.000)
 */
const normalizeToStartOfDay = (dateString) => {
  const date = new Date(dateString);
  date.setHours(0, 0, 0, 0);
  return date;
};

/**
 * Normalize date to end of day (23:59:59.999)
 */
const normalizeToEndOfDay = (dateString) => {
  const date = new Date(dateString);
  date.setHours(23, 59, 59, 999);
  return date;
};

/**
 * Extract just the date part (YYYY-MM-DD) from a datetime string
 */
const extractDatePart = (dateTimeString) => {
  if (!dateTimeString) return null;
  // Handle various date formats
  const date = new Date(dateTimeString);
  if (isNaN(date.getTime())) return null;
  
  // Return date in YYYY-MM-DD format
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

/**
 * Filter by uploaded by name
 */
export const filterByUploadedBy = (drug, uploadedBy) => {
  if (!uploadedBy) return true;
  return drug.uploaded_by
    ?.toLowerCase()
    .includes(uploadedBy.toLowerCase());
};

/**
 * Filter by date upload from (inclusive)
 * Fixed: Now properly compares dates without time
 */
export const filterByDateUploadFrom = (drug, dateUploadFrom) => {
  if (!dateUploadFrom) return true;
  if (!drug.date_uploaded) return false;

  // Extract just the date parts (YYYY-MM-DD) for comparison
  const uploadDatePart = extractDatePart(drug.date_uploaded);
  const filterDatePart = dateUploadFrom; // Already in YYYY-MM-DD format from input

  if (!uploadDatePart) return false;

  // Compare as strings (YYYY-MM-DD format allows direct string comparison)
  return uploadDatePart >= filterDatePart;
};

/**
 * Filter by date upload to (inclusive)
 * Fixed: Now properly compares dates without time
 */
export const filterByDateUploadTo = (drug, dateUploadTo) => {
  if (!dateUploadTo) return true;
  if (!drug.date_uploaded) return false;

  // Extract just the date parts (YYYY-MM-DD) for comparison
  const uploadDatePart = extractDatePart(drug.date_uploaded);
  const filterDatePart = dateUploadTo; // Already in YYYY-MM-DD format from input

  if (!uploadDatePart) return false;

  // Compare as strings (YYYY-MM-DD format allows direct string comparison)
  return uploadDatePart <= filterDatePart;
};

/**
 * Filter by active tab (all, expired, deleted)
 */
export const filterByTab = (drug, activeTab) => {
  if (activeTab === "deleted") {
    return drug.date_deleted;
  } else if (activeTab === "expired") {
    return !drug.date_deleted && isExpired(drug.expiry_date);
  } else {
    // "all" tab - show non-deleted items
    return !drug.date_deleted;
  }
};

/**
 * Apply all filters to the drugs data
 * This is the main filtering function
 */
export const applyFilters = (drugsData, filters, activeTab) => {
  let filtered = [...drugsData];

  // Filter by tab first
  filtered = filtered.filter((drug) => filterByTab(drug, activeTab));

  // Apply uploaded by filter
  if (filters.uploadedBy) {
    filtered = filtered.filter((drug) =>
      filterByUploadedBy(drug, filters.uploadedBy)
    );
  }

  // Apply date from filter
  if (filters.dateUploadFrom) {
    filtered = filtered.filter((drug) =>
      filterByDateUploadFrom(drug, filters.dateUploadFrom)
    );
  }

  // Apply date to filter
  if (filters.dateUploadTo) {
    filtered = filtered.filter((drug) =>
      filterByDateUploadTo(drug, filters.dateUploadTo)
    );
  }

  return filtered;
};

/**
 * Calculate statistics from filtered data
 */
export const calculateStats = (allData) => {
  const uniqueManufacturers = new Set(
    allData
      .map((item) => item.manufacturer)
      .filter((m) => m && m !== "N/A")
  ).size;

  const deletedCount = allData.filter((drug) => drug.date_deleted).length;
  
  const expiredCount = allData.filter(
    (drug) => !drug.date_deleted && isExpired(drug.expiry_date)
  ).length;
  
  const activeCount = allData.filter(
    (drug) => !drug.date_deleted && !isExpired(drug.expiry_date)
  ).length;

  return {
    uniqueManufacturers,
    deletedCount,
    expiredCount,
    activeCount,
  };
};