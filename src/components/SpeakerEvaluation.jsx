import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import {
  getKegiatanById,
  createKegiatanEvaluasiNarasumber,
  getKegiatanPegawai,
  getPegawai,
  verifyKegiatanToken,
  fetchUserProfileByIdentifier,
} from "../config/api";
import { Model } from "survey-core";
import { Survey } from "survey-react-ui";
import { parseNarasumberList, buildSpeakerOnlySurvey } from "../utils/kegiatan";
import "survey-core/survey-core.min.css";
import "survey-core/survey.i18n";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faFileAlt,
  faArrowLeft,
  faCalendarAlt,
  faClock,
  faSpinner,
  faUserTie,
} from "@fortawesome/free-solid-svg-icons";

import Header from "./Header";
import Footer from "./Footer";
import ProfileModal from "./ProfileModal";

let pegawaiCache = null;
let pegawaiPromise = null;

function SpeakerEvaluation() {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const [activity, setActivity] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [survey, setSurvey] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [canAccess, setCanAccess] = useState(false);
  const [accessMessage, setAccessMessage] = useState("");
  const [pegawaiMap, setPegawaiMap] = useState({});
  const [showProfileModal, setShowProfileModal] = useState(false);

  const ssoEnabled =
    (import.meta.env.VITE_SSO_ENABLED ?? "true") !== "false";

  // Load pegawai master for name lookup
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        let p;
        if (pegawaiCache) {
          p = pegawaiCache;
        } else {
          if (!pegawaiPromise) {
            pegawaiPromise = getPegawai()
              .then((d) => {
                pegawaiCache = d;
                pegawaiPromise = null;
                return d;
              })
              .catch((err) => {
                pegawaiPromise = null;
                throw err;
              });
          }
          p = await pegawaiPromise;
        }
        if (cancelled) return;
        if (Array.isArray(p)) {
          const map = {};
          p.forEach((x) => {
            const name = x.name || x.nama || x.fullname || x.username || x.email || x.nip || "";
            if (x.nip) map[String(x.nip).trim()] = name;
          });
          setPegawaiMap(map);
        }
      } catch (e) {
        console.error("Failed to load pegawai map:", e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const resolvePegawaiName = (raw) => {
    if (!raw) return "";
    const key = String(raw).trim();
    return pegawaiMap[key] || raw;
  };

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

  function getUserFromToken() {
    try {
      const token = localStorage.getItem("token");
      if (!token) return { nip: "-", name: "Pengguna" };
      const payload = parseJwtPayload(token) || {};
      return {
        nip: payload.nip || "-",
        name: payload.name || (payload.nip ? `NIP ${payload.nip}` : "Pengguna"),
      };
    } catch (e) {
      return { nip: "-", name: "Pengguna" };
    }
  }

  function formatPersonName(name) {
    try {
      if (!name) return "";
      const parts = name.split(",");
      const main = (parts[0] || "").trim();
      const suffix = parts.slice(1).join(",").trim();
      const words = main
        .split(/\s+/)
        .filter(Boolean)
        .map((w) => {
          const lower = w.toLowerCase();
          if (lower.length <= 2) return lower.toUpperCase();
          return lower.charAt(0).toUpperCase() + lower.slice(1);
        });
      const formattedMain = words.join(" ");
      return suffix ? `${formattedMain}, ${suffix}` : formattedMain;
    } catch (e) {
      return name;
    }
  }

  const userName = (() => {
    const p = userProfile || {};
    const role = (p.role || "").toString().toLowerCase();

    if (role === "admin" || role === "super admin" || role === "superadmin") {
      return p.name || p.full_name || p.nama || "Pengguna";
    }

    const rawName =
      p.nama || p.name || p.nama_lengkap || p.full_name || p.namaLengkap || "";
    const gelarDepan = p.gelarDepan || p.gelar_depan || "";
    const gelarBelakang = p.gelarBelakang || p.gelar_belakang || "";

    if (rawName) {
      const nama = formatPersonName(rawName || "");
      const front = gelarDepan ? `${gelarDepan} ` : "";
      const back = gelarBelakang ? `, ${gelarBelakang}` : "";
      return `${front}${nama}${back}`.trim();
    }

    const tokenUser = getUserFromToken();
    if (tokenUser.nip && pegawaiMap[tokenUser.nip]) {
      return formatPersonName(pegawaiMap[tokenUser.nip]);
    }
    return formatPersonName(tokenUser.name || "Pengguna");
  })();

  const userNip = (() => {
    const p = userProfile || {};
    const role = (p.role || "").toString().toLowerCase();

    if (role === "admin" || role === "super admin" || role === "superadmin") {
      return (
        p.email ||
        p.emailGov ||
        p.email_address ||
        getUserFromToken().nip ||
        "-"
      );
    }

    return (
      p.nip ||
      p.nipBaru ||
      p.nip_baru ||
      p.nipbaru ||
      getUserFromToken().nip ||
      "-"
    );
  })();

  const showNip = (() => {
    const p = userProfile || {};
    const role = (p.role || "").toString().toLowerCase();
    return (
      role !== "admin" &&
      role !== "super admin" &&
      role !== "superadmin"
    );
  })();

  async function logout() {
    let confirmed = false;
    if (typeof window.Swal !== "undefined") {
      const res = await window.Swal.fire({
        title: "Konfirmasi Logout",
        text: "Apakah Anda yakin ingin logout?",
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "Logout",
        cancelButtonText: "Batal",
        confirmButtonColor: "#3085d6",
        cancelButtonColor: "#aaa",
        reverseButtons: true,
      });
      confirmed = !!res.isConfirmed;
    } else {
      confirmed = confirm("Apakah Anda yakin ingin logout?");
    }

    if (!confirmed) return;

    localStorage.removeItem("auth");
    localStorage.removeItem("token");
    localStorage.removeItem("userProfile");
    localStorage.removeItem("keycloak_access_token");
    localStorage.removeItem("keycloak_id_token");
    localStorage.removeItem("keycloak_refresh_token");

    if (ssoEnabled) {
      const { logout: keycloakLogout } = await import("../config/keycloak");
      keycloakLogout();
    } else {
      navigate("/login");
    }
  }

  async function loadUserProfile() {
    try {
      const token = localStorage.getItem("token");
      if (!token) return null;
      const payload = parseJwtPayload(token);
      const nip = payload.nip || "";

      let profile = null;
      if (nip) {
        try {
          profile = await fetchUserProfileByIdentifier(nip, {
            with_unit_parent: true,
          });
        } catch (e) {
          console.error("Gagal load profile dari API:", e);
        }
      }

      if (!profile) {
        const saved = localStorage.getItem("userProfile");
        if (saved) {
          try {
            profile = JSON.parse(saved);
          } catch (_) {}
        }
      }

      if (profile) setUserProfile(profile);
      return profile;
    } catch (e) {
      console.error("Error loadUserProfile:", e);
      return null;
    }
  }

  useEffect(() => {
    (async () => {
      const profile = await loadUserProfile();
      await fetchActivity(profile);
    })();
  }, [id]);

  function canFillPresence(tanggal, jamSelesai) {
    try {
      const now = new Date();
      const [year, month, day] = tanggal.split("-").map(Number);
      const [endHour, endMinute] = jamSelesai.split(":").map(Number);
      const endTime = new Date(
        Date.UTC(year, month - 1, day, endHour - 7, endMinute, 0),
      );
      const thirtyMinBefore = new Date(endTime.getTime() - 30 * 60 * 1000);
      const twoHoursAfter = new Date(endTime.getTime() + 120 * 60 * 1000);
      return now >= thirtyMinBefore && now <= twoHoursAfter;
    } catch (error) {
      return false;
    }
  }

  function formatDate(dateString) {
    try {
      return new Intl.DateTimeFormat("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(new Date(dateString));
    } catch (error) {
      return dateString;
    }
  }

  function formatTime(timeString) {
    try {
      return timeString.substring(0, 5);
    } catch (error) {
      return timeString;
    }
  }

  async function fetchActivity(profileOverride = null) {
    try {
      setIsLoading(true);
      const response = await getKegiatanById(id);
      if (response && response.data) {
        const activityData = response.data;
        setActivity(activityData);

        const searchParams = new URLSearchParams(location.search);
        const evaluationToken = searchParams.get("token");

        let tokenError = null;
        if (evaluationToken) {
          try {
            const verifyRes = await verifyKegiatanToken(evaluationToken);
            if (!verifyRes || !verifyRes.success || verifyRes.data?.is_used) {
              tokenError = "Link evaluasi khusus ini sudah pernah digunakan atau tidak valid.";
            }
          } catch (e) {
            tokenError = e.message || "Link evaluasi khusus tidak valid.";
          }
        }

        const canAccessNow = evaluationToken
          ? !tokenError
          : canFillPresence(activityData.tanggal, activityData.jam_selesai);
        setCanAccess(canAccessNow);

        if (tokenError) {
          setAccessMessage(tokenError);
        } else if (!canAccessNow) {
          setAccessMessage(
            "Survei evaluasi narasumber hanya dapat diisi 30 menit sebelum selesai hingga 2 jam setelah kegiatan selesai"
          );
        } else {
          let currentPegawaiMap = {};
          const parsedSpeakers = parseNarasumberList(activityData);
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
            } catch (e) {
              console.error("Gagal memuat nama pegawai narasumber:", e);
            }
          }

          const resolveFn = (raw) => {
            if (!raw) return "";
            const key = String(raw).trim();
            return currentPegawaiMap[key] || pegawaiMap[key] || raw;
          };

          const surveyJson = buildSpeakerOnlySurvey(activityData, resolveFn);
          const surveyModel = new Model(surveyJson);
          surveyModel.showProgressBar = "top";
          surveyModel.progressBarType = "pages";
          surveyModel.locale = "id";

          const profileForInit = profileOverride || userProfile || null;

          const initialNamaLengkap = (() => {
            const p = profileForInit || {};
            const role = (p.role || "").toString().toLowerCase();
            if (
              role === "admin" ||
              role === "super admin" ||
              role === "superadmin"
            ) {
              return p.name || p.full_name || p.nama || "Pengguna";
            }
            const rawName =
              p.nama || p.name || p.nama_lengkap || p.full_name || p.namaLengkap || "";
            const gelarDepan = p.gelarDepan || p.gelar_depan || "";
            const gelarBelakang = p.gelarBelakang || p.gelar_belakang || "";
            if (rawName) {
              const nama = formatPersonName(rawName || "");
              const front = gelarDepan ? `${gelarDepan} ` : "";
              const back = gelarBelakang ? `, ${gelarBelakang}` : "";
              return `${front}${nama}${back}`.trim();
            }
            const tokenUser = getUserFromToken();
            if (tokenUser.nip && pegawaiMap[tokenUser.nip]) {
              return formatPersonName(pegawaiMap[tokenUser.nip]);
            }
            return formatPersonName(tokenUser.name || "Pengguna");
          })();

          const initialNip = (() => {
            const p = profileForInit || {};
            const role = (p.role || "").toString().toLowerCase();
            if (
              role === "admin" ||
              role === "super admin" ||
              role === "superadmin"
            ) {
              return p.email || getUserFromToken().nip || "-";
            }
            return p.nip || getUserFromToken().nip || "-";
          })();

          surveyModel.data = {
            ...surveyModel.data,
            nama_lengkap: initialNamaLengkap,
            nip_no_absen: initialNip !== "-" ? initialNip : "",
            jabatan:
              profileForInit?.json?.jabatanNama ||
              profileForInit?.nama_jabatan ||
              "",
            unit_kerja:
              profileForInit?.unit_organisasi_parent ||
              profileForInit?.json?.unorNama ||
              "",
            status_pegawai:
              profileForInit?.json?.statusPegawai ||
              profileForInit?.status_pegawai ||
              "",
          };

          surveyModel.onComplete.add(handleSurveyComplete);
          setSurvey(surveyModel);
        }
      }
    } catch (error) {
      console.error("Gagal memuat kegiatan:", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSurveyComplete(sender) {
    try {
      setIsSubmitting(true);
      const results = sender.data || {};
      const tokenUser = getUserFromToken();
      const currentNip = (userNip && userNip !== "-") ? userNip : (tokenUser.nip !== "-" ? tokenUser.nip : "");

      const searchParams = new URLSearchParams(location.search);
      const evaluationToken = searchParams.get("token");

      results.kategori_responden = "internal";

      // Pastikan nama_lengkap tidak bernilai kosong, NIP angka, atau "NIP XXXXX"
      const curName = String(results.nama_lengkap || "").trim();
      if (
        !curName ||
        curName.startsWith("NIP ") ||
        curName === currentNip ||
        /^\d{18}$/.test(curName)
      ) {
        results.nama_lengkap = userName;
      }

      if (!results.nip_no_absen && currentNip) {
        results.nip_no_absen = currentNip;
      }
      if (!results.jabatan) {
        results.jabatan = userProfile?.json?.jabatanNama || userProfile?.nama_jabatan || "";
      }
      if (!results.unit_kerja) {
        results.unit_kerja =
          userProfile?.unit_organisasi_parent ||
          userProfile?.json?.unorNama ||
          userProfile?.unit?.nama ||
          "";
      }
      if (!results.status_pegawai) {
        results.status_pegawai =
          userProfile?.json?.statusPegawai || userProfile?.status_pegawai || "";
      }

      const response = await createKegiatanEvaluasiNarasumber({
        kegiatan_id: id,
        nip: currentNip || results.nip_no_absen || null,
        kategori_responden: "internal",
        isi_form: results,
        ...(evaluationToken ? { token: evaluationToken } : {}),
      });

      if (response) {
        if (typeof window.Swal !== "undefined") {
          await window.Swal.fire({
            icon: "success",
            title: "Berhasil",
            text: "Form evaluasi narasumber berhasil disimpan",
            confirmButtonColor: "#3085d6",
          });
        }
        navigate("/attended-activities");
      }
    } catch (error) {
      console.error("Gagal menyimpan evaluasi narasumber:", error);
      const errorMessage = error?.message || "Gagal menyimpan evaluasi narasumber";
      if (typeof window.Swal !== "undefined") {
        window.Swal.fire({
          icon: "error",
          title: "Gagal",
          text: errorMessage,
          confirmButtonColor: "#3085d6",
        });
      } else {
        alert(errorMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-gray-900">
        <Header
          userName={userName}
          userNip={userNip}
          showNip={showNip}
          onProfileClick={() => setShowProfileModal(true)}
          onLogout={logout}
        />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="flex flex-col items-center gap-3">
            <FontAwesomeIcon icon={faSpinner} className="animate-spin text-purple-600 text-3xl" />
            <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">
              Memuat Form Evaluasi Narasumber...
            </span>
          </div>
        </div>
        <Footer />
        {showProfileModal && (
          <ProfileModal
            profile={userProfile}
            onClose={() => setShowProfileModal(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-900 flex flex-col justify-between">
      <Header
        userName={userName}
        userNip={userNip}
        showNip={showNip}
        onProfileClick={() => setShowProfileModal(true)}
        onLogout={logout}
      />

      <div className="container mx-auto px-4 py-8 max-w-4xl flex-1">
        <button
          onClick={() => navigate("/activities")}
          className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 transition cursor-pointer"
        >
          <FontAwesomeIcon icon={faArrowLeft} />
          Kembali ke Daftar Kegiatan
        </button>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6 mb-6 border-l-4 border-purple-600">
          <div className="flex items-center gap-3 text-purple-600 dark:text-purple-400 text-sm font-bold uppercase tracking-wider mb-2">
            <FontAwesomeIcon icon={faUserTie} />
            Form Evaluasi Narasumber
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {activity?.nama_kegiatan}
          </h1>
          <div className="flex flex-wrap gap-4 text-xs text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-1.5">
              <FontAwesomeIcon icon={faCalendarAlt} className="text-gray-400" />
              <span>{formatDate(activity?.tanggal)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <FontAwesomeIcon icon={faClock} className="text-gray-400" />
              <span>
                {formatTime(activity?.jam_mulai)} - {formatTime(activity?.jam_selesai)} WIB
              </span>
            </div>
          </div>
        </div>

        {!canAccess ? (
          <div className="bg-amber-50 border border-amber-200 dark:bg-amber-900/20 dark:border-amber-800 rounded-2xl p-8 text-center text-amber-800 dark:text-amber-300 space-y-2">
            <p className="font-bold text-lg">Akses Belum Dibuka</p>
            <p className="text-sm">{accessMessage}</p>
          </div>
        ) : survey ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6 relative">
            {isSubmitting && (
              <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/80 dark:bg-gray-900/60 rounded-2xl">
                <div className="flex flex-col items-center gap-3">
                  <FontAwesomeIcon icon={faSpinner} className="animate-spin text-purple-600 text-3xl" />
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                    Menyimpan evaluasi narasumber...
                  </p>
                </div>
              </div>
            )}
            <Survey model={survey} />
          </div>
        ) : null}
      </div>

      <Footer />
      {showProfileModal && (
        <ProfileModal
          profile={userProfile}
          onClose={() => setShowProfileModal(false)}
        />
      )}
    </div>
  );
}

export default SpeakerEvaluation;
