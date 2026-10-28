// src/api/analytics.js

import API from "./axios";

export const getAnalyticsAvailableYears = async () => {
    const res = await API.get("/analytics/available-years");
    return res.data;
};

export const getAnalyticsSummary = async (params = {}) => {
    const res = await API.get("/analytics/summary", { params });
    return res.data;
};

export const getAnalyticsSummaryRecords = async (params = {}) => {
    const res = await API.get("/analytics/summary/records", { params });
    return res.data;
};

export const getAnalyticsTrend = async (params = {}) => {
    const res = await API.get("/analytics/trend", { params });
    return res.data;
};

export const getAnalyticsByClassification = async (params = {}) => {
    const res = await API.get("/analytics/by-classification", { params });
    return res.data;
};

export const getAnalyticsYearSummary = async (params = {}) => {
    const res = await API.get("/analytics/year-summary", { params });
    return res.data;
};

export const getAnalyticsYearRecords = async (params = {}) => {
    const res = await API.get("/analytics/year-summary/records", { params });
    return res.data;
};

export const getAnalyticsTopDrugs = async (params = {}) => {
    const res = await API.get("/analytics/top-drugs", { params });
    return res.data;
};

export const getAnalyticsTopCountries = async (params = {}) => {
    const res = await API.get("/analytics/top-countries", { params });
    return res.data;
};

export const getAnalyticsFRPTATTrend = async (params = {}) => {
    const res = await API.get("/analytics/frp-tat-trend", { params });
    return res.data;
};

export const getCountryYearTrend = async (country, entityType = "mfr", prescription = "All") => {
    const res = await API.get("/analytics/country-year-trend", {
        params: { country, entity_type: entityType, prescription },
    });
    return res.data;
};

export const getDocTypeReleased = async (params = {}) => {
    const res = await API.get("/doc-type-released/", { params });
    return res.data;
};


export const getAnalyticsDataQuality = async () => {
    const res = await API.get("/analytics/data-quality");
    return res.data;
};

export const getAnalyticsQualityRecords = async (params = {}) => {
    const res = await API.get("/analytics/data-quality/records", { params });
    return res.data;
};

export const getAnalyticsTopCompanies = async (params = {}) => {
    const res = await API.get("/analytics/top-companies", { params });
    return res.data;
};

export const getAnalyticsCompanyRecords = async (params = {}) => {
    const res = await API.get("/analytics/top-companies/records", { params });
    return res.data;
};

export const getAnalyticsFastestApplications = async (params = {}) => {
    const res = await API.get("/analytics/fastest/applications", { params });
    return res.data;
};

export const getAnalyticsFastestCompanies = async (params = {}) => {
    const res = await API.get("/analytics/fastest/companies", { params });
    return res.data;
};

export const getAnalyticsFastestRecords = async (params = {}) => {
    const res = await API.get("/analytics/fastest/records", { params });
    return res.data;
};


export const searchCompanyNames = async (q, limit = 15) => {
    const res = await API.get("/analytics/company-monitoring/search", {
        params: { q, limit },
    });
    return res.data;
};
 
// FastAPI expects repeated keys (company=a&company=b), not company[]=a
const repeatKeys = (params) => {
    const sp = new URLSearchParams();
    Object.entries(params || {}).forEach(([k, v]) => {
        if (v == null) return;
        if (Array.isArray(v)) v.forEach((i) => sp.append(k, i));
        else sp.append(k, v);
    });
    return sp.toString();
};

export const getCompanyMonitoring = async (params = {}) => {
    const res = await API.get("/analytics/company-monitoring", {
        params,
        paramsSerializer: repeatKeys,
    });
    return res.data;
};

export const getCompanyMonitoringRecords = async (params = {}) => {
    const res = await API.get("/analytics/company-monitoring/records", {
        params,
        paramsSerializer: repeatKeys,
    });
    return res.data;
};

export const getCompanyReleasedDocs = async (params = {}) => {
    const res = await API.get("/analytics/company-monitoring/released-docs", {
        params,
        paramsSerializer: repeatKeys,
    });
    return res.data;
};

export const getCompanyReleasedDocRecords = async (params = {}) => {
    const res = await API.get("/analytics/company-monitoring/released-docs/records", {
        params,
        paramsSerializer: repeatKeys,
    });
    return res.data;
};