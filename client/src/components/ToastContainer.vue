<template>
  <div class="toast-container">
    <TransitionGroup name="toast">
      <div
        v-for="toast in store.toasts"
        :key="toast.id"
        class="toast"
        :class="`toast-${toast.type}`"
        @click="store.removeToast(toast.id)"
      >
        <svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
          <template v-if="toast.type === 'success'">
            <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </template>
          <template v-else-if="toast.type === 'error'">
            <circle cx="12" cy="12" r="10"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
          </template>
          <template v-else-if="toast.type === 'warning'">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </template>
          <template v-else>
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </template>
        </svg>
        <span>{{ toast.message }}</span>
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup>
import { store } from '../store';
</script>

<style scoped>
.toast-container {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 8px;
  pointer-events: none;
}

.toast {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-radius: var(--radius-lg);
  font-size: 13px;
  font-weight: 500;
  max-width: 360px;
  pointer-events: all;
  cursor: pointer;
  box-shadow: var(--shadow-lg);
  backdrop-filter: blur(8px);
  border: 1px solid;
  transition: all var(--transition);
}

.toast:hover { transform: translateY(-2px); }

.toast-success { background: var(--bg-card); border-color: var(--success); color: var(--success); }
.toast-error { background: var(--bg-card); border-color: var(--danger); color: var(--danger); }
.toast-warning { background: var(--bg-card); border-color: var(--warning); color: var(--warning); }
.toast-info { background: var(--bg-card); border-color: var(--accent-blue); color: var(--accent-blue); }

/* Transitions */
.toast-enter-active { transition: all 0.25s ease; }
.toast-leave-active { transition: all 0.2s ease; }
.toast-enter-from { transform: translateX(100%); opacity: 0; }
.toast-leave-to { transform: translateX(100%); opacity: 0; }
</style>
