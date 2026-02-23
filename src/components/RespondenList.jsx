import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faFileExcel,
  faFilePdf,
  faSearch,
  faSort,
  faSortUp,
  faSortDown,
  faChevronLeft,
  faChevronRight,
  faAnglesLeft,
  faAnglesRight,
  faFileAlt,
  faSpinner,
  faChartBar,
  faUsers,
  faCheckCircle,
  faCalendarAlt,
  faClock,
} from "@fortawesome/free-solid-svg-icons";
import SearchableSelect from "./SearchableSelect";
import { getKegiatanById, getKegiatanPegawai } from "../config/api";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from "chart.js";
import { Bar, Doughnut } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const BE_URL = import.meta.env.VITE_BE_URL || "http://localhost:8000";

// Dummy data for demonstration
const DUMMY_RESPONDEN = [
  {
    id: 1,
    nama_lengkap: "Naufal Irfani, S.T.",
    nip_no_absen: "200004202025061008",
    jabatan: "PENATA KELOLA SISTEM DAN TEKNOLOGI INFORMASI",
    unit_kerja: "Subbagian Administrasi Keanggotaan",
    status_pegawai: "CPNS",
    kepuasan_informasi_pendaftaran: 5,
    kenyamanan_tempat: 5,
    kelancaran_teknis: 5,
    informasi_panitia: 5,
    relevansi_materi: 5,
    pemahaman_materi: 5,
    penyampaian_narasumber: 5,
    sesi_tanya_jawab: 5,
    manfaat_webinar: 5,
    penerapan_materi: 5,
    inspirasi_motivasi: 5,
    kesediaan_ikut_lagi: 5,
    yang_disukai: "Materi sangat relevan dan narasumber kompeten",
    saran_kritik: "Perlu ditambah sesi praktek",
    created_at: "2024-01-15T10:30:00Z",
  },
  {
    id: 2,
    nama_lengkap: "Budi Santoso, S.Kom",
    nip_no_absen: "199801152023011001",
    jabatan: "PRANATA KOMPUTER",
    unit_kerja: "Bagian TI",
    status_pegawai: "PNS",
    kepuasan_informasi_pendaftaran: 4,
    kenyamanan_tempat: 4,
    kelancaran_teknis: 5,
    informasi_panitia: 4,
    relevansi_materi: 5,
    pemahaman_materi: 4,
    penyampaian_narasumber: 5,
    sesi_tanya_jawab: 4,
    manfaat_webinar: 5,
    penerapan_materi: 4,
    inspirasi_motivasi: 5,
    kesediaan_ikut_lagi: 5,
    yang_disukai: "Penyampaian narasumber sangat baik",
    saran_kritik: "Waktu terlalu singkat",
    created_at: "2024-01-15T10:35:00Z",
  },
  {
    id: 3,
    nama_lengkap: "Siti Nurhaliza, S.E.",
    nip_no_absen: "199505202022012002",
    jabatan: "ANALIS KEUANGAN",
    unit_kerja: "Bagian Keuangan",
    status_pegawai: "PNS",
    kepuasan_informasi_pendaftaran: 5,
    kenyamanan_tempat: 3,
    kelancaran_teknis: 4,
    informasi_panitia: 5,
    relevansi_materi: 4,
    pemahaman_materi: 4,
    penyampaian_narasumber: 4,
    sesi_tanya_jawab: 3,
    manfaat_webinar: 4,
    penerapan_materi: 4,
    inspirasi_motivasi: 4,
    kesediaan_ikut_lagi: 4,
    yang_disukai: "Topik sangat menarik",
    saran_kritik: "AC kurang dingin",
    created_at: "2024-01-15T10:40:00Z",
  },
  {
    id: 4,
    nama_lengkap: "Ahmad Fauzi, S.H.",
    nip_no_absen: "199203102021011003",
    jabatan: "ANALIS HUKUM",
    unit_kerja: "Bagian Hukum",
    status_pegawai: "PNS",
    kepuasan_informasi_pendaftaran: 4,
    kenyamanan_tempat: 5,
    kelancaran_teknis: 4,
    informasi_panitia: 4,
    relevansi_materi: 5,
    pemahaman_materi: 5,
    penyampaian_narasumber: 5,
    sesi_tanya_jawab: 5,
    manfaat_webinar: 5,
    penerapan_materi: 5,
    inspirasi_motivasi: 4,
    kesediaan_ikut_lagi: 5,
    yang_disukai: "Interaksi yang baik",
    saran_kritik: "-",
    created_at: "2024-01-15T10:45:00Z",
  },
  {
    id: 5,
    nama_lengkap: "Dewi Lestari, S.Pd.",
    nip_no_absen: "199912122024022001",
    jabatan: "WIDYAISWARA",
    unit_kerja: "Bagian Pelatihan",
    status_pegawai: "CPNS",
    kepuasan_informasi_pendaftaran: 3,
    kenyamanan_tempat: 4,
    kelancaran_teknis: 3,
    informasi_panitia: 3,
    relevansi_materi: 4,
    pemahaman_materi: 3,
    penyampaian_narasumber: 4,
    sesi_tanya_jawab: 4,
    manfaat_webinar: 4,
    penerapan_materi: 3,
    inspirasi_motivasi: 4,
    kesediaan_ikut_lagi: 4,
    yang_disukai: "Narasumber berpengalaman",
    saran_kritik: "Perlu lebih banyak contoh kasus",
    created_at: "2024-01-15T10:50:00Z",
  },
];

const DUMMY_KEGIATAN = {
  id: 1,
  nama_kegiatan: "Webinar Transformasi Digital",
  judul_tema: "Menuju Era Digital yang Lebih Baik",
  tanggal: "2024-01-15",
  jam_mulai: "09:00:00",
  jam_selesai: "12:00:00",
};

export default function RespondenList() {
  const { kegiatan_id } = useParams();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("overview");
  const [responden, setResponden] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [sortField, setSortField] = useState("");
  const [sortOrder, setSortOrder] = useState("asc");
  const [kegiatanInfo, setKegiatanInfo] = useState(null);
  const [loadingKegiatan, setLoadingKegiatan] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load data (using real API)
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch kegiatan info and unwrap common response envelope
        setLoadingKegiatan(true);
        try {
          const kegiatanData = await getKegiatanById(kegiatan_id);
          const kegiatanPayload = kegiatanData && kegiatanData.data ? kegiatanData.data : kegiatanData;
          setKegiatanInfo(kegiatanPayload);
        } catch (e) {
          console.error("Error loading kegiatan info:", e);
        } finally {
          setLoadingKegiatan(false);
        }

        // Fetch responden list and normalize various API shapes (array, {data: [...]}, {data: {data: [...]}})
        const respondenData = await getKegiatanPegawai({ kegiatan_id });

        const extractArray = (resp) => {
          if (!resp) return [];
          if (Array.isArray(resp)) return resp;
          // resp.data may be an array or an envelope (e.g. { current_page, data: [...] })
          if (resp.data) {
            if (Array.isArray(resp.data)) return resp.data;
            if (resp.data.data && Array.isArray(resp.data.data)) return resp.data.data;
            if (resp.data.results && Array.isArray(resp.data.results)) return resp.data.results;
          }
          if (resp.results && Array.isArray(resp.results)) return resp.results;
          return [];
        };

        const items = extractArray(respondenData);

        // Some APIs may store the submitted form as a JSON string in `isi_form`.
        // Normalize each item so `isi_form` is always an object.
        const safeParse = (v) => {
          if (!v) return {};
          if (typeof v === "object") return v;
          if (typeof v === "string") {
            try {
              return JSON.parse(v);
            } catch (e) {
              return {};
            }
          }
          return {};
        };

        const normalized = items.map((it) => ({
          ...it,
          isi_form: safeParse(it.isi_form) || {},
        }));

        setResponden(normalized);
      } catch (err) {
        console.error("Error loading data:", err);
        setError("Gagal memuat data responden");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [kegiatan_id]);

  // Filter and sort data
  const filteredResponden = responden
    .filter((r) => {
      if (!debouncedSearch) return true;
      const search = debouncedSearch.toLowerCase();
      const isiForm = r.isi_form || {};
      return (
        isiForm.nama_lengkap?.toLowerCase().includes(search) ||
        isiForm.nip_no_absen?.toLowerCase().includes(search) ||
        isiForm.jabatan?.toLowerCase().includes(search) ||
        isiForm.unit_kerja?.toLowerCase().includes(search)
      );
    })
    .sort((a, b) => {
      if (!sortField) return 0;
      const aVal = (a.isi_form && a.isi_form[sortField]) || "";
      const bVal = (b.isi_form && b.isi_form[sortField]) || "";
      if (sortOrder === "asc") {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

  // Pagination
  const totalPages = Math.ceil(filteredResponden.length / perPage);
  const startIndex = (currentPage - 1) * perPage;
  const endIndex = startIndex + perPage;
  const currentItems = filteredResponden.slice(startIndex, endIndex);

  // Calculate statistics (use dummy data for demo if no real data available)
  const calculateStats = () => {
    // Use dummy data for statistics demonstration
    const dataSource = DUMMY_RESPONDEN;
    
    if (dataSource.length === 0) return null;

    const fields = [
      "kepuasan_informasi_pendaftaran",
      "kenyamanan_tempat",
      "kelancaran_teknis",
      "informasi_panitia",
      "relevansi_materi",
      "pemahaman_materi",
      "penyampaian_narasumber",
      "sesi_tanya_jawab",
      "manfaat_webinar",
      "penerapan_materi",
      "inspirasi_motivasi",
      "kesediaan_ikut_lagi",
    ];

    const stats = {};
    fields.forEach((field) => {
      const values = dataSource.map((r) => r[field]).filter((v) => v);
      const sum = values.reduce((a, b) => a + b, 0);
      const avg = values.length > 0 ? sum / values.length : 0;

      // Count distribution
      const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      values.forEach((v) => {
        distribution[v] = (distribution[v] || 0) + 1;
      });

      stats[field] = {
        average: avg.toFixed(2),
        distribution,
        total: values.length,
      };
    });

    return stats;
  };

  const stats = calculateStats();

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

  // Export functions
  const handleExportExcel = async () => {
    try {
      setExportLoading(true);
      // TODO: Implement actual export to Excel
      await new Promise((resolve) => setTimeout(resolve, 1000));

      if (typeof window.Swal !== "undefined") {
        window.Swal.fire({
          icon: "success",
          title: "Berhasil",
          text: "Data berhasil diekspor ke Excel",
          confirmButtonColor: "#3085d6",
        });
      } else {
        alert("Data berhasil diekspor ke Excel");
      }
    } catch (error) {
      if (typeof window.Swal !== "undefined") {
        window.Swal.fire({
          icon: "error",
          title: "Gagal",
          text: "Gagal mengekspor data",
          confirmButtonColor: "#3085d6",
        });
      } else {
        alert("Gagal mengekspor data");
      }
    } finally {
      setExportLoading(false);
    }
  };

  const handleExportPDF = async () => {
    try {
      setExportLoading(true);
      // TODO: Implement actual export to PDF
      await new Promise((resolve) => setTimeout(resolve, 1000));

      if (typeof window.Swal !== "undefined") {
        window.Swal.fire({
          icon: "success",
          title: "Berhasil",
          text: "Data berhasil diekspor ke PDF",
          confirmButtonColor: "#3085d6",
        });
      } else {
        alert("Data berhasil diekspor ke PDF");
      }
    } catch (error) {
      if (typeof window.Swal !== "undefined") {
        window.Swal.fire({
          icon: "error",
          title: "Gagal",
          text: "Gagal mengekspor data",
          confirmButtonColor: "#3085d6",
        });
      } else {
        alert("Gagal mengekspor data");
      }
    } finally {
      setExportLoading(false);
    }
  };

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
        const m = timeString.match(/^(\d{2}:\d{2})/);
        if (m) return m[1];
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

  const formatDateTime = (dateTimeString) => {
    if (!dateTimeString) return "-";
    try {
      const date = new Date(dateTimeString);
      return date.toLocaleString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateTimeString;
    }
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
        </button>
      );
    }

    return pages;
  };

  const getFieldLabel = (field) => {
    const labels = {
      kepuasan_informasi_pendaftaran: "Kepuasan Informasi Pendaftaran",
      kenyamanan_tempat: "Kenyamanan Tempat",
      kelancaran_teknis: "Kelancaran Teknis",
      informasi_panitia: "Informasi Panitia",
      relevansi_materi: "Relevansi Materi",
      pemahaman_materi: "Pemahaman Materi",
      penyampaian_narasumber: "Penyampaian Narasumber",
      sesi_tanya_jawab: "Sesi Tanya Jawab",
      manfaat_webinar: "Manfaat Webinar",
      penerapan_materi: "Penerapan Materi",
      inspirasi_motivasi: "Inspirasi & Motivasi",
      kesediaan_ikut_lagi: "Kesediaan Ikut Lagi",
    };
    return labels[field] || field;
  };

  // Render Overview Tab
  const renderOverview = () => {
    if (!stats) {
      return (
        <div className="text-center py-12 text-gray-500">
          Tidak ada data untuk ditampilkan
        </div>
      );
    }

    // Prepare chart data for overall satisfaction
    const overallAvg =
      Object.values(stats).reduce(
        (sum, s) => sum + parseFloat(s.average),
        0
      ) / Object.keys(stats).length;

    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl shadow-md p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-teal-100 text-sm font-medium">
                  Total Responden (Demo)
                </p>
                <p className="text-3xl font-bold mt-2">{DUMMY_RESPONDEN.length}</p>
              </div>
              <div className="bg-white/20 rounded-full p-4">
                <FontAwesomeIcon icon={faUsers} className="text-3xl" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-md p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">
                  Rata-rata Kepuasan
                </p>
                <p className="text-3xl font-bold mt-2">
                  {overallAvg.toFixed(2)} / 5
                </p>
              </div>
              <div className="bg-white/20 rounded-full p-4">
                <FontAwesomeIcon icon={faChartBar} className="text-3xl" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl shadow-md p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">
                  Tingkat Respons
                </p>
                <p className="text-3xl font-bold mt-2">100%</p>
              </div>
              <div className="bg-white/20 rounded-full p-4">
                <FontAwesomeIcon icon={faCheckCircle} className="text-3xl" />
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Statistics */}
        <div className="bg-white rounded-2xl shadow-md p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900">
              Statistik Detail Kepuasan
            </h3>
            <span className="text-xs text-gray-500 bg-yellow-50 px-3 py-1 rounded-full border border-yellow-200">
              * Data Demo
            </span>
          </div>

          <div className="space-y-6">
            {Object.entries(stats).map(([field, data]) => {
              const chartData = {
                labels: ["1", "2", "3", "4", "5"],
                datasets: [
                  {
                    label: "Jumlah Responden",
                    data: [
                      data.distribution[1],
                      data.distribution[2],
                      data.distribution[3],
                      data.distribution[4],
                      data.distribution[5],
                    ],
                    backgroundColor: [
                      "rgba(239, 68, 68, 0.8)",
                      "rgba(251, 146, 60, 0.8)",
                      "rgba(251, 191, 36, 0.8)",
                      "rgba(34, 197, 94, 0.8)",
                      "rgba(14, 165, 233, 0.8)",
                    ],
                    borderColor: [
                      "rgb(239, 68, 68)",
                      "rgb(251, 146, 60)",
                      "rgb(251, 191, 36)",
                      "rgb(34, 197, 94)",
                      "rgb(14, 165, 233)",
                    ],
                    borderWidth: 1,
                  },
                ],
              };

              const chartOptions = {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    display: false,
                  },
                  tooltip: {
                    callbacks: {
                      label: function (context) {
                        return `${context.parsed.y} responden`;
                      },
                    },
                  },
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: {
                      stepSize: 1,
                    },
                  },
                },
              };

              return (
                <div
                  key={field}
                  className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex flex-col lg:flex-row gap-4">
                    <div className="lg:w-1/3">
                      <h4 className="font-semibold text-gray-900 mb-2">
                        {getFieldLabel(field)}
                      </h4>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold text-teal-600">
                          {data.average}
                        </span>
                        <span className="text-gray-500">/ 5</span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        dari {data.total} responden
                      </p>
                    </div>
                    <div className="lg:w-2/3 h-48">
                      <Bar data={chartData} options={chartOptions} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Feedback Section */}
        <div className="bg-white rounded-2xl shadow-md p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">
            Feedback Terbaru
          </h3>
          <div className="space-y-4">
            {responden.length > 0 ? (
              responden.slice(0, 5).map((r) => {
                const isiForm = r.isi_form || {};
                return (
                  <div
                    key={r.id}
                    className="border-l-4 border-teal-500 bg-gray-50 p-4 rounded-r-lg"
                  >
                    <div className="flex flex-col sm:flex-row justify-between mb-2">
                      <p className="font-semibold text-gray-900">
                        {isiForm.nama_lengkap || "Anonim"}
                      </p>
                      <p className="text-sm text-gray-500">
                        {formatDateTime(r.created_at)}
                      </p>
                    </div>
                    {isiForm.yang_disukai && isiForm.yang_disukai !== "-" && (
                      <div className="mt-2">
                        <p className="text-sm font-medium text-gray-700">
                          Yang Disukai:
                        </p>
                        <p className="text-sm text-gray-600">{isiForm.yang_disukai}</p>
                      </div>
                    )}
                    {isiForm.saran_kritik && isiForm.saran_kritik !== "-" && (
                      <div className="mt-2">
                        <p className="text-sm font-medium text-gray-700">
                          Saran & Kritik:
                        </p>
                        <p className="text-sm text-gray-600">{isiForm.saran_kritik}</p>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <p className="text-center text-gray-500 py-4">
                Belum ada feedback dari responden
              </p>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Render Responden Tab
  const renderResponden = () => {
    return (
      <div className="space-y-6">
        {/* Search and Export Actions */}
        <div className="bg-white rounded-2xl shadow-md p-6">
          <div className="flex flex-col lg:flex-row gap-4 items-end justify-between">
            {/* Search */}
            <div className="flex-1 w-full lg:w-auto">
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
            <div className="w-full sm:w-auto">
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

            {/* Export Buttons */}
            <div className="flex gap-2 w-full sm:w-auto">
              <button
                onClick={handleExportExcel}
                disabled={exportLoading}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-3 bg-teal-500 text-white rounded-lg font-semibold hover:bg-teal-600 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {exportLoading ? (
                  <FontAwesomeIcon icon={faSpinner} spin />
                ) : (
                  <FontAwesomeIcon icon={faFileExcel} />
                )}
                <span className="hidden sm:inline">Ekspor Excel</span>
              </button>
              <button
                onClick={handleExportPDF}
                disabled={exportLoading}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-3 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {exportLoading ? (
                  <FontAwesomeIcon icon={faSpinner} spin />
                ) : (
                  <FontAwesomeIcon icon={faFilePdf} />
                )}
                <span className="hidden sm:inline">Ekspor PDF</span>
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="text-teal-500">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-bold">No</th>
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
                      NIP/No. Absen
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
                  <th className="px-4 py-3 text-left text-sm font-bold">
                    Status
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-bold">
                    Rata-rata Nilai
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-bold">
                    Waktu Pengisian
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {currentItems.length === 0 ? (
                  <tr>
                    <td
                      colSpan="8"
                      className="px-6 py-12 text-center text-gray-500"
                    >
                      <FontAwesomeIcon
                        icon={faFileAlt}
                        className="mx-auto text-gray-400 mb-4 text-3xl"
                      />
                      <p className="font-medium">Tidak ada data responden</p>
                      <p className="text-sm mt-1">
                        {debouncedSearch
                          ? "Tidak ditemukan responden yang sesuai dengan pencarian"
                          : "Belum ada responden yang mengisi formulir"}
                      </p>
                    </td>
                  </tr>
                ) : (
                  currentItems.map((item, idx) => {
                    const isiForm = item.isi_form || {};
                    // Calculate average score for this respondent
                    const scores = [
                      isiForm.kepuasan_informasi_pendaftaran,
                      isiForm.kenyamanan_tempat,
                      isiForm.kelancaran_teknis,
                      isiForm.informasi_panitia,
                      isiForm.relevansi_materi,
                      isiForm.pemahaman_materi,
                      isiForm.penyampaian_narasumber,
                      isiForm.sesi_tanya_jawab,
                      isiForm.manfaat_webinar,
                      isiForm.penerapan_materi,
                      isiForm.inspirasi_motivasi,
                      isiForm.kesediaan_ikut_lagi,
                    ].filter((s) => s);
                    const avgScore =
                      scores.length > 0
                        ? scores.reduce((a, b) => a + b, 0) / scores.length
                        : 0;

                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-teal-50 transition-colors duration-150"
                      >
                        <td className="px-4 py-3">
                          <div className="text-sm text-gray-900">
                            {startIndex + idx + 1}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium text-gray-900">
                            {isiForm.nama_lengkap || "-"}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-gray-700">
                            {isiForm.nip_no_absen || "-"}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-gray-700">
                            {isiForm.jabatan || "-"}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-gray-700">
                            {isiForm.unit_kerja || "-"}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              isiForm.status_pegawai === "PNS"
                                ? "bg-green-100 text-green-800"
                                : "bg-blue-100 text-blue-800"
                            }`}
                          >
                            {isiForm.status_pegawai || "-"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="inline-flex items-center gap-1">
                            <span className="text-sm font-bold text-teal-600">
                              {avgScore.toFixed(2)}
                            </span>
                            <span className="text-xs text-gray-500">/ 5</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-gray-700">
                            {formatDateTime(item.created_at)}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {filteredResponden.length > 0 && (
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <span>
                    Halaman <span className="font-semibold">{currentPage}</span>{" "}
                    dari <span className="font-semibold">{totalPages}</span> -
                    Menampilkan{" "}
                    <span className="font-semibold">{currentItems.length}</span>{" "}
                    dari{" "}
                    <span className="font-semibold">
                      {filteredResponden.length}
                    </span>{" "}
                    data
                  </span>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className={`px-2 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                      currentPage === 1
                        ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                        : "bg-white text-gray-700 hover:bg-teal-50 border border-gray-300"
                    }`}
                    title="Halaman Pertama"
                  >
                    <FontAwesomeIcon icon={faAnglesLeft} />
                  </button>
                  <button
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={`px-2 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                      currentPage === 1
                        ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                        : "bg-white text-gray-700 hover:bg-teal-50 border border-gray-300"
                    }`}
                  >
                    <FontAwesomeIcon icon={faChevronLeft} />
                  </button>

                  <div className="hidden sm:flex gap-2">
                    {renderPagination()}
                  </div>

                  <button
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className={`px-2 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                      currentPage === totalPages
                        ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                        : "bg-white text-gray-700 hover:bg-teal-50 border border-gray-300"
                    }`}
                  >
                    <FontAwesomeIcon icon={faChevronRight} />
                  </button>
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className={`px-2 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                      currentPage === totalPages
                        ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                        : "bg-white text-gray-700 hover:bg-teal-50 border border-gray-300"
                    }`}
                    title="Halaman Terakhir"
                  >
                    <FontAwesomeIcon icon={faAnglesRight} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center bg-white p-8 rounded-2xl shadow-md max-w-md">
          <div className="text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">
            Terjadi Kesalahan
          </h2>
          <p className="text-sm text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => navigate("/admin")}
            className="px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors"
          >
            Kembali ke Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-8">
        <div className="bg-white rounded-2xl shadow-md p-6 border-l-4 border-teal-500">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Daftar Responden
          </h1>
          {loadingKegiatan ? (
            <div className="animate-pulse text-gray-400">
              <div className="h-6 bg-gray-200 rounded w-3/4 mb-2" />
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
              <div className="mt-2 flex flex-wrap gap-3 text-sm">
                <div className="h-4 bg-gray-200 rounded w-24" />
                <div className="h-4 bg-gray-200 rounded w-40" />
              </div>
            </div>
          ) : kegiatanInfo ? (
            <div className="text-gray-600">
              <p className="text-lg font-semibold text-teal-500">
                {kegiatanInfo.nama_kegiatan}
              </p>
              {kegiatanInfo.judul_tema && (
                <p className="text-sm italic">" {kegiatanInfo.judul_tema}"</p>
              )}
              <div className="mt-2 flex flex-wrap gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="font-medium">{formatDate(kegiatanInfo.tanggal)}</span>
                </div>
                {(kegiatanInfo.jam_mulai || kegiatanInfo.jam_selesai) && (
                  <>
                    <span className="text-gray-400">•</span>
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="font-medium">
                        {formatTime(kegiatanInfo.jam_mulai)} - {formatTime(kegiatanInfo.jam_selesai)} WIB
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl shadow-md overflow-hidden">
        <div className="border-b border-gray-200">
          <div className="flex">
            <button
              onClick={() => setActiveTab("overview")}
              className={`flex-1 px-6 py-4 text-sm font-semibold transition-colors ${
                activeTab === "overview"
                  ? "border-b-2 border-teal-500 text-teal-600 bg-teal-50"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              <FontAwesomeIcon icon={faChartBar} className="mr-2" />
              Overview
            </button>
            <button
              onClick={() => setActiveTab("responden")}
              className={`flex-1 px-6 py-4 text-sm font-semibold transition-colors ${
                activeTab === "responden"
                  ? "border-b-2 border-teal-500 text-teal-600 bg-teal-50"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              <FontAwesomeIcon icon={faUsers} className="mr-2" />
              Responden ({responden.length})
            </button>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="bg-white rounded-2xl shadow-md p-12">
          <div className="flex flex-col items-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-500 border-t-transparent"></div>
            <p className="mt-4 text-sm text-gray-600">Memuat data...</p>
          </div>
        </div>
      ) : (
        /* Tab Content */
        <div>
          {activeTab === "overview" ? renderOverview() : renderResponden()}
        </div>
      )}
    </div>
  );
}
