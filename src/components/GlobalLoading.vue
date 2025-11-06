<template>
  <transition name="fade-fast">
    <div
      v-if="loading"
      class="fixed inset-0 z-50 flex items-center justify-center"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <!-- Dim/blurred backdrop with subtle aurora blobs -->
      <div class="absolute inset-0 bg-black/30 backdrop-blur-sm"></div>
      <div class="pointer-events-none absolute -top-24 -left-24 h-80 w-80 rounded-full bg-teal-400/20 blur-3xl"></div>
      <div class="pointer-events-none absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-sky-400/20 blur-3xl"></div>

      <!-- Glass card -->
      <div class="relative mx-4 w-full max-w-md">
        <div class="relative overflow-hidden rounded-2xl bg-white/75 p-6 shadow-2xl ring-1 ring-black/5 backdrop-blur-lg sm:p-8">
          <!-- subtle gradient border glow -->
          <div class="pointer-events-none absolute inset-px rounded-2xl bg-gradient-to-br from-white/0 via-white/10 to-white/0"></div>

          <div class="relative flex items-center gap-4">
            <!-- Spinner -->
            <div class="relative h-12 w-12 sm:h-14 sm:w-14">
              <span class="absolute inset-0 rounded-full border-2 border-teal-400/20"></span>
              <span class="absolute inset-0 rounded-full border-2 border-transparent border-t-teal-500 animate-spin"></span>
              <span class="absolute inset-2 rounded-full bg-gradient-to-br from-teal-100 to-sky-100 opacity-60"></span>
            </div>

            <div class="min-w-0">
              <div class="text-base font-semibold tracking-tight text-gray-800 sm:text-lg">
                Memproses...
              </div>
              <p class="mt-0.5 text-sm text-gray-600">Silakan tunggu sebentar</p>

              <!-- Progress shimmer bar -->
              <div class="mt-3 h-1.5 w-44 overflow-hidden rounded-full bg-gray-200/80 sm:w-56">
                <div class="h-full w-1/3 animate-shimmer rounded-full bg-gradient-to-r from-teal-400 via-sky-400 to-teal-400"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { loading } from '@/stores/loading'
// `loading` is a ref exported by the store
</script>

<style scoped>
/* quick fade */
.fade-fast-enter-active, .fade-fast-leave-active { transition: opacity .18s ease; }
.fade-fast-enter-from, .fade-fast-leave-to { opacity: 0; }

/* shimmer animation for progress bar */
@keyframes shimmer {
  0% { transform: translateX(-100%); }
  50% { transform: translateX(20%); }
  100% { transform: translateX(100%); }
}
.animate-shimmer { animation: shimmer 1.3s ease-in-out infinite; }
</style>
