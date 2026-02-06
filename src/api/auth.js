import api from './axios';

// ========================================
// AUTHENTICATION
// ========================================

// Login function
export const login = async ({ username, password }) => {
  try {
    const params = new URLSearchParams();
    params.append('username', username);
    params.append('password', password);

    const response = await api.post('auth/login', params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    
    return response.data; // { access_token, token_type, user }
  } catch (err) {
    console.error('Login error:', err);
    throw err; // throw full error — component needs err.response.status
  }
};

// Register function
export const register = async (userData) => {
  try {
    const response = await api.post('auth/register', userData);
    return response.data;
  } catch (err) {
    console.error('Registration error:', err);
    throw err; // ✅ consistent — throw full error
  }
};

// Get current user info
export const getCurrentUser = async () => {
  try {
    const response = await api.get('auth/me');
    return response.data;
  } catch (err) {
    console.error('Get user error:', err);
    throw err; // ✅ was throwing string before — now consistent
  }
};

// Update current user
export const updateCurrentUser = async (userData) => {
  try {
    const response = await api.put('auth/me', userData);
    return response.data;
  } catch (err) {
    console.error('Update user error:', err);
    throw err; // ✅ was throwing string before — now consistent
  }
};

// Logout function (frontend only for JWT)
export const logout = async () => {
  try {
    await api.post('auth/logout');
  } catch (err) {
    console.error('Logout error:', err);
  } finally {
    // Always remove ALL tokens and user data from storage
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

/**
 * Get users from current user's group
 * @returns {Promise<Array>} Array of user objects
 */
export const getMyGroupUsers = async () => {
  try {
    const response = await api.get('auth/users/my-group');
    return response.data;
  } catch (err) {
    console.error('Get group users error:', err);
    throw err; // ✅ consistent
  }
};

/**
 * Get users from a specific group by group ID
 * @param {number} groupId - The group ID to fetch users from
 * @returns {Promise<Array>} Array of user objects
 */
export const getUsersByGroup = async (groupId) => {
  try {
    if (!groupId) {
      throw new Error('Group ID is required');
    }

    const response = await api.get(`auth/users/group/${groupId}`);
    return response.data;
  } catch (err) {
    console.error('Get users by group error:', err);
    throw err; // ✅ consistent
  }
};


// ========================================
// ADMIN: USER APPROVAL FUNCTIONS
// ========================================

/**
 * Get all pending users (inactive users awaiting approval)
 * ADMIN ONLY
 * @returns {Promise<Array>} Array of inactive user objects
 */
export const getPendingUsers = async () => {
  try {
    const response = await api.get('auth/admin/users/pending');
    return response.data;
  } catch (err) {
    console.error('Get pending users error:', err);
    throw err; // ✅ consistent
  }
};

/**
 * Activate a user account
 * ADMIN ONLY
 * @param {number} userId - The user ID to activate
 * @returns {Promise<Object>} Updated user object
 */
export const activateUser = async (userId) => {
  try {
    const response = await api.post(`auth/admin/users/${userId}/activate`);
    return response.data;
  } catch (err) {
    console.error('Activate user error:', err);
    throw err; // ✅ consistent
  }
};

/**
 * Deactivate a user account
 * ADMIN ONLY
 * @param {number} userId - The user ID to deactivate
 * @returns {Promise<Object>} Updated user object
 */
export const deactivateUser = async (userId) => {
  try {
    const response = await api.post(`auth/admin/users/${userId}/deactivate`);
    return response.data;
  } catch (err) {
    console.error('Deactivate user error:', err);
    throw err; // ✅ consistent
  }
};

export const resetPassword = async (userId, newPassword) => {
  const response = await api.post(`auth/admin/users/${userId}/reset-password`, {
    new_password: newPassword
  });
  return response.data;
};


/**
 * Get all users (active and inactive)
 * ADMIN ONLY
 * @returns {Promise<Array>} Array of all user objects
 */
export const getAllUsers = async () => {
  try {
    const response = await api.get('auth/admin/users');
    return response.data;
  } catch (err) {
    console.error('Get all users error:', err);
    throw err; // ✅ consistent
  }
};


// ========================================
// STORAGE HELPERS
// ========================================

// Get stored token
export const getToken = () => {
  return localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
};

// Check if user is logged in
export const isLoggedIn = () => !!getToken();

// Get stored user
export const getUser = () => {
  const userStr = localStorage.getItem('user') || sessionStorage.getItem('user');
  return userStr ? JSON.parse(userStr) : null;
};

// Get user role
export const getUserRole = () => {
  const userStr = localStorage.getItem('user') || sessionStorage.getItem('user');
  if (userStr) {
    const user = JSON.parse(userStr);
    return user.role;
  }
  return localStorage.getItem('userRole') || sessionStorage.getItem('userRole');
};

// Get user group
// ✅ UPDATED: Get user's primary group (first group in array)
export const getUserGroup = () => {
  const userStr = localStorage.getItem('user') || sessionStorage.getItem('user');
  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      // ✅ NEW: Get first group ID from groups array
      if (user.groups && user.groups.length > 0) {
        return user.groups[0].id;
      }
      // ✅ FALLBACK: Old structure (backward compatibility)
      return user.group_id || null;
    } catch (e) {
      console.error('Failed to parse user:', e);
    }
  }
  // ✅ FALLBACK: Old localStorage keys
  return localStorage.getItem('userGroup') || sessionStorage.getItem('userGroup');
};

// ✅ NEW: Get all user groups
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

// ✅ NEW: Get user's primary group name
export const getUserGroupName = () => {
  const userStr = localStorage.getItem('user') || sessionStorage.getItem('user');
  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      if (user.groups && user.groups.length > 0) {
        return user.groups[0].name;
      }
    } catch (e) {
      console.error('Failed to parse user:', e);
    }
  }
  return null;
};

// ========================================
// PERMISSION HELPERS
// ========================================

// Check if user has specific role
export const hasRole = (allowedRoles) => {
  const userRole = getUserRole();
  return allowedRoles.includes(userRole);
};

// Check permissions
export const isUser = () => hasRole(['User', 'Admin', 'SuperAdmin']);
export const isAdmin = () => hasRole(['Admin', 'SuperAdmin']);
export const isSuperAdmin = () => hasRole(['SuperAdmin']);

// Check if user belongs to specific group
// ✅ UPDATED: Check if user belongs to specific group (by ID or name)
export const isInGroup = (groupIdOrName) => {
  const userStr = localStorage.getItem('user') || sessionStorage.getItem('user');
  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      if (user.groups && Array.isArray(user.groups)) {
        // Check by ID or name
        return user.groups.some(
          g => g.id === groupIdOrName || 
               g.id === Number(groupIdOrName) || 
               g.name === groupIdOrName
        );
      }
      // ✅ FALLBACK: Old structure
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

/**
 * Get all groups
 * @returns {Promise<Array>} Array of group objects { id, name, description }
 */
export const getAllGroups = async () => {
  try {
    const response = await api.get('groups');
    return response.data;
  } catch (err) {
    console.error('Get all groups error:', err);
    throw err;
  }
};

/**
 * Get a single group by ID
 * @param {number} groupId
 * @returns {Promise<Object>} Group object
 */
export const getGroupById = async (groupId) => {
  try {
    const response = await api.get(`groups/${groupId}`);
    return response.data;
  } catch (err) {
    console.error('Get group error:', err);
    throw err;
  }
};

/**
 * Create a new group
 * Admin/SuperAdmin only
 * @param {{ name: string, description?: string }} groupData
 * @returns {Promise<Object>} Created group object
 */
export const createGroup = async (groupData) => {
  try {
    const response = await api.post('groups', groupData);
    return response.data;
  } catch (err) {
    console.error('Create group error:', err);
    throw err;
  }
};

/**
 * Update a group
 * Admin/SuperAdmin only
 * @param {number} groupId
 * @param {{ name?: string, description?: string }} groupData
 * @returns {Promise<Object>} Updated group object
 */
export const updateGroup = async (groupId, groupData) => {
  try {
    const response = await api.put(`groups/${groupId}`, groupData);
    return response.data;
  } catch (err) {
    console.error('Update group error:', err);
    throw err;
  }
};

/**
 * Delete a group
 * SuperAdmin only
 * @param {number} groupId
 * @returns {Promise<void>}
 */
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

/**
 * Get all users in a specific group
 * @param {number} groupId
 * @returns {Promise<Array>} Array of user objects
 */
export const getGroupUsers = async (groupId) => {
  try {
    const response = await api.get(`groups/${groupId}/users`);
    return response.data;
  } catch (err) {
    console.error('Get group users error:', err);
    throw err;
  }
};

/**
 * Assign a user to a group
 * Admin/SuperAdmin only
 * @param {number} groupId
 * @param {number} userId
 * @returns {Promise<Object>} { success, message }
 */
export const assignUserToGroup = async (groupId, userId) => {
  try {
    const response = await api.post(`groups/${groupId}/users`, { user_id: userId });
    return response.data;
  } catch (err) {
    console.error('Assign user to group error:', err);
    throw err;
  }
};

/**
 * Remove a user from a group
 * Admin/SuperAdmin only
 * @param {number} groupId
 * @param {number} userId
 * @returns {Promise<Object>} { success, message }
 */
export const removeUserFromGroup = async (groupId, userId) => {
  try {
    const response = await api.delete(`groups/${groupId}/users/${userId}`);
    return response.data;
  } catch (err) {
    console.error('Remove user from group error:', err);
    throw err;
  }
};

/**
 * Update user details (Admin only)
 * @param {number} userId - ID of user to update
 * @param {Object} updates - Fields to update (username, email, role)
 * @returns {Promise} Updated user data
 */
export const updateUser = async (userId, updates) => {
  const response = await api.patch(`/auth/admin/users/${userId}`, updates);
  return response.data;
};



