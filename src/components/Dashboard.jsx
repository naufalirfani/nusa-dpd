import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Footer from './Footer';
import ProfileModal from './ProfileModal';
import Calendar from './Calendar';
import { getDpdPortalApiUrl } from '../config/api';
import { useTheme } from '../stores/theme';
import logoPath from '../assets/logo.png';
import logoCmbPath from '../assets/logo_cmb.png';
import logoLmsPath from '../assets/logo_lms.jpeg';
import logoSimantapPath from '../assets/logo_simantap.png';

function Dashboard() {
  const navigate = useNavigate();
  const { isDarkMode, toggleTheme } = useTheme();
  const [userProfile, setUserProfile] = useState(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [now, setNow] = useState(new Date());
  const [activePopup, setActivePopup] = useState(null);
  const [isPopupClosing, setIsPopupClosing] = useState(false);

  const logo = logoPath;
  const logoCmb = logoCmbPath;
  const logoLms = logoLmsPath;
  const logoSimantap = logoSimantapPath;

  // Parse JWT payload
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

  // Format person name
  function formatPersonName(name) {
    try {
      if (!name) return '';
      const parts = name.split(',');
      const main = (parts[0] || '').trim();
      const suffix = parts.slice(1).join(',').trim();
      const words = main.split(/\s+/).filter(Boolean).map((w) => {
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

  function getUserFromToken() {
    try {
      const token = localStorage.getItem('token');
      if (!token) return { nip: '-', name: 'Pengguna' };
      const payload = parseJwtPayload(token) || {};
      return {
        nip: payload.nip || '-',
        name: payload.name || `NIP ${payload.nip || '-'}`,
      };
    } catch (e) {
      return { nip: '-', name: 'Pengguna' };
    }
  }

  function normalizeProfile(raw) {
    if (!raw) return null;
    if (raw.data && raw.data.data) return raw.data.data;
    if (raw.data && typeof raw.data === 'object') {
      const d = raw.data;
      if (d.nama || d.nip || d.name || d.email) return d;
    }
    if (typeof raw === 'object') {
      if (raw.nama || raw.name || raw.email || Object.prototype.hasOwnProperty.call(raw, 'nip') || Object.prototype.hasOwnProperty.call(raw, 'id'))
        return raw;
    }
    return null;
  }

  async function fetchUserProfile(nip) {
    setIsLoadingProfile(true);
    try {
      const cmbBase = import.meta.env.VITE_CMB_BASE || '';
      const token = localStorage.getItem('token') || '';

      let url = getDpdPortalApiUrl(`/dpd-portal/openapi/profil/${encodeURIComponent(nip)}`);
      const headers = {
        Accept: 'application/json, text/plain, */*',
        'Accept-Language': 'id-ID,id;q=0.9,en;q=0.8',
      };

      if (cmbBase) {
        const base = cmbBase.replace(/\/$/, '');
        url = `${base}/api/pegawai/${encodeURIComponent(nip)}`;
        if (token) headers['X-Api-Token'] = token;
        headers['Content-Type'] = 'application/json';
      } else {
        headers['app-token'] = 'ac54ff35-06cc-4702-8d95-f47c735cfaf7';
        headers['Content-Type'] = 'application/json';
      }

      const response = await axios.get(url, { headers });

      if (response && response.status === 200) {
        const payload = response.data;
        let profile = normalizeProfile(payload);
        if (profile) {
          if (profile.json && typeof profile.json === 'object') {
            profile = { ...profile, ...profile.json };
          }
          setUserProfile(profile);
          localStorage.setItem('userProfile', JSON.stringify(profile));
          return profile;
        }
        console.error('Unexpected profile shape:', payload);
        return null;
      } else {
        console.error('Failed to fetch user profile:', response && response.status);
        return null;
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    } finally {
      setIsLoadingProfile(false);
    }
  }

  function loadUserProfile() {
    try {
      const cached = localStorage.getItem('userProfile');
      if (cached) {
        setUserProfile(JSON.parse(cached));
        return;
      }
    } catch (e) {
      console.error('Failed to parse cached profile', e);
    }

    const tokenUser = getUserFromToken();
    if (tokenUser.nip && tokenUser.nip !== '-') {
      fetchUserProfile(tokenUser.nip);
    }
  }

  const userName = (() => {
    const p = userProfile || {};
    const role = (p.role || '').toString().toLowerCase();

    if (role === 'admin' || role === 'super admin' || role === 'superadmin') {
      return p.name || p.full_name || p.nama || 'Pengguna';
    }

    const rawName = p.nama || p.name || p.nama_lengkap || p.full_name || p.namaLengkap || '';
    const gelarDepan = p.gelarDepan || p.gelar_depan || '';
    const gelarBelakang = p.gelarBelakang || p.gelar_belakang || '';

    if (rawName) {
      const nama = formatPersonName(rawName || '');
      const front = gelarDepan ? `${gelarDepan} ` : '';
      const back = gelarBelakang ? `, ${gelarBelakang}` : '';
      return `${front}${nama}${back}`.trim();
    }

    const tokenUser = getUserFromToken();
    return formatPersonName(tokenUser.name || 'Pengguna');
  })();

  const userNip = (() => {
    const p = userProfile || {};
    const role = (p.role || '').toString().toLowerCase();

    if (role === 'admin' || role === 'super admin' || role === 'superadmin') {
      return p.email || p.emailGov || p.email_address || getUserFromToken().nip || '-';
    }

    return (
      p.nip || p.nipBaru || p.nip_baru || p.nipbaru ||
      getUserFromToken().nip || '-'
    );
  })();

  const showNip = (() => {
    const p = userProfile || {};
    const role = (p.role || '').toString().toLowerCase();
    return !(role === 'admin' || role === 'super admin' || role === 'superadmin');
  })();

  async function logout() {
    let confirmed = false;
    if (typeof window.Swal !== 'undefined') {
      const res = await window.Swal.fire({
        title: 'Konfirmasi',
        text: 'Apakah Anda yakin ingin logout?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Ya, logout',
        cancelButtonText: 'Batal',
        reverseButtons: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
      });
      confirmed = !!res.isConfirmed;
    } else {
      confirmed = confirm('Apakah Anda yakin ingin logout?');
    }

    if (!confirmed) return;

    const ssoEnabled = import.meta.env.VITE_ENABLE_SSO !== 'false';

    localStorage.removeItem('auth');
    localStorage.removeItem('token');
    localStorage.removeItem('userProfile');
    localStorage.removeItem('keycloak_access_token');
    localStorage.removeItem('keycloak_id_token');
    localStorage.removeItem('keycloak_refresh_token');

    if (ssoEnabled) {
      const { logout: keycloakLogout } = await import('../config/keycloak');
      keycloakLogout();
    } else {
      navigate('/login');
    }
  }

  function openService(name) {
    const token = localStorage.getItem('token') || '';
    const cmbBase = import.meta.env.VITE_CMB_BASE || '';
    const lmsBase = import.meta.env.VITE_LMS_BASE || '';
    const kmsBase = import.meta.env.VITE_KMS_BASE || '';

    function openUrl(u) {
      try {
        window.open(u, '_blank', 'noopener,noreferrer');
      } catch (e) {
        window.location.href = u;
      }
    }

    if (name === 'CMB') {
      if (!cmbBase) {
        const msg = 'CMB base URL is not configured. Please set VITE_CMB_BASE in your .env file.';
        if (typeof window.Swal !== 'undefined') window.Swal.fire({ icon: 'warning', title: 'Konfigurasi', text: msg });
        else alert(msg);
        return;
      }
      if (!token) {
        const msg = 'Token tidak ditemukan. Silakan login ulang.';
        if (typeof window.Swal !== 'undefined') window.Swal.fire({ icon: 'warning', title: 'Autentikasi', text: msg });
        else alert(msg);
        return;
      }
      const base = cmbBase.replace(/\/$/, '');
      const url = `${base}/sso/${encodeURIComponent(token)}`;
      openUrl(url);
      return;
    }

    if (name === 'LMS') {
      if (!lmsBase) {
        const msg = 'LMS base URL is not configured. Please set VITE_LMS_BASE in your .env file.';
        if (typeof window.Swal !== 'undefined') window.Swal.fire({ icon: 'warning', title: 'Konfigurasi', text: msg });
        else alert(msg);
        return;
      }
      if (!token) {
        const msg = 'Token tidak ditemukan. Silakan login ulang.';
        if (typeof window.Swal !== 'undefined') window.Swal.fire({ icon: 'warning', title: 'Autentikasi', text: msg });
        else alert(msg);
        return;
      }
      const base = lmsBase.replace(/\/$/, '');
      const url = `${base}/sso/${encodeURIComponent(token)}`;
      openUrl(url);
      return;
    }

    if (name === 'KMS') {
      if (!kmsBase) {
        const msg = 'KMS base URL is not configured. Please set VITE_KMS_BASE in your .env file.';
        if (typeof window.Swal !== 'undefined') window.Swal.fire({ icon: 'warning', title: 'Konfigurasi', text: msg });
        else alert(msg);
        return;
      }
      if (!token) {
        const msg = 'Token tidak ditemukan. Silakan login ulang.';
        if (typeof window.Swal !== 'undefined') window.Swal.fire({ icon: 'warning', title: 'Autentikasi', text: msg });
        else alert(msg);
        return;
      }
      const base = kmsBase.replace(/\/$/, '');
      const url = `${base}/sso/${encodeURIComponent(token)}`;
      openUrl(url);
      return;
    }

    if (name === 'SIMANTAP') {
      const simBase = import.meta.env.VITE_SIMANTAP_BASE || 'http://localhost:5173';
      if (!token) {
        const msg = 'Token tidak ditemukan. Silakan login ulang.';
        if (typeof window.Swal !== 'undefined') window.Swal.fire({ icon: 'warning', title: 'Autentikasi', text: msg });
        else alert(msg);
        return;
      }
      const base = simBase.replace(/\/$/, '');
      const url = `${base}/sso/${encodeURIComponent(token)}`;
      openUrl(url);
      return;
    }

    if (typeof window.Swal !== 'undefined')
      window.Swal.fire({
        icon: 'info',
        title: `Membuka ${name}`,
        text: 'Fitur demo — arahkan ke modul.',
      });
    else alert(`Membuka ${name}`);
  }

  useEffect(() => {
    loadUserProfile();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeNow = new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(now);
  const dateNow = new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(now);

  const tzLabel = (() => {
    const offset = -now.getTimezoneOffset() / 60;
    if (offset === 7) return 'WIB';
    if (offset === 8) return 'WITA';
    if (offset === 9) return 'WIT';
    return `UTC${offset >= 0 ? '+' + offset : offset}`;
  })();

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 11) return 'pagi';
    if (h < 15) return 'siang';
    if (h < 18) return 'sore';
    return 'malam';
  })();

  const quickLinks = [
    { label: 'Panduan Portal', desc: 'Cara menggunakan portal ini', bg: 'bg-indigo-50', type: 'book', url: '#' },
    { label: 'FAQ', desc: 'Pertanyaan yang sering diajukan', bg: 'bg-teal-50', type: 'help', url: '#' },
    { label: 'Kontak Support', desc: 'Hubungi tim bantuan', bg: 'bg-rose-50', type: 'chat', url: '#' },
    { label: 'Kunjungi Situs DPD', desc: 'Buka website resmi', bg: 'bg-amber-50', type: 'external', url: 'https://www.dpd.go.id' },
  ];

  function handleQuickLink(link) {
    if (!link || !link.url) return;
    
    // Handle popup links
    if (link.url === '#') {
      setActivePopup(link.type);
      setIsPopupClosing(false);
      return;
    }
    
    // Handle external links
    try {
      window.open(link.url, '_blank', 'noopener,noreferrer');
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
      title: 'Panduan Portal',
      content: (
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Selamat Datang di Portal NUSA</h4>
            <p className="text-gray-600 dark:text-gray-300">Portal NUSA (Nurturing Smart ASN) adalah platform terpadu untuk pengembangan SDM di Sekretariat Jenderal DPD RI.</p>
          </div>
          
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Fitur Utama:</h4>
            <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-300">
              <li><strong>CMB</strong> - Platform untuk Coaching, Mentoring, dan Belajar Mandiri</li>
              <li><strong>LMS</strong> - Learning Management System untuk pelatihan online</li>
              <li><strong>SIMANTAP</strong> - Sistem Manajemen Talenta Pegawai</li>
              <li><strong>KMS</strong> - Knowledge Management Center untuk berbagi pengetahuan</li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Cara Menggunakan:</h4>
            <ol className="list-decimal list-inside space-y-2 text-gray-600 dark:text-gray-300">
              <li>Login menggunakan kredensial yang telah diberikan</li>
              <li>Pilih layanan yang ingin diakses dari dashboard</li>
              <li>Klik tombol "Buka" pada kartu layanan</li>
              <li>Anda akan diarahkan ke sistem yang dipilih dengan SSO</li>
            </ol>
          </div>
          
          <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 rounded-lg p-4">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Tips:</strong> Pastikan Anda telah login untuk mengakses semua layanan. Jika mengalami kendala, silakan hubungi tim support.
            </p>
          </div>
        </div>
      )
    },
    help: {
      title: 'FAQ - Pertanyaan yang Sering Diajukan',
      content: (
        <div className="space-y-4">
          <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Bagaimana cara login ke portal?</h4>
            <p className="text-gray-600 dark:text-gray-300">Gunakan kredensial SSO yang telah diberikan oleh admin. Jika lupa password, hubungi tim IT support.</p>
          </div>
          
          <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Mengapa tidak bisa mengakses layanan tertentu?</h4>
            <p className="text-gray-600 dark:text-gray-300">Pastikan Anda telah login dan memiliki hak akses. Beberapa layanan memerlukan persetujuan admin. Periksa juga koneksi internet Anda.</p>
          </div>
          
          <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Bagaimana cara mendaftar ke program pelatihan?</h4>
            <p className="text-gray-600 dark:text-gray-300">Buka LMS, pilih program pelatihan yang tersedia, dan klik tombol "Daftar". Anda akan mendapat notifikasi jika pendaftaran berhasil.</p>
          </div>
          
          <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Bagaimana cara mengajukan coaching/mentoring?</h4>
            <p className="text-gray-600 dark:text-gray-300">Akses CMB, pilih menu "Pengajuan", isi formulir dengan lengkap, dan submit. Tim akan menghubungi Anda untuk proses selanjutnya.</p>
          </div>
          
          <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Dimana saya bisa melihat riwayat pelatihan saya?</h4>
            <p className="text-gray-600 dark:text-gray-300">Riwayat pelatihan dapat dilihat di profil Anda atau melalui menu "Riwayat" di masing-masing sistem (LMS/CMB).</p>
          </div>
          
          <div className="bg-teal-50 dark:bg-teal-900/30 border border-teal-100 dark:border-teal-800 rounded-lg p-4">
            <p className="text-sm text-teal-800 dark:text-teal-200">
              <strong>Masih ada pertanyaan?</strong> Hubungi tim support melalui menu "Kontak Support" atau email ke sdm@dpd.go.id
            </p>
          </div>
        </div>
      )
    },
    chat: {
      title: 'Kontak Support',
      content: (
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Tim Bantuan Siap Membantu Anda</h4>
            <p className="text-gray-600 dark:text-gray-300">Jika Anda mengalami kendala atau memiliki pertanyaan, silakan hubungi kami melalui:</p>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-4 bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20 rounded-lg border border-teal-100 dark:border-teal-800">
              <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 text-white flex items-center justify-center flex-shrink-0 shadow-md">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
                  <path d="M20 4H4a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V6a2 2 0 00-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                </svg>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900 dark:text-white mb-1">Email</p>
                <p className="text-sm text-teal-700 dark:text-teal-300 font-medium">sdm@dpd.go.id</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Respon dalam 1-2 hari kerja</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
              <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center flex-shrink-0 shadow-md">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s8-7.5 8-13a8 8 0 10-16 0c0 5.5 8 13 8 13z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 11a3 3 0 100-6 3 3 0 000 6z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900 dark:text-white mb-1">Datang Langsung</p>
                <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">Lantai 4, Gedung B, Setjen DPD RI</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Senin - Kamis, 09:00 - 15:30 WIB</p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-0">Istirahat: 11:30 - 13:00 WIB</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-3">Jum'at, 08:30 - 15:30 WIB</p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-0">Istirahat: 11:15 - 13:30 WIB</p>
              </div>
            </div>
          </div>
          
          <div className="bg-rose-50 dark:bg-rose-900/30 border border-rose-100 dark:border-rose-800 rounded-lg p-4">
            <p className="text-sm text-rose-800 dark:text-rose-200">
              <strong>Catatan:</strong> Untuk pertanyaan atau bantuan teknis, Anda dapat menghubungi kami via email atau datang langsung ke kantor kami selama jam kerja.
            </p>
          </div>
        </div>
      )
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col bg-slate-50 dark:bg-gray-900">
      {/* Decorative background */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 -top-24 flex justify-center">
        <div className="h-[280px] w-[1200px] bg-gradient-to-r from-teal-500/30 via-cyan-400/30 to-indigo-500/30 dark:from-teal-500/20 dark:via-cyan-400/20 dark:to-indigo-500/20 blur-3xl rounded-full"></div>
      </div>

      {/* Header */}
      <header className="relative z-10">
        <div className="mx-auto px-4 sm:px-6 lg:px-12">
          <div className="mt-6 mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={logo} alt="Logo" className="h-12 w-12 object-contain" />
              <div>
                <div className="text-xl font-semibold text-gray-900 dark:text-white tracking-tight">NUSA - <i className='font-semibold'>Nurturing Smart</i> ASN</div>
                <p className="text-gray-600 dark:text-gray-300">Portal Pengembangan Sumber Daya Manusia Sekretariat Jenderal DPD RI</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Dark Mode Toggle Switch */}
              <button
                onClick={toggleTheme}
                className="relative inline-flex items-center gap-2 rounded-full bg-white/70 dark:bg-gray-800/70 backdrop-blur border border-gray-200 dark:border-gray-700 px-1 py-1 hover:shadow-sm transition-all"
                title={isDarkMode ? 'Ubah ke Mode Terang' : 'Ubah ke Mode Gelap'}
              >
                <div className={`flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300 ${
                  isDarkMode ? 'bg-gray-700 text-yellow-400' : 'bg-gray-200 text-gray-600'
                }`}>
                  {isDarkMode ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                    </svg>
                  )}
                </div>
              </button>
              
              <button
                className="hidden sm:flex items-center gap-2 rounded-lg bg-white/70 dark:bg-gray-800/70 backdrop-blur border border-gray-200 dark:border-gray-700 px-3 py-2 text-gray-700 dark:text-gray-300 hover:shadow-sm transition"
                onClick={() => setShowProfileModal(true)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-teal-600 dark:text-teal-400" viewBox="0 0 24 24" fill="currentColor">
                  <path fillRule="evenodd" d="M12 2a5 5 0 100 10 5 5 0 000-10zM4 20a8 8 0 1116 0v1H4v-1z" clipRule="evenodd"/>
                </svg>
                <div className="text-left">
                  <div className="font-medium leading-4">{userName}</div>
                  {showNip && <div className="text-sm text-gray-500 dark:text-gray-400">NIP {userNip}</div>}
                  {!showNip && <div className="text-sm text-gray-500 dark:text-gray-400">{userNip}</div>}
                </div>
              </button>
              <button onClick={logout} className="inline-flex items-center gap-2 rounded-lg bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-800 px-3 py-2 hover:bg-rose-100 dark:hover:bg-rose-900/50 transition">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M16 13v-2H7V8l-5 4 5 4v-3h9z"/><path d="M20 3h-8a2 2 0 00-2 2v4h2V5h8v14h-8v-4h-2v4a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2z"/></svg>
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-0">
        <div className="mx-auto px-4 sm:px-6 lg:px-12">
          <div className="overflow-hidden rounded-2xl border border-gray-100 dark:border-gray-800 bg-gradient-to-br from-white to-slate-50 dark:from-gray-800 dark:to-gray-900 shadow-sm">
            <div className="relative p-6 sm:p-10">
              <div className="absolute right-0 top-0 -translate-y-1/3 translate-x-1/3 opacity-40">
                <div className="h-56 w-56 rounded-full bg-teal-200 dark:bg-teal-900 blur-3xl"></div>
              </div>
              <div className="absolute left-10 bottom-0 translate-y-1/3 opacity-30">
                <div className="h-40 w-40 rounded-full bg-indigo-200 dark:bg-indigo-900 blur-3xl"></div>
              </div>

              <div className="relative grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
                <div className="lg:col-span-3">
                  <p className="font-medium text-teal-700 dark:text-teal-400">Selamat {greeting} {userName},</p>
                  <h1 className="mt-1 text-2xl sm:text-3xl font-semibold text-gray-900 dark:text-white leading-snug">
                    Selamat datang di Portal Pengembangan SDM Sekretariat Jenderal DPD RI
                  </h1>
                  <p className="mt-2 text-gray-600 dark:text-gray-300 max-w-2xl">
                    Akses cepat ke layanan pembelajaran, pengembangan kompetensi, dan berbagai sumber daya.
                    Temukan layanan yang Anda butuhkan dan mulai berkolaborasi.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main content */}
      <main className="relative z-0 mx-auto w-full px-4 sm:px-6 lg:px-12 py-8">
        {/* Quick actions */}
        {/* <section aria-label="Aksi cepat" className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 items-stretch">
          <button onClick={() => openService('CMB')} className="group rounded-xl border border-teal-100 bg-white p-4 text-left shadow-sm hover:shadow-md transition h-full">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M5 3a2 2 0 00-2 2v1h18V5a2 2 0 00-2-2H5z"/><path fillRule="evenodd" d="M21 9H3v8a2 2 0 002 2h14a2 2 0 002-2V9zM8 12h3v5H8v-5z" clipRule="evenodd"/></svg>
              </div>
              <div>
                <p className="font-medium text-gray-900">CMB</p>
                <p className="text-sm text-gray-500"><i>Coaching</i>, <i>Mentoring</i>, dan Belajar Mandiri</p>
              </div>
            </div>
          </button>

          <button onClick={() => openService('LMS')} className="group rounded-xl border border-purple-100 bg-white p-4 text-left shadow-sm hover:shadow-md transition h-full">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
              </div>
              <div>
                <p className="font-medium text-gray-900">LMS</p>
                <p className="text-sm text-gray-500"><i>Learning Management System</i></p>
              </div>
            </div>
          </button>

          <button onClick={() => openService('SIMANTAP')} className="group rounded-xl border border-amber-100 bg-white p-4 text-left shadow-sm hover:shadow-md transition h-full">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a5 5 0 100 10 5 5 0 000-10zM9 11a1 1 0 00-1 1v8h8v-8a1 1 0 00-1-1H9z"/></svg>
              </div>
              <div>
                <p className="font-medium text-gray-900">SIMANTAP</p>
                <p className="text-sm text-gray-500">Manajemen Talenta Pegawai</p>
              </div>
            </div>
          </button>

          <button onClick={() => openService('KMS')} className="group rounded-xl border border-blue-100 bg-white p-4 text-left shadow-sm hover:shadow-md transition h-full">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M4 5a2 2 0 012-2h11a3 3 0 013 3v13a1 1 0 01-1.447.894L16 18.118l-2.553 1.776A1 1 0 0112 18.999V5H6a2 2 0 00-2 2V5z"/></svg>
              </div>
              <div>
                <p className="font-medium text-gray-900">KMS</p>
                <p className="text-sm text-gray-500"><i>Knowledge Management System</i></p>
              </div>
            </div>
          </button>
        </section> */}

        {/* Featured Services & Calendar */}
        <section className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Featured cards */}
          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* CMB Card */}
            <article onClick={() => openService('CMB')} className="group relative overflow-hidden rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-800 shadow-sm transition-all duration-500 hover:shadow-2xl hover:shadow-teal-200/50 dark:hover:shadow-teal-900/50 hover:-translate-y-1 hover:border-teal-200 dark:hover:border-teal-800 cursor-pointer h-full flex flex-col">
              <div className="absolute inset-0 bg-gradient-to-tr from-teal-50 via-white to-white dark:from-teal-900/20 dark:via-gray-800 dark:to-gray-800 group-hover:from-teal-100 group-hover:via-teal-50 dark:group-hover:from-teal-900/30 dark:group-hover:via-gray-800 transition-all duration-500"></div>
              <div className="relative p-6 sm:p-8 flex items-start gap-6 flex-1">
                <div className="flex-1 flex flex-col">
                  <div className="inline-flex w-max whitespace-nowrap items-center gap-2 rounded-full bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 text-sm font-medium px-3 py-1">Pembelajaran</div>
                  <h3 className="mt-3 text-xl font-semibold text-gray-900 dark:text-white">CMB</h3>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">Coaching, Mentoring & Belajar Mandiri</p>
                  {/* <p className="mt-3 text-gray-600 flex-1">Platform pembelajaran internal untuk coaching, mentoring, dan pengembangan mandiri pegawai.</p> */}
                  <div className="mt-auto pt-6">
                    <button onClick={(e) => { e.stopPropagation(); openService('CMB'); }} className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-teal-700 transition">
                      Buka CMB
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6"/></svg>
                    </button>
                  </div>
                </div>
                <img src={logoCmb} alt="Logo CMB" className="h-24 w-24 rounded-lg object-cover shadow-inner group-hover:scale-110 group-hover:rotate-3 transition-all duration-500" />
              </div>
            </article>

            {/* LMS Card */}
            <article onClick={() => openService('LMS')} className="group relative overflow-hidden rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-800 shadow-sm transition-all duration-500 hover:shadow-2xl hover:shadow-purple-200/50 dark:hover:shadow-purple-900/50 hover:-translate-y-1 hover:border-purple-200 dark:hover:border-purple-800 cursor-pointer h-full flex flex-col">
              <div className="absolute inset-0 bg-gradient-to-tr from-purple-50 via-white to-white dark:from-purple-900/20 dark:via-gray-800 dark:to-gray-800 group-hover:from-purple-100 group-hover:via-purple-50 dark:group-hover:from-purple-900/30 dark:group-hover:via-gray-800 transition-all duration-500"></div>
              <div className="relative p-6 sm:p-8 flex items-start gap-6 flex-1">
                <div className="flex-1 flex flex-col">
                  <div className="inline-flex w-max whitespace-nowrap items-center gap-2 rounded-full bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 text-sm font-medium px-3 py-1">Pembelajaran</div>
                  <h3 className="mt-3 text-xl font-semibold text-gray-900 dark:text-white">LMS</h3>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">Learning Management System</p>
                  {/* <p className="mt-3 text-gray-600 flex-1">Platform untuk modul pembelajaran, ujian online, dan sertifikasi.</p> */}
                  <div className="mt-auto pt-6">
                    <button onClick={(e) => { e.stopPropagation(); openService('LMS'); }} className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-purple-700 transition">
                      Buka LMS
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6"/></svg>
                    </button>
                  </div>
                </div>
                <img src={logoLms} alt="Logo LMS" className="h-24 w-24 rounded-lg object-cover shadow-inner group-hover:scale-110 group-hover:rotate-3 transition-all duration-500" />
              </div>
            </article>

            {/* SIMANTAP Card */}
            <article onClick={() => openService('SIMANTAP')} className="group relative overflow-hidden rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-800 shadow-sm transition-all duration-500 hover:shadow-2xl hover:shadow-amber-200/50 dark:hover:shadow-amber-900/50 hover:-translate-y-1 hover:border-amber-200 dark:hover:border-amber-800 cursor-pointer h-full flex flex-col">
              <div className="absolute inset-0 bg-gradient-to-tr from-amber-50 via-white to-white dark:from-amber-900/20 dark:via-gray-800 dark:to-gray-800 group-hover:from-amber-100 group-hover:via-amber-50 dark:group-hover:from-amber-900/30 dark:group-hover:via-gray-800 transition-all duration-500"></div>
              <div className="relative p-6 sm:p-8 flex items-start gap-6 flex-1">
                <div className="flex-1 flex flex-col">
                  <div className="inline-flex w-max whitespace-nowrap items-center gap-2 rounded-full bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-sm font-medium px-3 py-1">Layanan</div>
                  <h3 className="mt-3 text-xl font-semibold text-gray-900 dark:text-white">SIMANTAP</h3>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">Sistem Manajemen Talenta Pegawai</p>
                  {/* <p className="mt-3 text-gray-600 flex-1">Platform untuk manajemen talenta, penilaian kinerja, dan pengembangan karir pegawai.</p> */}
                  <div className="mt-auto pt-6">
                    <button onClick={(e) => { e.stopPropagation(); openService('SIMANTAP'); }} className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-amber-700 transition">
                      Buka SIMANTAP
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6"/></svg>
                    </button>
                  </div>
                </div>
                <img src={logoSimantap} alt="Logo SIMANTAP" className="h-24 w-24 rounded-lg object-cover shadow-inner group-hover:scale-110 group-hover:rotate-3 transition-all duration-500" />
              </div>
            </article>

            {/* KMS Card */}
            <article onClick={() => openService('KMS')} className="group relative overflow-hidden rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-800 shadow-sm transition-all duration-500 hover:shadow-2xl hover:shadow-blue-200/50 dark:hover:shadow-blue-900/50 hover:-translate-y-1 hover:border-blue-200 dark:hover:border-blue-800 cursor-pointer h-full flex flex-col">
              <div className="absolute inset-0 bg-gradient-to-tr from-blue-50 via-white to-white dark:from-blue-900/20 dark:via-gray-800 dark:to-gray-800 group-hover:from-blue-100 group-hover:via-blue-50 dark:group-hover:from-blue-900/30 dark:group-hover:via-gray-800 transition-all duration-500"></div>
              <div className="relative p-6 sm:p-8 flex items-start gap-6 flex-1">
                <div className="flex-1 flex flex-col">
                  <div className="inline-flex w-max whitespace-nowrap items-center gap-2 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-sm font-medium px-3 py-1">Pembelajaran</div>
                  <h3 className="mt-3 text-xl font-semibold text-gray-900 dark:text-white">KMS</h3>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">Knowledge Management Center</p>
                  {/* <p className="mt-3 text-gray-600 flex-1">Pusat pengetahuan untuk berbagi informasi, dokumentasi, dan best practices organisasi.</p> */}
                  <div className="mt-auto pt-6">
                    <button onClick={(e) => { e.stopPropagation(); openService('KMS'); }} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-blue-700 transition">
                      Buka KMS
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6"/></svg>
                    </button>
                  </div>
                </div>
                <img src={logo} alt="Logo KMS" className="h-24 w-24 rounded-lg object-cover shadow-inner group-hover:scale-110 group-hover:rotate-3 transition-all duration-500" />
              </div>
            </article>
          </div>

          {/* Right rail: Calendar */}
          <aside className="lg:col-span-1">
            <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-800 shadow-sm">
              <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                <h4 className="font-semibold text-gray-900 dark:text-white">Jadwal Kegiatan<br/>Bagian Pengembangan SDM</h4>
                <div className="text-right">
                  <div className="text-[13px] text-gray-500 dark:text-gray-400">{timeNow} <span>{tzLabel}</span></div>
                  <div className="text-[13px] text-gray-500 dark:text-gray-400">{dateNow}</div>
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
          <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-800 shadow-sm p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold text-gray-900 dark:text-white">Sumber Daya & Bantuan</h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {quickLinks.map((link, i) => (
                <button key={i} onClick={() => handleQuickLink(link)} className="group flex items-start gap-3 rounded-xl border border-gray-100 dark:border-gray-700 bg-slate-50 dark:bg-gray-700/50 p-4 text-left hover:bg-white dark:hover:bg-gray-700 hover:shadow-sm transition">
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${link.bg} dark:opacity-90`}>
                    {link.type === 'book' && (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 text-indigo-600 dark:text-indigo-400"><path d="M4 5a2 2 0 012-2h11a3 3 0 013 3v13a1 1 0 01-1.447.894L16 18.118l-2.553 1.776A1 1 0 0112 18.999V5H6a2 2 0 00-2 2V5z"/></svg>
                    )}
                    {link.type === 'help' && (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 text-teal-600 dark:text-teal-400"><path d="M12 2a10 10 0 100 20 10 10 0 000-20zm0 15a1.25 1.25 0 110 2.5A1.25 1.25 0 0112 17zm-1-3.5a1 1 0 112 0v.25c0 .414-.336.75-.75.75h-.5A1.75 1.75 0 019 12.75V12a3 3 0 016 0 1 1 0 11-2 0 1 1 0 10-2 0v.25z"/></svg>
                    )}
                    {link.type === 'chat' && (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 text-rose-600 dark:text-rose-400"><path d="M20 2H4a2 2 0 00-2 2v18l4-4h14a2 2 0 002-2V4a2 2 0 00-2-2z"/></svg>
                    )}
                    {link.type === 'external' && (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 text-amber-600"><path d="M14 3h7v7h-2V6.414l-9.293 9.293-1.414-1.414L17.586 5H14V3z"/><path d="M5 5h6v2H7v10h10v-4h2v6a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z"/></svg>
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{link.label}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{link.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
      {showProfileModal && <ProfileModal profile={userProfile} onClose={() => setShowProfileModal(false)} />}
      
      {/* Popup Modal */}
      {activePopup && popupContent[activePopup] && (
        <div 
          className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 transition-opacity duration-300 ${
            isPopupClosing ? 'opacity-0' : 'opacity-100'
          }`} 
          onClick={closePopup}
        >
          <div 
            className={`relative w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-2xl bg-white dark:bg-gray-800 shadow-2xl transition-all duration-300 ${
              isPopupClosing ? 'scale-95 opacity-0' : 'scale-100 opacity-100'
            }`} 
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-6 py-4 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-800">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{popupContent[activePopup].title}</h3>
              <button 
                onClick={closePopup}
                className="rounded-lg p-2 text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-600 dark:hover:text-gray-300 transition"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
            
            {/* Content */}
            <div className="overflow-y-auto px-6 py-6 max-h-[calc(90vh-80px)]">
              {popupContent[activePopup].content}
            </div>
            
            {/* Footer */}
            <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-4 bg-gray-50 dark:bg-gray-800">
              <button 
                onClick={closePopup}
                className="w-full rounded-lg bg-gray-900 dark:bg-gray-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800 dark:hover:bg-gray-600 transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
