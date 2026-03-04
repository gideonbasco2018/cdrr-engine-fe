// src/api/notifications.js

import API from "./axios";

/**
 * Get all notifications for a user (newest first)
 * GET /api/notifications/{username}
 *
 * @param {string} username
 * @param {boolean} unreadOnly - if true, returns only unread
 */
export const getNotifications = async (username, unreadOnly = false) => {
  try {
    const response = await API.get(`/notifications/${username}`, {
      params: { unread_only: unreadOnly },
    });
    return response.data;
  } catch (error) {
    const msg = error.response?.data?.detail || error.message || "Failed to fetch notifications";
    throw new Error(msg);
  }
};

/**
 * Get unread count only (lightweight — for bell badge polling)
 * GET /api/notifications/{username}/unread-count
 *
 * @param {string} username
 * @returns {Promise<{count: number}>}
 */
export const getUnreadCount = async (username) => {
  try {
    const response = await API.get(`/notifications/${username}/unread-count`);
    return response.data; // { count: N }
  } catch (error) {
    const msg = error.response?.data?.detail || error.message || "Failed to fetch unread count";
    throw new Error(msg);
  }
};

/**
 * Mark a single notification as read (user clicks it)
 * PATCH /api/notifications/{id}/read
 *
 * @param {number} notificationId
 */
export const markNotificationAsRead = async (notificationId) => {
  try {
    const response = await API.patch(`/notifications/${notificationId}/read`);
    return response.data;
  } catch (error) {
    const msg = error.response?.data?.detail || error.message || "Failed to mark as read";
    throw new Error(msg);
  }
};

/**
 * Mark ALL unread notifications as read for a user
 * PATCH /api/notifications/{username}/read-all
 *
 * @param {string} username
 */
export const markAllNotificationsAsRead = async (username) => {
  try {
    const response = await API.patch(`/notifications/${username}/read-all`);
    return response.data;
  } catch (error) {
    const msg = error.response?.data?.detail || error.message || "Failed to mark all as read";
    throw new Error(msg);
  }
};

/**
 * Delete all already-read notifications for a user (housekeeping)
 * DELETE /api/notifications/{username}/clear-read
 *
 * @param {string} username
 */
export const clearReadNotifications = async (username) => {
  try {
    const response = await API.delete(`/notifications/${username}/clear-read`);
    return response.data;
  } catch (error) {
    const msg = error.response?.data?.detail || error.message || "Failed to clear notifications";
    throw new Error(msg);
  }
};