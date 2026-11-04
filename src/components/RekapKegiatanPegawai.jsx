import { createPortal } from "react-dom";
import { Fragment, useEffect, useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faAnglesLeft,
  faAnglesRight,
  faAward,
  faCalendarAlt,
  faChevronDown,
  faChevronLeft,
  faChevronRight,
  faChartPie,
  faCircleCheck,
  faClock,
  faDownload,
  faEye,
  faFileExcel,
  faFilter,
  faGraduationCap,
  faSearch,
  faSpinner,
  faSync,
  faTimes,
  faTimesCircle,
  faUsers,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import * as XLSX from "xlsx";
import {
  getPegawai,
  getUnitKerja,
  getJabatan,
  getRekapKegiatanPegawai,
} from "../config/api";
import SearchableSelect from "./SearchableSelect";

const BE_URL = import.meta.env.VITE_BE_URL || "http://localhost:8000";

function showFeedbackMessage(type, title, text) {
  if (typeof window !== "undefined" && window.Swal) {
    window.Swal.fire({
      icon: type,
      title,
      text,
      confirmButtonColor: "#0f766e",
    });
    return;
  }
  if (text) {
    alert(text);
    return;
  }
  alert(title);
}

function normalizePegawaiResponse(raw) {
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.data)) return raw.data;
  if (Array.isArray(raw?.data?.data)) return raw.data.data;
  return [];
}

function getEmployeeName(person) {
  return (
    person?.nama ||
    person?.name ||
    person?.nama_lengkap ||
    person?.full_name ||
    person?.nama_pegawai ||
    ""
  );
}

function getEmployeeNip(person) {
  return (
    person?.nip ||
    person?.nip_baru ||
    person?.nip_pegawai ||
    person?.nomor_induk ||
    ""
  );
}

function getEmployeeJabatan(person) {
  return (
    person?.jabatan ||
    person?.jabatan_name ||
    person?.nama_jabatan ||
    person?.posisi ||
    ""
  );
}

function getEmployeeUnit(person) {
  return (
    person?.unit_organisasi ||
    person?.unit_organisasi_name ||
    person?.unit_kerja ||
    person?.nama_unit_kerja ||
    ""
  );
}

function getCertificateUrl(kg) {
  if (!kg) return null;
  if (typeof kg === "string") {
    if (kg.startsWith("http://") || kg.startsWith("https://")) return kg;
    return `${BE_URL}/api/sertifikat/download/${encodeURIComponent(kg)}`;
  }
  const identifier =
    kg.id ||
    kg.kegiatan_pegawai_id ||
    kg.link_sertifikat ||
    kg.nomor_sertifikat;
  if (!identifier) return null;
  if (
    typeof identifier === "string" &&
    (identifier.startsWith("http://") || identifier.startsWith("https://"))
  ) {
    return identifier;
  }
  return `${BE_URL}/api/sertifikat/download/${encodeURIComponent(identifier)}`;
}

function handleDownloadCertificate(target) {
  if (!target) return;
  const downloadUrl = getCertificateUrl(target);
  if (!downloadUrl) {
    showFeedbackMessage(
      "info",
      "Sertifikat Belum Tersedia",
      "File sertifikat belum tersedia untuk kegiatan ini."
    );
    return;
  }
  window.open(downloadUrl, "_blank");
}

export default function RekapKegiatanPegawai() {
  // Pegawai states
  const [pegawaiAll, setPegawaiAll] = useState([]);
  const [pegawaiList, setPegawaiList] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingAll, setLoadingAll] = useState(true);
  const [loadingList, setLoadingList] = useState(true);

  // Rekap backend states
  const [rekapData, setRekapData] = useState({
    by_nip: {},
    available_years: [],
    statistics: {},
  });
  const [loadingRekap, setLoadingRekap] = useState(true);

  // Filter states
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterJabatan, setFilterJabatan] = useState("");
  const [filterUnitKerja, setFilterUnitKerja] = useState("");
  const [filterTahun, setFilterTahun] = useState("");
  const [filterStatus, setFilterStatus] = useState(""); // "" | "sudah" | "belum"
  const [showFilters, setShowFilters] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Options states
  const [unitKerjaOptions, setUnitKerjaOptions] = useState([]);
  const [jabatanOptions, setJabatanOptions] = useState([]);
  const [loadingUnitKerja, setLoadingUnitKerja] = useState(false);
  const [loadingJabatan, setLoadingJabatan] = useState(false);

  // Export state
  const [exportingExcel, setExportingExcel] = useState(false);

  // Detail Modal state
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  const [error, setError] = useState("");

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(searchInput);
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Load Unit Kerja and Jabatan options
  useEffect(() => {
    let active = true;

    const loadUnitKerja = async () => {
      try {
        setLoadingUnitKerja(true);
        const data = await getUnitKerja();
        if (!active) return;
        setUnitKerjaOptions(
          (data || []).map((item) => ({
            value: item.id,
            label: String(item.unit_organisasi),
          })),
        );
      } catch (err) {
        console.error("Failed to load unit kerja options", err);
      } finally {
        if (active) setLoadingUnitKerja(false);
      }
    };

    const loadJabatan = async () => {
      try {
        setLoadingJabatan(true);
        const data = await getJabatan();
        if (!active) return;
        setJabatanOptions(
          (data || [])
            .map((item) => ({
              value: item.nama || item.name || item.jabatan || item.id || "",
              label: String(item.nama || item.name || item.jabatan || ""),
            }))
            .filter((opt) => opt.value),
        );
      } catch (err) {
        console.error("Failed to load jabatan options", err);
      } finally {
        if (active) setLoadingJabatan(false);
      }
    };

    loadUnitKerja();
    loadJabatan();

    return () => {
      active = false;
    };
  }, []);

  // Fetch Rekap Data from backend
  const fetchRekap = async (tahunParam = filterTahun) => {
    setLoadingRekap(true);
    try {
      const params = {};
      if (tahunParam) params.tahun = tahunParam;
      const res = await getRekapKegiatanPegawai(params);
      if (res?.status === "success" && res?.data) {
        setRekapData(res.data);
      }
    } catch (err) {
      console.error("Failed to fetch rekap kegiatan pegawai", err);
    } finally {
      setLoadingRekap(false);
    }
  };

  useEffect(() => {
    fetchRekap(filterTahun);
  }, [filterTahun]);

  // Fetch all Pegawai for unpaginated lookups and status filtering
  useEffect(() => {
    let active = true;

    const fetchAllPegawai = async () => {
      setLoadingAll(true);
      setError("");
      try {
        const data = await getPegawai({
          with_pagination: false,
          fetch_all: true,
        });
        if (!active) return;
        setPegawaiAll(normalizePegawaiResponse(data));
      } catch (err) {
        if (!active) return;
        console.error("Failed to load all pegawai list", err);
        setError("Gagal memuat data master pegawai");
        setPegawaiAll([]);
      } finally {
        if (active) setLoadingAll(false);
      }
    };

    fetchAllPegawai();

    return () => {
      active = false;
    };
  }, []);

  // Fetch paginated Pegawai for server-side pagination when no client status filter is applied
  useEffect(() => {
    let active = true;

    const fetchPaginatedPegawai = async () => {
      setLoadingList(true);
      setError("");
      try {
        const params = {
          with_pagination: true,
          per_page: itemsPerPage,
          page: currentPage,
        };
        if (searchTerm) params.q = searchTerm;
        if (filterJabatan) params.jabatan = filterJabatan;
        if (filterUnitKerja) params.unit_organisasi_id = filterUnitKerja;

        const data = await getPegawai(params);
        if (!active) return;
        setTotalItems(data.meta?.total || 0);
        setTotalPages(data.meta?.last_page || 1);
        setPegawaiList(normalizePegawaiResponse(data.data));
      } catch (err) {
        if (!active) return;
        console.error("Failed to load paginated pegawai list", err);
        setError("Gagal memuat data pegawai");
        setPegawaiList([]);
      } finally {
        if (active) setLoadingList(false);
      }
    };

    fetchPaginatedPegawai();

    return () => {
      active = false;
    };
  }, [searchTerm, filterJabatan, filterUnitKerja, currentPage, itemsPerPage]);

  const rekapByNip = rekapData?.by_nip || {};

  // Helper to get rekap info for an employee
  const getEmployeeRekap = (nip) => {
    const key = String(nip || "").trim();
    return rekapByNip[key] || { total_kegiatan: 0, total_jp: 0, kegiatan: [] };
  };

  // Determine whether we need client-side filtering (e.g. when filterStatus is set)
  const isFilteringByStatus = Boolean(filterStatus);

  const filteredPegawaiAll = useMemo(() => {
    if (!isFilteringByStatus && !filterJabatan && !filterUnitKerja && !searchTerm) {
      return pegawaiAll;
    }

    const source = Array.isArray(pegawaiAll) ? pegawaiAll : [];
    const search = searchTerm.trim().toLowerCase();

    return source.filter((person) => {
      const nip = getEmployeeNip(person);
      const name = getEmployeeName(person);
      const unit = getEmployeeUnit(person);
      const jabatan = getEmployeeJabatan(person);

      // Search match
      if (search) {
        const matchesNip = nip.toLowerCase().includes(search);
        const matchesName = name.toLowerCase().includes(search);
        if (!matchesNip && !matchesName) return false;
      }

      // Jabatan match
      if (filterJabatan && jabatan !== filterJabatan) {
        return false;
      }

      // Unit Kerja match
      if (filterUnitKerja) {
        const personUnitId =
          person?.unit_organisasi_id ?? person?.unit_id ?? person?.unitOrganisasiId;
        const matchesId =
          personUnitId !== undefined &&
          String(personUnitId) === String(filterUnitKerja);
        const selectedUnitLabel = unitKerjaOptions
          .find((u) => String(u.value) === String(filterUnitKerja))
          ?.label?.toLowerCase();
        const matchesLabel =
          selectedUnitLabel && unit.toLowerCase() === selectedUnitLabel;

        if (!matchesId && !matchesLabel) {
          return false;
        }
      }

      // Status Keikutsertaan match
      if (filterStatus) {
        const empRekap = getEmployeeRekap(nip);
        const hasAttended = empRekap.total_kegiatan > 0;
        if (filterStatus === "sudah" && !hasAttended) return false;
        if (filterStatus === "belum" && hasAttended) return false;
      }

      return true;
    });
  }, [
    pegawaiAll,
    searchTerm,
    filterJabatan,
    filterUnitKerja,
    filterStatus,
    rekapByNip,
    isFilteringByStatus,
    unitKerjaOptions,
  ]);

  // Items to display in the table
  const currentItems = useMemo(() => {
    if (isFilteringByStatus) {
      const startIndex = (currentPage - 1) * itemsPerPage;
      return filteredPegawaiAll.slice(startIndex, startIndex + itemsPerPage);
    }
    return pegawaiList;
  }, [isFilteringByStatus, filteredPegawaiAll, pegawaiList, currentPage, itemsPerPage]);

  const effectiveTotalItems = isFilteringByStatus
    ? filteredPegawaiAll.length
    : totalItems;

  const effectiveTotalPages = isFilteringByStatus
    ? Math.max(1, Math.ceil(filteredPegawaiAll.length / itemsPerPage))
    : totalPages;

  const startIndex = (currentPage - 1) * itemsPerPage;

  // Calculate Overall Statistics
  const overallStats = useMemo(() => {
    const validPegawaiList = Array.isArray(pegawaiAll) ? pegawaiAll : [];
    const totalPegawai = validPegawaiList.length || totalItems;

    let pegawaiMengikuti = 0;
    let totalKegiatanDiikuti = 0;
    let totalJpDiperoleh = 0;

    if (validPegawaiList.length > 0) {
      // Loop berdasarkan daftar master pegawai (pegawaiAll).
      // Setiap pegawai diperiksa NIP-nya: jika ikut banyak kegiatan, cukup dihitung 1 pegawai.
      // NIP yang tidak ada di daftar master pegawai otomatis tidak dihitung.
      validPegawaiList.forEach((person) => {
        const nip = String(getEmployeeNip(person) || "").trim();
        const empRekap = nip ? rekapByNip[nip] : null;

        if (empRekap && empRekap.total_kegiatan > 0) {
          pegawaiMengikuti += 1;
          totalKegiatanDiikuti += empRekap.total_kegiatan;
          totalJpDiperoleh += (empRekap.total_jp || 0);
        }
      });
    } else {
      // Fallback jika data master pegawaiAll belum selesai dimuat
      Object.entries(rekapByNip).forEach(([, item]) => {
        if (item.total_kegiatan > 0) {
          pegawaiMengikuti += 1;
          totalKegiatanDiikuti += item.total_kegiatan;
          totalJpDiperoleh += (item.total_jp || 0);
        }
      });
    }

    const pegawaiBelum = Math.max(0, totalPegawai - pegawaiMengikuti);
    const persenIkut =
      totalPegawai > 0
        ? ((pegawaiMengikuti / totalPegawai) * 100).toFixed(1)
        : "0";
    const persenBelum =
      totalPegawai > 0
        ? ((pegawaiBelum / totalPegawai) * 100).toFixed(1)
        : "0";

    return {
      totalPegawai,
      pegawaiMengikuti,
      pegawaiBelum,
      persenIkut,
      persenBelum,
      totalKegiatanDiikuti,
      totalJpDiperoleh,
      totalKegiatanTersedia: rekapData?.statistics?.total_kegiatan ?? 0,
      totalJpTersedia: rekapData?.statistics?.total_jp_tersedia ?? 0,
    };
  }, [pegawaiAll, totalItems, rekapByNip, rekapData]);

  // Handle Detail Modal
  const openDetailModal = (person) => {
    setSelectedEmployee(person);
    setDetailModalOpen(true);
  };

  const closeDetailModal = () => {
    setSelectedEmployee(null);
    setDetailModalOpen(false);
  };



  // Handle Export to Excel
  const handleExportExcel = async () => {
    try {
      setExportingExcel(true);

      // Ambil seluruh data pegawai sesuai filter yang aktif
      let employeesToExport = [];
      if (pegawaiAll && pegawaiAll.length > 0) {
        const search = searchTerm.trim().toLowerCase();
        employeesToExport = pegawaiAll.filter((person) => {
          const nip = getEmployeeNip(person);
          const name = getEmployeeName(person);
          const unit = getEmployeeUnit(person);
          const jabatan = getEmployeeJabatan(person);

          if (search) {
            const matchesNip = nip.toLowerCase().includes(search);
            const matchesName = name.toLowerCase().includes(search);
            if (!matchesNip && !matchesName) return false;
          }

          if (filterJabatan && jabatan !== filterJabatan) return false;

          if (filterUnitKerja) {
            const personUnitId =
              person?.unit_organisasi_id ?? person?.unit_id ?? person?.unitOrganisasiId;
            const matchesId =
              personUnitId !== undefined &&
              String(personUnitId) === String(filterUnitKerja);
            const selectedUnitLabel = unitKerjaOptions
              .find((u) => String(u.value) === String(filterUnitKerja))
              ?.label?.toLowerCase();
            const matchesLabel =
              selectedUnitLabel && unit.toLowerCase() === selectedUnitLabel;

            if (!matchesId && !matchesLabel) return false;
          }

          if (filterStatus) {
            const empRekap = getEmployeeRekap(nip);
            const hasAttended = empRekap.total_kegiatan > 0;
            if (filterStatus === "sudah" && !hasAttended) return false;
            if (filterStatus === "belum" && hasAttended) return false;
          }

          return true;
        });
      } else {
        // Fallback fetch
        const data = await getPegawai({ with_pagination: false, fetch_all: true });
        employeesToExport = normalizePegawaiResponse(data);
      }

      if (employeesToExport.length === 0) {
        showFeedbackMessage(
          "warning",
          "Perhatian",
          "Tidak ada data pegawai yang dapat diekspor dengan filter aktif saat ini.",
        );
        return;
      }

      // 1. Sheet 1: Ringkasan Rekap Pegawai
      const summaryRows = employeesToExport.map((person, idx) => {
        const nip = getEmployeeNip(person);
        const name = getEmployeeName(person);
        const jabatan = getEmployeeJabatan(person);
        const unit = getEmployeeUnit(person);
        const empRekap = getEmployeeRekap(nip);

        return {
          No: idx + 1,
          "Nama Pegawai": name || "-",
          NIP: nip || "-",
          Jabatan: jabatan || "-",
          "Unit Kerja": unit || "-",
          "Total Kegiatan Diikuti": empRekap.total_kegiatan || 0,
          "Total JP Diperoleh": empRekap.total_jp || 0,
          "Status Keikutsertaan":
            empRekap.total_kegiatan > 0 ? "Sudah Mengikuti" : "Belum Mengikuti",
        };
      });

      // 2. Sheet 2: Detail Kegiatan Pegawai
      const detailRows = [];
      let detailIndex = 1;

      employeesToExport.forEach((person) => {
        const nip = getEmployeeNip(person);
        const name = getEmployeeName(person);
        const jabatan = getEmployeeJabatan(person);
        const unit = getEmployeeUnit(person);
        const empRekap = getEmployeeRekap(nip);

        if (Array.isArray(empRekap.kegiatan) && empRekap.kegiatan.length > 0) {
          empRekap.kegiatan.forEach((kg) => {
            detailRows.push({
              No: detailIndex++,
              NIP: nip || "-",
              "Nama Pegawai": name || "-",
              Jabatan: jabatan || "-",
              "Unit Kerja": unit || "-",
              "Nama Kegiatan": kg.nama_kegiatan || "-",
              "Judul / Tema": kg.judul_tema || "-",
              "Tanggal Pelaksanaan": kg.tanggal || "-",
              "Waktu / Jam":
                kg.jam_mulai && kg.jam_selesai
                  ? `${kg.jam_mulai} - ${kg.jam_selesai}`
                  : kg.jam_mulai || "-",
              Tempat: kg.tempat || "-",
              "Jumlah JP": kg.jumlah_jp || 2,
              "Sumber Keikutsertaan": kg.sumber || "Presensi",
              "Nomor Sertifikat": kg.nomor_sertifikat || "-",
            });
          });
        }
      });

      // Create Workbook
      const wb = XLSX.utils.book_new();

      const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
      wsSummary["!cols"] = [
        { wch: 6 }, // No
        { wch: 34 }, // Nama
        { wch: 22 }, // NIP
        { wch: 35 }, // Jabatan
        { wch: 35 }, // Unit Kerja
        { wch: 22 }, // Total Kegiatan
        { wch: 18 }, // Total JP
        { wch: 22 }, // Status
      ];
      XLSX.utils.book_append_sheet(wb, wsSummary, "Ringkasan Rekap Pegawai");

      if (detailRows.length > 0) {
        const wsDetail = XLSX.utils.json_to_sheet(detailRows);
        wsDetail["!cols"] = [
          { wch: 6 }, // No
          { wch: 22 }, // NIP
          { wch: 34 }, // Nama
          { wch: 32 }, // Jabatan
          { wch: 32 }, // Unit Kerja
          { wch: 38 }, // Nama Kegiatan
          { wch: 45 }, // Judul / Tema
          { wch: 20 }, // Tanggal
          { wch: 18 }, // Jam
          { wch: 30 }, // Tempat
          { wch: 12 }, // Jumlah JP
          { wch: 24 }, // Sumber Keikutsertaan
          { wch: 28 }, // Nomor Sertifikat
        ];
        XLSX.utils.book_append_sheet(wb, wsDetail, "Detail Kegiatan Pegawai");
      }

      const dateStr = new Date().toISOString().split("T")[0];
      const tahunLabel = filterTahun ? `Tahun_${filterTahun}` : "Semua_Tahun";
      const fileName = `Rekap_Kegiatan_Pegawai_${tahunLabel}_${dateStr}.xlsx`;

      XLSX.writeFile(wb, fileName);

      showFeedbackMessage(
        "success",
        "Berhasil",
        `Data Rekap Kegiatan Pegawai berhasil diekspor ke Excel (${summaryRows.length} pegawai).`,
      );
    } catch (err) {
      console.error("Export Excel error:", err);
      showFeedbackMessage("error", "Gagal", "Gagal mengekspor data ke Excel.");
    } finally {
      setExportingExcel(false);
    }
  };

  // Render pagination buttons
  const renderPagination = () => {
    const pages = [];
    const maxVisible = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(effectiveTotalPages, startPage + maxVisible - 1);

    if (endPage - startPage < maxVisible - 1) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    for (let page = startPage; page <= endPage; page += 1) {
      pages.push(
        <button
          key={page}
          onClick={() => setCurrentPage(page)}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
            currentPage === page
              ? "bg-teal-600 text-white shadow-md"
              : "border border-slate-300 bg-white text-slate-700 hover:bg-teal-50"
          }`}
        >
          {page}
        </button>,
      );
    }

    return pages;
  };

  const isTableLoading = loadingList || (isFilteringByStatus && loadingAll) || loadingRekap;
  const hasActiveFilters = Boolean(
    searchTerm || filterJabatan || filterUnitKerja || filterTahun || filterStatus,
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Rekap Kegiatan Pegawai
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-gray-400">
            Rekapitulasi partisipasi kegiatan dan perolehan Jam Pelajaran (JP) setiap pegawai
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => {
              fetchRekap(filterTahun);
            }}
            disabled={loadingRekap}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
            title="Muat ulang rekap"
          >
            <FontAwesomeIcon icon={faSync} className={loadingRekap ? "animate-spin" : ""} />
            Refresh Data
          </button>

          <button
            type="button"
            onClick={handleExportExcel}
            disabled={exportingExcel || isTableLoading}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 font-semibold text-white shadow-sm transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {exportingExcel ? (
              <FontAwesomeIcon icon={faSpinner} spin />
            ) : (
              <FontAwesomeIcon icon={faFileExcel} />
            )}
            Ekspor Excel
          </button>
        </div>
      </div>

      {/* Metric Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* 1. Total Pegawai */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-md dark:border-gray-800 dark:bg-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-gray-400">
                Total Pegawai
              </p>
              <h3 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
                {overallStats.totalPegawai.toLocaleString("id-ID")}
              </h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-gray-400">
                Total pegawai aktif terdaftar
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-50 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400">
              <FontAwesomeIcon icon={faUsers} className="text-xl" />
            </div>
          </div>
        </div>

        {/* 2. Total Pegawai yang Ikut Kegiatan */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-md dark:border-gray-800 dark:bg-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-gray-400">
                Pegawai Ikut Kegiatan
              </p>
              <h3 className="mt-1 text-2xl font-bold text-teal-600 dark:text-teal-400">
                {overallStats.pegawaiMengikuti.toLocaleString("id-ID")}
              </h3>
              <p className="mt-1 text-xs font-medium text-teal-600 dark:text-teal-400">
                {overallStats.persenIkut}% dari total pegawai
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-50 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400">
              <FontAwesomeIcon icon={faCircleCheck} className="text-xl" />
            </div>
          </div>
        </div>

        {/* 3. Total Pegawai yang Belum Pernah Ikut Kegiatan */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-md dark:border-gray-800 dark:bg-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-gray-400">
                Belum Pernah Ikut
              </p>
              <h3 className="mt-1 text-2xl font-bold text-red-600 dark:text-red-400">
                {overallStats.pegawaiBelum.toLocaleString("id-ID")}
              </h3>
              <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">
                {overallStats.persenBelum}% dari total pegawai
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-50 text-red-600 dark:bg-rose-900/30 dark:text-red-400">
              <FontAwesomeIcon icon={faTimesCircle} className="text-xl" />
            </div>
          </div>
        </div>

        {/* 4. Persentase Perbandingan yang Ikut dan yang Tidak */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-md dark:border-gray-800 dark:bg-gray-800">
          <div className="flex items-center justify-between">
            <div className="w-full mr-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-gray-400">
                Perbandingan Ikut vs Belum
              </p>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-xl font-bold text-teal-600 dark:text-teal-400">
                  {overallStats.persenIkut}%
                </span>
                <span className="text-xs text-slate-400 font-semibold">:</span>
                <span className="text-xl font-bold text-red-600 dark:text-red-400">
                  {overallStats.persenBelum}%
                </span>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-gray-700 flex">
                <div
                  style={{ width: `${overallStats.persenIkut}%` }}
                  className="bg-teal-500 h-full transition-all duration-500"
                  title={`Ikut: ${overallStats.persenIkut}%`}
                />
                <div
                  style={{ width: `${overallStats.persenBelum}%` }}
                  className="bg-rose-500 h-full transition-all duration-500"
                  title={`Belum: ${overallStats.persenBelum}%`}
                />
              </div>
              <div className="mt-1 flex items-center justify-between text-[10px] text-slate-500 dark:text-gray-400">
                <span className="text-teal-600 dark:text-teal-400 font-medium">Ikut</span>
                <span className="text-red-600 dark:text-red-400 font-medium">Belum</span>
              </div>
            </div>
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
              <FontAwesomeIcon icon={faChartPie} className="text-xl" />
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
          {error}
        </div>
      )}

      {/* Search and Filters Section */}
      <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-800">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {/* Search bar */}
          <div className="relative max-w-xl flex-1">
            <FontAwesomeIcon
              icon={faSearch}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Cari nama pegawai atau NIP..."
              className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-4 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => {
                  setSearchInput("");
                  setSearchTerm("");
                }}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                title="Hapus pencarian"
              >
                <FontAwesomeIcon icon={faTimes} className="text-sm" />
              </button>
            )}
          </div>

          {/* Filter toggle and controls */}
          <div className="flex flex-wrap items-center gap-3">
            {filterTahun && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700 border border-teal-200 dark:bg-teal-900/40 dark:text-teal-300 dark:border-teal-800">
                <FontAwesomeIcon icon={faCalendarAlt} className="text-[11px]" />
                Tahun {filterTahun}
                <button
                  type="button"
                  onClick={() => setFilterTahun("")}
                  className="ml-1 text-teal-600 hover:text-teal-900 dark:text-teal-400 dark:hover:text-teal-200"
                  title="Hapus filter tahun"
                >
                  <FontAwesomeIcon icon={faTimes} className="text-[10px]" />
                </button>
              </span>
            )}

            <button
              type="button"
              onClick={() => setShowFilters((v) => !v)}
              className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 cursor-pointer"
            >
              <FontAwesomeIcon icon={faFilter} className="text-base text-slate-500" />
              Filter
              {hasActiveFilters && (
                <span className="h-2 w-2 rounded-full bg-teal-600"></span>
              )}
            </button>

            {/* Items Per Page dropdown */}
            <div className="relative">
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="appearance-none rounded-xl border border-slate-300 bg-white py-2.5 pl-4 pr-10 text-sm font-medium text-slate-700 outline-none transition hover:bg-slate-50 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
              >
                {[5, 10, 25, 50, 100].map((option) => (
                  <option key={option} value={option}>
                    {option} per hal
                  </option>
                ))}
              </select>
              <FontAwesomeIcon
                icon={faChevronDown}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
            </div>
          </div>
        </div>

        {/* Expandable Filter Box */}
        <div
          className={`transition-all duration-300 ease-in-out ${
            showFilters
              ? "max-h-[700px] opacity-100"
              : "max-h-0 opacity-0 overflow-hidden"
          }`}
        >
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-4 dark:border-gray-700 dark:bg-gray-800/60">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* Unit Kerja */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300 mb-1">
                  Unit Kerja
                </label>
                <SearchableSelect
                  value={filterUnitKerja}
                  name="unit_kerja"
                  onChange={(e) => {
                    setFilterUnitKerja(e.target.value);
                    setCurrentPage(1);
                  }}
                  options={[
                    { value: "", label: "Semua Unit Kerja" },
                    ...unitKerjaOptions,
                  ]}
                  placeholder="Pilih unit kerja..."
                  disabled={loadingUnitKerja || unitKerjaOptions.length === 0}
                />
              </div>

              {/* Jabatan */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300 mb-1">
                  Jabatan
                </label>
                <SearchableSelect
                  value={filterJabatan}
                  name="jabatan"
                  onChange={(e) => {
                    setFilterJabatan(e.target.value);
                    setCurrentPage(1);
                  }}
                  options={[
                    { value: "", label: "Semua Jabatan" },
                    ...jabatanOptions,
                  ]}
                  placeholder="Pilih jabatan..."
                  disabled={loadingJabatan || jabatanOptions.length === 0}
                />
              </div>

              {/* Tahun Kegiatan */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300 mb-1">
                  Tahun Kegiatan
                </label>
                <select
                  value={filterTahun}
                  onChange={(e) => {
                    setFilterTahun(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                >
                  <option value="">Semua Tahun</option>
                  {(rekapData?.available_years || []).map((yr) => (
                    <option key={yr} value={yr}>
                      Tahun {yr}
                    </option>
                  ))}
                  {filterTahun &&
                    !(rekapData?.available_years || []).includes(Number(filterTahun)) && (
                      <option value={filterTahun}>Tahun {filterTahun}</option>
                    )}
                </select>
              </div>

              {/* Status Keikutsertaan */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300 mb-1">
                  Status Keikutsertaan
                </label>
                <select
                  value={filterStatus}
                  onChange={(e) => {
                    setFilterStatus(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                >
                  <option value="">Semua Pegawai</option>
                  <option value="sudah">Sudah Mengikuti Kegiatan</option>
                  <option value="belum">Belum Pernah Mengikuti</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-start gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setSearchTerm("");
                  setSearchInput("");
                  setFilterJabatan("");
                  setFilterUnitKerja("");
                  setFilterTahun("");
                  setFilterStatus("");
                  setCurrentPage(1);
                }}
                disabled={!hasActiveFilters}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                <FontAwesomeIcon icon={faSync} />
                Reset Filter
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-800">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-gray-700">
            <thead className="bg-slate-50 dark:bg-gray-800/80 text-slate-700 dark:text-gray-200">
              <tr>
                <th className="px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wider">
                  No
                </th>
                <th className="px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wider">
                  Nama Pegawai
                </th>
                <th className="px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wider">
                  NIP
                </th>
                <th className="px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wider">
                  Jabatan
                </th>
                <th className="px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wider">
                  Unit Kerja
                </th>
                <th className="px-4 py-3.5 text-center text-xs font-bold uppercase tracking-wider">
                  Total Kegiatan
                </th>
                <th className="px-4 py-3.5 text-center text-xs font-bold uppercase tracking-wider">
                  Total JP
                </th>
                <th className="px-4 py-3.5 text-center text-xs font-bold uppercase tracking-wider">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
              {isTableLoading ? (
                <tr>
                  <td colSpan="8" className="px-6 py-14 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="h-9 w-9 animate-spin rounded-full border-4 border-teal-500 border-t-transparent"></div>
                      <p className="text-sm font-medium text-slate-600 dark:text-gray-400">
                        Memuat data rekap kegiatan pegawai...
                      </p>
                    </div>
                  </td>
                </tr>
              ) : currentItems.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-14 text-center text-slate-500 dark:text-gray-400">
                    <FontAwesomeIcon
                      icon={faUsers}
                      className="mx-auto mb-3 text-4xl text-slate-300 dark:text-gray-600"
                    />
                    <div className="font-semibold text-slate-800 dark:text-gray-200">
                      Tidak ada data pegawai
                    </div>
                    <div className="mt-1 text-sm text-slate-500 dark:text-gray-400">
                      Coba sesuaikan kata kunci pencarian atau filter yang aktif.
                    </div>
                  </td>
                </tr>
              ) : (
                currentItems.map((person, index) => {
                  const nip = getEmployeeNip(person);
                  const name = getEmployeeName(person);
                  const jabatan = getEmployeeJabatan(person);
                  const unit = getEmployeeUnit(person);
                  const empRekap = getEmployeeRekap(nip);

                  return (
                    <tr
                      key={nip || `${index}`}
                      className="hover:bg-teal-50/40 transition-colors dark:hover:bg-gray-800/50"
                    >
                      <td className="px-4 py-3.5 text-sm font-medium text-slate-600 dark:text-gray-400">
                        {startIndex + index + 1}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {name || "-"}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-sm text-slate-700 dark:text-gray-300 font-mono">
                        {nip || "-"}
                      </td>
                      <td className="px-4 py-3.5 text-sm text-slate-700 dark:text-gray-300">
                        {jabatan || "-"}
                      </td>
                      <td className="px-4 py-3.5 text-sm text-slate-700 dark:text-gray-300">
                        {unit || "-"}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        {empRekap.total_kegiatan > 0 ? (
                          <span className="inline-flex items-center gap-1.5 rounded-lg border border-teal-200 bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-700 shadow-sm dark:border-teal-800 dark:bg-teal-900/30 dark:text-teal-300">
                            <FontAwesomeIcon
                              icon={faCircleCheck}
                              className="text-teal-500 text-[11px]"
                            />
                            {empRekap.total_kegiatan} Kegiatan
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500 dark:bg-gray-800 dark:text-gray-400">
                            0 Kegiatan
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        {empRekap.total_jp > 0 ? (
                          <span className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 shadow-sm dark:border-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300">
                            <FontAwesomeIcon
                              icon={faClock}
                              className="text-indigo-500 text-[11px]"
                            />
                            {empRekap.total_jp} JP
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500 dark:bg-gray-800 dark:text-gray-400">
                            0 JP
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <button
                          type="button"
                          onClick={() => openDetailModal(person)}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-teal-700 cursor-pointer"
                          title="Lihat rincian kegiatan yang diikuti"
                        >
                          <FontAwesomeIcon icon={faEye} />
                          <span>Lihat Detail</span>
                          {empRekap.total_kegiatan > 0 && (
                            <span className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-white text-[10px] font-bold text-teal-800">
                              {empRekap.total_kegiatan}
                            </span>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {!isTableLoading && effectiveTotalItems > 0 && (
          <div className="flex flex-col items-center justify-between gap-4 border-t border-slate-200 px-4 py-4 sm:flex-row dark:border-gray-700">
            <div className="text-sm text-slate-600 dark:text-gray-400">
              Menampilkan{" "}
              <span className="font-semibold text-slate-900 dark:text-white">
                {currentItems.length}
              </span>{" "}
              dari{" "}
              <span className="font-semibold text-slate-900 dark:text-white">
                {effectiveTotalItems.toLocaleString("id-ID")}
              </span>{" "}
              pegawai
            </div>

            <div className="flex items-center gap-2 flex-wrap justify-end">
              <button
                type="button"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="rounded-lg border border-slate-300 bg-white p-2 text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                title="Halaman pertama"
              >
                <FontAwesomeIcon icon={faAnglesLeft} />
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="rounded-lg border border-slate-300 bg-white p-2 text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                title="Halaman sebelumnya"
              >
                <FontAwesomeIcon icon={faChevronLeft} />
              </button>

              <div className="hidden items-center gap-2 sm:flex">
                {renderPagination()}
              </div>

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(effectiveTotalPages, p + 1))}
                disabled={currentPage === effectiveTotalPages}
                className="rounded-lg border border-slate-300 bg-white p-2 text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                title="Halaman berikutnya"
              >
                <FontAwesomeIcon icon={faChevronRight} />
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage(effectiveTotalPages)}
                disabled={currentPage === effectiveTotalPages}
                className="rounded-lg border border-slate-300 bg-white p-2 text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                title="Halaman terakhir"
              >
                <FontAwesomeIcon icon={faAnglesRight} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal: Detail Kegiatan Pegawai */}
      {detailModalOpen && selectedEmployee && (
        <DetailKegiatanModal
          employee={selectedEmployee}
          rekap={getEmployeeRekap(getEmployeeNip(selectedEmployee))}
          onClose={closeDetailModal}
        />
      )}
    </div>
  );
}

/**
 * Modal component to display detail of activities attended by a specific employee
 */
function DetailKegiatanModal({
  employee,
  rekap,
  onClose,
  onDownloadCertificate = handleDownloadCertificate,
}) {
  if (typeof document === "undefined") return null;

  const name = getEmployeeName(employee);
  const nip = getEmployeeNip(employee);
  const jabatan = getEmployeeJabatan(employee);
  const unit = getEmployeeUnit(employee);

  const kegiatanList = rekap?.kegiatan || [];

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm transition-all"
      style={{ zIndex: 12000 }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-6xl max-h-[90vh] flex flex-col rounded-2xl bg-white shadow-2xl dark:bg-gray-800 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-slate-200 p-5 dark:border-gray-700">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300">
                <FontAwesomeIcon icon={faGraduationCap} />
              </span>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Rincian Kegiatan yang Diikuti
              </h3>
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-gray-400">
              Daftar seluruh kegiatan pelatihan / workshop yang telah dihadiri pegawai ini
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-gray-700 dark:hover:text-white"
          >
            <FontAwesomeIcon icon={faXmark} className="text-lg" />
          </button>
        </div>

        {/* Pegawai Info Card */}
        <div className="border-b border-slate-200 bg-slate-50/70 p-5 dark:border-gray-700 dark:bg-gray-800/40">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <h4 className="text-base font-bold text-slate-900 dark:text-white">
                {name || "-"}
              </h4>
              <p className="text-xs font-mono text-slate-600 dark:text-gray-300">
                NIP: {nip || "-"}
              </p>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-gray-400 pt-0.5">
                <span className="font-medium text-slate-700 dark:text-gray-200">
                  {jabatan || "-"}
                </span>
                <span>•</span>
                <span>{unit || "-"}</span>
              </div>
            </div>

            {/* Total Badges */}
            <div className="flex items-center gap-3">
              <div className="rounded-xl border border-teal-200 bg-teal-50 px-3.5 py-2 text-center dark:border-teal-800 dark:bg-teal-900/30">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-teal-600 dark:text-teal-400">
                  Total Kegiatan
                </p>
                <p className="text-lg font-bold text-teal-700 dark:text-teal-300">
                  {rekap?.total_kegiatan || 0}
                </p>
              </div>
              <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-3.5 py-2 text-center dark:border-indigo-800 dark:bg-indigo-900/30">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  Total JP
                </p>
                <p className="text-lg font-bold text-indigo-700 dark:text-indigo-300">
                  {rekap?.total_jp || 0} JP
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Activities List Table */}
        <div className="flex-1 overflow-y-auto p-5">
          {kegiatanList.length === 0 ? (
            <div className="py-12 text-center">
              <FontAwesomeIcon
                icon={faAward}
                className="mx-auto mb-3 text-4xl text-slate-300 dark:text-gray-600"
              />
              <p className="font-semibold text-slate-700 dark:text-gray-300">
                Belum ada kegiatan yang diikuti
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-gray-400">
                Pegawai ini belum tercatat pada daftar presensi kegiatan maupun evaluasi narasumber.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-gray-700">
              <table className="min-w-full divide-y divide-slate-200 dark:divide-gray-700">
                <thead className="bg-slate-50 dark:bg-gray-800 text-slate-700 dark:text-gray-200">
                  <tr>
                    <th className="px-3.5 py-3 text-left text-xs font-bold uppercase tracking-wider">
                      No
                    </th>
                    <th className="px-3.5 py-3 text-left text-xs font-bold uppercase tracking-wider">
                      Nama & Tema Kegiatan
                    </th>
                    <th className="px-3.5 py-3 text-left text-xs font-bold uppercase tracking-wider">
                      Tanggal
                    </th>
                    <th className="px-3.5 py-3 text-center text-xs font-bold uppercase tracking-wider">
                      JP
                    </th>
                    <th className="px-3.5 py-3 text-left text-xs font-bold uppercase tracking-wider">
                      Sumber Keikutsertaan
                    </th>
                    <th className="px-3.5 py-3 text-left text-xs font-bold uppercase tracking-wider">
                      Sertifikat
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
                  {kegiatanList.map((kg, idx) => {
                    const hasCert = Boolean(
                      kg.ada_sertifikat ||
                      kg.link_sertifikat ||
                      kg.id ||
                      kg.kegiatan_pegawai_id
                    );

                    return (
                      <tr
                        key={kg.kegiatan_id || `${idx}`}
                        className="hover:bg-slate-50/60 dark:hover:bg-gray-800/40"
                      >
                        <td className="px-3.5 py-3 text-xs font-medium text-slate-600 dark:text-gray-400">
                          {idx + 1}
                        </td>
                        <td className="px-3.5 py-3">
                          <div className="font-semibold text-sm text-slate-900 dark:text-white">
                            {kg.nama_kegiatan || "-"}
                          </div>
                          {kg.judul_tema && (
                            <div className="mt-0.5 text-xs text-slate-500 dark:text-gray-400 line-clamp-1">
                              {kg.judul_tema}
                            </div>
                          )}
                          {kg.tempat && (
                            <div className="mt-1 text-[11px] text-slate-400 dark:text-gray-500">
                              📍 {kg.tempat}
                            </div>
                          )}
                        </td>
                        <td className="px-3.5 py-3 text-xs text-slate-700 dark:text-gray-300 whitespace-nowrap">
                          <div>{kg.tanggal || "-"}</div>
                          {kg.jam_mulai && (
                            <div className="text-[11px] text-slate-400 dark:text-gray-500">
                              {kg.jam_mulai} {kg.jam_selesai ? `- ${kg.jam_selesai}` : ""}
                            </div>
                          )}
                        </td>
                        <td className="px-3.5 py-3 text-center">
                          <span className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-bold text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                            {kg.jumlah_jp || 2} JP
                          </span>
                        </td>
                        <td className="px-3.5 py-3">
                          {kg.sumber === "Presensi & Evaluasi" ? (
                            <span
                              className="inline-flex items-center gap-1 rounded-md bg-purple-50 px-2.5 py-1 text-xs font-semibold text-purple-700 border border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800"
                              title="Tercatat di presensi kegiatan & evaluasi narasumber (dihitung 1 kegiatan)"
                            >
                              Presensi & Evaluasi
                              <span className="text-[10px] text-purple-500 font-normal">
                                (1x)
                              </span>
                            </span>
                          ) : kg.sumber === "Evaluasi Narasumber" ? (
                            <span className="inline-flex items-center rounded-md bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800">
                              Evaluasi Narasumber
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-md bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-700 border border-teal-200 dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-800">
                              Presensi Kegiatan
                            </span>
                          )}
                        </td>
                        <td className="px-3.5 py-3 text-xs">
                          {hasCert ? (
                            <div className="space-y-1">
                              <button
                                type="button"
                                onClick={() => handleDownloadCertificate(kg)}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-2.5 py-1 text-xs font-semibold text-white shadow-sm transition hover:bg-teal-700 cursor-pointer"
                                title="Unduh Sertifikat"
                              >
                                <FontAwesomeIcon icon={faDownload} className="text-[11px]" />
                                Unduh Sertifikat
                              </button>
                              {kg.nomor_sertifikat && (
                                <div className="text-[10px] text-slate-500 font-mono">
                                  No: {kg.nomor_sertifikat}
                                </div>
                              )}
                            </div>
                          ) : kg.nomor_sertifikat ? (
                            <span className="text-xs font-mono text-slate-700 dark:text-gray-300">
                              {kg.nomor_sertifikat}
                            </span>
                          ) : (
                            <span className="text-slate-400 dark:text-gray-500 text-xs">
                              -
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end border-t border-slate-200 bg-slate-50 p-4 dark:border-gray-700 dark:bg-gray-800">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-300 bg-white px-5 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

