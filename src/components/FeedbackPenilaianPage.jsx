import React, { useState, useEffect, useMemo, Fragment } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faChevronLeft,
  faChevronRight,
  faCircleCheck,
  faEye,
  faSearch,
  faSpinner,
  faUserClock,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import SearchableSelect from "./SearchableSelect";
import {
  getPegawai,
  getPenilaianPegawai,
  getFeedbackTemplates,
} from "../config/api";
import { Model } from "survey-core";
import { getTemplateForRole, getPenilaianStatus } from "../utils/penilaian";
import { Survey } from "survey-react-ui";
import "survey-core/survey-core.min.css";
import "survey-core/survey.i18n";

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

function getEmployeeNip(person) {
  return String(
    person?.nip ||
    person?.nip_baru ||
    person?.nipBaru ||
    person?.nip_lama ||
    person?.nipLama ||
    "",
  ).trim();
}

function getEmployeeName(person) {
  return (
    person?.nama ||
    person?.name ||
    person?.nama_lengkap ||
    person?.full_name ||
    person?.fullname ||
    person?.username ||
    person?.email ||
    ""
  );
}

function getEmployeeJabatan(person) {
  return (
    person?.jabatan_name ||
    person?.jabatan_nama ||
    person?.jabatanNama ||
    person?.jabatan ||
    person?.position ||
    person?.nama_jabatan ||
    ""
  );
}

function getEmployeeUnit(person) {
  return (
    person?.unit_organisasi_name ||
    person?.unitKerja ||
    person?.unit_kerja ||
    person?.workUnit ||
    person?.unit ||
    ""
  );
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

export default function FeedbackPenilaianPage() {
  const navigate = useNavigate();
  const { search } = useLocation();
  const queryParams = useMemo(() => new URLSearchParams(search), [search]);
  const pegawaiUtamaNip = useMemo(() => queryParams.get("nip") || "", [queryParams]);

  const [filterNip, setFilterNip] = useState("");
  const [pegawaiOptions, setPegawaiOptions] = useState([]);
  const [pegawaiMap, setPegawaiMap] = useState(new Map());
  const [loadingPegawai, setLoadingPegawai] = useState(false);

  const [activeTab, setActiveTab] = useState("filled"); // "filled" or "received"
  const [filledList, setFilledList] = useState([]);
  const [receivedList, setReceivedList] = useState([]);
  const [loadingData, setLoadingData] = useState(false);

  const [filterRole, setFilterRole] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPeriode, setFilterPeriode] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedDetailItem, setSelectedDetailItem] = useState(null);
  const [templateJson, setTemplateJson] = useState(null);

  // Read initialNip useEffect removed

  // Load all employees for search select
  useEffect(() => {
    setLoadingPegawai(true);
    getPegawai()
      .then((res) => {
        const list = Array.isArray(res) ? res : res?.data || [];
        const opts = list.map((person) => ({
          value: getEmployeeNip(person),
          label: `${getEmployeeName(person)} - ${getEmployeeNip(person)}`,
          name: getEmployeeName(person),
          subtitle: `${getEmployeeJabatan(person)} • ${getEmployeeUnit(person)}`,
        }));
        setPegawaiOptions(opts);

        const map = new Map();
        list.forEach((person) => {
          map.set(getEmployeeNip(person), person);
        });
        setPegawaiMap(map);
      })
      .catch((err) => console.error("Failed to load pegawai list", err))
      .finally(() => setLoadingPegawai(false));
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

  // Load evaluations for selected employee NIP
  useEffect(() => {
    if (!pegawaiUtamaNip) {
      setFilledList([]);
      setReceivedList([]);
      return;
    }

    let isMounted = true;
    const loadEvaluations = async () => {
      setLoadingData(true);
      try {
        const [filledRes, receivedRes] = await Promise.all([
          getPenilaianPegawai({ nip_penilai: pegawaiUtamaNip, with_pagination: 0 }),
          getPenilaianPegawai({ nip_pegawai: pegawaiUtamaNip, with_pagination: 0 }),
        ]);

        if (isMounted) {
          const filled = Array.isArray(filledRes) ? filledRes : filledRes?.data || [];
          const received = Array.isArray(receivedRes) ? receivedRes : receivedRes?.data || [];
          setFilledList(filled);
          setReceivedList(received);
          setCurrentPage(1);
          setSelectedDetailItem(null);
        }
      } catch (err) {
        console.error("Failed to load penilaian data", err);
      } finally {
        if (isMounted) setLoadingData(false);
      }
    };

    loadEvaluations();
    return () => {
      isMounted = false;
    };
  }, [pegawaiUtamaNip]);

  const getQuestionsFromTemplate = (template) => {
    if (!template || !Array.isArray(template.pages)) return [];
    const questions = [];
    template.pages.forEach((page) => {
      if (Array.isArray(page.elements)) {
        page.elements.forEach((el) => {
          if (el.name && !["nama_pegawai", "nip", "jabatan", "unit_kerja", "peran"].includes(el.name)) {
            questions.push({
              name: el.name,
              title: el.title || el.name,
              type: el.type,
            });
          }
        });
      }
    });
    return questions;
  };

  const parsePenilaian = (val) => {
    if (!val) return {};
    if (typeof val === "object") return val;
    try {
      return JSON.parse(val);
    } catch (e) {
      return {};
    }
  };

  const getStatus = (penilaian, role) => {
    const data = parsePenilaian(penilaian);
    const customTemplate = getTemplateForRole(templateJson, role);
    return getPenilaianStatus(customTemplate, data);
  };

  const resolveEmployeeInfo = (nip) => {
    const key = String(nip || "").trim();
    if (!key) return { nama: "-", nip: "-", jabatan: "-", unit: "-" };
    const match = pegawaiMap.get(key);
    return {
      nama: getEmployeeName(match) || key,
      nip: key,
      jabatan: getEmployeeJabatan(match) || "-",
      unit: getEmployeeUnit(match) || "-",
    };
  };

  // Extract unique periods and roles
  const uniquePeriods = useMemo(() => {
    const periods = new Set();
    filledList.forEach((item) => { if (item.periode) periods.add(item.periode); });
    receivedList.forEach((item) => { if (item.periode) periods.add(item.periode); });
    return Array.from(periods).sort().reverse();
  }, [filledList, receivedList]);

  // Set default period to the newest period when uniquePeriods loads
  useEffect(() => {
    if (uniquePeriods.length > 0 && !filterPeriode) {
      setFilterPeriode(uniquePeriods[0]);
    }
  }, [uniquePeriods, filterPeriode]);

  const uniqueRoles = useMemo(() => {
    const roles = new Set();
    filledList.forEach((item) => { if (item.role) roles.add(item.role); });
    receivedList.forEach((item) => { if (item.role) roles.add(item.role); });
    return Array.from(roles);
  }, [filledList, receivedList]);

  const handlePegawaiChange = (e) => {
    setFilterNip(e.target.value);
    setCurrentPage(1);
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setCurrentPage(1);
    setSelectedDetailItem(null);
  };

  const filteredList = useMemo(() => {
    const list = activeTab === "filled" ? filledList : receivedList;
    return list.filter((item) => {
      const counterpartNip = activeTab === "filled" ? item.nip_pegawai : item.nip_penilai;
      const counterpart = resolveEmployeeInfo(counterpartNip);

      const search = searchQuery.trim().toLowerCase();
      if (search && !counterpartNip.includes(search) && !counterpart.nama.toLowerCase().includes(search)) {
        return false;
      }

      if (filterNip && counterpartNip !== filterNip) {
        return false;
      }

      if (filterRole && item.role !== filterRole) {
        return false;
      }

      if (filterPeriode && item.periode !== filterPeriode) {
        return false;
      }

      const status = getStatus(item.penilaian, item.role);
      if (filterStatus === "complete" && status !== "complete") return false;
      if (filterStatus === "pending" && status === "complete") return false;

      return true;
    });
  }, [activeTab, filledList, receivedList, searchQuery, filterNip, filterRole, filterPeriode, filterStatus, templateJson]);

  const totalPages = Math.max(1, Math.ceil(filteredList.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedList = filteredList.slice(startIndex, startIndex + itemsPerPage);
  const questions = getQuestionsFromTemplate(templateJson);
  const selectedEmployeeInfo = pegawaiUtamaNip ? resolveEmployeeInfo(pegawaiUtamaNip) : null;

  return (
    <div className="space-y-6">
      {/* Title block */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="border-l-4 border-teal-600 pl-4">
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Detail Penilaian Pegawai</h1>
          <p className="mt-1 text-sm text-slate-600">
            Lihat riwayat penilaian lengkap yang diisi dan diterima oleh pegawai.
          </p>
        </div>
        <button
          onClick={() => navigate("/admin/umpan-balik")}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 shadow-sm"
        >
          <FontAwesomeIcon icon={faArrowLeft} />
          Kembali ke Umpan Balik 360
        </button>
      </div>

      {/* Filter panel */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
        <h3 className="text-sm font-semibold text-slate-800">Filter Penilaian</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          {/* Nama Pegawai */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Nama Pegawai</label>
            <SearchableSelect
              value={filterNip}
              onChange={handlePegawaiChange}
              options={pegawaiOptions}
              placeholder={loadingPegawai ? "Memuat pegawai..." : "Pilih Pegawai"}
              clearable={true}
            />
          </div>

          {/* Periode */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Periode</label>
            <select
              value={filterPeriode}
              onChange={(e) => {
                setFilterPeriode(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-teal-500 outline-none transition-all"
            >
              <option value="">Semua Periode</option>
              {uniquePeriods.map((p) => (
                <option key={p} value={p}>
                  {formatPeriodIndo(p)}
                </option>
              ))}
            </select>
          </div>

          {/* Hubungan */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Hubungan</label>
            <select
              value={filterRole}
              onChange={(e) => {
                setFilterRole(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-teal-500 outline-none transition-all"
            >
              <option value="">Semua Hubungan</option>
              {uniqueRoles.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-teal-500 outline-none transition-all"
            >
              <option value="">Semua Status</option>
              <option value="complete">Selesai</option>
              <option value="pending">Belum Selesai</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main content area */}
      {!pegawaiUtamaNip ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center shadow-sm">
          <FontAwesomeIcon icon={faUserClock} className="text-slate-300 text-6xl mb-4" />
          <h3 className="text-lg font-bold text-slate-700">Pegawai Tidak Ditemukan</h3>
          <p className="text-slate-500 text-sm mt-1 max-w-md mx-auto">
            Silakan kembali ke halaman Umpan Balik 360 dan pilih aksi "Penilaian" pada pegawai yang ingin Anda tinjau.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden p-6 space-y-6">
          {/* Selected employee banner info */}
          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-800 mt-1">{selectedEmployeeInfo?.nama}</h2>
              <p className="text-sm text-slate-600 mt-0.5">
                NIP: {selectedEmployeeInfo?.nip} &bull; {selectedEmployeeInfo?.jabatan}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">Unit Kerja: {selectedEmployeeInfo?.unit}</p>
            </div>
            <div className="flex gap-4">
              <div className="bg-white px-4 py-3 rounded-xl border border-slate-100 shadow-sm text-center min-w-[120px]">
                <div className="text-xs text-slate-500 font-semibold">Total Diisi</div>
                <div className="text-xl font-bold text-teal-600 mt-0.5">{filledList.length}</div>
              </div>
              <div className="bg-white px-4 py-3 rounded-xl border border-slate-100 shadow-sm text-center min-w-[120px]">
                <div className="text-xs text-slate-500 font-semibold">Total Diterima</div>
                <div className="text-xl font-bold text-blue-600 mt-0.5">{receivedList.length}</div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-slate-200">
            <button
              onClick={() => handleTabChange("filled")}
              className={`py-3 px-6 text-sm font-semibold border-b-2 transition-all ${activeTab === "filled"
                  ? "border-teal-600 text-teal-600"
                  : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
            >
              Penilaian yang Diisi ({filledList.length})
            </button>
            <button
              onClick={() => handleTabChange("received")}
              className={`py-3 px-6 text-sm font-semibold border-b-2 transition-all ${activeTab === "received"
                  ? "border-teal-600 text-teal-600"
                  : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
            >
              Penilaian dari Orang Lain ({receivedList.length})
            </button>
          </div>

          {loadingData ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <FontAwesomeIcon icon={faSpinner} spin className="text-3xl text-teal-600" />
              <span className="text-sm text-slate-600 font-medium">Memuat data penilaian...</span>
            </div>
          ) : (
            <>
              {/* Optional Search inside current list */}
              <div className="flex justify-between items-center gap-4">
                <div className="relative max-w-xs w-full">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FontAwesomeIcon icon={faSearch} className="text-slate-400 text-xs" />
                  </span>
                  <input
                    type="text"
                    placeholder="Cari berdasarkan nama/NIP..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 bg-white rounded-xl text-sm outline-none transition focus:border-teal-500"
                  />
                </div>
                <div className="text-xs text-slate-500">
                  Menampilkan {paginatedList.length} dari {filteredList.length} data
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50 text-slate-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">No</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                        {activeTab === "filled" ? "Pegawai yang Dinilai" : "Penilai"}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Hubungan</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Periode</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {paginatedList.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="px-6 py-12 text-center text-slate-500 text-sm">
                          Tidak ada data penilaian yang cocok dengan filter.
                        </td>
                      </tr>
                    ) : (
                      paginatedList.map((item, index) => {
                        const counterpartNip = activeTab === "filled" ? item.nip_pegawai : item.nip_penilai;
                        const counterpart = resolveEmployeeInfo(counterpartNip);
                        const status = getStatus(item.penilaian, item.role);

                        return (
                          <Fragment key={item.id}>
                            <tr className="hover:bg-slate-50/40">
                              <td className="px-4 py-3 text-sm text-slate-600">
                                {startIndex + index + 1}
                              </td>
                              <td className="px-4 py-3">
                                <div className="text-sm font-semibold text-slate-800">{counterpart.nama}</div>
                                <div className="text-xs text-slate-400">NIP: {counterpart.nip}</div>
                                <div className="text-xs text-slate-500 italic max-w-xs truncate" title={counterpart.jabatan}>{counterpart.jabatan}</div>
                              </td>
                              <td className="px-4 py-3 text-sm text-slate-700">
                                <span className="inline-flex rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-medium text-teal-800">
                                  {item.role}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm text-slate-700">
                                {formatPeriodIndo(item.periode)}
                              </td>
                              <td className="px-4 py-3 text-sm">
                                {status === "complete" && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                                    <FontAwesomeIcon icon={faCircleCheck} className="text-xs" />
                                    Selesai
                                  </span>
                                )}
                                {status === "partial" && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                                    <FontAwesomeIcon icon={faUserClock} className="text-xs" />
                                    Belum Selesai
                                  </span>
                                )}
                                {status === "empty" && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                                    <FontAwesomeIcon icon={faUserClock} className="text-xs" />
                                    Belum Dinilai
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => setSelectedDetailItem(item)}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition shadow-sm"
                                >
                                  <FontAwesomeIcon icon={faEye} />
                                  Lihat Detail
                                </button>
                              </td>
                            </tr>
                          </Fragment>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-slate-200 bg-white px-4 py-3 sm:px-6 mt-4">
                  <div className="flex flex-1 justify-between sm:hidden">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                    >
                      Kembali
                    </button>
                    <button
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="relative ml-3 inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                    >
                      Selanjutnya
                    </button>
                  </div>
                  <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-slate-700">
                        Menampilkan <span className="font-medium">{startIndex + 1}</span> hingga{" "}
                        <span className="font-medium">{Math.min(startIndex + itemsPerPage, filteredList.length)}</span> dari{" "}
                        <span className="font-medium">{filteredList.length}</span> hasil
                      </p>
                    </div>
                    <div>
                      <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                        <button
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                          className="relative inline-flex items-center rounded-l-md px-2 py-2 text-slate-400 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 disabled:opacity-40"
                        >
                          <FontAwesomeIcon icon={faChevronLeft} className="h-4 w-4" />
                        </button>
                        {Array.from({ length: totalPages }).map((_, i) => (
                          <button
                            key={i}
                            onClick={() => setCurrentPage(i + 1)}
                            className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${currentPage === i + 1
                                ? "z-10 bg-teal-600 text-white"
                                : "text-slate-900 ring-1 ring-inset ring-slate-300 hover:bg-slate-50"
                              }`}
                          >
                            {i + 1}
                          </button>
                        ))}
                        <button
                          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                          className="relative inline-flex items-center rounded-r-md px-2 py-2 text-slate-400 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 disabled:opacity-40"
                        >
                          <FontAwesomeIcon icon={faChevronRight} className="h-4 w-4" />
                        </button>
                      </nav>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

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
