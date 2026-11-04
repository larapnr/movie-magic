import axios from "axios";
import { auth } from "../firebase";

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000" });

// Attach the Firebase ID token to every request when a user is signed in.
api.interceptors.request.use(async (config) => {
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const get = (url, params) => api.get(url, { params }).then((r) => r.data);

export const getTrending = (window = "week") => get("/api/trending", { window });
export const getPopular = (type = "tv") => get("/api/popular", { type });
export const getUpcoming = () => get("/api/upcoming");
export const searchTitles = (q, type = "multi", page = 1) => get("/api/search", { q, type, page });
export const discover = (params) => get("/api/discover", params);
export const getGenres = (type = "movie") => get("/api/genres", { type });
export const getDetails = (mediaType, id) => get(`/api/media/${mediaType}/${id}`);
export const getYolo = (params) => get("/api/yolo", params);

export const getReviews = (mediaType, id) => get(`/api/reviews/${mediaType}/${id}`);
export const getReviewSummary = (mediaType, id) => get(`/api/reviews/${mediaType}/${id}/summary`);
export const saveReview = (mediaType, id, body) =>
  api.put(`/api/reviews/${mediaType}/${id}`, body).then((r) => r.data);
export const deleteReview = (mediaType, id) => api.delete(`/api/reviews/${mediaType}/${id}`);

export const getList = (list) => get(`/api/me/lists/${list}`);
export const addToList = (list, mediaType, id, item) =>
  api.put(`/api/me/lists/${list}/${mediaType}/${id}`, item).then((r) => r.data);
export const removeFromList = (list, mediaType, id) =>
  api.delete(`/api/me/lists/${list}/${mediaType}/${id}`);

export const getGenreRecommendations = (genre, type = "movie") =>
  get("/api/recommendations/genre", { genre, type });
export const getMyRecommendations = (type = "movie") => get("/api/recommendations/me", { type });

export const searchTrailerScenes = (q) => get("/api/trailer-search", { q });

export default api;
