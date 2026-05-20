// src/api/spellCheckApi.js

import API from "./axios";

/**
 * Run spell check on the provided fields
 *
 * @param {Object} fields - key-value pairs of fieldKey: fieldValue
 * @param {string} fields.prodBrName        - Brand Name
 * @param {string} fields.prodGenName       - Generic Name
 * @param {string} fields.prodDosStr        - Dosage Strength
 * @param {string} fields.prodDosForm       - Dosage Form
 * @param {string} fields.prodManu          - Manufacturer
 * @param {string} fields.prodTrader        - Trader
 * @param {string} fields.prodImporter      - Importer
 * @param {string} fields.prodDistri        - Distributor
 * @param {string} fields.prodRepacker      - Repacker
 * // ... other checkable fields
 *
 * @returns {Promise<Array<{
 *   fieldKey: string,
 *   label: string,
 *   original: string,
 *   corrected: string,
 *   words: Array<{ original: string, corrected: string, hasError: boolean }>,
 *   note: string
 * }>>}
 */
export const runSpellCheck = async (fields = {}) => {
  try {
    const response = await API.post("/api/spellcheck", { fields });
    const data = response.data;
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("Error running spell check:", error);
    const errorMessage =
      error.response?.data?.detail || error.message || "Failed to run spell check";
    throw new Error(errorMessage);
  }
};