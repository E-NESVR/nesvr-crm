<template>
  <div class="archives-page">
    <div class="page-header card">
      <div class="header-content">
        <div>
          <h2>Archived Leads</h2>
          <p class="text-muted text-sm">These leads have been archived. Restoring a lead returns it to its previous status in the active pipeline.</p>
        </div>
        <span class="badge badge-tier3">{{ archivedList.length }} archived</span>
      </div>
    </div>

    <div class="card table-card">
      <div v-if="loading" class="table-loading">
        <div v-for="i in 5" :key="i" class="skeleton-row">
          <div class="skeleton" style="width:200px;height:16px"></div>
          <div class="skeleton" style="width:100px;height:16px"></div>
          <div class="skeleton" style="width:120px;height:16px"></div>
          <div class="skeleton" style="width:200px;height:16px"></div>
          <div class="skeleton" style="width:80px;height:28px;border-radius:8px"></div>
        </div>
      </div>

      <div v-else-if="archivedList.length === 0" class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M21 8v13H3V8"/><rect x="1" y="3" width="22" height="5" rx="1"/>
          <line x1="10" y1="12" x2="14" y2="12"/>
        </svg>
        <h3>No archived leads</h3>
        <p>When you archive a lead it will appear here, and you can restore it at any time.</p>
      </div>

      <div v-else class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Company</th>
              <th>Archived By</th>
              <th>Archived On</th>
              <th>Reason</th>
              <th style="width:120px"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="lead in archivedList" :key="lead.id">
              <td>
                <div class="company-cell">
                  <span class="company-name">{{ lead.business_name }}</span>
                  <span class="category-tag" v-if="lead.category">{{ lead.category }}</span>
                </div>
              </td>
              <td class="text-secondary">{{ capitalize(lead.deleted_by) || '—' }}</td>
              <td class="text-muted text-sm">{{ formatDate(lead.deleted_at) }}</td>
              <td class="reason-cell text-secondary text-sm">{{ lead.delete_reason || '—' }}</td>
              <td>
                <button
                  class="btn btn-secondary btn-sm"
                  @click="restore(lead)"
                  :disabled="restoringId === lead.id"
                >
                  <span class="spinner" style="width:12px;height:12px;border-width:2px" v-if="restoringId === lead.id"></span>
                  <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13">
                    <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/>
                  </svg>
                  {{ restoringId === lead.id ? 'Restoring…' : 'Restore' }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { leads as leadsApi } from '../api';
import { store } from '../store';

const router = useRouter();
const archivedList = ref([]);
const loading = ref(true);
const restoringId = ref(null);

async function load() {
  loading.value = true;
  try {
    const res = await leadsApi.archived();
    archivedList.value = res.data;
  } catch {
    store.addToast('Failed to load archived leads', 'error');
  } finally {
    loading.value = false;
  }
}

async function restore(lead) {
  restoringId.value = lead.id;
  try {
    await leadsApi.restore(lead.id);
    store.addToast(`"${lead.business_name}" restored to active pipeline`, 'success');
    archivedList.value = archivedList.value.filter(l => l.id !== lead.id);
  } catch {
    store.addToast('Failed to restore lead', 'error');
  } finally {
    restoringId.value = null;
  }
}

function capitalize(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

onMounted(load);
</script>

<style scoped>
.archives-page { display: flex; flex-direction: column; gap: 16px; }

.page-header { padding: 20px; }
.header-content {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}
.header-content h2 { font-size: 18px; font-weight: 700; margin-bottom: 4px; }

.table-card { overflow: hidden; }
.table-wrap { overflow-x: auto; }

.table-loading { padding: 20px 16px; display: flex; flex-direction: column; gap: 14px; }
.skeleton-row { display: flex; align-items: center; gap: 16px; padding: 4px 0; }

.company-cell { display: flex; flex-direction: column; gap: 2px; }
.company-name { font-weight: 500; color: var(--text-primary); }
.category-tag {
  font-size: 11px;
  color: var(--text-muted);
  background: var(--bg-secondary);
  padding: 1px 6px;
  border-radius: var(--radius-full);
  display: inline-block;
  width: fit-content;
}

.reason-cell {
  max-width: 280px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
