<template>
  <button class="theme-toggle btn btn-ghost btn-icon btn-sm" @click="cycle" :title="`Theme: ${store.theme}`">
    <!-- Sun -->
    <svg v-if="currentTheme === 'light'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="17" height="17">
      <circle cx="12" cy="12" r="5"/>
      <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
      <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
    </svg>
    <!-- Moon -->
    <svg v-else-if="currentTheme === 'dark'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="17" height="17">
      <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
    </svg>
    <!-- Auto -->
    <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="17" height="17">
      <circle cx="12" cy="12" r="9"/>
      <path d="M12 3v9l4 4"/>
    </svg>
  </button>
</template>

<script setup>
import { computed } from 'vue';
import { store } from '../store';

const themes = ['dark', 'light', 'auto'];

const currentTheme = computed(() => {
  if (store.theme === 'auto') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return store.theme;
});

function cycle() {
  const idx = themes.indexOf(store.theme);
  store.setTheme(themes[(idx + 1) % themes.length]);
}
</script>
