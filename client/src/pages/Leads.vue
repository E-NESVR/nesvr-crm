<template>
  <div class="leads-page">
    <!-- Filter bar -->
    <div class="filter-bar card">
      <div class="filter-search">
        <span class="search-icon-wrap">
          <span v-if="loading && filters.search" class="spinner" style="width:14px;height:14px;border-width:2px"></span>
          <svg v-else class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="15" height="15">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
        </span>
        <input ref="searchInputRef" type="text" class="filter-input" placeholder="Search by name, phone, or category… (press / to focus)" v-model="filters.search" @input="onSearchInput" />
        <button v-if="filters.search" class="clear-btn" @click="filters.search = ''; fetchLeads()">✕</button>
      </div>

      <div class="filter-selects">
        <select class="form-select filter-select" v-model="filters.tier" @change="fetchLeads">
          <option value="">All Tiers</option>
          <option value="Tier 1 - High Priority">Tier 1</option>
          <option value="Tier 2 - Medium Priority">Tier 2</option>
          <option value="Tier 3 - Low Priority">Tier 3</option>
        </select>

        <select class="form-select filter-select" v-model="filters.category" @change="fetchLeads">
          <option value="">All Categories</option>
          <option v-for="cat in categories" :key="cat">{{ cat }}</option>
        </select>

        <select class="form-select filter-select" v-model="filters.status" @change="fetchLeads">
          <option value="">All Statuses</option>
          <option value="new">New</option>
          <option value="contacted">Contacted</option>
          <option value="no_answer">No Answer</option>
          <option value="researched">Researched</option>
          <option value="demo_booked">Demo Booked</option>
          <option value="closed_won">Closed Won</option>
          <option value="cold">Cold</option>
        </select>

        <select class="form-select filter-select" v-model="filters.contact_quality" @change="fetchLeads">
          <option value="">All Quality</option>
          <option value="Complete">Complete</option>
          <option value="Phone Only">Phone Only</option>
        </select>

        <button class="btn btn-secondary btn-sm" @click="exportLeads">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="14" height="14">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Export
        </button>
      </div>

      <!-- Saved filter presets -->
      <div class="preset-row" v-if="presets.length > 0 || hasActiveFilters">
        <span class="preset-label">Presets:</span>
        <button
          v-for="preset in presets"
          :key="preset.name"
          class="preset-btn"
          :class="{ active: activePreset === preset.name }"
          @click="applyPreset(preset)"
        >{{ preset.name }}</button>
        <button v-if="hasActiveFilters" class="preset-btn save-btn" @click="showSavePreset = true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="11" height="11"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Save filters
        </button>
        <button v-if="activePreset" class="preset-btn delete-btn" @click="deletePreset(activePreset)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="11" height="11"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
    </div>

    <!-- Bulk actions bar -->
    <Transition name="slide-down">
      <div class="bulk-bar card" v-if="selectedIds.size > 0">
        <span class="bulk-count">{{ selectedIds.size }} lead{{ selectedIds.size !== 1 ? 's' : '' }} selected</span>

        <!-- Bulk status change -->
        <select class="form-select bulk-status-select" v-model="bulkStatusValue" @change="bulkChangeStatus">
          <option value="">Set status…</option>
          <option value="new">New</option>
          <option value="contacted">Contacted</option>
          <option value="no_answer">No Answer</option>
          <option value="researched">Researched</option>
          <option value="demo_booked">Demo Booked</option>
          <option value="closed_won">Closed Won</option>
          <option value="cold">Cold</option>
        </select>

        <button class="btn btn-primary btn-sm" @click="queueResearch" :disabled="queueRunning">
          <span class="spinner" style="width:12px;height:12px;border-width:2px" v-if="queueRunning"></span>
          <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          {{ queueRunning ? `Researching… (${queueStatus.completed}/${queueStatus.total})` : `Queue Research (${selectedIds.size})` }}
        </button>
        <button class="btn btn-ghost btn-sm" @click="selectedIds.clear()">Clear</button>
      </div>
    </Transition>

    <!-- Table -->
    <div class="table-card card">
      <div class="table-header">
        <div class="table-meta">
          <span class="text-secondary text-sm" v-if="!loading">
            {{ total.toLocaleString() }} lead{{ total !== 1 ? 's' : '' }}
          </span>
        </div>
      </div>

      <div v-if="loading" class="table-loading">
        <div v-for="i in 8" :key="i" class="skeleton-row">
          <div class="skeleton" style="width:24px;height:16px"></div>
          <div class="skeleton" style="width:200px;height:16px"></div>
          <div class="skeleton" style="width:120px;height:16px"></div>
          <div class="skeleton" style="width:80px;height:20px;border-radius:99px"></div>
          <div class="skeleton" style="width:100px;height:8px"></div>
          <div class="skeleton" style="width:80px;height:20px;border-radius:99px"></div>
        </div>
      </div>

      <div v-else-if="leadsList.length === 0" class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 00-3-3.87"/>
          <path d="M16 3.13a4 4 0 010 7.75"/>
        </svg>
        <h3>No leads found</h3>
        <p>Try adjusting your filters or add a new lead.</p>
      </div>

      <div v-else class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th style="width:36px">
                <input type="checkbox" :checked="allSelected" @change="toggleAll" />
              </th>
              <th @click="setSort('business_name')">
                Company
                <SortIcon :field="'business_name'" :current="sort" :order="sortOrder" />
              </th>
              <th class="hide-mobile">Contact</th>
              <th @click="setSort('priority_tier')">
                Tier
                <SortIcon :field="'priority_tier'" :current="sort" :order="sortOrder" />
              </th>
              <th @click="setSort('lead_score')">
                Score
                <SortIcon :field="'lead_score'" :current="sort" :order="sortOrder" />
              </th>
              <th @click="setSort('lead_status')">
                Status
                <SortIcon :field="'lead_status'" :current="sort" :order="sortOrder" />
              </th>
              <th class="hide-mobile">Research</th>
              <th class="hide-mobile" @click="setSort('updated_at')">Last Active</th>
              <th style="width:88px"></th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="lead in leadsList"
              :key="lead.id"
              class="lead-row"
              @click.stop="goToLead(lead.id)"
              style="cursor:pointer"
            >
              <td @click.stop>
                <input type="checkbox" :checked="selectedIds.has(lead.id)" @change="toggleSelect(lead.id)" />
              </td>
              <td>
                <div class="company-cell">
                  <span class="company-name">{{ lead.business_name }}</span>
                  <span class="category-tag" v-if="lead.category">{{ lead.category }}</span>
                </div>
              </td>
              <td class="hide-mobile">
                <div class="contact-cell">
                  <a v-if="lead.phone" :href="`tel:${lead.phone}`" class="contact-item contact-link" @click.stop>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="11" height="11">
                      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 012.12 4.18 2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
                    </svg>
                    {{ lead.phone }}
                  </a>
                  <span v-if="lead.email" class="contact-item email-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="11" height="11">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                    </svg>
                    {{ lead.email }}
                  </span>
                </div>
              </td>
              <td>
                <span class="badge" :class="tierClass(lead.priority_tier)">
                  {{ tierShort(lead.priority_tier) }}
                </span>
              </td>
              <td>
                <div class="score-bar" style="min-width:80px">
                  <div class="score-bar-track" style="flex:1">
                    <div class="score-bar-fill" :class="scoreClass(lead.lead_score)" :style="`width:${lead.lead_score}%`"></div>
                  </div>
                  <span class="score-label">{{ lead.lead_score }}</span>
                </div>
              </td>
              <td>
                <span class="badge" :class="`badge-${lead.lead_status}`">
                  {{ formatStatus(lead.lead_status) }}
                </span>
              </td>
              <td class="hide-mobile">
                <span v-if="lead.research_status === 'complete'" class="research-badge done">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="11" height="11">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  Report
                </span>
                <span v-else-if="lead.research_status === 'running'" class="research-badge running">
                  <span class="spinner" style="width:10px;height:10px;border-width:1.5px"></span>
                  Running
                </span>
                <span v-else class="research-badge none">—</span>
              </td>
              <td class="hide-mobile text-sm text-muted">
                {{ formatDate(lead.last_activity_at || lead.updated_at) }}
              </td>
              <!-- Row quick actions -->
              <td class="row-actions" @click.stop>
                <button
                  class="row-action-btn"
                  title="Quick note"
                  @click.stop="openQuickNote(lead)"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="13" height="13">
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </button>
                <button
                  class="row-action-btn"
                  title="Enrich from web"
                  :disabled="enrichingId === lead.id"
                  @click.stop="enrichLead(lead)"
                >
                  <span v-if="enrichingId === lead.id" class="spinner" style="width:11px;height:11px;border-width:1.5px"></span>
                  <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="13" height="13">
                    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    <line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
                  </svg>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div class="table-footer" v-if="pages > 1">
        <div class="pagination">
          <button class="page-btn" :disabled="currentPage === 1" @click="goPage(1)">«</button>
          <button class="page-btn" :disabled="currentPage === 1" @click="goPage(currentPage - 1)">‹</button>
          <button
            v-for="p in visiblePages"
            :key="p"
            class="page-btn"
            :class="{ active: p === currentPage }"
            @click="goPage(p)"
          >{{ p }}</button>
          <button class="page-btn" :disabled="currentPage === pages" @click="goPage(currentPage + 1)">›</button>
          <button class="page-btn" :disabled="currentPage === pages" @click="goPage(pages)">»</button>
        </div>
        <span class="text-muted text-sm">Page {{ currentPage }} of {{ pages }}</span>
      </div>
    </div>
  </div>

  <!-- Quick Note Modal -->
  <Modal v-if="quickNoteTarget" title="Quick Note" size="sm" @close="quickNoteTarget = null">
    <div class="quick-note-lead">
      <strong>{{ quickNoteTarget.business_name }}</strong>
      <span class="text-muted text-sm">{{ quickNoteTarget.category }}</span>
    </div>
    <div class="form-group mt-3">
      <label class="form-label">Note</label>
      <textarea class="form-textarea" v-model="quickNoteText" ref="quickNoteRef" rows="4" placeholder="What happened? Next steps?" />
    </div>
    <template #footer>
      <button class="btn btn-secondary" @click="quickNoteTarget = null">Cancel</button>
      <button class="btn btn-primary" @click="submitQuickNote" :disabled="!quickNoteText.trim() || quickNoteSaving">
        <span class="spinner" style="width:14px;height:14px;border-width:2px" v-if="quickNoteSaving"></span>
        {{ quickNoteSaving ? 'Saving…' : 'Save Note' }}
      </button>
    </template>
  </Modal>

  <!-- Save Preset Modal -->
  <Modal v-if="showSavePreset" title="Save Filter Preset" size="sm" @close="showSavePreset = false">
    <div class="form-group">
      <label class="form-label">Preset Name</label>
      <input class="form-input" v-model="presetName" placeholder="e.g. Tier 1 No Answer" @keydown.enter="savePreset" />
    </div>
    <template #footer>
      <button class="btn btn-secondary" @click="showSavePreset = false">Cancel</button>
      <button class="btn btn-primary" @click="savePreset" :disabled="!presetName.trim()">Save</button>
    </template>
  </Modal>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted, computed, watch, nextTick, h } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { leads as leadsApi, research as researchApi } from '../api';
import { store } from '../store';
import Modal from '../components/Modal.vue';

const router = useRouter();
const route = useRoute();

const leadsList = ref([]);
const categories = ref([]);
const loading = ref(true);
const total = ref(0);
const pages = ref(1);
const currentPage = ref(1);
const sort = ref('updated_at');
const sortOrder = ref('desc');
const selectedIds = reactive(new Set());

const searchInputRef = ref(null);
const queueRunning = ref(false);
const queueStatus = ref({ completed: 0, total: 0 });

// Bulk status
const bulkStatusValue = ref('');

// Enrich
const enrichingId = ref(null);

// Quick note
const quickNoteTarget = ref(null);
const quickNoteText = ref('');
const quickNoteRef = ref(null);
const quickNoteSaving = ref(false);

// Filter presets
const presets = ref(JSON.parse(localStorage.getItem('lead-filter-presets') || '[]'));
const activePreset = ref('');
const showSavePreset = ref(false);
const presetName = ref('');

const filters = reactive({
  search: route.query.search || '',
  tier: '',
  category: '',
  status: '',
  contact_quality: '',
});

const hasActiveFilters = computed(() =>
  filters.tier || filters.category || filters.status || filters.contact_quality
);

let searchTimer = null;
function onSearchInput() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(fetchLeads, 300);
}

async function fetchLeads() {
  loading.value = true;
  try {
    const res = await leadsApi.list({
      search: filters.search,
      tier: filters.tier,
      category: filters.category,
      status: filters.status,
      contact_quality: filters.contact_quality,
      page: currentPage.value,
      limit: 50,
      sort: sort.value,
      order: sortOrder.value,
    });
    leadsList.value = res.data.leads;
    total.value = res.data.total;
    pages.value = res.data.pages;
  } catch (err) {
    store.addToast('Failed to load leads', 'error');
  } finally {
    loading.value = false;
  }
}

async function loadCategories() {
  try {
    const res = await leadsApi.categories();
    categories.value = res.data;
  } catch {}
}

function goToLead(id) { router.push(`/leads/${id}`); }

function setSort(field) {
  if (sort.value === field) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
  } else {
    sort.value = field;
    sortOrder.value = 'desc';
  }
  fetchLeads();
}

function goPage(p) {
  currentPage.value = p;
  fetchLeads();
}

const allSelected = computed(() =>
  leadsList.value.length > 0 && leadsList.value.every(l => selectedIds.has(l.id))
);

function toggleAll(e) {
  if (e.target.checked) {
    leadsList.value.forEach(l => selectedIds.add(l.id));
  } else {
    selectedIds.clear();
  }
}

function toggleSelect(id) {
  if (selectedIds.has(id)) selectedIds.delete(id);
  else selectedIds.add(id);
}

const visiblePages = computed(() => {
  const p = currentPage.value;
  const total = pages.value;
  const range = [];
  for (let i = Math.max(1, p - 2); i <= Math.min(total, p + 2); i++) range.push(i);
  return range;
});

async function queueResearch() {
  if (queueRunning.value) return;
  const ids = Array.from(selectedIds);
  queueRunning.value = true;
  queueStatus.value = { completed: 0, total: ids.length };
  store.addToast(`Starting research for ${ids.length} leads...`, 'info');

  let pollInterval = null;
  try {
    await researchApi.startQueue(ids);
    pollInterval = setInterval(async () => {
      try {
        const res = await researchApi.queueStatus();
        queueStatus.value = res.data;
        if (!res.data.running) {
          clearInterval(pollInterval);
          queueRunning.value = false;
          selectedIds.clear();
          store.addToast(`Research complete for ${ids.length} leads`, 'success');
          fetchLeads();
        }
      } catch {
        clearInterval(pollInterval);
        queueRunning.value = false;
        store.addToast('Lost connection to research queue', 'error');
      }
    }, 1500);
  } catch (err) {
    store.addToast('Failed to start research queue', 'error');
    queueRunning.value = false;
  }
}

async function bulkChangeStatus() {
  if (!bulkStatusValue.value) return;
  const status = bulkStatusValue.value;
  const ids = Array.from(selectedIds);

  if (status === 'cold') {
    const ok = window.confirm(`Mark ${ids.length} lead${ids.length !== 1 ? 's' : ''} as Cold? This removes them from your active pipeline.`);
    if (!ok) { bulkStatusValue.value = ''; return; }
  }

  try {
    await leadsApi.bulkStatus(ids, status);
    store.addToast(`${ids.length} lead${ids.length !== 1 ? 's' : ''} marked as ${formatStatus(status)}`, 'success');
    selectedIds.clear();
    bulkStatusValue.value = '';
    fetchLeads();
  } catch {
    store.addToast('Failed to update status', 'error');
    bulkStatusValue.value = '';
  }
}

async function enrichLead(lead) {
  enrichingId.value = lead.id;
  try {
    const res = await leadsApi.enrich(lead.id);
    if (res.data.skipped) {
      store.addToast('Google Search API not configured — enrichment unavailable', 'warning');
    } else if (res.data.found?.length > 0) {
      store.addToast(`Enriched: found ${res.data.found.join(', ')} for ${lead.business_name}`, 'success');
      fetchLeads();
    } else {
      store.addToast(`No new data found for ${lead.business_name}`, 'info');
    }
  } catch {
    store.addToast('Enrichment failed', 'error');
  } finally {
    enrichingId.value = null;
  }
}

function openQuickNote(lead) {
  quickNoteTarget.value = lead;
  quickNoteText.value = '';
  nextTick(() => quickNoteRef.value?.focus());
}

async function submitQuickNote() {
  if (!quickNoteText.value.trim() || !quickNoteTarget.value) return;
  quickNoteSaving.value = true;
  try {
    await leadsApi.logActivity(quickNoteTarget.value.id, {
      activity_type: 'note',
      description: quickNoteText.value.trim(),
    });
    store.addToast(`Note saved for ${quickNoteTarget.value.business_name}`, 'success');
    quickNoteTarget.value = null;
    quickNoteText.value = '';
  } catch {
    store.addToast('Failed to save note', 'error');
  } finally {
    quickNoteSaving.value = false;
  }
}

// Filter presets
function applyPreset(preset) {
  activePreset.value = preset.name;
  filters.tier = preset.filters.tier || '';
  filters.category = preset.filters.category || '';
  filters.status = preset.filters.status || '';
  filters.contact_quality = preset.filters.contact_quality || '';
  fetchLeads();
}

function savePreset() {
  if (!presetName.value.trim()) return;
  const newPreset = {
    name: presetName.value.trim(),
    filters: {
      tier: filters.tier,
      category: filters.category,
      status: filters.status,
      contact_quality: filters.contact_quality,
    },
  };
  presets.value = [...presets.value.filter(p => p.name !== newPreset.name), newPreset];
  localStorage.setItem('lead-filter-presets', JSON.stringify(presets.value));
  activePreset.value = newPreset.name;
  showSavePreset.value = false;
  presetName.value = '';
  store.addToast(`Preset "${newPreset.name}" saved`, 'success');
}

function deletePreset(name) {
  presets.value = presets.value.filter(p => p.name !== name);
  localStorage.setItem('lead-filter-presets', JSON.stringify(presets.value));
  activePreset.value = '';
}

function exportLeads() {
  leadsApi.export({
    search: filters.search,
    tier: filters.tier,
    category: filters.category,
    status: filters.status,
    contact_quality: filters.contact_quality,
  });
}

// Formatters
function tierShort(tier) {
  if (!tier) return '—';
  if (tier.includes('1')) return 'T1';
  if (tier.includes('2')) return 'T2';
  return 'T3';
}
function tierClass(tier) {
  if (!tier) return 'badge-tier3';
  if (tier.includes('1')) return 'badge-tier1';
  if (tier.includes('2')) return 'badge-tier2';
  return 'badge-tier3';
}
function scoreClass(s) {
  if (s >= 70) return 'high';
  if (s >= 40) return 'mid';
  return 'low';
}
function formatStatus(s) {
  const map = { new: 'New', contacted: 'Contacted', no_answer: 'No Answer', researched: 'Researched', demo_booked: 'Demo Booked', closed_won: 'Won', cold: 'Cold' };
  return map[s] || s;
}
function formatDate(d) {
  if (!d) return '—';
  const date = new Date(d);
  const now = new Date();
  const diff = now - date;
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// SortIcon inline component
const SortIcon = (props) => {
  if (props.current !== props.field) return h('span', { style: 'opacity:0.3;margin-left:4px' }, '↕');
  return h('span', { style: 'margin-left:4px' }, props.order === 'asc' ? '↑' : '↓');
};

function onSlashKey(e) {
  if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA' && document.activeElement?.tagName !== 'SELECT') {
    e.preventDefault();
    searchInputRef.value?.focus();
  }
}

onMounted(() => {
  fetchLeads();
  loadCategories();
  window.addEventListener('keydown', onSlashKey);
});

onUnmounted(() => {
  window.removeEventListener('keydown', onSlashKey);
});

watch(() => route.query.search, (val) => {
  if (val) { filters.search = val; fetchLeads(); }
});
</script>

<style scoped>
.leads-page { display: flex; flex-direction: column; gap: 16px; }

.filter-bar {
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.filter-search {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon-wrap {
  position: absolute;
  left: 12px;
  display: flex;
  align-items: center;
  pointer-events: none;
}

.search-icon { color: var(--text-muted); }

.filter-input {
  width: 100%;
  padding: 9px 36px;
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  font-size: 14px;
  outline: none;
  transition: border-color var(--transition);
}
.filter-input:focus { border-color: var(--border-focus); box-shadow: 0 0 0 3px var(--accent-blue-dim); }
.filter-input::placeholder { color: var(--text-muted); }

.clear-btn {
  position: absolute;
  right: 10px;
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 4px;
  font-size: 12px;
  border-radius: 4px;
}
.clear-btn:hover { color: var(--text-primary); background: var(--bg-secondary); }

.filter-selects {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
}

.filter-select { min-width: 130px; flex: 1; max-width: 200px; }

/* Presets */
.preset-row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.preset-label { font-size: 11px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
.preset-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px;
  border-radius: var(--radius-full);
  font-size: 12px;
  font-weight: 500;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition);
}
.preset-btn:hover { border-color: var(--accent-blue); color: var(--accent-blue); }
.preset-btn.active { background: var(--accent-blue-dim); border-color: var(--accent-blue); color: var(--accent-blue); }
.preset-btn.save-btn { border-style: dashed; }
.preset-btn.delete-btn { padding: 3px 7px; color: var(--danger); border-color: var(--danger-dim); background: var(--danger-dim); }

/* Bulk bar */
.bulk-bar {
  padding: 10px 16px;
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--accent-blue-dim);
  border-color: var(--accent-blue);
  flex-wrap: wrap;
}
.bulk-count { font-size: 13px; font-weight: 600; color: var(--accent-blue); white-space: nowrap; }
.bulk-status-select {
  width: auto;
  min-width: 130px;
  padding: 4px 8px;
  font-size: 12px;
}

.table-card { overflow: hidden; }
.table-header { padding: 12px 16px; border-bottom: 1px solid var(--border-subtle); }
.table-meta { display: flex; align-items: center; gap: 12px; }

.table-loading { padding: 20px 16px; display: flex; flex-direction: column; gap: 12px; }
.skeleton-row { display: flex; align-items: center; gap: 16px; padding: 4px 0; }

.table-wrap { overflow-x: auto; }

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

.contact-cell { display: flex; flex-direction: column; gap: 3px; }
.contact-item {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: var(--text-secondary);
}
.contact-link {
  color: var(--text-secondary);
  text-decoration: none;
  transition: color var(--transition);
}
.contact-link:hover { color: var(--accent-blue); text-decoration: none; }
.email-item { color: var(--text-muted); }

.research-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 500;
  padding: 2px 8px;
  border-radius: var(--radius-full);
}
.research-badge.done { background: var(--success-dim); color: var(--success); }
.research-badge.running { background: var(--warning-dim); color: var(--warning); }
.research-badge.none { color: var(--text-muted); }

/* Row quick actions */
.row-actions {
  padding: 8px 10px;
}
.row-action-btn {
  background: none;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  color: var(--text-muted);
  cursor: pointer;
  padding: 4px 5px;
  transition: all var(--transition);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.row-action-btn:hover:not(:disabled) {
  color: var(--accent-blue);
  background: var(--accent-blue-dim);
  border-color: var(--accent-blue-dim);
}
.row-action-btn:disabled { opacity: 0.4; cursor: not-allowed; }

.table-footer {
  padding: 12px 16px;
  border-top: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

/* Quick note */
.quick-note-lead {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  margin-bottom: 4px;
}

/* Transitions */
.slide-down-enter-active, .slide-down-leave-active { transition: all 0.2s ease; }
.slide-down-enter-from { opacity: 0; transform: translateY(-8px); }
.slide-down-leave-to { opacity: 0; transform: translateY(-8px); }
</style>
