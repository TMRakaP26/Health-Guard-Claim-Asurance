import axios from "axios";
const api = axios.create({
  baseURL: "/api",
  headers: { Accept: "application/json" },
  timeout: 30000,
});
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("auth_token");
  if (token) config.headers.Authorization = "Bearer " + token;
  return config;
});
function clearSession() {
  localStorage.removeItem("auth_token");
  localStorage.removeItem("auth_user");
  if (window.location.pathname !== "/") window.location.assign("/");
}
api.interceptors.response.use(
  (response) => {
    if (response.data?.reauthenticate === true) clearSession();
    return response;
  },
  (error: unknown) => {
    if (
      axios.isAxiosError(error) &&
      error.response?.status === 401 &&
      localStorage.getItem("auth_token")
    )
      clearSession();
    return Promise.reject(error);
  },
);
export default api;
