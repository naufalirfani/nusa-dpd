import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUserTie, faUsers, faSpinner } from "@fortawesome/free-solid-svg-icons";
import { getKegiatanById } from "../config/api";

function FormSelectionPage({ isNarasumber = false }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);

  const isSpeakerMode =
    isNarasumber ||
    location.pathname.includes("form-selection-narasumber") ||
    location.search.includes("type=narasumber");

  useEffect(() => {
    let active = true;
    const checkAccessibility = async () => {
      if (!id) {
        setLoading(false);
        return;
      }
      try {
        const response = await getKegiatanById(id);
        const data = response?.data || response;
        if (!active) return;
        const aks = isSpeakerMode
          ? (data?.aksesibilitas_narasumber || data?.aksesibilitas)
          : data?.aksesibilitas;
        if (aks === "Internal") {
          navigate(
            isSpeakerMode
              ? `/speaker-evaluation/${id}`
              : `/activity-evaluation/${id}`,
            { replace: true }
          );
          return;
        } else if (aks === "Eksternal") {
          navigate(
            isSpeakerMode
              ? `/public-speaker-evaluation/${id}`
              : `/public-activity-evaluation/${id}`,
            { replace: true }
          );
          return;
        }
      } catch (err) {
        console.error("Failed to fetch activity accessibility:", err);
      } finally {
        if (active) setLoading(false);
      }
    };

    checkAccessibility();
    return () => {
      active = false;
    };
  }, [id, navigate, isSpeakerMode]);

  const handleASNClick = () => {
    navigate(
      isSpeakerMode
        ? `/speaker-evaluation/${id}`
        : `/activity-evaluation/${id}`
    );
  };

  const handlePublicClick = () => {
    navigate(
      isSpeakerMode
        ? `/public-speaker-evaluation/${id}`
        : `/public-activity-evaluation/${id}`
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-gray-700/50 flex items-center justify-center p-4">
        <div className="flex items-center gap-3 text-gray-600 dark:text-gray-300 font-medium">
          <FontAwesomeIcon icon={faSpinner} className="animate-spin text-teal-600 text-xl" />
          <span>Memeriksa aksesibilitas kegiatan...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-700/50 transition-colors duration-300 flex items-center justify-center py-8 px-4">
      <div className="w-full max-w-2xl">
        {/* Card Container */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-8 sm:p-12">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-3">
              Pilih Jenis Peserta
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base">
              Silakan pilih kategori yang sesuai dengan status Anda
            </p>
          </div>

          {/* Options Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            {/* ASN Option */}
            <button
              onClick={handleASNClick}
              className="group relative overflow-hidden bg-gradient-to-br from-teal-50 to-teal-100 dark:from-teal-900/30 dark:to-teal-800/30 hover:from-teal-100 hover:to-teal-200 dark:hover:from-teal-800/40 dark:hover:to-teal-700/40 border-2 border-teal-300 dark:border-teal-600 rounded-xl p-6 transition-all duration-300 transform hover:scale-105 hover:shadow-xl"
            >
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 bg-teal-500 dark:bg-teal-600 rounded-full flex items-center justify-center text-white group-hover:scale-110 transition-transform">
                  <FontAwesomeIcon icon={faUserTie} className="text-2xl" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                    ASN Setjen DPD RI
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Pegawai yang memiliki akun untuk login SSO Setjen DPD RI
                  </p>
                </div>
                <div className="absolute top-0 right-4 w-6 h-6 bg-teal-500 dark:bg-teal-600 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </button>

            {/* Public/General Option */}
            <button
              onClick={handlePublicClick}
              className="group relative overflow-hidden bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 hover:from-purple-100 hover:to-purple-200 dark:hover:from-purple-800/40 dark:hover:to-purple-700/40 border-2 border-purple-300 dark:border-purple-600 rounded-xl p-6 transition-all duration-300 transform hover:scale-105 hover:shadow-xl"
            >
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 bg-purple-500 dark:bg-purple-600 rounded-full flex items-center justify-center text-white group-hover:scale-110 transition-transform">
                  <FontAwesomeIcon icon={faUsers} className="text-2xl" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                    Umum
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Pegawai tanpa akun SSO Setjen DPD RI atau peserta umum
                  </p>
                </div>
                <div className="absolute top-0 right-4 w-6 h-6 bg-purple-500 dark:bg-purple-600 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </button>
          </div>

          {/* Info Footer */}
          <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-blue-500 dark:text-blue-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <p className="text-sm text-blue-800 dark:text-blue-300">
                <strong>Catatan:</strong> Pilihan ASN akan mengharuskan Anda untuk login menggunakan akun SSO Setjen DPD RI. Jika Anda tidak memiliki akun SSO, pilih opsi Umum.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FormSelectionPage;
