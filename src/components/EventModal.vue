<template>
  <teleport to="body">
    <transition name="modal-fade" appear>
      <div class="fixed inset-0 flex items-center justify-center" style="z-index:9999;">
      <transition name="overlay-fade">
        <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" @click="onClose"></div>
      </transition>

      <transition name="scale-fade">
        <div class="relative w-full max-w-2xl overflow-hidden" style="max-height:92vh;">
          <div class="relative m-4 rounded-2xl ring-1 ring-black/5 shadow-2xl bg-white">
            <div class="flex items-center justify-between px-6 py-4 border-b">
              <div>
                <div class="text-lg font-semibold text-gray-900">Tambah Kegiatan</div>
                <div class="text-sm text-gray-500">Buat event baru dan simpan ke kalender</div>
              </div>
              <button @click="onClose" class="text-gray-500 hover:text-gray-700 rounded-lg p-2 hover:bg-gray-100" aria-label="Tutup">✕</button>
            </div>

            <form @submit.prevent="submit" class="p-6 space-y-4">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="text-xs font-medium text-gray-700">Judul (Summary)</label>
            <input v-model="form.summary" required class="mt-1 w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-200" placeholder="Contoh: Rapat Tim" />
          </div>
          <div>
            <label class="text-xs font-medium text-gray-700">Lokasi</label>
            <input v-model="form.location" class="mt-1 w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-200" placeholder="Contoh: Ruang A / Zoom" />
          </div>
        </div>

        <div>
          <label class="text-xs font-medium text-gray-700">Deskripsi</label>
          <textarea v-model="form.description" rows="3" class="mt-1 w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-200" placeholder="Deskripsi singkat..."></textarea>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="text-xs font-medium text-gray-700">Waktu Mulai (Start)</label>
            <input v-model="form.start" :min="minStart" type="datetime-local" required
              @blur="onStartBlur"
              :class="['mt-1 w-full border rounded px-3 py-2 text-sm', (startTouched && isStartInvalid) ? 'border-rose-600' : '']" />
            <p v-if="startTouched && isStartInvalid" class="mt-1 text-xs text-rose-600">Tidak boleh sebelum sekarang.</p>
          </div>
          <div>
            <label class="text-xs font-medium text-gray-700">Waktu Selesai (End)</label>
            <input v-model="form.end" :min="form.start || minStart" type="datetime-local" required
              @blur="onEndBlur"
              :class="['mt-1 w-full border rounded px-3 py-2 text-sm', (endTouched && isEndInvalid) ? 'border-rose-600' : '']" />
            <p v-if="endTouched && isEndInvalid" class="mt-1 text-xs text-rose-600">Waktu selesai tidak boleh kurang dari waktu mulai.</p>
          </div>
        </div>

        <div>
          <label class="text-xs font-medium text-gray-700">Zona Waktu</label>
          <select v-model="form.timezone" class="mt-1 w-full border rounded px-3 py-2 text-sm">
            <option v-for="tz in timezones" :key="tz.value" :value="tz.value">{{ tz.label }}</option>
          </select>
        </div>

        <div class="flex items-center justify-end gap-3">
          <div class="text-sm text-rose-600" v-if="error">{{ error }}</div>
          <div class="flex items-center justify-end gap-3">
            <button type="button" @click="onClose" class="px-3 py-2 rounded bg-white border text-sm transition-transform duration-150 ease-in-out transform hover:-translate-y-1 hover:shadow-md hover:bg-gray-50">Batal</button>
            <button type="submit" :disabled="loading" class="px-4 py-2 rounded bg-teal-600 text-white text-sm transition-transform duration-150 ease-in-out transform hover:-translate-y-1 hover:scale-105 hover:shadow-lg disabled:opacity-60">
              <span v-if="loading" class="inline-flex items-center gap-2">
                <svg class="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10" stroke-width="4" stroke-opacity="0.2"></circle><path d="M4 12a8 8 0 018-8v4" stroke-width="4"></path></svg>
                Menyimpan...
              </span>
              <span v-else>Simpan</span>
            </button>
          </div>
        </div>
      </form>
            </div>
        </div>
      </transition>
      </div>
    </transition>
  </teleport>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted, computed } from 'vue';
import axios from 'axios';
import { getCmbApiUrl } from '../config/api';

const props = defineProps({
  initialDate: { type: [String, Date], default: null }
});
const emit = defineEmits(['close', 'added']);

const loading = ref(false);
const error = ref('');

function toLocalDatetimeInputValue(d) {
  if (!d) return '';
  const dt = (typeof d === 'string') ? new Date(d) : d;
  if (!dt || isNaN(dt)) return '';
  const tzOffset = dt.getTimezoneOffset() * 60000;
  const local = new Date(dt.getTime() - tzOffset);
  return local.toISOString().slice(0,16);
}

const defaultTz = (Intl && Intl.DateTimeFormat) ? (Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC') : 'UTC';

function shortIndoLabel(tz) {
  if (!tz) return '';
  const s = String(tz).toLowerCase();
  if (s.includes('jakarta') || s.includes('asia/jakarta')) return 'WIB';
  if (s.includes('makassar') || s.includes('asia/makassar') || s.includes('denpasar')) return 'WITA';
  if (s.includes('jayapura') || s.includes('asia/jayapura')) return 'WIT';
  return '';
}

// common timezone choices (IANA) with labels (include WIB/WITA/WIT where relevant)
const timezones = ref([
  { value: 'Asia/Jakarta', label: 'Asia/Jakarta (WIB)' },
  { value: 'Asia/Makassar', label: 'Asia/Makassar (WITA)' },
  { value: 'Asia/Jayapura', label: 'Asia/Jayapura (WIT)' },
  { value: 'UTC', label: 'UTC' },
  { value: 'Asia/Shanghai', label: 'Asia/Shanghai' },
  { value: 'Asia/Tokyo', label: 'Asia/Tokyo' },
  { value: 'Europe/London', label: 'Europe/London' },
  { value: 'America/New_York', label: 'America/New_York' }
]);

// ensure browser default is included (add at top if missing)
if (defaultTz) {
  const exists = timezones.value.some(t => t.value === defaultTz);
  if (!exists) {
    const short = shortIndoLabel(defaultTz);
    const label = short ? `${defaultTz} (${short})` : defaultTz;
    timezones.value.unshift({ value: defaultTz, label });
  }
}

const form = ref({
  summary: '',
  description: '',
  location: '',
  start: '',
  end: '',
  timezone: defaultTz,
});

// touched flags for showing validation messages after blur
const startTouched = ref(false);
const endTouched = ref(false);

function onStartBlur() { startTouched.value = true; }
function onEndBlur() { endTouched.value = true; }

const isStartInvalid = computed(() => {
  if (!form.value.start) return false;
  try {
    const s = new Date(form.value.start);
    return s < new Date();
  } catch (e) { return false; }
});

const isEndInvalid = computed(() => {
  if (!form.value.end) return false;
  try {
    const s = new Date(form.value.start || minStart.value);
    const e = new Date(form.value.end);
    return e < s;
  } catch (e) { return false; }
});

onMounted(() => {
  if (props.initialDate) {
    try {
      const v = toLocalDatetimeInputValue(props.initialDate);
      const startDate = new Date(v);
      const now = new Date();
      if (startDate < now) {
        form.value.start = minStart.value;
        form.value.end = minStart.value;
      } else {
        form.value.start = v;
        form.value.end = v;
      }
    } catch (e) {}
  }
});

// minimum selectable start (local datetime input format)
const minStart = ref(toLocalDatetimeInputValue(new Date()));
let _minInterval = null;
onMounted(() => {
  // keep minStart reasonably up-to-date while modal is open
  _minInterval = setInterval(() => {
    minStart.value = toLocalDatetimeInputValue(new Date());
  }, 30 * 1000);
});
onUnmounted(() => {
  if (_minInterval) clearInterval(_minInterval);
});

// ensure end is never less than start; if it is, snap end to start
watch(() => form.value.start, (v) => {
  if (!v) return;
  if (form.value.end) {
    try {
      const s = new Date(v);
      const e = new Date(form.value.end);
      if (e < s) form.value.end = v;
    } catch (e) {}
  }
});

watch(() => props.initialDate, (v) => {
  if (v) {
    try {
      const vstr = toLocalDatetimeInputValue(v);
      const sdate = new Date(vstr);
      const now = new Date();
      if (sdate < now) {
        form.value.start = minStart.value;
        form.value.end = minStart.value;
      } else {
        form.value.start = vstr;
        form.value.end = vstr;
      }
    } catch (e) {
      form.value.start = toLocalDatetimeInputValue(v);
      form.value.end = form.value.start;
    }
  }
});

function onClose() {
  emit('close');
}

async function submit() {
  error.value = '';
  // basic validation
  if (!form.value.summary) { error.value = 'Judul wajib diisi'; return; }
  if (!form.value.start || !form.value.end) { error.value = 'Start dan End wajib diisi'; return; }
  // prevent backdate start
  try {
    const now = new Date();
    const startDate = new Date(form.value.start);
    if (startDate < now) { error.value = 'Waktu mulai tidak boleh sebelum sekarang'; return; }
  } catch (e) {}
  const startIso = new Date(form.value.start).toISOString();
  const endIso = new Date(form.value.end).toISOString();
  if (new Date(startIso) > new Date(endIso)) { error.value = 'Waktu selesai harus setelah mulai'; return; }

  loading.value = true;
  try {
    const payload = {
      summary: form.value.summary,
      description: form.value.description,
      location: form.value.location,
      start: startIso,
      end: endIso,
      timezone: form.value.timezone || defaultTz,
    };

    const token = localStorage.getItem("token") || "";
    const apiToken = import.meta.env.VITE_SSO_GENERATE_TOKEN || "";
    const headers = { 'Content-Type': 'application/json' };
    if (apiToken) {
      // encrypt token for header using shared helper (falls back to raw)
      try {
        const { encryptTokenForHeader } = await import("../utils/crypto");
        headers["X-Api-Token"] = await encryptTokenForHeader(apiToken, {
          salt: apiToken,
        });
      } catch (e) {
        headers["X-Api-Token"] = apiToken;
      }
    }
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const apiUrl = getCmbApiUrl('/calendar/event');
    const resp = await axios.post(apiUrl, payload, { headers });
    // assume success if status 2xx
    emit('added', resp && resp.data ? resp.data : payload);
    emit('close');
  } catch (err) {
    console.error('Failed to add event', err);
    error.value = (err && err.response && err.response.data && err.response.data.message) ? String(err.response.data.message) : 'Gagal menyimpan event';
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.rounded { border-radius: 0.5rem; }

/* overlay fade */
.overlay-fade-enter-active,
.overlay-fade-leave-active {
  transition: opacity 180ms ease;
}
.overlay-fade-enter-from,
.overlay-fade-leave-to {
  opacity: 0;
}

/* modal root fade */
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
