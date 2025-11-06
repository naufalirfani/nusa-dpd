<template>
  <transition name="modal-fade" appear>
    <div class="fixed inset-0 z-50 flex items-center justify-center">
      <!-- Dim + blur overlay -->
      <transition name="overlay-fade">
        <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" @click="close"></div>
      </transition>

      <!-- Modal card -->
      <transition name="scale-fade">
        <div class="relative w-full max-w-3xl overflow-hidden" style="max-height:92vh;">
          <div class="relative m-4 rounded-2xl ring-1 ring-black/5 shadow-2xl bg-white/80 backdrop-blur-xl">
            <!-- Decorative gradient border -->
            <!-- <div class="absolute inset-x-0 -top-24 h-56 bg-gradient-to-r from-indigo-500 via-sky-500 to-emerald-500 opacity-30 blur-3xl pointer-events-none"></div> -->

            <!-- Header -->
            <header class="relative px-6 pt-6 pb-4 sm:px-8 sm:pt-8">
              <div class="flex items-start gap-4 sm:gap-6">
                <!-- Avatar -->
                <div class="relative -mt-10 sm:-mt-12">
                  <div class="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl ring-2 ring-white shadow-xl bg-gradient-to-br from-indigo-600 to-sky-500 text-white grid place-items-center text-2xl sm:text-3xl font-semibold select-none">
                    {{ initials }}
                  </div>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-start justify-between gap-3">
                    <div class="min-w-0">
                      <h3 class="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 truncate">{{ displayName }}</h3>
                      <p class="mt-1 text-sm text-slate-600 flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span v-if="jabatan" class="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-slate-100 text-slate-700">
                          <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 6v12M6 12h12" opacity=".2"/><path d="M5 21h14a2 2 0 0 0 2-2v-6l-7-3-7 3v6a2 2 0 0 0 2 2z"/></svg>
                          {{ jabatan }}
                        </span>
                        <span v-if="instansi" class="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-sky-50 text-sky-700">
                          <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18M5 21V8l7-5 7 5v13"/></svg>
                          {{ instansi }}
                        </span>
                        <span v-if="golongan" class="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-50 text-emerald-700">
                          <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3l3.09 6.26L22 10l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.87 2 10l6.91-1.74L12 3z"/></svg>
                          {{ golongan }}
                        </span>
                      </p>
                    </div>
                    <button class="shrink-0 text-slate-500 hover:text-slate-700 rounded-lg p-2 hover:bg-slate-100 transition" @click="close" aria-label="Tutup">
                      <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M6 18L18 6"/></svg>
                    </button>
                  </div>

                  <!-- Quick chips -->
                  <div class="mt-3 flex flex-wrap gap-2 text-xs">
                    <span v-if="nip" class="inline-flex items-center gap-1 rounded-md bg-white/70 ring-1 ring-slate-200 px-2 py-1 text-slate-700">
                      <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 8h10M7 12h6"/></svg>
                      NIP: <strong class="font-semibold">{{ nip }}</strong>
                      <button class="ml-1 text-slate-500 hover:text-slate-700" @click="copy(nip)" title="Salin NIP">
                        <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                      </button>
                    </span>
                    <span v-if="email" class="inline-flex items-center gap-1 rounded-md bg-white/70 ring-1 ring-slate-200 px-2 py-1 text-slate-700">
                      <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16v16H4z" opacity=".2"/><path d="M4 8l8 5 8-5"/></svg>
                      {{ email }}
                      <button class="ml-1 text-slate-500 hover:text-slate-700" @click="copy(email)" title="Salin Email">
                        <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                      </button>
                    </span>
                    <span v-if="phone" class="inline-flex items-center gap-1 rounded-md bg-white/70 ring-1 ring-slate-200 px-2 py-1 text-slate-700">
                      <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92V21a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.07-8.67A2 2 0 0 1 4 3h4.09a2 2 0 0 1 2 1.72 12.6 12.6 0 0 0 .67 2.8 2 2 0 0 1-.45 2.11L9 11a16 16 0 0 0 6 6l1.37-1.31a2 2 0 0 1 2.11-.45 12.6 12.6 0 0 0 2.8.67A2 2 0 0 1 22 16.92z"/></svg>
                      {{ phone }}
                    </span>
                  </div>
                </div>
              </div>
            </header>

            <!-- Content -->
            <section class="relative px-6 pb-6 sm:px-8 sm:pb-8">
              <div v-if="!profile" class="flex items-center justify-center py-16">
                <div class="text-center">
                  <div class="mx-auto h-12 w-12 rounded-xl bg-slate-100 text-slate-400 grid place-items-center mb-3">
                    <svg class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9 10h6M9 14h3"/></svg>
                  </div>
                  <p class="text-slate-600">Tidak ada data profil.</p>
                </div>
              </div>

              <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <!-- Left: Key info -->
                <div class="lg:col-span-2">
                  <div class="rounded-xl ring-1 ring-slate-200 bg-white/70">
                    <div class="divide-y divide-slate-100">
                      <div class="p-4 sm:p-5 grid sm:grid-cols-2 gap-4">
                        <div>
                          <div class="text-xs uppercase tracking-wider text-slate-500">Nama</div>
                          <div class="mt-0.5 text-slate-900 font-medium">{{ displayName || '-' }}</div>
                        </div>
                        <div>
                          <div class="text-xs uppercase tracking-wider text-slate-500">Tempat, Tgl Lahir</div>
                          <div class="mt-0.5 text-slate-900 font-medium">{{ ttl || '-' }}</div>
                        </div>
                        <div>
                          <div class="text-xs uppercase tracking-wider text-slate-500">Instansi</div>
                          <div class="mt-0.5 text-slate-900 font-medium">{{ instansi || '-' }}</div>
                        </div>
                        <div>
                          <div class="text-xs uppercase tracking-wider text-slate-500">Unit Kerja</div>
                          <div class="mt-0.5 text-slate-900 font-medium">{{ unitKerja || '-' }}</div>
                        </div>
                        <div>
                          <div class="text-xs uppercase tracking-wider text-slate-500">Jabatan</div>
                          <div class="mt-0.5 text-slate-900 font-medium">{{ jabatan || '-' }}</div>
                        </div>
                        <div>
                          <div class="text-xs uppercase tracking-wider text-slate-500">Pendidikan</div>
                          <div class="mt-0.5 text-slate-900 font-medium">{{ pendidikan || '-' }}</div>
                        </div>
                      </div>
                      <div class="p-4 sm:p-5">
                        <div class="text-xs uppercase tracking-wider text-slate-500 mb-2">Alamat</div>
                        <p class="text-slate-800 leading-relaxed">{{ alamat || '-' }}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <!-- Footer -->
            <footer class="relative px-6 pb-6 sm:px-8 sm:pb-8">
              <div class="flex justify-end">
                <button class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 text-white shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition" @click="close">
                  <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M6 18L18 6"/></svg>
                  Tutup
                </button>
              </div>
            </footer>
          </div>
        </div>
      </transition>
    </div>
  </transition>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  profile: { type: Object, default: null }
});
const emit = defineEmits(['close']);

function close() {
  emit('close');
}

// Derived fields for cleaner template
const displayName = computed(() => {
  if (!props.profile) return '';
  const p = props.profile;
  const front = p.gelarDepan || p.gelar_depan || '';
  const back = p.gelarBelakang || p.gelar_belakang || '';
  const name = p.nama || p.name || '';
  const frontPart = front ? `${front} ` : '';
  const backPart = back ? `, ${back}` : '';
  return `${frontPart}${name}${backPart}`.trim();
});

const initials = computed(() => {
  const n = (displayName.value || '').replace(/[,]/g, '').trim();
  if (!n) return '👤';
  const parts = n.split(/\s+/).slice(0, 2);
  return parts.map(s => s[0]).join('').toUpperCase();
});

const nip = computed(() => props.profile && (props.profile.nip || props.profile.nipBaru) || '');
const email = computed(() => props.profile && (props.profile.email || props.profile.emailGov) || '');
const phone = computed(() => props.profile && (props.profile.noHp || props.profile.noTelp) || '');
const instansi = computed(() => props.profile && (props.profile.instansiKerjaNama || props.profile.instansiIndukNama) || '');
const jabatan = computed(() => props.profile && (props.profile.jabatanNama || props.profile.jabatanFungsionalUmumNama) || '');
const golongan = computed(() => props.profile && (props.profile.golRuangAkhir || props.profile.golRuangAkhirId) || '');
const unitKerja = computed(() => {
  if (!props.profile) return '';
  const u = props.profile.unorNama || '';
  const ui = props.profile.unorIndukNama || '';
  return [u, ui].filter(Boolean).join(' / ');
});
const ttl = computed(() => {
  if (!props.profile) return '';
  const t = props.profile.tempatLahir || '-';
  const d = props.profile.tglLahir || '-';
  return `${t}, ${d}`;
});
const pendidikan = computed(() => props.profile?.pendidikanTerakhirNama || '');
const alamat = computed(() => props.profile?.alamat || '');

function copy(text) {
  if (!text) return;
  try {
    navigator.clipboard?.writeText(text);
  } catch (e) {
    // no-op fallback
  }
}
</script>

<style scoped>
/* overlay fade */
.overlay-fade-enter-active,
.overlay-fade-leave-active {
  transition: opacity 180ms ease;
}
.overlay-fade-enter-from,
.overlay-fade-leave-to {
  opacity: 0;
}

/* modal root fade (not strictly necessary but keeps overall timing) */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 160ms ease;
}
.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

/* scale + fade for modal content */
.scale-fade-enter-active,
.scale-fade-leave-active {
  transition: transform 220ms cubic-bezier(.2,.8,.2,1), opacity 220ms ease;
}
.scale-fade-enter-from {
  transform: translateY(6px) scale(.98);
  opacity: 0;
}
.scale-fade-enter-to {
  transform: translateY(0) scale(1);
  opacity: 1;
}
.scale-fade-leave-from {
  transform: translateY(0) scale(1);
  opacity: 1;
}
.scale-fade-leave-to {
  transform: translateY(6px) scale(.98);
  opacity: 0;
}

</style>


