import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import Header from './Header';
import NavigationMenu from './NavigationMenu';
import Footer from './Footer';
import ProfileModal from './ProfileModal';
import axios from 'axios';
import { getDpdPortalApiUrl } from '../config/api';
import encryptTokenForHeader from '@/utils/crypto';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes } from '@fortawesome/free-solid-svg-icons';

function MainLayout({ children }) {
  const navigate = useNavigate();
  const [userProfile, setUserProfile] = useState(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [bannerPopup, setBannerPopup] = useState(null);
  const [isPopupClosing, setIsPopupClosing] = useState(false);

  const SSO_API_TOKEN =
    import.meta.env.VITE_SSO_GENERATE_TOKEN ||
    '';

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
      if (
        raw.nama ||
        raw.name ||
        raw.email ||
        Object.prototype.hasOwnProperty.call(raw, 'nip') ||
        Object.prototype.hasOwnProperty.call(raw, 'id')
      )
        return raw;
    }
    return null;
  }

  async function fetchUserProfile(nip) {
    setIsLoadingProfile(true);
    try {
      const beUrl = import.meta.env.VITE_BE_URL || '';

      let url = getDpdPortalApiUrl(
        `/dpd-portal/openapi/profil/${encodeURIComponent(nip)}`,
      );
      const headers = {
        Accept: 'application/json, text/plain, */*',
        'Accept-Language': 'id-ID,id;q=0.9,en;q=0.8',
      };

      if (beUrl) {
        const base = beUrl.replace(/\/$/, '');
        url = `${base}/api/pegawai/${encodeURIComponent(nip)}`;
        if (SSO_API_TOKEN) {
          const apIToken = await encryptTokenForHeader(SSO_API_TOKEN, {
            salt: SSO_API_TOKEN,
          });
          headers['X-Api-Token'] = apIToken;
        }
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
        return null;
      } else {
        return null;
      }
    } catch (error) {
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

    const rawName =
      p.nama || p.name || p.nama_lengkap || p.full_name || p.namaLengkap || '';
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
      return (
        p.email ||
        p.emailGov ||
        p.email_address ||
        getUserFromToken().nip ||
        '-'
      );
    }

    return (
      p.nip ||
      p.nipBaru ||
      p.nip_baru ||
      p.nipbaru ||
      getUserFromToken().nip ||
      '-'
    );
  })();

  const showNip = (() => {
    const p = userProfile || {};
    const role = (p.role || '').toString().toLowerCase();
    return !(
      role === 'admin' ||
      role === 'super admin' ||
      role === 'superadmin'
    );
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

  function openBannerPopup(bannerUrl, activityName) {
    setBannerPopup({ url: bannerUrl, name: activityName });
    setIsPopupClosing(false);
  }

  function closeBannerPopup() {
    setIsPopupClosing(true);
    setTimeout(() => {
      setBannerPopup(null);
      setIsPopupClosing(false);
    }, 300);
  }

  useEffect(() => {
    loadUserProfile();
  }, []);

  // Provide openBannerPopup function through context/props or window
  useEffect(() => {
    window.openBannerPopup = openBannerPopup;
    return () => {
      delete window.openBannerPopup;
    };
  }, []);

  return (
    <div className="relative min-h-screen flex flex-col bg-slate-50 dark:bg-gray-900">
      <Header
        userName={userName}
        userNip={userNip}
        showNip={showNip}
        onProfileClick={() => setShowProfileModal(true)}
        onLogout={logout}
      />

      <NavigationMenu />

      <main className="relative z-0 flex-1 bg-gray-100 dark:bg-gray-900">{children}</main>

      <Footer />

      {showProfileModal && (
        <ProfileModal
          profile={userProfile}
          onClose={() => setShowProfileModal(false)}
        />
      )}

      {/* Banner Popup Modal */}
      {bannerPopup &&
        createPortal(
          <div
            className={`fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 transition-opacity duration-300 ${
              isPopupClosing ? 'opacity-0' : 'opacity-100'
            }`}
            onClick={closeBannerPopup}
          >
            <div
              className={`relative w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-2xl bg-white dark:bg-gray-800 shadow-2xl transition-all duration-300 ${
                isPopupClosing ? 'scale-95 opacity-0' : 'scale-100 opacity-100'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-6 py-4 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-800">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {bannerPopup.name}
                </h3>
                <button
                  onClick={closeBannerPopup}
                  className="rounded-lg p-2 text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-600 dark:hover:text-gray-300 transition"
                >
                  <FontAwesomeIcon icon={faTimes} className="h-5 w-5" />
                </button>
              </div>

              {/* Content */}
              <div className="overflow-y-auto p-6 max-h-[calc(90vh-80px)] bg-gray-50 dark:bg-gray-900">
                <img
                  src={bannerPopup.url}
                  alt={bannerPopup.name}
                  className="w-full h-auto rounded-lg shadow-md"
                />
              </div>

              {/* Footer */}
              <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-4 bg-gray-50 dark:bg-gray-800">
                <button
                  onClick={closeBannerPopup}
                  className="w-full rounded-lg bg-gray-900 dark:bg-gray-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800 dark:hover:bg-gray-600 transition"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

export default MainLayout;
