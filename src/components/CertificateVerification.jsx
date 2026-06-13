import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCheckCircle,
  faTimesCircle,
  faSpinner,
  faFileAlt,
  faCalendar,
  faUser,
  faIdCard,
  faArrowLeft,
  faDownload,
  faExclamationTriangle,
} from "@fortawesome/free-solid-svg-icons";
import { verifyCertificate } from "../config/api";
import Header from "./Header";
import Footer from "./Footer";

const CertificateVerification = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [verificationData, setVerificationData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token) {
      setError("Token verifikasi tidak ditemukan");
      setLoading(false);
      return;
    }

    const fetchVerification = async () => {
      try {
        setLoading(true);
        const result = await verifyCertificate(token);
        setVerificationData(result);
        setError(null);
      } catch (err) {
        console.error("Verification error:", err);
        setError(err.message || "Gagal memverifikasi sertifikat");
        setVerificationData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchVerification();
  }, [token]);

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(date);
    } catch (e) {
      return dateString;
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return "-";
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }).format(date);
    } catch (e) {
      return dateString;
    }
  };

  const getCertificateUrl = (itemId) => {
    if (!itemId) return null;
    const url = String(itemId);
    if (/^(https?:)?\/\//.test(url)) {
      return url;
    }
    const BE_URL = import.meta.env.VITE_BE_URL || "http://localhost:8000";
    return `${BE_URL}/api/sertifikat/download/${encodeURIComponent(url)}`;
  };

  const handleDownload = () => {
    if (verificationData?.valid && verificationData?.data?.link_sertifikat) {
      const url = getCertificateUrl(verificationData.data.id);
      if (url) {
        window.location.href = url;
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-teal-50 via-white to-cyan-50">
        <Header showProfile={false} showLogout={false} />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center">
            <FontAwesomeIcon
              icon={faSpinner}
              spin
              className="text-6xl text-teal-500 mb-4"
            />
            <p className="text-xl text-gray-700 font-medium">
              Memverifikasi sertifikat...
            </p>
            <p className="text-sm text-gray-500 mt-2">Mohon tunggu sebentar</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const isValid = verificationData?.valid === true;
  const data = verificationData?.data;
  const message = verificationData?.message;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-gray-700/50">
      <Header showProfile={false} showLogout={false} />
      <div className="flex-1 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {/* Verification Status Card */}
          <div
            className={`rounded-2xl shadow-md overflow-hidden mb-8 ${
              isValid ? "bg-white dark:bg-gray-800" : "bg-white dark:bg-gray-800"
            }`}
          >
            <div
              className={`px-6 py-4 ${
                isValid
                  ? "bg-gradient-to-r from-teal-500 to-cyan-500"
                  : "bg-gradient-to-r from-red-500 to-rose-500"
              }`}
            >
              <div className="flex items-center justify-center gap-4 mb-4">
                <FontAwesomeIcon
                  icon={isValid ? faCheckCircle : faTimesCircle}
                  className="text-5xl sm:text-6xl text-white drop-shadow-lg"
                />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white text-center mb-2">
                {isValid ? "Sertifikat Valid" : "Sertifikat Tidak Valid"}
              </h2>
              <p className="text-white/90 text-center text-sm sm:text-base">
                {message ||
                  (isValid
                    ? "Sertifikat terverifikasi dan sah"
                    : "Sertifikat tidak dapat diverifikasi")}
              </p>
            </div>

            {/* Certificate Details */}
            {isValid && data && (
              <div className="p-4 sm:p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Personal Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-800 border-b-2 border-teal-500 pb-2 mb-4">
                      Informasi Peserta
                    </h3>

                    <div className="flex items-start gap-3">
                      <FontAwesomeIcon
                        icon={faUser}
                        className="text-teal-500 mt-1"
                      />
                      <div className="flex-1">
                        <p className="text-sm text-gray-500">Nama Lengkap</p>
                        <p className="font-semibold text-gray-800">
                          {data.nama_lengkap ||
                            data.isi_form?.nama_lengkap ||
                            "-"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <FontAwesomeIcon
                        icon={faIdCard}
                        className="text-teal-500 mt-1"
                      />
                      <div className="flex-1">
                        <p className="text-sm text-gray-500">
                          NIP/No. Absen/No. Identitas Lain
                        </p>
                        <p className="font-semibold text-gray-800">
                          {data.nip || "-"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <FontAwesomeIcon
                        icon={faFileAlt}
                        className="text-teal-500 mt-1"
                      />
                      <div className="flex-1">
                        <p className="text-sm text-gray-500">Jabatan</p>
                        <p className="font-semibold text-gray-800">
                          {data.jabatan || data.isi_form?.jabatan || "-"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <FontAwesomeIcon
                        icon={faFileAlt}
                        className="text-teal-500 mt-1"
                      />
                      <div className="flex-1">
                        <p className="text-sm text-gray-500">Unit Kerja</p>
                        <p className="font-semibold text-gray-800">
                          {data.unit_kerja || data.isi_form?.unit_kerja || "-"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <FontAwesomeIcon
                        icon={faFileAlt}
                        className="text-teal-500 mt-1"
                      />
                      <div className="flex-1">
                        <p className="text-sm text-gray-500">Status Pegawai</p>
                        <p className="font-semibold text-gray-800">
                          {data.status_pegawai ||
                            data.isi_form?.status_pegawai ||
                            "-"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Activity Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-800 border-b-2 border-teal-500 pb-2 mb-4">
                      Informasi Kegiatan
                    </h3>

                    <div className="flex items-start gap-3">
                      <FontAwesomeIcon
                        icon={faFileAlt}
                        className="text-teal-500 mt-1"
                      />
                      <div className="flex-1">
                        <p className="text-sm text-gray-500">Nama Kegiatan</p>
                        <p className="font-semibold text-gray-800">
                          {data.kegiatan?.nama_kegiatan || "-"}
                        </p>
                      </div>
                    </div>

                    {data.kegiatan?.judul_tema && (
                      <div className="flex items-start gap-3">
                        <FontAwesomeIcon
                          icon={faFileAlt}
                          className="text-teal-500 mt-1"
                        />
                        <div className="flex-1">
                          <p className="text-sm text-gray-500">Tema</p>
                          <p className="font-semibold text-gray-800">
                            {data.kegiatan.judul_tema}
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="flex items-start gap-3">
                      <FontAwesomeIcon
                        icon={faCalendar}
                        className="text-teal-500 mt-1"
                      />
                      <div className="flex-1">
                        <p className="text-sm text-gray-500">
                          Tanggal Kegiatan
                        </p>
                        <p className="font-semibold text-gray-800">
                          {formatDate(data.kegiatan?.tanggal)}
                        </p>
                      </div>
                    </div>

                    {data.kegiatan?.jenis_kegiatan && (
                      <div className="flex items-start gap-3">
                        <FontAwesomeIcon
                          icon={faFileAlt}
                          className="text-teal-500 mt-1"
                        />
                        <div className="flex-1">
                          <p className="text-sm text-gray-500">
                            Jenis Kegiatan
                          </p>
                          <p className="font-semibold text-gray-800">
                            {data.kegiatan.jenis_kegiatan}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Signed Date */}
                <div className="mt-4 text-center">
                  <p className="text-sm text-gray-500">
                    Ditandatangani secara elektronik pada tanggal
                    <span className="font-semibold text-gray-800">
                      {" "}
                      {formatDateTime(data.signed_at || data.created_at)}
                    </span>
                  </p>
                </div>

                {/* Download Button */}
                <div className="mt-8 flex justify-center">
                  <button
                    onClick={handleDownload}
                    className="inline-flex items-center gap-3 px-6 py-3 bg-teal-500 hover:bg-teal-600 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105"
                  >
                    <FontAwesomeIcon icon={faDownload} />
                    <span>Unduh Sertifikat</span>
                  </button>
                </div>
              </div>
            )}

            {/* Error Details */}
            {!isValid && verificationData && (
              <div className="p-4 sm:p-6">
                <div className="flex items-start gap-3 p-4 bg-red-50 rounded-lg border border-red-200">
                  <FontAwesomeIcon
                    icon={faExclamationTriangle}
                    className="text-red-500 mt-1"
                  />
                  <div className="flex-1">
                    <p className="font-semibold text-red-800 mb-1">
                      Detail Kesalahan
                    </p>
                    <p className="text-sm text-red-700">
                      {message ||
                        "Sertifikat tidak dapat diverifikasi. Pastikan link verifikasi yang Anda gunakan benar."}
                    </p>
                    {verificationData.reason && (
                      <p className="text-xs text-red-600 mt-2">
                        Kode: {verificationData.reason}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* PDF Preview */}
          {isValid && data?.link_sertifikat && (
            <div className="bg-white rounded-2xl shadow-md overflow-hidden">
              <div className="px-6 py-4 bg-gradient-to-r from-teal-500 to-cyan-500">
                <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                  <FontAwesomeIcon icon={faFileAlt} />
                  <span>Preview Sertifikat</span>
                </h3>
              </div>
              <div className="p-4 sm:p-6">
                <div
                  className="w-full bg-gray-100 rounded-lg overflow-hidden shadow-inner"
                  style={{ minHeight: "600px" }}
                >
                  <iframe
                    src={
                      import.meta.env.VITE_BE_URL +
                      "/storage/" +
                      data.link_sertifikat
                    }
                    className="w-full h-full"
                    style={{ minHeight: "600px", height: "80vh" }}
                    title="Certificate Preview"
                    frameBorder="0"
                  />
                </div>
                <p className="text-xs text-gray-500 text-center mt-4">
                  Jika preview tidak muncul, silakan klik tombol "Unduh
                  Sertifikat" di atas
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default CertificateVerification;
