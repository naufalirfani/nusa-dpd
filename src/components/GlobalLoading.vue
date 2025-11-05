<template>
  <div v-if="loading" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
    <div class="bg-white/90 rounded-md p-4 flex items-center gap-3 shadow-lg">
      <svg class="w-6 h-6 animate-spin text-teal-600" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
      </svg>
      <div class="text-sm text-gray-800">Memproses... Silakan tunggu</div>
    </div>
  </div>
</template>

<script setup>
import { loading } from '@/stores/loading'
// `loading` is a ref exported by the store
</script>

<style scoped>
/* small visual tweaks */
.bg-white\/90 { backdrop-filter: blur(2px); }
</style>
