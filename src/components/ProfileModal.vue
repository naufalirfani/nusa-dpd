<template>
  <transition name="modal-fade" appear>
    <div class="fixed inset-0 z-50 flex items-center justify-center">
      <transition name="overlay-fade">
        <div class="absolute inset-0 bg-black/50" @click="close"></div>
      </transition>

      <transition name="scale-fade">
        <div class="relative bg-white rounded-lg shadow-xl w-full max-w-2xl p-4 overflow-auto" style="max-height:90vh;">
          <header class="flex items-center justify-between p-4 border-b">
            <h3 class="text-lg font-semibold">Detail Profil</h3>
            <button class="text-gray-500 hover:text-gray-700" @click="close" aria-label="Tutup">✕</button>
          </header>

          <section class="p-4">
            <div v-if="!profile">Tidak ada data profil.</div>

            <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <div class="text-xs text-gray-500">Nama</div>
                <div class="text-gray-800 font-medium">{{ fullName }}</div>
              </div>

              <div>
                <div class="text-xs text-gray-500">NIP</div>
                <div class="text-gray-800 font-medium">{{ profile.nip || profile.nipBaru || '-' }}</div>
              </div>

              <div>
                <div class="text-xs text-gray-500">Email</div>
                <div class="text-gray-800">{{ profile.email || profile.emailGov || '-' }}</div>
              </div>

              <div>
                <div class="text-xs text-gray-500">No. HP</div>
                <div class="text-gray-800">{{ profile.noHp || profile.noTelp || '-' }}</div>
              </div>

              <div>
                <div class="text-xs text-gray-500">Instansi</div>
                <div class="text-gray-800">{{ profile.instansiKerjaNama || profile.instansiIndukNama || '-' }}</div>
              </div>

              <div>
                <div class="text-xs text-gray-500">Jabatan</div>
                <div class="text-gray-800">{{ profile.jabatanNama || profile.jabatanFungsionalUmumNama || '-' }}</div>
              </div>

              <div>
                <div class="text-xs text-gray-500">Golongan</div>
                <div class="text-gray-800">{{ profile.golRuangAkhir || profile.golRuangAkhirId || '-' }}</div>
              </div>

              <div>
                <div class="text-xs text-gray-500">Unit Kerja</div>
                <div class="text-gray-800">{{ profile.unorNama || '-' }} <span v-if="profile.unorIndukNama">/ {{ profile.unorIndukNama }}</span></div>
              </div>

              <div>
                <div class="text-xs text-gray-500">Tempat, Tgl Lahir</div>
                <div class="text-gray-800">{{ profile.tempatLahir || '-' }}, {{ profile.tglLahir || '-' }}</div>
              </div>

              <div>
                <div class="text-xs text-gray-500">Pendidikan Terakhir</div>
                <div class="text-gray-800">{{ profile.pendidikanTerakhirNama || '-' }}</div>
              </div>

              <div class="sm:col-span-2">
                <div class="text-xs text-gray-500">Alamat</div>
                <div class="text-gray-800">{{ profile.alamat || '-' }}</div>
              </div>
            </div>
          </section>

          <footer class="p-4 border-t flex justify-end gap-2">
            <button class="px-4 py-2 bg-gray-100 rounded-md" @click="close">Tutup</button>
          </footer>
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

const fullName = computed(() => {
  if (!props.profile) return '';
  const p = props.profile;
  const front = p.gelarDepan || p.gelar_depan || '';
  const back = p.gelarBelakang || p.gelar_belakang || '';
  const name = p.nama || p.name || '';
  const frontPart = front ? `${front} ` : '';
  const backPart = back ? `, ${back}` : '';
  return `${frontPart}${name}${backPart}`.trim();
});
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
