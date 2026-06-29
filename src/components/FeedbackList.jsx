import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { DateRangePicker } from "react-date-range";
import { id } from "date-fns/locale";
import { format } from "date-fns";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";
import {
  getKegiatan,
  deleteKegiatan,
  getPegawai,
  testCertificate,
} from "../config/api";
import SearchableSelect from "./SearchableSelect";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faSpinner,
  faPlus,
  faExternalLinkAlt,
  faSearch,
  faFilter,
  faChevronDown,
  faTrashAlt,
  faFileAlt,
  faImage,
  faCalendarAlt,
  faCheckCircle,
  faTimesCircle,
  faCopy,
  faChevronLeft,
  faChevronRight,
  faAnglesLeft,
  faAnglesRight,
  faClipboardList,
  faEdit,
  faCogs,
  faSync,
} from "@fortawesome/free-solid-svg-icons";

const BE_URL = import.meta.env.VITE_BE_URL || "http://localhost:8000";
const BASE_URL = import.meta.env.VITE_BASE_URL || "http://localhost:5173";

let pegawaiCache = null;
let pegawaiPromise = null;

export default function FeedbackList() {
  const [kegiatan, setKegiatan] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleteId, setDeleteId] = useState(null);
  const [testCertId, setTestCertId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [filterJenis, setFilterJenis] = useState("");
  const [filterSertifikat, setFilterSertifikat] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateRange, setDateRange] = useState([
    {
      startDate: new Date(),
      endDate: new Date(),
      key: "selection",
    },
  ]);
  const [filterTanggal, setFilterTanggal] = useState("");
  const [filterTanggalFrom, setFilterTanggalFrom] = useState("");
  const [filterTanggalTo, setFilterTanggalTo] = useState("");
  const [filterJamMulai, setFilterJamMulai] = useState("");
  const [filterJamMulaiFrom, setFilterJamMulaiFrom] = useState("");
  const [filterJamMulaiTo, setFilterJamMulaiTo] = useState("");
  const [filterJamSelesai, setFilterJamSelesai] = useState("");
  const [filterJamSelesaiFrom, setFilterJamSelesaiFrom] = useState("");
  const [filterJamSelesaiTo, setFilterJamSelesaiTo] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedBanner, setSelectedBanner] = useState(null);
  const [pegawaiMap, setPegawaiMap] = useState({});
  const [totalItems, setTotalItems] = useState(0);
  const [showFilters, setShowFilters] = useState(true);
  const navigate = useNavigate();

  const loadingRef = useRef(false);
  const datePickerRef = useRef(null);

  // Close date picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        datePickerRef.current &&
        !datePickerRef.current.contains(event.target)
      ) {
        setShowDatePicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounce search input -> update `searchTerm` after delay
  useEffect(() => {
    const t = setTimeout(() => {
      setSearchTerm(searchInput);
    }, 500);
    return () => clearTimeout(t);
  }, [searchInput]);

  // load pegawai for resolving NIP to names
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

  // Resolve pegawai name by trying multiple lookup keys
  const resolvePegawaiName = (id) => {
    if (!id && id !== 0) return null;
    const s = String(id).trim();
    if (!s) return null;
    if (pegawaiMap[s]) return pegawaiMap[s];
    const noLeading = s.replace(/^0+/, "");
    if (noLeading && pegawaiMap[noLeading]) return pegawaiMap[noLeading];
    const num = String(Number(s));
    if (num && pegawaiMap[num]) return pegawaiMap[num];
    // try lowercase email/username variants
    const lower = s.toLowerCase();
    if (pegawaiMap[lower]) return pegawaiMap[lower];
    return null;
  };
  const loadKegiatan = async () => {
    // prevent duplicate fetches while one is in-flight
    if (loadingRef.current) return;
    loadingRef.current = true;
    try {
      setLoading(true);
      setError("");

      // Build query parameters based on filters
      const params = {};

      // Search
      if (searchTerm) params.search = searchTerm;

      // Jenis kegiatan filter
      if (filterJenis) params.jenis_kegiatan = filterJenis;

      // Butuh sertifikat filter
      if (filterSertifikat) {
        params.butuh_sertifikat = filterSertifikat === "ya" ? "1" : "0";
      }

      // Date filters
      if (filterTanggal) {
        params.tanggal = filterTanggal;
      } else {
        if (filterTanggalFrom) params.tanggal_from = filterTanggalFrom;
        if (filterTanggalTo) params.tanggal_to = filterTanggalTo;
      }

      // Time start filters
      if (filterJamMulai) {
        params.jam_mulai = filterJamMulai;
      } else {
        if (filterJamMulaiFrom) params.jam_mulai_from = filterJamMulaiFrom;
        if (filterJamMulaiTo) params.jam_mulai_to = filterJamMulaiTo;
      }

      // Time end filters
      if (filterJamSelesai) {
        params.jam_selesai = filterJamSelesai;
      } else {
        if (filterJamSelesaiFrom)
          params.jam_selesai_from = filterJamSelesaiFrom;
        if (filterJamSelesaiTo) params.jam_selesai_to = filterJamSelesaiTo;
      }

      // Sort
      if (sortBy) params.sort = sortBy;

      const data = await getKegiatan(params);
      const items = Array.isArray(data) ? data : data.data || [];
      setKegiatan(items);
      setTotalItems(items.length);
    } catch (err) {
      setError("Gagal memuat data kegiatan");
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    // Use SweetAlert2 if available, otherwise fallback to window.confirm
    if (typeof window.Swal !== "undefined") {
      const res = await window.Swal.fire({
        title: "Hapus kegiatan?",
        text: "Apakah Anda yakin ingin menghapus kegiatan ini? Tindakan ini tidak dapat dikembalikan.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Hapus",
        cancelButtonText: "Batal",
        confirmButtonColor: "#d33",
        cancelButtonColor: "#6c757d",
        reverseButtons: true,
      });
      if (!res.isConfirmed) return;
    } else {
      if (!window.confirm("Apakah Anda yakin ingin menghapus kegiatan ini?"))
        return;
    }

    try {
      setDeleteId(id);
      await deleteKegiatan(id);
      await loadKegiatan();
      setDeleteId(null);
      if (typeof window.Swal !== "undefined") {
        window.Swal.fire({
          icon: "success",
          title: "Berhasil",
          text: "Kegiatan berhasil dihapus.",
          confirmButtonColor: "#3085d6",
        });
      }
    } catch (err) {
      if (typeof window.Swal !== "undefined") {
        window.Swal.fire({
          icon: "error",
          title: "Gagal",
          text: "Gagal menghapus kegiatan",
          confirmButtonColor: "#3085d6",
        });
      } else {
        alert("Gagal menghapus kegiatan");
      }
      setDeleteId(null);
    }
  };

  const isLink = (text) => {
    if (!text) return false;
    return /^(https?:\/\/|www\.)/.test(text.trim());
  };

  const copyToClipboard = (text) => {
    if (!text) return;

    navigator.clipboard
      .writeText(text)
      .then(() => {
        if (typeof window.Swal !== "undefined") {
          window.Swal.fire({
            icon: "success",
            title: "Tersalin!",
            text: "URL berhasil disalin ke clipboard",
            timer: 2000,
            showConfirmButton: false,
            confirmButtonColor: "#3085d6",
          });
        } else {
          alert("URL berhasil disalin ke clipboard");
        }
      })
      .catch(() => {
        if (typeof window.Swal !== "undefined") {
          window.Swal.fire({
            icon: "error",
            title: "Gagal",
            text: "Gagal menyalin URL",
            confirmButtonColor: "#3085d6",
          });
        } else {
          alert("Gagal menyalin URL");
        }
      });
  };

  // Pagination
  const totalPages = Math.ceil(kegiatan.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = kegiatan.slice(startIndex, endIndex);

  // Load kegiatan on mount and whenever filters change
  useEffect(() => {
    setCurrentPage(1);
    loadKegiatan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    searchTerm,
    filterJenis,
    filterSertifikat,
    filterTanggal,
    filterTanggalFrom,
    filterTanggalTo,
    filterJamMulai,
    filterJamMulaiFrom,
    filterJamMulaiTo,
    filterJamSelesai,
    filterJamSelesaiFrom,
    filterJamSelesaiTo,
    sortBy,
  ]);

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    try {
      return new Date(dateString).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    } catch {
      return dateString;
    }
  };

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

  const getBannerUrl = (banner) => {
    if (!banner) return null;
    // If already a full URL, return as is
    if (banner.startsWith("http")) return banner;
    // Otherwise, prepend BE_URL
    return `${BE_URL}/storage/${banner}`;
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
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
            currentPage === i
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

  const jenisKegiatanOptions = [
    ...new Set(kegiatan.map((k) => k.jenis_kegiatan).filter(Boolean)),
  ];
  // Show inline loading indicators and error banner instead of hiding the whole page
  const showInlineLoading = loading;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <div className="border-l-4 border-teal-500 pl-4">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Umpan Balik 360
            </h1>
          </div>
        </div>

        <button
          onClick={() => navigate("/admin/kegiatan/tambah")}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-teal-500 text-white rounded-lg font-semibold hover:bg-teal-600 transition-all shadow-md hover:shadow-lg whitespace-nowrap"
        >
          <FontAwesomeIcon icon={faPlus} className="text-white text-base" />
          Tambah Kegiatan
        </button>
      </div>

      {error && (
        <div className="mt-4">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4 !mt-6">
        <div className="flex flex-col-reverse md:flex-row justify-between space-y-4 gap-4 md:space-y-0">
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              placeholder="Cari"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              disabled={loading}
              className="w-full pl-11 pr-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all shadow-sm"
            />
            <FontAwesomeIcon
              icon={faSearch}
              className="absolute left-3.5 top-3 text-gray-400"
              aria-hidden="true"
            />
          </div>

          <div className="flex flex-col-reverse md:flex-row justify-between space-y-4 gap-4 md:space-y-0">
            <button
              type="button"
              onClick={() => setShowFilters((value) => !value)}
              className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 font-medium rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 transition-all duration-200 flex items-center gap-2 px-4 py-2.5 text-sm"
            >
              <FontAwesomeIcon icon={faFilter} className="text-base" />
              Filter berdasarkan
            </button>

            <div className="flex items-center gap-3">
              <div className="relative">
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="appearance-none bg-white border border-gray-300 rounded-lg pl-4 pr-10 py-2.5 text-sm font-medium text-gray-700 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 cursor-pointer transition-all shadow-sm hover:bg-gray-50"
                >
                  {[5, 10, 25, 50].map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                <FontAwesomeIcon
                  icon={faChevronDown}
                  className="absolute right-3 top-3 text-gray-400 pointer-events-none"
                  aria-hidden="true"
                />
              </div>
              <span className="text-sm font-medium text-gray-700">data</span>
            </div>
          </div>
        </div>

        <div
          className={`transition-all duration-300 ease-in-out ${
            showFilters
              ? "max-h-[700px] opacity-100"
              : "max-h-0 opacity-0 overflow-hidden"
          }`}
        >
          <div className="p-4 bg-white rounded-lg border border-gray-200 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Urutkan
                </label>
                <SearchableSelect
                  value={sortBy}
                  name="sort"
                  onChange={(e) => setSortBy(e.target.value)}
                  options={[
                    { value: "newest", label: "Terbaru" },
                    { value: "ongoing", label: "Sedang Berlangsung" },
                  ]}
                  placeholder="Pilih urutan"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Jenis Kegiatan
                </label>
                <SearchableSelect
                  value={filterJenis}
                  name="jenis_kegiatan"
                  onChange={(e) => setFilterJenis(e.target.value)}
                  options={[
                    { value: "", label: "Semua Jenis" },
                    ...jenisKegiatanOptions.map((j) => ({ value: j, label: j })),
                  ]}
                  placeholder="Pilih jenis kegiatan"
                  disabled={loading}
                />
              </div>

              <div ref={datePickerRef}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pilih tanggal atau rentang
                </label>
                <button
                  type="button"
                  onClick={() => setShowDatePicker(!showDatePicker)}
                  disabled={loading}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-left focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none flex items-center justify-between hover:bg-gray-50"
                >
                  <span className="text-sm">
                    {filterTanggal
                      ? format(new Date(filterTanggal), "dd MMMM yyyy", {
                          locale: id,
                        })
                      : filterTanggalFrom && filterTanggalTo
                        ? `${format(new Date(filterTanggalFrom), "dd MMM yyyy", { locale: id })} - ${format(new Date(filterTanggalTo), "dd MMM yyyy", { locale: id })}`
                        : "Pilih tanggal atau rentang..."}
                  </span>
                  <FontAwesomeIcon
                    icon={faCalendarAlt}
                    className="text-gray-400 text-base"
                    aria-hidden="true"
                  />
                </button>

                {showDatePicker && (
                  <div className="absolute z-50 mt-2 bg-white border border-gray-300 rounded-lg shadow-md">
                    <DateRangePicker
                      ranges={dateRange}
                      onChange={(item) => {
                        setDateRange([item.selection]);
                        const start = format(
                          item.selection.startDate,
                          "yyyy-MM-dd",
                        );
                        const end = format(item.selection.endDate, "yyyy-MM-dd");
                        if (start === end) {
                          setFilterTanggal(start);
                          setFilterTanggalFrom("");
                          setFilterTanggalTo("");
                        } else {
                          setFilterTanggal("");
                          setFilterTanggalFrom(start);
                          setFilterTanggalTo(end);
                        }
                      }}
                      locale={id}
                      months={1}
                      direction="horizontal"
                      showSelectionPreview={false}
                      moveRangeOnFirstSelection={false}
                      editableDateInputs={true}
                      rangeColors={["#3b82f6"]}
                    />
                    <div className="p-3 border-t border-gray-200 flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setDateRange([
                            {
                              startDate: new Date(),
                              endDate: new Date(),
                              key: "selection",
                            },
                          ]);
                          setFilterTanggal("");
                          setFilterTanggalFrom("");
                          setFilterTanggalTo("");
                        }}
                        className="px-3 py-1.5 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                      >
                        Reset
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowDatePicker(false)}
                        className="px-3 py-1.5 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors"
                      >
                        Terapkan
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sertifikat
                </label>
                <SearchableSelect
                  value={filterSertifikat}
                  name="butuh_sertifikat"
                  onChange={(e) => setFilterSertifikat(e.target.value)}
                  options={[
                    { value: "", label: "Semua" },
                    { value: "ya", label: "Butuh Sertifikat" },
                    { value: "tidak", label: "Tidak Butuh" },
                  ]}
                  placeholder="Pilih opsi sertifikat"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="flex justify-start gap-2 mt-4">
              <button
                onClick={() => {
                  setSearchTerm("");
                  setSearchInput("");
                  setFilterJenis("");
                  setFilterSertifikat("");
                  setDateRange([
                    {
                      startDate: new Date(),
                      endDate: new Date(),
                      key: "selection",
                    },
                  ]);
                  setFilterTanggal("");
                  setFilterTanggalFrom("");
                  setFilterTanggalTo("");
                  setFilterJamMulai("");
                  setFilterJamMulaiFrom("");
                  setFilterJamMulaiTo("");
                  setFilterJamSelesai("");
                  setFilterJamSelesaiFrom("");
                  setFilterJamSelesaiTo("");
                  setSortBy("newest");
                }}
                className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 font-medium rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 transition-all duration-200 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors inline-flex items-center gap-2"
                disabled={loading}
              >
                <FontAwesomeIcon icon={faSync} className="text-base" />
                Reset Filter
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-md overflow-hidden relative mt-0">
        {loading && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-40 flex items-center justify-center">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-600 border-t-transparent"></div>
              <span className="text-gray-700">Memuat data...</span>
            </div>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="text-teal-500">
              <tr style={{ backgroundColor: '#fbfdfe' }}>
                <th className="px-4 py-3 text-left text-sm font-bold">No</th>
                <th className="px-4 py-3 text-left text-sm font-bold">
                  Banner
                </th>
                <th className="px-4 py-3 text-left text-sm font-bold">Jenis</th>
                <th className="px-4 py-3 text-left text-sm font-bold">
                  Nama Kegiatan
                </th>
                <th className="px-4 py-3 text-left text-sm font-bold">
                  Judul/Tema
                </th>
                <th className="px-4 py-3 text-left text-sm font-bold">
                  Tanggal & Waktu
                </th>
                <th className="px-4 py-3 text-left text-sm font-bold w-56">
                  Tempat
                </th>
                <th className="px-4 py-3 text-left text-sm font-bold w-48">
                  Linktree
                </th>
                <th className="px-4 py-3 text-left text-sm font-bold">
                  Narasumber
                </th>
                <th className="px-4 py-3 text-left text-sm font-bold">
                  Moderator
                </th>
                <th className="px-4 py-3 text-center text-sm font-bold">
                  Sertifikat
                </th>
                <th className="px-4 py-3 text-center text-sm font-bold">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {currentItems.length === 0 ? (
                <tr>
                  <td
                    colSpan="12"
                    className="px-6 py-12 text-center text-gray-500"
                  >
                    <FontAwesomeIcon
                      icon={faFileAlt}
                      className="mx-auto text-gray-400 mb-4 text-3xl"
                    />
                    <p className="font-medium">Tidak ada kegiatan</p>
                    <p className="text-sm mt-1">
                      {searchTerm ||
                      filterJenis ||
                      filterSertifikat ||
                      filterTanggal ||
                      filterTanggalFrom ||
                      filterTanggalTo
                        ? "Tidak ditemukan kegiatan yang sesuai filter"
                        : "Mulai dengan menambahkan kegiatan baru"}
                    </p>
                  </td>
                </tr>
              ) : (
                currentItems.map((item, idx) => (
                  <tr
                    key={item.id}
                    className="hover:bg-teal-50 transition-colors duration-150"
                  >
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-900">
                        {startIndex + idx + 1}
                      </div>
                    </td>
                    {/* Banner */}
                    <td className="px-4 py-3">
                      <div className="w-20 h-25 rounded overflow-hidden bg-gray-100 flex items-center justify-center">
                        {item.banner ? (
                          <img
                            src={getBannerUrl(item.banner)}
                            alt={item.nama_kegiatan}
                            onClick={() =>
                              setSelectedBanner(getBannerUrl(item.banner))
                            }
                            className="h-full w-full object-cover cursor-pointer hover:opacity-90"
                          />
                        ) : (
                          <FontAwesomeIcon
                            icon={faImage}
                            className="text-gray-300 text-4xl"
                            aria-hidden="true"
                          />
                        )}
                      </div>
                    </td>

                    {/* Jenis */}
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {item.jenis_kegiatan || "-"}
                      </span>
                    </td>

                    {/* Nama Kegiatan */}
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900">
                        {item.nama_kegiatan || "-"}
                      </div>
                    </td>

                    {/* Judul/Tema */}
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-700">
                        {item.judul_tema || "-"}
                      </div>
                    </td>

                    {/* Tanggal & Waktu */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {formatDate(item.tanggal)}
                      </div>
                      <div className="text-sm` text-gray-500">
                        {item.jam_mulai && item.jam_selesai
                          ? `${formatTime(item.jam_mulai)} - ${formatTime(item.jam_selesai)} WIB`
                          : "-"}
                      </div>
                    </td>

                    {/* Tempat */}
                    <td className="px-4 py-3">
                      {isLink(item.tempat) ? (
                        <a
                          href={
                            item.tempat.startsWith("http")
                              ? item.tempat
                              : `https://${item.tempat}`
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:text-blue-800 hover:underline flex items-start gap-2"
                        >
                          <span className="block w-full break-all whitespace-normal overflow-hidden">
                            {item.tempat}
                          </span>
                          <FontAwesomeIcon
                            icon={faExternalLinkAlt}
                            className="w-3 h-3 flex-shrink-0 mt-1"
                          />
                        </a>
                      ) : (
                        <div className="text-sm text-gray-700 w-full break-all whitespace-normal overflow-hidden">
                          {item.tempat || "-"}
                        </div>
                      )}
                    </td>

                    {/* Linktree */}
                    <td className="px-4 py-3">
                      {item.linktree ? (
                        <div className="flex items-center gap-2">
                          <a
                            href={`${BASE_URL}/linktree/${item.linktree}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:text-blue-800 hover:underline flex-1 break-all"
                          >
                            {BASE_URL}/linktree/{item.linktree}
                          </a>
                          <button
                            type="button"
                            onClick={() =>
                              copyToClipboard(
                                `${BASE_URL}/linktree/${item.linktree}`,
                              )
                            }
                            className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors flex-shrink-0"
                            title="Salin URL"
                          >
                            <FontAwesomeIcon
                              icon={faCopy}
                              className="w-4 h-4"
                            />
                          </button>
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500">-</div>
                      )}
                    </td>

                    {/* Narasumber */}
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-700">
                        {(() => {
                          const asal = (
                            item.asal_narasumber || ""
                          ).toLowerCase();
                          if (asal === "internal") {
                            const name =
                              resolvePegawaiName(item.narasumber) ||
                              item.narasumber;
                            return name || "-";
                          }
                          return item.narasumber || "-";
                        })()}
                        {item.asal_narasumber && (
                          <span className="text-sm text-gray-500 block">
                            ({item.asal_narasumber})
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Moderator */}
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-700">
                        {(() => {
                          const asal = (
                            item.asal_moderator || ""
                          ).toLowerCase();
                          if (asal === "internal") {
                            const name =
                              resolvePegawaiName(item.moderator) ||
                              item.moderator;
                            return name || "-";
                          }
                          return item.moderator || "-";
                        })()}
                        {item.asal_moderator && item.moderator && (
                          <span className="text-sm text-gray-500 block">
                            ({item.asal_moderator})
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Sertifikat */}
                    <td className="px-4 py-3 text-center">
                      {item.desain_sertifikat || item.template_sertifikat ? (
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-teal-100 text-teal-600">
                          <FontAwesomeIcon
                            icon={faCheckCircle}
                            className="w-3 h-3 mr-1 text-sm"
                            aria-hidden="true"
                          />
                          Ya
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-600">
                          <FontAwesomeIcon
                            icon={faTimesCircle}
                            className="w-3 h-3 mr-1 text-sm"
                            aria-hidden="true"
                          />
                          Tidak
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        <button
                          onClick={() =>
                            navigate(`/admin/kegiatan/responden/${item.id}`)
                          }
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-500 hover:bg-teal-600 text-white rounded-lg transition-colors text-sm font-medium whitespace-nowrap"
                        >
                          <FontAwesomeIcon
                            icon={faClipboardList}
                            className="text-base flex-shrink-0"
                          />
                          Responden
                        </button>
                        {(item.desain_sertifikat ||
                          item.template_sertifikat) && (
                          <button
                            onClick={async () => {
                              if (
                                !item.desain_sertifikat &&
                                !item.template_sertifikat
                              ) {
                                if (typeof window.Swal !== "undefined") {
                                  window.Swal.fire({
                                    icon: "warning",
                                    title: "Tidak Ada Desain",
                                    text: "Kegiatan ini tidak memiliki desain sertifikat.",
                                    confirmButtonColor: "#3085d6",
                                  });
                                } else {
                                  alert(
                                    "Kegiatan ini tidak memiliki desain sertifikat.",
                                  );
                                }
                                return;
                              }
                              try {
                                setTestCertId(item.id);
                                const blob = await testCertificate(item.id);
                                const url = URL.createObjectURL(blob);
                                window.open(url, "_blank");
                                setTimeout(
                                  () => URL.revokeObjectURL(url),
                                  60000,
                                );
                              } catch (err) {
                                if (typeof window.Swal !== "undefined") {
                                  window.Swal.fire({
                                    icon: "error",
                                    title: "Gagal",
                                    text: err.message,
                                    confirmButtonColor: "#3085d6",
                                  });
                                } else {
                                  alert(err.message);
                                }
                              } finally {
                                setTestCertId(null);
                              }
                            }}
                            disabled={testCertId === item.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors text-sm font-medium whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {testCertId === item.id ? (
                              <FontAwesomeIcon
                                icon={faSpinner}
                                spin
                                className="text-base flex-shrink-0"
                              />
                            ) : (
                              <FontAwesomeIcon
                                icon={faCogs}
                                className="text-base flex-shrink-0"
                              />
                            )}
                            Test Sertifikat
                          </button>
                        )}
                        <button
                          onClick={() =>
                            navigate(`/admin/kegiatan/edit/${item.id}`)
                          }
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors text-sm font-medium whitespace-nowrap"
                        >
                          <FontAwesomeIcon
                            icon={faEdit}
                            className="text-base flex-shrink-0"
                          />
                          Ubah
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          disabled={deleteId === item.id}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors text-sm font-medium whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {deleteId === item.id ? (
                            <FontAwesomeIcon
                              icon={faSpinner}
                              spin
                              className="text-base flex-shrink-0"
                            />
                          ) : (
                            <FontAwesomeIcon
                              icon={faTrashAlt}
                              className="text-base flex-shrink-0"
                            />
                          )}
                          Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {kegiatan.length > 0 && (
          <div className="px-3 py-4 bg-gradient-to-r from-white to-white dark:from-gray-800 dark:to-gray-800 border-t border-gray-200 dark:border-gray-700">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-sm font-medium text-gray-600 dark:text-gray-400 leading-relaxed">
                  Halaman <span className="font-semibold">{currentPage}</span>{" "}
                  dari <span className="font-semibold">{totalPages}</span> -
                  Menampilkan{" "}
                  <span className="font-semibold">{currentItems.length}</span>{" "}
                  dari <span className="font-semibold">{totalItems}</span> data
              </div>

              <div className="flex items-center gap-2 flex-wrap justify-end">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className={`p-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-teal-500/10 dark:hover:bg-gray-600 hover:border-teal-500/50 dark:hover:border-teal-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm cursor-pointer ${
                    currentPage === 1
                      ? "opacity-40 cursor-not-allowed"
                      : ""
                  }`}
                  title="Halaman Pertama"
                >
                  <FontAwesomeIcon icon={faAnglesLeft} className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={`p-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-teal-500/10 dark:hover:bg-gray-600 hover:border-teal-500/50 dark:hover:border-teal-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm cursor-pointer ${
                    currentPage === 1
                      ? "opacity-40 cursor-not-allowed"
                      : ""
                  }`}
                >
                  <FontAwesomeIcon icon={faChevronLeft} className="w-4 h-4" />
                </button>

                <div className="hidden sm:flex items-center gap-1">{renderPagination()}</div>

                <button
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className={`p-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-teal-500/10 dark:hover:bg-gray-600 hover:border-teal-500/50 dark:hover:border-teal-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm cursor-pointer ${
                    currentPage === totalPages
                      ? "opacity-40 cursor-not-allowed"
                      : ""
                  }`}
                >
                  <FontAwesomeIcon icon={faChevronRight} className="w-4 h-4" />
                </button>
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
        {/* Full-size banner modal */}
        {selectedBanner && (
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
          </div>
        )}
      </div>
    </div>
  );
}
