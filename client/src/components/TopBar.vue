<template>
  <header class="topbar">
    <div class="topbar-left">
      <button class="btn btn-ghost btn-icon btn-sm" @click="store.toggleSidebar()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="18" height="18">
          <line x1="3" y1="6" x2="21" y2="6"/>
          <line x1="3" y1="12" x2="21" y2="12"/>
          <line x1="3" y1="18" x2="21" y2="18"/>
        </svg>
      </button>
      <h1 class="page-title">{{ currentPageTitle }}</h1>
    </div>

    <div class="topbar-right">
      <div class="search-wrap">
        <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="15" height="15">
          <circle cx="11" cy="11" r="8"/>
          <line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          type="text"
          class="topbar-search"
          placeholder="Search leads..."
          v-model="searchQuery"
          @keydown.enter="goSearch"
          @keydown.escape="searchQuery = ''"
        />
      </div>

      <ThemeToggle />

      <button class="btn btn-primary btn-sm" @click="$emit('new-lead')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
          <line x1="12" y1="5" x2="12" y2="19"/>
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        New Lead
      </button>
    </div>
  </header>
  <NewLeadModal v-if="showNewLead" @close="showNewLead = false" @created="onLeadCreated" />
</template>

<script setup>
import { ref, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { store } from '../store';
import ThemeToggle from './ThemeToggle.vue';
import NewLeadModal from './NewLeadModal.vue';

const route = useRoute();
const router = useRouter();
const searchQuery = ref('');
const showNewLead = ref(false);

const PAGE_TITLES = {
  Dashboard: 'Dashboard',
  Leads: 'Leads',
  LeadProfile: 'Lead Profile',
  ResearchReport: 'Research Report',
  Communications: 'Communications',
  Settings: 'Settings',
  Archives: 'Archives',
};

const currentPageTitle = computed(() => PAGE_TITLES[route.name] || 'NESVR CRM');

function goSearch() {
  if (searchQuery.value.trim()) {
    router.push({ path: '/leads', query: { search: searchQuery.value.trim() } });
    searchQuery.value = '';
  }
}

function onLeadCreated(lead) {
  showNewLead.value = false;
  store.addToast(`Lead "${lead.business_name}" created`, 'success');
  router.push(`/leads/${lead.id}`);
}

defineEmits(['new-lead']);
</script>

<style scoped>
.topbar {
  height: var(--topbar-height);
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  gap: 16px;
  flex-shrink: 0;
}

.topbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.page-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.search-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 10px;
  color: var(--text-muted);
  pointer-events: none;
}

.topbar-search {
  width: 220px;
  padding: 7px 12px 7px 34px;
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  font-size: 13px;
  outline: none;
  transition: all var(--transition);
}

.topbar-search:focus {
  border-color: var(--border-focus);
  box-shadow: 0 0 0 3px var(--accent-blue-dim);
  width: 280px;
}

.topbar-search::placeholder { color: var(--text-muted); }

@media (max-width: 768px) {
  .topbar-search { width: 160px; }
  .topbar-search:focus { width: 180px; }
}
</style>
