<template>
  <div class="fixed inset-0 min-h-screen flex items-center justify-center bg-gradient-to-b from-white to-gray-50">
    <div class="max-w-4xl w-full px-6">
      <div class="bg-white shadow-xl rounded-2xl p-8 md:p-12 flex flex-col md:flex-row items-center gap-8">
        <!-- Illustration -->
        <div class="flex-1 flex items-center justify-center">
          <svg class="w-56 h-56 illustration-float" viewBox="0 0 240 240" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
            <defs>
              <linearGradient id="g1" x1="0" x2="1">
                <stop offset="0" stop-color="#06b6d4" />
                <stop offset="1" stop-color="#0891b2" />
              </linearGradient>
            </defs>
            <rect x="16" y="16" width="208" height="208" rx="24" fill="#f8fafc" stroke="#e6eef0" />
            <g transform="translate(40,40)">
              <path d="M0 96 C24 50, 96 24, 128 56 C160 88, 112 160, 64 144 C24 132, 0 96, 0 96 Z" fill="url(#g1)" opacity="0.95" />
              <circle cx="140" cy="20" r="12" fill="#fde68a" />
              <rect x="96" y="96" width="56" height="20" rx="6" fill="#fff" opacity="0.6" />
            </g>
          </svg>
        </div>

        <!-- Content -->
        <div class="flex-1">
          <h1 class="text-5xl font-extrabold text-gray-800 mb-2">404</h1>
          <h2 class="text-xl text-gray-600 mb-4">Halaman tidak ditemukan</h2>
          <p class="text-gray-500 mb-6">Sepertinya halaman yang Anda cari tidak ada atau telah dipindahkan. Silakan kembali ke beranda.</p>

          <div class="flex items-center gap-3">
            <router-link to="/" class="px-4 py-2 rounded-lg bg-teal-500 border border-gray-200 text-white hover:shadow">Kembali ke Login</router-link>
          </div>
        </div>
      </div>
      <p class="text-center text-xs text-gray-400 mt-6">© 2025. BPSDM. All rights reserved.</p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
const query = ref('')
const router = useRouter()

function onSearch() {
  // placeholder: no real search backend — for now we navigate home or show a small alert
  if (!query.value.trim()) return router.push('/')
  try {
    if (typeof Swal !== 'undefined') Swal.fire({ icon: 'info', title: 'Pencarian', text: `Tidak ditemukan hasil untuk "${query.value}"` })
    else alert(`No results for "${query.value}"`)
  } catch (e) {
    /* ignore */
  }
}
</script>

<style scoped>
/* subtle floating animation for illustration */
.illustration-float { animation: float 6s ease-in-out infinite }
@keyframes float { 0% { transform: translateY(0) } 50% { transform: translateY(-8px) } 100% { transform: translateY(0) } }
</style>
