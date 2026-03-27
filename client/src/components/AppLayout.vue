<template>
  <div class="app-shell">
    <Sidebar />
    <div class="main-content">
      <TopBar />
      <main class="page-content">
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup>
import Sidebar from './Sidebar.vue';
import TopBar from './TopBar.vue';
</script>
