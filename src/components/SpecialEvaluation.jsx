import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Model } from "survey-core";
import { Survey } from "survey-react-ui";
import "survey-core/survey-core.min.css";
import "survey-core/survey.i18n";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCalendarAlt,
  faClock,
  faSpinner,
  faCheckCircle,
  faExclamationCircle,
  faLock,
  faFileAlt,
  faUsers,
  faUserTie,
  faArrowLeft,
} from "@fortawesome/free-solid-svg-icons";
import Header from "./Header";
import Footer from "./Footer";
import {
  verifyKegiatanToken,
  createKegiatanPegawai,
  createKegiatanEvaluasiNarasumber,
  getPegawai,
  fetchUserProfileByIdentifier,
} from "../config/api";
import { parseNarasumberList, buildSpeakerOnlySurvey } from "../utils/kegiatan";

export default function SpecialEvaluation() {
  const { token } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isUsed, setIsUsed] = useState(false);
  const [usedAt, setUsedAt] = useState(null);
  const [tokenData, setTokenData] = useState(null);
  const [activity, setActivity] = useState(null);
  const [survey, setSurvey] = useState(null);
  const [isSuccess, setIsSuccess] = useState(false);

  // Participant Type: null (show selection page like FormSelectionPage) | "internal" | "umum"
  const [selectedMode, setSelectedMode] = useState(null);
  const [userProfile, setUserProfile] = useState(null);

  const hasLoadedRef = useRef(false);

  // Check URL query param initially (e.g. ?type=internal or ?type=umum)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const typeParam = params.get("type");
    if (typeParam === "internal" || typeParam === "umum") {
      setSelectedMode(typeParam);
    }
  }, [location.search]);

  useEffect(() => {
    if (!token) return;
    if (hasLoadedRef.current === token) return;
    hasLoadedRef.current = token;

    loadAndVerifyToken();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Re-build survey whenever selectedMode changes (once token & activity are loaded)
  useEffect(() => {
    if (activity && tokenData && selectedMode) {
      setupSurvey(tokenData, activity, selectedMode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMode, activity, tokenData]);

  const loadAndVerifyToken = async () => {
    try {
      setLoading(true);
      setErrorMsg("");
      setIsUsed(false);

      const res = await verifyKegiatanToken(token);
      if (res && res.success) {
        setTokenData(res.data);
        const act = res.kegiatan;
        setActivity(act);

        // Preload user profile if logged in
        const { isSso, ssoNip } = detectSso();
        if (isSso && ssoNip) {
          try {
            const profile = await fetchUserProfileByIdentifier(ssoNip, {
              with_unit_parent: true,
            });
            if (profile) setUserProfile(profile);
          } catch (e) {}
        }
      }
    } catch (err) {
      console.error("Token verification failed:", err);
      if (err.status === 410 || err.data?.is_used) {
        setIsUsed(true);
        setUsedAt(err.data?.used_at || null);
        setErrorMsg(
          err.message ||
            "Link evaluasi khusus ini sudah pernah digunakan dan sudah tidak dapat dipakai lagi."
        );
      } else {
        setErrorMsg(err.message || "Link evaluasi tidak valid atau telah dihapus.");
      }
    } finally {
      setLoading(false);
    }
  };

  const detectSso = () => {
    const ssoToken = localStorage.getItem("token");
    let isSso = false;
    let ssoNip = "";
    let ssoName = "";
    if (ssoToken) {
      try {
        const parts = ssoToken.split(".");
        if (parts.length >= 2) {
          const payloadB64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
          const pad = payloadB64.length % 4 === 0 ? 0 : 4 - (payloadB64.length % 4);
          const pData = JSON.parse(atob(payloadB64 + "=".repeat(pad)) || "{}");
          if (!pData.exp || Date.now() < pData.exp * 1000) {
            isSso = true;
            ssoNip = pData.nip || "";
            ssoName = pData.name || pData.preferred_username || "";
          }
        }
      } catch (e) {}
    }
    return { isSso, ssoNip, ssoName };
  };

  const handleASNClick = () => {
    const { isSso } = detectSso();
    if (isSso) {
      // User is already logged in with SSO
      setSelectedMode("internal");
    } else {
      // User is not logged in -> redirect to login SSO and return to this token url with ?type=internal
      const redirectUrl = `/evaluasi-khusus/${token}?type=internal`;
      sessionStorage.setItem("redirect_after_login", redirectUrl);
      localStorage.setItem("redirect_after_login", redirectUrl);
      navigate("/login");
    }
  };

  const handlePublicClick = () => {
    setSelectedMode("umum");
  };

  const setupSurvey = async (tRecord, actData, mode) => {
    const jenis = tRecord.jenis; // "kegiatan" | "narasumber"
    const { ssoNip, ssoName } = detectSso();

    if (jenis === "kegiatan") {
      const surveyJson =
        typeof actData.form_evaluasi === "string"
          ? JSON.parse(actData.form_evaluasi)
          : actData.form_evaluasi || { pages: [] };

      const surveyModel = new Model(surveyJson);
      surveyModel.showProgressBar = "top";
      surveyModel.progressBarType = "pages";
      surveyModel.locale = "id";

      // If mode === "umum", ensure `nip_no_absen` is editable
      try {
        const q =
          typeof surveyModel.getQuestionByName === "function"
            ? surveyModel.getQuestionByName("nip_no_absen")
            : null;
        if (q) {
          q.readOnly = mode === "internal";
          q.title = mode === "internal" ? "NIP / Nomor Absen" : "NIP / No. Absen / No. Identitas Lain";
          if (typeof q.setReadOnly === "function") q.setReadOnly(mode === "internal");
        } else if (typeof surveyModel.getAllQuestions === "function") {
          surveyModel.getAllQuestions().forEach((qq) => {
            if (qq && qq.name === "nip_no_absen") {
              qq.readOnly = mode === "internal";
              qq.title = mode === "internal" ? "NIP / Nomor Absen" : "NIP / No. Absen / No. Identitas Lain";
              if (typeof qq.setReadOnly === "function") qq.setReadOnly(mode === "internal");
            }
          });
        }
      } catch (e) {}

      // Pre-fill fields if mode is internal and user profile is available
      if (mode === "internal") {
        const p = userProfile || {};
        const namaLengkap =
          p.nama_lengkap ||
          p.nama ||
          p.name ||
          ssoName ||
          "";
        const nipVal = p.nip || ssoNip || "";
        const jabatanVal =
          p.nama_jabatan ||
          p.jabatan?.nama ||
          (typeof p.jabatan === "string" ? p.jabatan : "") ||
          "";
        const unitKerjaVal =
          p.unit?.parent?.nama ||
          p.unit?.nama ||
          p.nama_unit_organisasi ||
          p.unit_kerja ||
          "";
        const statusPegawaiVal = p.status_pegawai || p.jenis_pegawai || "PNS";

        surveyModel.data = {
          ...surveyModel.data,
          nama_lengkap: namaLengkap,
          nip_no_absen: nipVal,
          jabatan: jabatanVal,
          unit_kerja: unitKerjaVal,
          status_pegawai: statusPegawaiVal,
        };
      }

      surveyModel.onComplete.add((sender) => handleActivitySurveyComplete(sender, mode));
      setSurvey(surveyModel);
    } else {
      // Evaluasi Narasumber
      let currentPegawaiMap = {};
      const parsedSpeakers = parseNarasumberList(actData);
      const internalNips = parsedSpeakers
        .filter(
          (s) =>
            (s.asal_narasumber || "Internal").toLowerCase() === "internal" &&
            s.narasumber
        )
        .map((s) => String(s.narasumber).trim());

      if (internalNips.length > 0) {
        try {
          const pData = await getPegawai({ nip: internalNips.join(",") });
          if (Array.isArray(pData)) {
            pData.forEach((x) => {
              const name =
                x.name || x.nama || x.fullname || x.username || x.email || x.nip || "";
              if (x.nip) currentPegawaiMap[String(x.nip).trim()] = name;
            });
          }
        } catch (e) {}
      }

      const resolveFn = (raw) => {
        if (!raw) return "";
        const key = String(raw).trim();
        return currentPegawaiMap[key] || raw;
      };

      const surveyJson = buildSpeakerOnlySurvey(actData, resolveFn);
      const surveyModel = new Model(surveyJson);
      surveyModel.showProgressBar = "top";
      surveyModel.progressBarType = "pages";
      surveyModel.locale = "id";
      surveyModel.onComplete.add((sender) => handleSpeakerSurveyComplete(sender, mode));
      setSurvey(surveyModel);
    }
  };

  const handleActivitySurveyComplete = async (sender, mode) => {
    setIsSubmitting(true);
    try {
      const formData = sender.data || {};
      const { ssoNip, ssoName } = detectSso();
      const namaLengkap = formData.nama_lengkap || (mode === "internal" ? ssoName : "");
      const nip = formData.nip_no_absen || (mode === "internal" ? ssoNip : "");

      if (!namaLengkap) {
        if (typeof window.Swal !== "undefined") {
          window.Swal.fire({
            icon: "warning",
            title: "Data Tidak Lengkap",
            text: "Nama lengkap harus diisi",
            confirmButtonColor: "#14b8a6",
          });
        }
        setIsSubmitting(false);
        return;
      }

      const kategori = mode === "internal" ? "internal" : "umum";
      formData.kategori_responden = kategori;

      const payload = {
        kegiatan_id: activity.id,
        nip: nip || (mode === "internal" ? ssoNip : "-"),
        kategori_responden: kategori,
        token: token, // One-time token
        isi_form: formData,
      };

      await createKegiatanPegawai(payload);
      setIsSuccess(true);
    } catch (err) {
      console.error("Gagal mengirim evaluasi kegiatan:", err);
      const errMsg = err.message || "Gagal menyimpan survei.";
      if (typeof window.Swal !== "undefined") {
        window.Swal.fire({
          icon: "error",
          title: "Gagal",
          text: errMsg,
          confirmButtonColor: "#ef4444",
        });
      } else {
        alert(errMsg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSpeakerSurveyComplete = async (sender, mode) => {
    setIsSubmitting(true);
    try {
      const results = sender.data || {};
      const { ssoNip, ssoName } = detectSso();
      const kategori = mode === "internal" ? "internal" : "umum";
      results.kategori_responden = kategori;

      if (mode === "internal") {
        if (ssoName && !results.nama_lengkap) results.nama_lengkap = ssoName;
        if (ssoNip && !results.nip_no_absen) results.nip_no_absen = ssoNip;
      }

      const payload = {
        kegiatan_id: activity.id,
        nip: (mode === "internal" ? ssoNip : null) || results.nip_no_absen || results.nip || null,
        kategori_responden: kategori,
        token: token, // One-time token
        isi_form: results,
      };

      await createKegiatanEvaluasiNarasumber(payload);
      setIsSuccess(true);
    } catch (err) {
      console.error("Gagal mengirim evaluasi narasumber:", err);
      const errMsg = err.message || "Gagal menyimpan evaluasi narasumber.";
      if (typeof window.Swal !== "undefined") {
        window.Swal.fire({
          icon: "error",
          title: "Gagal",
          text: errMsg,
          confirmButtonColor: "#ef4444",
        });
      } else {
        alert(errMsg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    try {
      return new Intl.DateTimeFormat("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(new Date(dateString));
    } catch {
      return dateString;
    }
  };

  const formatTime = (timeString) => {
    if (!timeString) return "-";
    return String(timeString).substring(0, 5);
  };

  const formatDateTime = (dt) => {
    if (!dt) return "-";
    try {
      return new Date(dt).toLocaleString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dt;
    }
  };

  // 1. Loading State
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-gray-900">
        <Header showProfile={false} showLogout={false} />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="flex flex-col items-center gap-3">
            <FontAwesomeIcon icon={faSpinner} spin className="text-4xl text-teal-600" />
            <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
              Memverifikasi link evaluasi khusus...
            </p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // 2. Token Already Used State
  if (isUsed) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-gray-900">
        <Header showProfile={false} showLogout={false} />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center space-y-4 border border-gray-100 dark:border-gray-700 animate-fadeIn">
            <div className="w-16 h-16 mx-auto rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600">
              <FontAwesomeIcon icon={faLock} className="text-2xl" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              Link Evaluasi Sudah Tidak Aktif
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              Link evaluasi satu kali pakai ini telah digunakan
              {usedAt ? ` pada ${formatDateTime(usedAt)}` : ""} dan sudah tidak dapat digunakan kembali.
            </p>
            <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl text-xs text-gray-500">
              Jika Anda belum mengisi atau membutuhkan akses evaluasi, silakan hubungi admin atau panitia kegiatan untuk mendapatkan link baru.
            </div>
            <button
              onClick={() => navigate("/")}
              className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold bg-teal-600 hover:bg-teal-700 text-white transition-colors cursor-pointer"
            >
              Kembali ke Beranda
            </button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // 3. Invalid Token Error
  if (errorMsg && !isUsed) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-gray-900">
        <Header showProfile={false} showLogout={false} />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center space-y-4 border border-gray-100 dark:border-gray-700 animate-fadeIn">
            <div className="w-16 h-16 mx-auto rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600">
              <FontAwesomeIcon icon={faExclamationCircle} className="text-3xl" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              Link Tidak Valid
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {errorMsg}
            </p>
            <button
              onClick={() => navigate("/")}
              className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold bg-gray-600 hover:bg-gray-700 text-white transition-colors cursor-pointer"
            >
              Kembali ke Beranda
            </button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // 4. Success State after Submission
  if (isSuccess) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-gray-900">
        <Header showProfile={false} showLogout={false} />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center space-y-4 border border-gray-100 dark:border-gray-700 animate-fadeIn">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600">
              <FontAwesomeIcon icon={faCheckCircle} className="text-3xl" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              Evaluasi Berhasil Dikirim!
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              Terima kasih atas partisipasi Anda dalam evaluasi kegiatan{" "}
              <strong>{activity?.nama_kegiatan}</strong>.
            </p>
            <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl text-xs text-emerald-800 dark:text-emerald-300">
              Link evaluasi satu kali pakai ini sekarang telah kedaluwarsa dan tidak dapat digunakan lagi.
            </div>
            {tokenData?.jenis === "kegiatan" && activity?.butuh_sertifikat && (
              <button
                onClick={() => navigate(`/sertifikat/${activity.id}`)}
                className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold bg-teal-600 hover:bg-teal-700 text-white transition-colors cursor-pointer"
              >
                Lihat / Unduh Sertifikat
              </button>
            )}
            <button
              onClick={() => navigate("/")}
              className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300 transition-colors cursor-pointer"
            >
              Selesai
            </button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // 5. STEP 1: Mode Selection (Mirip FormSelectionPage.jsx)
  if (!selectedMode) {
    const isKegiatan = tokenData?.jenis === "kegiatan";
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-gray-900 transition-colors duration-300 flex flex-col">
        <Header showProfile={false} showLogout={false} />

        <main className="flex-1 flex items-center justify-center py-8 px-4">
          <div className="w-full max-w-2xl">
            {/* Activity Info Banner */}
            {activity && (
              <div className="text-center mb-6">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold mb-3 ${
                  isKegiatan
                    ? "bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300"
                    : "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300"
                }`}>
                  <FontAwesomeIcon icon={isKegiatan ? faFileAlt : faUsers} />
                  {isKegiatan ? "Evaluasi Kegiatan" : "Evaluasi Narasumber"} (Link Khusus Sekali Pakai)
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

            {/* Selection Card Container */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-8 sm:p-12">
              <div className="text-center mb-8">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">
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

                {/* Public / General Option */}
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

              {/* Info Footer Note */}
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
        </main>

        <Footer />
      </div>
    );
  }

  // 6. STEP 2: Active Evaluation Form after Selection
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-gray-900">
      <Header showProfile={false} showLogout={false} />

      <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
        {/* Navigation back to mode selection */}
        <div className="mb-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setSelectedMode(null)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-teal-600 transition-colors cursor-pointer"
          >
            <FontAwesomeIcon icon={faArrowLeft} />
            <span>Ganti Jenis Peserta (Saat ini: {selectedMode === "internal" ? "ASN Setjen DPD RI" : "Umum"})</span>
          </button>
          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
            selectedMode === "internal"
              ? "bg-teal-100 text-teal-800"
              : "bg-purple-100 text-purple-800"
          }`}>
            <FontAwesomeIcon icon={selectedMode === "internal" ? faUserTie : faUsers} className="text-[10px]" />
            {selectedMode === "internal" ? "ASN Setjen DPD RI" : "Peserta Umum"}
          </span>
        </div>

        {/* Kegiatan Info Banner */}
        {activity && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                tokenData?.jenis === "kegiatan"
                  ? "bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300"
                  : "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300"
              }`}>
                <FontAwesomeIcon icon={tokenData?.jenis === "kegiatan" ? faFileAlt : faUsers} />
                {tokenData?.jenis === "kegiatan" ? "Evaluasi Kegiatan" : "Evaluasi Narasumber"}
              </span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                1x Pengisian
              </span>
            </div>

            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">
              {activity.nama_kegiatan}
            </h1>
            {activity.judul_tema && (
              <p className="text-sm italic text-gray-600 dark:text-gray-400 mb-4">
                "{activity.judul_tema}"
              </p>
            )}

            <div className="flex flex-wrap gap-4 text-xs text-gray-600 dark:text-gray-400 pt-3 border-t border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-1.5">
                <FontAwesomeIcon icon={faCalendarAlt} className="text-teal-600" />
                <span>{formatDate(activity.tanggal)}</span>
              </div>
              {(activity.jam_mulai || activity.jam_selesai) && (
                <div className="flex items-center gap-1.5">
                  <FontAwesomeIcon icon={faClock} className="text-teal-600" />
                  <span>
                    {formatTime(activity.jam_mulai)} - {formatTime(activity.jam_selesai)} WIB
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Survey Form */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          {survey ? (
            <div className="survey-container">
              <Survey model={survey} />
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400">
              <FontAwesomeIcon icon={faSpinner} spin className="text-3xl text-teal-600 mb-2" />
              <p>Menyiapkan formulir evaluasi...</p>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
