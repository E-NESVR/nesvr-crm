<template>
  <div class="all-activity-page">
    <div class="page-header card">
      <div class="header-content">
        <div>
          <h2>All Activity</h2>
          <p class="text-muted text-sm">Complete activity log across all leads, all users.</p>
        </div>
        <div class="header-filters">
          <select class="form-select filter-select" v-model="filterUser" @change="load(1)">
            <option value="all">All Users</option>
            <option value="errol">Errol</option>
            <option value="nick">Nick</option>
            <option value="shane">Shane</option>
          </select>
          <select class="form-select filter-select" v-model="filterType" @change="load(1)">
            <option value="all">All Types</option>
            <option value="call">Call</option>
            <option value="email">Email</option>
            <option value="meeting">Meeting</option>
            <option value="research_completed">Research</option>
            <option value="note">Note</option>
            <option value="status_change">Status Change</option>
          </select>
        </div>
      </div>
    </div>

    <div class="card activity-card">
      <!-- Loading -->
      <div v-if="loading" class="empty-state" style="padding:40px 0">
        <div class="spinner spinner-lg"></div>
      </div>

      <!-- Empty -->
      <div v-else-if="items.length === 0" class="empty-state" style="padding:40px 0">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>
        </svg>
        <h3>No activities found</h3>
        <p>Try adjusting the filters above.</p>
      </div>

      <!-- Feed -->
      <div v-else class="activity-feed">
        <div
          v-for="item in items"
          :key="item.id"
          class="activity-row"
          @click="$router.push(`/leads/${item.lead_id}`)"
        >
          <div class="activity-type-icon" :class="`dot-${item.activity_type}`">
            <svg v-if="item.activity_type === 'call'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 012.12 4.18 2 2 0 014.11 2h3a2 2 0 012 1.72"/></svg>
            <svg v-else-if="item.activity_type === 'email'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
            <svg v-else-if="item.activity_type === 'research_completed'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <svg v-else-if="item.activity_type === 'status_change'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><polyline points="20 6 9 17 4 12"/></svg>
            <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
          </div>

          <div class="activity-body">
            <div class="activity-lead-name">{{ item.business_name }}</div>
            <div class="activity-description">{{ item.description }}</div>
          </div>

          <div class="activity-meta">
            <span class="activity-user">{{ capitalize(item.user) }}</span>
            <span class="activity-type-badge" :class="`badge-type-${item.activity_type}`">{{ formatType(item.activity_type) }}</span>
            <span class="activity-time text-muted text-sm">{{ formatDate(item.created_at) }}</span>
          </div>
        </div>
      </div>

      <!-- Pagination -->
      <div class="pagination" v-if="pages > 1">
        <button class="btn btn-ghost btn-sm" :disabled="currentPage === 1" @click="load(currentPage - 1)">← Prev</button>
        <span class="page-info">Page {{ currentPage }} of {{ pages }} ({{ total }} activities)</span>
        <button class="btn btn-ghost btn-sm" :disabled="currentPage === pages" @click="load(currentPage + 1)">Next →</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { activities as activitiesApi } from '../api';
import { store } from '../store';

const items = ref([]);
const loading = ref(true);
const total = ref(0);
const pages = ref(1);
const currentPage = ref(1);
const filterUser = ref('all');
const filterType = ref('all');

async function load(page = 1) {
  loading.value = true;
  currentPage.value = page;
  try {
    const res = await activitiesApi.all({
      page,
      limit: 50,
      user: filterUser.value !== 'all' ? filterUser.value : undefined,
      activity_type: filterType.value !== 'all' ? filterType.value : undefined,
    });
    items.value = res.data.activities;
    total.value = res.data.total;
    pages.value = res.data.pages;
  } catch {
    store.addToast('Failed to load activities', 'error');
  } finally {
    loading.value = false;
  }
}

function capitalize(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }

function formatType(t) {
  const map = {
    call: 'Call', email: 'Email', meeting: 'Meeting', note: 'Note',
    status_change: 'Status', research_completed: 'Research', dm: 'DM',
    in_person: 'In Person',
  };
  return map[t] || t;
}

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

onMounted(() => load(1));
</script>

<style scoped>
.all-activity-page { display: flex; flex-direction: column; gap: 16px; }

.page-header { padding: 20px; }
.header-content {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}
.header-content h2 { font-size: 18px; font-weight: 700; margin-bottom: 4px; }

.header-filters { display: flex; gap: 8px; }
.filter-select { padding: 6px 10px; font-size: 13px; }

.activity-feed { display: flex; flex-direction: column; }

.activity-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  cursor: pointer;
  border-bottom: 1px solid var(--border-subtle);
  transition: background var(--transition);
}
.activity-row:last-child { border-bottom: none; }
.activity-row:hover { background: var(--bg-secondary); }

.activity-type-icon {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: var(--bg-secondary);
  color: var(--text-muted);
}
.activity-type-icon.dot-call { background: var(--accent-blue-dim); color: var(--accent-blue); }
.activity-type-icon.dot-research_completed { background: var(--success-dim); color: var(--success); }
.activity-type-icon.dot-status_change { background: var(--warning-dim); color: var(--warning); }
.activity-type-icon.dot-email { background: #6366f115; color: #6366f1; }

.activity-body { flex: 1; min-width: 0; }
.activity-lead-name { font-size: 13px; font-weight: 600; color: var(--text-primary); }
.activity-description { font-size: 12px; color: var(--text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 2px; }

.activity-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  flex-shrink: 0;
}
.activity-user { font-size: 11px; font-weight: 600; color: var(--text-secondary); }
.activity-type-badge {
  font-size: 10px;
  font-weight: 600;
  padding: 1px 6px;
  border-radius: var(--radius-full);
  background: var(--bg-secondary);
  color: var(--text-muted);
}
.activity-time { font-size: 11px; }

.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 14px 16px;
  border-top: 1px solid var(--border-subtle);
}
.page-info { font-size: 13px; color: var(--text-muted); }
</style>
