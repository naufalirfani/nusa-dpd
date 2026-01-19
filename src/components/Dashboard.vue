<template>
  <div class="relative min-h-screen flex flex-col bg-slate-50">
    <!-- Decorative background -->
    <div aria-hidden="true" class="pointer-events-none absolute inset-x-0 -top-24 flex justify-center">
      <div class="h-[280px] w-[1200px] bg-gradient-to-r from-teal-500/30 via-cyan-400/30 to-indigo-500/30 blur-3xl rounded-full"></div>
    </div>

    <!-- Header / Topbar -->
    <header class="relative z-10">
      <div class="mx-auto max-w-8xl px-4 sm:px-6 lg:px-12">
        <div class="mt-6 mb-4 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <img :src="logo" alt="Logo" class="h-12 w-12 object-contain" />
            <div>
              <div class="text-xl font-semibold text-gray-900 tracking-tight">NUSA DPD</div>
              <p class="text-gray-600"><i>Nurturing Smart</i> ASN DPD - Portal Pengembangan Sumber Daya Manusia</p>
            </div>
          </div>

          <div class="flex items-center gap-3">
            <button
              class="hidden sm:flex items-center gap-2 rounded-lg bg-white/70 backdrop-blur border border-gray-200 px-3 py-2 text-gray-700 hover:shadow-sm transition"
              @click="showProfileModal = true"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-teal-600" viewBox="0 0 24 24" fill="currentColor">
                <path fill-rule="evenodd" d="M12 2a5 5 0 100 10 5 5 0 000-10zM4 20a8 8 0 1116 0v1H4v-1z" clip-rule="evenodd"/>
              </svg>
              <div class="text-left">
                <div class="font-medium leading-4">{{ userName }}</div>
                <div v-if="showNip" class="text-sm text-gray-500">NIP {{ userNip }}</div>
                <div v-if="!showNip" class="text-sm text-gray-500">{{ userNip }}</div>
              </div>
            </button>
            <button @click="logout" class="inline-flex items-center gap-2 rounded-lg bg-rose-50 text-rose-600 border border-rose-100 px-3 py-2 hover:bg-rose-100 transition">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M16 13v-2H7V8l-5 4 5 4v-3h9z"/><path d="M20 3h-8a2 2 0 00-2 2v4h2V5h8v14h-8v-4h-2v4a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2z"/></svg>
              Logout
            </button>
          </div>
        </div>
      </div>
    </header>

    <!-- Hero / Welcome -->
    <section class="relative z-0">
      <div class="mx-auto max-w-8xl px-4 sm:px-6 lg:px-12">
        <div class="overflow-hidden rounded-2xl border border-gray-100 bg-gradient-to-br from-white to-slate-50 shadow-sm">
          <div class="relative p-6 sm:p-10">
            <div class="absolute right-0 top-0 -translate-y-1/3 translate-x-1/3 opacity-40">
              <div class="h-56 w-56 rounded-full bg-teal-200 blur-3xl"></div>
            </div>
            <div class="absolute left-10 bottom-0 translate-y-1/3 opacity-30">
              <div class="h-40 w-40 rounded-full bg-indigo-200 blur-3xl"></div>
            </div>

            <div class="relative grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
              <div class="lg:col-span-2">
                <p class="font-medium text-teal-700">Selamat {{ greeting }} {{ userName }},</p>
                <h1 class="mt-1 text-2xl sm:text-3xl font-semibold text-gray-900 leading-snug">
                  Selamat datang di Portal Pengembangan SDM DPD RI
                </h1>
                <p class="mt-2 text-gray-600 max-w-2xl">
                  Akses cepat ke layanan pembelajaran, pengembangan kompetensi, dan berbagai sumber daya.
                  Temukan layanan yang Anda butuhkan dan mulai berkolaborasi.
                </p>

                <!-- Search / Command bar (non-functional placeholder) -->
                <!-- <div class="mt-5">
                  <div class="group flex items-center gap-3 rounded-xl bg-white/70 backdrop-blur border border-gray-200 px-4 py-3 shadow-sm hover:shadow-md transition">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-4.35-4.35M10 18a8 8 0 100-16 8 8 0 000 16z"/></svg>
                    <input type="text" placeholder="Cari layanan, panduan, atau topik..." class="w-full bg-transparent outline-none placeholder:text-gray-400 text-gray-700" />
                    <span class="hidden sm:inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-1 text-[11px] text-gray-500">
                      <span>Ctrl</span><span>+</span><span>K</span>
                    </span>
                  </div>
                </div> -->
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Main content -->
    <main class="relative z-0 mx-auto w-full max-w-8xl px-4 sm:px-6 lg:px-12 py-8">
      <!-- Quick actions -->
      <section aria-label="Aksi cepat" class="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 items-stretch">
        <button @click="openService('CMB')" class="group rounded-xl border border-teal-100 bg-white p-4 text-left shadow-sm hover:shadow-md transition h-full">
          <div class="flex items-center gap-3">
            <div class="h-10 w-10 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M5 3a2 2 0 00-2 2v1h18V5a2 2 0 00-2-2H5z"/><path fill-rule="evenodd" d="M21 9H3v8a2 2 0 002 2h14a2 2 0 002-2V9zM8 12h3v5H8v-5z" clip-rule="evenodd"/></svg>
            </div>
            <div>
              <p class="font-medium text-gray-900">CMB</p>
              <p class="text-sm text-gray-500">Coaching, Mentoring, Belajar</p>
            </div>
          </div>
        </button>

        <button @click="openService('LMS')" class="group rounded-xl border border-purple-100 bg-white p-4 text-left shadow-sm hover:shadow-md transition h-full">
          <div class="flex items-center gap-3">
            <div class="h-10 w-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M3 6a2 2 0 012-2h9l5 5v9a2 2 0 01-2 2H5a2 2 0 01-2-2V6z"/><path d="M13 4v4h4"/></svg>
            </div>
            <div>
              <p class="font-medium text-gray-900">LMS</p>
              <p class="text-sm text-gray-500">Learning Management System</p>
            </div>
          </div>
        </button>

        <button @click="openService('SIMANTAP')" class="group rounded-xl border border-amber-100 bg-white p-4 text-left shadow-sm hover:shadow-md transition h-full">
          <div class="flex items-center gap-3">
            <div class="h-10 w-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 100 20 10 10 0 000-20zM7 12l3 3 7-7-1.5-1.5L10 12.5 8.5 11 7 12z"/></svg>
            </div>
            <div>
              <p class="font-medium text-gray-900">SIMANTAP</p>
              <p class="text-sm text-gray-500">Manajemen Talenta Pegawai</p>
            </div>
          </div>
        </button>

        <button @click="openService('KMS')" class="group rounded-xl border border-emerald-100 bg-white p-4 text-left shadow-sm hover:shadow-md transition h-full">
          <div class="flex items-center gap-3">
            <div class="h-10 w-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/></svg>
            </div>
            <div>
              <p class="font-medium text-gray-900">KMS</p>
              <p class="text-sm text-gray-500">Knowledge Management</p>
            </div>
          </div>
        </button>

        <button @click="showProfileModal = true" class="group rounded-xl border border-sky-100 bg-white p-4 text-left shadow-sm hover:shadow-md transition h-full">
          <div class="flex items-center gap-3">
            <div class="h-10 w-10 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path fill-rule="evenodd" d="M12 2a5 5 0 100 10 5 5 0 000-10zM4 20a8 8 0 1116 0v1H4v-1z" clip-rule="evenodd"/></svg>
            </div>
            <div>
              <p class="font-medium text-gray-900">Profil</p>
              <p class="text-sm text-gray-500">Lihat data Anda</p>
            </div>
          </div>
        </button>

        <button @click="logout" class="group rounded-xl border border-rose-100 bg-white p-4 text-left shadow-sm hover:shadow-md transition h-full">
          <div class="flex items-center gap-3">
            <div class="h-10 w-10 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M16 13v-2H7V8l-5 4 5 4v-3h9z"/><path d="M20 3h-8a2 2 0 00-2 2v4h2V5h8v14h-8v-4h-2v4a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2z"/></svg>
            </div>
            <div>
              <p class="font-medium text-gray-900">Logout</p>
              <p class="text-sm text-gray-500">Keluar dari sesi</p>
            </div>
          </div>
        </button>
      </section>

      <!-- Featured services -->
      <section class="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">          
          <!-- Card CMB -->
          <article @click="openService('CMB')" class="group relative overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition hover:shadow-xl cursor-pointer h-full featured-card">
            <div class="absolute inset-0 bg-gradient-to-tr from-teal-50 via-white to-white"></div>
            <div class="relative p-6 sm:p-8 flex h-full items-start gap-6">
              <div class="flex-1 flex flex-col">
                <div class="inline-flex w-max whitespace-nowrap items-center gap-2 rounded-full bg-teal-50 text-teal-700 text-sm font-medium px-3 py-1">Layanan</div>
                <h3 class="mt-3 text-xl font-semibold text-gray-900">CMB</h3>
                <p class="mt-1 text-sm text-gray-600">Coaching · Mentoring · Belajar Mandiri</p>
                <p class="mt-3 text-gray-600">Platform pembelajaran internal untuk kegiatan coaching, mentoring, dan belajar mandiri secara digital dan terukur.</p>
                <div class="mt-6">
                  <button @click.stop="openService('CMB')" class="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-teal-700 transition">
                    Buka CMB
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"/></svg>
                  </button>
                </div>
              </div>
              <img :src="logoCmb" alt="Logo CMB" class="h-24 w-24 rounded-lg object-cover shadow-inner group-hover:scale-105 transition" />
            </div>
          </article>

          <!-- Card LMS -->
          <article @click="openService('LMS')" class="group relative overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition hover:shadow-xl cursor-pointer h-full featured-card">
            <div class="absolute inset-0 bg-gradient-to-tr from-purple-50 via-white to-white"></div>
            <div class="relative p-6 sm:p-8 flex h-full items-start gap-6">
              <div class="flex-1 flex flex-col">
                <div class="inline-flex w-max whitespace-nowrap items-center gap-2 rounded-full bg-purple-50 text-purple-700 text-sm font-medium px-3 py-1">Pembelajaran</div>
                <h3 class="mt-3 text-xl font-semibold text-gray-900">LMS</h3>
                <p class="mt-1 text-sm text-gray-600">Learning Management System</p>
                <p class="mt-3 text-gray-600">Modul pembelajaran, kuis, dan sertifikat untuk mendukung peningkatan kapasitas pegawai secara terstruktur.</p>
                <div class="mt-6">
                  <button @click.stop="openService('LMS')" class="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-purple-700 transition">
                    Buka LMS
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"/></svg>
                  </button>
                </div>
              </div>
              <img :src="logoLms" alt="Logo LMS" class="h-24 w-24 rounded-lg object-cover shadow-inner group-hover:scale-105 transition" />
            </div>
          </article>

                    <!-- Card SIMANTAP -->
          <article @click="openService('SIMANTAP')" class="group relative overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition hover:shadow-xl cursor-pointer h-full featured-card">
            <div class="absolute inset-0 bg-gradient-to-tr from-amber-50 via-white to-white"></div>
            <div class="relative p-6 sm:p-8 flex h-full items-start gap-6">
              <div class="flex-1 flex flex-col">
                <div class="inline-flex w-max whitespace-nowrap items-center gap-2 rounded-full bg-amber-50 text-amber-700 text-sm font-medium px-3 py-1">Layanan</div>
                <h3 class="mt-3 text-xl font-semibold text-gray-900">SIMANTAP</h3>
                <p class="mt-1 text-sm text-gray-600">Sistem Manajemen Talenta Pegawai</p>
                <p class="mt-3 text-gray-600">Platform untuk manajemen talenta, penilaian kinerja, dan pengembangan karir pegawai.</p>
                <div class="mt-6">
                  <button @click.stop="openService('SIMANTAP')" class="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-amber-700 transition">
                    Buka SIMANTAP
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"/></svg>
                  </button>
                </div>
              </div>
              <img :src="logoSimantap" alt="Logo SIMANTAP" class="h-24 w-24 rounded-lg object-cover shadow-inner group-hover:scale-105 transition" />
            </div>
          </article>

          <!-- Card KMS -->
          <article @click="openService('KMS')" class="group relative overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition hover:shadow-xl cursor-pointer h-full featured-card">
            <div class="absolute inset-0 bg-gradient-to-tr from-emerald-50 via-white to-white"></div>
            <div class="relative p-6 sm:p-8 flex h-full items-start gap-6">
              <div class="flex-1 flex flex-col">
                <div class="inline-flex w-max whitespace-nowrap items-center gap-2 rounded-full bg-emerald-50 text-emerald-700 text-sm font-medium px-3 py-1">Pembelajaran</div>
                <h3 class="mt-3 text-xl font-semibold text-gray-900">KMS</h3>
                <p class="mt-1 text-sm text-gray-600">Knowledge Management Center</p>
                <p class="mt-3 text-gray-600">Pusat pengetahuan untuk berbagi informasi, dokumentasi, dan best practices organisasi.</p>
                <div class="mt-6">
                  <button @click.stop="openService('KMS')" class="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-emerald-700 transition">
                    Buka KMS
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"/></svg>
                  </button>
                </div>
              </div>
              <img :src="logoKms" alt="Logo KMS" class="h-24 w-24 rounded-lg object-cover shadow-inner group-hover:scale-105 transition" />
            </div>
          </article>
        </div>

        <!-- Right rail: Announcements -->
        <aside class="lg:col-span-1">
          <div class="rounded-2xl border border-gray-100 bg-white shadow-sm">
            <div class="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h4 class="font-semibold text-gray-900">Jadwal Kegiatan<br>Bagian Pengembangan SDM</h4>
              <div class="text-right">
                <div class="text-[13px] text-gray-500">{{ timeNow }} <span>{{ tzLabel }}</span></div>
                <div class="text-[13px] text-gray-500">{{ dateNow }}</div>
              </div>
            </div>
            <div class="p-4">
              <Calendar />
            </div>
          </div>
        </aside>
      </section>

      <!-- Helpful links / resources -->
      <section class="mt-8">
        <div class="rounded-2xl border border-gray-100 bg-white shadow-sm p-5 sm:p-6">
          <div class="flex items-center justify-between mb-4">
            <h4 class="font-semibold text-gray-900">Sumber Daya & Bantuan</h4>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <button v-for="(link, i) in quickLinks" :key="i" @click="handleQuickLink(link)" class="group flex items-start gap-3 rounded-xl border border-gray-100 bg-slate-50 p-4 text-left hover:bg-white hover:shadow-sm transition">
              <div class="h-10 w-10 rounded-lg flex items-center justify-center" :class="link.bg">
                <div class="h-5 w-5 text-current" aria-hidden="true">
                  <svg v-if="link.type==='book'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="h-5 w-5 text-indigo-600"><path d="M4 5a2 2 0 012-2h11a3 3 0 013 3v13a1 1 0 01-1.447.894L16 18.118l-2.553 1.776A1 1 0 0112 18.999V5H6a2 2 0 00-2 2V5z"/></svg>
                  <svg v-else-if="link.type==='help'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="h-5 w-5 text-teal-600"><path d="M12 2a10 10 0 100 20 10 10 0 000-20zm0 15a1.25 1.25 0 110 2.5A1.25 1.25 0 0112 17zm-1-3.5a1 1 0 112 0v.25c0 .414-.336.75-.75.75h-.5A1.75 1.75 0 019 12.75V12a3 3 0 016 0 1 1 0 11-2 0 1 1 0 10-2 0v.25z"/></svg>
                  <svg v-else-if="link.type==='chat'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="h-5 w-5 text-rose-600"><path d="M20 2H4a2 2 0 00-2 2v18l4-4h14a2 2 0 002-2V4a2 2 0 00-2-2z"/></svg>
                  <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="h-5 w-5 text-amber-600"><path d="M14 3h7v7h-2V6.414l-9.293 9.293-1.414-1.414L17.586 5H14V3z"/><path d="M5 5h6v2H7v10h10v-4h2v6a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z"/></svg>
                </div>
              </div>
              <div>
                <p class="font-medium text-gray-900">{{ link.label }}</p>
                <p class="text-sm text-gray-500">{{ link.desc }}</p>
              </div>
            </button>
          </div>
        </div>
      </section>
    </main>

    <!-- Footer -->
    <Footer />
    <ProfileModal v-if="showProfileModal" :profile="userProfile" @close="showProfileModal = false" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import axios from "axios";
import Footer from "./Footer.vue";
import ProfileModal from "./ProfileModal.vue";
import Calendar from "./Calendar.vue";
import logoPath from "../assets/logo.png";
import logoCmbPath from "../assets/logo_cmb.png";
import logoLmsPath from "../assets/logo_lms.jpeg";
import logoSimantapPath from "../assets/logo_simantap.png";
import logoKmsPath from "../assets/logo.png";
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

// Format person name: convert full uppercase names to Title Case,
// while preserving comma-separated suffixes (e.g. ", S.T.") as-is.
function formatPersonName(name) {
  try {
    if (!name) return "";
    const parts = name.split(',');
    const main = (parts[0] || '').trim();
    const suffix = parts.slice(1).join(',').trim();
    const words = main
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => {
        const lower = w.toLowerCase();
        if (lower.length <= 2) return lower.toUpperCase();
        return lower.charAt(0).toUpperCase() + lower.slice(1);
      });
    const formattedMain = words.join(' ');
    return suffix ? `${formattedMain}, ${suffix}` : formattedMain;
  } catch (e) {
    return name;
  }
}

const router = useRouter();
const logo = logoPath;
const logoCmb = logoCmbPath;
const logoLms = logoLmsPath;
const logoSimantap = logoSimantapPath;
const logoKms = logoKmsPath;

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
  if (raw.data && typeof raw.data === "object") {
    const d = raw.data;
    if (d.nama || d.nip || d.name || d.email) return d;
  }

  // Case: already the profile (support multiple key variants)
  if (typeof raw === "object") {
    // treat presence of common identity keys as an OK profile even if values
    // are null (e.g. nip: null for admin accounts)
    if (
      raw.nama ||
      raw.name ||
      raw.email ||
      Object.prototype.hasOwnProperty.call(raw, "nip") ||
      Object.prototype.hasOwnProperty.call(raw, "id")
    )
      return raw;
  }

  return null;
}

// Fetch user profile from API (using axios)
async function fetchUserProfile(nip) {
  isLoadingProfile.value = true;
  try {
    // Prefer CMB backend when configured: VITE_CMB_BASE/api/pegawai/{nip}
    const cmbBase = import.meta.env.VITE_CMB_BASE || "";
    const token = localStorage.getItem("token") || "";

    let url = `/dpd-portal/openapi/profil/${encodeURIComponent(nip)}`;
    const headers = {
      Accept: "application/json, text/plain, */*",
      "Accept-Language": "id-ID,id;q=0.9,en;q=0.8",
    };

    if (cmbBase) {
      const base = cmbBase.replace(/\/$/, "");
      url = `${base}/api/pegawai/${encodeURIComponent(nip)}`;
      // Use the SSO token as X-Api-Token header when available
      if (token) headers["X-Api-Token"] = token;
      headers["Content-Type"] = "application/json";
    } else {
      // Fallback / legacy headers for dpd-portal
      headers["app-token"] = "ac54ff35-06cc-4702-8d95-f47c735cfaf7";
      headers["Content-Type"] = "application/json";
    }

    const response = await axios.get(url, { headers });

    if (response && response.status === 200) {
      const payload = response.data;
      let profile = normalizeProfile(payload);
      if (profile) {
        // Some backends wrap richer profile data under `json` (or similar).
        // If present, merge those fields so downstream components (ProfileModal)
        // can access `nama`, `gelarBelakang`, `noHp`, etc. Prefer nested
        // `json` values to override outer keys when available.
        if (profile.json && typeof profile.json === "object") {
          profile = { ...profile, ...profile.json };
        }
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
  // Try multiple possible name fields from different APIs
  const p = userProfile.value || {};
  const role = (p.role || "").toString().toLowerCase();

  // For Admin / Super Admin the API returns special account object
  // where `name` should be used as display name.
  if (role === "admin" || role === "super admin" || role === "superadmin") {
    return p.name || p.full_name || p.nama || "Pengguna";
  }

  const rawName = p.nama || p.name || p.nama_lengkap || p.full_name || p.namaLengkap || "";
  const gelarDepan = p.gelarDepan || p.gelar_depan || "";
  const gelarBelakang = p.gelarBelakang || p.gelar_belakang || "";

  if (rawName) {
    const nama = formatPersonName(rawName || "");
    const front = gelarDepan ? `${gelarDepan} ` : "";
    const back = gelarBelakang ? `, ${gelarBelakang}` : "";
    return `${front}${nama}${back}`.trim();
  }

  const tokenUser = getUserFromToken();
  return formatPersonName(tokenUser.name || "Pengguna");
});

// Modal visibility for profile detail
const showProfileModal = ref(false);

const userNip = computed(() => {
  const p = userProfile.value || {};
  const role = (p.role || "").toString().toLowerCase();

  // For Admin accounts, show email as the identifier in the header
  if (role === "admin" || role === "super admin" || role === "superadmin") {
    return p.email || p.emailGov || p.email_address || getUserFromToken().nip || "-";
  }

  return (
    p.nip || p.nipBaru || p.nip_baru || p.nipbaru || p.nipBaru ||
    getUserFromToken().nip || "-"
  );
});

// Show NIP in header only for non-admin accounts
const showNip = computed(() => {
  const p = userProfile.value || {};
  const role = (p.role || "").toString().toLowerCase();
  return !(role === "admin" || role === "super admin" || role === "superadmin");
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
  const kmsBase = import.meta.env.VITE_KMS_BASE || "";

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

  if (name === "KMS") {
    if (!kmsBase) {
      const msg = "KMS base URL is not configured. Please set VITE_KMS_BASE in your .env file.";
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
    const base = kmsBase.replace(/\/$/, "");
    const url = `${base}/sso/${encodeURIComponent(token)}`;
    openUrl(url);
    return;
  }

  if (name === "SIMANTAP") {
    const simBase = import.meta.env.VITE_SIMANTAP_BASE || "http://localhost:5173";
    if (!simBase) {
      const msg = "SIMANTAP base URL is not configured. Please set VITE_SIMANTAP_BASE or use the default.";
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
    const base = simBase.replace(/\/$/, "");
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

// Equalize featured card heights (make all featured cards match tallest)
let _eqTimer = null;
function equalizeFeaturedCardHeights() {
  // reset heights first
  const cards = Array.from(document.querySelectorAll('.featured-card'));
  if (!cards.length) return;
  cards.forEach((c) => (c.style.height = ''));
  // measure
  const heights = cards.map((c) => c.getBoundingClientRect().height || c.offsetHeight);
  const max = Math.max(...heights);
  cards.forEach((c) => (c.style.height = `${max}px`));
}

function scheduleEqualize(delay = 120) {
  if (_eqTimer) clearTimeout(_eqTimer);
  _eqTimer = setTimeout(() => {
    equalizeFeaturedCardHeights();
    _eqTimer = null;
  }, delay);
}

onMounted(() => {
  scheduleEqualize(60);
  window.addEventListener('resize', () => scheduleEqualize(120));
});

onUnmounted(() => {
  if (_eqTimer) clearTimeout(_eqTimer);
  window.removeEventListener('resize', () => scheduleEqualize(120));
});

// Live clock for right-rail header (time + date)
const now = ref(new Date());
const timeNow = computed(() => new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(now.value));
const dateNow = computed(() => new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(now.value));

const tzLabel = computed(() => {
  const offset = -now.value.getTimezoneOffset() / 60; // e.g. 7,8,9
  if (offset === 7) return 'WIB';
  if (offset === 8) return 'WITA';
  if (offset === 9) return 'WIT';
  // fallback: attempt to derive from IANA tz name
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    if (/kuala|jakarta|asia\/jakarta/i.test(zone)) return 'WIB';
    if (/makassar|denpasar|asia\/makassar|asia\/denpasar/i.test(zone)) return 'WITA';
    if (/jayapura|asia\/jayapura/i.test(zone)) return 'WIT';
  } catch (e) {}
  return `UTC${offset >= 0 ? '+' + offset : offset}`;
});
let _clockTimer = null;
onMounted(() => {
  _clockTimer = setInterval(() => { now.value = new Date(); }, 1000);
});
onUnmounted(() => { if (_clockTimer) clearInterval(_clockTimer); });

// Greeting based on time of day
const greeting = computed(() => {
  const h = new Date().getHours();
  if (h < 11) return "pagi";
  if (h < 15) return "siang";
  if (h < 18) return "sore";
  return "malam";
});

// Quick links / resources (icon type string used in template)
const quickLinks = ref([
  { label: 'Panduan Portal', desc: 'Cara menggunakan portal ini', bg: 'bg-indigo-50', type: 'book', url: '#' },
  { label: 'FAQ', desc: 'Pertanyaan yang sering diajukan', bg: 'bg-teal-50', type: 'help', url: '#' },
  { label: 'Kontak Support', desc: 'Hubungi tim bantuan', bg: 'bg-rose-50', type: 'chat', url: '#' },
  { label: 'Kunjungi Situs DPD', desc: 'Buka website resmi', bg: 'bg-amber-50', type: 'external', url: 'https://www.dpd.go.id' },
]);

const announcements = ref([
  { title: 'Perawatan sistem pada akhir pekan ini', time: '2 jam lalu' },
  { title: 'Rilis modul pembelajaran baru: Kepemimpinan', time: 'Kemarin' },
  { title: 'Pembukaan program mentoring Q4', time: '2 hari lalu' },
]);

function handleQuickLink(link) {
  if (!link || !link.url || link.url === '#') {
    if (typeof Swal !== 'undefined') Swal.fire({ icon: 'info', title: 'Segera hadir', text: 'Konten akan tersedia.' });
    else alert('Konten akan tersedia.');
    return;
  }
  try {
    window.open(link.url, '_blank', 'noopener,noreferrer');
  } catch (e) {
    window.location.href = link.url;
  }
}
</script>

<style scoped>
/* Simple fade transitions if needed */
.fade-enter-active,
.fade-leave-active { transition: opacity 0.15s ease; }
.fade-enter-from,
.fade-leave-to { opacity: 0; }

/* Subtle card entrance animation */
@keyframes float-in {
  0% { opacity: 0; transform: translateY(8px); }
  100% { opacity: 1; transform: translateY(0); }
}
section[aria-label="Aksi cepat"] > * { animation: float-in .4s ease both; }
section[aria-label="Aksi cepat"] > *:nth-child(2) { animation-delay: .05s; }
section[aria-label="Aksi cepat"] > *:nth-child(3) { animation-delay: .1s; }
section[aria-label="Aksi cepat"] > *:nth-child(4) { animation-delay: .15s; }
</style>
