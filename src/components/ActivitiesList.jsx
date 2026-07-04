import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import {
  getKegiatan,
  getPegawai,
  getKegiatanPegawai,
  regenerateCertificate,
} from "../config/api";
import MainLayout from "./MainLayout";
import ActivityDownloads from "./ActivityDownloads";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCalendarAlt,
  faImage,
  faUser,
  faMapMarkerAlt,
  faExternalLinkAlt,
  faCheck,
  faFileAlt,
  faClipboardCheck,
  faCertificate,
  faDownload,
  faCogs,
  faVideo,
  faSpinner,
} from "@fortawesome/free-solid-svg-icons";

let pegawaiCache = null;
let pegawaiPromise = null;

function ActivitiesList() {
  const navigate = useNavigate();
  const [activities, setActivities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBanner, setSelectedBanner] = useState(null);
  const [selectedBannerLoading, setSelectedBannerLoading] = useState(false);
  const [bannerLoading, setBannerLoading] = useState({});
  const [userNip, setUserNip] = useState("");
  const [attendanceMap, setAttendanceMap] = useState({});
  const [attendanceLoading, setAttendanceLoading] = useState({});
  const [regenLoading, setRegenLoading] = useState({});
  const [downloadLoading, setDownloadLoading] = useState({});
  const [filter, setFilter] = useState("all"); // all, ongoing, upcoming, past
  const [pegawaiMap, setPegawaiMap] = useState({});
  const [nip, setNip] = useState("-99");
  const [memuatPegawai, setMemuatPegawai] = useState(true);

  const mountedRef = useRef(false);
  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;
    fetchActivities();
  }, []);

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

  // Load pegawai map for resolving internal names
  useEffect(() => {
    if (!nip || nip === "-99") {
      if (!nip) setMemuatPegawai(false);
      return;
    };

    let cancelled = false;
    (async () => {
      try {
        let p;
        if (pegawaiCache) {
          p = pegawaiCache;
        } else {
          if (!pegawaiPromise) {
            pegawaiPromise = getPegawai({ nip: nip })
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
          setMemuatPegawai(false);
        }
      } catch (e) {
        setMemuatPegawai(false);
        console.error("Failed to load pegawai for name resolution", e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [nip]);

  async function fetchActivities() {
    try {
      setIsLoading(true);
      const response = await getKegiatan();

      if (response && response.data) {
        const sorted = response.data.sort(
          (a, b) => new Date(b.tanggal) - new Date(a.tanggal),
        );
        // initialize banner loading flags for activities with banners
        const bMap = {};
        sorted.forEach((a) => {
          if (a && a.id && a.banner) bMap[a.id] = true;
        });
        setBannerLoading(bMap);
        setActivities(sorted);

        setNip(
          sorted
            .flatMap((item) => [
              item.asal_narasumber === "Internal" ? item.narasumber : null,
              item.asal_moderator === "Internal" ? item.moderator : null,
            ])
            .filter(Boolean)
            .join(","),
        );
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
      return false;
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
      return false;
    }
  }

  async function fetchAttendanceForActivities(items, nip) {
    try {
      const idsArr = items.map((a) => a.id).filter(Boolean);
      const ids = idsArr.join(",");
      if (!ids) return;
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
      // clear loading
      setAttendanceLoading((prev) => {
        const next = { ...prev };
        idsArr.forEach((id) => delete next[id]);
        return next;
      });
    } catch (e) {
      console.error("Failed to fetch attendance for activities", e);
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
        fetchActivities();
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

  useEffect(() => {
    if (activities.length && userNip)
      fetchAttendanceForActivities(activities, userNip);
  }, [activities, userNip]);

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
      return timeString.substring(0, 5);
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

  function handleFillPresence(activityId) {
    navigate(`/activity-evaluation/${activityId}`);
  }

  const filteredActivities = activities.filter((activity) => {
    if (filter === "all") return true;
    const status = getActivityStatus(
      activity.tanggal,
      activity.jam_mulai,
      activity.jam_selesai,
    );
    return status === filter;
  });

  return (
    <MainLayout>
      <div className="mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-6">
          <div className="mb-8">
            <div className="border-l-4 border-teal-500 pl-4">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                Daftar Kegiatan
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Kegiatan yang sedang berlangsung, akan muncul di bagian atas
                daftar.
              </p>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setFilter("all")}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                filter === "all"
                  ? "bg-teal-500 text-white"
                  : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
              }`}
            >
              Semua
            </button>
            <button
              onClick={() => setFilter("ongoing")}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                filter === "ongoing"
                  ? "bg-red-500 text-white"
                  : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
              }`}
            >
              Sedang Berlangsung
            </button>
            <button
              onClick={() => setFilter("upcoming")}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                filter === "upcoming"
                  ? "bg-blue-600 text-white"
                  : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
              }`}
            >
              Mendatang
            </button>
            <button
              onClick={() => setFilter("past")}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                filter === "past"
                  ? "bg-gray-600 text-white"
                  : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
              }`}
            >
              Selesai
            </button>
          </div>
        </div>
        {/* Loading State */}
        {isLoading && (
          <div className="p-6 w-full">
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
        )}

        {/* Activities Grid */}
        {!isLoading && filteredActivities.length > 0 && (
          <div className="flex flex-wrap gap-6 overflow-x-auto">
            {filteredActivities.map((activity) => {
              const activityStatus = getActivityStatus(
                activity.tanggal,
                activity.jam_mulai,
                activity.jam_selesai,
              );
              const isFinished = activityStatus === "past";
              const ongoing = isOngoing(
                activity.tanggal,
                activity.jam_mulai,
                activity.jam_selesai,
              );
              const showPresence = canFillPresence(
                activity.tanggal,
                activity.jam_selesai,
              );

              return (
                <article
                  key={activity.id}
                  className="flex-shrink-0 w-[700px] rounded-xl border border-gray-200 dark:border-gray-700 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden group flex"
                >
                  {/* Banner Image - Left Side */}
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

                    {/* Labels: jenis kiri atas, badge kanan atas */}
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

                  {/* Content - Right Side */}
                  <div className="flex-1 p-5 space-y-2 flex flex-col">
                    {/* Title */}
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

                    {/* Date & Time */}
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
                              "internal" && memuatPegawai && (
                              <span className="text-gray-400 italic">
                                Memuat nama pegawai...
                              </span>
                            )}
                            {!memuatPegawai && ((activity.asal_narasumber || "").toLowerCase() ===
                              "internal"
                              ? resolvePegawaiName(activity.narasumber) ||
                                activity.narasumber?.nama ||
                                activity.narasumber
                              : activity.narasumber)}
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
                              "internal" && memuatPegawai && (
                              <span className="text-gray-400 italic">
                                Memuat nama pegawai...
                              </span>
                            )}
                            {!memuatPegawai && ((activity.asal_moderator || "").toLowerCase() ===
                              "internal"
                              ? resolvePegawaiName(activity.moderator) ||
                                activity.moderator?.nama ||
                                activity.moderator
                              : activity.moderator)}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Tempat / Link */}
                    {activity.tempat && (
                      <div className="flex items-start gap-2 text-sm">
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

                    {/* Survey Button + note + certificate */}
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
                                        handleFillPresence(activity.id)
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
        )}

        {/* Empty State */}
        {!isLoading && filteredActivities.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20">
            <FontAwesomeIcon
              icon={faCalendarAlt}
              className="h-24 w-24 text-gray-400 dark:text-gray-600 mb-4"
            />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Tidak Ada Kegiatan
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Tidak ada kegiatan untuk filter yang dipilih
            </p>
          </div>
        )}
      </div>
      {/* Full-size banner modal (match KegiatanList) */}
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
    </MainLayout>
  );
}

export default ActivitiesList;
