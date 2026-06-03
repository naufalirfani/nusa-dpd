import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

function NotFound() {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  function onSearch() {
    if (!query.trim()) return navigate('/');
    try {
      if (typeof window.Swal !== 'undefined') {
        window.Swal.fire({ 
          icon: 'info', 
          title: 'Pencarian', 
          text: `Tidak ditemukan hasil untuk "${query}"`,
          confirmButtonColor: "#3085d6"
        });
      } else {
        alert(`No results for "${query}"`);
      }
    } catch (e) {
      /* ignore */
    }
  }

  return (
    <div className="fixed inset-0 min-h-screen flex items-center justify-center bg-gradient-to-b from-white to-gray-50 dark:from-gray-900 dark:to-gray-950">
      <div className="max-w-4xl w-full px-6">
        <div className="bg-white dark:bg-gray-800 shadow-lg rounded-2xl p-8 md:p-12 flex flex-col md:flex-row items-center gap-8">
          {/* Illustration */}
          <div className="flex-1 flex items-center justify-center">
            <svg className="w-56 h-56 illustration-float" viewBox="0 0 240 240" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <defs>
                <linearGradient id="g1" x1="0" x2="1">
                  <stop offset="0" stopColor="#06b6d4" />
                  <stop offset="1" stopColor="#0891b2" />
                </linearGradient>
              </defs>
              <rect x="16" y="16" width="208" height="208" rx="24" fill="#f8fafc" stroke="#e6eef0" />
              <g transform="translate(40,40)">
                <path d="M0 96 C24 50, 96 24, 128 56 C160 88, 112 160, 64 144 C24 132, 0 96, 0 96 Z" fill="url(#g1)" opacity="0.95" />
                <circle cx="140" cy="20" r="12" fill="#fde68a" />
                <rect x="96" y="96" width="56" height="20" rx="6" fill="#fff" opacity="0.6" />
              </g>
            </svg>
          </div>

          {/* Content */}
          <div className="flex-1">
            <h1 className="text-5xl font-extrabold text-gray-800 dark:text-gray-200 mb-2">404</h1>
            <h2 className="text-xl text-gray-600 dark:text-gray-400 mb-4">Halaman tidak ditemukan</h2>
            <p className="text-gray-500 dark:text-gray-500 mb-6">Sepertinya halaman yang Anda cari tidak ada atau telah dipindahkan. Silakan kembali ke beranda.</p>

            <div className="flex items-center gap-3">
              <Link to="/" className="px-4 py-2 rounded-lg bg-teal-500 dark:bg-teal-600 border border-gray-200 dark:border-teal-700 text-white hover:shadow">
                Kembali ke Beranda
              </Link>
            </div>
          </div>
        </div>
        <p className="text-center text-xs text-gray-400 dark:text-gray-600 mt-6">&copy; 2026 BPSDM - SETJEN DPD RI</p>
      </div>

      <style>{`
        @keyframes float { 
          0% { transform: translateY(0); } 
          50% { transform: translateY(-8px); } 
          100% { transform: translateY(0); } 
        }
        .illustration-float { 
          animation: float 6s ease-in-out infinite; 
        }
      `}</style>
    </div>
  );
}

export default NotFound;
