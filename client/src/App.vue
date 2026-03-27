<template>
  <div class="app-root">
    <router-view v-if="$route.meta.public" />
    <AppLayout v-else>
      <router-view />
    </AppLayout>
    <ToastContainer />
  </div>
</template>

<script setup>
import AppLayout from './components/AppLayout.vue';
import ToastContainer from './components/ToastContainer.vue';
</script>

<style>
.app-root { min-height: 100vh; }
</style>
