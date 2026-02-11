import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getKegiatanById, createKegiatanPegawai, getKegiatanPegawai } from "../config/api";
import { Model } from "survey-core";
import { Survey } from "survey-react-ui";
import "survey-core/survey-core.min.css";

// survey-core CSS imported above provides default styles
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFileAlt, faArrowLeft, faCalendarAlt, faClock } from "@fortawesome/free-solid-svg-icons";

function ActivityEvaluation() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [activity, setActivity] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [survey, setSurvey] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alreadyFilled, setAlreadyFilled] = useState(false);
  const [canAccess, setCanAccess] = useState(false);
  const [accessMessage, setAccessMessage] = useState("");

  useEffect(() => {
    loadUserProfile();
    fetchActivity();
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

  function loadUserProfile() {
    try {
      const cached = localStorage.getItem("userProfile");
      if (cached) {
        setUserProfile(JSON.parse(cached));
      }
    } catch (e) {
      console.error("Failed to parse cached profile", e);
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

  async function fetchActivity() {
    try {
      setIsLoading(true);
      const response = await getKegiatanById(id);

      if (response && response.data) {
        const activityData = response.data;
        setActivity(activityData);

        // Check if user can access the form based on time
        const canAccessNow = canFillPresence(
          activityData.tanggal,
          activityData.jam_selesai
        );
        setCanAccess(canAccessNow);

        // Check if user has already filled the form
        const userNipVal = userNip || (() => {
          try {
            const token = localStorage.getItem("token");
            if (!token) return "";
            const parts = token.split(".");
            if (parts.length < 2) return "";
            const payloadB64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
            const pad = payloadB64.length % 4 === 0 ? 0 : 4 - (payloadB64.length % 4);
            const padded = payloadB64 + "=".repeat(pad);
            const json = atob(padded);
            const payload = JSON.parse(json || "{}");
            return payload.nip || "";
          } catch (e) {
            return "";
          }
        })();

        let hasAttended = false;
        if (userNipVal) {
          try {
            const attendanceRes = await getKegiatanPegawai({
              nip: userNipVal,
              kegiatan_id: id,
              with_pagination: false,
            });
            
            let attendanceList = [];
            if (Array.isArray(attendanceRes?.data)) {
              attendanceList = attendanceRes.data;
            } else if (Array.isArray(attendanceRes)) {
              attendanceList = attendanceRes;
            }

            hasAttended = attendanceList.some((rec) => {
              const kid = rec.kegiatan_id || rec.kegiatan?.id;
              return String(kid) === String(id);
            });

            setAlreadyFilled(hasAttended);

            // Set appropriate access message
            if (hasAttended) {
              setAccessMessage("Anda sudah mengisi survei untuk kegiatan ini");
            } else if (!canAccessNow) {
              setAccessMessage(
                "Survei hanya dapat diisi 30 menit sebelum selesai hingga 2 jam setelah kegiatan selesai"
              );
            }
          } catch (e) {
            console.error("Failed to check attendance:", e);
          }
        } else if (!canAccessNow) {
          setAccessMessage(
            "Survei hanya dapat diisi 30 menit sebelum selesai hingga 2 jam setelah kegiatan selesai"
          );
        }

        // Create survey from form_evaluasi only if user can access
        if (activityData.form_evaluasi && canAccessNow && !hasAttended) {
          const surveyJson =
            typeof activityData.form_evaluasi === "string"
              ? JSON.parse(activityData.form_evaluasi)
              : activityData.form_evaluasi;

          const surveyModel = new Model(surveyJson);

          // Pre-fill nama_lengkap if it exists in the survey
          surveyModel.onValueChanged.add((sender, options) => {
            // You can handle value changes here if needed
          });

          // Set initial data. Use cached localStorage profile if `userProfile` not yet loaded
          let profileForInit = userProfile;
          if (!profileForInit) {
            try {
              const cached = localStorage.getItem("userProfile");
              if (cached) profileForInit = JSON.parse(cached);
            } catch (e) {
              profileForInit = null;
            }
          }

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
              profileForInit?.json?.jabatanNama || userProfile?.json?.jabatanNama || "",
            unit_kerja: profileForInit?.json?.unorNama || userProfile?.json?.unorNama || "",
            status_pegawai:
              profileForInit?.json?.statusPegawai || userProfile?.json?.statusPegawai || "",
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
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-gray-900">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-600 border-t-transparent"></div>
          <p className="text-gray-600 dark:text-gray-300">Memuat form...</p>
        </div>
      </div>
    );
  }

  if (!activity || !survey) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-gray-900">
        <div className="text-center max-w-md px-4">
          <FontAwesomeIcon
            icon={alreadyFilled ? faFileAlt : faCalendarAlt}
            className={`mx-auto mb-4 text-5xl ${
              alreadyFilled 
                ? "text-green-500 dark:text-green-600" 
                : "text-amber-400 dark:text-amber-600"
            }`}
          />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            {alreadyFilled ? "Survei Sudah Terisi" : "Form Belum Dapat Diakses"}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {accessMessage || "Form evaluasi untuk kegiatan ini tidak tersedia"}
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
                    className="text-teal-600 dark:text-teal-400 mt-0.5"
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
                    className="text-teal-600 dark:text-teal-400 mt-0.5"
                  />
                  <div>
                    <p className="text-gray-700 dark:text-gray-300">
                      {formatTime(activity.jam_mulai)} - {formatTime(activity.jam_selesai)} WIB
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <button
            onClick={() => navigate("/")}
            className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-6 py-3 text-sm font-medium text-white hover:bg-teal-700 transition"
          >
            Kembali ke Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="mx-auto px-4 sm:px-6 lg:px-12 py-4">
          <div className="flex items-center justify-between">
            <div className="flex flex-col items-start sm:flex-row sm:items-center gap-4 w-full">
              <div className="order-1 sm:order-2">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Form Survei
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {activity.nama_kegiatan} "{activity.judul_tema}"
                </p>
              </div>
              <button
                onClick={() => navigate("/")}
                className="order-2 sm:order-1 inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition"
              >
                <FontAwesomeIcon icon={faArrowLeft} className="text-lg" />
                Kembali
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-md overflow-hidden">
          <div className="p-6 sm:p-8 relative">
            {isSubmitting && (
              <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/80 dark:bg-gray-900/60">
                <div className="flex flex-col items-center gap-3">
                  <div className="h-10 w-10 animate-spin rounded-full border-4 border-teal-600 border-t-transparent"></div>
                  <p className="text-gray-700 dark:text-gray-200">
                    Menyimpan survei...
                  </p>
                </div>
              </div>
            )}
            <Survey model={survey} />
          </div>
        </div>
      </main>
    </div>
  );
}

export default ActivityEvaluation;
