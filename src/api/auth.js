import api from './axios';

// ========================================
// AUTHENTICATION
// ========================================

// Login function - UPDATED to properly handle inactive user errors
export const login = async ({ username, password }) => {
  try {
    // Create URLSearchParams for form data
    const params = new URLSearchParams();
    params.append('username', username);
    params.append('password', password);

    // IMPORTANT: Override the default Content-Type for this request
    const response = await api.post('auth/login', params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    
    return response.data; // { access_token, token_type, user }
  } catch (err) {
    console.error('Login error:', err);
    // Throw the full error object so we can check status code in component
    throw err;
  }
};

// Register function
export const register = async (userData) => {
  try {
    const response = await api.post('auth/register', userData);
    return response.data;
  } catch (err) {
    console.error('Registration error:', err);
    throw err;
  }
};

// Get current user info
export const getCurrentUser = async () => {
  try {
    const response = await api.get('auth/me');
    return response.data;
  } catch (err) {
    console.error('Get user error:', err);
    throw err.response?.data?.detail || 'Failed to get user information.';
  }
};

// Update current user
export const updateCurrentUser = async (userData) => {
  try {
    const response = await api.put('auth/me', userData);
    return response.data;
  } catch (err) {
    console.error('Update user error:', err);
    throw err.response?.data?.detail || 'Failed to update user information.';
  }
};

// Logout function (frontend only for JWT)
export const logout = async () => {
  try {
    // Optional: Call backend logout endpoint
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
 * Returns list of users who can be assigned as deckers/evaluators
 * 
 * @returns {Promise<Array>} Array of user objects
 */
export const getMyGroupUsers = async () => {
  try {
    const response = await api.get('auth/users/my-group');
    return response.data;
  } catch (err) {
    console.error('Get group users error:', err);
    throw err.response?.data?.detail || 'Failed to get group users.';
  }
};

/**
 * Get users from a specific group by group ID
 * 
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
    throw err.response?.data?.detail || `Failed to get users from group ${groupId}.`;
  }
};


// ========================================
// ADMIN: USER APPROVAL FUNCTIONS
// ========================================

/**
 * Get all pending users (inactive users awaiting approval)
 * ADMIN ONLY
 * 
 * @returns {Promise<Array>} Array of inactive user objects
 */
export const getPendingUsers = async () => {
  try {
    const response = await api.get('auth/admin/users/pending');
    return response.data;
  } catch (err) {
    console.error('Get pending users error:', err);
    throw err.response?.data?.detail || 'Failed to get pending users.';
  }
};

/**
 * Activate a user account
 * ADMIN ONLY
 * 
 * @param {number} userId - The user ID to activate
 * @returns {Promise<Object>} Updated user object
 */
export const activateUser = async (userId) => {
  try {
    const response = await api.post(`auth/admin/users/${userId}/activate`);
    return response.data;
  } catch (err) {
    console.error('Activate user error:', err);
    throw err.response?.data?.detail || 'Failed to activate user.';
  }
};

/**
 * Deactivate a user account
 * ADMIN ONLY
 * 
 * @param {number} userId - The user ID to deactivate
 * @returns {Promise<Object>} Updated user object
 */
export const deactivateUser = async (userId) => {
  try {
    const response = await api.post(`auth/admin/users/${userId}/deactivate`);
    return response.data;
  } catch (err) {
    console.error('Deactivate user error:', err);
    throw err.response?.data?.detail || 'Failed to deactivate user.';
  }
};

/**
 * Get all users (active and inactive)
 * ADMIN ONLY
 * 
 * @returns {Promise<Array>} Array of all user objects
 */
export const getAllUsers = async () => {
  try {
    const response = await api.get('auth/admin/users');
    return response.data;
  } catch (err) {
    console.error('Get all users error:', err);
    throw err.response?.data?.detail || 'Failed to get all users.';
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
  // Fallback: check userRole directly
  return localStorage.getItem('userRole') || sessionStorage.getItem('userRole');
};

// Get user group
export const getUserGroup = () => {
  const userStr = localStorage.getItem('user') || sessionStorage.getItem('user');
  if (userStr) {
    const user = JSON.parse(userStr);
    return user.group_id;
  }
  // Fallback: check userGroup directly
  return localStorage.getItem('userGroup') || sessionStorage.getItem('userGroup');
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
export const isInGroup = (groupId) => {
  const userGroup = getUserGroup();
  return userGroup === groupId || userGroup === String(groupId);
};