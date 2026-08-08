import axios from "axios";

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true, // CRITICAL — sends httpOnly cookies for JWT auth
});

// URLs where we should NOT attempt refresh or redirect on 401
const AUTH_URLS = ["/users/current-user", "/users/refresh-token", "/users/login", "/users/register"];

// Response interceptor — handles token refresh automatically
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const requestUrl = originalRequest?.url || "";

    // Skip refresh logic for auth-related endpoints to prevent infinite loops
    const isAuthRequest = AUTH_URLS.some((url) => requestUrl.includes(url));

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !isAuthRequest
    ) {
      originalRequest._retry = true;
      try {
        await axiosInstance.post("/users/refresh-token");
        return axiosInstance(originalRequest); // retry original request
      } catch (refreshError) {
        // Refresh failed — let the app handle it via Redux state
        // Do NOT do window.location.href here to avoid reload loops
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
