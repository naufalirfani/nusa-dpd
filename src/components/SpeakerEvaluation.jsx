import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import {
  getKegiatanById,
  createKegiatanEvaluasiNarasumber,
  getKegiatanPegawai,
  getPegawai,
} from "../config/api";
import { fetchUserProfileByIdentifier } from "../config/api";
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

let pegawaiCache = null;
let pegawaiPromise = null;

function SpeakerEvaluation() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [activity, setActivity] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [survey, setSurvey] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [canAccess, setCanAccess] = useState(false);
  const [accessMessage, setAccessMessage] = useState("");
  const [pegawaiMap, setPegawaiMap] = useState({});

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
      return null;
    }
  }

  async function fetchActivity() {
    try {
      setIsLoading(true);
      const response = await getKegiatanById(id);
      if (response && response.data) {
        const activityData = response.data;
        setActivity(activityData);
        const canAccessNow = canFillPresence(activityData.tanggal, activityData.jam_selesai);
        setCanAccess(canAccessNow);

        if (!canAccessNow) {
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
      const results = sender.data;
      const token = localStorage.getItem("token");
      let userNip = "";
      if (token) {
        try {
          const parts = token.split(".");
          const payloadB64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
          const pad = payloadB64.length % 4 === 0 ? 0 : 4 - (payloadB64.length % 4);
          const json = atob(payloadB64 + "=".repeat(pad));
          const payload = JSON.parse(json || "{}");
          userNip = payload.nip || "";
        } catch (e) {}
      }

      await createKegiatanEvaluasiNarasumber({
        kegiatan_id: id,
        nip: userNip || userProfile?.nip || null,
        isi_form: results,
      });
    } catch (error) {
      console.error("Gagal menyimpan evaluasi narasumber:", error);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <FontAwesomeIcon icon={faSpinner} className="animate-spin text-purple-600 text-3xl" />
          <span className="text-sm font-semibold text-gray-600">Memuat Form Evaluasi Narasumber...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      <Header />
      <div className="container mx-auto px-4 py-8 max-w-4xl flex-1">
        <button
          onClick={() => navigate("/activities")}
          className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-purple-600 hover:text-purple-700 transition cursor-pointer"
        >
          <FontAwesomeIcon icon={faArrowLeft} />
          Kembali ke Daftar Kegiatan
        </button>

        <div className="bg-white rounded-2xl shadow-md p-6 mb-6 border-l-4 border-purple-600">
          <div className="flex items-center gap-3 text-purple-600 text-sm font-bold uppercase tracking-wider mb-2">
            <FontAwesomeIcon icon={faUserTie} />
            Form Evaluasi Narasumber
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{activity?.nama_kegiatan}</h1>
          <div className="flex flex-wrap gap-4 text-xs text-gray-600">
            <div className="flex items-center gap-1.5">
              <FontAwesomeIcon icon={faCalendarAlt} className="text-gray-400" />
              <span>{formatDate(activity?.tanggal)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <FontAwesomeIcon icon={faClock} className="text-gray-400" />
              <span>{formatTime(activity?.jam_mulai)} - {formatTime(activity?.jam_selesai)} WIB</span>
            </div>
          </div>
        </div>

        {!canAccess ? (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 text-center text-amber-800 space-y-2">
            <p className="font-bold text-lg">Akses Belum Dibuka</p>
            <p className="text-sm">{accessMessage}</p>
          </div>
        ) : survey ? (
          <div className="bg-white rounded-2xl shadow-md p-6">
            <Survey model={survey} />
          </div>
        ) : null}
      </div>
      <Footer />
    </div>
  );
}

export default SpeakerEvaluation;
