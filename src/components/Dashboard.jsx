import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import MainLayout from "./MainLayout";
import Calendar from "./Calendar";
import OngoingActivities from "./OngoingActivities";
import { fetchUserProfileByIdentifier } from "../config/api";
import { useTheme } from "../stores/theme";
import logoPath from "../assets/logo.png";
import logoCmbPath from "../assets/logo_cmb.png";
import logoLmsPath from "../assets/logo_lms.png";
import logoSimantapPath from "../assets/logo_simantap.png";
import logoKmsPath from "../assets/logo_kms.png";
import featuredServices from "../config/featuredServices";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faEnvelope,
  faMapMarkerAlt,
  faBook,
  faQuestionCircle,
  faComments,
  faExternalLinkAlt,
  faTimes,
  faArrowRight,
} from "@fortawesome/free-solid-svg-icons";

function Dashboard() {
  const navigate = useNavigate();
  const [now, setNow] = useState(new Date());
  const [activePopup, setActivePopup] = useState(null);
  const [isPopupClosing, setIsPopupClosing] = useState(false);
  const [userProfile, setUserProfile] = useState(null);

  const logoCmb = logoCmbPath;
  const logoLms = logoLmsPath;
  const logoSimantap = logoSimantapPath;
  const logoKms = logoKmsPath;

  function openService(name) {
    const token = localStorage.getItem("token") || "";
    const cmbBase = import.meta.env.VITE_CMB_BASE || "";
    const lmsBase = import.meta.env.VITE_LMS_BASE || "";
    const kmsBase = import.meta.env.VITE_KMS_BASE || "";

    function openUrl(u) {
      try {
        window.open(u, "_blank", "noopener,noreferrer");
      } catch (e) {
        window.location.href = u;
      }
    }

    if (name === "CMB") {
      if (!cmbBase) {
        const msg =
          "CMB base URL is not configured. Please set VITE_CMB_BASE in your .env file.";
        if (typeof window.Swal !== "undefined")
          window.Swal.fire({
            icon: "warning",
            title: "Konfigurasi",
            text: msg,
            confirmButtonColor: "#3085d6",
          });
        else alert(msg);
        return;
      }
      if (!token) {
        const msg = "Token tidak ditemukan. Silakan login ulang.";
        if (typeof window.Swal !== "undefined")
          window.Swal.fire({
            icon: "warning",
            title: "Autentikasi",
            text: msg,
            confirmButtonColor: "#3085d6",
          });
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
        const msg =
          "LMS base URL is not configured. Please set VITE_LMS_BASE in your .env file.";
        if (typeof window.Swal !== "undefined")
          window.Swal.fire({
            icon: "warning",
            title: "Konfigurasi",
            text: msg,
            confirmButtonColor: "#3085d6",
          });
        else alert(msg);
        return;
      }
      if (!token) {
        const msg = "Token tidak ditemukan. Silakan login ulang.";
        if (typeof window.Swal !== "undefined")
          window.Swal.fire({
            icon: "warning",
            title: "Autentikasi",
            text: msg,
            confirmButtonColor: "#3085d6",
          });
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
        const msg =
          "KMS base URL is not configured. Please set VITE_KMS_BASE in your .env file.";
        if (typeof window.Swal !== "undefined")
          window.Swal.fire({
            icon: "warning",
            title: "Konfigurasi",
            text: msg,
            confirmButtonColor: "#3085d6",
          });
        else alert(msg);
        return;
      }
      if (!token) {
        const msg = "Token tidak ditemukan. Silakan login ulang.";
        if (typeof window.Swal !== "undefined")
          window.Swal.fire({
            icon: "warning",
            title: "Autentikasi",
            text: msg,
            confirmButtonColor: "#3085d6",
          });
        else alert(msg);
        return;
      }
      const base = kmsBase.replace(/\/$/, "");
      const url = `${base}/sso/${encodeURIComponent(token)}`;
      openUrl(url);
      return;
    }

    if (name === "SIMANTAP") {
      const simBase =
        import.meta.env.VITE_SIMANTAP_BASE || "http://localhost:5173";
      if (!token) {
        const msg = "Token tidak ditemukan. Silakan login ulang.";
        if (typeof window.Swal !== "undefined")
          window.Swal.fire({
            icon: "warning",
            title: "Autentikasi",
            text: msg,
            confirmButtonColor: "#3085d6",
          });
        else alert(msg);
        return;
      }
      const base = simBase.replace(/\/$/, "");
      const url = `${base}/sso/${encodeURIComponent(token)}`;
      openUrl(url);
      return;
    }

    if (typeof window.Swal !== "undefined")
      window.Swal.fire({
        icon: "info",
        title: `Membuka ${name}`,
        text: "Fitur demo — arahkan ke modul.",
        confirmButtonColor: "#3085d6",
      });
    else alert(`Membuka ${name}`);
  }

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto-open service based on URL parameter 'app'
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const appParam = urlParams.get("app");
    const redirectParam = urlParams.get("redirect");

    if (appParam) {
      const token = localStorage.getItem("token");
      if (token) {
        const normalizedApp = appParam.toUpperCase();

        // Get base URL based on app
        let baseUrl = "";
        if (normalizedApp === "CMB") {
          baseUrl = import.meta.env.VITE_CMB_BASE || "";
        } else if (normalizedApp === "LMS") {
          baseUrl = import.meta.env.VITE_LMS_BASE || "";
        } else if (normalizedApp === "SIMANTAP") {
          baseUrl = import.meta.env.VITE_SIMANTAP_BASE || "";
        } else if (normalizedApp === "KMS") {
          baseUrl = import.meta.env.VITE_KMS_BASE || "";
        }

        if (baseUrl) {
          const base = baseUrl.replace(/\/$/, "");
          let targetUrl = `${base}/sso/${encodeURIComponent(token)}`;

          // Add redirect parameter if exists
          if (redirectParam) {
            targetUrl += `?redirect=${encodeURIComponent(redirectParam)}`;
          }

          // Redirect to service
          window.location.href = targetUrl;
        }
      }
    } else if (redirectParam) {
      try {
        const redirectUrl = new URL(redirectParam, window.location.origin);
        if (redirectUrl.origin === window.location.origin) {
          navigate(
            redirectUrl.pathname + redirectUrl.search + redirectUrl.hash,
          );
        } else {
          window.location.href = redirectParam;
        }
      } catch (e) {
        // Fallback to in-app navigation for relative paths
        navigate(redirectParam);
      }
    }
  }, []);

  const timeNow = new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(now);
  const dateNow = new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(now);

  const tzLabel = (() => {
    const offset = -now.getTimezoneOffset() / 60;
    if (offset === 7) return "WIB";
    if (offset === 8) return "WITA";
    if (offset === 9) return "WIT";
    return `UTC${offset >= 0 ? "+" + offset : offset}`;
  })();

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 11) return "pagi";
    if (h < 15) return "siang";
    if (h < 18) return "sore";
    return "malam";
  })();

  function parseJwtPayload(token) {
    try {
      if (!token) return {};
      const parts = token.split(".");
      if (parts.length < 2) return {};
      const payloadB64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
      const pad = payloadB64.length % 4 === 0 ? 0 : 4 - (payloadB64.length % 4);
      const padded = payloadB64 + "=".repeat(pad);
      const json = atob(padded);
      return JSON.parse(json || "{}");
    } catch (e) {
      return {};
    }
  }

  async function loadUserProfile() {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const payload = parseJwtPayload(token) || {};
      const nip = payload.nip || payload.preferred_username || "";
      if (!nip) return;

      const profile = await fetchUserProfileByIdentifier(nip);
      if (profile) setUserProfile(profile);
    } catch (e) {
      console.error("Failed to load user profile", e);
    }
  }

  useEffect(() => {
    loadUserProfile();
  }, []);

  const userName = (() => {
    const profile = userProfile || {};
    const rawName =
      profile.nama ||
      profile.name ||
      profile.nama_lengkap ||
      profile.full_name ||
      "";
    if (rawName) return rawName;
    return "Pengguna";
  })();

  const quickLinks = [
    {
      label: "Panduan Portal",
      desc: "Cara menggunakan portal ini",
      bg: "bg-indigo-50",
      type: "book",
      url: "#",
    },
    {
      label: "FAQ",
      desc: "Pertanyaan yang sering diajukan",
      bg: "bg-teal-50",
      type: "help",
      url: "#",
    },
    {
      label: "Kontak Support",
      desc: "Hubungi tim bantuan",
      bg: "bg-rose-50",
      type: "chat",
      url: "#",
    },
    {
      label: "Kunjungi Situs DPD",
      desc: "Buka website resmi",
      bg: "bg-amber-50",
      type: "external",
      url: "https://www.dpd.go.id",
    },
  ];

  function handleQuickLink(link) {
    if (!link || !link.url) return;

    // Handle popup links
    if (link.url === "#") {
      setActivePopup(link.type);
      setIsPopupClosing(false);
      return;
    }

    // Handle external links
    try {
      window.open(link.url, "_blank", "noopener,noreferrer");
    } catch (e) {
      window.location.href = link.url;
    }
  }

  function closePopup() {
    setIsPopupClosing(true);
    setTimeout(() => {
      setActivePopup(null);
      setIsPopupClosing(false);
    }, 300);
  }

  const popupContent = {
    book: {
      title: "Panduan Portal",
      content: (
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
              Selamat Datang di Portal NUSA
            </h4>
            <p className="text-gray-600 dark:text-gray-300">
              Portal NUSA (Nurturing Smart ASN) adalah platform terpadu untuk
              pengembangan SDM di Sekretariat Jenderal DPD RI.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
              Fitur Utama:
            </h4>
            <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-300">
              <li>
                <strong>CMB</strong> - Platform untuk Coaching, Mentoring, dan
                Belajar Mandiri
              </li>
              <li>
                <strong>LMS</strong> - Learning Management System untuk
                pelatihan online
              </li>
              <li>
                <strong>SIMANTAP</strong> - Sistem Manajemen Talenta Pegawai
              </li>
              <li>
                <strong>KMS</strong> - Knowledge Management System untuk berbagi
                pengetahuan
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
              Cara Menggunakan:
            </h4>
            <ol className="list-decimal list-inside space-y-2 text-gray-600 dark:text-gray-300">
              <li>Login menggunakan kredensial yang telah diberikan</li>
              <li>Pilih layanan yang ingin diakses dari dashboard</li>
              <li>Klik tombol "Buka" pada kartu layanan</li>
              <li>Anda akan diarahkan ke sistem yang dipilih dengan SSO</li>
            </ol>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 rounded-lg p-4">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Tips:</strong> Pastikan Anda telah login untuk mengakses
              semua layanan. Jika mengalami kendala, silakan hubungi tim
              support.
            </p>
          </div>
        </div>
      ),
    },
    help: {
      title: "FAQ - Pertanyaan yang Sering Diajukan",
      content: (
        <div className="space-y-4">
          <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
              Bagaimana cara login ke portal?
            </h4>
            <p className="text-gray-600 dark:text-gray-300">
              Gunakan kredensial SSO yang telah diberikan oleh admin. Jika lupa
              password, hubungi tim IT support.
            </p>
          </div>

          <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
              Mengapa tidak bisa mengakses layanan tertentu?
            </h4>
            <p className="text-gray-600 dark:text-gray-300">
              Pastikan Anda telah login dan memiliki hak akses. Beberapa layanan
              memerlukan persetujuan admin. Periksa juga koneksi internet Anda.
            </p>
          </div>

          <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
              Bagaimana cara mendaftar ke program pelatihan?
            </h4>
            <p className="text-gray-600 dark:text-gray-300">
              Buka LMS, pilih program pelatihan yang tersedia, dan klik tombol
              "Daftar". Anda akan mendapat notifikasi jika pendaftaran berhasil.
            </p>
          </div>

          <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
              Bagaimana cara mengajukan coaching/mentoring?
            </h4>
            <p className="text-gray-600 dark:text-gray-300">
              Akses CMB, pilih menu "Pengajuan", isi formulir dengan lengkap,
              dan submit. Tim akan menghubungi Anda untuk proses selanjutnya.
            </p>
          </div>

          <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
              Dimana saya bisa melihat riwayat pelatihan saya?
            </h4>
            <p className="text-gray-600 dark:text-gray-300">
              Riwayat pelatihan dapat dilihat di profil Anda atau melalui menu
              "Riwayat" di masing-masing sistem (LMS/CMB).
            </p>
          </div>

          <div className="bg-teal-50 dark:bg-teal-900/30 border border-teal-100 dark:border-teal-800 rounded-lg p-4">
            <p className="text-sm text-teal-800 dark:text-teal-200">
              <strong>Masih ada pertanyaan?</strong> Hubungi tim support melalui
              menu "Kontak Support" atau email ke sdm@dpd.go.id
            </p>
          </div>
        </div>
      ),
    },
    chat: {
      title: "Kontak Support",
      content: (
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
              Tim Bantuan Siap Membantu Anda
            </h4>
            <p className="text-gray-600 dark:text-gray-300">
              Jika Anda mengalami kendala atau memiliki pertanyaan, silakan
              hubungi kami melalui:
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-start gap-3 p-4 bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20 rounded-lg border border-teal-100 dark:border-teal-800">
              <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 text-white flex items-center justify-center flex-shrink-0 shadow-md">
                <FontAwesomeIcon
                  icon={faEnvelope}
                  className="h-6 w-6 text-white"
                />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900 dark:text-white mb-1">
                  Email
                </p>
                <p className="text-sm text-teal-600 dark:text-teal-300 font-medium">
                  sdm@dpd.go.id
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Respon dalam 1-2 hari kerja
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
              <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center flex-shrink-0 shadow-md">
                <FontAwesomeIcon
                  icon={faMapMarkerAlt}
                  className="h-6 w-6 text-white"
                />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900 dark:text-white mb-1">
                  Datang Langsung
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">
                  Lantai 4, Gedung B, DPD RI
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Senin - Kamis, 09:00 - 15:30 WIB
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-0">
                  Istirahat: 11:30 - 13:00 WIB
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-3">
                  Jum'at, 08:30 - 15:30 WIB
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-0">
                  Istirahat: 11:15 - 13:30 WIB
                </p>
              </div>
            </div>
          </div>

          <div className="bg-rose-50 dark:bg-rose-900/30 border border-rose-100 dark:border-rose-800 rounded-lg p-4">
            <p className="text-sm text-rose-800 dark:text-rose-200">
              <strong>Catatan:</strong> Untuk pertanyaan atau bantuan teknis,
              Anda dapat menghubungi kami via email atau datang langsung ke
              kantor kami selama jam kerja.
            </p>
          </div>
        </div>
      ),
    },
  };

  return (
    <MainLayout>
      {/* Hero */}
      <section className="relative z-0">
        <div className="mx-auto px-4 sm:px-6 lg:px-8 mt-6">
          <div className="overflow-hidden rounded-2xl border border-gray-200/60 dark:border-gray-700/50 bg-gradient-to-br from-white via-slate-50/80 to-teal-50/40 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 shadow-md backdrop-blur-sm">
            <div className="relative p-6 sm:p-6">
              {/* Gradient Orbs - Enhanced */}
              <div className="absolute right-0 top-0 -translate-y-1/2 translate-x-1/4 opacity-50">
                <div className="h-72 w-72 rounded-full bg-gradient-to-br from-teal-300 via-cyan-200 to-blue-300 dark:from-teal-500 dark:via-cyan-700 dark:to-blue-600 blur-3xl animate-pulse"></div>
              </div>
              <div className="absolute left-10 bottom-0 translate-y-1/2 -translate-x-10 opacity-40">
                <div
                  className="h-56 w-56 rounded-full bg-gradient-to-tr from-indigo-300 via-purple-200 to-pink-300 dark:from-indigo-600 dark:via-purple-700 dark:to-pink-600 blur-3xl animate-pulse"
                  style={{ animationDelay: "1s" }}
                ></div>
              </div>
              <div className="absolute right-1/4 bottom-10 opacity-30">
                <div
                  className="h-40 w-40 rounded-full bg-gradient-to-bl from-amber-200 via-orange-200 to-rose-200 dark:from-amber-600 dark:via-orange-700 dark:to-rose-600 blur-2xl animate-pulse"
                  style={{ animationDelay: "2s" }}
                ></div>
              </div>

              {/* Geometric Pattern Overlay */}
              <div
                className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                }}
              ></div>

              {/* Diagonal Lines Pattern */}
              <div
                className="absolute inset-0 opacity-[0.02] dark:opacity-[0.04]"
                style={{
                  backgroundImage: `linear-gradient(45deg, transparent 48%, currentColor 48%, currentColor 52%, transparent 52%), linear-gradient(-45deg, transparent 48%, currentColor 48%, currentColor 52%, transparent 52%)`,
                  backgroundSize: "20px 20px",
                }}
              ></div>

              {/* Shimmer Effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent dark:via-white/3 -skew-x-12 animate-shimmer"></div>

              <div className="relative grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
                <div className="lg:col-span-3">
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-teal-500/10 via-cyan-500/10 to-blue-500/10 dark:from-teal-500/20 dark:via-cyan-500/20 dark:to-blue-500/20 border border-teal-200/30 dark:border-teal-600/30 backdrop-blur-sm mb-3">
                    <div className="h-2 w-2 rounded-full bg-teal-500 dark:bg-teal-400 animate-pulse"></div>
                    <p className="font-medium text-transparent bg-clip-text bg-gradient-to-r from-teal-500 via-cyan-600 to-blue-600 dark:from-teal-400 dark:via-cyan-400 dark:to-blue-400 text-sm">
                      Selamat {greeting} {userName}
                    </p>
                  </div>
                  <h1 className="mt-2 text-xl sm:text-2xl lg:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-br from-gray-900 via-gray-800 to-gray-700 dark:from-white dark:via-gray-100 dark:to-gray-300 leading-snug drop-shadow-md">
                    Selamat datang di Portal Pengembangan SDM Sekretariat
                    Jenderal DPD RI
                  </h1>
                  <p className="mt-2 text-gray-600 dark:text-gray-300 max-w-4xl text-base leading-relaxed">
                    Akses cepat ke layanan pembelajaran, pengembangan
                    kompetensi, dan berbagai sumber daya. Temukan layanan yang
                    Anda butuhkan dan mulai berkolaborasi.
                  </p>

                  {/* Decorative Line */}
                  {/* <div className="mt-4 h-1 w-32 rounded-full bg-gradient-to-r from-teal-500 via-cyan-500 to-blue-500 shadow-md shadow-teal-500/30"></div> */}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%) skewX(-12deg); }
          100% { transform: translateX(200%) skewX(-12deg); }
        }
        .animate-shimmer {
          animation: shimmer 8s infinite;
        }
      `}</style>

      {/* Main content */}
      <main className="relative z-0 mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Ongoing Activities Section */}
        <OngoingActivities />

        {/* Featured Services & Calendar */}
        <section className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Featured cards */}
          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
            {featuredServices
              .filter((s) => s.enabled)
              .sort((a, b) => (a.order || 0) - (b.order || 0))
              .map((svc) => {
                const accentBg = {
                  teal: 'bg-teal-50 text-teal-600',
                  purple: 'bg-purple-50 text-purple-600',
                  amber: 'bg-amber-50 text-amber-700',
                  blue: 'bg-blue-50 text-blue-600',
                }[svc.accent]
                  || 'bg-teal-50 text-teal-600';

                return (
                  <article
                    key={svc.id}
                    onClick={() => openService(svc.key)}
                    className={`group relative overflow-hidden rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-800 shadow-md transition-all duration-500 hover:shadow-2xl hover:shadow-teal-200/50 dark:hover:shadow-teal-900/50 hover:-translate-y-1 hover:border-teal-200 dark:hover:border-teal-800 cursor-pointer h-full flex flex-col`}
                  >
                    <div className="absolute inset-0 bg-gradient-to-tr from-teal-50 via-white to-white dark:from-teal-900/20 dark:via-gray-800 dark:to-gray-800 group-hover:from-teal-100 group-hover:via-teal-50 dark:group-hover:from-teal-900/30 dark:group-hover:via-gray-800 transition-all duration-500"></div>
                    <div className="relative p-6 sm:p-8 flex items-start gap-6 flex-1">
                      <div className="flex-1 flex flex-col">
                        <div className={`inline-flex w-max whitespace-nowrap items-center gap-2 rounded-full ${accentBg} dark:bg-teal-900/30 text-sm font-medium px-3 py-1`}>
                          {svc.category}
                        </div>
                        <h3 className="mt-3 text-xl font-semibold text-gray-900 dark:text-white">
                          {svc.title}
                        </h3>
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                          {svc.subtitle}
                        </p>
                        <div className="mt-auto pt-6">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openService(svc.key);
                            }}
                            className="inline-flex items-center gap-2 rounded-lg bg-teal-500 px-4 py-2 text-sm font-medium text-white shadow hover:bg-teal-600 transition"
                          >
                            Buka {svc.title}
                            <FontAwesomeIcon
                              icon={faArrowRight}
                              className="h-4 w-4"
                            />
                          </button>
                        </div>
                      </div>
                      <img
                        src={svc.logo}
                        alt={`Logo ${svc.title}`}
                        className="h-24 w-24 rounded-lg object-cover group-hover:scale-110 group-hover:rotate-3 transition-all duration-500"
                      />
                    </div>
                  </article>
                );
              })}
          </div>

          {/* Right rail: Calendar */}
          <aside className="lg:col-span-1">
            <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-800 shadow-md">
              <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                <h4 className="font-semibold text-gray-900 dark:text-white">
                  Jadwal Kegiatan
                  <br />
                  Bagian Pengembangan SDM
                </h4>
                <div className="text-right">
                  <div className="text-[13px] text-gray-500 dark:text-gray-400">
                    {timeNow} <span>{tzLabel}</span>
                  </div>
                  <div className="text-[13px] text-gray-500 dark:text-gray-400">
                    {dateNow}
                  </div>
                </div>
              </div>
              <div className="p-4">
                <Calendar />
              </div>
            </div>
          </aside>
        </section>

        {/* Helpful links */}
        <section className="mt-8">
          <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-800 shadow-md p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold text-gray-900 dark:text-white">
                Sumber Daya & Bantuan
              </h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {quickLinks.map((link, i) => (
                <button
                  key={i}
                  onClick={() => handleQuickLink(link)}
                  className="group flex items-start gap-3 rounded-xl border border-gray-100 dark:border-gray-700 bg-slate-50 dark:bg-gray-700/50 p-4 text-left hover:bg-white dark:hover:bg-gray-700 hover:shadow-md transition"
                >
                  <div
                    className={`h-10 w-10 rounded-lg flex items-center justify-center ${link.bg} dark:opacity-90`}
                  >
                    {link.type === "book" && (
                      <FontAwesomeIcon
                        icon={faBook}
                        className="h-5 w-5 text-indigo-600 dark:text-indigo-400"
                      />
                    )}
                    {link.type === "help" && (
                      <FontAwesomeIcon
                        icon={faQuestionCircle}
                        className="h-5 w-5 text-teal-500 dark:text-teal-400"
                      />
                    )}
                    {link.type === "chat" && (
                      <FontAwesomeIcon
                        icon={faComments}
                        className="h-5 w-5 text-rose-600 dark:text-rose-400"
                      />
                    )}
                    {link.type === "external" && (
                      <FontAwesomeIcon
                        icon={faExternalLinkAlt}
                        className="h-5 w-5 text-amber-600"
                      />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {link.label}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {link.desc}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Popup Modal rendered via portal so it sits above header/footer */}
      {activePopup &&
        popupContent[activePopup] &&
        createPortal(
          <div
            className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 transition-opacity duration-300 ${
              isPopupClosing ? "opacity-0" : "opacity-100"
            }`}
            onClick={closePopup}
          >
            <div
              className={`relative w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-2xl bg-white dark:bg-gray-800 shadow-2xl transition-all duration-300 ${
                isPopupClosing ? "scale-95 opacity-0" : "scale-100 opacity-100"
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-6 py-4 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-800">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {popupContent[activePopup].title}
                </h3>
                <button
                  onClick={closePopup}
                  className="rounded-lg text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-600 dark:hover:text-gray-300 transition"
                >
                  <FontAwesomeIcon icon={faTimes} className="h-4 w-4" />
                </button>
              </div>

              {/* Content */}
              <div className="overflow-y-auto px-6 py-6 max-h-[calc(90vh-80px)]">
                {popupContent[activePopup].content}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </MainLayout>
  );
}

export default Dashboard;
