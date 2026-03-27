<template>
  <div class="timeline">
    <div v-if="loading" class="empty-state">
      <div class="spinner"></div>
    </div>
    <div v-else-if="items.length === 0" class="empty-state">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <h3>No activity yet</h3>
      <p>Activities will appear here as you log calls, emails, and notes.</p>
    </div>
    <div v-else class="timeline-list">
      <div v-for="item in items" :key="item.id" class="timeline-item">
        <div class="timeline-dot" :class="`dot-${item.activity_type}`">
          <component :is="getIcon(item.activity_type)" />
        </div>
        <div class="timeline-content">
          <div class="timeline-header">
            <span class="timeline-user">{{ capitalize(item.user) }}</span>
            <span class="timeline-type">{{ formatType(item.activity_type) }}</span>
            <span class="timeline-time">{{ timeAgo(item.created_at) }}</span>
          </div>
          <div class="timeline-desc">{{ item.description }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { h } from 'vue';

const props = defineProps({
  items: { type: Array, default: () => [] },
  loading: Boolean,
});

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatType(type) {
  const map = {
    call: 'Call', email: 'Email', dm: 'DM', meeting: 'Meeting',
    in_person: 'In Person', note: 'Note', research_completed: 'Research',
    status_change: 'Status Change',
  };
  return map[type] || type;
}

function timeAgo(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now - date;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// SVG icon components as render functions
const CallIcon = () => h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', width: '10', height: '10' }, [
  h('path', { d: 'M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.79 19.79 0 012.12 4.18 2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z' })
]);

const EmailIcon = () => h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', width: '10', height: '10' }, [
  h('path', { d: 'M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z' }),
  h('polyline', { points: '22,6 12,13 2,6' })
]);

const NoteIcon = () => h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', width: '10', height: '10' }, [
  h('path', { d: 'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z' }),
  h('polyline', { points: '14,2 14,8 20,8' })
]);

const ResearchIcon = () => h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', width: '10', height: '10' }, [
  h('circle', { cx: '11', cy: '11', r: '8' }),
  h('line', { x1: '21', y1: '21', x2: '16.65', y2: '16.65' })
]);

const DefaultIcon = () => h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', width: '10', height: '10' }, [
  h('circle', { cx: '12', cy: '12', r: '10' })
]);

function getIcon(type) {
  if (type === 'call') return CallIcon;
  if (type === 'email') return EmailIcon;
  if (type === 'note' || type === 'status_change') return NoteIcon;
  if (type === 'research_completed') return ResearchIcon;
  return DefaultIcon;
}
</script>

<style scoped>
.timeline-list { display: flex; flex-direction: column; gap: 0; }

.timeline-item {
  display: flex;
  gap: 12px;
  padding: 10px 0;
  position: relative;
}

.timeline-item:not(:last-child)::after {
  content: '';
  position: absolute;
  left: 13px;
  top: 34px;
  bottom: 0;
  width: 1px;
  background: var(--border-subtle);
}

.timeline-dot {
  width: 26px; height: 26px;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  color: var(--text-muted);
  z-index: 1;
}

.dot-call { background: var(--success-dim); color: var(--success); border-color: var(--success); }
.dot-email { background: var(--accent-blue-dim); color: var(--accent-blue); border-color: var(--accent-blue); }
.dot-research_completed { background: var(--info-dim); color: var(--info); border-color: var(--info); }
.dot-status_change { background: var(--warning-dim); color: var(--warning); border-color: var(--warning); }

.timeline-content { flex: 1; min-width: 0; padding-top: 3px; }

.timeline-header {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 2px;
}

.timeline-user { font-size: 12px; font-weight: 600; color: var(--text-primary); }
.timeline-type { font-size: 11px; color: var(--text-muted); }
.timeline-time { font-size: 11px; color: var(--text-muted); margin-left: auto; }
.timeline-desc { font-size: 13px; color: var(--text-secondary); line-height: 1.5; }
</style>
