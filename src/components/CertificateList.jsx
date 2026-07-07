import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faDownload,
  faEye,
  faSearch,
  faSort,
  faSortUp,
  faSortDown,
  faArrowLeft,
  faSpinner,
  faChevronLeft,
  faChevronRight,
  faAnglesLeft,
  faAnglesRight,
  faFileAlt,
  faCogs,
} from "@fortawesome/free-solid-svg-icons";
import SearchableSelect from "./SearchableSelect";
import Header from "./Header";
import Footer from "./Footer";
import { getKegiatanPegawai, regenerateCertificate, getKegiatanById } from "../config/api";

const BE_URL = import.meta.env.VITE_BE_URL || "http://localhost:8000";

// Track in-flight requests by key to avoid duplicate network calls
// (useful in development with React StrictMode remounting components).
const inFlightRequests = new Set();

function CertificateList() {
  const { kegiatan_id } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [sortField, setSortField] = useState("");
  const [sortOrder, setSortOrder] = useState("asc");
  const [kegiatanInfo, setKegiatanInfo] = useState(null);
  const [downloadLoading, setDownloadLoading] = useState({});
  const [certLoading, setCertLoading] = useState({});
  const prevQueryRef = useRef("");
  const isInitialLoadRef = useRef(true);

  // Fetch kegiatan info when kegiatan_id changes
  useEffect(() => {
    if (!kegiatan_id) return;

    let isMounted = true;
    const fetchKegiatanInfo = async () => {
      try {
        const response = await getKegiatanById(kegiatan_id);
        if (isMounted) {
          const kegiatanPayload =
            response && response.data
              ? response.data
              : response;
          setKegiatanInfo(kegiatanPayload);
        }
      } catch (err) {
        console.error("Error loading kegiatan info:", err);
      }
    };

    fetchKegiatanInfo();
    return () => {
      isMounted = false;
    };
  }, [kegiatan_id]);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch certificates: consolidate triggers to avoid duplicate calls.
  // Behavior:
  // - When query params (debouncedSearch, sortField, sortOrder, perPage, kegiatan_id)
  //   change, reset `currentPage` to 1 if it's not already 1. If it is 1, fetch.
  // - When `currentPage` changes, fetch.
  useEffect(() => {
    const queryKey = `${debouncedSearch}|${sortField}|${sortOrder}|${perPage}|${kegiatan_id}`;

    const shouldFetchAfterReset = prevQueryRef.current !== queryKey;
    prevQueryRef.current = queryKey;

    if (shouldFetchAfterReset && currentPage !== 1) {
      setCurrentPage(1);
      return; // wait for currentPage effect to trigger fetch
    }

    // Otherwise fetch immediately
    fetchCertificates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    debouncedSearch,
    sortField,
    sortOrder,
    perPage,
    currentPage,
    kegiatan_id,
  ]);

  const fetchCertificates = async () => {
    try {
      // Build a request key from current params
      const reqKey = `${kegiatan_id}|${currentPage}|${perPage}|${debouncedSearch}|${sortField}|${sortOrder}`;

      // If there's already an identical in-flight request, skip executing another.
      if (inFlightRequests.has(reqKey)) return;

      inFlightRequests.add(reqKey);

      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        kegiatan_id: kegiatan_id,
        page: currentPage,
        per_page: perPage,
      });

      if (debouncedSearch) {
        params.append("q", debouncedSearch);
      }

      if (sortField) {
        params.append("sort", sortField);
        params.append("order", sortOrder);
      }

      const response = await getKegiatanPegawai({
        kegiatan_id: kegiatan_id,
        page: currentPage,
        per_page: perPage,
        sort: sortField,
        order: sortOrder,
        q: debouncedSearch,
      });

      if (!response.success) {
        throw new Error("Failed to fetch certificates");
      }

      if (response) {
        setData(response.data.data || []);
        setTotalPages(response.data.last_page || 1);
        setTotalRecords(response.data.total || 0);
      } else {
        throw new Error(response.message || "Failed to fetch data");
      }

      setLoading(false);
    } catch (err) {
      console.error("Error fetching certificates:", err);
      setError(err.message || "Terjadi kesalahan saat mengambil data");
      setLoading(false);
    } finally {
      // ensure we always clear the in-flight marker
      const reqKey = `${kegiatan_id}|${currentPage}|${perPage}|${debouncedSearch}|${sortField}|${sortOrder}`;
      inFlightRequests.delete(reqKey);
      isInitialLoadRef.current = false;
    }
  };

  // Handle sorting with three states: asc → desc → default (no sort)
  const handleSort = (field) => {
    if (sortField === field) {
      if (sortOrder === "asc") {
        setSortOrder("desc");
      } else {
        // Reset to default (no sort)
        setSortField("");
        setSortOrder("asc");
      }
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const getSortIcon = (field) => {
    if (sortField !== field) {
      return <FontAwesomeIcon icon={faSort} className="ml-1 text-gray-400" />;
    }
    return (
      <FontAwesomeIcon
        icon={sortOrder === "asc" ? faSortUp : faSortDown}
        className="ml-1"
      />
    );
  };

  const handleDownload = (itemId) => {
    if (!itemId) return;
    try {
      setDownloadLoading((prev) => ({ ...prev, [itemId]: true }));
      const url = `${BE_URL}/api/sertifikat/download/${encodeURIComponent(itemId)}`;
      window.location.href = url;
      setTimeout(() => {
        setDownloadLoading((prev) => {
          const copy = { ...prev };
          delete copy[itemId];
          return copy;
        });
      }, 1000);
    } catch (error) {
      console.error("Download failed:", error);
      setDownloadLoading((prev) => {
        const copy = { ...prev };
        delete copy[itemId];
        return copy;
      });
    }
  };

  const handlePreview = (linkSertifikat) => {
    if (!linkSertifikat) return;
    const url = `${BE_URL}/storage/${linkSertifikat}`;
    window.open(url, "_blank");
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
        fetchCertificates();
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

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat("id-ID", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(date);
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return "";
    return timeStr.substring(0, 5); // Get HH:MM from HH:MM:SS
  };

  const renderPagination = () => {
    const pages = [];
    const maxVisible = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);

    if (endPage - startPage < maxVisible - 1) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <button
          key={i}
          onClick={() => setCurrentPage(i)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${currentPage === i
            ? "bg-teal-500 text-white shadow-md"
            : "bg-white text-gray-700 hover:bg-teal-50 border border-gray-300"
            }`}
        >
          {i}
        </button>,
      );
    }

    return pages;
  };

  // NOTE: Do not early-return when loading so header and search remain visible.

  if (error) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-gray-700/50">
        <Header showProfile={false} showLogout={false} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center bg-white p-8 rounded-2xl shadow-md max-w-md">
            <div className="text-5xl mb-4">⚠️</div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">
              Terjadi Kesalahan
            </h2>
            <p className="text-sm text-gray-600 mb-4">{error}</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-gray-700/50">
      <Header showProfile={false} showLogout={false} />
      <div className="flex-1 py-8 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="bg-white rounded-2xl shadow-md p-6 border-l-4 border-teal-500">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Daftar Sertifikat
              </h1>
              {loading && (
                <div className="flex items-center gap-3 mt-4">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-500 border-t-transparent"></div>
                  <p className="text-sm text-gray-600">Memuat data...</p>
                </div>
              )}
              {kegiatanInfo && (
                <div className="text-gray-600">
                  <p className="text-lg font-semibold text-teal-500">
                    {kegiatanInfo.nama_kegiatan}
                  </p>
                  {kegiatanInfo.judul_tema && (
                    <p className="text-sm italic">
                      " {kegiatanInfo.judul_tema}"
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                      <span className="font-medium">
                        {formatDate(kegiatanInfo.tanggal)}
                      </span>
                    </div>
                    {(kegiatanInfo.jam_mulai || kegiatanInfo.jam_selesai) && (
                      <>
                        <span className="text-gray-400">•</span>
                        <div className="flex items-center gap-2">
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          <span className="font-medium">
                            {formatTime(kegiatanInfo.jam_mulai)} -{" "}
                            {formatTime(kegiatanInfo.jam_selesai)} WIB
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Search and Filters */}
          <div className="bg-white rounded-2xl shadow-md p-6 mb-6">
            <div className="flex flex-col md:flex-row gap-4 items-end">
              {/* Search */}
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cari Data
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari nama, NIP, jabatan, atau unit kerja..."
                    className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                  />
                  <FontAwesomeIcon
                    icon={faSearch}
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400"
                  />
                </div>
              </div>

              {/* Per Page */}
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
                    { value: 75, label: "75" },
                    { value: 100, label: "100" },
                  ]}
                  placeholder="Pilih jumlah data"
                />
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="text-teal-500">
                  <tr style={{ backgroundColor: "#fbfdfe" }}>
                    <th className="px-4 py-3 text-left text-sm font-bold">
                      No
                    </th>
                    <th
                      className="px-4 py-3 text-left text-sm font-bold cursor-pointer hover:bg-teal-50 transition-colors"
                      onClick={() => handleSort("nama_lengkap")}
                    >
                      <div className="flex items-center font-bold">
                        Nama Lengkap
                        {getSortIcon("nama_lengkap")}
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-left text-sm font-bold cursor-pointer hover:bg-teal-50 transition-colors"
                      onClick={() => handleSort("nip_no_absen")}
                    >
                      <div className="flex items-center font-bold">
                        NIP/No. Absen/No. Identitas Lain
                        {getSortIcon("nip_no_absen")}
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-left text-sm font-bold cursor-pointer hover:bg-teal-50 transition-colors"
                      onClick={() => handleSort("jabatan")}
                    >
                      <div className="flex items-center font-bold">
                        Jabatan
                        {getSortIcon("jabatan")}
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-left text-sm font-bold cursor-pointer hover:bg-teal-50 transition-colors"
                      onClick={() => handleSort("unit_kerja")}
                    >
                      <div className="flex items-center font-bold">
                        Unit Kerja
                        {getSortIcon("unit_kerja")}
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-left text-sm font-bold cursor-pointer hover:bg-teal-50 transition-colors"
                      onClick={() => handleSort("status_pegawai")}
                    >
                      <div className="flex items-center font-bold">
                        Status
                        {getSortIcon("status_pegawai")}
                      </div>
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-bold">
                      Sertifikat
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {loading ? (
                    <tr>
                      <td colSpan="7" className="px-6 py-12 text-center">
                        <div className="flex items-center justify-center gap-3">
                          <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-500 border-t-transparent"></div>
                          <p className="text-sm text-gray-600">
                            Memuat sertifikat...
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : data.length === 0 ? (
                    <tr>
                      <td
                        colSpan="7"
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
                            Tidak ada data sertifikat
                          </p>
                          <p className="text-sm">
                            Belum ada peserta yang terdaftar untuk kegiatan ini
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    data.map((item, index) => (
                      <tr
                        key={item.id}
                        className="hover:bg-teal-50 transition-colors duration-150"
                      >
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {(currentPage - 1) * perPage + index + 1}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {item.isi_form?.nama_lengkap || "-"}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {item.isi_form?.nip_no_absen || "-"}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          <div
                            className="max-w-xs"
                            title={item.isi_form?.jabatan || "-"}
                          >
                            {item.isi_form?.jabatan || "-"}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          <div
                            className="max-w-xs"
                            title={item.isi_form?.unit_kerja || "-"}
                          >
                            {item.isi_form?.unit_kerja || "-"}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold ${item.isi_form?.status_pegawai === "PNS"
                              ? "bg-teal-100 text-teal-600"
                              : item.isi_form?.status_pegawai === "CPNS"
                                ? "bg-blue-100 text-blue-600"
                                : "bg-gray-100 text-gray-600"
                              }`}
                          >
                            {item.isi_form?.status_pegawai || "-"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div className="flex items-center justify-center gap-2">
                            {item.link_sertifikat ? (
                              <>
                                <button
                                  onClick={() =>
                                    handlePreview(item.link_sertifikat)
                                  }
                                  className="p-2 rounded-lg transition-all duration-200 bg-blue-100 text-blue-600 hover:bg-blue-200 hover:shadow-md"
                                  title="Preview Sertifikat"
                                >
                                  <FontAwesomeIcon icon={faEye} />
                                </button>
                                <button
                                  onClick={() => handleDownload(item.id)}
                                  disabled={downloadLoading[item.id]}
                                  className={`p-2 rounded-lg transition-all duration-200 ${!downloadLoading[item.id]
                                    ? "bg-teal-100 text-teal-500 hover:bg-teal-200 hover:shadow-md"
                                    : "bg-gray-100 text-gray-400 cursor-not-allowed"
                                    }`}
                                  title="Download Sertifikat"
                                >
                                  <FontAwesomeIcon
                                    icon={
                                      downloadLoading[item.id]
                                        ? faSpinner
                                        : faDownload
                                    }
                                    spin={downloadLoading[item.id]}
                                  />
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() =>
                                  handleRegenerateCertificate(item.id)
                                }
                                disabled={!!certLoading[item.id]}
                                className="inline-flex items-center gap-2 rounded-lg bg-teal-500 px-3 py-2 text-xs font-medium text-white hover:bg-teal-600 transition shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Generate Sertifikat"
                              >
                                <FontAwesomeIcon
                                  icon={
                                    certLoading[item.id] ? faSpinner : faCogs
                                  }
                                  spin={!!certLoading[item.id]}
                                  className="h-4 w-4"
                                />
                                {certLoading[item.id]
                                  ? "Memproses..."
                                  : "Generate"}
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
                      {data.length}
                    </span>{" "}
                    dari{" "}
                    <span className="font-semibold text-gray-900 dark:text-gray-100">
                      {totalRecords}
                    </span>{" "}
                    data
                  </div>
                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    {/* First Page Button */}
                    <button
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                      className={`p-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-teal-500/10 dark:hover:bg-gray-600 hover:border-teal-500/50 dark:hover:border-teal-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm cursor-pointer ${currentPage === 1 ? "opacity-40 cursor-not-allowed" : ""
                        }`}
                      title="Halaman Pertama"
                    >
                      <FontAwesomeIcon
                        icon={faAnglesLeft}
                        className="w-4 h-4"
                      />
                    </button>

                    {/* Previous Button */}
                    <button
                      onClick={() =>
                        setCurrentPage(Math.max(1, currentPage - 1))
                      }
                      disabled={currentPage === 1}
                      className={`p-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-teal-500/10 dark:hover:bg-gray-600 hover:border-teal-500/50 dark:hover:border-teal-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm cursor-pointer ${currentPage === 1 ? "opacity-40 cursor-not-allowed" : ""
                        }`}
                    >
                      <FontAwesomeIcon
                        icon={faChevronLeft}
                        className="w-4 h-4"
                      />
                    </button>

                    <div className="hidden sm:flex items-center gap-1">
                      {renderPagination()}
                    </div>

                    {/* Next Button */}
                    <button
                      onClick={() =>
                        setCurrentPage(Math.min(totalPages, currentPage + 1))
                      }
                      disabled={currentPage === totalPages}
                      className={`p-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-teal-500/10 dark:hover:bg-gray-600 hover:border-teal-500/50 dark:hover:border-teal-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm cursor-pointer ${currentPage === totalPages
                        ? "opacity-40 cursor-not-allowed"
                        : ""
                        }`}
                    >
                      <FontAwesomeIcon
                        icon={faChevronRight}
                        className="w-4 h-4"
                      />
                    </button>

                    {/* Last Page Button */}
                    <button
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                      className={`p-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-teal-500/10 dark:hover:bg-gray-600 hover:border-teal-500/50 dark:hover:border-teal-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm cursor-pointer ${currentPage === totalPages
                        ? "opacity-40 cursor-not-allowed"
                        : ""
                        }`}
                      title="Halaman Terakhir"
                    >
                      <FontAwesomeIcon
                        icon={faAnglesRight}
                        className="w-4 h-4"
                      />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}

export default CertificateList;
