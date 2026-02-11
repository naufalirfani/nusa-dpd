    import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getLinktree } from '../config/api';
import logoNusa from '../assets/logo.png';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faClipboardList, faFolder, faImage, faVideo, faSpinner } from '@fortawesome/free-solid-svg-icons';
// faYoutube not used; keep raw <i> markup for YouTube icon

const BE_URL = import.meta.env.VITE_BE_URL || 'http://localhost:8000';
// Simple in-memory cache to avoid duplicate network hits (useful in React 18 StrictMode dev)
const linktreeCache = new Map();

function Linktree() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [kegiatan, setKegiatan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloadLoading, setDownloadLoading] = useState({});
  const [darkMode, setDarkMode] = useState(() => {
    // Initialize from localStorage
    const saved = localStorage.getItem('linktree-dark-mode');
    return saved ? JSON.parse(saved) : false;
  });

  useEffect(() => {
    fetchLinktreeData();
  }, [slug]);

  useEffect(() => {
    // Apply dark mode to document and save to localStorage
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('linktree-dark-mode', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('linktree-dark-mode', 'false');
    }
  }, [darkMode]);

  const fetchLinktreeData = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!slug) {
        setError('Slug tidak tersedia');
        setLoading(false);
        return;
      }

      // If we already have a cached value or an in-flight promise, use it
      if (linktreeCache.has(slug)) {
        const cached = linktreeCache.get(slug);
        if (cached && typeof cached.then === 'function') {
          const data = await cached;
          setKegiatan(data);
          setLoading(false);
          return;
        } else {
          setKegiatan(cached);
          setLoading(false);
          return;
        }
      }

      // Store the promise immediately to deduplicate concurrent requests
      const promise = getLinktree(slug)
        .then((response) => {
          const data = response.data || response;
          linktreeCache.set(slug, data);
          return data;
        })
        .catch((err) => {
          // remove cache entry on error so retries are possible
          linktreeCache.delete(slug);
          throw err;
        });

      linktreeCache.set(slug, promise);
      const data = await promise;
      setKegiatan(data);
    } catch (err) {
      console.error('Error fetching linktree:', err);
      setError('Data tidak ditemukan atau terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    return timeStr.substring(0, 5); // Get HH:MM from HH:MM:SS
  };

  const isUrl = (str) => {
    if (!str) return false;
    try {
      new URL(str);
      return true;
    } catch {
      return str.startsWith('http://') || str.startsWith('https://');
    }
  };

  const getAccentClass = (title) => {
    if (!title) return 'bg-slate-400';
    if (title.toLowerCase().includes('zoom') || title.toLowerCase().includes('meeting')) return 'bg-blue-500';
    if (title.toLowerCase().includes('materi')) return 'bg-green-500';
    if (title.toLowerCase().includes('virtual')) return 'bg-purple-500';
    if (title.toLowerCase().includes('youtube') || title.toLowerCase().includes('live')) return 'bg-red-500';
    if (title.toLowerCase().includes('presensi') || title.toLowerCase().includes('survei')) return 'bg-orange-500';
    return 'bg-slate-400';
  };

  const downloadFile = (url) => {
    // Extract filename from URL
    const rawName = url.split('/').pop().split('?')[0] || 'download';
    const filename = decodeURIComponent(rawName);
    
    // Create anchor element and trigger download
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent"></div>
          <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">Memuat...</p>
        </div>
      </div>
    );
  }

  if (error || !kegiatan) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-3">⚠️</div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Data Tidak Ditemukan</h2>
          <p className="text-sm text-gray-600 dark:text-gray-300">{error}</p>
        </div>
      </div>
    );
  }

  const links = [];

  // Meeting link (if tempat is URL)
  if (kegiatan.tempat && isUrl(kegiatan.tempat)) {
    links.push({
      title: 'Launch Meeting - Zoom',
      url: kegiatan.tempat,
      icon: (
        <FontAwesomeIcon icon={faVideo} className="w-6 h-6" />
      ),
    });
  }

  // Materi link
  if (kegiatan.materi) {
    // always take raw from the field per request
    const materiUrl = String(kegiatan.materi || "");
    links.push({
      title: 'Materi',
      url: materiUrl,
      icon: (
        <FontAwesomeIcon icon={faFolder} className="w-6 h-6" />
      ),
    });
  }

  // Virtual Background link
  if (kegiatan.virtual_background) {
    // always take raw from the field per request
    const vbgUrl = String(kegiatan.virtual_background || "");
    links.push({
      title: 'Virtual Background',
      url: vbgUrl,
      icon: (
        <FontAwesomeIcon icon={faImage} className="w-6 h-6" />
      ),
    });
  }

  // Youtube link
  if (kegiatan.youtube) {
    links.push({
      title: 'Live Youtube',
      url: kegiatan.youtube,
      icon: (
        <i className="fa-brands fa-youtube text-2xl" aria-hidden="true" />
      ),
    });
  }

  // Presensi dan Survei (always show)
  links.push({
    title: 'Presensi dan Survei',
    url: `http://localhost:5173/activity-evaluation/${kegiatan.id}`,
    icon: (
      <FontAwesomeIcon icon={faClipboardList} className="w-6 h-6" />
    ),
  });

  return (
    <div className={`min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-colors duration-300 flex items-center justify-center py-8`}>
      {/* Main Content */}
      <div className="w-full max-w-xl sm:shadow-lg sm:bg-white sm:dark:bg-gray-900 rounded-2xl sm:border sm:border-gray-200 dark:border-gray-700 p-3 sm:p-12 relative">
        {/* Dark Mode Toggle */}
        <div className="absolute top-3 right-3 z-10">
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 rounded-full bg-white dark:bg-gray-800 shadow-md hover:shadow-lg transition-all duration-300 border border-gray-200 dark:border-gray-700"
            aria-label="Toggle dark mode"
          >
            {darkMode ? (
              <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-gray-700" fill="currentColor" viewBox="0 0 20 20">
                <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
              </svg>
            )}
          </button>
        </div>
        {/* Header Section */}
        <div className="text-center mb-6 animate-fadeIn">
          {/* Logos */}
          <div className="flex items-center justify-center gap-4 mb-4">
            <img 
              src={logoNusa} 
              alt="Logo NUSA" 
              className="h-16 w-auto object-contain"
            />
            <div className="h-8 w-px bg-gray-300 dark:bg-gray-600"></div>
            <img 
              src={`${BE_URL}/logo-dpd.png`}
              alt="Logo DPD" 
              className="h-16 w-auto object-contain"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          </div>

          {/* Event Info */}
          <div className="bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 mb-6">
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {kegiatan.nama_kegiatan}
            </h1>
            {kegiatan.judul_tema && (
              <p className="text-base md:text-lg text-gray-700 dark:text-gray-300 mb-3">
                "{kegiatan.judul_tema}"
              </p>
            )}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="font-medium">{formatDate(kegiatan.tanggal)}</span>
              </div>
              {(kegiatan.jam_mulai || kegiatan.jam_selesai) && (
                <>
                  <span className="hidden sm:inline text-gray-400">•</span>
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="font-medium">
                      {formatTime(kegiatan.jam_mulai)} - {formatTime(kegiatan.jam_selesai)} WIB
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Links Section */}
        <div className="space-y-4 mb-6 px-6">
          {links.map((link, index) => (
            <a
              key={index}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => {
                if (['Materi', 'Virtual Background'].includes(link.title)) {
                  e.preventDefault();
                  const id = index;
                  // use backend download endpoint with encoded path (VITE_BE_URL fallback)
                  const urlToEncode = link.url || '';
                  if (!urlToEncode) return;
                  const final = `${import.meta.env.VITE_BE_URL || "http://localhost:8000"}/api/media/download/${encodeURIComponent(urlToEncode)}`;
                  setDownloadLoading((s) => ({ ...s, [id]: true }));
                  window.location.href = final;
                  setTimeout(() => {
                    setDownloadLoading((s) => { const copy = { ...s }; delete copy[id]; return copy; });
                  }, 1000);
                }
              }}
              className={`group block w-full bg-gray-200 dark:bg-slate-900 text-slate-900 dark:text-white rounded-xl shadow-sm hover:shadow-md transform hover:-translate-y-0.5 transition-all duration-200 p-4 flex items-stretch`}
              style={{
                animationDelay: `${index * 100}ms`,
                animation: 'slideUp 0.5s ease-out forwards',
              }}
            >
              <div className={`${getAccentClass(link.title)} w-1.5 rounded-l-xl mr-3`} />
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-3">
                  {link.icon}
                </div>

                <div className="flex-1 text-center px-2">
                  <span className="text-base font-semibold block">{link.title}</span>
                </div>

                <div className="flex items-center">
                  {downloadLoading[index] ? (
                    <FontAwesomeIcon icon={faSpinner} spin className="text-gray-600" />
                  ) : (
                    <svg
                      className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                </div>
              </div>
            </a>
          ))}
        </div>

        {/* Footer */}
        <footer className="text-center py-4">
          <p className="text-gray-600 dark:text-gray-400 text-xs">
            &copy; 2025. BPSDM. All rights reserved.
          </p>
        </footer>
      </div>

      {/* Animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.6s ease-out;
        }
      `}</style>
    </div>
  );
}

export default Linktree;
