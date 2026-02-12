// FILE: src/api/menuPermissions.js
import api from "./axios";

/**
 * Get all menu items with their group permissions.
 * Returns RAW ARRAY from backend — consumers transform as needed.
 *
 * Response format:
 * [
 *   { id: 1, menu_id: "dashboard", name: "Dashboard", group_ids: [1, 2], groups: [...] },
 *   { id: 2, menu_id: "reports",   name: "Reports",   group_ids: [1],    groups: [...] },
 * ]
 */
export const getMenuPermissions = async () => {
  const response = await api.get("/menu-permissions/");
  return Array.isArray(response.data) ? response.data : [];
};

export const getUserMenus = async (userId) => {
  const response = await api.get(`/menu-permissions/user/${userId}`);
  return response.data;
};

export const getMenuItemPermissions = async (menuId) => {
  const response = await api.get(`/menu-permissions/${menuId}`);
  return response.data;
};

export const createMenuItem = async (menuData, groupIds = []) => {
  const response = await api.post("/menu-permissions/", {
    ...menuData,
    group_ids: groupIds,
  });
  return response.data;
};

export const updateMenuItem = async (menuId, updateData) => {
  const response = await api.put(`/menu-permissions/${menuId}`, updateData);
  return response.data;
};

/**
 * Update group permissions for a specific menu item.
 * Uses /{menuId}/permissions endpoint — REPLACES all existing permissions.
 */
export const updateMenuPermissions = async (menuId, groupIds) => {
  const response = await api.put(`/menu-permissions/${menuId}/permissions`, {
    group_ids: groupIds,
  });
  return response.data;
};

export const deleteMenuItem = async (menuId) => {
  await api.delete(`/menu-permissions/${menuId}`);
  return { success: true };
};