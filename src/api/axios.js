import axios from "axios";

// Create axios instance with base configuration
const api = axios.create({
  // baseURL: 'http://localhost:8000/api', // Adjust port if needed
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    'Accept': 'application/json',
    // Don't set Content-Type here - let each request set its own
  },
});

// Request interceptor - Add auth token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Set default Content-Type to JSON if not already set
    if (!config.headers['Content-Type']) {
      config.headers['Content-Type'] = 'application/json';
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors globally
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle 401 Unauthorized errors
    if (error.response?.status === 401) {
      // Clear tokens and redirect to login
      localStorage.removeItem('access_token');
      sessionStorage.removeItem('access_token');
      localStorage.removeItem('user');
      sessionStorage.removeItem('user');
      
      // Redirect to login page if not already there
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;