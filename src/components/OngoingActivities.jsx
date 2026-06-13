import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import {
  getKegiatan,
  getPegawai,
  getKegiatanPegawai,
  regenerateCertificate,
} from "../config/api";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faImage,
  faCalendarAlt,
  faUser,
  faMapMarkerAlt,
  faExternalLinkAlt,
  faCheck,
  faFileAlt,
  faArrowRight,
  faClipboardCheck,
  faCertificate,
  faDownload,
  faCogs,
  faVideo,
  faSpinner,
} from "@fortawesome/free-solid-svg-icons";
import ActivityDownloads from "./ActivityDownloads";

let pegawaiCache = null;
let pegawaiPromise = null;

function OngoingActivities() {
  const navigate = useNavigate();
  const [activities, setActivities] = useState([]);
  const [selectedBanner, setSelectedBanner] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBannerLoading, setSelectedBannerLoading] = useState(false);
  const [bannerLoading, setBannerLoading] = useState({});
  const [pegawaiMap, setPegawaiMap] = useState({});
  const [userNip, setUserNip] = useState("");
  const [attendanceMap, setAttendanceMap] = useState({}); // keyed by kegiatan_id -> kegiatanPegawai record
  const [attendanceLoading, setAttendanceLoading] = useState({});
  const [regenLoading, setRegenLoading] = useState({});
  const [downloadLoading, setDownloadLoading] = useState({});

  const mountedRef = useRef(false);

  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;
    fetchOngoingActivities();
  }, []);

  // Load pegawai map for resolving internal names
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
              .then((data) => {
                pegawaiCache = data;
                pegawaiPromise = null;
                return data;
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
            const name =
              x.name ||
              x.nama ||
              x.fullname ||
              x.username ||
              x.email ||
              x.nip ||
              "";
            if (x.nip) map[String(x.nip).trim()] = name;
            if (x.email) map[String(x.email).trim()] = name;
            if (x.username) map[String(x.username).trim()] = name;
            if (name) map[name] = name;
          });
          setPegawaiMap(map);
        }
      } catch (e) {
        console.error("Failed to load pegawai for name resolution", e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  // Parse user nip from token
  useEffect(() => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      const parts = token.split(".");
      if (parts.length < 2) return;
      const payloadB64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
      const pad = payloadB64.length % 4 === 0 ? 0 : 4 - (payloadB64.length % 4);
      const padded = payloadB64 + "=".repeat(pad);
      const json = atob(padded);
      const payload = JSON.parse(json || "{}");
      setUserNip(payload.nip || "");
    } catch (e) {
      // ignore
    }
  }, []);

  // Fetch attendance for activities when activities list or userNip changes
  useEffect(() => {
    if (activities.length && userNip) {
      fetchAttendanceForActivities(activities, userNip);
    }
  }, [activities, userNip]);

  async function fetchOngoingActivities() {
    try {
      setIsLoading(true);
      const response = await getKegiatan({ sort: "ongoing" });

      if (response && response.data) {
        // Filter untuk kegiatan yang sedang berlangsung atau akan datang
        const now = new Date();
        const filtered = response.data.filter((kegiatan) => {
          const kegiatanDate = new Date(kegiatan.tanggal);
          return kegiatanDate >= new Date(now.toDateString()); // Hari ini atau masa depan
        });

        // Sort by tanggal
        filtered.sort((a, b) => new Date(a.tanggal) - new Date(b.tanggal));

        const items = filtered.slice(0, 10); // Ambil 10 kegiatan terdekat
        // initialize banner loading flags
        const bMap = {};
        items.forEach((a) => {
          if (a && a.id && a.banner) bMap[a.id] = true;
        });
        setBannerLoading(bMap);
        setActivities(items);
      }
    } catch (error) {
      console.error("Failed to fetch activities:", error);
    } finally {
      setIsLoading(false);
    }
  }

  function isOngoing(tanggal, jamMulai, jamSelesai) {
    try {
      const now = new Date();
      const [year, month, day] = tanggal.split("-").map(Number);
      const [startHour, startMinute] = jamMulai.split(":").map(Number);
      const [endHour, endMinute] = jamSelesai.split(":").map(Number);

      const startTime = new Date(
        Date.UTC(year, month - 1, day, startHour - 7, startMinute, 0),
      );
      const endTime = new Date(
        Date.UTC(year, month - 1, day, endHour - 7, endMinute, 0),
      );

      return now >= startTime && now <= endTime;
    } catch (error) {
      console.error("Error checking ongoing status:", error);
      return false;
    }
  }

  function getActivityStatus(tanggal, jamMulai, jamSelesai) {
    try {
      const now = new Date();
      const [year, month, day] = tanggal.split("-").map(Number);
      const [startHour, startMinute] = jamMulai.split(":").map(Number);
      const [endHour, endMinute] = jamSelesai.split(":").map(Number);

      const startTime = new Date(
        Date.UTC(year, month - 1, day, startHour - 7, startMinute, 0),
      );
      const endTime = new Date(
        Date.UTC(year, month - 1, day, endHour - 7, endMinute, 0),
      );

      if (now >= startTime && now <= endTime) return "ongoing";
      if (now < startTime) return "upcoming";
      return "past";
    } catch (error) {
      return "past";
    }
  }

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

  async function fetchAttendanceForActivities(items, nip) {
    try {
      const idsArr = items.map((a) => a.id).filter(Boolean);
      const ids = idsArr.join(",");
      if (!ids) return;
      // set loading for these ids
      setAttendanceLoading((prev) => {
        const next = { ...prev };
        idsArr.forEach((id) => (next[id] = true));
        return next;
      });

      const res = await getKegiatanPegawai({
        nip,
        with_pagination: false,
        kegiatan_id: ids,
      });
      let list = [];
      if (!res) return;
      if (Array.isArray(res.data)) list = res.data;
      else if (Array.isArray(res)) list = res;
      else list = res.data?.data || res.data || [];

      const map = {};
      list.forEach((rec) => {
        const kid =
          rec.kegiatan_id ||
          rec.kegiatan?.id ||
          rec.kegiatan?.kegiatan_id ||
          rec.kegiatan?.id_kegiatan;
        if (kid) map[kid] = rec;
      });
      setAttendanceMap((prev) => ({ ...prev, ...map }));
      // clear loading flags for these ids
      setAttendanceLoading((prev) => {
        const next = { ...prev };
        idsArr.forEach((id) => delete next[id]);
        return next;
      });
    } catch (e) {
      console.error("Failed to fetch attendance for activities", e);
      // clear any loading flags on error
      setAttendanceLoading({});
    }
  }

  async function handleRegenerateCertificate(activityPegawaiId) {
    try {
      const confirmed =
        typeof window.Swal !== "undefined"
          ? (
              await window.Swal.fire({
                title: "Regenerate Sertifikat",
                text: "Apakah Anda yakin ingin regenerate sertifikat?",
                icon: "question",
                showCancelButton: true,
                confirmButtonText: "Ya, Regenerate",
                cancelButtonText: "Batal",
                confirmButtonColor: "#3085d6",
                cancelButtonColor: "#d33",
                reverseButtons: true,
              })
            ).isConfirmed
          : confirm("Apakah Anda yakin ingin regenerate sertifikat?");

      if (!confirmed) return;

      setRegenLoading((p) => ({ ...p, [activityPegawaiId]: true }));

      const response = await regenerateCertificate(activityPegawaiId);

      if (response) {
        if (typeof window.Swal !== "undefined") {
          await window.Swal.fire({
            icon: "success",
            title: "Berhasil",
            text: "Sertifikat berhasil di-regenerate",
            confirmButtonColor: "#3085d6",
          });
        }
        fetchOngoingActivities();
      }
    } catch (error) {
      console.error("Failed to regenerate certificate:", error);
      if (typeof window.Swal !== "undefined") {
        window.Swal.fire({
          icon: "error",
          title: "Gagal",
          text: "Gagal regenerate sertifikat",
          confirmButtonColor: "#3085d6",
        });
      }
    } finally {
      setRegenLoading((p) => {
        const next = { ...p };
        delete next[activityPegawaiId];
        return next;
      });
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

  function isUrl(string) {
    try {
      new URL(string);
      return true;
    } catch {
      return false;
    }
  }

  const resolvePegawaiName = (id) => {
    if (!id && id !== 0) return null;
    const s = String(id).trim();
    if (!s) return null;
    if (pegawaiMap[s]) return pegawaiMap[s];
    const noLeading = s.replace(/^0+/, "");
    if (noLeading && pegawaiMap[noLeading]) return pegawaiMap[noLeading];
    const num = String(Number(s));
    if (num && pegawaiMap[num]) return pegawaiMap[num];
    const lower = s.toLowerCase();
    if (pegawaiMap[lower]) return pegawaiMap[lower];
    return null;
  };

  function handleFillPresence(activity) {
    const attendanceRecord = attendanceMap[activity.id] || null;
    navigate(`/activity-evaluation/${activity.id}`, {
      state: { attendance: attendanceRecord },
    });
  }

  // When loading, we still render the header and controls but show skeleton cards
  const displayedActivities = isLoading
    ? [null]
    : activities.length
      ? activities
      : [null];

  return (
    <section className="mb-8">
      <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-800 shadow-md overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row items-start sm:items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Kegiatan Terkini
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Ikuti kegiatan pengembangan SDM yang sedang berlangsung
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto mt-3 sm:mt-0">
            <button
              onClick={() => navigate("/attended-activities")}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 px-3 py-2 text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-600 transition"
            >
              <FontAwesomeIcon icon={faFileAlt} className="h-4 w-4" />
              Riwayat Kegiatan Saya
            </button>

            <button
              onClick={() => navigate("/activities")}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 border border-teal-100 dark:border-teal-800 px-4 py-2 text-sm font-medium hover:bg-teal-100 dark:hover:bg-teal-900/50 transition"
            >
              Lihat Semua
              <FontAwesomeIcon icon={faArrowRight} className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Horizontal Scroll Container */}
        <div className="p-6 overflow-x-auto">
          <div className="flex gap-6 pb-2" style={{ minWidth: "min-content" }}>
            {displayedActivities.map((activity, __idx) => {
              if (!activity) {
                if (isLoading) {
                  return (
                    <div key={`placeholder-${__idx}`} className="p-6 w-full">
                      <div className="flex items-start gap-4">
                        <div className="flex-1 flex items-center justify-center">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-500 border-t-transparent"></div>
                            <p className="text-gray-600 dark:text-gray-300">
                              Memuat kegiatan...
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }
                return (
                  <article
                    key={`no-activity-${__idx}`}
                    className="flex-shrink-0 w-full rounded-xl border border-dashed border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm transition-all duration-300 overflow-hidden group flex items-center justify-center"
                  >
                    <div className="p-8 text-center">
                      <div className="text-4xl text-gray-400 dark:text-gray-500 mb-3">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-12 w-12 mx-auto"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M8 7V3m8 4V3M3 11h18M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                      </div>
                      <h4 className="font-semibold text-gray-900 dark:text-white text-lg">
                        Tidak ada kegiatan
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                        Saat ini belum ada kegiatan terjadwal.
                      </p>
                      <div className="mt-4">
                        <button
                          onClick={() => navigate("/activities")}
                          className="inline-flex items-center gap-2 rounded-lg bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 border border-teal-100 dark:border-teal-800 px-4 py-2 text-sm font-medium hover:bg-teal-100 dark:hover:bg-teal-900/50 transition"
                        >
                          Lihat Semua<span className="sr-only"> kegiatan</span>
                        </button>
                      </div>
                    </div>
                  </article>
                );
              }

              const ongoing = isOngoing(
                activity.tanggal,
                activity.jam_mulai,
                activity.jam_selesai,
              );
              const activityStatus = getActivityStatus(
                activity.tanggal,
                activity.jam_mulai,
                activity.jam_selesai,
              );
              const isFinished = activityStatus === "past";
              const showPresence = canFillPresence(
                activity.tanggal,
                activity.jam_selesai,
              );
              const attended = attendanceMap[activity.id];

              return (
                <article
                  key={activity.id || `activity-${__idx}`}
                  className="flex-shrink-0 w-[700px] rounded-xl border border-gray-200 dark:border-gray-700 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden group flex"
                >
                  <div
                    className="relative w-[280px] aspect-[4/5] flex-shrink-0 overflow-hidden bg-gradient-to-br from-teal-500 to-cyan-600 cursor-pointer"
                    onClick={() => {
                      if (activity.banner) {
                        const url =
                          import.meta.env.VITE_BE_URL +
                          `/storage/${activity.banner}`;
                        setSelectedBannerLoading(true);
                        setSelectedBanner(url);
                      }
                    }}
                    title="Klik untuk melihat banner ukuran penuh"
                  >
                    {activity &&
                      (activity.materi || activity.virtual_background) && (
                        <ActivityDownloads activity={activity} overlay />
                      )}

                    {activity.banner ? (
                      <>
                        <img
                          src={
                            import.meta.env.VITE_BE_URL +
                            `/storage/${activity.banner}`
                          }
                          alt={activity.nama_kegiatan}
                          onLoad={() =>
                            setBannerLoading((p) => {
                              const next = { ...p };
                              delete next[activity.id];
                              return next;
                            })
                          }
                          onError={() =>
                            setBannerLoading((p) => {
                              const next = { ...p };
                              delete next[activity.id];
                              return next;
                            })
                          }
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                        {bannerLoading[activity.id] && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/25">
                            <div className="h-8 w-8 animate-spin rounded-full border-4 border-white border-t-transparent"></div>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <FontAwesomeIcon
                          icon={faImage}
                          className="text-white/50 text-4xl"
                        />
                      </div>
                    )}

                    <div className="absolute top-4 left-4">
                      <span className="inline-flex items-center gap-1 rounded-full bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm px-3 py-1 text-xs font-semibold text-gray-900 dark:text-white shadow-md">
                        {activity.jenis_kegiatan || "Kegiatan"}
                      </span>
                    </div>

                    {ongoing && (
                      <div className="absolute top-4 right-4">
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-500 px-3 py-1 text-xs font-semibold text-white shadow-md animate-pulse">
                          <span className="h-2 w-2 rounded-full bg-white"></span>
                          Live Now
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 p-5 space-y-2 flex flex-col">
                    <div>
                      <h4 className="font-bold text-gray-900 dark:text-white text-md leading-snug">
                        {activity.nama_kegiatan}
                      </h4>
                      {activity.judul_tema && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          "{activity.judul_tema}"
                        </p>
                      )}
                    </div>

                    <div className="flex items-start gap-2 text-sm">
                      <FontAwesomeIcon
                        icon={faCalendarAlt}
                        className="text-teal-500 dark:text-teal-400 text-base flex-shrink-0 mt-3"
                      />
                      <div className="text-gray-700 dark:text-gray-300">
                        <p className="font-medium text-sm">
                          {formatDate(activity.tanggal)}
                        </p>
                        <p className="text-gray-600 dark:text-gray-400">
                          {formatTime(activity.jam_mulai)} -{" "}
                          {formatTime(activity.jam_selesai)} WIB
                        </p>
                      </div>
                    </div>

                    {activity.narasumber && (
                      <div className="flex items-start gap-2 text-sm">
                        <FontAwesomeIcon
                          icon={faUser}
                          className="text-purple-600 dark:text-purple-400 text-base flex-shrink-0 mt-3"
                        />
                        <div className="text-gray-700 dark:text-gray-300">
                          <p className="text-gray-600 dark:text-gray-400">
                            Narasumber
                          </p>
                          <p className="font-medium text-sm">
                            {(activity.asal_narasumber || "").toLowerCase() ===
                            "internal"
                              ? resolvePegawaiName(activity.narasumber) ||
                                activity.narasumber?.nama ||
                                activity.narasumber
                              : activity.narasumber}
                          </p>
                        </div>
                      </div>
                    )}

                    {activity.moderator && (
                      <div className="flex items-start gap-2 text-sm">
                        <FontAwesomeIcon
                          icon={faUser}
                          className="text-blue-600 dark:text-blue-400 text-base flex-shrink-0 mt-3"
                        />
                        <div className="text-gray-700 dark:text-gray-300">
                          <p className="text-gray-600 dark:text-gray-400">
                            Moderator
                          </p>
                          <p className="font-medium text-sm">
                            {(activity.asal_moderator || "").toLowerCase() ===
                            "internal"
                              ? resolvePegawaiName(activity.moderator) ||
                                activity.moderator?.nama ||
                                activity.moderator
                              : activity.moderator}
                          </p>
                        </div>
                      </div>
                    )}

                    {activity.tempat && (
                      <div className="flex items-start gap-2 text-xs">
                        <FontAwesomeIcon
                          icon={faMapMarkerAlt}
                          className="text-amber-600 dark:text-amber-400 text-base flex-shrink-0 mt-3"
                        />
                        <div className="flex-1 text-gray-700 dark:text-gray-300">
                          {!isUrl(activity.tempat) && (
                            <p className="text-gray-600 dark:text-gray-400">
                              Tempat
                            </p>
                          )}
                          {isUrl(activity.tempat) ? (
                            <a
                              href={isFinished ? undefined : activity.tempat}
                              target={isFinished ? undefined : "_blank"}
                              rel={
                                isFinished ? undefined : "noopener noreferrer"
                              }
                              aria-disabled={isFinished}
                              tabIndex={isFinished ? -1 : undefined}
                              onClick={
                                isFinished
                                  ? (e) => e.preventDefault()
                                  : undefined
                              }
                              className={`inline-flex items-center gap-2 mt-1 rounded-lg px-3 py-1.5 text-sm font-medium shadow-md transition-all ${isFinished ? "cursor-not-allowed bg-gray-300 text-gray-600" : "bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md"}`}
                            >
                              <FontAwesomeIcon
                                icon={faVideo}
                                className="text-xs"
                              />
                              {isFinished
                                ? "Kegiatan Selesai"
                                : "Gabung Sekarang"}
                            </a>
                          ) : (
                            <p className="font-medium text-sm">
                              {activity.tempat}
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {activity.form_evaluasi && (
                      <div className="mt-auto pt-4">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                          Survei dapat diisi 30 menit sebelum selesai hingga 2
                          jam setelah selesai.
                        </p>
                        {(() => {
                          const attended = attendanceMap[activity.id];
                          const checking = attendanceLoading[activity.id];
                          return (
                            <>
                              {showPresence && (
                                <>
                                  {/** Show disabled checking state while attendance is loading */}
                                  {checking ? (
                                    <button
                                      disabled
                                      className="w-full inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold bg-gray-200 text-gray-700 cursor-not-allowed"
                                    >
                                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-400 border-t-transparent"></span>
                                      <span>Memeriksa...</span>
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() =>
                                        handleFillPresence(activity)
                                      }
                                      disabled={!!attended}
                                      className={`w-full inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all shadow-md ${attended ? "bg-gray-300 text-gray-700 cursor-not-allowed" : "bg-gradient-to-r from-cyan-600 to-teal-500 text-white hover:from-cyan-700 hover:to-teal-600"}`}
                                    >
                                      <FontAwesomeIcon
                                        icon={faClipboardCheck}
                                        className={
                                          attended
                                            ? "text-gray-700"
                                            : "text-white"
                                        }
                                      />
                                      {attended
                                        ? "Sudah Mengisi Survei"
                                        : "Isi Survei"}
                                    </button>
                                  )}
                                </>
                              )}

                              <div className="mt-3 flex gap-2 min-h-[40px]">
                                {checking ? (
                                  <button
                                    disabled
                                    className="w-full inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold bg-gray-200 text-gray-700 cursor-not-allowed"
                                  >
                                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-400 border-t-transparent"></span>
                                    <span>Memeriksa...</span>
                                  </button>
                                ) : attended ? (
                                  attended.link_sertifikat ? (
                                    <button
                                      onClick={() => {
                                        const id = attended.id;
                                        const url = String(
                                          attended.link_sertifikat || "",
                                        );
                                        const final = /^(https?:)?\/\//.test(
                                          url,
                                        )
                                          ? url
                                          : `${import.meta.env.VITE_BE_URL || "http://localhost:8000"}/api/sertifikat/download/${encodeURIComponent(id)}`;
                                        setDownloadLoading((p) => ({
                                          ...p,
                                          [id]: true,
                                        }));
                                        // navigate same-tab
                                        window.location.href = final;
                                        // fallback clear in case navigation is blocked
                                        setTimeout(() => {
                                          setDownloadLoading((p) => {
                                            const copy = { ...p };
                                            delete copy[id];
                                            return copy;
                                          });
                                        }, 1000);
                                      }}
                                      disabled={!!downloadLoading[attended.id]}
                                      className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-teal-500 px-3 py-2 text-sm font-medium text-white hover:bg-teal-600 transition shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      <FontAwesomeIcon
                                        icon={
                                          downloadLoading[attended.id]
                                            ? faSpinner
                                            : faDownload
                                        }
                                        spin={!!downloadLoading[attended.id]}
                                        className="text-white"
                                      />
                                      {downloadLoading[attended.id]
                                        ? "Mengunduh..."
                                        : "Unduh Sertifikat"}
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() =>
                                        handleRegenerateCertificate(attended.id)
                                      }
                                      disabled={!!regenLoading[attended.id]}
                                      className={`flex-1 inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-white transition shadow-md ${
                                        regenLoading[attended.id]
                                          ? "bg-gray-300 text-gray-700 cursor-not-allowed"
                                          : "bg-teal-500 hover:bg-teal-600"
                                      }`}
                                    >
                                      {regenLoading[attended.id] ? (
                                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                      ) : (
                                        <FontAwesomeIcon
                                          icon={faCogs}
                                          className="text-white"
                                        />
                                      )}
                                      {regenLoading[attended.id]
                                        ? "Memproses..."
                                        : "Generate Sertifikat"}
                                    </button>
                                  )
                                ) : null}
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        {/* Full-size banner modal (same behavior as KegiatanList) */}
        {selectedBanner &&
          createPortal(
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60"
              onClick={() => {
                setSelectedBanner(null);
                setSelectedBannerLoading(false);
              }}
            >
              <div className="max-w-[95%] max-h-[95%] p-4">
                <img
                  src={selectedBanner}
                  alt="Banner full size"
                  onClick={(e) => e.stopPropagation()}
                  onLoad={() => setSelectedBannerLoading(false)}
                  onError={() => setSelectedBannerLoading(false)}
                  className="max-w-full max-h-[80vh] mx-auto rounded shadow-md"
                />
                {selectedBannerLoading && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-white border-t-transparent"></div>
                  </div>
                )}
                <div className="text-center mt-3">
                  <button
                    onClick={() => setSelectedBanner(null)}
                    className="px-3 py-1 bg-white rounded shadow text-gray-800"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )}
      </div>
    </section>
  );
}

export default OngoingActivities;
