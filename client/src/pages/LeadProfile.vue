<template>
  <div class="lead-profile" v-if="lead">
    <!-- Back nav -->
    <div class="profile-nav">
      <router-link to="/leads" class="back-link">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="15 18 9 12 15 6"/></svg>
        All Leads
      </router-link>
      <span class="breadcrumb-sep">›</span>
      <span class="breadcrumb-current">{{ lead.business_name }}</span>
    </div>

    <div class="profile-layout">
      <!-- LEFT COLUMN -->
      <div class="profile-left">

        <!-- Company Info -->
        <div class="card company-card">
          <div class="company-header">
            <div class="company-avatar">{{ lead.business_name[0] }}</div>
            <div class="company-info">
              <h2 class="company-name">{{ lead.business_name }}</h2>
              <div class="company-tags">
                <span class="badge badge-tier1" v-if="lead.priority_tier?.includes('1')">{{ lead.priority_tier }}</span>
                <span class="badge badge-tier2" v-else-if="lead.priority_tier?.includes('2')">{{ lead.priority_tier }}</span>
                <span class="badge badge-tier3" v-else-if="lead.priority_tier">{{ lead.priority_tier }}</span>
                <span class="cat-badge" v-if="lead.category" @click="$router.push(`/leads?category=${encodeURIComponent(lead.category)}`)">{{ lead.category }}</span>
              </div>
            </div>
          </div>

          <div class="info-grid">
            <div class="info-row" v-if="lead.phone">
              <div class="info-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="14" height="14"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 012.12 4.18 2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg></div>
              <a :href="`tel:${lead.phone}`" class="info-value link">{{ lead.phone }}</a>
            </div>
            <div class="info-row" v-if="lead.email">
              <div class="info-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="14" height="14"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg></div>
              <a :href="`mailto:${lead.email}`" class="info-value link">{{ lead.email }}</a>
            </div>
            <div class="info-row" v-if="lead.website">
              <div class="info-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="14" height="14"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg></div>
              <a :href="lead.website" target="_blank" rel="noopener" class="info-value link">{{ lead.website }}</a>
            </div>
            <div class="info-row" v-if="lead.address || lead.city">
              <div class="info-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="14" height="14"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg></div>
              <span class="info-value">{{ [lead.address, lead.city, lead.state].filter(Boolean).join(', ') }}</span>
            </div>
            <div class="info-row" v-if="lead.estimated_revenue">
              <div class="info-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="14" height="14"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg></div>
              <span class="info-value">{{ lead.estimated_revenue }}</span>
            </div>
            <div class="info-row" v-if="lead.linkedin">
              <div class="info-icon"><svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z"/><circle cx="4" cy="4" r="2"/></svg></div>
              <a :href="lead.linkedin" target="_blank" rel="noopener" class="info-value link">LinkedIn</a>
            </div>
          </div>
        </div>

        <!-- Research Intelligence -->
        <div class="card research-card">
          <div class="card-header">
            <span class="card-title">Research Intelligence</span>
            <button class="btn btn-primary btn-sm" @click="runResearch" :disabled="researchRunning">
              <span class="spinner" style="width:12px;height:12px;border-width:2px" v-if="researchRunning"></span>
              <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              {{ researchRunning ? 'Running...' : (lead.report ? 'Re-run' : 'Run Research') }}
            </button>
          </div>
          <div class="card-body">
            <div v-if="!lead.report" class="empty-state" style="padding:24px 0">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <h3>No research yet</h3>
              <p>Click "Run Research" to generate an AI-powered sales intelligence report.</p>
            </div>
            <div v-else class="research-data">
              <div class="readiness-section">
                <div class="readiness-label">
                  <span>Readiness Score</span>
                  <span class="readiness-value">{{ lead.report.readiness_score }}/100</span>
                </div>
                <div class="score-bar-track" style="height:6px">
                  <div class="score-bar-fill" :class="scoreClass(lead.report.readiness_score)" :style="`width:${lead.report.readiness_score}%`"></div>
                </div>
              </div>

              <div class="research-summary" v-if="lead.report.summary">
                {{ lead.report.summary }}
              </div>

              <div class="research-findings" v-if="parsedFindings.length">
                <div class="findings-label">Key Findings</div>
                <ul class="findings-list">
                  <li v-for="(f, i) in parsedFindings" :key="i">{{ f }}</li>
                </ul>
              </div>

              <div class="research-approach" v-if="lead.report.recommended_approach">
                <div class="findings-label">Recommended Approach</div>
                <p>{{ lead.report.recommended_approach }}</p>
              </div>

              <router-link :to="`/leads/${lead.id}/report`" class="btn btn-secondary btn-sm mt-3" style="display:inline-flex">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>
                View Full Report
              </router-link>
            </div>
          </div>
        </div>
      </div>

      <!-- RIGHT COLUMN -->
      <div class="profile-right">

        <!-- Lead Info -->
        <div class="card info-card">
          <div class="card-header">
            <span class="card-title">Lead Info</span>
          </div>
          <div class="card-body info-fields">
            <div class="field-row">
              <span class="field-label">Status</span>
              <select class="form-select field-select" v-model="editStatus" @change="updateStatus">
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="no_answer">No Answer</option>
                <option value="researched">Researched</option>
                <option value="demo_booked">Demo Booked</option>
                <option value="closed_won">Closed Won</option>
                <option value="cold">Cold</option>
              </select>
            </div>
            <div class="field-row">
              <span class="field-label">Lead Type</span>
              <select class="form-select field-select" v-model="editType" @change="updateType">
                <option value="cold">Cold</option>
                <option value="warm">Warm</option>
                <option value="referral">Referral</option>
                <option value="facebook">Facebook</option>
                <option value="inbound">Inbound</option>
              </select>
            </div>
            <div class="field-row">
              <span class="field-label">Lead Score</span>
              <div class="score-bar" style="flex:1">
                <div class="score-bar-track"><div class="score-bar-fill" :class="scoreClass(lead.lead_score)" :style="`width:${lead.lead_score}%`"></div></div>
                <span class="score-label">{{ lead.lead_score }}</span>
              </div>
            </div>
            <div class="field-row">
              <span class="field-label">Contact Quality</span>
              <span class="badge" :class="lead.contact_quality === 'Complete' ? 'badge-researched' : 'badge-no_answer'">
                {{ lead.contact_quality || '—' }}
              </span>
            </div>
            <div class="field-row">
              <span class="field-label">Created</span>
              <span class="field-value text-muted">{{ formatFullDate(lead.created_at) }}</span>
            </div>
            <div class="field-row">
              <span class="field-label">Updated</span>
              <span class="field-value text-muted">{{ formatFullDate(lead.updated_at) }}</span>
            </div>
          </div>
        </div>

        <!-- Call Intel -->
        <div class="card call-card">
          <div class="card-header">
            <span class="card-title">Call Intel</span>
            <div class="header-actions">
              <select class="form-select" style="padding:4px 8px;font-size:12px;min-width:100px" v-model="callFilter" @change="loadCalls">
                <option value="all">All Users</option>
                <option value="errol">Errol</option>
                <option value="nick">Nick</option>
                <option value="shane">Shane</option>
              </select>
              <button class="btn btn-primary btn-sm" @click="showCallModal = true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Log Call
              </button>
            </div>
          </div>
          <div class="card-body">
            <div v-if="callsLoading" class="empty-state" style="padding:16px 0">
              <div class="spinner"></div>
            </div>
            <div v-else-if="calls.length === 0" class="empty-state" style="padding:20px 0">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 012.12 4.18 2 2 0 014.11 2h3a2 2 0 012 1.72"/></svg>
              <p>No calls logged yet.</p>
            </div>
            <div v-else class="calls-list">
              <div v-for="call in calls" :key="call.id" class="call-item">
                <div class="call-header">
                  <span class="badge" :class="`badge-${call.outcome}`">{{ formatOutcome(call.outcome) }}</span>
                  <span class="call-user">{{ capitalize(call.logged_by) }}</span>
                  <span class="call-date text-muted text-sm">{{ formatDate(call.call_date) }}</span>
                  <span class="call-duration text-muted text-sm" v-if="call.duration_minutes">{{ call.duration_minutes }}min</span>
                </div>
                <div class="call-notes text-secondary" v-if="call.notes">{{ call.notes }}</div>
                <div class="call-followup" v-if="call.follow_up_needed">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="11" height="11"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                  Follow-up: {{ formatDate(call.follow_up_date) }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Activity Timeline -->
        <div class="card activity-card">
          <div class="card-header">
            <span class="card-title">Activity Timeline</span>
            <button class="btn btn-ghost btn-sm" @click="showActivityModal = true">+ Log Activity</button>
          </div>
          <div class="card-body" style="padding:12px 16px">
            <ActivityTimeline :items="activities" :loading="activitiesLoading" />
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Loading state -->
  <div v-else-if="pageLoading" class="empty-state" style="min-height:400px">
    <div class="spinner spinner-lg"></div>
  </div>

  <!-- Not found -->
  <div v-else class="empty-state" style="min-height:400px">
    <h3>Lead not found</h3>
    <router-link to="/leads" class="btn btn-primary mt-3">Back to Leads</router-link>
  </div>

  <!-- Call log modal -->
  <Modal v-if="showCallModal" title="Log a Call" size="md" @close="showCallModal = false">
    <form @submit.prevent="submitCall" class="call-form">
      <div class="form-grid-2">
        <div class="form-group">
          <label class="form-label">Date *</label>
          <input class="form-input" type="date" v-model="callForm.call_date" required />
        </div>
        <div class="form-group">
          <label class="form-label">Outcome *</label>
          <select class="form-select" v-model="callForm.outcome" required>
            <option value="">Select outcome</option>
            <option value="answered">Answered</option>
            <option value="no_answer">No Answer</option>
            <option value="voicemail">Voicemail</option>
            <option value="callback_scheduled">Callback Scheduled</option>
            <option value="not_interested">Not Interested</option>
            <option value="interested">Interested</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Duration (minutes)</label>
          <input class="form-input" type="number" v-model="callForm.duration_minutes" min="0" placeholder="5" />
        </div>
        <div class="form-group">
          <label class="form-label">Follow-up Needed?</label>
          <select class="form-select" v-model="callForm.follow_up_needed">
            <option :value="false">No</option>
            <option :value="true">Yes</option>
          </select>
        </div>
        <div class="form-group" v-if="callForm.follow_up_needed">
          <label class="form-label">Follow-up Date</label>
          <input class="form-input" type="date" v-model="callForm.follow_up_date" />
        </div>
        <div class="form-group" :class="{ 'span-2': !callForm.follow_up_needed }">
          <label class="form-label">Recording Link</label>
          <input class="form-input" type="url" v-model="callForm.recording_link" placeholder="https://..." />
        </div>
        <div class="form-group span-2">
          <label class="form-label">Notes</label>
          <textarea class="form-textarea" v-model="callForm.notes" placeholder="What was discussed?" rows="3" />
        </div>
      </div>
    </form>
    <template #footer>
      <button class="btn btn-secondary" @click="showCallModal = false">Cancel</button>
      <button class="btn btn-primary" @click="submitCall" :disabled="callSaving">
        <span class="spinner" style="width:14px;height:14px;border-width:2px" v-if="callSaving"></span>
        {{ callSaving ? 'Saving...' : 'Log Call' }}
      </button>
    </template>
  </Modal>

  <!-- Activity log modal -->
  <Modal v-if="showActivityModal" title="Log Activity" size="sm" @close="showActivityModal = false">
    <div class="form-group">
      <label class="form-label">Activity Type</label>
      <select class="form-select" v-model="activityForm.activity_type">
        <option value="call">Call</option>
        <option value="email">Email</option>
        <option value="dm">DM</option>
        <option value="meeting">Meeting</option>
        <option value="in_person">In Person</option>
        <option value="note">Note</option>
      </select>
    </div>
    <div class="form-group mt-3">
      <label class="form-label">Description</label>
      <textarea class="form-textarea" v-model="activityForm.description" rows="3" placeholder="What happened?" />
    </div>
    <template #footer>
      <button class="btn btn-secondary" @click="showActivityModal = false">Cancel</button>
      <button class="btn btn-primary" @click="submitActivity" :disabled="activitySaving">
        {{ activitySaving ? 'Saving...' : 'Log Activity' }}
      </button>
    </template>
  </Modal>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { leads as leadsApi, research as researchApi } from '../api';
import { store } from '../store';
import Modal from '../components/Modal.vue';
import ActivityTimeline from '../components/ActivityTimeline.vue';

const route = useRoute();
const router = useRouter();

const lead = ref(null);
const pageLoading = ref(true);
const calls = ref([]);
const callsLoading = ref(false);
const activities = ref([]);
const activitiesLoading = ref(false);
const callFilter = ref('all');
const researchRunning = ref(false);

const showCallModal = ref(false);
const showActivityModal = ref(false);
const callSaving = ref(false);
const activitySaving = ref(false);

const editStatus = ref('');
const editType = ref('');

const callForm = ref({
  call_date: new Date().toISOString().split('T')[0],
  outcome: '',
  duration_minutes: '',
  follow_up_needed: false,
  follow_up_date: '',
  recording_link: '',
  notes: '',
});

const activityForm = ref({ activity_type: 'note', description: '' });

async function loadLead() {
  pageLoading.value = true;
  try {
    const res = await leadsApi.get(route.params.id);
    lead.value = res.data;
    editStatus.value = res.data.lead_status;
    editType.value = res.data.lead_type;
  } catch {
    lead.value = null;
  } finally {
    pageLoading.value = false;
  }
}

async function loadCalls() {
  callsLoading.value = true;
  try {
    const res = await leadsApi.calls(route.params.id, callFilter.value === 'all' ? null : callFilter.value);
    calls.value = res.data;
  } finally {
    callsLoading.value = false;
  }
}

async function loadActivities() {
  activitiesLoading.value = true;
  try {
    const res = await leadsApi.activities(route.params.id);
    activities.value = res.data;
  } finally {
    activitiesLoading.value = false;
  }
}

async function updateStatus() {
  try {
    const res = await leadsApi.update(route.params.id, { lead_status: editStatus.value });
    lead.value = { ...lead.value, ...res.data };
    store.addToast('Status updated', 'success');
    loadActivities();
  } catch {
    store.addToast('Failed to update status', 'error');
    editStatus.value = lead.value.lead_status;
  }
}

async function updateType() {
  try {
    const res = await leadsApi.update(route.params.id, { lead_type: editType.value });
    lead.value = { ...lead.value, ...res.data };
  } catch {
    editType.value = lead.value.lead_type;
  }
}

async function submitCall() {
  if (!callForm.value.call_date || !callForm.value.outcome) {
    store.addToast('Date and outcome are required', 'warning');
    return;
  }
  callSaving.value = true;
  try {
    await leadsApi.logCall(route.params.id, callForm.value);
    showCallModal.value = false;
    store.addToast('Call logged successfully', 'success');
    callForm.value = { call_date: new Date().toISOString().split('T')[0], outcome: '', duration_minutes: '', follow_up_needed: false, follow_up_date: '', recording_link: '', notes: '' };
    loadCalls();
    loadActivities();
  } catch (err) {
    store.addToast(err.response?.data?.error || 'Failed to log call', 'error');
  } finally {
    callSaving.value = false;
  }
}

async function submitActivity() {
  if (!activityForm.value.description) {
    store.addToast('Description is required', 'warning');
    return;
  }
  activitySaving.value = true;
  try {
    await leadsApi.logActivity(route.params.id, activityForm.value);
    showActivityModal.value = false;
    store.addToast('Activity logged', 'success');
    activityForm.value = { activity_type: 'note', description: '' };
    loadActivities();
  } catch {
    store.addToast('Failed to log activity', 'error');
  } finally {
    activitySaving.value = false;
  }
}

async function runResearch() {
  researchRunning.value = true;
  store.addToast('Research started...', 'info');
  try {
    await researchApi.runSingle(route.params.id);
    store.addToast('Research complete!', 'success');
    await loadLead();
    loadActivities();
  } catch (err) {
    store.addToast(err.response?.data?.error || 'Research failed', 'error');
  } finally {
    researchRunning.value = false;
  }
}

const parsedFindings = computed(() => {
  if (!lead.value?.report?.key_findings) return [];
  try { return JSON.parse(lead.value.report.key_findings); } catch { return []; }
});

function scoreClass(s) {
  if (s >= 70) return 'high';
  if (s >= 40) return 'mid';
  return 'low';
}
function formatStatus(s) {
  const map = { new: 'New', contacted: 'Contacted', no_answer: 'No Answer', researched: 'Researched', demo_booked: 'Demo Booked', closed_won: 'Won', cold: 'Cold' };
  return map[s] || s;
}
function formatOutcome(o) {
  const map = { answered: 'Answered', no_answer: 'No Answer', voicemail: 'Voicemail', callback_scheduled: 'Callback Scheduled', not_interested: 'Not Interested', interested: 'Interested' };
  return map[o] || o;
}
function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function formatFullDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function capitalize(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }

onMounted(() => {
  loadLead();
  loadCalls();
  loadActivities();
});
</script>

<style scoped>
.lead-profile { display: flex; flex-direction: column; gap: 16px; }

.profile-nav {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}
.back-link { display: flex; align-items: center; gap: 4px; color: var(--text-muted); text-decoration: none; }
.back-link:hover { color: var(--text-primary); text-decoration: none; }
.breadcrumb-sep { color: var(--text-muted); }
.breadcrumb-current { color: var(--text-secondary); font-weight: 500; }

.profile-layout {
  display: grid;
  grid-template-columns: 340px 1fr;
  gap: 16px;
  align-items: start;
}

.profile-left, .profile-right { display: flex; flex-direction: column; gap: 16px; }

/* Company Card */
.company-card { padding: 20px; }
.company-header { display: flex; gap: 14px; align-items: flex-start; margin-bottom: 20px; }
.company-avatar {
  width: 48px; height: 48px;
  background: linear-gradient(135deg, var(--accent-blue), #6366f1);
  border-radius: var(--radius-lg);
  display: flex; align-items: center; justify-content: center;
  font-size: 22px; font-weight: 800; color: white;
  flex-shrink: 0;
}
.company-info { flex: 1; min-width: 0; }
.company-name { font-size: 18px; font-weight: 700; margin-bottom: 6px; }
.company-tags { display: flex; flex-wrap: wrap; gap: 6px; }
.cat-badge {
  font-size: 11px; font-weight: 500; color: var(--accent-blue);
  background: var(--accent-blue-dim); padding: 2px 8px;
  border-radius: var(--radius-full); cursor: pointer;
}
.cat-badge:hover { text-decoration: underline; }

.info-grid { display: flex; flex-direction: column; gap: 10px; }
.info-row { display: flex; align-items: center; gap: 10px; }
.info-icon { color: var(--text-muted); flex-shrink: 0; display: flex; }
.info-value { font-size: 13px; color: var(--text-secondary); word-break: break-all; }
.info-value.link { color: var(--accent-blue); }
.info-value.link:hover { text-decoration: underline; }

/* Research card */
.research-card .card-body { padding: 16px 20px; }
.readiness-section { margin-bottom: 14px; }
.readiness-label { display: flex; justify-content: space-between; font-size: 12px; font-weight: 600; color: var(--text-secondary); margin-bottom: 6px; }
.readiness-value { color: var(--accent-blue); }
.research-summary { font-size: 13px; color: var(--text-secondary); line-height: 1.6; margin-bottom: 14px; }
.findings-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); margin-bottom: 6px; }
.findings-list { list-style: none; display: flex; flex-direction: column; gap: 4px; }
.findings-list li { font-size: 13px; color: var(--text-secondary); padding-left: 14px; position: relative; line-height: 1.5; }
.findings-list li::before { content: '•'; position: absolute; left: 0; color: var(--accent-blue); }
.research-approach { margin-top: 12px; font-size: 13px; color: var(--text-secondary); line-height: 1.6; }

/* Info card */
.info-fields { display: flex; flex-direction: column; gap: 10px; }
.field-row { display: flex; align-items: center; gap: 12px; }
.field-label { font-size: 12px; font-weight: 500; color: var(--text-muted); min-width: 100px; text-transform: uppercase; letter-spacing: 0.04em; }
.field-select { flex: 1; padding: 5px 8px; font-size: 13px; }
.field-value { font-size: 13px; }

/* Call card */
.header-actions { display: flex; align-items: center; gap: 8px; }
.calls-list { display: flex; flex-direction: column; gap: 10px; }
.call-item { background: var(--bg-secondary); border-radius: var(--radius-md); padding: 10px 12px; border: 1px solid var(--border-subtle); }
.call-header { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 4px; }
.call-user { font-size: 12px; font-weight: 600; color: var(--text-primary); }
.call-date, .call-duration { font-size: 11px; }
.call-notes { font-size: 12px; line-height: 1.5; margin-top: 4px; }
.call-followup { display: flex; align-items: center; gap: 4px; font-size: 11px; color: var(--warning); margin-top: 4px; }

/* Modal form */
.form-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.span-2 { grid-column: span 2; }

@media (max-width: 900px) {
  .profile-layout { grid-template-columns: 1fr; }
}
</style>
