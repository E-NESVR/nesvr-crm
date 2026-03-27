<template>
  <div class="stat-card card">
    <div class="stat-icon" :class="`icon-${color}`">
      <slot name="icon" />
    </div>
    <div class="stat-body">
      <div class="stat-value">
        <span v-if="loading" class="skeleton" style="width:60px;height:28px;display:inline-block"></span>
        <span v-else>{{ formattedValue }}</span>
      </div>
      <div class="stat-label">{{ label }}</div>
      <div class="stat-sub" v-if="sub">{{ sub }}</div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  value: [Number, String],
  label: String,
  sub: String,
  color: { type: String, default: 'blue' },
  loading: Boolean,
  format: { type: String, default: 'number' },
});

const formattedValue = computed(() => {
  if (props.value === null || props.value === undefined) return '—';
  if (props.format === 'percent') return `${props.value}%`;
  if (typeof props.value === 'number') return props.value.toLocaleString();
  return props.value;
});
</script>

<style scoped>
.stat-card {
  padding: 20px;
  display: flex;
  align-items: flex-start;
  gap: 16px;
  transition: box-shadow var(--transition);
}
.stat-card:hover { box-shadow: var(--shadow-md); }

.stat-icon {
  width: 44px; height: 44px;
  border-radius: var(--radius-lg);
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}

.icon-blue { background: var(--accent-blue-dim); color: var(--accent-blue); }
.icon-green { background: var(--success-dim); color: var(--success); }
.icon-yellow { background: var(--warning-dim); color: var(--warning); }
.icon-purple { background: var(--info-dim); color: var(--info); }
.icon-red { background: var(--danger-dim); color: var(--danger); }

.stat-body { flex: 1; min-width: 0; }

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.1;
  letter-spacing: -0.5px;
}

.stat-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-top: 4px;
}

.stat-sub {
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 2px;
}
</style>
