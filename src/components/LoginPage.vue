<template>
  <!-- Fullscreen modern split layout with animated gradient background -->
  <div class="overflow-hidden">
    <!-- Animated gradient background -->
    <div
      class="absolute inset-0 -z-10 animate-gradient bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-teal-200 via-sky-100 to-white"
    ></div>
    <!-- Soft decorative blobs -->
    <!-- <div class="pointer-events-none absolute -top-24 -left-24 h-80 w-80 rounded-full bg-teal-300/20 blur-3xl"></div>
    <div class="pointer-events-none absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-sky-300/20 blur-3xl"></div> -->

    <!-- Top-right language dropdown floating -->
    <div class="absolute right-4 top-4 z-20">
      <div class="relative" ref="dropdownRef">
        <button
          @click="toggleDropdown"
          @keydown.enter.prevent="toggleDropdown"
          type="button"
          class="inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 shadow-sm ring-1 ring-black/5 backdrop-blur hover:bg-white"
        >
          <span class="text-sm font-medium text-gray-700">{{
            locale === "id" ? t("lang_id") : t("lang_en")
          }}</span>
          <svg
            class="h-4 w-4 text-gray-500"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden
          >
            <path
              d="M6 8l4 4 4-4"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>
        <transition name="fade">
          <ul
            v-if="open"
            class="absolute right-0 mt-2 w-44 overflow-hidden rounded-lg bg-white/95 shadow-lg ring-1 ring-black/5 backdrop-blur-sm z-10"
          >
            <li>
              <button
                @click="selectLocale('id')"
                type="button"
                class="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-gray-50"
              >
                <img
                  src="https://flagcdn.com/w40/id.png"
                  alt="Indonesia"
                  class="h-4 w-6 rounded-sm ring-1 ring-gray-200/50 object-cover"
                />
                <span class="text-sm text-gray-700"
                  >{{ t("lang_id") }} — Indonesian</span
                >
              </button>
            </li>
            <li>
              <button
                @click="selectLocale('en')"
                type="button"
                class="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-gray-50"
              >
                <img
                  src="https://flagcdn.com/w40/gb.png"
                  alt="English"
                  class="h-4 w-6 rounded-sm ring-1 ring-gray-200/50 object-cover"
                />
                <span class="text-sm text-gray-700"
                  >{{ t("lang_en") }} — English</span
                >
              </button>
            </li>
          </ul>
        </transition>
      </div>
    </div>

    <!-- Main grid -->
    <div
      class="relative mx-auto grid grid-cols-1 items-center gap-8 px-6 py-12 sm:px-8 lg:grid-cols-2 lg:py-16"
    >
      <!-- Left hero -->
      <div class="order-1">
        <div class="mb-6 flex items-center gap-3">
          <img :src="logo" alt="Logo" class="h-12 w-auto drop-shadow-sm" />
          <div class="text-2xl font-semibold tracking-tight text-gray-800">
            NUSA DPD RI
          </div>
        </div>

        <h1
          class="text-3xl font-extrabold leading-tight tracking-tight text-gray-900 sm:text-4xl"
        >
          {{ t("title") }}
        </h1>
        <p class="mt-3 max-w-prose text-base text-gray-600 sm:text-lg">
          {{ t("subtitle") }}
        </p>

        <!-- Feature bullets -->
        <ul
          class="mt-8 grid grid-cols-1 gap-3 text-sm text-gray-700 sm:grid-cols-2"
        >
          <li
            class="flex items-center gap-3 rounded-xl bg-white/70 p-3 shadow-sm ring-1 ring-black/5 backdrop-blur"
          >
            <span
              class="flex h-8 w-8 items-center justify-center rounded-full bg-teal-500 text-white shadow-sm"
              >★</span
            >
            <span>SSO-backed secure access</span>
          </li>
          <li
            class="flex items-center gap-3 rounded-xl bg-white/70 p-3 shadow-sm ring-1 ring-black/5 backdrop-blur"
          >
            <span
              class="flex h-8 w-8 items-center justify-center rounded-full bg-sky-500 text-white shadow-sm"
              >✓</span
            >
            <span>Fast OTP verification</span>
          </li>
          <li
            class="flex items-center gap-3 rounded-xl bg-white/70 p-3 shadow-sm ring-1 ring-black/5 backdrop-blur"
          >
            <span
              class="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500 text-white shadow-sm"
              >⚡</span
            >
            <span>Optimized for performance</span>
          </li>
          <li
            class="flex items-center gap-3 rounded-xl bg-white/70 p-3 shadow-sm ring-1 ring-black/5 backdrop-blur"
          >
            <span
              class="flex h-8 w-8 items-center justify-center rounded-full bg-rose-500 text-white shadow-sm"
              >♡</span
            >
            <span>Clean and modern UI</span>
          </li>
        </ul>

        <!-- Portal preview grid -->
        <div class="mt-10">
          <h3 class="text-sm font-semibold tracking-wide text-gray-700">
            Portal tujuan
          </h3>
          <p class="mt-1 text-sm text-gray-500">
            Satu pintu menuju layanan pembelajaran dan pengembangan.
          </p>

          <div class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              v-for="card in portalCards"
              :key="card.key"
              type="button"
              class="group relative flex items-center gap-4 overflow-hidden rounded-xl border border-gray-100 bg-white/70 p-4 text-left shadow-sm ring-1 ring-black/5 backdrop-blur transition hover:-translate-y-0.5 hover:shadow-md"
              @click="openPortal(card)"
            >
              <span
                class="absolute -right-10 -top-10 h-24 w-24 rounded-full opacity-20 transition group-hover:opacity-30"
                :class="card.bg"
              ></span>
              <img
                v-if="card.logo"
                :src="card.logo"
                :alt="card.title + ' logo'"
                class="relative z-[1] h-10 w-10 rounded-md object-cover shadow-inner"
              />
              <div class="relative z-[1]">
                <div class="text-sm font-semibold text-gray-800">
                  {{ card.title }}
                  <span
                    class="ml-2 inline-flex items-center rounded-full bg-gray-900/5 px-2 py-0.5 text-[10px] font-medium text-gray-600"
                  >
                    {{ card.badge }}
                  </span>
                </div>
                <p class="mt-0.5 text-xs text-gray-500">{{ card.desc }}</p>
                <div
                  class="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-teal-700"
                >
                  <span>Akses setelah login</span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-3.5 w-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="1.5"
                      d="M14 5l7 7m0 0l-7 7m7-7H3"
                    />
                  </svg>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>

      <!-- Right: Glassmorphism auth card -->
      <div class="order-2">
        <div class="relative mx-auto w-full max-w-md">
          <div
            class="absolute inset-0 -z-10 rounded-3xl bg-gradient-to-br from-white/80 to-white/40 shadow-xl ring-1 ring-black/5 backdrop-blur-xl"
          ></div>
          <div class="relative rounded-3xl p-6 sm:p-8">
            <h2 class="text-xl font-semibold text-gray-800">
              {{ t("welcome") }}
            </h2>
            <p class="mt-1 text-sm text-gray-500">
              Silakan masukkan NIP dan kode verifikasi untuk masuk.
            </p>

            <form @submit.prevent="onSubmit" class="mt-6 space-y-5">
              <!-- NIP input with floating label -->
              <div>
                <label class="mb-1 block text-sm font-medium text-gray-700"
                  >NIP</label
                >
                <div class="relative">
                  <input
                    v-model="nip"
                    @input="onNipInput"
                    type="text"
                    inputmode="numeric"
                    maxlength="18"
                    class="peer nip-input w-full rounded-xl border border-gray-200 bg-gray-50/70 px-4 py-3 text-gray-900 shadow-sm outline-none ring-0 transition focus:border-teal-400 focus:bg-white focus:ring-2 focus:ring-teal-100"
                    placeholder="198001012000000000"
                    aria-describedby="nipHelp"
                  />
                  <span
                    class="pointer-events-none absolute left-3 top-1.5 -translate-y-1/2 bg-transparent px-1 text-xs text-gray-500 transition-all peer-placeholder-shown:top-1/2 peer-placeholder-shown:text-sm peer-focus:top-1.5 peer-focus:text-xs"
                  >
                    NIP (18 digit)
                  </span>
                </div>
                <p
                  id="nipHelp"
                  v-if="nipError"
                  class="mt-2 text-sm text-rose-600"
                >
                  {{ nipError }}
                </p>
              </div>

              <!-- Captcha + refresh -->
              <div>
                <label class="mb-1 block text-sm font-medium text-gray-700">{{
                  t("code")
                }}</label>
                <div class="flex items-center gap-2">
                  <canvas
                    ref="captchaCanvas"
                    width="220"
                    height="48"
                    class="h-12 w-[220px] rounded-xl border border-gray-200 bg-white/70 shadow-sm"
                    title="Click to refresh"
                    @click="generateCode"
                    aria-label="Captcha image showing verification code"
                  ></canvas>
                  <button
                    type="button"
                    @click="sendCode"
                    :title="t('refresh')"
                    aria-label="Refresh verification code"
                    :disabled="sending || nip.length !== 18"
                    class="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-500 to-sky-500 px-4 text-white shadow-sm transition hover:from-teal-600 hover:to-sky-600 disabled:opacity-50 disabled:shadow-none"
                  >
                    <svg
                      v-if="sending"
                      class="h-4 w-4 animate-spin"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <circle
                        class="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        stroke-width="4"
                      ></circle>
                      <path
                        class="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                      ></path>
                    </svg>
                    <svg
                      v-else
                      class="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      aria-hidden
                    >
                      <path
                        d="M21 12.79A9 9 0 1111.21 3"
                        stroke="currentColor"
                        stroke-width="1.5"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                      <path
                        d="M21 3v6h-6"
                        stroke="currentColor"
                        stroke-width="1.5"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                    </svg>
                    <!-- <span class="text-sm">{{ sending ? t('sending') + '...' : t('refresh') }}</span> -->
                  </button>
                </div>

                <!-- Code input with show/hide -->
                <div class="mt-3">
                  <div class="relative">
                    <input
                      v-model="code"
                      :type="showCode ? 'text' : 'password'"
                      inputmode="numeric"
                      autocomplete="one-time-code"
                      class="w-full rounded-xl border border-gray-200 bg-gray-50/70 px-4 py-3 pr-12 text-gray-900 placeholder:text-gray-400 shadow-sm outline-none focus:border-teal-400 focus:bg-white focus:ring-2 focus:ring-teal-100"
                      placeholder="123456"
                      aria-label="Verification code"
                    />
                    <button
                      type="button"
                      @click="showCode = !showCode"
                      class="absolute inset-y-0 right-3 my-auto inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100"
                    >
                      <svg
                        v-if="!showCode"
                        xmlns="http://www.w3.org/2000/svg"
                        class="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        stroke-width="1.5"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 5 12 5c4.638 0 8.573 2.507 9.963 6.676.07.207.07.431 0 .639C20.577 16.49 16.64 19 12 19c-4.638 0-8.573-2.507-9.964-6.678z"
                        />
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                      <svg
                        v-else
                        xmlns="http://www.w3.org/2000/svg"
                        class="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        stroke-width="1.5"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          d="M3.98 8.223A10.477 10.477 0 001.934 12C3.324 16.169 7.26 18.676 11.9 18.676c1.67 0 3.26-.307 4.703-.862M6.228 6.228A10.45 10.45 0 0111.9 5.324c4.64 0 8.576 2.507 9.966 6.676a10.522 10.522 0 01-1.278 2.3"
                        />
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          d="M15 12a3 3 0 00-3-3m0 0a3 3 0 013 3m-3-3L3 21m9-12l9 9"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  :disabled="loading"
                  aria-busy="loading"
                  class="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-500 to-sky-500 px-5 py-3 font-medium text-white shadow-sm transition hover:from-teal-600 hover:to-sky-600 disabled:opacity-50"
                >
                  <svg
                    v-if="loading"
                    class="h-4 w-4 animate-spin"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <circle
                      class="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      stroke-width="4"
                    ></circle>
                    <path
                      class="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                    ></path>
                  </svg>
                  <span>{{ loading ? t("login") + "..." : t("login") }}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
    <div class="mt-10 text-xs text-gray-500 text-center">
      © 2025. BPSDM. All rights reserved.
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "../i18n";
import { encryptTokenForHeader } from "../utils/crypto";
import logoPath from "../assets/logo.png";
import logoCmbPath from "../assets/logo_cmb.png";
import logoLmsPath from "../assets/logo_lms.jpeg";
// token generation is delegated to the SSO backend endpoint

const { t, locale: i18nLocale } = useI18n();

const nip = ref("");
const code = ref("");
const sending = ref(false);
const loading = ref(false);
const locale = ref(i18nLocale.value);
const router = useRouter();
const nipError = ref("");
const showCode = ref(false);

const logo = logoPath;

// Portal preview data (disabled until login)
const portalCards = [
  {
    key: "cmb",
    title: "CMB",
    badge: "Coaching · Mentoring · Mandiri",
    desc: "Platform pembelajaran internal untuk penguatan kompetensi.",
    bg: "bg-teal-200",
    logo: logoCmbPath,
  },
  {
    key: "lms",
    title: "LMS",
    badge: "Learning Management System",
    desc: "Modul, kuis, dan sertifikat pembelajaran terstruktur.",
    bg: "bg-sky-200",
    logo: logoLmsPath,
  },
];

function openPortal(card) {
  // On login page, we show a friendly prompt; actual access after login.
  const message = `Silakan login terlebih dahulu untuk mengakses portal ${card.title}.`;
  if (typeof Swal !== "undefined") {
    Swal.fire({ icon: "info", title: "Portal", text: message });
  } else {
    alert(message);
  }
}

// Custom dropdown state
const open = ref(false);
const dropdownRef = ref(null);

// verification code for anti-bot (drawn as obfuscated image)
const verificationCode = ref("");
const captchaCanvas = ref(null);

function generateCode(len = 6) {
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < len; i++)
    out += chars.charAt(Math.floor(Math.random() * chars.length));
  verificationCode.value = out;
  drawCaptcha();
}

function onNipInput(e) {
  // allow digits only and limit to 18
  const cleaned = (e.target.value || "").replace(/\D/g, "").slice(0, 18);
  nip.value = cleaned;
  // clear inline error when user types to valid length
  if (nip.value.length === 18) nipError.value = "";
}

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// The token is generated by the backend SSO endpoint. This avoids doing any
// signing in the browser and keeps the client simple.
const JWT_EXPIRES = parseInt(import.meta.env.VITE_JWT_EXPIRES, 10) || 3600;
// We always call the same-origin proxy path `/cmb/...`. In development
// Vite will forward `/cmb/` to the backend, and in production nginx will
// proxy the same path to the configured SSO backend. This avoids CORS and
// keeps the client configuration simple.
async function createJwt(payload = {}, expiresInSeconds = 3600) {
  // The SSO endpoint expects the NIP in the path. We call it and return the
  // token string. The endpoint may return JSON { token: '...' } or plain text.
  const nip = payload && payload.nip ? payload.nip : "";
  if (!nip) throw new Error("NIP is required to generate token");

  // Always call local proxy path; server (dev/prod) will forward to SSO.
  const useProxy = true;
  const params = new URLSearchParams();
  params.set("exp_minutes", String(Math.ceil(expiresInSeconds / 60)));
  // Send the optional SSO token via header instead of query parameter.
  const ssoToken = import.meta.env.VITE_SSO_GENERATE_TOKEN || "";
  const headers = {};
  if (ssoToken) {
    // Use helper which returns 'v1.aes:<base64>' or the raw token on failure
    headers["X-Api-Token"] = await encryptTokenForHeader(ssoToken, { salt: ssoToken });
  }

  const url = `/cmb/sso/generate/${encodeURIComponent(
    nip
  )}?${params.toString()}`;

  const res = await fetch(url, {
    method: "GET",
    credentials: "include",
    headers,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Failed to generate token: ${res.status} ${res.statusText} ${text}`
    );
  }

  const ct = res.headers.get("content-type") || "";
  let token;

  if (ct.includes("application/json")) {
    const j = await res.json().catch(() => ({}));
    token = j && (j.token || j.access_token || j.data || j);
    if (typeof token === "object" && token !== null)
      token = token.token || token.access_token || "";
  } else {
    token = await res.text().catch(() => "");
  }
  if (!token) throw new Error("SSO did not return a token");
  return token.toString();
}

function drawCaptcha() {
  const canvas = captchaCanvas.value;
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;
  // background
  ctx.fillStyle = "#f8fafc";
  ctx.fillRect(0, 0, w, h);

  // noise lines
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    ctx.moveTo(rand(0, w), rand(0, h));
    ctx.lineTo(rand(0, w), rand(0, h));
    ctx.strokeStyle = `rgba(${rand(100, 180)},${rand(100, 180)},${rand(
      100,
      180
    )},${(Math.random() * 0.4 + 0.2).toFixed(2)})`;
    ctx.lineWidth = Math.random() * 1.5 + 0.5;
    ctx.stroke();
  }

  // draw characters with rotation and varying style
  const text = verificationCode.value || "";
  const charSpace = w / (text.length + 1);
  for (let i = 0; i < text.length; i++) {
    const chr = text.charAt(i);
    const fontsize = rand(30, 36);
    const x = charSpace * (i + 0.6);
    const y = rand(h - 10, h - 8);
    const angle = (Math.random() - 0.5) * 0.6;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.font = `${fontsize}px monospace`;
    ctx.fillStyle = `rgba(${rand(20, 80)},${rand(20, 80)},${rand(20, 80)},${(
      Math.random() * 0.6 +
      0.4
    ).toFixed(2)})`;
    ctx.fillText(chr, -fontsize / 2, 0);
    ctx.restore();
  }

  // dots
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = `rgba(${rand(0, 200)},${rand(0, 200)},${rand(0, 200)},${(
      Math.random() * 0.6
    ).toFixed(2)})`;
    ctx.beginPath();
    ctx.arc(rand(0, w), rand(0, h), Math.random() * 1.8, 0, Math.PI * 2);
    ctx.fill();
  }
}

function toggleDropdown() {
  open.value = !open.value;
}

function selectLocale(code) {
  locale.value = code;
  i18nLocale.value = code;
  try {
    localStorage.setItem("locale", code);
    document.documentElement.lang = code;
  } catch (e) {
    /* ignore */
  }
  open.value = false;
}

function onDocClick(e) {
  if (!dropdownRef.value) return;
  if (!dropdownRef.value.contains(e.target)) open.value = false;
}

onMounted(() => {
  document.addEventListener("click", onDocClick);
  // initialize verification code
  generateCode();
});
onBeforeUnmount(() => document.removeEventListener("click", onDocClick));

function sendCode() {
  if (!nip.value) {
    if (typeof Swal !== "undefined")
      Swal.fire({ icon: "warning", title: t("enter_nip") });
    else alert(t("enter_nip"));
    return;
  }
  if (nip.value.length !== 18) {
    if (typeof Swal !== "undefined")
      Swal.fire({ icon: "warning", title: t("invalid_nip") });
    else alert(t("invalid_nip"));
    return;
  }
  sending.value = true;
  setTimeout(() => {
    generateCode();
    sending.value = false;
    if (typeof Swal !== "undefined")
      Swal.fire({ icon: "success", title: t("code_generated") });
    else alert(t("code_generated"));
  }, 400);
}

function onSubmit() {
  if (!nip.value) {
    if (typeof Swal !== "undefined")
      Swal.fire({ icon: "warning", title: t("enter_nip") });
    else alert(t("enter_nip"));
    return;
  }
  if (nip.value.length !== 18) {
    nipError.value = t("invalid_nip");
    if (typeof Swal !== "undefined")
      Swal.fire({ icon: "warning", title: t("invalid_nip") });
    else alert(t("invalid_nip"));
    return;
  }
  if (!code.value) {
    if (typeof Swal !== "undefined")
      Swal.fire({ icon: "warning", title: t("enter_code") });
    else alert(t("enter_code"));
    return;
  }
  if (code.value.trim() === (verificationCode.value || "")) {
    // on success: create JWT containing NIP, store it, then navigate
    const doSuccess = async () => {
      loading.value = true;
      try {
        const token = await createJwt({ nip: nip.value }, JWT_EXPIRES);
        try {
          localStorage.setItem("token", token);
        } catch (e) {}
        try {
          localStorage.setItem("auth", "1");
        } catch (e) {}
        // token stored (debug logging removed)
      } catch (err) {
        // fallback: still set auth flag and notify user
        try {
          localStorage.setItem("auth", "1");
        } catch (e) {}
        // createJwt failed (handled via UI); debug logging removed
        if (typeof Swal !== "undefined") {
          try {
            await Swal.fire({
              icon: "warning",
              title: t("verify_success"),
              text:
                t("token_generate_failed") ||
                "Token generation failed — continuing in demo mode.",
            });
          } catch (e) {}
        }
      } finally {
        loading.value = false;
      }
      nipError.value = "";
      // use replace to avoid back navigation causing unexpected behavior across hosts
      try {
        router.replace("/dashboard");
      } catch (e) {
        router.push("/dashboard");
      }
    };

    if (typeof Swal !== "undefined") {
      Swal.fire({
        icon: "success",
        title: t("verify_success"),
        showConfirmButton: false,
        timer: 900,
      }).then(doSuccess);
    } else {
      doSuccess();
    }
  } else {
    if (typeof Swal !== "undefined")
      Swal.fire({ icon: "error", title: t("verify_fail") });
    else alert(t("verify_fail"));
  }
}

function changeLocale() {
  i18nLocale.value = locale.value;
  try {
    localStorage.setItem("locale", locale.value);
    document.documentElement.lang = locale.value;
  } catch (e) {
    /* ignore */
  }
}
</script>

<style scoped>
/* Dropdown fade */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.12s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
.fade-enter-to,
.fade-leave-from {
  opacity: 1;
}

/* Animated background gradient */
@keyframes gradientMove {
  0% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-8px);
  }
  100% {
    transform: translateY(0);
  }
}
.animate-gradient {
  animation: gradientMove 12s ease-in-out infinite;
}

/* NIP placeholder behavior: hidden by default, visible gray on focus */
.nip-input::placeholder {
  color: transparent !important;
  transition: color 0.15s ease;
}
.nip-input:focus::placeholder {
  color: rgba(156, 163, 175, 1) !important;
} /* tailwind gray-400 */
/* WebKit fallback */
.nip-input::-webkit-input-placeholder {
  color: transparent !important;
}
.nip-input:focus::-webkit-input-placeholder {
  color: rgba(156, 163, 175, 1) !important;
}
</style>
