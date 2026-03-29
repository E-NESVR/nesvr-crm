<template>
  <!-- Mobile overlay backdrop -->
  <div
    class="sidebar-backdrop"
    v-if="isMobileOpen"
    @click="store.toggleSidebar()"
  ></div>

  <aside class="sidebar" :class="{ collapsed: !store.sidebarOpen }">
    <div class="sidebar-logo">
      <div class="logo-mark">N</div>
      <span class="logo-text">NESVR</span>
      <span class="logo-sub">CRM</span>
    </div>

    <nav class="sidebar-nav">
      <router-link to="/dashboard" class="nav-item" active-class="active">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
          <rect x="3" y="3" width="7" height="7" rx="1.5"/>
          <rect x="14" y="3" width="7" height="7" rx="1.5"/>
          <rect x="3" y="14" width="7" height="7" rx="1.5"/>
          <rect x="14" y="14" width="7" height="7" rx="1.5"/>
        </svg>
        <span>Dashboard</span>
      </router-link>

      <router-link to="/leads" class="nav-item" active-class="active">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 00-3-3.87"/>
          <path d="M16 3.13a4 4 0 010 7.75"/>
        </svg>
        <span>Leads</span>
        <span class="nav-badge" v-if="leadCount">{{ leadCount }}</span>
      </router-link>

      <router-link to="/communications" class="nav-item" active-class="active">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
        </svg>
        <span>Communications</span>
        <span class="nav-badge followup-badge" v-if="followupCount > 0">{{ followupCount }}</span>
      </router-link>

      <router-link to="/activity" class="nav-item" active-class="active">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
        </svg>
        <span>All Activity</span>
      </router-link>

      <router-link to="/archives" class="nav-item" active-class="active">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
          <path d="M21 8v13H3V8"/><rect x="1" y="3" width="22" height="5" rx="1"/>
          <line x1="10" y1="12" x2="14" y2="12"/>
        </svg>
        <span>Archives</span>
      </router-link>

      <router-link to="/settings" class="nav-item" active-class="active">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
          <circle cx="12" cy="12" r="3"/>
          <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
        </svg>
        <span>Settings</span>
      </router-link>
    </nav>

    <div class="sidebar-user">
      <div class="user-avatar">{{ userInitial }}</div>
      <div class="user-info" v-if="store.sidebarOpen">
        <div class="user-name">{{ store.user?.displayName }}</div>
        <div class="user-role">Sales Rep</div>
      </div>
      <button class="btn btn-ghost btn-icon btn-sm logout-btn" @click="logout" title="Logout" v-if="store.sidebarOpen">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="15" height="15">
          <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
          <polyline points="16 17 21 12 16 7"/>
          <line x1="21" y1="12" x2="9" y2="12"/>
        </svg>
      </button>
    </div>
  </aside>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { store } from '../store';
import { auth, communications } from '../api';

const router = useRouter();
const followupCount = ref(0);

const userInitial = computed(() => (store.user?.displayName || 'U')[0].toUpperCase());

// True when on mobile AND sidebar is open (not collapsed)
const isMobileOpen = computed(() => {
  if (typeof window === 'undefined') return false;
  return window.innerWidth <= 768 && store.sidebarOpen;
});

async function logout() {
  try {
    await auth.logout();
  } finally {
    store.setUser(null);
    router.push('/login');
  }
}

onMounted(async () => {
  try {
    const res = await communications.followups();
    followupCount.value = res.data.length;
  } catch {}
});
</script>

<style scoped>
.sidebar {
  width: var(--sidebar-width);
  background: var(--bg-secondary);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  height: 100vh;
  flex-shrink: 0;
  transition: width var(--transition-slow);
  overflow: hidden;
}

.sidebar.collapsed { width: 60px; }

.sidebar-logo {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 20px 16px;
  border-bottom: 1px solid var(--border-subtle);
}

.logo-mark {
  width: 32px; height: 32px;
  background: var(--accent-blue);
  border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  font-weight: 800; font-size: 16px; color: white;
  flex-shrink: 0;
}

.logo-text {
  font-size: 16px;
  font-weight: 800;
  letter-spacing: 0.08em;
  color: var(--text-primary);
  white-space: nowrap;
}

.logo-sub {
  font-size: 10px;
  font-weight: 600;
  color: var(--accent-blue);
  background: var(--accent-blue-dim);
  padding: 2px 5px;
  border-radius: 4px;
  letter-spacing: 0.05em;
  white-space: nowrap;
}

.sidebar-nav {
  flex: 1;
  padding: 12px 8px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 10px;
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  font-size: 13.5px;
  font-weight: 500;
  text-decoration: none;
  transition: all var(--transition);
  white-space: nowrap;
  position: relative;
}

.nav-item svg { width: 17px; height: 17px; flex-shrink: 0; }

.nav-item:hover {
  background: var(--bg-card);
  color: var(--text-primary);
  text-decoration: none;
}

.nav-item.active {
  background: var(--accent-blue-dim);
  color: var(--accent-blue);
}

.nav-badge {
  margin-left: auto;
  background: var(--accent-blue-dim);
  color: var(--accent-blue);
  font-size: 10px;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: var(--radius-full);
}

.sidebar-user {
  padding: 12px 12px;
  border-top: 1px solid var(--border-subtle);
  display: flex;
  align-items: center;
  gap: 10px;
}

.user-avatar {
  width: 32px; height: 32px;
  background: linear-gradient(135deg, var(--accent-blue), #6366f1);
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 13px; font-weight: 700; color: white;
  flex-shrink: 0;
}

.user-info { flex: 1; min-width: 0; }
.user-name { font-size: 13px; font-weight: 600; color: var(--text-primary); }
.user-role { font-size: 11px; color: var(--text-muted); }

.logout-btn { margin-left: auto; flex-shrink: 0; }

@media (max-width: 768px) {
  .sidebar {
    position: fixed;
    z-index: 100;
    transform: translateX(-100%);
    transition: transform var(--transition-slow);
  }
  .sidebar:not(.collapsed) { transform: translateX(0); }
}

.sidebar-backdrop {
  display: none;
}

@media (max-width: 768px) {
  .sidebar-backdrop {
    display: block;
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 99;
    backdrop-filter: blur(2px);
  }
}

.followup-badge {
  background: var(--warning-dim);
  color: var(--warning);
}

/* Collapsed state — hide all text labels completely */
.sidebar.collapsed .logo-text,
.sidebar.collapsed .logo-sub,
.sidebar.collapsed .nav-item > span,
.sidebar.collapsed .user-info,
.sidebar.collapsed .logout-btn {
  display: none;
}

.sidebar.collapsed .nav-item {
  justify-content: center;
  padding: 10px;
}

.sidebar.collapsed .sidebar-logo {
  justify-content: center;
  padding: 20px 0;
}

.sidebar.collapsed .sidebar-user {
  justify-content: center;
  padding: 12px 0;
}
</style>
