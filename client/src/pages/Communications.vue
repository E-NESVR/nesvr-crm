<template>
  <div class="comms-page">
    <div class="comms-grid">
      <!-- LEFT: Email Composer -->
      <div class="card composer-card">
        <div class="card-header">
          <span class="card-title">Email Composer</span>
        </div>
        <div class="card-body composer-body">

          <div class="form-group">
            <label class="form-label">Template</label>
            <select class="form-select" v-model="selectedTemplate" @change="applyTemplate">
              <option value="">Select a template...</option>
              <option v-for="t in templates" :key="t.key" :value="t.key">{{ t.name }}</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">Lead</label>
            <div class="lead-search-wrap">
              <input
                class="form-input"
                type="text"
                v-model="leadSearch"
                placeholder="Search for a lead..."
                @input="searchLeads"
                @focus="showLeadDropdown = true"
              />
              <div class="lead-dropdown" v-if="showLeadDropdown && leadSuggestions.length">
                <div
                  v-for="lead in leadSuggestions"
                  :key="lead.id"
                  class="lead-option"
                  @click="selectLead(lead)"
                >
                  <span class="lead-option-name">{{ lead.business_name }}</span>
                  <span class="lead-option-cat text-muted text-sm">{{ lead.category }}</span>
                </div>
              </div>
            </div>
            <div class="selected-lead-pill" v-if="selectedLead">
              <span>{{ selectedLead.business_name }}</span>
              <button @click="clearLead" class="pill-close">✕</button>
            </div>
          </div>

          <div class="merge-tags">
            <span class="form-label">Merge Tags</span>
            <div class="tag-row">
              <button v-for="tag in mergeTags" :key="tag" class="merge-tag" @click="insertTag(tag)">{{ tag }}</button>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Subject</label>
            <input class="form-input" type="text" v-model="subject" placeholder="Email subject line" />
          </div>

          <div class="form-group">
            <label class="form-label">Body</label>
            <textarea
              class="form-textarea"
              v-model="body"
              ref="bodyRef"
              rows="12"
              placeholder="Email body..."
            />
          </div>

          <div class="composer-actions">
            <button class="btn btn-secondary" @click="generateAI" :disabled="generatingAI || !selectedLead">
              <span class="spinner" style="width:14px;height:14px;border-width:2px" v-if="generatingAI"></span>
              <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="14" height="14"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
              {{ generatingAI ? 'Generating...' : 'Generate with AI' }}
            </button>
            <button class="btn btn-secondary" @click="copyToClipboard">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="14" height="14"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
              Copy
            </button>
            <button class="btn btn-primary" @click="openInEmail" :disabled="!selectedLead">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="14" height="14"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
              Open in Email
            </button>
          </div>
        </div>
      </div>

      <!-- CENTER: Activity Feed -->
      <div class="card feed-card">
        <div class="card-header">
          <span class="card-title">Recent Activity</span>
        </div>
        <div class="card-body feed-body">
          <div v-if="activityLoading" class="empty-state" style="padding:20px 0"><div class="spinner"></div></div>
          <div v-else-if="recentActivities.length === 0" class="empty-state" style="padding:20px 0">
            <p>No activity yet.</p>
          </div>
          <div v-else>
            <div v-for="item in recentActivities" :key="item.id" class="feed-item" @click="$router.push(`/leads/${item.lead_id}`)">
              <div class="feed-dot" :class="`dot-${item.activity_type}`"></div>
              <div class="feed-content">
                <span class="feed-lead">{{ item.business_name }}</span>
                <span class="feed-desc">{{ item.description }}</span>
              </div>
              <div class="feed-meta">
                <span class="feed-user">{{ capitalize(item.user) }}</span>
                <span class="feed-time">{{ timeAgo(item.created_at) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- RIGHT: Follow-ups -->
      <div class="card followups-card">
        <div class="card-header">
          <span class="card-title">Upcoming Follow-ups</span>
        </div>
        <div class="card-body followups-body">
          <div v-if="followupLoading" class="empty-state" style="padding:20px 0"><div class="spinner"></div></div>
          <div v-else-if="followups.length === 0" class="empty-state" style="padding:20px 0">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="32" height="32"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            <p>No follow-ups scheduled.</p>
          </div>
          <div v-else>
            <div v-for="item in followups" :key="item.id" class="followup-item" @click="$router.push(`/leads/${item.lead_id}`)">
              <div class="followup-date">
                <div class="date-day">{{ getDay(item.follow_up_date) }}</div>
                <div class="date-month">{{ getMonth(item.follow_up_date) }}</div>
              </div>
              <div class="followup-content">
                <div class="followup-lead">{{ item.business_name }}</div>
                <div class="followup-who text-muted text-sm">{{ capitalize(item.logged_by) }}</div>
                <div class="followup-notes text-secondary text-sm" v-if="item.notes">{{ item.notes }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { leads as leadsApi, research as researchApi, activities as activitiesApi, communications as commsApi } from '../api';
import { store } from '../store';

const router = useRouter();

const templates = ref([]);
const selectedTemplate = ref('');
const selectedLead = ref(null);
const leadSearch = ref('');
const leadSuggestions = ref([]);
const showLeadDropdown = ref(false);
const subject = ref('');
const body = ref('');
const bodyRef = ref(null);
const generatingAI = ref(false);

const recentActivities = ref([]);
const activityLoading = ref(false);
const followups = ref([]);
const followupLoading = ref(false);

const mergeTags = ['{first_name}', '{company_name}', '{category}', '{city}', '{pain_point}'];

let searchTimer = null;
async function searchLeads() {
  clearTimeout(searchTimer);
  if (!leadSearch.value.trim()) { leadSuggestions.value = []; return; }
  searchTimer = setTimeout(async () => {
    try {
      const res = await leadsApi.list({ search: leadSearch.value, limit: 8 });
      leadSuggestions.value = res.data.leads;
    } catch {}
  }, 250);
}

function selectLead(lead) {
  selectedLead.value = lead;
  leadSearch.value = '';
  leadSuggestions.value = [];
  showLeadDropdown.value = false;
  if (selectedTemplate.value) applyTemplate();
}

function clearLead() { selectedLead.value = null; }

function applyTemplate() {
  const tmpl = templates.value.find(t => t.key === selectedTemplate.value);
  if (!tmpl) return;
  subject.value = applyMerge(tmpl.subject);
  body.value = applyMerge(tmpl.body);
}

function applyMerge(text) {
  if (!selectedLead.value) return text;
  const lead = selectedLead.value;
  const firstName = (lead.business_name || '').split(' ')[0];
  return text
    .replace(/{first_name}/g, firstName)
    .replace(/{company_name}/g, lead.business_name || '')
    .replace(/{category}/g, lead.category || 'your business')
    .replace(/{city}/g, lead.city || 'Jacksonville')
    .replace(/{pain_point}/g, `the challenges ${lead.category || 'your business'} faces with phone handling`);
}

function insertTag(tag) {
  if (!bodyRef.value) return;
  const el = bodyRef.value;
  const start = el.selectionStart;
  const end = el.selectionEnd;
  body.value = body.value.slice(0, start) + tag + body.value.slice(end);
  setTimeout(() => { el.selectionStart = el.selectionEnd = start + tag.length; el.focus(); }, 0);
}

async function generateAI() {
  if (!selectedLead.value) { store.addToast('Select a lead first', 'warning'); return; }
  generatingAI.value = true;
  try {
    const res = await researchApi.generateEmail(selectedLead.value.id, { template: selectedTemplate.value || 'cold_intro' });
    subject.value = res.data.subject;
    body.value = res.data.body;
    store.addToast(res.data.aiGenerated ? 'AI email generated!' : 'Template applied (configure API key for AI generation)', 'success');
  } catch (err) {
    store.addToast('Failed to generate email', 'error');
  } finally {
    generatingAI.value = false;
  }
}

function copyToClipboard() {
  const text = `Subject: ${subject.value}\n\n${body.value}`;
  navigator.clipboard.writeText(text).then(() => store.addToast('Copied to clipboard', 'success'));
}

function openInEmail() {
  if (!selectedLead.value?.email) { store.addToast('Lead has no email address on file', 'warning'); return; }
  const mailto = `mailto:${selectedLead.value.email}?subject=${encodeURIComponent(subject.value)}&body=${encodeURIComponent(body.value)}`;
  window.location.href = mailto;
}

function capitalize(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }

function timeAgo(d) {
  const diff = new Date() - new Date(d);
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m`;
  if (hours < 24) return `${hours}h`;
  return `${days}d`;
}

function getDay(d) { return new Date(d + 'T12:00:00').getDate(); }
function getMonth(d) { return new Date(d + 'T12:00:00').toLocaleString('en-US', { month: 'short' }); }

async function loadActivity() {
  activityLoading.value = true;
  try {
    const res = await activitiesApi.recent(30);
    recentActivities.value = res.data;
  } finally { activityLoading.value = false; }
}

async function loadFollowups() {
  followupLoading.value = true;
  try {
    const res = await commsApi.followups();
    followups.value = res.data;
  } finally { followupLoading.value = false; }
}

async function loadTemplates() {
  try {
    const res = await researchApi.templates();
    templates.value = res.data;
  } catch {}
}

onMounted(() => {
  loadTemplates();
  loadActivity();
  loadFollowups();
});

// Close dropdown on outside click
document.addEventListener('click', (e) => {
  if (!e.target.closest('.lead-search-wrap')) showLeadDropdown.value = false;
});
</script>

<style scoped>
.comms-page { height: calc(100vh - var(--topbar-height) - 48px); }

.comms-grid {
  display: grid;
  grid-template-columns: 1.4fr 1fr 0.9fr;
  gap: 16px;
  height: 100%;
}

.composer-card, .feed-card, .followups-card {
  display: flex; flex-direction: column; overflow: hidden;
}

.composer-body, .feed-body, .followups-body {
  flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 14px;
}

.lead-search-wrap { position: relative; }

.lead-dropdown {
  position: absolute; top: 100%; left: 0; right: 0;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md);
  z-index: 50;
  max-height: 200px;
  overflow-y: auto;
}

.lead-option {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 12px;
  cursor: pointer;
  font-size: 13px;
  border-bottom: 1px solid var(--border-subtle);
  transition: background var(--transition);
}
.lead-option:last-child { border-bottom: none; }
.lead-option:hover { background: var(--bg-secondary); }
.lead-option-name { font-weight: 500; color: var(--text-primary); }

.selected-lead-pill {
  display: inline-flex; align-items: center; gap: 8px;
  background: var(--accent-blue-dim); color: var(--accent-blue);
  padding: 4px 10px; border-radius: var(--radius-full);
  font-size: 12px; font-weight: 500;
  margin-top: 6px;
}
.pill-close { background: none; border: none; color: var(--accent-blue); cursor: pointer; padding: 0; line-height: 1; }

.merge-tags { display: flex; flex-direction: column; gap: 6px; }
.tag-row { display: flex; flex-wrap: wrap; gap: 6px; }
.merge-tag {
  background: var(--bg-secondary); border: 1px solid var(--border);
  color: var(--text-secondary); padding: 3px 8px;
  border-radius: var(--radius-sm); font-size: 11px; font-family: 'JetBrains Mono', monospace;
  cursor: pointer; transition: all var(--transition);
}
.merge-tag:hover { background: var(--accent-blue-dim); border-color: var(--accent-blue); color: var(--accent-blue); }

.composer-actions { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 4px; }

/* Feed */
.feed-item {
  display: flex; gap: 10px; padding: 10px 0;
  border-bottom: 1px solid var(--border-subtle);
  cursor: pointer; transition: background var(--transition);
}
.feed-item:last-child { border-bottom: none; }
.feed-item:hover { background: var(--bg-secondary); border-radius: var(--radius-sm); padding-left: 8px; }

.feed-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--text-muted); flex-shrink: 0; margin-top: 5px; }
.dot-call { background: var(--success); }
.dot-email { background: var(--accent-blue); }
.dot-research_completed { background: var(--info); }
.dot-status_change { background: var(--warning); }

.feed-content { flex: 1; min-width: 0; }
.feed-lead { font-size: 13px; font-weight: 600; color: var(--text-primary); display: block; }
.feed-desc { font-size: 11px; color: var(--text-muted); display: block; }

.feed-meta { text-align: right; flex-shrink: 0; }
.feed-user { font-size: 11px; font-weight: 600; color: var(--text-secondary); display: block; }
.feed-time { font-size: 11px; color: var(--text-muted); }

/* Follow-ups */
.followup-item {
  display: flex; gap: 12px; padding: 12px 0;
  border-bottom: 1px solid var(--border-subtle);
  cursor: pointer; transition: background var(--transition);
}
.followup-item:last-child { border-bottom: none; }
.followup-item:hover { background: var(--bg-secondary); border-radius: var(--radius-sm); padding-left: 8px; }

.followup-date {
  width: 40px; height: 40px;
  background: var(--accent-blue-dim); border-radius: var(--radius-md);
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.date-day { font-size: 16px; font-weight: 700; color: var(--accent-blue); line-height: 1; }
.date-month { font-size: 9px; font-weight: 600; color: var(--accent-blue); text-transform: uppercase; letter-spacing: 0.06em; }

.followup-content { flex: 1; min-width: 0; }
.followup-lead { font-size: 13px; font-weight: 600; color: var(--text-primary); }
.followup-who, .followup-notes { margin-top: 2px; display: block; }

@media (max-width: 1100px) {
  .comms-grid { grid-template-columns: 1fr 1fr; }
  .followups-card { grid-column: span 2; }
  .comms-page { height: auto; }
}

@media (max-width: 768px) {
  .comms-grid { grid-template-columns: 1fr; }
  .followups-card { grid-column: auto; }
}
</style>
