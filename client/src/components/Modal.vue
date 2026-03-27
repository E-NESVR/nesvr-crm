<template>
  <Teleport to="body">
    <div class="modal-overlay" @click.self="$emit('close')" @keydown.escape.window="$emit('close')">
      <div class="modal" :class="`modal-${size}`" role="dialog" :aria-label="title">
        <div class="modal-header">
          <h3>{{ title }}</h3>
          <button class="btn btn-ghost btn-icon btn-sm" @click="$emit('close')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div class="modal-body">
          <slot />
        </div>
        <div class="modal-footer" v-if="$slots.footer">
          <slot name="footer" />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
defineProps({ title: String, size: { type: String, default: 'md' } });
defineEmits(['close']);
</script>

<style scoped>
.modal-overlay {
  position: fixed; inset: 0;
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(4px);
  z-index: 1000;
  display: flex; align-items: center; justify-content: center;
  padding: 16px;
}

.modal {
  background: var(--bg-modal);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-lg);
  max-height: 90vh;
  display: flex; flex-direction: column;
  width: 100%;
}

.modal-sm { max-width: 420px; }
.modal-md { max-width: 560px; }
.modal-lg { max-width: 740px; }
.modal-xl { max-width: 960px; }

.modal-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 18px 24px 16px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.modal-header h3 { font-size: 15px; font-weight: 600; }

.modal-body {
  padding: 20px 24px;
  overflow-y: auto;
  flex: 1;
}

.modal-footer {
  padding: 16px 24px;
  border-top: 1px solid var(--border);
  display: flex; gap: 10px; justify-content: flex-end;
  flex-shrink: 0;
}
</style>
