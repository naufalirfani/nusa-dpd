<template>
  <div class="min-h-screen flex flex-col bg-gray-50">
    <!-- Header -->
    <header class="bg-white border-b border-gray-100">
      <div class="mx-auto px-4 py-4 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <img :src="logo" alt="Logo" class="h-12 w-12 object-contain" />
          <div>
            <div class="text-lg font-semibold text-gray-800">NUSA DPD RI</div>
            <div class="text-sm text-gray-500">Sistem Manajemen & Portal</div>
          </div>
        </div>

        <div class="flex items-center gap-4">
          <div class="flex items-center bg-white border border-gray-100 rounded-md px-3 py-2 gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div class="text-left hidden md:block">
              <div class="text-sm font-medium text-gray-800">{{ userName }}</div>
              <div class="text-xs text-gray-500">{{ userNip }}</div>
            </div>
            <div class="flex flex-col items-end gap-1">
              <button @click="logout" class="text-xs text-red-600 hover:underline">Logout</button>
            </div>
          </div>
        </div>
      </div>
    </header>

    <!-- Main content -->
    <main class="flex-grow max-w-6xl mx-auto px-4 py-8 w-full">
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Left: Service cards -->
        <section class="lg:col-span-2">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="bg-white rounded-lg shadow p-6 hover:shadow-lg transition">
              <div class="flex items-start justify-between">
                <div>
                  <div class="text-sm text-gray-500">Layanan</div>
                  <div class="text-xl font-semibold text-gray-800">CMB</div>
                </div>
                <img :src="logoCmb" alt="Logo" class="h-12 w-auto rounded-md" />
              </div>
              <p class="mt-4 text-sm text-gray-600 min-h-[160px]">Sebuah platform pembelajaran dan pengembangan kompetensi internal yang dirancang khusus untuk Sekretariat Jenderal Dewan Perwakilan Daerah Republik Indonesia (Setjen DPD RI). Aplikasi ini menjadi wadah terintegrasi bagi seluruh pegawai dalam melaksanakan kegiatan coaching, mentoring, dan belajar mandiri secara digital, efektif, dan terukur.</p>
              <div class="mt-6 flex gap-3">
                <button @click="openService('CMB')" class="px-4 py-2 bg-teal-500 text-white rounded">Buka</button>
                <button @click="more('CMB')" class="px-4 py-2 border rounded">Detail</button>
              </div>
            </div>

            <div class="bg-white rounded-lg shadow p-6 hover:shadow-lg transition">
              <div class="flex items-start justify-between">
                <div>
                  <div class="text-sm text-gray-500">Pembelajaran</div>
                  <div class="text-xl font-semibold text-gray-800">LMS</div>
                </div>
                <div class="text-teal-600 bg-teal-50 rounded-full p-3">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 14l9-5-9-5-9 5 9 5z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 14l6.16-3.422A12.083 12.083 0 0118 19.128V21" />
                  </svg>
                </div>
              </div>
              <p class="mt-4 text-sm text-gray-600 min-h-[160px]">Learning Management System — modul pembelajaran, kuis dan sertifikat.</p>
              <div class="mt-6 flex gap-3">
                <button @click="openService('LMS')" class="px-4 py-2 bg-teal-500 text-white rounded">Buka</button>
                <button @click="more('LMS')" class="px-4 py-2 border rounded">Detail</button>
              </div>
            </div>
          </div>

          <!-- Other content: quick stats -->
          <div class="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div class="bg-white p-4 rounded shadow text-center">
              <div class="text-2xl font-bold text-gray-800">128</div>
              <div class="text-sm text-gray-500">Peserta Aktif</div>
            </div>
            <div class="bg-white p-4 rounded shadow text-center">
              <div class="text-2xl font-bold text-gray-800">24</div>
              <div class="text-sm text-gray-500">Kursus</div>
            </div>
            <div class="bg-white p-4 rounded shadow text-center">
              <div class="text-2xl font-bold text-gray-800">6</div>
              <div class="text-sm text-gray-500">Broadcast Hari Ini</div>
            </div>
          </div>
        </section>

        <!-- Right: recent activity / quick links -->
        <aside class="space-y-4">
          <div class="bg-white p-4 rounded shadow">
            <div class="flex items-center justify-between">
              <div>
                <div class="text-sm text-gray-500">Quick Links</div>
              </div>
            </div>
            <ul class="mt-3 space-y-2 text-sm">
              <li><button @click="openService('CMB')" class="text-teal-600 hover:underline">• Kelola Komunitas</button></li>
              <li><button @click="openService('LMS')" class="text-teal-600 hover:underline">• Modul Pembelajaran</button></li>
              <li><button @click="more('profile')" class="text-teal-600 hover:underline">• Edit Profil</button></li>
            </ul>
          </div>

          <div class="bg-white p-4 rounded shadow">
            <div class="text-sm text-gray-500">Recent Activity</div>
            <ul class="mt-3 text-sm space-y-2 text-gray-600">
              <li>• Anda berhasil login</li>
              <li>• Tidak ada notifikasi baru</li>
            </ul>
          </div>
        </aside>
      </div>
    </main>

    <!-- Footer for dashboard -->
    <Footer />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import Footer from './Footer.vue'
import logoPath from '../assets/logo.png'
import logoCmbPath from "../assets/logo_cmb.png";

const router = useRouter()
const logo = logoPath
const logoCmb = logoCmbPath;

// User data from API
const userProfile = ref(null)
const isLoadingProfile = ref(false)

// get user info from token (if present)
function base64UrlDecode(str) {
  try {
    let s = str.replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    return decodeURIComponent(escape(atob(s)));
  } catch (e) { return null }
}

function getUserFromToken() {
  try {
    const token = localStorage.getItem('token')
    if (!token) return { nip: '-', name: 'Pengguna' }
    const parts = token.split('.')
    if (parts.length !== 3) return { nip: '-', name: 'Pengguna' }
    const payload = JSON.parse(base64UrlDecode(parts[1]) || '{}')
    return { nip: payload.nip || '-', name: payload.name || `NIP ${payload.nip || '-'}` }
  } catch (e) {
    return { nip: '-', name: 'Pengguna' }
  }
}

// Fetch user profile from API
async function fetchUserProfile(nip) {
  isLoadingProfile.value = true
  try {
    const response = await fetch(`https://okk.dpd.go.id/dpd-portal/openapi/profil/${nip}`, {
      method: 'GET',
      headers: {
        'app-token': 'ac54ff35-06cc-4702-8d95-f47c735cfaf7',
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'id-ID,id;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Referer': 'https://okk.dpd.go.id/',
        'Cookie': 'TS011605d9=01bb4f63ecc1bded08d9ea04d7043efc458256b21ee3eeb7c87a538f2edfb268782f28194b57002ef7edbf74213b7ceef97f92e71a; TS011605d9=01bb4f63ecb96b5429e7d56322a464c3d3ebfe12eb10ec74fa15c1078529dbc4bfe52264560b6795129520aaac321f6da0d170c4d3'
      },
    })
    
    if (response.ok) {
      const data = await response.json()
      userProfile.value = data
      // Save to localStorage
      try {
        localStorage.setItem('userProfile', JSON.stringify(data))
      } catch (e) {
        console.error('Failed to save profile to localStorage', e)
      }
      return data
    } else {
      console.error('Failed to fetch user profile:', response.status)
      return null
    }
  } catch (error) {
    console.error('Error fetching user profile:', error)
    return null
  } finally {
    isLoadingProfile.value = false
  }
}

// Load user profile from localStorage or fetch from API
function loadUserProfile() {
  // Try to get from localStorage first
  try {
    const cached = localStorage.getItem('userProfile')
    if (cached) {
      userProfile.value = JSON.parse(cached)
    }
  } catch (e) {
    console.error('Failed to parse cached profile', e)
  }

  // Get NIP from token and fetch fresh data
  const tokenUser = getUserFromToken()
  if (tokenUser.nip && tokenUser.nip !== '-') {
    fetchUserProfile(tokenUser.nip)
  }
}

const userName = computed(() => {
  if (userProfile.value?.nama) return userProfile.value.nama
  const tokenUser = getUserFromToken()
  return tokenUser.name || 'Pengguna'
})

const userNip = computed(() => {
  if (userProfile.value?.nip) return userProfile.value.nip
  const tokenUser = getUserFromToken()
  return tokenUser.nip || '-'
})

function logout() {
  try { localStorage.removeItem('auth') } catch (e) {}
  try { localStorage.removeItem('token') } catch (e) {}
  try { localStorage.removeItem('userProfile') } catch (e) {}
  router.push('/')
}

function openService(name) {
  if (typeof Swal !== 'undefined') Swal.fire({ icon: 'info', title: `Membuka ${name}`, text: 'Fitur demo — arahkan ke modul.' })
  else alert(`Membuka ${name}`)
}

function more(id) {
  if (typeof Swal !== 'undefined') Swal.fire({ icon: 'info', title: 'Detail', text: `Detail untuk ${id}` })
  else alert(`Detail ${id}`)
}

onMounted(() => {
  loadUserProfile()
})
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity .15s ease }
.fade-enter-from, .fade-leave-to { opacity: 0 }
</style>
