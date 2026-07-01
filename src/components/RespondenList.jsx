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
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const barValueLabelPlugin = {
  id: "barValueLabelPlugin",
  afterDatasetsDraw(chart) {
    if (chart.config.type !== "bar") return;

    const { ctx, chartArea } = chart;

    ctx.save();
    ctx.font = "bold 14px sans-serif";
    ctx.fillStyle = "#111827";

    chart.data.datasets.forEach((dataset, datasetIndex) => {
      const meta = chart.getDatasetMeta(datasetIndex);

      if (meta.hidden) return;

      meta.data.forEach((element, dataIndex) => {
        const value = dataset.data?.[dataIndex];
        const numericValue = Number(value);

        if (value === null || value === undefined || Number.isNaN(numericValue)) {
          return;
        }

        const { x, y } = element.getProps(["x", "y"], true);
        const isHorizontal = chart.options.indexAxis === "y";

        ctx.textAlign = isHorizontal ? "left" : "center";
        ctx.textBaseline = "middle";

        if (isHorizontal) {
          const text = String(numericValue);
          const textWidth = ctx.measureText(text).width;
          const labelX = Math.min(x + 8, chartArea.right - textWidth - 2);
          ctx.fillText(text, labelX, y);
        } else {
          const labelY = Math.max(y - 8, chartArea.top + 20);
          ctx.fillText(String(numericValue), x, labelY);
        }
      });
    });

    ctx.restore();
  },
};

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  barValueLabelPlugin,
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
  const [loadingOverview, setLoadingOverview] = useState(true);
  const [loadingRespondenTab, setLoadingRespondenTab] = useState(true);
  const lastFetchedRef = useRef(null);

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
        // Avoid duplicate fetches for the same kegiatan_id (e.g. React StrictMode double-run)
        if (lastFetchedRef.current === kegiatan_id) return;
        lastFetchedRef.current = kegiatan_id;

        setLoading(true);
        setError(null);

        // Fetch kegiatan info and unwrap common response envelope
        setLoadingOverview(true);
        setLoadingKegiatan(true);
        try {
          const kegiatanData = await getKegiatanById(kegiatan_id);
          const kegiatanPayload =
            kegiatanData && kegiatanData.data
              ? kegiatanData.data
              : kegiatanData;
          setKegiatanInfo(kegiatanPayload);
        } catch (e) {
          console.error("Error loading kegiatan info:", e);
        } finally {
          setLoadingKegiatan(false);
        }

        // Fetch responden list and normalize various API shapes (array, {data: [...]}, {data: {data: [...]}})
        setLoadingRespondenTab(true);
        const respondenData = await getKegiatanPegawai({
          kegiatan_id,
          with_pagination: false,
        });

        const extractArray = (resp) => {
          if (!resp) return [];
          if (Array.isArray(resp)) return resp;
          // resp.data may be an array or an envelope (e.g. { current_page, data: [...] })
          if (resp.data) {
            if (Array.isArray(resp.data)) return resp.data;
            if (resp.data.data && Array.isArray(resp.data.data))
              return resp.data.data;
            if (resp.data.results && Array.isArray(resp.data.results))
              return resp.data.results;
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
        setLoadingRespondenTab(false);
        setLoadingOverview(false);
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

  // Calculate statistics from real data
  const calculateStats = () => {
    // Use real responden data
    const dataSource = responden;

    if (dataSource.length === 0) return null;

    // Extract rating fields from form_evaluasi
    let fields = [];
    if (kegiatanInfo?.form_evaluasi?.pages) {
      for (const page of kegiatanInfo.form_evaluasi.pages) {
        if (page.elements) {
          for (const element of page.elements) {
            // Only include rating type fields
            if (element.type === "rating" && element.name) {
              fields.push(element.name);
            }
          }
        }
      }
    }

    // Fallback to common fields if form_evaluasi is not available
    if (fields.length === 0) {
      fields = [
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
    }

    const stats = {};
    fields.forEach((field) => {
      // Access values from isi_form
      const values = dataSource
        .map((r) =>
          r.isi_form && r.isi_form[field] ? Number(r.isi_form[field]) : null,
        )
        .filter((v) => v !== null && !isNaN(v));
      const sum = values.reduce((a, b) => a + b, 0);
      const avg = values.length > 0 ? sum / values.length : 0;

      // Count distribution
      const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      values.forEach((v) => {
        const rounded = Math.round(v);
        if (rounded >= 1 && rounded <= 5) {
          distribution[rounded] = (distribution[rounded] || 0) + 1;
        }
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

      // Get all form fields
      const formFields = getAllFormFields();

      // Prepare data for export
      const exportData = filteredResponden.map((item, idx) => {
        const row = {
          No: idx + 1,
          "Waktu Pengisian": formatDateTime(item.created_at),
        };

        // Add all form fields
        formFields.forEach((field) => {
          const value = item.isi_form?.[field.name];
          row[field.title] = formatFieldValueForExport(value, field.type);
        });

        return row;
      });

      // Create workbook and worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);

      // Set column widths
      const colWidths = [
        { wch: 5 }, // No
        { wch: 20 }, // Waktu Pengisian
        ...formFields.map((field) => ({
          wch:
            field.type === "text" &&
            ![
              "nama_lengkap",
              "nip_no_absen",
              "jabatan",
              "unit_kerja",
              "status_pegawai",
            ].includes(field.name)
              ? 30
              : field.type === "rating"
                ? 10
                : 20,
        })),
      ];
      ws["!cols"] = colWidths;

      // Add worksheet to workbook
      const sheetName = kegiatanInfo?.nama_kegiatan
        ? kegiatanInfo.nama_kegiatan
            .substring(0, 31)
            .replace(/[\\\/\?\*\[\]]/g, "")
        : "Data Responden";
      XLSX.utils.book_append_sheet(wb, ws, sheetName);

      // Generate filename
      const fileName = `Responden_${kegiatanInfo?.nama_kegiatan || "Kegiatan"}_${new Date().toISOString().split("T")[0]}.xlsx`;

      // Download file
      XLSX.writeFile(wb, fileName);

      if (typeof window.Swal !== "undefined") {
        window.Swal.fire({
          icon: "success",
          title: "Berhasil",
          text: `Data berhasil diekspor ke Excel (${filteredResponden.length} data)`,
          confirmButtonColor: "#14b8a6",
        });
      } else {
        alert("Data berhasil diekspor ke Excel");
      }
    } catch (error) {
      console.error("Export Excel error:", error);
      if (typeof window.Swal !== "undefined") {
        window.Swal.fire({
          icon: "error",
          title: "Gagal",
          text: "Gagal mengekspor data ke Excel",
          confirmButtonColor: "#ef4444",
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

      // Get all form fields
      const formFields = getAllFormFields();

      // Initialize PDF
      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      // Add title
      doc.setFontSize(16);
      doc.setFont(undefined, "bold");
      const titleText = kegiatanInfo?.nama_kegiatan || "Data Responden";
      doc.text(titleText, doc.internal.pageSize.getWidth() / 2, 15, {
        align: "center",
      });

      // Add subtitle
      doc.setFontSize(10);
      doc.setFont(undefined, "normal");
      if (kegiatanInfo?.judul_tema) {
        doc.text(
          `"${kegiatanInfo.judul_tema}"`,
          doc.internal.pageSize.getWidth() / 2,
          22,
          { align: "center" },
        );
      }

      // Add date info
      const dateText = `Tanggal Ekspor: ${formatDate(new Date().toISOString())}`;
      doc.text(dateText, doc.internal.pageSize.getWidth() / 2, 28, {
        align: "center",
      });

      // Prepare table headers
      const headers = ["No", "Waktu", ...formFields.map((f) => f.title)];

      // Prepare table data
      const tableData = filteredResponden.map((item, idx) => {
        const row = [idx + 1, formatDateTime(item.created_at)];

        // Add all form field values
        formFields.forEach((field) => {
          const value = item.isi_form?.[field.name];
          const formattedValue = formatFieldValueForExport(value, field.type);
          row.push(formattedValue);
        });

        return row;
      });

      // Add table
      autoTable(doc, {
        head: [headers],
        body: tableData,
        startY: 35,
        styles: {
          fontSize: 7,
          cellPadding: 2,
        },
        headStyles: {
          fillColor: [20, 184, 166], // teal-500
          textColor: 255,
          fontStyle: "bold",
          halign: "center",
        },
        columnStyles: {
          0: { halign: "center", cellWidth: 10 }, // No
          1: { cellWidth: 30 }, // Waktu
          // Dynamic column widths based on field type
          ...Object.fromEntries(
            formFields.map((field, idx) => [
              idx + 2,
              {
                halign: field.type === "rating" ? "center" : "left",
                cellWidth:
                  field.type === "rating"
                    ? 12
                    : field.type === "text" &&
                        ![
                          "nama_lengkap",
                          "nip_no_absen",
                          "jabatan",
                          "unit_kerja",
                          "status_pegawai",
                        ].includes(field.name)
                      ? 35
                      : "auto",
              },
            ]),
          ),
        },
        alternateRowStyles: {
          fillColor: [249, 250, 251], // gray-50
        },
        margin: { top: 35, right: 10, bottom: 10, left: 10 },
        didDrawPage: function (data) {
          // Footer
          const pageCount = doc.internal.getNumberOfPages();
          doc.setFontSize(8);
          doc.setFont(undefined, "normal");
          doc.text(
            `Halaman ${doc.internal.getCurrentPageInfo().pageNumber} dari ${pageCount}`,
            doc.internal.pageSize.getWidth() / 2,
            doc.internal.pageSize.getHeight() - 10,
            { align: "center" },
          );
        },
      });

      // Add summary at the end
      const finalY = doc.lastAutoTable.finalY || 35;
      doc.setFontSize(9);
      doc.setFont(undefined, "bold");
      doc.text(`Total Responden: ${filteredResponden.length}`, 15, finalY + 10);

      // Generate filename
      const fileName = `Responden_${kegiatanInfo?.nama_kegiatan || "Kegiatan"}_${new Date().toISOString().split("T")[0]}.pdf`;

      // Download file
      doc.save(fileName);

      if (typeof window.Swal !== "undefined") {
        window.Swal.fire({
          icon: "success",
          title: "Berhasil",
          text: `Data berhasil diekspor ke PDF (${filteredResponden.length} data)`,
          confirmButtonColor: "#14b8a6",
        });
      } else {
        alert("Data berhasil diekspor ke PDF");
      }
    } catch (error) {
      console.error("Export PDF error:", error);
      if (typeof window.Swal !== "undefined") {
        window.Swal.fire({
          icon: "error",
          title: "Gagal",
          text: "Gagal mengekspor data ke PDF",
          confirmButtonColor: "#ef4444",
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
        </button>,
      );
    }

    return pages;
  };

  const getFieldLabel = (field) => {
    // Extract labels from form_evaluasi in kegiatanInfo
    if (kegiatanInfo?.form_evaluasi?.pages) {
      for (const page of kegiatanInfo.form_evaluasi.pages) {
        if (page.elements) {
          for (const element of page.elements) {
            if (element.name === field && element.title) {
              return element.title;
            }
          }
        }
      }
    }

    // Fallback to field name if not found
    return field.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  // Helper to get all form fields from form_evaluasi
  const getAllFormFields = () => {
    const fields = [];
    if (kegiatanInfo?.form_evaluasi?.pages) {
      for (const page of kegiatanInfo.form_evaluasi.pages) {
        if (page.elements) {
          for (const element of page.elements) {
            if (element.name && element.title) {
              fields.push({
                name: element.name,
                title: element.title,
                type: element.type,
              });
            }
          }
        }
      }
    }
    return fields;
  };

  // Helper to format field value for export
  const formatFieldValueForExport = (value, type) => {
    if (value === null || value === undefined || value === "") return "-";

    switch (type) {
      case "rating":
        return Number(value);
      case "dropdown":
      case "text":
      default:
        return String(value);
    }
  };

  // Render Overview Tab
  const renderOverview = () => {
    // Show loading state while fetching data
    if (loading || loadingOverview || loadingKegiatan) {
      return (
        <div className="bg-white rounded-2xl shadow-md p-12">
          <div className="flex flex-col items-center">
            <FontAwesomeIcon
              icon={faSpinner}
              className="text-4xl text-teal-500 animate-spin"
            />
            <p className="mt-4 text-sm text-gray-600">
              Memuat data overview...
            </p>
          </div>
        </div>
      );
    }

    // Show empty state if no responden data
    if (!stats || responden.length === 0) {
      return (
        <div className="bg-white rounded-2xl shadow-md p-12">
          <div className="flex flex-col items-center">
            <FontAwesomeIcon
              icon={faFileAlt}
              className="text-4xl text-gray-400 mb-4"
            />
            <p className="text-lg font-semibold text-gray-600 mb-2">
              Belum Ada Data Responden
            </p>
            <p className="text-sm text-gray-500 text-center max-w-md">
              Tidak ada responden yang mengisi formulir evaluasi untuk kegiatan
              ini. Data akan muncul setelah ada responden.
            </p>
          </div>
        </div>
      );
    }

    // Prepare chart data for overall satisfaction
    const overallAvg =
      Object.values(stats).reduce((sum, s) => sum + parseFloat(s.average), 0) /
      Object.keys(stats).length;

    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl shadow-md p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium">
                  Total Responden
                </p>
                <p className="text-3xl font-bold mt-2">{responden.length}</p>
              </div>
              <div className="bg-white/20 rounded-full p-4">
                <FontAwesomeIcon icon={faUsers} className="text-3xl" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-[#3085d6] to-[#2b78c2] rounded-2xl shadow-md p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/90 text-sm font-medium">
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

          <div className="bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl shadow-md p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-teal-100 text-sm font-medium">
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

        {/* Overall Rating Comparison */}
        <div className="bg-white rounded-2xl shadow-md p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-6">
            Perbandingan Rata-rata Semua Aspek
          </h3>
          {(() => {
            // Get fields from stats object (which already has fields from form_evaluasi)
            const fields = stats ? Object.keys(stats) : [];

            const labels = fields.map((f) => getFieldLabel(f));
            const averages = fields.map((f) =>
              stats && stats[f] ? parseFloat(stats[f].average) : 0,
            );

            // Color code based on average score
            const backgroundColors = averages.map((avg) => {
              if (avg >= 4.5) return "rgba(20, 184, 166, 0.8)"; // teal-500
              if (avg >= 4.0) return "rgba(48, 133, 214, 0.8)"; // #3085d6
              if (avg >= 3.5) return "rgba(251, 191, 36, 0.8)"; // yellow
              if (avg >= 3.0) return "rgba(251, 146, 60, 0.8)"; // orange
              return "rgba(239, 68, 68, 0.8)"; // red
            });

            const comparisonData = {
              labels: labels,
              datasets: [
                {
                  label: "Rata-rata",
                  data: averages,
                  backgroundColor: backgroundColors,
                  borderColor: backgroundColors.map((c) =>
                    c.replace("0.8", "1"),
                  ),
                  borderWidth: 1,
                },
              ],
            };

            const comparisonOptions = {
              indexAxis: "y",
              responsive: true,
              maintainAspectRatio: false,
              layout: {
                padding: {
                  right: 28,
                },
              },
              plugins: {
                legend: {
                  display: false,
                },
                tooltip: {
                  callbacks: {
                    label: function (context) {
                      return `Rata-rata: ${context.parsed.x.toFixed(2)} / 5`;
                    },
                  },
                },
              },
              scales: {
                x: {
                  beginAtZero: true,
                  max: 5,
                  ticks: {
                    stepSize: 1,
                  },
                },
              },
            };

            return (
              <div className="h-96">
                <Bar data={comparisonData} options={comparisonOptions} />
              </div>
            );
          })()}
        </div>

        {/* Detailed Statistics */}
        <div className="bg-white rounded-2xl shadow-md p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900">
              Statistik Detail Kepuasan
            </h3>
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
                      "rgba(20, 184, 166, 0.8)",
                      "rgba(48, 133, 214, 0.8)",
                    ],
                    borderColor: [
                      "rgb(239, 68, 68)",
                      "rgb(251, 146, 60)",
                      "rgb(251, 191, 36)",
                      "rgb(20, 184, 166)",
                      "rgb(48, 133, 214)",
                    ],
                    borderWidth: 1,
                  },
                ],
              };

              const chartOptions = {
                responsive: true,
                maintainAspectRatio: false,
                layout: {
                  padding: {
                    top: 20,
                  },
                },
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
                  <div className="flex flex-col lg:flex-row gap-6">
                    <div className="lg:w-1/2">
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
                    <div className="lg:w-1/2 h-48">
                      <Bar data={chartData} options={chartOptions} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Demographics & Additional Analysis */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Status Pegawai Distribution */}
          <div className="bg-white rounded-2xl shadow-md p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Distribusi Status Pegawai
            </h3>
            {(() => {
              const statusCount = {};
              responden.forEach((r) => {
                const status = r.isi_form?.status_pegawai || "Tidak Diketahui";
                statusCount[status] = (statusCount[status] || 0) + 1;
              });

              const statusLabels = Object.keys(statusCount);
              const statusValues = Object.values(statusCount);

              const colors = [
                "rgba(48, 133, 214, 0.8)",
                "rgba(20, 184, 166, 0.8)",
                "rgba(251, 191, 36, 0.8)",
                "rgba(251, 146, 60, 0.8)",
                "rgba(239, 68, 68, 0.8)",
                "rgba(168, 85, 247, 0.8)",
              ];

              const doughnutData = {
                labels: statusLabels,
                datasets: [
                  {
                    data: statusValues,
                    backgroundColor: colors.slice(0, statusLabels.length),
                    borderColor: colors
                      .slice(0, statusLabels.length)
                      .map((c) => c.replace("0.8", "1")),
                    borderWidth: 1,
                  },
                ],
              };

              const doughnutOptions = {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: "bottom",
                  },
                  tooltip: {
                    callbacks: {
                      label: function (context) {
                        const label = context.label || "";
                        const value = context.parsed;
                        const total = context.dataset.data.reduce(
                          (a, b) => a + b,
                          0,
                        );
                        const percentage = ((value / total) * 100).toFixed(1);
                        return `${label}: ${value} (${percentage}%)`;
                      },
                    },
                  },
                },
              };

              return (
                <div className="h-80">
                  {statusLabels.length > 0 ? (
                    <Doughnut data={doughnutData} options={doughnutOptions} />
                  ) : (
                    <p className="text-center text-gray-500 py-4">
                      Tidak ada data status pegawai
                    </p>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Average Satisfaction by Status */}
          <div className="bg-white rounded-2xl shadow-md p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Rata-rata Kepuasan per Status
            </h3>
            {(() => {
              const statusAvg = {};
              // Get rating fields from stats object (which already has fields from form_evaluasi)
              const ratingFields = stats ? Object.keys(stats) : [];

              responden.forEach((r) => {
                const status = r.isi_form?.status_pegawai || "Tidak Diketahui";
                if (!statusAvg[status]) {
                  statusAvg[status] = { total: 0, count: 0 };
                }

                let sum = 0;
                let validFields = 0;
                ratingFields.forEach((field) => {
                  const value = r.isi_form?.[field];
                  if (value && !isNaN(Number(value))) {
                    sum += Number(value);
                    validFields++;
                  }
                });

                if (validFields > 0) {
                  statusAvg[status].total += sum / validFields;
                  statusAvg[status].count += 1;
                }
              });

              const statusLabels = Object.keys(statusAvg);
              const statusValues = statusLabels.map((status) => {
                const avg = statusAvg[status];
                return avg.count > 0 ? (avg.total / avg.count).toFixed(2) : 0;
              });

              const barData = {
                labels: statusLabels,
                datasets: [
                  {
                    label: "Rata-rata Kepuasan",
                    data: statusValues,
                    backgroundColor: "rgba(48, 133, 214, 0.8)",
                    borderColor: "rgb(48, 133, 214)",
                    borderWidth: 1,
                  },
                ],
              };

              const barOptions = {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    display: false,
                  },
                  tooltip: {
                    callbacks: {
                      label: function (context) {
                        return `Rata-rata: ${context.parsed.y} / 5`;
                      },
                    },
                  },
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    max: 5,
                    ticks: {
                      stepSize: 1,
                    },
                  },
                },
              };

              return (
                <div className="h-80">
                  {statusLabels.length > 0 ? (
                    <Bar data={barData} options={barOptions} />
                  ) : (
                    <p className="text-center text-gray-500 py-4">
                      Tidak ada data untuk ditampilkan
                    </p>
                  )}
                </div>
              );
            })()}
          </div>
        </div>

        {/* Jabatan & Unit Kerja Statistics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Jabatan Distribution */}
          <div className="bg-white rounded-2xl shadow-md p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Distribusi Jabatan
            </h3>
            {(() => {
              const jabatanCount = {};
              responden.forEach((r) => {
                const jabatan = r.isi_form?.jabatan || "Tidak Diketahui";
                jabatanCount[jabatan] = (jabatanCount[jabatan] || 0) + 1;
              });

              // Sort by count and take top 10
              const sortedJabatan = Object.entries(jabatanCount)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10);

              const jabatanLabels = sortedJabatan.map(([label]) => {
                // Truncate long jabatan names
                return label.length > 30
                  ? label.substring(0, 30) + "..."
                  : label;
              });
              const jabatanValues = sortedJabatan.map(([, value]) => value);

              // Calculate total for percentage
              const total = jabatanValues.reduce((a, b) => a + b, 0);

              // Color code based on count (from highest to lowest)
              const backgroundColors = jabatanValues.map((value) => {
                const percentage = (value / total) * 100;
                if (percentage >= 20) return "rgba(20, 184, 166, 0.8)"; // teal-500 - highest
                if (percentage >= 15) return "rgba(48, 133, 214, 0.8)"; // #3085d6
                if (percentage >= 10) return "rgba(48, 133, 214, 0.65)"; // #3085d6 light
                if (percentage >= 5) return "rgba(251, 191, 36, 0.8)"; // yellow
                if (percentage >= 3) return "rgba(251, 146, 60, 0.8)"; // orange
                return "rgba(239, 68, 68, 0.8)"; // red - lowest
              });

              const barData = {
                labels: jabatanLabels,
                datasets: [
                  {
                    label: "Jumlah",
                    data: jabatanValues,
                    backgroundColor: backgroundColors,
                    borderColor: backgroundColors.map((c) =>
                      c.replace("0.8", "1"),
                    ),
                    borderWidth: 1,
                  },
                ],
              };

              const barOptions = {
                indexAxis: "y",
                responsive: true,
                maintainAspectRatio: false,
                layout: {
                  padding: {
                    right: 28,
                  },
                },
                plugins: {
                  legend: {
                    display: false,
                  },
                  tooltip: {
                    callbacks: {
                      title: function (context) {
                        return sortedJabatan[context[0].dataIndex][0]; // Full jabatan name
                      },
                      label: function (context) {
                        const value = context.parsed.x;
                        const percentage = ((value / total) * 100).toFixed(1);
                        return `Jumlah: ${value} responden (${percentage}%)`;
                      },
                    },
                  },
                },
                scales: {
                  x: {
                    beginAtZero: true,
                    ticks: {
                      stepSize: 1,
                    },
                  },
                },
              };

              // Calculate dynamic height based on number of items (min 320px, 50px per item, max 600px)
              const chartHeight = Math.min(
                600,
                Math.max(320, jabatanLabels.length * 50),
              );

              return (
                <div
                  style={{ height: `${chartHeight}px` }}
                  className="max-h-[600px]"
                >
                  {jabatanLabels.length > 0 ? (
                    <Bar data={barData} options={barOptions} />
                  ) : (
                    <p className="text-center text-gray-500 py-4">
                      Tidak ada data jabatan
                    </p>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Unit Kerja Distribution */}
          <div className="bg-white rounded-2xl shadow-md p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Distribusi Unit Kerja
            </h3>
            {(() => {
              const unitCount = {};
              responden.forEach((r) => {
                const unit = r.isi_form?.unit_kerja || "Tidak Diketahui";
                unitCount[unit] = (unitCount[unit] || 0) + 1;
              });

              // Sort by count and take top 10
              const sortedUnits = Object.entries(unitCount)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10);

              const unitLabels = sortedUnits.map(([label]) => {
                // Truncate long unit names
                return label.length > 30
                  ? label.substring(0, 30) + "..."
                  : label;
              });
              const unitValues = sortedUnits.map(([, value]) => value);

              // Calculate total for percentage
              const total = unitValues.reduce((a, b) => a + b, 0);

              // Color code based on count (from highest to lowest)
              const backgroundColors = unitValues.map((value) => {
                const percentage = (value / total) * 100;
                if (percentage >= 20) return "rgba(20, 184, 166, 0.8)"; // teal-500 - highest
                if (percentage >= 15) return "rgba(48, 133, 214, 0.8)"; // #3085d6
                if (percentage >= 10) return "rgba(48, 133, 214, 0.65)"; // #3085d6 light
                if (percentage >= 5) return "rgba(251, 191, 36, 0.8)"; // yellow
                if (percentage >= 3) return "rgba(251, 146, 60, 0.8)"; // orange
                return "rgba(239, 68, 68, 0.8)"; // red - lowest
              });

              const barData = {
                labels: unitLabels,
                datasets: [
                  {
                    label: "Jumlah",
                    data: unitValues,
                    backgroundColor: backgroundColors,
                    borderColor: backgroundColors.map((c) =>
                      c.replace("0.8", "1"),
                    ),
                    borderWidth: 1,
                  },
                ],
              };

              const barOptions = {
                indexAxis: "y",
                responsive: true,
                maintainAspectRatio: false,
                layout: {
                  padding: {
                    right: 28,
                  },
                },
                plugins: {
                  legend: {
                    display: false,
                  },
                  tooltip: {
                    callbacks: {
                      title: function (context) {
                        return sortedUnits[context[0].dataIndex][0]; // Full unit name
                      },
                      label: function (context) {
                        const value = context.parsed.x;
                        const percentage = ((value / total) * 100).toFixed(1);
                        return `Jumlah: ${value} responden (${percentage}%)`;
                      },
                    },
                  },
                },
                scales: {
                  x: {
                    beginAtZero: true,
                    ticks: {
                      stepSize: 1,
                    },
                  },
                },
              };

              // Calculate dynamic height based on number of items (min 320px, 50px per item, max 600px)
              const chartHeight = Math.min(
                600,
                Math.max(320, unitLabels.length * 50),
              );

              return (
                <div
                  style={{ height: `${chartHeight}px` }}
                  className="max-h-[600px]"
                >
                  {unitLabels.length > 0 ? (
                    <Bar data={barData} options={barOptions} />
                  ) : (
                    <p className="text-center text-gray-500 py-4">
                      Tidak ada data unit kerja
                    </p>
                  )}
                </div>
              );
            })()}
          </div>
        </div>

        {/* Feedback Section */}
        <div className="bg-white rounded-2xl shadow-md p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">
            Feedback Terbaru
          </h3>
          <div className="space-y-4">
            {responden.length > 0 ? (
              responden.slice(0, 20).map((r) => {
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
                        <p className="text-sm text-gray-600">
                          {isiForm.yang_disukai}
                        </p>
                      </div>
                    )}
                    {isiForm.saran_kritik && isiForm.saran_kritik !== "-" && (
                      <div className="mt-2">
                        <p className="text-sm font-medium text-gray-700">
                          Saran & Kritik:
                        </p>
                        <p className="text-sm text-gray-600">
                          {isiForm.saran_kritik}
                        </p>
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
    if (loading || loadingRespondenTab) {
      return (
        <div className="bg-white rounded-2xl shadow-md p-12">
          <div className="flex flex-col items-center">
            <FontAwesomeIcon
              icon={faSpinner}
              className="text-4xl text-teal-500 animate-spin"
            />
            <p className="mt-4 text-sm text-gray-600">
              Memuat data responden...
            </p>
          </div>
        </div>
      );
    }

    // Show empty state if no responden data at all
    if (responden.length === 0) {
      return (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-md p-12">
            <div className="flex flex-col items-center">
              <FontAwesomeIcon
                icon={faFileAlt}
                className="text-4xl text-gray-400 mb-4"
              />
              <p className="text-lg font-semibold text-gray-600 mb-2">
                Belum Ada Data Responden
              </p>
              <p className="text-sm text-gray-500 text-center max-w-md">
                Tidak ada responden yang mengisi formulir untuk kegiatan ini.
                Data akan muncul setelah ada responden.
              </p>
            </div>
          </div>
        </div>
      );
    }

    const formFields = getAllFormFields();

    // Helper to format field value based on type
    const formatFieldValue = (value, type) => {
      if (value === null || value === undefined || value === "") return "-";

      switch (type) {
        case "rating":
          return `${value} / 5`;
        case "dropdown":
        case "text":
        default:
          return value;
      }
    };

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
              {/* <button
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
              </button> */}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="text-teal-500 bg-gray-50">
                <tr style={{ backgroundColor: "#fbfdfe" }}>
                  <th className="px-4 py-3 text-left text-sm font-bold sticky left-0 bg-gray-50 z-10">
                    No
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-bold sticky left-12 bg-gray-50 z-10">
                    Waktu Pengisian
                  </th>
                  {formFields.map((field) => (
                    <th
                      key={field.name}
                      className={`px-4 py-3 text-left text-sm font-bold whitespace-nowrap ${
                        field.type === "rating" ? "text-center" : ""
                      } ${
                        [
                          "nama_lengkap",
                          "nip_no_absen",
                          "jabatan",
                          "unit_kerja",
                          "status_pegawai",
                        ].includes(field.name)
                          ? "cursor-pointer hover:bg-teal-50 transition-colors"
                          : ""
                      }`}
                      onClick={
                        [
                          "nama_lengkap",
                          "nip_no_absen",
                          "jabatan",
                          "unit_kerja",
                          "status_pegawai",
                        ].includes(field.name)
                          ? () => handleSort(field.name)
                          : undefined
                      }
                    >
                      <div
                        className={`flex items-center font-bold ${field.type === "rating" ? "justify-center" : ""}`}
                      >
                        {field.title}
                        {[
                          "nama_lengkap",
                          "nip_no_absen",
                          "jabatan",
                          "unit_kerja",
                          "status_pegawai",
                        ].includes(field.name) && getSortIcon(field.name)}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {currentItems.length === 0 ? (
                  <tr>
                    <td
                      colSpan={formFields.length + 2}
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

                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-teal-50 transition-colors duration-150"
                      >
                        <td className="px-4 py-3 sticky left-0 bg-white z-10">
                          <div className="text-sm text-gray-900 font-medium">
                            {startIndex + idx + 1}
                          </div>
                        </td>
                        <td className="px-4 py-3 sticky left-12 bg-white z-10">
                          <div className="text-sm text-gray-700 whitespace-nowrap">
                            {formatDateTime(item.created_at)}
                          </div>
                        </td>
                        {formFields.map((field) => {
                          const value = isiForm[field.name];
                          const formattedValue = formatFieldValue(
                            value,
                            field.type,
                          );

                          return (
                            <td
                              key={field.name}
                              className={`px-4 py-3 ${field.type === "rating" ? "text-center" : ""}`}
                            >
                              {field.name === "status_pegawai" ? (
                                <span
                                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                    value === "PNS"
                                      ? "bg-teal-100 text-teal-800"
                                      : value === "CPNS"
                                        ? "bg-[#3085d6]/15 text-[#3085d6]"
                                        : value === "PPPK"
                                          ? "bg-purple-100 text-purple-800"
                                          : "bg-gray-100 text-gray-800"
                                  }`}
                                >
                                  {formattedValue}
                                </span>
                              ) : field.type === "rating" ? (
                                <div className="inline-flex items-center gap-1">
                                  <span
                                    className={`text-sm font-semibold ${
                                      value >= 4
                                        ? "text-teal-600"
                                        : value >= 3
                                          ? "text-[#3085d6]"
                                          : value >= 2
                                            ? "text-yellow-600"
                                            : "text-red-600"
                                    }`}
                                  >
                                    {formattedValue}
                                  </span>
                                </div>
                              ) : field.type === "text" &&
                                field.name !== "nama_lengkap" ? (
                                <div
                                  className="text-sm text-gray-700 max-w-xs truncate"
                                  title={formattedValue}
                                >
                                  {formattedValue}
                                </div>
                              ) : (
                                <div
                                  className={`text-sm whitespace-nowrap ${
                                    field.name === "nama_lengkap"
                                      ? "font-medium text-gray-900"
                                      : "text-gray-700"
                                  }`}
                                >
                                  {formattedValue}
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {filteredResponden.length > 0 && (
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
                    {currentItems.length}
                  </span>{" "}
                  dari{" "}
                  <span className="font-semibold text-gray-900 dark:text-gray-100">
                    {filteredResponden.length}
                  </span>{" "}
                  data
                </div>

                <div className="flex items-center gap-2 flex-wrap justify-end">
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
                  <button
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={`p-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-teal-500/10 dark:hover:bg-gray-600 hover:border-teal-500/50 dark:hover:border-teal-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm cursor-pointer ${
                      currentPage === 1 ? "opacity-40 cursor-not-allowed" : ""
                    }`}
                  >
                    <FontAwesomeIcon icon={faChevronLeft} className="w-4 h-4" />
                  </button>

                  <div className="hidden sm:flex items-center gap-1">
                    {renderPagination()}
                  </div>

                  <button
                    onClick={() => setCurrentPage(currentPage + 1)}
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

      {/* Tab Content */}
      <div>
        {activeTab === "overview" ? renderOverview() : renderResponden()}
      </div>
    </div>
  );
}
