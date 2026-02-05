// FILE: src/api/menuPermissions.js
import api from "./axios";

/**
 * Get all menu items with their group permissions
 */
export const getMenuPermissions = async () => {
  try {
    const response = await api.get("/menu-permissions/");
    return response.data;
  } catch (error) {
    console.error("Failed to fetch menu permissions:", error);
    throw error;
  }
};

/**
 * Get menu items accessible by a specific user
 * @param {number} userId - The user ID
 */
export const getUserMenus = async (userId) => {
  try {
    const response = await api.get(`/menu-permissions/user/${userId}`);
    return response.data;
  } catch (error) {
    console.error("Failed to fetch user menus:", error);
    throw error;
  }
};

/**
 * Get permissions for a specific menu item
 * @param {string} menuId - The menu item ID (e.g., "dashboard", "for-decking")
 */
export const getMenuItemPermissions = async (menuId) => {
  try {
    const response = await api.get(`/menu-permissions/${menuId}`);
    return response.data;
  } catch (error) {
    console.error("Failed to fetch menu item permissions:", error);
    throw error;
  }
};

/**
 * Create a new menu item with permissions
 * @param {object} menuData - Menu item data
 * @param {number[]} groupIds - Array of group IDs
 */
export const createMenuItem = async (menuData, groupIds = []) => {
  try {
    const response = await api.post("/menu-permissions/", {
      ...menuData,
      group_ids: groupIds,
    });
    return response.data;
  } catch (error) {
    console.error("Failed to create menu item:", error);
    throw error;
  }
};

/**
 * Update menu item details (NOT permissions)
 * @param {string} menuId - The menu item ID
 * @param {object} updateData - Fields to update (name, path, icon, order, parent_id)
 */
export const updateMenuItem = async (menuId, updateData) => {
  try {
    const response = await api.put(`/menu-permissions/${menuId}`, updateData);
    return response.data;
  } catch (error) {
    console.error("Failed to update menu item:", error);
    throw error;
  }
};

/**
 * Update group permissions for a specific menu item
 * ⚠️ IMPORTANT: Use /permissions endpoint for updating permissions!
 * @param {string} menuId - The menu item ID (e.g., "dashboard", "for-decking")
 * @param {number[]} groupIds - Array of group IDs that can access this menu
 */
export const updateMenuPermissions = async (menuId, groupIds) => {
  try {
    const response = await api.put(`/menu-permissions/${menuId}/permissions`, {
      group_ids: groupIds,
    });
    return response.data;
  } catch (error) {
    console.error("Failed to update menu permissions:", error);
    throw error;
  }
};

/**
 * Delete a menu item
 * @param {string} menuId - The menu item ID to delete
 */
export const deleteMenuItem = async (menuId) => {
  try {
    await api.delete(`/menu-permissions/${menuId}`);
    return { success: true };
  } catch (error) {
    console.error("Failed to delete menu item:", error);
    throw error;
  }
};