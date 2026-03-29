/**
 * Centralized API utility using Axios.
 * Base URL is pulled from the VITE_API_BASE_URL env variable.
 *
 * Authentication:
 *   A request interceptor automatically retrieves the current Clerk JWT
 *   and attaches it as `Authorization: Bearer <token>` on every request.
 *   If no session is active (user signed out), the header is omitted.
 */

import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "/api",
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
});

// ---------------------------------------------------------------------------
// Clerk auth interceptor
// ---------------------------------------------------------------------------
// window.Clerk is set by ClerkProvider once it initialises.
// No import needed — we read it directly from the global scope.

api.interceptors.request.use(async (config) => {
  try {
    // 1. Wait briefly for window.Clerk to be available if it's not yet
    let clerk = window.Clerk;
    let attempts = 0;
    while (!clerk && attempts < 20) {
      await new Promise(resolve => setTimeout(resolve, 100)); // wait 100ms
      clerk = window.Clerk;
      attempts++;
    }

    // 2. Extract token from active session
    if (clerk?.session) {
      const token = await clerk.session.getToken();
      if (token) {
        config.headers["Authorization"] = `Bearer ${token}`;
        // console.log("DEBUG: Attached Clerk JWT");
      } else {
        console.warn("DEBUG: Clerk session present but getToken() returned null.");
      }
    } else {
      console.warn("DEBUG: No active Clerk session found for request.");
    }
  } catch (err) {
    console.error("DEBUG: Clerk auth interceptor failed:", err);
  }
  return config;
});

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------

/* ── Complaints ─────────────────────────────────────────────────────── */

export const createComplaint = (data) =>
  api.post("/complaints", data).then((r) => r.data);

export const getComplaints = (params = {}) =>
  api.get("/complaints", { params }).then((r) => r.data);

export const getComplaint = (id) =>
  api.get(`/complaints/${id}`).then((r) => r.data);

export const updateComplaintStatus = (id, status) =>
  api.put(`/complaints/${id}/status`, { status }).then((r) => r.data);

/* ── Stats ──────────────────────────────────────────────────────────── */

export const getStats = () =>
  api.get("/stats").then((r) => r.data);

/* ── Health ─────────────────────────────────────────────────────────── */

export const getHealth = () =>
  api.get("/health").then((r) => r.data);

/* ── Export ─────────────────────────────────────────────────────────── */

/**
 * Downloads the complaints CSV using the authenticated Axios instance.
 * Returns a promise that resolves to the binary blob.
 */
export const downloadExport = () =>
  api.get("/export", { responseType: "blob" }).then((r) => r.data);

export const getExportUrl = () =>
  `${api.defaults.baseURL}/export`;

export default api;
