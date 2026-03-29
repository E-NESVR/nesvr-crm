import axios from 'axios';
import { store } from './store';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      store.setUser(null);
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

// ─── Auth ─────────────────────────────────────────
export const auth = {
  login: (username, password) => api.post('/auth/login', { username, password }),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
};

// ─── Leads ────────────────────────────────────────
export const leads = {
  list: (params) => api.get('/leads', { params }),
  get: (id) => api.get(`/leads/${id}`),
  create: (data) => api.post('/leads', data),
  update: (id, data) => api.put(`/leads/${id}`, data),
  delete: (id, reason) => api.delete(`/leads/${id}`, { data: { reason } }),
  categories: () => api.get('/leads/categories'),
  export: (params) => {
    const query = new URLSearchParams(params).toString();
    window.open(`/api/leads/export?${query}`, '_blank');
  },
  calls: (id, user) => api.get(`/leads/${id}/calls`, { params: user ? { user } : {} }),
  logCall: (id, data) => api.post(`/leads/${id}/calls`, data),
  deleteCall: (id, callId, reason) => api.delete(`/leads/${id}/calls/${callId}`, { data: { reason } }),
  activities: (id) => api.get(`/leads/${id}/activities`),
  logActivity: (id, data) => api.post(`/leads/${id}/activities`, data),
  report: (id) => api.get(`/leads/${id}/report`),
  deleteReport: (id, reason) => api.delete(`/leads/${id}/report`, { data: { reason } }),
  emails: (id) => api.get(`/leads/${id}/emails`),
  archived: () => api.get('/leads/archived'),
  restore: (id) => api.post(`/leads/${id}/restore`),
  bulkStatus: (ids, status) => api.put('/leads/bulk-status', { ids, status }),
  enrich: (id) => api.post(`/leads/${id}/enrich`),
};

// ─── Research ─────────────────────────────────────
export const research = {
  runSingle: (id) => api.post(`/research/leads/${id}/research`),
  startQueue: (leadIds) => api.post('/research/queue', { leadIds }),
  queueStatus: () => api.get('/research/queue/status'),
  templates: () => api.get('/research/templates'),
  generateEmail: (id, data) => api.post(`/research/leads/${id}/emails/generate`, data),
};

// ─── Dashboard ────────────────────────────────────
export const dashboard = {
  metrics: () => api.get('/dashboard/metrics'),
};

// ─── Activities ───────────────────────────────────
export const activities = {
  recent: (limit) => api.get('/activities/recent', { params: { limit } }),
  all: (params) => api.get('/activities/all', { params }),
};

// ─── Communications ───────────────────────────────
export const communications = {
  followups: () => api.get('/communications/followups'),
};

export default api;
