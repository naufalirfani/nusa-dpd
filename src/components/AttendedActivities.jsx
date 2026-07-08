import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getKegiatanPegawai, getPegawai } from "../config/api";
import SurveyResultsModal from "./SurveyResultsModal";
import MainLayout from "./MainLayout";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { createPortal } from "react-dom";
import {
  faDownload,
  faImage,
  faSearch,
  faSync,
  faFileAlt,
  faSpinner,
  faChevronLeft,
  faChevronRight,
  faCogs,
  faAnglesLeft,
  faAnglesRight,
} from "@fortawesome/free-solid-svg-icons";
import SearchableSelect from "./SearchableSelect";
import { regenerateCertificate } from "../config/api";

let pegawaiCache = null;
let pegawaiPromise = null;

function AttendedActivities() {
  const navigate = useNavigate();
  const [activities, setActivities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
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
  const [nip, setNip] = useState("-99");
  const [memuatPegawai, setMemuatPegawai] = useState(true);

  useEffect(() => {
    loadUserNip();
  }, []);

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 450);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // Load pegawai map for resolving internal names
  useEffect(() => {
    if (!nip || nip === "-99") {
      if (!nip) setMemuatPegawai(false);
      return;
    }

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

  // Consolidated fetch trigger: when debouncedSearch, perPage, or userNip change,
  // reset page to 1 (to avoid fetching wrong page). When currentPage changes,
  // fetch as usual.
  const prevQueryRef = useRef("");
  useEffect(() => {
    const queryKey = `${debouncedSearch}|${perPage}|${userNip}`;
    const shouldReset = prevQueryRef.current !== queryKey;
    prevQueryRef.current = queryKey;

    if (shouldReset && currentPage !== 1) {
      setCurrentPage(1);
      return; // wait for page effect
    }

    if (userNip) {
      fetchAttendedActivities();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, perPage, currentPage, userNip]);

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
      const params = {
        nip: userNip,
        page: currentPage,
        per_page: perPage,
      };

      if (debouncedSearch) params.q = debouncedSearch;

      const response = await getKegiatanPegawai(params);

      if (response && response.data) {
        const payload = response.data;
        const items = Array.isArray(payload.data) ? payload.data : [];

        setActivities(items);

        setNip(
          items
            .flatMap((item) => [
              item.asal_narasumber === "Internal" ? item.narasumber : null,
              item.asal_moderator === "Internal" ? item.moderator : null,
            ])
            .filter(Boolean)
            .join(","),
        );

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
                confirmButtonColor: "#3085d6",
                cancelButtonColor: "#d33",
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
            confirmButtonColor: "#3085d6",
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
          confirmButtonColor: "#3085d6",
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
      setSurveyData({
        ...data,
        kegiatan: data?.kegiatan || attendedRecord?.kegiatan,
      });
    } catch (e) {
      console.error("Failed to fetch survey results", e);
      setSurveyData(attendedRecord);
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
      const fallback = `${BE_URL}/download/${encodeURIComponent(activityId)}`;
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
      <div className="mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="border-l-4 border-teal-500 pl-4">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Riwayat Kegiatan
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Kegiatan yang pernah Anda ikuti
            </p>
          </div>
        </div>
        {/* Loading State handled inside table so header/search remain visible */}

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-md overflow-hidden">
          {/* Search and Filters */}
          <div className="bg-white rounded-2xl p-6 mb-4">
            <div className="flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cari Kegiatan
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari nama kegiatan dan judul atau tema..."
                    className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                  />
                  <FontAwesomeIcon
                    icon={faSearch}
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tampilkan
                </label>
                <SearchableSelect
                  value={perPage}
                  clearable={false}
                  onChange={(e) => {
                    setPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  options={[
                    { value: 10, label: "10" },
                    { value: 25, label: "25" },
                    { value: 50, label: "50" },
                    { value: 100, label: "100" },
                  ]}
                  placeholder="Pilih jumlah data"
                />
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="text-teal-500">
                <tr style={{ backgroundColor: "#fbfdfe" }}>
                  <th className="px-6 py-4 text-left text-sm font-bold text-center">
                    No
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-center">
                    Banner
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-center">
                    Nama Kegiatan
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-center">
                    Jenis
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-center">
                    Tanggal
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-center">
                    Narasumber
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-center">
                    Moderator
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-bold">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {isLoading ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-12 text-center">
                      <div className="flex items-center justify-center gap-3">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-500 border-t-transparent"></div>
                        <p className="text-sm text-gray-600">
                          Memuat kegiatan...
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : paginatedActivities.length === 0 ? (
                  <tr>
                    <td
                      colSpan="8"
                      className="px-6 py-12 text-center text-gray-500"
                    >
                      <div className="flex flex-col items-center">
                        <div className="text-5xl mb-3">
                          <FontAwesomeIcon
                            icon={faFileAlt}
                            className="text-gray-300"
                          />
                        </div>
                        <p className="text-lg font-medium">
                          Tidak ada kegiatan
                        </p>
                        <p className="text-sm">
                          Anda belum pernah mengikuti kegiatan apapun
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedActivities.map((activity, index) => (
                    <tr
                      key={activity.id}
                      className="hover:bg-teal-50 transition-colors duration-150"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {(currentPage - 1) * perPage + index + 1}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div className="w-16 h-20 rounded overflow-hidden bg-gray-100 flex items-center justify-center">
                          {activity.kegiatan?.banner ? (
                            <img
                              src={getBannerUrl(activity.kegiatan.banner)}
                              alt={activity.kegiatan?.nama_kegiatan || "banner"}
                              onClick={() =>
                                setSelectedBanner(
                                  getBannerUrl(activity.kegiatan.banner),
                                )
                              }
                              className="h-full w-full object-cover cursor-pointer hover:opacity-90"
                            />
                          ) : (
                            <FontAwesomeIcon
                              icon={faImage}
                              className="text-gray-300 text-2xl"
                            />
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div>
                          <p className="font-medium">
                            {activity.kegiatan?.nama_kegiatan ||
                              "Nama tidak tersedia"}
                          </p>
                          {activity.kegiatan?.judul_tema && (
                            <p className="text-xs text-gray-600 mt-1">
                              "{activity.kegiatan.judul_tema}"
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold text-teal-800">
                          {activity.kegiatan?.jenis_kegiatan || "Kegiatan"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {activity.kegiatan?.tanggal
                          ? formatDate(activity.kegiatan.tanggal)
                          : "-"}
                        <br />
                        {activity.kegiatan?.jam_mulai &&
                        activity.kegiatan?.jam_selesai
                          ? `${formatTime(activity.kegiatan.jam_mulai)} - ${formatTime(activity.kegiatan.jam_selesai)} WIB`
                          : "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {(() => {
                          const asal = (
                            activity.kegiatan?.asal_narasumber || ""
                          ).toLowerCase();
                          if (asal === "internal" && memuatPegawai) {
                            return (
                              <span className="text-gray-400 italic">
                                Memuat nama pegawai...
                              </span>
                            );
                          }
                          if (asal === "internal") {
                            return (
                              resolvePegawaiName(
                                activity.kegiatan?.narasumber,
                              ) ||
                              activity.kegiatan?.narasumber ||
                              "-"
                            );
                          }
                          return activity.kegiatan?.narasumber || "-";
                        })()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {(() => {
                          const asal = (
                            activity.kegiatan?.asal_moderator || ""
                          ).toLowerCase();
                          if (asal === "internal" && memuatPegawai) {
                            return (
                              <span className="text-gray-400 italic">
                                Memuat nama pegawai...
                              </span>
                            );
                          }
                          if (asal === "internal") {
                            return (
                              resolvePegawaiName(
                                activity.kegiatan?.moderator,
                              ) ||
                              activity.kegiatan?.moderator ||
                              "-"
                            );
                          }
                          return activity.kegiatan?.moderator || "-";
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
                                className="inline-flex items-center gap-2 rounded-lg bg-teal-500 px-3 py-2 text-xs font-medium text-white hover:bg-teal-600 transition shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Unduh Sertifikat"
                              >
                                <FontAwesomeIcon
                                  icon={
                                    certLoading[activity.id]
                                      ? faSpinner
                                      : faDownload
                                  }
                                  spin={!!certLoading[activity.id]}
                                  className="h-4 w-4"
                                />
                                {certLoading[activity.id]
                                  ? "Mengunduh..."
                                  : "Unduh Sertifikat"}
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() =>
                                handleRegenerateCertificate(activity.id)
                              }
                              disabled={!!certLoading[activity.id]}
                              className="inline-flex items-center gap-2 rounded-lg bg-teal-500 px-3 py-2 text-xs font-medium text-white hover:bg-teal-600 transition shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Generate Sertifikat"
                            >
                              <FontAwesomeIcon
                                icon={
                                  certLoading[activity.id] ? faSpinner : faCogs
                                }
                                spin={!!certLoading[activity.id]}
                                className="h-4 w-4"
                              />
                              {certLoading[activity.id]
                                ? "Memproses..."
                                : "Generate"}
                            </button>
                          )}

                          {activity.isi_form && (
                            <button
                              onClick={() => openSurvey(activity)}
                              className="inline-flex items-center gap-2 rounded-lg bg-white text-gray-700 border border-gray-200 px-3 py-2 text-xs font-medium hover:bg-gray-100 transition"
                              title="Lihat Survei"
                            >
                              <FontAwesomeIcon
                                icon={faFileAlt}
                                className="h-4 w-4"
                              />
                              Lihat Survei
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 0 && (
            <div className="px-3 py-4 bg-gradient-to-r from-white to-white dark:from-gray-800 dark:to-gray-800 border-t border-gray-200 dark:border-gray-700">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Halaman{" "}
                  <span className="font-semibold text-gray-900 dark:text-gray-100">
                    {currentPage}
                  </span>{" "}
                  dari{" "}
                  <span className="font-semibold text-gray-900 dark:text-gray-100">
                    {totalPages}
                  </span>{" "}
                  - Menampilkan{" "}
                  <span className="font-semibold text-gray-900 dark:text-gray-100">
                    {(currentPage - 1) * perPage + 1}
                  </span>{" "}
                  -{" "}
                  <span className="font-semibold text-gray-900 dark:text-gray-100">
                    {Math.min(currentPage * perPage, totalItems)}
                  </span>{" "}
                  dari{" "}
                  <span className="font-semibold text-gray-900 dark:text-gray-100">
                    {totalItems}
                  </span>{" "}
                  kegiatan
                </div>
                <div className="flex items-center gap-2 flex-wrap justify-end">
                  {/* First Page */}
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className={`p-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-teal-500/10 dark:hover:bg-gray-600 hover:border-teal-500/50 dark:hover:border-teal-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm cursor-pointer ${
                      currentPage === 1 ? "opacity-40 cursor-not-allowed" : ""
                    }`}
                    title="Halaman Pertama"
                  >
                    <FontAwesomeIcon icon={faAnglesLeft} className="w-4 h-4" />
                  </button>

                  {/* Previous Page */}
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className={`p-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-teal-500/10 dark:hover:bg-gray-600 hover:border-teal-500/50 dark:hover:border-teal-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm cursor-pointer ${
                      currentPage === 1 ? "opacity-40 cursor-not-allowed" : ""
                    }`}
                  >
                    <FontAwesomeIcon icon={faChevronLeft} className="w-4 h-4" />
                  </button>

                  {/* Page Numbers */}
                  <div className="hidden sm:flex items-center gap-1">
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
                            className={`min-w-[2.5rem] px-3 py-2 rounded-lg text-sm font-semibold transition-all shadow-sm ${
                              currentPage === pageNum
                                ? "bg-gradient-to-r from-teal-500 to-teal-500 text-white shadow-md scale-105 cursor-pointer"
                                : "text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-teal-500/10 dark:hover:bg-gray-600 hover:border-teal-500/50 dark:hover:border-teal-500 cursor-pointer"
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
                          <span key={pageNum} className="px-2 text-gray-500">
                            ...
                          </span>
                        );
                      }
                      return null;
                    })}
                  </div>

                  {/* Next Page */}
                  <button
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                    disabled={currentPage === totalPages}
                    className={`p-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-teal-500/10 dark:hover:bg-gray-600 hover:border-teal-500/50 dark:hover:border-teal-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm cursor-pointer ${
                      currentPage === totalPages
                        ? "opacity-40 cursor-not-allowed"
                        : ""
                    }`}
                  >
                    <FontAwesomeIcon
                      icon={faChevronRight}
                      className="w-4 h-4"
                    />
                  </button>

                  {/* Last Page */}
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className={`p-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-teal-500/10 dark:hover:bg-gray-600 hover:border-teal-500/50 dark:hover:border-teal-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm cursor-pointer ${
                      currentPage === totalPages
                        ? "opacity-40 cursor-not-allowed"
                        : ""
                    }`}
                    title="Halaman Terakhir"
                  >
                    <FontAwesomeIcon icon={faAnglesRight} className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
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
        <SurveyResultsModal
          open={surveyModalOpen}
          onClose={closeSurvey}
          loading={surveyLoading}
          data={surveyData}
        />
      </div>
    </MainLayout>
  );
}

export default AttendedActivities;
