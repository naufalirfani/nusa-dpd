<template>
  <footer id="footer" class="relative overflow-hidden">
    <!-- Modern gradient background consistent with sections -->
    <div
      class="absolute inset-0 bg-gradient-to-br from-slate-800 via-slate-900 to-gray-900"
    ></div>

    <!-- Decorative elements matching other sections -->
    <div class="absolute inset-0">
      <div
        class="absolute top-20 right-20 w-80 h-80 bg-gradient-to-br from-teal-500/10 to-cyan-500/10 rounded-full mix-blend-multiply filter blur-3xl"
      ></div>
      <div
        class="absolute bottom-20 left-20 w-96 h-96 bg-gradient-to-tr from-blue-500/10 to-purple-500/10 rounded-full mix-blend-multiply filter blur-3xl"
      ></div>
    </div>

    <div class="relative z-10">
      <div class="mx-auto px-4 sm:px-6 lg:px-12 pt-16 pb-8">
        <!-- App info section -->
        <div class="text-center mb-12">
          <div class="md:flex items-center justify-center space-x-4 mb-6">
            <div class="flex items-center justify-center">
              <img :src="logo" alt="Logo" class="h-14 w-auto rounded-lg" />
            </div>
            <div>
              <h2 class="text-2xl font-bold text-white inline-block relative">
                NUSA DPD RI
                <span
                  class="block h-1 bg-gradient-to-r from-teal-500 to-cyan-600 rounded-full mt-2"
                ></span>
              </h2>
            </div>
          </div>

          <!-- Contact info -->
          <div
            class="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-8"
          >
            <div
              class="flex flex-col items-center text-center sm:flex-row sm:items-center sm:text-left space-y-2 sm:space-y-0 sm:space-x-3 text-gray-300"
            >
              <div
                class="w-8 h-8 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-lg flex items-center justify-center"
              >
                <svg
                  class="w-4 h-4 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  ></path>
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  ></path>
                </svg>
              </div>
              <span>Lantai 4 Gedung B Sekeretariat Jenderal DPD RI</span>
            </div>
            <div
              class="flex flex-col items-center text-center sm:flex-row sm:items-center sm:text-left space-y-2 sm:space-y-0 sm:space-x-3 text-gray-300"
            >
              <div
                class="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center"
              >
                <svg
                  class="w-4 h-4 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  ></path>
                </svg>
              </div>
              <span>sdm@dpd.go.id</span>
            </div>
          </div>
        </div>

        <!-- Services section - 3 columns -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          <!-- Coaching -->
          <div class="group h-full">
            <div
              class="h-full p-3 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-all duration-300 hover:scale-105 flex flex-col"
            >
              <div
                class="w-12 h-12 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300"
              >
                <img :src="logoCmb" alt="Logo" class="h-8 w-auto rounded-md" />
              </div>
              <h4 class="text-white font-semibold text-lg mb-2">SMART CMB</h4>
              <p class="text-gray-300 text-sm leading-relaxed flex-grow">
                <i>Platform</i> pembelajaran dan pengembangan kompetensi
                internal yang dirancang khusus untuk Sekretariat Jenderal Dewan
                Perwakilan Daerah Republik Indonesia (Setjen DPD RI). Aplikasi
                ini menjadi wadah terintegrasi bagi seluruh pegawai dalam
                melaksanakan kegiatan <i>coaching</i>, <i>mentoring</i>, dan belajar mandiri
                secara digital, efektif, dan terukur.
              </p>
            </div>
          </div>

          <!-- Mentoring -->
          <div class="group h-full">
            <div
              class="h-full p-3 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-all duration-300 hover:scale-105 flex flex-col"
            >
              <div
                class="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300"
              >
                <img :src="logoLms" alt="Logo" class="h-8 w-auto rounded-md" />
              </div>
              <h4 class="text-white font-semibold text-lg mb-2">
                  LMS (<i class="font-semibold">Learning Management System</i>)
                </h4>
              <p class="text-gray-300 text-sm leading-relaxed flex-grow">
                <i>Platform</i> pembelajaran <i>online</i> untuk pengembangan kapasitas dan
                kompetensi pegawai Sekretariat Jenderal DPD RI. Akses ribuan
                materi pembelajaran berkualitas dari instruktur berpengalaman.
              </p>
            </div>
          </div>
        </div>

        <!-- Social media and bottom section -->
        <div class="border-t border-white/10 pt-8">
          <div
            class="flex flex-col lg:flex-row justify-between items-center space-y-6 lg:space-y-0"
          >
            <!-- Social media with modern styling -->
            <div class="flex items-center space-x-4">
              <span class="text-gray-300 text-sm mr-4">Follow us:</span>
              <div class="flex space-x-3">
                <!-- <a href="#" class="group relative">
                  <div
                    class="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center hover:scale-110 transition-all duration-300 group-hover:shadow-lg group-hover:shadow-blue-500/25"
                  >
                    <svg
                      class="w-5 h-5 text-white"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        fill-rule="evenodd"
                        d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"
                        clip-rule="evenodd"
                      />
                    </svg>
                  </div>
                </a> -->

                <a href="https://www.instagram.com/okkdpdri" target="_blank" class="group relative">
                  <div
                    class="w-10 h-10 bg-gradient-to-br from-pink-500 to-rose-600 rounded-xl flex items-center justify-center hover:scale-110 transition-all duration-300 group-hover:shadow-lg group-hover:shadow-pink-500/25"
                  >
                    <svg
                      class="w-5 h-5 text-white"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        fill-rule="evenodd"
                        d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z"
                        clip-rule="evenodd"
                      />
                    </svg>
                  </div>
                </a>

                <a href="https://www.x.com/@SetjenDPDRI" target="_blank" class="group relative">
                  <div
                    class="w-10 h-10 bg-gradient-to-br from-gray-800 to-black rounded-xl flex items-center justify-center hover:scale-110 transition-all duration-300 group-hover:shadow-lg group-hover:shadow-gray-500/25"
                  >
                    <svg
                      class="w-4 h-4 text-white"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"
                      />
                    </svg>
                  </div>
                </a>

                <a href="https://www.youtube.com/@DPDRIChannel" target="_blank" class="group relative">
                  <div
                    class="w-10 h-10 bg-gradient-to-br from-red-600 to-red-700 rounded-xl flex items-center justify-center hover:scale-110 transition-all duration-300 group-hover:shadow-lg group-hover:shadow-red-500/25"
                  >
                    <svg
                      class="w-5 h-5 text-white"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        d="M23.498 6.186a2.987 2.987 0 0 0-2.102-2.11C19.576 3.5 12 3.5 12 3.5s-7.576 0-9.396.576A2.987 2.987 0 0 0 .502 6.186 31.179 31.179 0 0 0 0 12a31.18 31.18 0 0 0 .502 5.814 2.987 2.987 0 0 0 2.102 2.11C4.424 20.5 12 20.5 12 20.5s7.576 0 9.396-.576a2.987 2.987 0 0 0 2.102-2.11A31.18 31.18 0 0 0 24 12a31.18 31.18 0 0 0-.502-5.814zM9.75 15.02V8.98l6.5 3.02-6.5 3.02z"
                      />
                    </svg>
                  </div>
                </a>
              </div>
            </div>
            <div class="text-gray-300">
              <p>&copy; 2025 BPSDM. All rights reserved.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </footer>
</template>

<script setup>
import logoPath from "../assets/logo.png";
import logoCmbPath from "../assets/logo_cmb.png";
import logoLmsPath from "../assets/logo_lms.jpeg";
const logo = logoPath;
const logoCmb = logoCmbPath;
const logoLms = logoLmsPath;
</script>
