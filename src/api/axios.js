import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    'Accept': 'application/json',
  },
});

// Request interceptor - Add auth token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    if (!config.headers['Content-Type']) {
      config.headers['Content-Type'] = 'application/json';
    }
    
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - Handle token refresh + errors
api.interceptors.response.use(
  (response) => {
    // ✅ BAGO: Kunin ang bagong token kung may nakapasok sa header
    const newToken = response.headers['x-new-token'];
    if (newToken) {
      // I-save sa kung saan nakalagay ang lumang token
      if (localStorage.getItem('access_token')) {
        localStorage.setItem('access_token', newToken);
      } else {
        sessionStorage.setItem('access_token', newToken);
      }
    }

    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token');
      sessionStorage.removeItem('access_token');
      localStorage.removeItem('user');
      sessionStorage.removeItem('user');
      
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;