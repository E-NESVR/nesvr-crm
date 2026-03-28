<template>
  <Modal :title="title" size="sm" @close="$emit('cancel')">
    <div class="delete-body">
      <!-- Warning icon + description -->
      <div class="delete-warning">
        <div class="warning-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        </div>
        <p class="warning-text">{{ description }}</p>
      </div>

      <!-- Subject name pill -->
      <div class="delete-subject" v-if="subject">
        <span class="subject-pill">{{ subject }}</span>
      </div>

      <!-- Reason field -->
      <div class="form-group reason-group">
        <label class="form-label">
          Reason for deletion
          <span class="required-star">*</span>
        </label>
        <textarea
          class="form-textarea"
          :class="{ 'input-error': showError }"
          v-model="reason"
          :placeholder="reasonPlaceholder"
          rows="3"
          ref="reasonRef"
          @input="showError = false"
        />
        <span class="form-error" v-if="showError">Please enter a reason before deleting.</span>
      </div>
    </div>

    <template #footer>
      <button class="btn btn-secondary" @click="$emit('cancel')" :disabled="deleting">Cancel</button>
      <button class="btn btn-delete" @click="confirm" :disabled="deleting">
        <span class="spinner" style="width:14px;height:14px;border-width:2px" v-if="deleting"></span>
        <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
          <path d="M10 11v6M14 11v6"/>
          <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
        </svg>
        {{ deleting ? 'Deleting...' : confirmLabel }}
      </button>
    </template>
  </Modal>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import Modal from './Modal.vue';

const props = defineProps({
  title: { type: String, default: 'Confirm Deletion' },
  description: { type: String, default: 'This action will archive the item. It can be recovered by an admin.' },
  subject: { type: String, default: '' },
  confirmLabel: { type: String, default: 'Delete' },
  reasonPlaceholder: { type: String, default: 'e.g. Duplicate entry, wrong business, out of service area…' },
  deleting: { type: Boolean, default: false },
});

const emit = defineEmits(['confirm', 'cancel']);

const reason = ref('');
const showError = ref(false);
const reasonRef = ref(null);

onMounted(() => {
  setTimeout(() => reasonRef.value?.focus(), 100);
});

function confirm() {
  if (!reason.value.trim()) {
    showError.value = true;
    reasonRef.value?.focus();
    return;
  }
  emit('confirm', reason.value.trim());
}
</script>

<style scoped>
.delete-body { display: flex; flex-direction: column; gap: 16px; }

.delete-warning {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  background: var(--danger-dim);
  border: 1px solid var(--danger);
  border-radius: var(--radius-md);
  padding: 12px 14px;
}

.warning-icon {
  color: var(--danger);
  flex-shrink: 0;
  margin-top: 1px;
}

.warning-text {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.5;
}

.delete-subject {
  display: flex;
  align-items: center;
}

.subject-pill {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 6px 12px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

.reason-group {}
.required-star { color: var(--danger); margin-left: 2px; }

.input-error {
  border-color: var(--danger) !important;
  box-shadow: 0 0 0 3px var(--danger-dim) !important;
}

.btn-delete {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: var(--radius-md);
  font-size: 13px;
  font-weight: 500;
  border: none;
  cursor: pointer;
  transition: all var(--transition);
  background: var(--danger);
  color: white;
}
.btn-delete:hover:not(:disabled) {
  background: #dc2626;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.35);
}
.btn-delete:disabled { opacity: 0.5; cursor: not-allowed; transform: none; box-shadow: none; }
</style>
