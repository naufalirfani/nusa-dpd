import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUserTie,
  faUsers,
  faSpinner,
  faExclamationCircle,
  faFileAlt,
} from "@fortawesome/free-solid-svg-icons";
import { verifyKegiatanToken } from "../config/api";
import Header from "./Header";
import Footer from "./Footer";

export default function SpecialEvaluation() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [tokenData, setTokenData] = useState(null);
  const [activity, setActivity] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    let active = true;
    const checkToken = async () => {
      if (!token) {
        setLoading(false);
        setErrorMsg("Token tidak ditemukan.");
        return;
      }
      try {
        setLoading(true);
        setErrorMsg("");
        const res = await verifyKegiatanToken(token);
        if (!active) return;
        if (res && res.success) {
          setTokenData(res.data);
          setActivity(res.kegiatan);
        } else {
          setErrorMsg(res?.message || "Link evaluasi khusus tidak valid.");
        }
      } catch (err) {
        if (!active) return;
        console.error("Token verification failed:", err);
        if (err.status === 410 || err.data?.is_used) {
          setErrorMsg(
            err.message ||
              "Link evaluasi khusus ini sudah pernah digunakan dan sudah tidak dapat dipakai lagi."
          );
        } else {
          setErrorMsg(err.message || "Link evaluasi khusus tidak valid atau telah dihapus.");
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    checkToken();
    return () => {
      active = false;
    };
  }, [token]);

  const isSpeakerMode = tokenData?.jenis === "narasumber";
  const id = activity?.id;

  const handleASNClick = () => {
    navigate(
      isSpeakerMode
        ? `/speaker-evaluation/${id}?token=${token}`
        : `/activity-evaluation/${id}?token=${token}`
    );
  };

  const handlePublicClick = () => {
    navigate(
      isSpeakerMode
        ? `/public-speaker-evaluation/${id}?token=${token}`
        : `/public-activity-evaluation/${id}?token=${token}`
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-gray-700/50 flex items-center justify-center p-4">
        <div className="flex items-center gap-3 text-gray-600 dark:text-gray-300 font-medium">
          <FontAwesomeIcon icon={faSpinner} className="animate-spin text-teal-600 text-xl" />
          <span>Memeriksa tautan evaluasi...</span>
        </div>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-gray-900 flex flex-col">
        <Header showProfile={false} showLogout={false} />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center space-y-4 border border-gray-100 dark:border-gray-700">
            <div className="w-16 h-16 mx-auto rounded-full bg-rose-100 dark:rose-900/30 flex items-center justify-center text-rose-600">
              <FontAwesomeIcon icon={faExclamationCircle} className="text-3xl" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              Tautan Tidak Dapat Diakses
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              {errorMsg}
            </p>
            <button
              onClick={() => navigate("/")}
              className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300 transition-colors cursor-pointer"
            >
              Kembali ke Beranda
            </button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-700/50 transition-colors duration-300 flex items-center justify-center py-8 px-4">
      <div className="w-full max-w-2xl">
        {/* Activity Banner */}
        {activity && (
          <div className="text-center mb-6">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold mb-3 ${
                !isSpeakerMode
                  ? "bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300"
                  : "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300"
              }`}
            >
              <FontAwesomeIcon icon={!isSpeakerMode ? faFileAlt : faUsers} />
              {!isSpeakerMode ? "Evaluasi Kegiatan" : "Evaluasi Narasumber"} (Akses Khusus Sekali Pakai)
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
              {activity.nama_kegiatan}
            </h2>
            {activity.judul_tema && (
              <p className="text-sm italic text-gray-500 dark:text-gray-400 mt-1">
                "{activity.judul_tema}"
              </p>
            )}
          </div>
        )}

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
              className="group relative overflow-hidden bg-gradient-to-br from-teal-50 to-teal-100 dark:from-teal-900/30 dark:to-teal-800/30 hover:from-teal-100 hover:to-teal-200 dark:hover:from-teal-800/40 dark:hover:to-teal-700/40 border-2 border-teal-300 dark:border-teal-600 rounded-xl p-6 transition-all duration-300 transform hover:scale-105 hover:shadow-xl cursor-pointer"
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
              className="group relative overflow-hidden bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 hover:from-purple-100 hover:to-purple-200 dark:hover:from-purple-800/40 dark:hover:to-purple-700/40 border-2 border-purple-300 dark:border-purple-600 rounded-xl p-6 transition-all duration-300 transform hover:scale-105 hover:shadow-xl cursor-pointer"
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
                <strong>Catatan:</strong> Pilihan ASN akan mengharuskan Anda untuk login menggunakan akun SSO Setjen DPD RI. Jika Anda tidak memiliki akun SSO, pilih opsi Umum. Link evaluasi khusus ini hanya dapat digunakan satu kali.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
