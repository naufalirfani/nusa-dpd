import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import {
  getKegiatanById,
  createKegiatanPegawai,
  getKegiatanPegawai,
  getKegiatanPegawaiById,
} from "../config/api";
import { fetchUserProfileByIdentifier } from "../config/api";
import { Model } from "survey-core";
import { Survey } from "survey-react-ui";
import "survey-core/survey-core.min.css";
import "survey-core/survey.i18n";

// survey-core CSS imported above provides default styles
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faFileAlt,
  faArrowLeft,
  faCalendarAlt,
  faClock,
  faDownload,
  faSpinner,
} from "@fortawesome/free-solid-svg-icons";

import SurveyResultsModal from "./SurveyResultsModal";
import Header from "./Header";
import Footer from "./Footer";
import ProfileModal from "./ProfileModal";

function ActivityEvaluation() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [activity, setActivity] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [survey, setSurvey] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alreadyFilled, setAlreadyFilled] = useState(false);
  const [filledRecord, setFilledRecord] = useState(null);
  const [certLoading, setCertLoading] = useState({});
  const [surveyModalOpen, setSurveyModalOpen] = useState(false);
  const [surveyLoading, setSurveyLoading] = useState(false);
  const [surveyData, setSurveyData] = useState(null);
  const [canAccess, setCanAccess] = useState(false);
  const [accessMessage, setAccessMessage] = useState("");
  const [showProfileModal, setShowProfileModal] = useState(false);
  const location = useLocation();
  const passedAttendance = location?.state?.attendance || null;
  const hasFetchedRef = useRef(false);
  const lastIdRef = useRef(null);

  useEffect(() => {
    // Reset ref if id changes
    if (lastIdRef.current !== id) {
      hasFetchedRef.current = false;
      lastIdRef.current = id;
    }

    // Prevent double execution
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;

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
      console.error("Error checking presence time:", error);
      return false;
    }
  }

  function formatDate(dateString) {
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(date);
    } catch (error) {
      return dateString;
    }
  }

  function formatTime(timeString) {
    try {
      return timeString.substring(0, 5); // HH:MM
    } catch (error) {
      return timeString;
    }
  }

  async function loadUserProfile() {
    try {
      const token = localStorage.getItem("token");
      if (!token) return null;

      const parts = token.split(".");
      if (parts.length < 2) return null;

      const payloadB64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
      const pad = payloadB64.length % 4 === 0 ? 0 : 4 - (payloadB64.length % 4);
      const padded = payloadB64 + "=".repeat(pad);
      const json = atob(padded);
      const payload = JSON.parse(json || "{}");
      const nip = payload.nip || "";

      if (!nip) return null;

      const profile = await fetchUserProfileByIdentifier(nip, {
        with_unit_parent: true,
      });
      if (profile) setUserProfile(profile);
      return profile;
    } catch (e) {
      console.error("Failed to load profile from API", e);
      return null;
    }
  }

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
        name: payload.name || `NIP ${payload.nip || "-"}`,
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

  async function fetchActivity(profileOverride = null) {
    try {
      setIsLoading(true);
      const response = await getKegiatanById(id);

      if (response && response.data) {
        const activityData = response.data;
        setActivity(activityData);

        // Check if user can access the form based on time
        const canAccessNow = canFillPresence(
          activityData.tanggal,
          activityData.jam_selesai,
        );
        setCanAccess(canAccessNow);

        // Check if user has already filled the form
        const profileForInit = profileOverride || userProfile || null;
        const userNipVal =
          profileForInit?.nip ||
          profileForInit?.nipBaru ||
          profileForInit?.nip_baru ||
          profileForInit?.nipbaru ||
          (() => {
            try {
              const token = localStorage.getItem("token");
              if (!token) return "";
              const parts = token.split(".");
              if (parts.length < 2) return "";
              const payloadB64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
              const pad =
                payloadB64.length % 4 === 0 ? 0 : 4 - (payloadB64.length % 4);
              const padded = payloadB64 + "=".repeat(pad);
              const json = atob(padded);
              const payload = JSON.parse(json || "{}");
              return payload.nip || "";
            } catch (e) {
              return "";
            }
          })();

        let hasAttended = false;
        if (passedAttendance) {
          hasAttended = true;
          setAlreadyFilled(true);
          setAccessMessage("Anda sudah mengisi survei untuk kegiatan ini");
          try {
            setFilledRecord(passedAttendance);
          } catch (e) {
            setFilledRecord(null);
          }
        } else if (userNipVal) {
          try {
            const attendanceRes = await getKegiatanPegawai({
              nip: userNipVal,
              kegiatan_id: id,
              with_pagination: false,
            });

            let attendanceList = [];
            // Support multiple response shapes:
            // 1) { data: [ ... ] }
            // 2) { data: { data: [ ... ], ... } }
            // 3) [ ... ]
            if (Array.isArray(attendanceRes?.data)) {
              attendanceList = attendanceRes.data;
            } else if (Array.isArray(attendanceRes?.data?.data)) {
              attendanceList = attendanceRes.data.data;
            } else if (Array.isArray(attendanceRes)) {
              attendanceList = attendanceRes;
            }

            const matched = attendanceList.find((rec) => {
              const kid = rec.kegiatan_id || rec.kegiatan?.id;
              return String(kid) === String(id);
            });

            hasAttended = !!matched;

            setAlreadyFilled(hasAttended);
            setFilledRecord(matched || null);

            // Set appropriate access message
            if (hasAttended) {
              setAccessMessage("Anda sudah mengisi survei untuk kegiatan ini");
            } else if (!canAccessNow) {
              setAccessMessage(
                "Survei hanya dapat diisi 30 menit sebelum selesai hingga 2 jam setelah kegiatan selesai",
              );
            }
          } catch (e) {
            console.error("Failed to check attendance:", e);
          }
        } else if (!canAccessNow) {
          setAccessMessage(
            "Survei hanya dapat diisi 30 menit sebelum selesai hingga 2 jam setelah kegiatan selesai",
          );
        }

        // Create survey from form_evaluasi only if user can access
        if (activityData.form_evaluasi && canAccessNow && !hasAttended) {
          const surveyJson =
            typeof activityData.form_evaluasi === "string"
              ? JSON.parse(activityData.form_evaluasi)
              : activityData.form_evaluasi;

          const surveyModel = new Model(surveyJson);
          surveyModel.showProgressBar = "top";
          surveyModel.progressBarType = "pages";
          surveyModel.locale = "id";

          // Pre-fill nama_lengkap if it exists in the survey
          surveyModel.onValueChanged.add((sender, options) => {
            // You can handle value changes here if needed
          });

          // Set initial data. Use cached localStorage profile if `userProfile` not yet loaded
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
              p.nama ||
              p.name ||
              p.nama_lengkap ||
              p.full_name ||
              p.namaLengkap ||
              "";
            const gelarDepan = p.gelarDepan || p.gelar_depan || "";
            const gelarBelakang = p.gelarBelakang || p.gelar_belakang || "";
            if (rawName) {
              const nama = formatPersonName(rawName || "");
              const front = gelarDepan ? `${gelarDepan} ` : "";
              const back = gelarBelakang ? `, ${gelarBelakang}` : "";
              return `${front}${nama}${back}`.trim();
            }
            const tokenUser = getUserFromToken();
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

          surveyModel.data = {
            nama_lengkap: initialNamaLengkap,
            nip_no_absen: initialNip || "",
            jabatan:
              profileForInit?.json?.jabatanNama ||
              userProfile?.json?.jabatanNama ||
              "",
            unit_kerja:
              profileForInit?.unit_organisasi_parent ||
              userProfile?.unit_organisasi_parent ||
              profileForInit?.json?.unorNama ||
              userProfile?.json?.unorNama ||
              "",
            status_pegawai:
              profileForInit?.json?.statusPegawai ||
              userProfile?.json?.statusPegawai ||
              "",
          };

          surveyModel.onComplete.add(handleSurveyComplete);

          setSurvey(surveyModel);
        }
      }
    } catch (error) {
      console.error("Failed to fetch activity:", error);
      if (typeof window.Swal !== "undefined") {
        window.Swal.fire({
          icon: "error",
          title: "Gagal",
          text: "Gagal memuat data kegiatan",
          confirmButtonColor: "#3085d6",
        });
      }
      navigate("/");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSurveyComplete(sender) {
    setIsSubmitting(true);
    try {
      const formData = sender.data;

      // Ensure nama_lengkap is included
      if (!formData.nama_lengkap) {
        formData.nama_lengkap = userName;
      }

      const payload = {
        kegiatan_id: id,
        nip: userNip,
        isi_form: formData,
      };

      const response = await createKegiatanPegawai(payload);

      if (response) {
        if (typeof window.Swal !== "undefined") {
          await window.Swal.fire({
            icon: "success",
            title: "Berhasil",
            text: "Survei berhasil disimpan",
            confirmButtonColor: "#3085d6",
          });
        }
        navigate("/attended-activities");
      }
    } catch (error) {
      console.error("Failed to submit evaluation:", error);

      const errorMessage = error.message || "Gagal menyimpan survei";

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

  function handleOpenCertificate(link) {
    try {
      if (!link) return;
      const base = import.meta.env.VITE_BE_URL || "http://localhost:8000";
      const url = String(link).startsWith("http")
        ? link
        : `${base}/${String(link)}`;
      window.open(url, "_blank");
    } catch (e) {
      console.error("Failed to open certificate:", e);
    }
  }

  const BE_URL = import.meta.env.VITE_BE_URL || "http://localhost:8000";

  function handleDownloadCertificate(activityId, certificateUrl) {
    if (!certificateUrl) {
      if (typeof window.Swal !== "undefined") {
        window.Swal.fire({
          icon: "warning",
          title: "Tidak Tersedia",
          text: "Sertifikat belum tersedia untuk kegiatan ini",
          confirmButtonColor: "#3085d6",
        });
      } else {
        alert("Sertifikat belum tersedia untuk kegiatan ini");
      }
      return;
    }

    try {
      setCertLoading((s) => ({ ...s, [activityId]: true }));
      const final = `${BE_URL}/api/sertifikat/download/${encodeURIComponent(activityId)}`;
      window.location.href = final;
      setTimeout(() => {
        setCertLoading((s) => {
          const copy = { ...s };
          delete copy[activityId];
          return copy;
        });
      }, 800);
    } catch (e) {
      const fallback = `${BE_URL}/download/${encodeURIComponent(certificateUrl)}`;
      window.location.href = fallback;
    }
  }

  async function openSurvey(attendedRecord) {
    if (!attendedRecord || !attendedRecord.id) return;
    setSurveyModalOpen(true);
    setSurveyLoading(true);
    try {
      setSurveyData(attendedRecord);
    } catch (e) {
      console.error("Failed to fetch survey results", e);
      setSurveyData(null);
    } finally {
      setSurveyLoading(false);
    }
  }

  function closeSurvey() {
    setSurveyModalOpen(false);
    setSurveyData(null);
    setSurveyLoading(false);
  }

  const showNip = (() => {
    const p = userProfile || {};
    const role = (p.role || "").toString().toLowerCase();
    return !(
      role === "admin" ||
      role === "super admin" ||
      role === "superadmin"
    );
  })();

  async function logout() {
    let confirmed = false;
    if (typeof window.Swal !== "undefined") {
      const res = await window.Swal.fire({
        title: "Konfirmasi",
        text: "Apakah Anda yakin ingin logout?",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Ya, logout",
        cancelButtonText: "Batal",
        reverseButtons: true,
        confirmButtonColor: "#3085d6",
        cancelButtonColor: "#d33",
      });
      confirmed = !!res.isConfirmed;
    } else {
      confirmed = confirm("Apakah Anda yakin ingin logout?");
    }

    if (!confirmed) return;

    const ssoEnabled = import.meta.env.VITE_ENABLE_SSO !== "false";

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
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-500 border-t-transparent"></div>
            <p className="text-gray-600 dark:text-gray-300">Memuat form...</p>
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

  if (!activity || !survey) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-gray-900">
        <Header
          userName={userName}
          userNip={userNip}
          showNip={showNip}
          onProfileClick={() => setShowProfileModal(true)}
          onLogout={logout}
        />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md px-4 bg-white dark:bg-gray-800 shadow-md rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <FontAwesomeIcon
              icon={alreadyFilled ? faFileAlt : faCalendarAlt}
              className={`mx-auto mb-4 text-5xl ${
                alreadyFilled
                  ? "text-teal-500 dark:text-teal-500"
                  : "text-amber-400 dark:text-amber-600"
              }`}
            />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              {alreadyFilled
                ? "Survei Sudah Terisi"
                : "Form Belum Dapat Diakses"}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {accessMessage ||
                "Form evaluasi untuk kegiatan ini tidak tersedia"}
            </p>

            {activity && (
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-6 text-left border border-gray-200 dark:border-gray-700">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                  {activity.nama_kegiatan}
                </h4>
                {activity.judul_tema && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    "{activity.judul_tema}"
                  </p>
                )}
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <FontAwesomeIcon
                      icon={faCalendarAlt}
                      className="text-teal-500 dark:text-teal-400 mt-0.5"
                    />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {formatDate(activity.tanggal)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <FontAwesomeIcon
                      icon={faClock}
                      className="text-teal-500 dark:text-teal-400 mt-0.5"
                    />
                    <div>
                      <p className="text-gray-700 dark:text-gray-300">
                        {formatTime(activity.jam_mulai)} -{" "}
                        {formatTime(activity.jam_selesai)} WIB
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {alreadyFilled && filledRecord && (
              <div className="mb-4 p-4 rounded-lg bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800 text-center">
                <p className="text-sm text-teal-800 dark:text-teal-200 mb-3">
                  Anda telah mengisi survei sebagai{" "}
                  <strong>
                    {filledRecord?.isi_form?.nama_lengkap || userName}
                  </strong>
                  .
                </p>
                <div className="flex items-center justify-center gap-3">
                  {filledRecord.link_sertifikat && (
                    <button
                      onClick={() =>
                        handleDownloadCertificate(
                          filledRecord.id,
                          filledRecord.link_sertifikat,
                        )
                      }
                      disabled={!!certLoading[filledRecord.id]}
                      title="Unduh Sertifikat"
                      className="inline-flex items-center gap-2 rounded-lg bg-teal-500 px-4 py-2 text-sm font-medium text-white hover:bg-teal-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <FontAwesomeIcon
                        icon={
                          certLoading[filledRecord.id] ? faSpinner : faDownload
                        }
                        spin={!!certLoading[filledRecord.id]}
                        className="h-4 w-4"
                      />
                      {certLoading[filledRecord.id]
                        ? "Mengunduh..."
                        : "Unduh Sertifikat"}
                    </button>
                  )}

                  {filledRecord.isi_form && (
                    <button
                      onClick={() => openSurvey(filledRecord)}
                      className="inline-flex items-center gap-2 rounded-lg bg-white text-gray-700 border border-gray-200 px-4 py-2 text-sm font-medium hover:bg-gray-100"
                      title="Lihat Survei"
                    >
                      <FontAwesomeIcon icon={faFileAlt} className="h-4 w-4" />
                      Lihat Jawaban
                    </button>
                  )}
                </div>
              </div>
            )}

            <SurveyResultsModal
              open={surveyModalOpen}
              onClose={closeSurvey}
              loading={surveyLoading}
              data={surveyData}
            />

            <button
              onClick={() => navigate("/")}
              className="inline-flex items-center gap-2 rounded-lg bg-teal-500 px-6 py-3 text-sm font-medium text-white hover:bg-teal-600 transition"
            >
              Kembali ke Dashboard
            </button>
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
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-gray-900">
      <Header
        userName={userName}
        userNip={userNip}
        showNip={showNip}
        onProfileClick={() => setShowProfileModal(true)}
        onLogout={logout}
      />

      {/* Main Content */}
      <main className="flex-1 mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-md overflow-hidden">
          <div className="p-6 sm:p-8 relative">
            {isSubmitting && (
              <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/80 dark:bg-gray-900/60">
                <div className="flex flex-col items-center gap-3">
                  <div className="h-10 w-10 animate-spin rounded-full border-4 border-teal-500 border-t-transparent"></div>
                  <p className="text-gray-700 dark:text-gray-200">
                    Menyimpan survei...
                  </p>
                </div>
              </div>
            )}
            <Survey model={survey} />
            <SurveyResultsModal
              open={surveyModalOpen}
              onClose={closeSurvey}
              loading={surveyLoading}
              data={surveyData}
            />
          </div>
        </div>
      </main>
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

export default ActivityEvaluation;
