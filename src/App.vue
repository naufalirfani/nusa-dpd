<script setup>
import GlobalLoading from '@/components/GlobalLoading.vue'
</script>

<template>
    <router-view />
    <GlobalLoading />
</template>

<style scoped>
/* keep previous minimal styling if needed */
header { line-height: 1.5; }
</style>
