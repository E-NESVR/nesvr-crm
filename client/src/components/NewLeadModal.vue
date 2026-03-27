<template>
  <Modal title="Add New Lead" size="md" @close="$emit('close')">
    <form @submit.prevent="submit" class="lead-form">
      <div class="form-grid">
        <div class="form-group span-2">
          <label class="form-label">Business Name *</label>
          <input class="form-input" v-model="form.business_name" required placeholder="e.g. AC Masters HVAC" />
          <span class="form-error" v-if="errors.business_name">{{ errors.business_name }}</span>
        </div>

        <div class="form-group">
          <label class="form-label">Category</label>
          <select class="form-select" v-model="form.category">
            <option value="">Select category</option>
            <option v-for="cat in categories" :key="cat">{{ cat }}</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Priority Tier</label>
          <select class="form-select" v-model="form.priority_tier">
            <option value="">Select tier</option>
            <option>Tier 1 - High Priority</option>
            <option>Tier 2 - Medium Priority</option>
            <option>Tier 3 - Low Priority</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Phone</label>
          <input class="form-input" v-model="form.phone" placeholder="(904) 555-0100" />
        </div>

        <div class="form-group">
          <label class="form-label">Email</label>
          <input class="form-input" type="email" v-model="form.email" placeholder="contact@business.com" />
        </div>

        <div class="form-group span-2">
          <label class="form-label">Website</label>
          <input class="form-input" v-model="form.website" placeholder="https://www.business.com" />
        </div>

        <div class="form-group span-2">
          <label class="form-label">Address</label>
          <input class="form-input" v-model="form.address" placeholder="123 Main St" />
        </div>

        <div class="form-group">
          <label class="form-label">City</label>
          <input class="form-input" v-model="form.city" placeholder="Jacksonville" />
        </div>

        <div class="form-group">
          <label class="form-label">Contact Quality</label>
          <select class="form-select" v-model="form.contact_quality">
            <option value="">Select</option>
            <option>Complete</option>
            <option>Phone Only</option>
          </select>
        </div>

        <div class="form-group span-2">
          <label class="form-label">Notes</label>
          <textarea class="form-textarea" v-model="form.notes" placeholder="Any initial notes..." rows="3" />
        </div>
      </div>
    </form>

    <template #footer>
      <button class="btn btn-secondary" type="button" @click="$emit('close')">Cancel</button>
      <button class="btn btn-primary" @click="submit" :disabled="saving">
        <span class="spinner" style="width:14px;height:14px;border-width:2px" v-if="saving"></span>
        {{ saving ? 'Creating...' : 'Create Lead' }}
      </button>
    </template>
  </Modal>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import Modal from './Modal.vue';
import { leads } from '../api';
import { store } from '../store';

const emit = defineEmits(['close', 'created']);

const categories = ref([]);
const saving = ref(false);
const errors = ref({});

const form = ref({
  business_name: '',
  category: '',
  priority_tier: '',
  contact_quality: '',
  phone: '',
  email: '',
  website: '',
  address: '',
  city: 'Jacksonville',
  notes: '',
});

onMounted(async () => {
  try {
    const res = await leads.categories();
    categories.value = res.data;
  } catch {}
});

async function submit() {
  errors.value = {};
  if (!form.value.business_name.trim()) {
    errors.value.business_name = 'Business name is required';
    return;
  }
  saving.value = true;
  try {
    const res = await leads.create(form.value);
    emit('created', res.data);
  } catch (err) {
    store.addToast(err.response?.data?.error || 'Failed to create lead', 'error');
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.span-2 { grid-column: span 2; }
</style>
