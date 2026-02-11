import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getKegiatanPegawai, regenerateCertificate, getPegawai, getKegiatanPegawaiById } from "../config/api";
import SurveyResultsModal from "./SurveyResultsModal";
import MainLayout from "./MainLayout";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { createPortal } from "react-dom";
import {
  faDownload,
  faImage,
  faSync,
  faFileAlt,
  faSpinner,
  faChevronLeft,
  faChevronRight,
  faCogs,
} from "@fortawesome/free-solid-svg-icons";

function AttendedActivities() {
  const navigate = useNavigate();
  const [activities, setActivities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [userNip, setUserNip] = useState("");
  const [pegawaiMap, setPegawaiMap] = useState({});
  const [surveyModalOpen, setSurveyModalOpen] = useState(false);
  const [surveyLoading, setSurveyLoading] = useState(false);
  const [surveyData, setSurveyData] = useState(null);
  const [certLoading, setCertLoading] = useState({});
  const [selectedBanner, setSelectedBanner] = useState(null);

  useEffect(() => {
    loadUserNip();
  }, []);

  // Load pegawai map for resolving internal names
  const pegawaiFetchedRef = useRef(false);
  useEffect(() => {
    if (pegawaiFetchedRef.current) return;
    pegawaiFetchedRef.current = true;
    let mounted = true;
    (async () => {
      try {
        const p = await getPegawai();
        if (mounted) return;
        if (Array.isArray(p)) {
          const map = {};
          p.forEach((x) => {
            const name = x.name || x.nama || x.fullname || x.username || x.email || x.nip || "";
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
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (userNip) {
      fetchAttendedActivities();
    }
  }, [userNip, currentPage]);

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

  function loadUserNip() {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/login");
        return;
      }
      const payload = parseJwtPayload(token) || {};
      const nip = payload.nip || "-";
      setUserNip(nip);
    } catch (e) {
      console.error("Failed to get user NIP", e);
      navigate("/login");
    }
  }

  async function fetchAttendedActivities() {
    try {
      setIsLoading(true);
      const response = await getKegiatanPegawai({
        nip: userNip,
        page: currentPage,
        per_page: perPage,
      });

      if (response && response.data) {
        const payload = response.data;
        const items = Array.isArray(payload.data) ? payload.data : [];

        setActivities(items);

        const pages =
          payload.last_page ||
          Math.ceil(
            (payload.total || items.length) / (payload.per_page || perPage),
          );
        setTotalPages(pages);
        setTotalItems(payload.total || items.length);

        if (payload.per_page) setPerPage(payload.per_page);
        if (payload.current_page && payload.current_page !== currentPage)
          setCurrentPage(payload.current_page);
      }
    } catch (error) {
      console.error("Failed to fetch attended activities:", error);
    } finally {
      setIsLoading(false);
    }
  }

  function formatDate(dateString) {
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(date);
    } catch (error) {
      return dateString;
    }
  }

  const formatTime = (timeString) => {
    if (!timeString) return "-";
    try {
      if (typeof timeString === "string") {
        // Match HH:MM at start (handles HH:MM:SS and HH:MM)
        const m = timeString.match(/^(\d{2}:\d{2})/);
        if (m) return m[1];
        // ISO datetime like 2023-01-01T08:30:00
        const m2 = timeString.match(/T(\d{2}:\d{2})/);
        if (m2) return m2[1];
        const d = new Date(timeString);
        if (!isNaN(d)) return d.toTimeString().slice(0, 5);
        return timeString;
      }
      if (timeString instanceof Date && !isNaN(timeString)) {
        return timeString.toTimeString().slice(0, 5);
      }
      return String(timeString).slice(0, 5);
    } catch {
      return timeString;
    }
  };

  const BE_URL = import.meta.env.VITE_BE_URL || "http://localhost:8000";

  const getBannerUrl = (banner) => {
    if (!banner) return null;
    if (banner.startsWith("http")) return banner;
    return `${BE_URL}/storage/${banner}`;
  };

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
                confirmButtonColor: "#10b981",
                cancelButtonColor: "#6b7280",
                reverseButtons: true,
              })
            ).isConfirmed
          : confirm("Apakah Anda yakin ingin regenerate sertifikat?");

      if (!confirmed) return;

      setCertLoading((s) => ({ ...s, [activityPegawaiId]: true }));
      const response = await regenerateCertificate(activityPegawaiId);

      if (response) {
        if (typeof window.Swal !== "undefined") {
          await window.Swal.fire({
            icon: "success",
            title: "Berhasil",
            text: "Sertifikat berhasil di-regenerate",
          });
        }
        fetchAttendedActivities();
      }
    } catch (error) {
      console.error("Failed to regenerate certificate:", error);
      const errorMessage = error.message || "Gagal regenerate sertifikat";
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
      setCertLoading((s) => {
        const copy = { ...s };
        delete copy[activityPegawaiId];
        return copy;
      });
    }
  }

  async function openSurvey(attendedRecord) {
    if (!attendedRecord || !attendedRecord.id) return;
    setSurveyModalOpen(true);
    setSurveyLoading(true);
    try {
      const res = await getKegiatanPegawaiById(attendedRecord.id);
      const data = res && (res.data || res);
      setSurveyData(data);
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

  function handleDownloadCertificate(activityId, certificateUrl) {
    if (!certificateUrl) {
      if (typeof window.Swal !== "undefined") {
        window.Swal.fire({
          icon: "warning",
          title: "Tidak Tersedia",
          text: "Sertifikat belum tersedia untuk kegiatan ini",
        });
      } else {
        alert("Sertifikat belum tersedia untuk kegiatan ini");
      }
      return;
    }

    try {
      setCertLoading((s) => ({ ...s, [activityId]: true }));
      const final = `${BE_URL}/api/media/download/${encodeURIComponent(certificateUrl)}`;
      // navigate in the same tab instead of opening a new tab
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

  // Backend already returns a paginated page of activities, so use as-is
  const paginatedActivities = activities;

  const pageNumbers = [];
  for (let i = 1; i <= totalPages; i++) {
    pageNumbers.push(i);
  }

  return (
    <MainLayout>
      <div className="mx-auto px-4 sm:px-6 lg:px-12 py-8">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Riwayat Kegiatan
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Kegiatan yang pernah Anda ikuti
          </p>
        </div>
        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-600 border-t-transparent"></div>
              <p className="text-gray-600 dark:text-gray-300">
                Memuat riwayat kegiatan...
              </p>
            </div>
          </div>
        )}

        {/* Table */}
        {!isLoading && activities.length > 0 && (
          <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      No
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Banner
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Nama Kegiatan
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Jenis
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Tanggal
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Narasumber
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {paginatedActivities.map((activity, index) => (
                    <tr
                      key={activity.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {(currentPage - 1) * perPage + index + 1}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                        <div className="w-16 h-20 rounded overflow-hidden bg-gray-100 flex items-center justify-center">
                          {activity.kegiatan?.banner ? (
                            <img
                              src={getBannerUrl(activity.kegiatan.banner)}
                              alt={activity.kegiatan?.nama_kegiatan || "banner"}
                              onClick={() => setSelectedBanner(getBannerUrl(activity.kegiatan.banner))}
                              className="h-full w-full object-cover cursor-pointer hover:opacity-90"
                            />
                          ) : (
                            <FontAwesomeIcon icon={faImage} className="text-gray-300 text-2xl" />
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                        <div>
                          <p className="font-medium">
                            {activity.kegiatan?.nama_kegiatan ||
                              "Nama tidak tersedia"}
                          </p>
                          {activity.kegiatan?.judul_tema && (
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                              "{activity.kegiatan.judul_tema}"
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center rounded-full bg-teal-100 dark:bg-teal-900/30 px-3 py-1 text-xs font-medium text-teal-800 dark:text-teal-300">
                          {activity.kegiatan?.jenis_kegiatan || "Kegiatan"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                        {activity.kegiatan?.tanggal
                          ? formatDate(activity.kegiatan.tanggal)
                          : "-"}
                        <br />
                        {activity.kegiatan?.jam_mulai &&
                        activity.kegiatan?.jam_selesai
                          ? `${formatTime(activity.kegiatan.jam_mulai)} - ${formatTime(activity.kegiatan.jam_selesai)} WIB`
                          : "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                        {(() => {
                          const asal = (activity.kegiatan?.asal_narasumber || "").toLowerCase();
                          if (asal === "internal") {
                            return (
                              resolvePegawaiName(activity.kegiatan?.narasumber) || activity.kegiatan?.narasumber || "-"
                            );
                          }
                          return activity.kegiatan?.narasumber || "-";
                        })()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-2">
                          {activity.link_sertifikat ? (
                            <>
                              <button
                                onClick={() =>
                                  handleDownloadCertificate(
                                    activity.id,
                                    activity.link_sertifikat,
                                  )
                                }
                                disabled={!!certLoading[activity.id]}
                                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-700 transition shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Download Sertifikat"
                              >
                                <FontAwesomeIcon
                                  icon={certLoading[activity.id] ? faSpinner : faDownload}
                                  spin={!!certLoading[activity.id]}
                                  className="h-4 w-4"
                                />
                                {certLoading[activity.id] ? "Mengunduh..." : "Download Sertifikat"}
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() =>
                                handleRegenerateCertificate(activity.id)
                              }
                              disabled={!!certLoading[activity.id]}
                              className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-3 py-2 text-xs font-medium text-white hover:bg-teal-700 transition shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Generate Sertifikat"
                            >
                              <FontAwesomeIcon
                                icon={certLoading[activity.id] ? faSpinner : faCogs}
                                spin={!!certLoading[activity.id]}
                                className="h-4 w-4"
                              />
                              {certLoading[activity.id] ? "Memproses..." : "Generate"}
                            </button>
                          )}

                          {activity.isi_form && (
                            <button
                              onClick={() => openSurvey(activity)}
                              className="inline-flex items-center gap-2 rounded-lg bg-white text-gray-700 border border-gray-200 px-3 py-2 text-xs font-medium hover:bg-gray-100 transition"
                              title="Lihat Survei"
                            >
                              <FontAwesomeIcon icon={faFileAlt} className="h-4 w-4" />
                              Lihat Survei
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Menampilkan {(currentPage - 1) * perPage + 1} -{" "}
                    {Math.min(currentPage * perPage, totalItems)} dari{" "}
                    {totalItems} kegiatan
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="inline-flex items-center gap-1 rounded-lg bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                      <FontAwesomeIcon
                        icon={faChevronLeft}
                        className="h-4 w-4"
                      />
                      Prev
                    </button>

                    {pageNumbers.map((pageNum) => {
                      // Show first, last, current, and adjacent pages
                      if (
                        pageNum === 1 ||
                        pageNum === totalPages ||
                        (pageNum >= currentPage - 1 &&
                          pageNum <= currentPage + 1)
                      ) {
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setCurrentPage(pageNum)}
                            className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                              currentPage === pageNum
                                ? "bg-teal-600 text-white"
                                : "bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600"
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      } else if (
                        pageNum === currentPage - 2 ||
                        pageNum === currentPage + 2
                      ) {
                        return (
                          <span
                            key={pageNum}
                            className="px-2 text-gray-500 dark:text-gray-400"
                          >
                            ...
                          </span>
                        );
                      }
                      return null;
                    })}

                    <button
                      onClick={() =>
                        setCurrentPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={currentPage === totalPages}
                      className="inline-flex items-center gap-1 rounded-lg bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                      Next
                      <FontAwesomeIcon
                        icon={faChevronRight}
                        className="h-4 w-4"
                      />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && activities.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20">
            <FontAwesomeIcon
              icon={faFileAlt}
              className="h-24 w-24 text-gray-400 dark:text-gray-600 mb-4"
            />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Belum Ada Riwayat
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Anda belum pernah mengikuti kegiatan apapun
            </p>
            <button
              onClick={() => navigate("/")}
              className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-6 py-3 text-sm font-medium text-white hover:bg-teal-700 transition"
            >
              Lihat Kegiatan Tersedia
            </button>
          </div>
        )}
        {typeof document !== "undefined" && selectedBanner
          ? createPortal(
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60"
                onClick={() => setSelectedBanner(null)}
              >
                <div className="max-w-[95%] max-h-[95%] p-4">
                  <img
                    src={selectedBanner}
                    alt="Banner full size"
                    onClick={(e) => e.stopPropagation()}
                    className="max-w-full max-h-[80vh] mx-auto rounded shadow-md"
                  />
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
            )
          : null}
        <SurveyResultsModal open={surveyModalOpen} onClose={closeSurvey} loading={surveyLoading} data={surveyData} />
      </div>
    </MainLayout>
  );
}

export default AttendedActivities;
