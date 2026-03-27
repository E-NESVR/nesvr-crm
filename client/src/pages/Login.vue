<template>
  <div class="login-page">
    <div class="login-card">
      <div class="login-logo">
        <div class="logo-mark-lg">N</div>
        <div class="login-brand">
          <div class="brand-name">NESVR</div>
          <div class="brand-sub">CRM Platform</div>
        </div>
      </div>

      <div class="login-divider"></div>

      <form class="login-form" @submit.prevent="submit">
        <div class="form-group">
          <label class="form-label">Username</label>
          <input
            class="form-input"
            type="text"
            v-model="username"
            placeholder="errol, nick, or shane"
            autocomplete="username"
            autofocus
            :disabled="loading"
          />
        </div>

        <div class="form-group">
          <label class="form-label">Password</label>
          <input
            class="form-input"
            type="password"
            v-model="password"
            placeholder="••••••••"
            autocomplete="current-password"
            :disabled="loading"
          />
        </div>

        <div class="form-error-banner" v-if="error">{{ error }}</div>

        <button class="btn btn-primary w-full" type="submit" :disabled="loading" style="height:42px">
          <span class="spinner" style="width:16px;height:16px;border-width:2px" v-if="loading"></span>
          <span v-else>Sign In</span>
        </button>
      </form>

      <div class="login-footer">
        <span class="text-muted text-sm">NESVR · AI Phone Receptionist Sales</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { auth } from '../api';
import { store } from '../store';

const router = useRouter();
const username = ref('');
const password = ref('');
const loading = ref(false);
const error = ref('');

async function submit() {
  if (!username.value || !password.value) {
    error.value = 'Please enter your username and password';
    return;
  }
  loading.value = true;
  error.value = '';
  try {
    const res = await auth.login(username.value, password.value);
    store.setUser(res.data.user);
    router.push('/dashboard');
  } catch (err) {
    error.value = err.response?.data?.error || 'Login failed. Please try again.';
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  background: var(--bg-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background-image:
    radial-gradient(ellipse at 20% 50%, rgba(59, 130, 246, 0.06) 0%, transparent 50%),
    radial-gradient(ellipse at 80% 20%, rgba(99, 102, 241, 0.05) 0%, transparent 50%);
}

.login-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  padding: 40px;
  width: 100%;
  max-width: 380px;
  box-shadow: var(--shadow-lg);
}

.login-logo {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 28px;
}

.logo-mark-lg {
  width: 48px; height: 48px;
  background: linear-gradient(135deg, var(--accent-blue), #6366f1);
  border-radius: 14px;
  display: flex; align-items: center; justify-content: center;
  font-size: 24px; font-weight: 900; color: white;
  box-shadow: 0 4px 14px rgba(59, 130, 246, 0.4);
}

.brand-name {
  font-size: 22px;
  font-weight: 800;
  letter-spacing: 0.1em;
  color: var(--text-primary);
}

.brand-sub {
  font-size: 12px;
  color: var(--text-muted);
  letter-spacing: 0.05em;
  margin-top: 1px;
}

.login-divider {
  height: 1px;
  background: var(--border);
  margin-bottom: 28px;
}

.login-form { display: flex; flex-direction: column; gap: 16px; }

.form-error-banner {
  background: var(--danger-dim);
  border: 1px solid var(--danger);
  color: var(--danger);
  border-radius: var(--radius-md);
  padding: 10px 12px;
  font-size: 13px;
}

.login-footer {
  text-align: center;
  margin-top: 24px;
}
</style>
