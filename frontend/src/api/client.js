import axios from "axios";

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000" });

// AuthContext registers how to get the current token (Firebase ID token or local-mode token)
// and what to do when the backend rejects it.
let getToken = async () => null;
let onUnauthorized = () => {};
export const configureAuth = (tokenGetter, unauthorizedHandler) => {
  getToken = tokenGetter;
  onUnauthorized = unauthorizedHandler;
};

api.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401 && err.config?.headers?.Authorization) onUnauthorized();
    return Promise.reject(err);
  }
);

/** Human readable message from an axios error. */
export const errorMessage = (err, fallback = "Something went wrong.") => {
  const detail = err?.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && detail[0]?.msg) return detail[0].msg;
  if (!err?.response && err?.message === "Network Error") return "Can't reach the server. Is the backend running?";
  return err?.message || fallback;
};

const get = (url, params) => api.get(url, { params }).then((r) => r.data);

// Discovery
export const getTrending = (window = "week") => get("/api/trending", { window });
export const getPopular = (type = "tv", page = 1) => get("/api/popular", { type, page });
export const getUpcoming = (page = 1) => get("/api/upcoming", { page });
export const searchTitles = (q, type = "multi", page = 1) => get("/api/search", { q, type, page });
export const discover = (params) => get("/api/discover", params);
export const getGenres = (type = "movie") => get("/api/genres", { type });
export const getDetails = (mediaType, id) => get(`/api/media/${mediaType}/${id}`);
export const getYolo = (params) => get("/api/yolo", params);

// Local-mode accounts
export const getAuthMode = () => get("/api/auth/mode");
export const localSignup = (body) => api.post("/api/auth/signup", body).then((r) => r.data);
export const localLogin = (body) => api.post("/api/auth/login", body).then((r) => r.data);
export const getMe = () => get("/api/auth/me");

// Reviews
export const getReviews = (mediaType, id) => get(`/api/reviews/${mediaType}/${id}`);
export const getReviewSummary = (mediaType, id) => get(`/api/reviews/${mediaType}/${id}/summary`);
export const saveReview = (mediaType, id, body) =>
  api.put(`/api/reviews/${mediaType}/${id}`, body).then((r) => r.data);
export const deleteReview = (mediaType, id) => api.delete(`/api/reviews/${mediaType}/${id}`);

// Lists
export const getList = (list) => get(`/api/me/lists/${list}`);
export const addToList = (list, mediaType, id, item) =>
  api.put(`/api/me/lists/${list}/${mediaType}/${id}`, item).then((r) => r.data);
export const removeFromList = (list, mediaType, id) =>
  api.delete(`/api/me/lists/${list}/${mediaType}/${id}`);

// Recommendations
export const getGenreRecommendations = (genre, type = "movie") =>
  get("/api/recommendations/genre", { genre, type });
export const getMyRecommendations = (type = "movie") => get("/api/recommendations/me", { type });

// Scene Finder
export const searchTrailerScenes = (q) => get("/api/trailer-search", { q });

export default api;
