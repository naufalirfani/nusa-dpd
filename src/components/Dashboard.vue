<template>
  <div class="min-h-screen flex flex-col bg-gray-50">
    <!-- Header -->
    <header class="bg-white border-b border-gray-100 md:px-6">
      <div class="mx-auto px-4 py-4 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <img :src="logo" alt="Logo" class="h-12 w-12 object-contain" />
          <div>
            <div class="text-lg font-semibold text-gray-800">NUSA DPD RI</div>
            <div class="text-sm text-gray-500">
              Portal pengembangan Sumber Daya Manusia
            </div>
          </div>
        </div>

        <div class="flex items-center gap-4">
          <div
            class="flex items-center bg-white border border-gray-100 rounded-md px-3 py-2 gap-3 cursor-pointer"
            role="button"
            aria-label="Lihat Profil"
            @click="showProfileModal = true"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-10 w-10 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.5"
                d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div class="text-left hidden md:block">
              <div class="text-sm font-medium text-gray-800">
                {{ userName }}
              </div>
              <div class="text-xs text-gray-500">{{ userNip }}</div>
            </div>
            <div class="flex flex-col items-end gap-1">
              <button
                @click.stop="logout"
                class="text-md text-red-600 hover:underline"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>

    <!-- Main content -->
    <main class="flex-grow mx-auto px-4 py-8 w-full md:px-12">
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Left: Service cards -->
        <section class="lg:col-span-2">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <!-- CMB Card (modernized) -->
            <div
              class="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300 overflow-hidden cursor-pointer"
              @click="openService('CMB')"
            >
              <div class="p-6 flex items-start gap-6">
                <div class="flex-1">
                  <div class="flex items-center gap-3">
                    <span
                      class="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-teal-50 text-teal-700"
                      >Layanan</span
                    >
                  </div>

                  <h3 class="mt-3 text-lg font-semibold text-gray-800">
                    CMB
                    <span class="text-sm font-normal text-gray-500"
                      >Coaching · Mentoring · Belajar Mandiri</span
                    >
                  </h3>

                  <p class="mt-2 text-sm text-gray-600 h-[95px]">
                    Platform pembelajaran dan pengembangan kompetensi internal
                    untuk kegiatan coaching, mentoring, dan belajar mandiri
                    secara digital dan terukur.
                  </p>
                </div>

                <img
                  :src="logoCmb"
                  alt="Logo CMB"
                  class="h-20 w-20 rounded-md object-cover shadow-inner"
                />
              </div>
              <div class="p-6 flex items-center gap-3">
                <button
                  @click.stop="openService('CMB')"
                  class="w-full px-4 py-2 bg-teal-600 text-white rounded-md shadow-sm text-sm transform transition duration-200 hover:scale-105 hover:-translate-y-1 hover:shadow-md"
                >
                  Buka
                </button>
              </div>
            </div>

            <!-- LMS Card (modernized) -->
            <div
              class="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300 overflow-hidden cursor-pointer"
              @click="openService('LMS')"
            >
              <div class="p-6 flex items-start gap-6">
                <div class="flex-1">
                  <div class="flex items-center gap-3">
                    <span
                      class="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700"
                      >Pembelajaran</span
                    >
                  </div>

                  <h3 class="mt-3 text-lg font-semibold text-gray-800">
                    LMS
                    <span class="text-sm font-normal text-gray-500"
                      >Learning Management System</span
                    >
                  </h3>

                  <p class="mt-2 text-sm text-gray-600 h-[120px]">
                    Modul pembelajaran, kuis, dan sertifikat untuk mendukung
                    peningkatan kapasitas pegawai secara terstruktur.
                  </p>
                </div>

                <img
                  :src="logoLms"
                  alt="Logo LMS"
                  class="h-20 w-20 rounded-md object-cover shadow-inner"
                />
              </div>
              <div class="p-6 flex items-center gap-3">
                <button
                  @click.stop="openService('LMS')"
                  class="w-full px-4 py-2 bg-teal-600 text-white rounded-md shadow-sm text-smtransform transition duration-200 hover:scale-105 hover:-translate-y-1 hover:shadow-md"
                >
                  Buka
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>

    <!-- Footer for dashboard -->
    <Footer />
    <ProfileModal
      v-if="showProfileModal"
      :profile="userProfile"
      @close="showProfileModal = false"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import axios from "axios";
import Footer from "./Footer.vue";
import ProfileModal from "./ProfileModal.vue";
import logoPath from "../assets/logo.png";
import logoCmbPath from "../assets/logo_cmb.png";
import logoLmsPath from "../assets/logo_lms.jpeg";
// Decode JWT payload without external dependency
function parseJwtPayload(token) {
  try {
    if (!token) return {};
    const parts = token.split('.');
    if (parts.length < 2) return {};
    const payloadB64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const pad = payloadB64.length % 4 === 0 ? 0 : 4 - (payloadB64.length % 4);
    const padded = payloadB64 + '='.repeat(pad);
    const json = atob(padded);
    return JSON.parse(json || '{}');
  } catch (e) {
    return {};
  }
}

const router = useRouter();
const logo = logoPath;
const logoCmb = logoCmbPath;
const logoLms = logoLmsPath;

// User data from API
const userProfile = ref(null);
const isLoadingProfile = ref(false);

// get user info from token (if present)
function getUserFromToken() {
  try {
    const token = localStorage.getItem("token");
    if (!token) return { nip: "-", name: "Pengguna" };
    const payload = parseJwtPayload(token) || {};
    return {
      nip: payload.nip || "-",
      name: payload.name || `NIP ${payload.nip || "-"}`,
    };
  } catch (e) {
    return { nip: "-", name: "Pengguna" };
  }
}

// Normalize API responses: some responses wrap the actual profile inside data.data
function normalizeProfile(raw) {
  if (!raw) return null;
  // Case: { code: 200, status: 'success', data: { code:1, data: { ...profile... }}}
  if (raw.data && raw.data.data) return raw.data.data;
  // Case: { data: { ...profile... } }
  if (
    raw.data &&
    typeof raw.data === "object" &&
    (raw.data.nama || raw.data.nip)
  )
    return raw.data;
  // Case: already the profile
  if (raw.nama || raw.nip) return raw;
  return null;
}

// Fetch user profile from API (using axios)
async function fetchUserProfile(nip) {
  isLoadingProfile.value = true;
  try {
    // Use a relative URL so the Vite dev proxy (configured in vite.config.js)
    // can forward requests to the external API and avoid CORS during development.
    const url = `/dpd-portal/openapi/profil/${nip}`;
    const headers = {
      "app-token": "ac54ff35-06cc-4702-8d95-f47c735cfaf7",
      "Content-Type": "application/json",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      Accept: "application/json, text/plain, */*",
      "Accept-Language": "id-ID,id;q=0.9,en;q=0.8",
      Referer: "https://okk.dpd.go.id/",
    };

    const response = await axios.get(url, { headers });

    if (response && response.status === 200) {
      const payload = response.data;
      const profile = normalizeProfile(payload);
      if (profile) {
        userProfile.value = profile;
        // Save normalized profile to localStorage
        try {
          localStorage.setItem("userProfile", JSON.stringify(profile));
        } catch (e) {
          console.error("Failed to save profile to localStorage", e);
        }
        return profile;
      }

      console.error("Unexpected profile shape:", payload);
      return null;
    } else {
      console.error(
        "Failed to fetch user profile:",
        response && response.status
      );
      return null;
    }
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return null;
  } finally {
    isLoadingProfile.value = false;
  }
}

// Load user profile from localStorage or fetch from API
function loadUserProfile() {
  // Prefer cached profile if present — do not fetch when localStorage already has profile data.
  try {
    const cached = localStorage.getItem("userProfile");
    if (cached) {
      userProfile.value = JSON.parse(cached);
      return; // skip fetching entirely
    }
  } catch (e) {
    console.error("Failed to parse cached profile", e);
  }

  // No cached profile — fetch using token (if present)
  const tokenUser = getUserFromToken();
  if (tokenUser.nip && tokenUser.nip !== "-") {
    fetchUserProfile(tokenUser.nip);
  }
}

const userName = computed(() => {
  // Prefer normalized profile (from API/localStorage). If present, include
  // gelarDepan (prefix) and gelarBelakang (suffix) when available.
  if (userProfile.value?.nama) {
    const nama = userProfile.value.nama || "";
    const gelarDepan =
      userProfile.value.gelarDepan || userProfile.value.gelar_depan || "";
    const gelarBelakang =
      userProfile.value.gelarBelakang || userProfile.value.gelar_belakang || "";
    const front = gelarDepan ? `${gelarDepan} ` : "";
    const back = gelarBelakang ? `, ${gelarBelakang}` : "";
    return `${front}${nama}${back}`.trim();
  }

  const tokenUser = getUserFromToken();
  return tokenUser.name || "Pengguna";
});

// Modal visibility for profile detail
const showProfileModal = ref(false);

const userNip = computed(() => {
  if (userProfile.value?.nip) return userProfile.value.nip;
  const tokenUser = getUserFromToken();
  return tokenUser.nip || "-";
});

async function logout() {
  // Tampilkan konfirmasi sebelum melakukan logout
  let confirmed = false;
  if (typeof Swal !== "undefined") {
    const res = await Swal.fire({
      title: "Konfirmasi",
      text: "Apakah Anda yakin ingin logout?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Ya, logout",
      cancelButtonText: "Batal",
      reverseButtons: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
    });
    confirmed = !!res.isConfirmed;
  } else {
    confirmed = confirm("Apakah Anda yakin ingin logout?");
  }

  if (!confirmed) return;

  try {
    localStorage.removeItem("auth");
  } catch (e) {}
  try {
    localStorage.removeItem("token");
  } catch (e) {}
  try {
    localStorage.removeItem("userProfile");
  } catch (e) {}
  router.push("/");
}

function openService(name) {
  // Read JWT token from localStorage
  const token = localStorage.getItem("token") || "";

  // Base URLs are read from Vite environment variables.
  // Set VITE_CMB_BASE and VITE_LMS_BASE in your .env (see project README or instructions).
  const cmbBase = import.meta.env.VITE_CMB_BASE || "";
  const lmsBase = import.meta.env.VITE_LMS_BASE || "";

  // Helper to open a target URL in a new tab safely
  function openUrl(u) {
    try {
      window.open(u, "_blank", "noopener,noreferrer");
    } catch (e) {
      // Fallback
      window.location.href = u;
    }
  }

  if (name === "CMB") {
    if (!cmbBase) {
      const msg = "CMB base URL is not configured. Please set VITE_CMB_BASE in your .env file.";
      if (typeof Swal !== "undefined") Swal.fire({ icon: "warning", title: "Konfigurasi", text: msg });
      else alert(msg);
      return;
    }
    if (!token) {
      const msg = "Token tidak ditemukan. Silakan login ulang.";
      if (typeof Swal !== "undefined") Swal.fire({ icon: "warning", title: "Autentikasi", text: msg });
      else alert(msg);
      return;
    }
    const base = cmbBase.replace(/\/$/, "");
    const url = `${base}/sso/${encodeURIComponent(token)}`;
    openUrl(url);
    return;
  }

  if (name === "LMS") {
    if (!lmsBase) {
      const msg = "LMS base URL is not configured. Please set VITE_LMS_BASE in your .env file.";
      if (typeof Swal !== "undefined") Swal.fire({ icon: "warning", title: "Konfigurasi", text: msg });
      else alert(msg);
      return;
    }
    if (!token) {
      const msg = "Token tidak ditemukan. Silakan login ulang.";
      if (typeof Swal !== "undefined") Swal.fire({ icon: "warning", title: "Autentikasi", text: msg });
      else alert(msg);
      return;
    }
    const base = lmsBase.replace(/\/$/, "");
    const url = `${base}/sso/${encodeURIComponent(token)}`;
    openUrl(url);
    return;
  }

  // Fallback for other services: show demo alert
  if (typeof Swal !== "undefined")
    Swal.fire({
      icon: "info",
      title: `Membuka ${name}`,
      text: "Fitur demo — arahkan ke modul.",
    });
  else alert(`Membuka ${name}`);
}

onMounted(() => {
  loadUserProfile();
});
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
