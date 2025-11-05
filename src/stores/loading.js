import { ref } from 'vue'

// Simple reactive loading store used by components and router
export const loading = ref(false)
export function showLoading() { loading.value = true }
export function hideLoading() { loading.value = false }

export default {
  loading,
  showLoading,
  hideLoading,
}
