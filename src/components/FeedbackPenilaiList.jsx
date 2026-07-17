import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faSearch,
  faFilter,
  faTrash,
  faSpinner,
  faChevronLeft,
  faChevronRight,
  faAnglesLeft,
  faAnglesRight,
  faSync,
  faCalendarAlt,
  faCheckCircle,
  faTimesCircle,
  faEye,
  faXmark,
  faCircleCheck,
  faUserClock,
} from "@fortawesome/free-solid-svg-icons";
import DatePicker, { registerLocale } from "react-datepicker";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import Swal from "sweetalert2";
import "react-datepicker/dist/react-datepicker.css";

import { Model } from "survey-core";
import { Survey } from "survey-react-ui";
import "survey-core/survey-core.min.css";
import "survey-core/survey.i18n";

import {
  getPegawai,
  getPenilaianPegawaiPaginated,
  deletePenilaianPegawai,
  getFeedbackTemplates,
} from "../config/api";
import { getTemplateForRole, getPenilaianStatus } from "../utils/penilaian";
import SearchableSelect from "./SearchableSelect";

registerLocale("id", localeId);

const CURRENT_PERIOD = new Date().toISOString().slice(0, 7);
const MONTH_NAMES_ID = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

function formatPeriodIndo(period) {
  if (!period) return "-";
  const match = String(period).match(/^(\d{4})-(\d{2})$/);
  if (!match) return String(period);
  const monthIndex = Number(match[2]) - 1;
  return `${MONTH_NAMES_ID[monthIndex] || match[2]} ${match[1]}`;
}

function periodToDate(period) {
  const match = String(period || "").match(/^(\d{4})-(\d{2})$/);
  if (!match) return new Date();
  return new Date(Number(match[1]), Number(match[2]) - 1, 1);
}

function dateToPeriod(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime()))
    return CURRENT_PERIOD;
  return format(date, "yyyy-MM");
}

function normalizeTemplate(payload) {
  if (payload && Array.isArray(payload.pages)) return payload;
  if (payload?.data && Array.isArray(payload.data.pages)) return payload.data;
  if (payload?.json && Array.isArray(payload.json.pages)) return payload.json;
  return buildDefaultTemplate();
}

function buildDefaultTemplate() {
  return {
    title: "Form Penilaian Umpan Balik 360",
    description:
      "Mohon isi dengan jujur dan sebenar-benarnya karena bersifat anonim.",
    showQuestionNumbers: "off",
    completedHtml:
      '<h3 class="sv-title">Terima kasih, penilaian Anda sudah tersimpan.</h3>',
    pages: [
      {
        name: "page1",
        title: "Data Pegawai yang Dinilai",
        elements: [
          { type: "text", name: "nama_pegawai", title: "Nama Pegawai yang Dinilai", isRequired: true, readOnly: true },
          { type: "text", name: "nip", title: "NIP", isRequired: true, readOnly: true },
          { type: "text", name: "jabatan", title: "Jabatan", isRequired: true, readOnly: true },
          { type: "text", name: "unit_kerja", title: "Unit Kerja", isRequired: true, readOnly: true },
        ],
      },
      {
        name: "page2",
        title: "Penilaian",
        elements: [
          { type: "rating", name: "kinerja_utama", title: "Bagaimana penilaian Anda terhadap kinerja utama pegawai ini?", isRequired: true, rateMax: 5, displayMode: "buttons" },
          { type: "rating", name: "komunikasi", title: "Bagaimana kualitas komunikasi pegawai ini dalam bekerja sama?", isRequired: true, rateMax: 5, displayMode: "buttons" },
          { type: "rating", name: "kolaborasi", title: "Seberapa baik pegawai ini berkolaborasi dengan tim?", isRequired: true, rateMax: 5, displayMode: "buttons" },
          { type: "rating", name: "inisiatif", title: "Seberapa besar inisiatif pegawai ini dalam menyelesaikan tugas?", isRequired: true, rateMax: 5, displayMode: "buttons" },
          { type: "rating", name: "tanggung_jawab", title: "Bagaimana penilaian Anda terhadap tanggung jawab pegawai ini?", isRequired: true, rateMax: 5, displayMode: "buttons" },
          { type: "comment", name: "catatan_tambahan", title: "Catatan tambahan atau masukan untuk pegawai ini" },
        ],
      },
    ],
  };
}

function ReadOnlySurvey({ templateJson, item, resolveEmployeeInfo }) {
  const model = useMemo(() => {
    if (!templateJson) return null;
    const customTemplate = getTemplateForRole(templateJson, item?.role);
    const m = new Model(customTemplate);
    m.onTextMarkdown.add((_, options) => {
      options.html = options.text.replace(
        /\*\*(.*?)\*\*/g,
        "<strong>$1</strong>",
      );
    });
    m.locale = "id";
    m.mode = "display";

    const answers = (() => {
      if (!item.penilaian) return {};
      if (typeof item.penilaian === "object") return item.penilaian;
      try {
        return JSON.parse(item.penilaian);
      } catch {
        return {};
      }
    })();

    const pegawai = resolveEmployeeInfo(item.nip_pegawai);

    let peran = "Penilai";
    if (item.role === "Atasan Langsung") peran = "Item 1";
    else if (item.role === "Rekan Kerja") peran = "Item 2";
    else if (item.role === "Bawahan") peran = "Item 3";
    else if (item.role === "Penerima Manfaat Kerja") peran = "Item 4";
    else if (item.role === "Diri Sendiri") peran = "Item 5";

    m.data = {
      ...answers,
      nama_pegawai: pegawai.nama,
      nip: pegawai.nip,
      jabatan: pegawai.jabatan,
      unit_kerja: pegawai.unit,
      peran: peran,
    };

    return m;
  }, [templateJson, item, resolveEmployeeInfo]);

  if (!model) return null;
  return <Survey model={model} />;
}

function DetailJawabanModal({ open, item, templateJson, resolveEmployeeInfo, onClose }) {
  if (!open || !item) return null;
  if (typeof document === "undefined") return null;

  const penilaiInfo = resolveEmployeeInfo(item.nip_penilai);
  const pegawaiInfo = resolveEmployeeInfo(item.nip_pegawai);

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm"
      style={{ zIndex: 12000 }}
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200"
        onClick={(event) => event.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5 bg-slate-50/50">
          <div>
            <div className="inline-flex rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-teal-700">
              Detail Jawaban Evaluasi
            </div>
            <h2 className="mt-3 text-xl font-bold text-slate-900">
              Evaluasi oleh: {penilaiInfo.nama} ({item.role})
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Untuk Pegawai: {pegawaiInfo.nama} &bull; NIP: {pegawaiInfo.nip}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition"
            aria-label="Tutup"
          >
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>

        {/* Scrollable SurveyJS Render */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
          <div className="survey-container-readonly border border-slate-200 rounded-2xl overflow-hidden p-4 bg-white shadow-sm">
            <ReadOnlySurvey
              templateJson={templateJson}
              item={item}
              resolveEmployeeInfo={resolveEmployeeInfo}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 px-6 py-4 bg-slate-50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-900 hover:bg-slate-800 px-5 py-2.5 text-sm font-semibold text-white transition shadow-sm"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function FeedbackPenilaiList() {
  const navigate = useNavigate();

  // Data states
  const [penilaiList, setPenilaiList] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [error, setError] = useState("");
  const [templateJson, setTemplateJson] = useState(null);
  const [selectedDetailItem, setSelectedDetailItem] = useState(null);

  // Filter states
  const [filterPeriod, setFilterPeriod] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [filterActive, setFilterActive] = useState("");
  const [nipPegawai, setNipPegawai] = useState("");
  const [nipPenilai, setNipPenilai] = useState("");
  const [filterStatusPenilaian, setFilterStatusPenilaian] = useState("");

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [pagination, setPagination] = useState({
    total: 0,
    lastPage: 1,
    currentPage: 1,
    from: 0,
    to: 0,
  });

  // Load employees for resolving names and populate dropdowns
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        setLoadingEmployees(true);
        const res = await getPegawai();
        const data = Array.isArray(res)
          ? res
          : Array.isArray(res?.data)
            ? res.data
            : [];
        setEmployees(data);
      } catch (err) {
        console.error("Failed to load employee list", err);
      } finally {
        setLoadingEmployees(false);
      }
    };
    fetchEmployees();
  }, []);

  // Load SurveyJS Template
  useEffect(() => {
    getFeedbackTemplates()
      .then((res) => {
        const tpl = normalizeTemplate(res);
        setTemplateJson(tpl);
      })
      .catch((err) => console.error("Failed to load template", err));
  }, []);

  // Create lookup map for employees NIP
  const employeeMap = useMemo(() => {
    const map = new Map();
    employees.forEach((emp) => {
      const nip = String(
        emp?.nip || emp?.nip_baru || emp?.nipBaru || emp?.nip_lama || "",
      ).trim();
      if (nip) {
        map.set(nip, emp);
      }
    });
    return map;
  }, [employees]);

  const resolveEmployeeName = (nip) => {
    const key = String(nip || "").trim();
    if (!key) return "-";
    const emp = employeeMap.get(key);
    if (!emp) return key;
    return emp.nama || emp.name || emp.nama_lengkap || key;
  };

  const resolveEmployeeInfo = (nip) => {
    const key = String(nip || "").trim();
    if (!key) return { nama: "-", nip: "-", jabatan: "-", unit: "-" };
    const match = employeeMap.get(key);
    return {
      nama: match?.nama || match?.name || match?.nama_lengkap || key,
      nip: key,
      jabatan: match?.jabatan_name || match?.jabatan || match?.nama_jabatan || "-",
      unit: match?.unit_organisasi_name || match?.unit_kerja || match?.unit || "-",
    };
  };

  // Populate employee options for SearchableSelect
  const employeeOptions = useMemo(() => {
    return employees.map((emp) => {
      const nip = String(
        emp?.nip || emp?.nip_baru || emp?.nipBaru || emp?.nip_lama || "",
      ).trim();
      const name = emp.nama || emp.name || emp.nama_lengkap || nip;
      const unit = emp.unit_organisasi_name || emp.unit_kerja || emp.unit || "";
      const jabatan = emp.jabatan_name || emp.jabatan || "";
      return {
        value: nip,
        label: `${name} - ${nip}`,
        name: name,
        subtitle: [nip, jabatan, unit].filter(Boolean).join(" | "),
      };
    });
  }, [employees]);

  // Fetch assessment list
  const fetchPenilai = async (page = currentPage) => {
    setLoading(true);
    setError("");
    try {
      const params = {
        with_pagination: true,
        per_page: perPage,
        page: page,
      };
      if (filterPeriod) params.periode = filterPeriod;
      if (filterRole) params.role = filterRole;
      if (filterActive !== "") params.active = filterActive;
      if (nipPegawai) params.nip_pegawai = nipPegawai;
      if (nipPenilai) params.nip_penilai = nipPenilai;
      if (filterStatusPenilaian) params.status_penilaian = filterStatusPenilaian;

      const response = await getPenilaianPegawaiPaginated(params);
      if (response?.success) {
        setPenilaiList(response.data?.data || []);
        setPagination({
          total: response.data?.total || 0,
          lastPage: response.data?.last_page || 1,
          currentPage: response.data?.current_page || 1,
          from: response.data?.from || 0,
          to: response.data?.to || 0,
        });
      } else {
        setError(response?.message || "Gagal memuat data penilai.");
      }
    } catch (err) {
      console.error(err);
      setError(err?.message || "Gagal memuat data penilai.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPenilai(currentPage);
  }, [currentPage, perPage]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchPenilai(1);
  };

  const handleResetFilters = () => {
    setFilterPeriod("");
    setFilterRole("");
    setFilterActive("");
    setNipPegawai("");
    setNipPenilai("");
    setFilterStatusPenilaian("");
    setCurrentPage(1);
    
    // Trigger reset query safely in next tick
    setTimeout(() => {
      setLoading(true);
      setError("");
      const params = {
        with_pagination: true,
        per_page: perPage,
        page: 1,
      };
      getPenilaianPegawaiPaginated(params)
        .then((response) => {
          if (response?.success) {
            setPenilaiList(response.data?.data || []);
            setPagination({
              total: response.data?.total || 0,
              lastPage: response.data?.last_page || 1,
              currentPage: response.data?.current_page || 1,
              from: response.data?.from || 0,
              to: response.data?.to || 0,
            });
          }
        })
        .catch(err => console.error(err))
        .finally(() => setLoading(false));
    }, 0);
  };

  const handleDelete = (id, detailInfo) => {
    Swal.fire({
      title: "Konfirmasi Hapus",
      text: `Apakah Anda yakin ingin menghapus penugasan penilai untuk ${detailInfo}?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Hapus",
      cancelButtonText: "Batal",
      reverseButtons: true,
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          Swal.fire({
            title: "Menghapus...",
            allowOutsideClick: false,
            didOpen: () => {
              Swal.showLoading();
            },
          });
          const response = await deletePenilaianPegawai(id);
          if (response?.success) {
            Swal.fire({
              icon: "success",
              title: "Berhasil",
              text: response.message || "Data penilai berhasil dihapus.",
              confirmButtonColor: "#0f766e",
            });
            fetchPenilai(currentPage);
          } else {
            Swal.fire({
              icon: "error",
              title: "Gagal",
              text: response?.message || "Gagal menghapus data penilai.",
              confirmButtonColor: "#0f766e",
            });
          }
        } catch (err) {
          console.error(err);
          Swal.fire({
            icon: "error",
            title: "Gagal",
            text: err?.message || "Terjadi kesalahan saat menghapus data.",
            confirmButtonColor: "#0f766e",
          });
        }
      }
    });
  };

  // Pagination navigation helper
  const renderPagination = () => {
    const pages = [];
    const maxVisible = 5;
    const totalPages = pagination.lastPage;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);

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

  const getRoleBadgeStyle = (role) => {
    switch (role) {
      case "Diri Sendiri":
        return "bg-blue-50 text-blue-700 border border-blue-200";
      case "Atasan Langsung":
        return "bg-purple-50 text-purple-700 border border-purple-200";
      case "Rekan Kerja":
        return "bg-teal-50 text-teal-700 border border-teal-200";
      case "Bawahan":
        return "bg-orange-50 text-orange-700 border border-orange-200";
      case "Penerima Manfaat Kerja":
        return "bg-indigo-50 text-indigo-700 border border-indigo-200";
      default:
        return "bg-slate-50 text-slate-700 border border-slate-200";
    }
  };

  const getStatus = (penilaian, role) => {
    let parsed = {};
    if (penilaian) {
      if (typeof penilaian === "object") {
        parsed = penilaian;
      } else {
        try {
          parsed = JSON.parse(penilaian);
        } catch {
          parsed = {};
        }
      }
    }
    const customTemplate = getTemplateForRole(templateJson, role);
    return getPenilaianStatus(customTemplate, parsed);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/admin/umpan-balik")}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition shadow-sm"
            title="Kembali ke Umpan Balik 360"
          >
            <FontAwesomeIcon icon={faArrowLeft} />
          </button>
          <div className="border-l-4 border-teal-600 pl-4">
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
              Daftar Penilai Pegawai
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Lihat dan kelola seluruh daftar penugasan penilai beserta status penilaian.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
          {error}
        </div>
      )}

      {/* Filter Panel */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <form onSubmit={handleSearchSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Pegawai Dropdown */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">
                Pegawai yang Dinilai
              </label>
              <SearchableSelect
                value={nipPegawai}
                onChange={(e) => setNipPegawai(e.target.value)}
                options={employeeOptions}
                placeholder="Semua Pegawai"
                name="nip_pegawai"
                disabled={loadingEmployees}
              />
            </div>

            {/* Penilai Dropdown */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">
                Penilai (Reviewer)
              </label>
              <SearchableSelect
                value={nipPenilai}
                onChange={(e) => setNipPenilai(e.target.value)}
                options={employeeOptions}
                placeholder="Semua Penilai"
                name="nip_penilai"
                disabled={loadingEmployees}
              />
            </div>

            {/* Periode Filter */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">
                Periode
              </label>
              <DatePicker
                selected={filterPeriod ? periodToDate(filterPeriod) : null}
                onChange={(date) => {
                  setFilterPeriod(date ? dateToPeriod(date) : "");
                }}
                showMonthYearPicker
                dateFormat="MMMM yyyy"
                locale="id"
                placeholderText="Semua Periode"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                wrapperClassName="w-full"
              />
            </div>

            {/* Peran / Role Filter */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">
                Peran (Role)
              </label>
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
              >
                <option value="">Semua Peran</option>
                <option value="Diri Sendiri">Diri Sendiri</option>
                <option value="Atasan Langsung">Atasan Langsung</option>
                <option value="Rekan Kerja">Rekan Kerja</option>
                <option value="Bawahan">Bawahan</option>
                <option value="Penerima Manfaat Kerja">Penerima Manfaat Kerja</option>
              </select>
            </div>

            {/* Status Penilaian Filter */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">
                Status Penilaian
              </label>
              <select
                value={filterStatusPenilaian}
                onChange={(e) => setFilterStatusPenilaian(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
              >
                <option value="">Semua Status Penilaian</option>
                <option value="belum">Belum Dinilai</option>
                <option value="partial">Belum Selesai</option>
                <option value="selesai">Selesai</option>
              </select>
            </div>

            {/* Status Penugasan Filter */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">
                Status Penugasan
              </label>
              <select
                value={filterActive}
                onChange={(e) => setFilterActive(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
              >
                <option value="">Semua Status Penugasan</option>
                <option value="1">Aktif</option>
                <option value="0">Tidak Aktif</option>
              </select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 mt-5 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={handleResetFilters}
              className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 flex items-center justify-center gap-2 shadow-sm"
            >
              <FontAwesomeIcon icon={faSync} />
              Reset Filter
            </button>
            <button
              type="submit"
              className="rounded-xl bg-teal-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-teal-700 text-center flex items-center justify-center gap-2"
            >
              Cari Data
            </button>
          </div>
        </form>
      </div>

      {/* Table Section */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="px-4 py-3.5 text-left text-sm font-bold uppercase tracking-wide">
                  No
                </th>
                <th className="px-4 py-3.5 text-left text-sm font-bold uppercase tracking-wide">
                  Periode
                </th>
                <th className="px-4 py-3.5 text-left text-sm font-bold uppercase tracking-wide">
                  Pegawai yang Dinilai
                </th>
                <th className="px-4 py-3.5 text-left text-sm font-bold uppercase tracking-wide">
                  Penilai (Reviewer)
                </th>
                <th className="px-4 py-3.5 text-left text-sm font-bold uppercase tracking-wide">
                  Peran (Role)
                </th>
                <th className="px-4 py-3.5 text-center text-sm font-bold uppercase tracking-wide">
                  Status Penilaian
                </th>
                <th className="px-4 py-3.5 text-center text-sm font-bold uppercase tracking-wide">
                  Status Aktif
                </th>
                <th className="px-4 py-3.5 text-center text-sm font-bold uppercase tracking-wide">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {loading ? (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center">
                    <div className="flex items-center justify-center gap-3">
                      <FontAwesomeIcon
                        icon={faSpinner}
                        spin
                        className="text-2xl text-teal-600"
                      />
                      <p className="text-sm font-medium text-slate-600">
                        Memuat data penilai...
                      </p>
                    </div>
                  </td>
                </tr>
              ) : penilaiList.length === 0 ? (
                <tr>
                  <td
                    colSpan="8"
                    className="px-6 py-12 text-center text-slate-500 font-medium"
                  >
                    Tidak ada data penilai ditemukan.
                  </td>
                </tr>
              ) : (
                penilaiList.map((item, index) => {
                  const num = (currentPage - 1) * perPage + index + 1;
                  const pegawaiLabel = resolveEmployeeName(item.nip_pegawai);
                  const penilaiLabel = resolveEmployeeName(item.nip_penilai);
                  const detailInfo = `${penilaiLabel} untuk ${pegawaiLabel}`;
                  const status = getStatus(item.penilaian, item.role);

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition">
                      <td className="px-4 py-4 text-sm font-medium text-slate-600">
                        {num}
                      </td>
                      <td className="px-4 py-4 text-sm font-semibold text-slate-900 whitespace-nowrap">
                        {formatPeriodIndo(item.periode)}
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm font-semibold text-slate-900">
                          {resolveEmployeeName(item.nip_pegawai)}
                        </div>
                        <div className="text-xs text-slate-500 font-mono mt-0.5">
                          NIP: {item.nip_pegawai || "-"}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm font-semibold text-slate-900">
                          {resolveEmployeeName(item.nip_penilai)}
                        </div>
                        <div className="text-xs text-slate-500 font-mono mt-0.5">
                          NIP: {item.nip_penilai || "-"}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${getRoleBadgeStyle(
                            item.role,
                          )}`}
                        >
                          {item.role || "-"}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        {status === "complete" && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
                            <FontAwesomeIcon icon={faCircleCheck} className="text-xs" />
                            Selesai
                          </span>
                        )}
                        {status === "partial" && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 border border-amber-200">
                            <FontAwesomeIcon icon={faUserClock} className="text-xs" />
                            Belum Selesai
                          </span>
                        )}
                        {status === "empty" && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 border border-slate-200">
                            <FontAwesomeIcon icon={faUserClock} className="text-xs" />
                            Belum Dinilai
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-center">
                        {item.active ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 border border-green-200">
                            <FontAwesomeIcon icon={faCheckCircle} /> Aktif
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 border border-red-200">
                            <FontAwesomeIcon icon={faTimesCircle} /> Tidak Aktif
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedDetailItem(item)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition shadow-sm"
                          >
                            <FontAwesomeIcon icon={faEye} />
                            Detail
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(item.id, detailInfo)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 transition"
                            title="Hapus Penugasan"
                          >
                            <FontAwesomeIcon icon={faTrash} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Section */}
        {!loading && pagination.total > 0 && (
          <div className="flex flex-col items-center justify-between gap-4 border-t border-slate-200 px-5 py-4 sm:flex-row bg-slate-50/50">
            <div className="text-sm text-slate-600">
              Menampilkan{" "}
              <span className="font-semibold text-slate-900">
                {pagination.from}
              </span>{" "}
              sampai{" "}
              <span className="font-semibold text-slate-900">
                {pagination.to}
              </span>{" "}
              dari{" "}
              <span className="font-semibold text-slate-900">
                {pagination.total}
              </span>{" "}
              data
            </div>

            <div className="flex items-center gap-3 flex-wrap justify-end">
              {/* Per Page Select */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Tampilkan</span>
                <select
                  value={perPage}
                  onChange={(e) => {
                    setPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm font-medium text-slate-700 outline-none hover:bg-slate-50 transition"
                >
                  {[10, 25, 50, 100].map((val) => (
                    <option key={val} value={val}>
                      {val}
                    </option>
                  ))}
                </select>
              </div>

              {/* Navigation Buttons */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="rounded-lg border border-slate-300 bg-white p-2 text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  title="Halaman Pertama"
                >
                  <FontAwesomeIcon icon={faAnglesLeft} />
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  disabled={currentPage === 1}
                  className="rounded-lg border border-slate-300 bg-white p-2 text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  title="Sebelumnya"
                >
                  <FontAwesomeIcon icon={faChevronLeft} />
                </button>

                <div className="flex items-center gap-1">
                  {renderPagination()}
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setCurrentPage((page) =>
                      Math.min(pagination.lastPage, page + 1),
                    )
                  }
                  disabled={currentPage === pagination.lastPage}
                  className="rounded-lg border border-slate-300 bg-white p-2 text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  title="Berikutnya"
                >
                  <FontAwesomeIcon icon={faChevronRight} />
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage(pagination.lastPage)}
                  disabled={currentPage === pagination.lastPage}
                  className="rounded-lg border border-slate-300 bg-white p-2 text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  title="Halaman Terakhir"
                >
                  <FontAwesomeIcon icon={faAnglesRight} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <DetailJawabanModal
        open={!!selectedDetailItem}
        item={selectedDetailItem}
        templateJson={templateJson}
        resolveEmployeeInfo={resolveEmployeeInfo}
        onClose={() => setSelectedDetailItem(null)}
      />
    </div>
  );
}
