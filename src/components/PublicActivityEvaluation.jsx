import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getKegiatanById, createKegiatanPegawai } from "../config/api";
import { Model } from "survey-core";
import { Survey } from "survey-react-ui";
import { combineActivityAndSpeakerSurvey } from "../utils/kegiatan";
import "survey-core/survey-core.min.css";
import "survey-core/survey.i18n";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faFileAlt,
  faArrowLeft,
  faCalendarAlt,
  faClock,
} from "@fortawesome/free-solid-svg-icons";
import Header from "./Header";
import Footer from "./Footer";

function PublicActivityEvaluation() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [activity, setActivity] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [survey, setSurvey] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [canAccess, setCanAccess] = useState(false);
  const [accessMessage, setAccessMessage] = useState("");
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
          activityData.jam_selesai,
        );
        setCanAccess(canAccessNow);

        if (!canAccessNow) {
          setAccessMessage(
            "Survei hanya dapat diisi 30 menit sebelum selesai hingga 2 jam setelah kegiatan selesai",
          );
        }

        // Create survey from form_evaluasi if accessible
        if (canAccessNow) {
          const surveyJson =
            typeof activityData.form_evaluasi === "string"
              ? JSON.parse(activityData.form_evaluasi)
              : activityData.form_evaluasi;

          const surveyModel = new Model(surveyJson);
          surveyModel.showProgressBar = "top";
          surveyModel.progressBarType = "pages";
          surveyModel.locale = "id";
          
          // Ensure `nip_no_absen` is editable for public forms (disable any readonly flag)
          try {
            const q =
              typeof surveyModel.getQuestionByName === "function"
                ? surveyModel.getQuestionByName("nip_no_absen")
                : null;

            if (q) {
              q.readOnly = false;
              q.title = "NIP/No. Absen/No. Identitas Lain";
              if (typeof q.setReadOnly === "function") q.setReadOnly(false);
            } else if (typeof surveyModel.getAllQuestions === "function") {
              surveyModel.getAllQuestions().forEach((qq) => {
                if (qq && qq.name === "nip_no_absen") {
                  qq.readOnly = false;
                  qq.title = "NIP/No. Absen/No. Identitas Lain";
                  if (typeof qq.setReadOnly === "function")
                    qq.setReadOnly(false);
                }
              });
            }
          } catch (err) {
            console.error("Failed to ensure nip_no_absen editable:", err);
          }

          surveyModel.onComplete.add(handleSurveyComplete);

          console.log("Survey model created:", surveyModel);
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

      // Get nama_lengkap and nip from form data
      const namaLengkap = formData.nama_lengkap || "";
      const nip = formData.nip_no_absen || "";

      if (!namaLengkap) {
        if (typeof window.Swal !== "undefined") {
          window.Swal.fire({
            icon: "warning",
            title: "Data Tidak Lengkap",
            text: "Nama lengkap harus diisi",
            confirmButtonColor: "#3085d6",
          });
        }
        setIsSubmitting(false);
        return;
      }

      const payload = {
        kegiatan_id: id,
        nip: nip || "-",
        isi_form: formData,
      };

      const response = await createKegiatanPegawai(payload);

      if (response) {
        if (typeof window.Swal !== "undefined") {
          await window.Swal.fire({
            icon: "success",
            title: "Berhasil",
            text: "Survei berhasil disimpan. Terima kasih!",
            confirmButtonColor: "#3085d6",
          });
        }
        // Redirect back or to a thank you page
        window.location.href = "/sertifikat/" + id; // Redirect to certificate page for this activity
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

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-gray-900">
        <Header showProfile={false} showLogout={false} />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-500 border-t-transparent"></div>
            <p className="text-gray-600 dark:text-gray-300">Memuat form...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!activity || !survey) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-gray-900">
        <Header showProfile={false} showLogout={false} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md px-4 bg-white dark:bg-gray-800 shadow-md rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <FontAwesomeIcon
              icon={faFileAlt}
              className="mx-auto mb-4 text-5xl text-amber-400 dark:text-amber-600"
            />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Form Belum Dapat Diakses
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

            <button
              onClick={() => window.history.back()}
              className="inline-flex items-center gap-2 rounded-lg bg-teal-500 px-6 py-3 text-sm font-medium text-white hover:bg-teal-600 transition"
            >
              Kembali
            </button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-gray-900">
      <Header showProfile={false} showLogout={false} />

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
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default PublicActivityEvaluation;
