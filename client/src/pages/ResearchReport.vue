<template>
  <div class="report-page">
    <div class="report-nav">
      <router-link :to="`/leads/${route.params.id}`" class="back-link">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="15 18 9 12 15 6"/></svg>
        Back to Lead
      </router-link>
    </div>

    <div v-if="loading" class="empty-state" style="min-height:400px">
      <div class="spinner spinner-lg"></div>
    </div>

    <div v-else-if="!report" class="empty-state" style="min-height:400px">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>
      <h3>No report available</h3>
      <p>Run a research report from the lead profile first.</p>
      <router-link :to="`/leads/${route.params.id}`" class="btn btn-primary mt-3">Go to Lead Profile</router-link>
    </div>

    <div v-else class="report-content card">
      <div class="report-header">
        <div>
          <h1 class="report-title">{{ leadName }} — AI Opportunity Report</h1>
          <div class="report-meta">
            <span>Generated {{ formatDate(report.created_at) }}</span>
            <span class="meta-sep">·</span>
            <span>Readiness Score: <strong :class="scoreColor(report.readiness_score)">{{ report.readiness_score }}/100</strong></span>
          </div>
        </div>
        <div class="report-actions">
          <button class="btn btn-secondary btn-sm" @click="printReport">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="13" height="13"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
            Print
          </button>
        </div>
      </div>

      <div class="report-body">
        <!-- Executive Summary -->
        <div class="report-section">
          <div class="section-header">━━━ EXECUTIVE SUMMARY ━━━</div>
          <p class="section-text">{{ reportData.summary }}</p>
        </div>

        <!-- Business Overview -->
        <div class="report-section" v-if="reportData.business_overview">
          <div class="section-header">━━━ BUSINESS OVERVIEW ━━━</div>
          <div class="overview-grid">
            <div class="overview-item" v-if="reportData.business_overview.web_presence_quality">
              <span class="overview-label">Web Presence</span>
              <span class="overview-value">{{ reportData.business_overview.web_presence_quality }}</span>
            </div>
            <div class="overview-item" v-if="reportData.business_overview.reputation_summary">
              <span class="overview-label">Online Reputation</span>
              <span class="overview-value">{{ reportData.business_overview.reputation_summary }}</span>
            </div>
          </div>
        </div>

        <!-- Phone Pain Points -->
        <div class="report-section" v-if="parsedPainPoints.length">
          <div class="section-header">━━━ PHONE & RECEPTIONIST PAIN POINTS ━━━</div>
          <ul class="report-list">
            <li v-for="(p, i) in parsedPainPoints" :key="i">{{ p }}</li>
          </ul>
        </div>

        <!-- Key Findings -->
        <div class="report-section" v-if="parsedFindings.length">
          <div class="section-header">━━━ KEY FINDINGS ━━━</div>
          <ul class="report-list">
            <li v-for="(f, i) in parsedFindings" :key="i">{{ f }}</li>
          </ul>
        </div>

        <!-- Recommended Approach -->
        <div class="report-section" v-if="reportData.recommended_approach">
          <div class="section-header">━━━ RECOMMENDED APPROACH ━━━</div>
          <p class="section-text">{{ reportData.recommended_approach }}</p>
        </div>

        <!-- Call Script -->
        <div class="report-section" v-if="reportData.call_script_starter">
          <div class="section-header">━━━ CALL SCRIPT STARTER ━━━</div>
          <div class="script-box">
            <p class="section-text">{{ reportData.call_script_starter }}</p>
          </div>
        </div>

        <!-- Email Draft -->
        <div class="report-section" v-if="reportData.email_subject || reportData.email_body">
          <div class="section-header">━━━ EMAIL DRAFT ━━━</div>
          <div class="email-box">
            <div class="email-subject"><strong>Subject:</strong> {{ reportData.email_subject }}</div>
            <div class="email-body">{{ reportData.email_body }}</div>
            <button class="btn btn-secondary btn-sm mt-2" @click="copyEmail">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="13" height="13"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
              Copy Email
            </button>
          </div>
        </div>

        <!-- Sources -->
        <div class="report-section" v-if="parsedSources.length">
          <div class="section-header">━━━ SOURCES ━━━</div>
          <ul class="sources-list">
            <li v-for="(s, i) in parsedSources" :key="i">
              <a :href="s" target="_blank" rel="noopener">{{ s }}</a>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { leads as leadsApi } from '../api';
import { store } from '../store';

const route = useRoute();
const report = ref(null);
const leadName = ref('');
const loading = ref(true);

async function load() {
  loading.value = true;
  try {
    const [leadRes, reportRes] = await Promise.all([
      leadsApi.get(route.params.id),
      leadsApi.report(route.params.id).catch(() => null),
    ]);
    leadName.value = leadRes.data.business_name;
    if (reportRes) {
      report.value = reportRes.data;
    }
  } catch {
    report.value = null;
  } finally {
    loading.value = false;
  }
}

const reportData = computed(() => {
  if (!report.value?.content_json) return {};
  try { return JSON.parse(report.value.content_json); } catch { return {}; }
});

const parsedFindings = computed(() => {
  if (!report.value?.key_findings) return [];
  try { return JSON.parse(report.value.key_findings); } catch { return []; }
});

const parsedPainPoints = computed(() => {
  if (!report.value?.phone_pain_points) return [];
  try { return JSON.parse(report.value.phone_pain_points); } catch { return []; }
});

const parsedSources = computed(() => {
  const sources = reportData.value?.sources_used;
  if (!sources) return [];
  if (typeof sources === 'string') { try { return JSON.parse(sources); } catch { return []; } }
  return sources;
});

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function scoreColor(s) {
  if (s >= 70) return 'text-success';
  if (s >= 40) return 'text-warning';
  return 'text-danger';
}

function printReport() { window.print(); }

function copyEmail() {
  const text = `Subject: ${reportData.value.email_subject}\n\n${reportData.value.email_body}`;
  navigator.clipboard.writeText(text).then(() => {
    store.addToast('Email copied to clipboard', 'success');
  });
}

onMounted(load);
</script>

<style scoped>
.report-page { display: flex; flex-direction: column; gap: 16px; max-width: 860px; margin: 0 auto; }

.report-nav { display: flex; align-items: center; gap: 8px; }
.back-link { display: flex; align-items: center; gap: 4px; color: var(--text-muted); text-decoration: none; font-size: 13px; }
.back-link:hover { color: var(--text-primary); text-decoration: none; }

.report-content { overflow: hidden; }

.report-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 24px 28px 20px;
  border-bottom: 1px solid var(--border);
  gap: 16px;
}

.report-title { font-size: 20px; font-weight: 700; margin-bottom: 6px; }
.report-meta { font-size: 13px; color: var(--text-muted); display: flex; align-items: center; gap: 8px; }
.meta-sep { color: var(--border); }
.report-actions { flex-shrink: 0; }

.report-body { padding: 24px 28px; display: flex; flex-direction: column; gap: 28px; }

.report-section { display: flex; flex-direction: column; gap: 12px; }

.section-header {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.12em;
  color: var(--accent-blue);
  font-family: 'JetBrains Mono', monospace;
}

.section-text { font-size: 14px; color: var(--text-secondary); line-height: 1.7; }

.overview-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.overview-item { background: var(--bg-secondary); border-radius: var(--radius-md); padding: 12px 14px; }
.overview-label { display: block; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); margin-bottom: 4px; }
.overview-value { font-size: 13px; color: var(--text-secondary); line-height: 1.5; }

.report-list { list-style: none; display: flex; flex-direction: column; gap: 8px; padding-left: 0; }
.report-list li {
  font-size: 14px;
  color: var(--text-secondary);
  padding-left: 16px;
  position: relative;
  line-height: 1.6;
}
.report-list li::before { content: '•'; position: absolute; left: 0; color: var(--accent-blue); font-weight: 700; }

.script-box, .email-box {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 16px 18px;
}

.email-subject { font-size: 13px; color: var(--text-muted); margin-bottom: 10px; }
.email-body { font-size: 14px; color: var(--text-secondary); line-height: 1.7; white-space: pre-line; }

.sources-list { list-style: none; display: flex; flex-direction: column; gap: 6px; }
.sources-list a { font-size: 12px; color: var(--accent-blue); word-break: break-all; }
.sources-list a:hover { text-decoration: underline; }
</style>
