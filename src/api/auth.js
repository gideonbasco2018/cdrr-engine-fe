import api from './axios';

// ========================================
// AUTHENTICATION
// ========================================

export const login = async ({ username, password }) => {
  try {
    const params = new URLSearchParams();
    params.append('username', username);
    params.append('password', password);
    const response = await api.post('auth/login', params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    return response.data;
  } catch (err) {
    console.error('Login error:', err);
    throw err;
  }
};

export const register = async (userData) => {
  try {
    const response = await api.post('auth/register', userData);
    return response.data;
  } catch (err) {
    console.error('Registration error:', err);
    throw err;
  }
};

export const getCurrentUser = async () => {
  try {
    const response = await api.get('auth/me');
    return response.data;
  } catch (err) {
    console.error('Get user error:', err);
    throw err;
  }
};

export const updateCurrentUser = async (userData) => {
  try {
    const response = await api.put('auth/me', userData);
    return response.data;
  } catch (err) {
    console.error('Update user error:', err);
    throw err;
  }
};

export const logout = async () => {
  try {
    await api.post('auth/logout');
  } catch (err) {
    console.error('Logout error:', err);
  } finally {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userGroup');
    sessionStorage.removeItem('access_token');
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('userRole');
    sessionStorage.removeItem('userGroup');
    console.log('✅ All auth data cleared from storage');
  }
};


// ========================================
// USER MANAGEMENT
// ========================================

export const getMyGroupUsers = async () => {
  try {
    const response = await api.get('auth/users/my-group');
    return response.data;
  } catch (err) {
    console.error('Get group users error:', err);
    throw err;
  }
};

export const getUsersByGroup = async (groupId) => {
  try {
    if (!groupId) throw new Error('Group ID is required');
    const response = await api.get(`auth/users/group/${groupId}`);
    return response.data;
  } catch (err) {
    console.error('Get users by group error:', err);
    throw err;
  }
};


// ========================================
// ADMIN: USER APPROVAL FUNCTIONS
// ========================================

/**
 * Get all pending users (inactive users awaiting approval)
 * ✅ NOW accepts { limit, offset } params for pagination
 */
export const getPendingUsers = async (params = {}) => {
  try {
    const response = await api.get('auth/admin/users/pending', { params });
    return response.data;
  } catch (err) {
    console.error('Get pending users error:', err);
    throw err;
  }
};

export const activateUser = async (userId) => {
  try {
    const response = await api.post(`auth/admin/users/${userId}/activate`);
    return response.data;
  } catch (err) {
    console.error('Activate user error:', err);
    throw err;
  }
};

export const deactivateUser = async (userId) => {
  try {
    const response = await api.post(`auth/admin/users/${userId}/deactivate`);
    return response.data;
  } catch (err) {
    console.error('Deactivate user error:', err);
    throw err;
  }
};

export const resetPassword = async (userId, newPassword) => {
  const response = await api.post(`auth/admin/users/${userId}/reset-password`, {
    new_password: newPassword,
  });
  return response.data;
};

/**
 * Get all users (active and inactive)
 * ✅ NOW accepts { limit, offset } params for pagination
 */
export const getAllUsers = async (params = {}) => {
  try {
    const response = await api.get('auth/admin/users', { params });
    return response.data;
  } catch (err) {
    console.error('Get all users error:', err);
    throw err;
  }
};


// ========================================
// STORAGE HELPERS
// ========================================

export const getToken = () =>
  localStorage.getItem('access_token') || sessionStorage.getItem('access_token');

export const isLoggedIn = () => !!getToken();

export const getUser = () => {
  const userStr = localStorage.getItem('user') || sessionStorage.getItem('user');
  return userStr ? JSON.parse(userStr) : null;
};

export const getUserRole = () => {
  const userStr = localStorage.getItem('user') || sessionStorage.getItem('user');
  if (userStr) {
    const user = JSON.parse(userStr);
    return user.role;
  }
  return localStorage.getItem('userRole') || sessionStorage.getItem('userRole');
};

export const getUserGroup = () => {
  const userStr = localStorage.getItem('user') || sessionStorage.getItem('user');
  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      if (user.groups && user.groups.length > 0) return user.groups[0].id;
      return user.group_id || null;
    } catch (e) {
      console.error('Failed to parse user:', e);
    }
  }
  return localStorage.getItem('userGroup') || sessionStorage.getItem('userGroup');
};

export const getUserGroups = () => {
  const userStr = localStorage.getItem('user') || sessionStorage.getItem('user');
  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      return user.groups || [];
    } catch (e) {
      console.error('Failed to parse user:', e);
    }
  }
  return [];
};

export const getUserGroupName = () => {
  const userStr = localStorage.getItem('user') || sessionStorage.getItem('user');
  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      if (user.groups && user.groups.length > 0) return user.groups[0].name;
    } catch (e) {
      console.error('Failed to parse user:', e);
    }
  }
  return null;
};


// ========================================
// PERMISSION HELPERS
// ========================================

export const hasRole = (allowedRoles) => {
  const userRole = getUserRole();
  return allowedRoles.includes(userRole);
};

export const isUser = () => hasRole(['User', 'Admin', 'SuperAdmin']);
export const isAdmin = () => hasRole(['Admin', 'SuperAdmin']);
export const isSuperAdmin = () => hasRole(['SuperAdmin']);

export const isInGroup = (groupIdOrName) => {
  const userStr = localStorage.getItem('user') || sessionStorage.getItem('user');
  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      if (user.groups && Array.isArray(user.groups)) {
        return user.groups.some(
          (g) =>
            g.id === groupIdOrName ||
            g.id === Number(groupIdOrName) ||
            g.name === groupIdOrName,
        );
      }
      const userGroup = user.group_id;
      return userGroup === groupIdOrName || userGroup === String(groupIdOrName);
    } catch (e) {
      console.error('Failed to parse user:', e);
    }
  }
  return false;
};


// ========================================
// GROUP MANAGEMENT
// ========================================

export const getAllGroups = async () => {
  try {
    const response = await api.get('groups');
    return response.data;
  } catch (err) {
    console.error('Get all groups error:', err);
    throw err;
  }
};

export const getGroupById = async (groupId) => {
  try {
    const response = await api.get(`groups/${groupId}`);
    return response.data;
  } catch (err) {
    console.error('Get group error:', err);
    throw err;
  }
};

export const createGroup = async (groupData) => {
  try {
    const response = await api.post('groups', groupData);
    return response.data;
  } catch (err) {
    console.error('Create group error:', err);
    throw err;
  }
};

export const updateGroup = async (groupId, groupData) => {
  try {
    const response = await api.put(`groups/${groupId}`, groupData);
    return response.data;
  } catch (err) {
    console.error('Update group error:', err);
    throw err;
  }
};

export const deleteGroup = async (groupId) => {
  try {
    const response = await api.delete(`groups/${groupId}`);
    return response.data;
  } catch (err) {
    console.error('Delete group error:', err);
    throw err;
  }
};


// ========================================
// GROUP <-> USER ASSIGNMENT
// ========================================

export const getGroupUsers = async (groupId) => {
  try {
    const response = await api.get(`groups/${groupId}/users`);
    return response.data;
  } catch (err) {
    console.error('Get group users error:', err);
    throw err;
  }
};

export const assignUserToGroup = async (groupId, userId) => {
  try {
    const response = await api.post(`groups/${groupId}/users`, { user_id: userId });
    return response.data;
  } catch (err) {
    console.error('Assign user to group error:', err);
    throw err;
  }
};

export const removeUserFromGroup = async (groupId, userId) => {
  try {
    const response = await api.delete(`groups/${groupId}/users/${userId}`);
    return response.data;
  } catch (err) {
    console.error('Remove user from group error:', err);
    throw err;
  }
};

export const updateUser = async (userId, updates) => {
  const response = await api.patch(`/auth/admin/users/${userId}`, updates);
  return response.data;
};