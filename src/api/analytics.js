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

export const getAnalyticsTrend = async (params = {}) => {
    const res = await API.get("/analytics/trend", { params });
    return res.data;
};

export const getAnalyticsByClassification = async (params = {}) => {
    const res = await API.get("/analytics/by-classification", { params });
    return res.data;
};

export const getAnalyticsYearSummary = async () => {
    const res = await API.get("/analytics/year-summary");
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