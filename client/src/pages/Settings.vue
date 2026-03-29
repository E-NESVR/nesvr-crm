<template>
  <div class="settings-page">
    <div class="settings-grid">

      <!-- Appearance -->
      <div class="card settings-card">
        <div class="card-header"><span class="card-title">Appearance</span></div>
        <div class="card-body settings-body">
          <div class="setting-row">
            <div class="setting-info">
              <div class="setting-label">Theme</div>
              <div class="setting-desc">Choose your preferred color theme</div>
            </div>
            <div class="theme-options">
              <button
                v-for="t in themes"
                :key="t.value"
                class="theme-btn"
                :class="{ active: store.theme === t.value }"
                @click="store.setTheme(t.value)"
              >
                {{ t.label }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- API Keys Status -->
      <div class="card settings-card">
        <div class="card-header"><span class="card-title">API Configuration</span></div>
        <div class="card-body settings-body">
          <div class="setting-row">
            <div class="setting-info">
              <div class="setting-label">Anthropic API</div>
              <div class="setting-desc">Used for AI research reports and email generation</div>
            </div>
            <div class="api-status" :class="apiStatus.anthropic ? 'status-ok' : 'status-missing'">
              <div class="status-dot"></div>
              {{ apiStatus.anthropic ? 'Configured' : 'Not configured' }}
            </div>
          </div>

          <div class="setting-row">
            <div class="setting-info">
              <div class="setting-label">Google Search API</div>
              <div class="setting-desc">Used to enrich leads with web research before AI analysis</div>
            </div>
            <div class="api-status" :class="apiStatus.google ? 'status-ok' : 'status-missing'">
              <div class="status-dot"></div>
              {{ apiStatus.google ? 'Configured' : 'Not configured' }}
            </div>
          </div>

          <div class="setting-hint">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="14" height="14"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            API keys are configured in the <code>.env</code> file in the project root. Restart the server after changing keys.
          </div>
        </div>
      </div>

      <!-- Users -->
      <div class="card settings-card">
        <div class="card-header"><span class="card-title">Team Members</span></div>
        <div class="card-body settings-body">
          <div v-for="user in users" :key="user.username" class="user-row">
            <div class="user-avatar-sm">{{ user.displayName[0] }}</div>
            <div class="user-detail">
              <div class="user-name">{{ user.displayName }}</div>
              <div class="user-username text-muted text-sm">@{{ user.username }}</div>
            </div>
            <div class="badge badge-researched" v-if="user.username === store.user?.username">You</div>
          </div>
          <div class="setting-hint mt-3">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="14" height="14"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            Passwords are managed in <code>server/auth.js</code>. Reach out to your system admin to change passwords.
          </div>
        </div>
      </div>

      <!-- DB Stats -->
      <div class="card settings-card">
        <div class="card-header"><span class="card-title">Database</span></div>
        <div class="card-body settings-body">
          <div class="setting-row">
            <span class="setting-label">Database File</span>
            <div style="display:flex;align-items:center;gap:8px">
              <code class="code-badge">nesvr.db</code>
              <span class="font-semibold text-muted text-sm" v-if="dbStats.sizeMB !== '—'">{{ dbStats.sizeMB }} MB</span>
            </div>
          </div>
          <div class="setting-row">
            <span class="setting-label">Total Leads</span>
            <span class="font-semibold">{{ dbStats.leads }}</span>
          </div>
          <div class="setting-row">
            <span class="setting-label">Research Reports</span>
            <span class="font-semibold">{{ dbStats.reports }}</span>
          </div>
          <div class="setting-row">
            <span class="setting-label">Call Logs</span>
            <span class="font-semibold">{{ dbStats.calls }}</span>
          </div>
          <div class="setting-row">
            <span class="setting-label">Activities</span>
            <span class="font-semibold">{{ dbStats.activities }}</span>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { store } from '../store';
import api from '../api';

const themes = [
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
  { value: 'auto', label: 'Auto' },
];

const users = [
  { username: 'errol', displayName: 'Errol' },
  { username: 'nick', displayName: 'Nick' },
  { username: 'shane', displayName: 'Shane' },
];

const apiStatus = ref({ anthropic: false, google: false });
const dbStats = ref({ leads: '—', reports: '—', calls: '—', activities: '—', sizeMB: '—' });

async function loadStats() {
  try {
    const res = await api.get('/dashboard/status');
    const { db, api: apiKeys } = res.data;
    dbStats.value = {
      leads: db.leads,
      reports: db.reports,
      calls: db.calls,
      activities: db.activities,
      sizeMB: db.sizeMB,
    };
    apiStatus.value = {
      anthropic: apiKeys.anthropic,
      google: apiKeys.google,
    };
  } catch {}
}

onMounted(loadStats);
</script>

<style scoped>
.settings-page { max-width: 800px; }
.settings-grid { display: flex; flex-direction: column; gap: 16px; }
.settings-card {}
.settings-body { display: flex; flex-direction: column; gap: 16px; }

.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.setting-info { flex: 1; min-width: 0; }
.setting-label { font-size: 14px; font-weight: 500; color: var(--text-primary); }
.setting-desc { font-size: 12px; color: var(--text-muted); margin-top: 2px; }

.theme-options { display: flex; gap: 6px; }
.theme-btn {
  padding: 6px 14px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  background: var(--bg-secondary);
  color: var(--text-secondary);
  font-size: 13px;
  cursor: pointer;
  transition: all var(--transition);
}
.theme-btn.active { background: var(--accent-blue-dim); border-color: var(--accent-blue); color: var(--accent-blue); font-weight: 600; }
.theme-btn:hover:not(.active) { border-color: var(--text-muted); }

.api-status {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: var(--radius-full);
}
.status-dot { width: 7px; height: 7px; border-radius: 50%; }
.status-ok { background: var(--success-dim); color: var(--success); }
.status-ok .status-dot { background: var(--success); }
.status-missing { background: var(--warning-dim); color: var(--warning); }
.status-missing .status-dot { background: var(--warning); }

.setting-hint {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 12px;
  color: var(--text-muted);
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  padding: 10px 12px;
  line-height: 1.5;
}

code, .code-badge {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  background: var(--bg-secondary);
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  color: var(--accent-blue);
  border: 1px solid var(--border);
}

.user-row { display: flex; align-items: center; gap: 12px; padding: 8px 0; border-bottom: 1px solid var(--border-subtle); }
.user-row:last-of-type { border-bottom: none; }
.user-avatar-sm {
  width: 32px; height: 32px;
  background: linear-gradient(135deg, var(--accent-blue), #6366f1);
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 13px; font-weight: 700; color: white;
  flex-shrink: 0;
}
.user-detail { flex: 1; }
.user-name { font-size: 13px; font-weight: 600; }
</style>
