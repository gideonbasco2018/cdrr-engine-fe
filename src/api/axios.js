import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    'Accept': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (!config.headers['Content-Type']) {
      config.headers['Content-Type'] = 'application/json';
    }

    // Inject ?impersonate_user_id into dashboard API calls
const impersonateUserId = sessionStorage.getItem('impersonate_user_id');
if (impersonateUserId && config.url?.includes('/dashboard/')) {
  config.params = {
    ...config.params,
    impersonate: impersonateUserId,
  };
}

    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => {
    const newToken = response.headers['x-new-token'];
    if (newToken) {
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