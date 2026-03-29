<template>
  <div class="dashboard">

    <!-- Error state -->
    <div v-if="loadError" class="error-banner">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      Failed to load dashboard data.
      <button class="btn btn-secondary btn-sm" @click="loadMetrics">Retry</button>
    </div>

    <!-- Stat Cards -->
    <div class="stat-grid">
      <StatCard :value="metrics?.total" label="Total Leads" color="blue" :loading="loading">
        <template #icon>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="22" height="22"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
        </template>
      </StatCard>
      <StatCard :value="metrics?.contacted" label="Leads Contacted" color="green" :loading="loading" :sub="`${contactedPct}% of total`">
        <template #icon>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="22" height="22"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 012.12 4.18 2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
        </template>
      </StatCard>
      <StatCard :value="metrics?.pipeline" label="Demos Booked" color="yellow" :loading="loading">
        <template #icon>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="22" height="22"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        </template>
      </StatCard>
      <StatCard :value="metrics?.closed" label="Won" color="green" :loading="loading">
        <template #icon>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="22" height="22"><polyline points="20 6 9 17 4 12"/></svg>
        </template>
      </StatCard>
      <StatCard :value="metrics?.cold" label="Lost / Cold" color="red" :loading="loading">
        <template #icon>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="22" height="22"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </template>
      </StatCard>
    </div>

    <!-- Charts row -->
    <div class="charts-row">
      <!-- Industry Distribution -->
      <div class="card chart-card">
        <div class="card-header">
          <span class="card-title">Industry Distribution</span>
        </div>
        <div class="card-body chart-body">
          <canvas ref="categoryChartRef" v-if="!loading"></canvas>
          <div v-else class="skeleton" style="width:100%;height:240px"></div>
        </div>
      </div>

      <!-- Pipeline by Stage -->
      <div class="card chart-card">
        <div class="card-header">
          <span class="card-title">Pipeline by Stage</span>
        </div>
        <div class="card-body chart-body">
          <canvas ref="statusChartRef" v-if="!loading"></canvas>
          <div v-else class="skeleton" style="width:100%;height:240px"></div>
        </div>
      </div>

      <!-- Monthly Activity -->
      <div class="card chart-card chart-wide">
        <div class="card-header">
          <span class="card-title">Activity (Last 6 Months)</span>
        </div>
        <div class="card-body chart-body">
          <canvas ref="activityChartRef" v-if="!loading"></canvas>
          <div v-else class="skeleton" style="width:100%;height:200px"></div>
        </div>
      </div>
    </div>

    <!-- Bottom row -->
    <div class="bottom-row">
      <!-- Recent Activity -->
      <div class="card activity-feed-card">
        <div class="card-header">
          <span class="card-title">Recent Activity</span>
          <router-link to="/leads" class="btn btn-ghost btn-sm">View All Leads →</router-link>
        </div>
        <div class="card-body" style="padding:12px 16px">
          <div v-if="loading" class="empty-state" style="padding:20px 0"><div class="spinner"></div></div>
          <div v-else-if="recentActivity.length === 0" class="empty-state" style="padding:20px 0">
            <p>No activity yet — start logging calls!</p>
          </div>
          <div v-else>
            <div v-for="item in recentActivity" :key="item.id" class="activity-row" @click="$router.push(`/leads/${item.lead_id}`)">
              <div class="activity-dot" :class="`dot-${item.activity_type}`"></div>
              <div class="activity-content">
                <span class="activity-lead">{{ item.business_name }}</span>
                <span class="activity-desc">{{ item.description }}</span>
              </div>
              <div class="activity-meta">
                <span class="activity-user">{{ capitalize(item.user) }}</span>
                <span class="activity-time">{{ timeAgo(item.created_at) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Quick stats sidebar -->
      <div class="card quick-stats">
        <div class="card-header"><span class="card-title">At a Glance</span></div>
        <div class="card-body">
          <div class="quick-item">
            <span class="quick-label">Avg Lead Score</span>
            <div class="score-bar">
              <div class="score-bar-track"><div class="score-bar-fill mid" :style="`width:${metrics?.avgScore || 0}%`"></div></div>
              <span class="score-label">{{ metrics?.avgScore || 0 }}</span>
            </div>
          </div>
          <div class="quick-item">
            <span class="quick-label">Researched Leads</span>
            <span class="quick-value text-success">{{ metrics?.researched || 0 }}</span>
          </div>
          <div class="quick-item">
            <span class="quick-label">Contact Rate</span>
            <span class="quick-value">{{ contactedPct }}%</span>
          </div>

          <div class="divider"></div>

          <div class="quick-label mb-3">Top Categories</div>
          <div v-for="cat in topCategories" :key="cat.category" class="cat-row">
            <span class="cat-name" @click="$router.push(`/leads?category=${encodeURIComponent(cat.category)}`)">{{ cat.category }}</span>
            <span class="cat-count">{{ cat.cnt }}</span>
          </div>

          <div class="divider mt-3"></div>

          <div class="quick-actions">
            <router-link to="/leads" class="btn btn-primary btn-sm w-full">View All Leads</router-link>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue';
import { dashboard } from '../api';
import StatCard from '../components/StatCard.vue';

let Chart;
const metrics = ref(null);
const loading = ref(true);
const loadError = ref(false);
const recentActivity = ref([]);

const categoryChartRef = ref(null);
const statusChartRef = ref(null);
const activityChartRef = ref(null);

let categoryChart = null;
let statusChart = null;
let activityChart = null;

const contactedPct = computed(() => {
  if (!metrics.value?.total) return 0;
  return Math.round((metrics.value.contacted / metrics.value.total) * 100);
});

const topCategories = computed(() => (metrics.value?.byCategory || []).slice(0, 6));

async function loadMetrics() {
  loading.value = true;
  loadError.value = false;
  try {
    const res = await dashboard.metrics();
    metrics.value = res.data;
    recentActivity.value = res.data.recentActivity || [];
    await nextTick();
    renderCharts();
  } catch {
    loadError.value = true;
  } finally {
    loading.value = false;
  }
}

async function renderCharts() {
  if (!Chart) {
    const mod = await import('chart.js/auto');
    Chart = mod.default;
  }

  const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
  const textColor = isDark ? '#8b9cbf' : '#44556f';
  const gridColor = isDark ? '#1a2840' : '#d1dbe8';

  // Category donut
  if (categoryChartRef.value && metrics.value?.byCategory?.length) {
    if (categoryChart) categoryChart.destroy();
    const cats = metrics.value.byCategory.slice(0, 10);
    categoryChart = new Chart(categoryChartRef.value, {
      type: 'doughnut',
      data: {
        labels: cats.map(c => c.category),
        datasets: [{
          data: cats.map(c => c.cnt),
          backgroundColor: ['#3b82f6','#6366f1','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#84cc16','#f97316','#ec4899'],
          borderWidth: 0,
          hoverOffset: 6,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        plugins: {
          legend: { position: 'right', labels: { color: textColor, font: { size: 11 }, padding: 12, boxWidth: 10 } },
        },
      },
    });
  }

  // Status bar chart
  if (statusChartRef.value && metrics.value?.byStatus?.length) {
    if (statusChart) statusChart.destroy();
    const statusColors = { new: '#6366f1', contacted: '#3b82f6', no_answer: '#6b7280', researched: '#10b981', demo_booked: '#f59e0b', closed_won: '#10b981', cold: '#374151' };
    statusChart = new Chart(statusChartRef.value, {
      type: 'bar',
      data: {
        labels: metrics.value.byStatus.map(s => formatStatus(s.lead_status)),
        datasets: [{
          data: metrics.value.byStatus.map(s => s.cnt),
          backgroundColor: metrics.value.byStatus.map(s => statusColors[s.lead_status] || '#3b82f6'),
          borderRadius: 4,
        }],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { color: gridColor }, ticks: { color: textColor, font: { size: 11 } } },
          y: { grid: { display: false }, ticks: { color: textColor, font: { size: 11 } } },
        },
      },
    });
  }

  // Monthly activity line chart
  if (activityChartRef.value && metrics.value?.monthlyActivity?.length) {
    if (activityChart) activityChart.destroy();
    const months = metrics.value.monthlyActivity;
    activityChart = new Chart(activityChartRef.value, {
      type: 'line',
      data: {
        labels: months.map(m => m.month),
        datasets: [{
          label: 'Activities',
          data: months.map(m => m.cnt),
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59,130,246,0.1)',
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#3b82f6',
          pointRadius: 4,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { color: gridColor }, ticks: { color: textColor, font: { size: 11 } } },
          y: { grid: { color: gridColor }, ticks: { color: textColor, font: { size: 11 } }, beginAtZero: true },
        },
      },
    });
  }
}

function formatStatus(s) {
  const map = { new: 'New', contacted: 'Contacted', no_answer: 'No Answer', researched: 'Researched', demo_booked: 'Demo Booked', closed_won: 'Closed Won', cold: 'Cold' };
  return map[s] || s;
}

function capitalize(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }

function timeAgo(d) {
  const diff = new Date() - new Date(d);
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

onMounted(loadMetrics);
</script>

<style scoped>
.dashboard { display: flex; flex-direction: column; gap: 20px; }

.error-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  background: var(--danger-dim);
  border: 1px solid var(--danger);
  border-radius: var(--radius-md);
  color: var(--danger);
  font-size: 13px;
  font-weight: 500;
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.charts-row {
  display: grid;
  grid-template-columns: 1fr 1fr 1.5fr;
  gap: 16px;
}

.chart-card .card-body { padding: 16px; }
.chart-body { height: 240px; display: flex; align-items: center; justify-content: center; }
.chart-body canvas { max-height: 240px; }

.bottom-row {
  display: grid;
  grid-template-columns: 1fr 280px;
  gap: 16px;
}

.activity-feed-card {}

.activity-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid var(--border-subtle);
  cursor: pointer;
  transition: background var(--transition);
  border-radius: var(--radius-sm);
}
.activity-row:last-child { border-bottom: none; }
.activity-row:hover { background: var(--bg-secondary); padding-left: 8px; }

.activity-dot {
  width: 8px; height: 8px;
  border-radius: 50%;
  background: var(--text-muted);
  flex-shrink: 0;
}
.dot-call { background: var(--success); }
.dot-email { background: var(--accent-blue); }
.dot-research_completed { background: var(--info); }
.dot-status_change { background: var(--warning); }
.dot-note { background: var(--text-muted); }

.activity-content { flex: 1; min-width: 0; }
.activity-lead { font-size: 13px; font-weight: 600; color: var(--text-primary); display: block; }
.activity-desc { font-size: 12px; color: var(--text-muted); display: block; }

.activity-meta { text-align: right; flex-shrink: 0; }
.activity-user { font-size: 11px; font-weight: 600; color: var(--text-secondary); display: block; }
.activity-time { font-size: 11px; color: var(--text-muted); }

.quick-stats .card-body { padding: 16px; display: flex; flex-direction: column; gap: 12px; }
.quick-item { display: flex; align-items: center; gap: 10px; }
.quick-label { font-size: 12px; font-weight: 500; color: var(--text-muted); min-width: 110px; text-transform: uppercase; letter-spacing: 0.04em; }
.quick-value { font-size: 16px; font-weight: 700; color: var(--text-primary); }

.cat-row { display: flex; justify-content: space-between; align-items: center; padding: 4px 0; }
.cat-name { font-size: 12px; color: var(--accent-blue); cursor: pointer; }
.cat-name:hover { text-decoration: underline; }
.cat-count { font-size: 12px; font-weight: 600; color: var(--text-secondary); }

.quick-actions { margin-top: 4px; }

@media (max-width: 1200px) {
  .stat-grid { grid-template-columns: repeat(2, 1fr); }
  .charts-row { grid-template-columns: 1fr 1fr; }
  .chart-wide { grid-column: span 2; }
  .bottom-row { grid-template-columns: 1fr; }
}

@media (max-width: 768px) {
  .stat-grid { grid-template-columns: 1fr 1fr; }
  .charts-row { grid-template-columns: 1fr; }
  .chart-wide { grid-column: auto; }
}
</style>
