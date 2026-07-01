import { useEffect, useMemo, useRef, useState } from "react";
import { Model } from "survey-core";
import { Survey } from "survey-react-ui";
import { SurveyCreatorComponent, SurveyCreator } from "survey-creator-react";
import "survey-core/survey-core.min.css";
import "survey-creator-core/survey-creator-core.min.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faAnglesLeft,
  faAnglesRight,
  faChevronDown,
  faChevronLeft,
  faChevronRight,
  faClipboardList,
  faFilter,
  faPenToSquare,
  faSave,
  faSearch,
  faSpinner,
  faTimes,
  faUserCheck,
  faUsers,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import SearchableSelect from "./SearchableSelect";
import { createPenilaianPegawai, getPegawai } from "../config/api";

const TEMPLATE_STORAGE_KEY = "nusa_feedback360_template";
const ASSIGNMENT_STORAGE_KEY = "nusa_feedback360_assignments";
const EVALUATION_STORAGE_KEY = "nusa_feedback360_evaluations";
const CURRENT_PERIOD = new Date().toISOString().slice(0, 7);

function safeParseJSON(value, fallback) {
  try {
    if (typeof value === "string") return JSON.parse(value);
    return value ?? fallback;
  } catch {
    return fallback;
  }
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

function getEmployeeLabel(person) {
  const name = getEmployeeName(person) || getEmployeeNip(person) || "-";
  const jabatan = getEmployeeJabatan(person);
  return jabatan ? `${name} - ${jabatan}` : name;
}

function normalizePegawaiResponse(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.data)) return payload.data.data;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
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
          {
            type: "text",
            name: "nama_pegawai",
            title: "Nama Pegawai yang Dinilai",
            isRequired: true,
            readOnly: true,
          },
          {
            type: "text",
            name: "nip",
            title: "NIP",
            isRequired: true,
            readOnly: true,
          },
          {
            type: "text",
            name: "jabatan",
            title: "Jabatan",
            isRequired: true,
            readOnly: true,
          },
          {
            type: "text",
            name: "unit_kerja",
            title: "Unit Kerja",
            isRequired: true,
            readOnly: true,
          },
        ],
      },
      {
        name: "page2",
        title: "Penilaian",
        elements: [
          {
            type: "rating",
            name: "kinerja_utama",
            title: "Bagaimana penilaian Anda terhadap kinerja utama pegawai ini?",
            isRequired: true,
            rateMax: 5,
            displayMode: "buttons",
          },
          {
            type: "rating",
            name: "komunikasi",
            title: "Bagaimana kualitas komunikasi pegawai ini dalam bekerja sama?",
            isRequired: true,
            rateMax: 5,
            displayMode: "buttons",
          },
          {
            type: "rating",
            name: "kolaborasi",
            title: "Seberapa baik pegawai ini berkolaborasi dengan tim?",
            isRequired: true,
            rateMax: 5,
            displayMode: "buttons",
          },
          {
            type: "rating",
            name: "inisiatif",
            title: "Seberapa besar inisiatif pegawai ini dalam menyelesaikan tugas?",
            isRequired: true,
            rateMax: 5,
            displayMode: "buttons",
          },
          {
            type: "rating",
            name: "tanggung_jawab",
            title: "Bagaimana penilaian Anda terhadap tanggung jawab pegawai ini?",
            isRequired: true,
            rateMax: 5,
            displayMode: "buttons",
          },
          {
            type: "comment",
            name: "catatan_tambahan",
            title: "Catatan tambahan atau masukan untuk pegawai ini",
          },
        ],
      },
    ],
  };
}

function buildAssignmentForm(record = null) {
  return {
    periode: record?.periode || CURRENT_PERIOD,
    atasan_langsung: record?.atasan_langsung || "",
    penerima_manfaat: Array.isArray(record?.penerima_manfaat)
      ? record.penerima_manfaat
      : [],
    rekan_kerja: Array.isArray(record?.rekan_kerja) ? record.rekan_kerja : [],
    bawahan: Array.isArray(record?.bawahan) ? record.bawahan : [],
  };
}

function normalizeAssignmentRecord(record) {
  if (!record) return null;

  if (record.penilai && Array.isArray(record.penilai)) {
    const atasan = record.penilai.find(
      (item) => item.role === "Atasan Langsung",
    );
    const penerima = record.penilai
      .filter((item) => item.role === "Penerima Manfaat")
      .map((item) => item.nip_penilai);
    const rekan = record.penilai
      .filter((item) => item.role === "Rekan Kerja")
      .map((item) => item.nip_penilai);
    const bawahan = record.penilai
      .filter((item) => item.role === "Bawahan")
      .map((item) => item.nip_penilai);

    return {
      periode: record.periode || CURRENT_PERIOD,
      atasan_langsung: atasan?.nip_penilai || "",
      penerima_manfaat: penerima,
      rekan_kerja: rekan,
      bawahan,
      penilai: record.penilai,
      saved_at: record.saved_at || new Date().toISOString(),
    };
  }

  return buildAssignmentForm(record);
}

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

function EmployeePicker({
  label,
  value,
  multiple = false,
  options,
  placeholder,
  disabled = false,
  onChange,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef(null);
  const searchRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpen(false);
        setQuery("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedValues = multiple
    ? Array.isArray(value)
      ? value.map((item) => String(item))
      : []
    : value
      ? [String(value)]
      : [];

  const filteredOptions = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return options;

    return options.filter((option) => {
      const haystack = [option.label, option.subtitle, option.value]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [options, query]);

  const selectedLabels = selectedValues
    .map((selectedValue) => {
      const option = options.find((item) => String(item.value) === selectedValue);
      return option?.label || "";
    })
    .filter(Boolean);

  const displayText = multiple
    ? selectedLabels.length === 0
      ? placeholder
      : selectedLabels.length <= 2
        ? selectedLabels.join(", ")
        : `${selectedLabels.slice(0, 2).join(", ")} +${selectedLabels.length - 2}`
    : selectedLabels[0] || placeholder;

  const toggleOption = (nextValue) => {
    const stringValue = String(nextValue);

    if (!multiple) {
      onChange(stringValue);
      setOpen(false);
      setQuery("");
      return;
    }

    const next = selectedValues.includes(stringValue)
      ? selectedValues.filter((item) => item !== stringValue)
      : [...selectedValues, stringValue];
    onChange(next);
  };

  return (
    <div ref={rootRef} className="relative w-full">
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          const nextOpen = !open;
          setOpen(nextOpen);
          if (nextOpen) {
            setTimeout(() => searchRef.current?.focus(), 0);
          }
        }}
        className={`flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition ${
          disabled
            ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
            : "border-slate-300 bg-white hover:border-teal-400"
        } ${!selectedLabels.length ? "text-slate-400" : "text-slate-900"}`}
      >
        <div className="min-w-0 flex-1">
          {label && <div className="mb-1 text-xs font-semibold text-slate-500">{label}</div>}
          <div className="truncate text-sm font-medium">{displayText}</div>
        </div>
        <FontAwesomeIcon icon={faChevronDown} className="shrink-0 text-slate-400" />
      </button>

      {open && !disabled && (
        <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
          <div className="border-b border-slate-200 p-3">
            <div className="relative">
              <FontAwesomeIcon
                icon={faSearch}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                ref={searchRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari pegawai..."
                className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
              />
            </div>
          </div>

          <div className="max-h-72 overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-slate-500">
                Tidak ada pegawai yang cocok
              </div>
            ) : (
              filteredOptions.map((option) => {
                const optionValue = String(option.value);
                const active = selectedValues.includes(optionValue);

                return (
                  <button
                    key={optionValue}
                    type="button"
                    onClick={() => toggleOption(optionValue)}
                    className={`flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-teal-50 ${
                      active ? "bg-teal-50" : "bg-white"
                    }`}
                  >
                    {multiple && (
                      <span
                        className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded border text-xs ${
                          active
                            ? "border-teal-600 bg-teal-600 text-white"
                            : "border-slate-300 bg-white text-transparent"
                        }`}
                      >
                        ✓
                      </span>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-slate-900">
                        {option.label}
                      </div>
                      {option.subtitle && (
                        <div className="mt-0.5 truncate text-xs text-slate-500">
                          {option.subtitle}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {multiple && (
            <div className="flex items-center justify-between gap-3 border-t border-slate-200 px-4 py-3">
              <button
                type="button"
                onClick={() => onChange([])}
                className="text-sm font-medium text-slate-600 hover:text-slate-900"
              >
                Kosongkan
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg bg-teal-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-teal-700"
              >
                Selesai
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TemplateEditorModal({
  open,
  creator,
  templateJson,
  onClose,
  onUseDefault,
}) {
  if (!open) return null;

  const questionCount = Array.isArray(templateJson?.pages)
    ? templateJson.pages.reduce(
        (total, page) =>
          total + (Array.isArray(page.elements) ? page.elements.length : 0),
        0,
      )
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm">
      <div className="flex h-[92vh] w-full max-w-7xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div>
            <div className="inline-flex rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-teal-700">
              Template Penilaian
            </div>
            <h2 className="mt-3 text-2xl font-bold text-slate-900">
              Sesuaikan Daftar Pertanyaan
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Gunakan editor yang sama dengan KegiatanForm untuk mengatur template Umpan Balik 360.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            aria-label="Tutup"
          >
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>

        <div className="grid flex-1 grid-cols-1 gap-0 overflow-hidden lg:grid-cols-[1.6fr_0.9fr]">
          <div className="border-b border-slate-200 lg:border-b-0 lg:border-r">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-6 py-4">
              <div>
                <div className="text-sm font-semibold text-slate-900">Survey Creator</div>
                <div className="text-xs text-slate-500">
                  {questionCount} pertanyaan pada {templateJson?.pages?.length || 0} halaman
                </div>
              </div>

              <button
                type="button"
                onClick={onUseDefault}
                className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700"
              >
                <FontAwesomeIcon icon={faClipboardList} />
                Gunakan Default Form
              </button>
            </div>

            <div className="h-[calc(92vh-11rem)] overflow-auto p-4">
              <div className="min-h-[640px] overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                {creator && <SurveyCreatorComponent creator={creator} />}
              </div>
            </div>
          </div>

          <div className="flex h-full flex-col overflow-hidden bg-slate-50/80">
            <div className="border-b border-slate-200 px-6 py-4">
              <div className="text-sm font-semibold text-slate-900">Pratinjau Template</div>
              <div className="text-xs text-slate-500">
                Judul, deskripsi, dan struktur halaman aktif saat ini.
              </div>
            </div>

            <div className="flex-1 space-y-4 overflow-auto px-6 py-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="text-xs uppercase tracking-wide text-slate-500">Judul</div>
                <div className="mt-1 text-lg font-semibold text-slate-900">
                  {templateJson?.title || "-"}
                </div>
                <div className="mt-3 text-xs uppercase tracking-wide text-slate-500">
                  Keterangan
                </div>
                <p className="mt-1 text-sm text-slate-700">
                  {templateJson?.description || "-"}
                </p>
              </div>

              {(templateJson?.pages || []).map((page, pageIndex) => (
                <div key={page.name || pageIndex} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs uppercase tracking-wide text-slate-500">
                        Halaman {pageIndex + 1}
                      </div>
                      <div className="mt-1 text-base font-semibold text-slate-900">
                        {page.title || page.name || `Page ${pageIndex + 1}`}
                      </div>
                    </div>
                    <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700">
                      {Array.isArray(page.elements) ? page.elements.length : 0} pertanyaan
                    </span>
                  </div>

                  <div className="mt-4 space-y-2">
                    {(page.elements || []).map((element, elementIndex) => (
                      <div
                        key={element.name || elementIndex}
                        className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2"
                      >
                        <div className="text-sm font-medium text-slate-800">
                          {element.title || element.name || `Pertanyaan ${elementIndex + 1}`}
                        </div>
                        <div className="text-xs text-slate-500">
                          {element.type || "text"}
                          {element.readOnly ? " · read only" : ""}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AssignmentModal({
  open,
  employee,
  assignmentForm,
  setAssignmentForm,
  assignableOptions,
  loadingOptions,
  saving,
  onClose,
  onSave,
}) {
  if (!open || !employee) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="border-b border-slate-200 px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="inline-flex rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-teal-700">
                Tetapkan Penilai
              </div>
              <h2 className="mt-3 text-2xl font-bold text-slate-900">
                {getEmployeeName(employee) || "Pegawai"}
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                NIP {getEmployeeNip(employee) || "-"} · {getEmployeeJabatan(employee) || "-"} · {getEmployeeUnit(employee) || "-"}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              aria-label="Tutup"
            >
              <FontAwesomeIcon icon={faXmark} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto px-6 py-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Periode
              </label>
              <input
                type="month"
                value={assignmentForm.periode}
                onChange={(e) =>
                  setAssignmentForm((prev) => ({
                    ...prev,
                    periode: e.target.value,
                  }))
                }
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
              />
            </div>
          </div>

          <div className="mt-5 space-y-5">
            <EmployeePicker
              label="Atasan Langsung"
              value={assignmentForm.atasan_langsung}
              onChange={(nextValue) =>
                setAssignmentForm((prev) => ({
                  ...prev,
                  atasan_langsung: nextValue,
                }))
              }
              options={assignableOptions}
              placeholder={loadingOptions ? "Memuat pegawai..." : "Pilih atasan langsung"}
              disabled={loadingOptions}
            />

            <EmployeePicker
              label="Penerima Manfaat"
              multiple
              value={assignmentForm.penerima_manfaat}
              onChange={(nextValue) =>
                setAssignmentForm((prev) => ({
                  ...prev,
                  penerima_manfaat: nextValue,
                }))
              }
              options={assignableOptions}
              placeholder={loadingOptions ? "Memuat pegawai..." : "Pilih penerima manfaat"}
              disabled={loadingOptions}
            />

            <EmployeePicker
              label="Rekan Kerja"
              multiple
              value={assignmentForm.rekan_kerja}
              onChange={(nextValue) =>
                setAssignmentForm((prev) => ({
                  ...prev,
                  rekan_kerja: nextValue,
                }))
              }
              options={assignableOptions}
              placeholder={loadingOptions ? "Memuat pegawai..." : "Pilih rekan kerja"}
              disabled={loadingOptions}
            />

            <EmployeePicker
              label="Bawahan"
              multiple
              value={assignmentForm.bawahan}
              onChange={(nextValue) =>
                setAssignmentForm((prev) => ({
                  ...prev,
                  bawahan: nextValue,
                }))
              }
              options={assignableOptions}
              placeholder={loadingOptions ? "Memuat pegawai..." : "Pilih bawahan"}
              disabled={loadingOptions}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? <FontAwesomeIcon icon={faSpinner} spin /> : <FontAwesomeIcon icon={faSave} />}
            Simpan
          </button>
        </div>
      </div>
    </div>
  );
}

function EvaluationSurveyModal({ open, employee, assignment, templateJson, onClose }) {
  const [model, setModel] = useState(null);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    if (!open || !employee || !templateJson) {
      setModel(null);
      setCompleted(false);
      return;
    }

    const surveyModel = new Model(templateJson);
    surveyModel.data = {
      nama_pegawai: getEmployeeName(employee),
      nip: getEmployeeNip(employee),
      jabatan: getEmployeeJabatan(employee),
      unit_kerja: getEmployeeUnit(employee),
    };

    surveyModel.onComplete.add((sender) => {
      const record = {
        nip_pegawai: getEmployeeNip(employee),
        periode: assignment?.periode || CURRENT_PERIOD,
        penilai: assignment?.penilai || [],
        jawaban: sender.data,
        created_at: new Date().toISOString(),
      };

      const existing = safeParseJSON(
        localStorage.getItem(EVALUATION_STORAGE_KEY),
        {},
      );
      const next = { ...existing };
      const nip = getEmployeeNip(employee);
      next[nip] = Array.isArray(next[nip]) ? next[nip] : [];
      next[nip].push(record);
      localStorage.setItem(EVALUATION_STORAGE_KEY, JSON.stringify(next));
      setCompleted(true);
      showFeedbackMessage(
        "success",
        "Tersimpan",
        "Jawaban penilaian berhasil disimpan secara lokal.",
      );
    });

    setModel(surveyModel);
    setCompleted(false);
  }, [open, employee, assignment, templateJson]);

  if (!open || !employee) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm">
      <div className="flex h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="border-b border-slate-200 px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="inline-flex rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-teal-700">
                Penilaian
              </div>
              <h2 className="mt-3 text-2xl font-bold text-slate-900">
                Form Penilaian Umpan Balik 360
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                {getEmployeeName(employee) || "Pegawai"} · NIP {getEmployeeNip(employee) || "-"}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              aria-label="Tutup"
            >
              <FontAwesomeIcon icon={faXmark} />
            </button>
          </div>
        </div>

        <div className="grid flex-1 grid-cols-1 gap-0 overflow-hidden lg:grid-cols-[1.2fr_0.8fr]">
          <div className="overflow-auto bg-slate-50 p-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              {model ? <Survey model={model} /> : null}
            </div>
          </div>

          <div className="flex flex-col overflow-hidden border-t border-slate-200 bg-slate-50 lg:border-t-0 lg:border-l">
            <div className="border-b border-slate-200 px-6 py-4">
              <div className="text-sm font-semibold text-slate-900">Ringkasan Penilaian</div>
              <div className="text-xs text-slate-500">
                Penilai yang sudah ditetapkan dan data pegawai yang dinilai.
              </div>
            </div>

            <div className="flex-1 space-y-4 overflow-auto px-6 py-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="text-xs uppercase tracking-wide text-slate-500">Pegawai</div>
                <div className="mt-1 text-lg font-semibold text-slate-900">
                  {getEmployeeName(employee) || "-"}
                </div>
                <div className="mt-3 grid grid-cols-1 gap-3 text-sm text-slate-700">
                  <div>
                    <div className="text-xs uppercase tracking-wide text-slate-500">NIP</div>
                    <div>{getEmployeeNip(employee) || "-"}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wide text-slate-500">Jabatan</div>
                    <div>{getEmployeeJabatan(employee) || "-"}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wide text-slate-500">Unit Kerja</div>
                    <div>{getEmployeeUnit(employee) || "-"}</div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="text-xs uppercase tracking-wide text-slate-500">Periode</div>
                <div className="mt-1 text-base font-semibold text-slate-900">
                  {assignment?.periode || CURRENT_PERIOD}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="text-xs uppercase tracking-wide text-slate-500">Penilai</div>
                <div className="mt-3 space-y-3 text-sm text-slate-700">
                  {assignment?.penilai?.length ? (
                    assignment.penilai.map((item, index) => (
                      <div key={`${item.role}-${index}`} className="rounded-xl bg-slate-50 px-3 py-2">
                        <div className="font-semibold text-slate-900">{item.role}</div>
                        <div>{item.nip_penilai}</div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-xl bg-slate-50 px-3 py-2 text-slate-500">
                      Belum ada penilai yang ditetapkan.
                    </div>
                  )}
                </div>
              </div>

              {completed && (
                <div className="rounded-2xl border border-teal-200 bg-teal-50 p-4 text-sm text-teal-800">
                  Jawaban sudah tersimpan secara lokal di browser.
                </div>
              )}
            </div>

            <div className="border-t border-slate-200 px-6 py-4">
              <button
                type="button"
                onClick={onClose}
                className="w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function FeedbackList() {
  const [pegawaiAll, setPegawaiAll] = useState([]);
  const [pegawaiList, setPegawaiList] = useState([]);
  const [loadingAll, setLoadingAll] = useState(true);
  const [loadingList, setLoadingList] = useState(true);
  const [error, setError] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterJabatan, setFilterJabatan] = useState("");
  const [filterUnitKerja, setFilterUnitKerja] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(true);
  const [templateJson, setTemplateJson] = useState(buildDefaultTemplate());
  const [templateCreator, setTemplateCreator] = useState(null);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [assignmentModalOpen, setAssignmentModalOpen] = useState(false);
  const [evaluationModalOpen, setEvaluationModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [assignmentForm, setAssignmentForm] = useState(
    buildAssignmentForm(),
  );
  const [assignmentStore, setAssignmentStore] = useState({});
  const [savingAssignment, setSavingAssignment] = useState(false);

  const templateLoadingRef = useRef(false);

  useEffect(() => {
    const rawTemplate = localStorage.getItem(TEMPLATE_STORAGE_KEY);
    const loadedTemplate = safeParseJSON(rawTemplate, buildDefaultTemplate());
    const nextTemplate = loadedTemplate || buildDefaultTemplate();

    templateLoadingRef.current = true;
    const creator = new SurveyCreator({
      showLogicTab: true,
      showTranslationTab: false,
      isAutoSave: false,
    });
    creator.JSON = nextTemplate;
    setTemplateJson(nextTemplate);
    setTemplateCreator(creator);

    creator.onModified.add(() => {
      if (templateLoadingRef.current) return;
      setTemplateJson(creator.JSON);
    });

    const timer = setTimeout(() => {
      templateLoadingRef.current = false;
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(templateJson));
  }, [templateJson]);

  useEffect(() => {
    const rawAssignments = localStorage.getItem(ASSIGNMENT_STORAGE_KEY);
    const parsedAssignments = safeParseJSON(rawAssignments, {});
    setAssignmentStore(parsedAssignments || {});
  }, []);

  useEffect(() => {
    localStorage.setItem(
      ASSIGNMENT_STORAGE_KEY,
      JSON.stringify(assignmentStore),
    );
  }, [assignmentStore]);

  useEffect(() => {
    const timer = setTimeout(() => setSearchTerm(searchInput), 450);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    let active = true;

    (async () => {
      setLoadingAll(true);
      try {
        const data = await getPegawai();
        if (!active) return;
        setPegawaiAll(normalizePegawaiResponse(data));
      } catch (err) {
        console.error("Failed to load pegawai list for picker", err);
      } finally {
        if (active) setLoadingAll(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    (async () => {
      setLoadingList(true);
      setError("");
      try {
        const params = {};
        if (searchTerm) params.q = searchTerm;
        if (filterJabatan) params.jabatan = filterJabatan;
        if (filterUnitKerja) params.unit_kerja = filterUnitKerja;

        const data = await getPegawai(params);
        if (!active) return;
        setPegawaiList(normalizePegawaiResponse(data));
      } catch (err) {
        if (!active) return;
        console.error("Failed to load pegawai list", err);
        setError("Gagal memuat data pegawai");
        setPegawaiList([]);
      } finally {
        if (active) setLoadingList(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [searchTerm, filterJabatan, filterUnitKerja]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterJabatan, filterUnitKerja, itemsPerPage]);

  useEffect(() => {
    if (templateCreator && templateJson) {
      templateLoadingRef.current = true;
      templateCreator.JSON = templateJson;
      const timer = setTimeout(() => {
        templateLoadingRef.current = false;
      }, 0);
      return () => clearTimeout(timer);
    }

    return undefined;
  }, [templateCreator, templateJson]);

  const filterBase = useMemo(() => {
    const base = Array.isArray(pegawaiList) ? pegawaiList : [];
    const keyword = searchTerm.trim().toLowerCase();

    return base.filter((person) => {
      const name = getEmployeeName(person).toLowerCase();
      const nip = getEmployeeNip(person).toLowerCase();
      const jabatan = getEmployeeJabatan(person).toLowerCase();
      const unit = getEmployeeUnit(person).toLowerCase();

      const matchesSearch =
        !keyword ||
        [name, nip, jabatan, unit].some((value) => value.includes(keyword));
      const matchesJabatan =
        !filterJabatan || getEmployeeJabatan(person) === filterJabatan;
      const matchesUnit =
        !filterUnitKerja || getEmployeeUnit(person) === filterUnitKerja;

      return matchesSearch && matchesJabatan && matchesUnit;
    });
  }, [pegawaiList, searchTerm, filterJabatan, filterUnitKerja]);

  const uniqueJabatanOptions = useMemo(() => {
    const source = pegawaiAll.length ? pegawaiAll : pegawaiList;
    const options = Array.from(
      new Set(source.map((item) => getEmployeeJabatan(item)).filter(Boolean)),
    ).sort((a, b) => a.localeCompare(b, "id"));

    return [
      { value: "", label: "Semua Jabatan" },
      ...options.map((item) => ({ value: item, label: item })),
    ];
  }, [pegawaiAll, pegawaiList]);

  const uniqueUnitOptions = useMemo(() => {
    const source = pegawaiAll.length ? pegawaiAll : pegawaiList;
    const options = Array.from(
      new Set(source.map((item) => getEmployeeUnit(item)).filter(Boolean)),
    ).sort((a, b) => a.localeCompare(b, "id"));

    return [
      { value: "", label: "Semua Unit Kerja" },
      ...options.map((item) => ({ value: item, label: item })),
    ];
  }, [pegawaiAll, pegawaiList]);

  const assignableOptions = useMemo(() => {
    const source = pegawaiAll.length ? pegawaiAll : pegawaiList;
    return source.map((person) => ({
      value: getEmployeeNip(person),
      label: getEmployeeLabel(person),
      subtitle: getEmployeeUnit(person) || getEmployeeNip(person) || "",
    }));
  }, [pegawaiAll, pegawaiList]);

  const totalItems = filterBase.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentItems = filterBase.slice(startIndex, startIndex + itemsPerPage);

  const assignmentSummaryCount = (nip) => {
    const record = assignmentStore[nip];
    return Array.isArray(record?.penilai) ? record.penilai.length : 0;
  };

  const resolveAssignmentForm = (employee) => {
    const nip = getEmployeeNip(employee);
    const stored = assignmentStore[nip];
    return buildAssignmentForm(normalizeAssignmentRecord(stored));
  };

  const openAssignmentModal = (employee) => {
    setSelectedEmployee(employee);
    setAssignmentForm(resolveAssignmentForm(employee));
    setAssignmentModalOpen(true);
  };

  const openEvaluationModal = (employee) => {
    setSelectedEmployee(employee);
    setEvaluationModalOpen(true);
  };

  const handleSaveAssignment = async () => {
    if (!selectedEmployee) return;

    const nipPegawai = getEmployeeNip(selectedEmployee);
    const penilai = [];

    if (assignmentForm.atasan_langsung) {
      penilai.push({
        nip_penilai: assignmentForm.atasan_langsung,
        role: "Atasan Langsung",
      });
    }

    assignmentForm.penerima_manfaat.forEach((nip) => {
      if (!nip) return;
      penilai.push({ nip_penilai: nip, role: "Penerima Manfaat" });
    });

    assignmentForm.rekan_kerja.forEach((nip) => {
      if (!nip) return;
      penilai.push({ nip_penilai: nip, role: "Rekan Kerja" });
    });

    assignmentForm.bawahan.forEach((nip) => {
      if (!nip) return;
      penilai.push({ nip_penilai: nip, role: "Bawahan" });
    });

    const payload = {
      periode: assignmentForm.periode,
      nip_pegawai: nipPegawai,
      penilai,
    };

    try {
      setSavingAssignment(true);
      await createPenilaianPegawai(payload);

      const nextRecord = {
        ...assignmentForm,
        penilai,
        saved_at: new Date().toISOString(),
      };

      setAssignmentStore((prev) => ({
        ...prev,
        [nipPegawai]: nextRecord,
      }));

      showFeedbackMessage(
        "success",
        "Berhasil",
        "Penilai berhasil disimpan.",
      );
      setAssignmentModalOpen(false);
    } catch (err) {
      console.error("Failed to save assignment", err);
      showFeedbackMessage(
        "error",
        "Gagal",
        err?.message || "Gagal menyimpan penilai.",
      );
    } finally {
      setSavingAssignment(false);
    }
  };

  const handleUseDefaultTemplate = () => {
    const defaultTemplate = buildDefaultTemplate();
    templateLoadingRef.current = true;
    if (templateCreator) {
      templateCreator.JSON = defaultTemplate;
    }
    setTemplateJson(defaultTemplate);
    setTimeout(() => {
      templateLoadingRef.current = false;
    }, 0);
  };

  const renderPagination = () => {
    const pages = [];
    const maxVisible = 5;
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

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="border-l-4 border-teal-600 pl-4">
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            Umpan Balik 360
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Kelola daftar pegawai, penilai, dan template pertanyaan penilaian.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setTemplateModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 font-semibold text-white shadow-sm transition hover:bg-teal-700"
        >
          <FontAwesomeIcon icon={faPenToSquare} />
          Sesuaikan Daftar Pertanyaan
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative max-w-xl flex-1">
            <FontAwesomeIcon
              icon={faSearch}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Cari nama, NIP, jabatan, atau unit kerja"
              className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-4 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowFilters((value) => !value)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <FontAwesomeIcon icon={faFilter} />
              Filter
            </button>

            <div className="relative">
              <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                className="appearance-none rounded-xl border border-slate-300 bg-white py-2.5 pl-4 pr-10 text-sm font-medium text-slate-700 outline-none transition hover:bg-slate-50 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
              >
                {[5, 10, 25, 50].map((option) => (
                  <option key={option} value={option}>
                    {option}
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

        <div
          className={`overflow-hidden transition-all duration-300 ${
            showFilters ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Jabatan
              </label>
              <SearchableSelect
                value={filterJabatan}
                name="jabatan"
                onChange={(e) => setFilterJabatan(e.target.value)}
                options={uniqueJabatanOptions}
                placeholder="Pilih jabatan"
                disabled={loadingList}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Unit Kerja
              </label>
              <SearchableSelect
                value={filterUnitKerja}
                name="unit_kerja"
                onChange={(e) => setFilterUnitKerja(e.target.value)}
                options={uniqueUnitOptions}
                placeholder="Pilih unit kerja"
                disabled={loadingList}
              />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setSearchInput("");
                setSearchTerm("");
                setFilterJabatan("");
                setFilterUnitKerja("");
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              disabled={loadingList}
            >
              <FontAwesomeIcon icon={faTimes} />
              Reset Filter
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold">No</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Nama</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">NIP</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Jabatan</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Unit Kerja</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {loadingList ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-slate-500">
                    <div className="inline-flex items-center gap-3">
                      <FontAwesomeIcon icon={faSpinner} spin className="text-teal-600" />
                      Memuat data pegawai...
                    </div>
                  </td>
                </tr>
              ) : currentItems.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-slate-500">
                    <FontAwesomeIcon icon={faUsers} className="mx-auto mb-3 text-3xl text-slate-300" />
                    <div className="font-medium text-slate-700">Tidak ada data pegawai</div>
                    <div className="mt-1 text-sm">
                      Coba ubah kata kunci pencarian atau filter jabatan/unit kerja.
                    </div>
                  </td>
                </tr>
              ) : (
                currentItems.map((person, index) => {
                  const nip = getEmployeeNip(person);
                  const assignmentCount = assignmentSummaryCount(nip);

                  return (
                    <tr key={nip || `${index}`} className="hover:bg-teal-50/40">
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {startIndex + index + 1}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">
                          {getEmployeeName(person) || "-"}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {nip || "-"}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {getEmployeeJabatan(person) || "-"}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {getEmployeeUnit(person) || "-"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          {assignmentCount > 0 && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700">
                              <FontAwesomeIcon icon={faUserCheck} />
                              {assignmentCount} penilai
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => openAssignmentModal(person)}
                            className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-teal-700"
                          >
                            <FontAwesomeIcon icon={faClipboardList} />
                            Tetapkan Penilai
                          </button>
                          <button
                            type="button"
                            onClick={() => openEvaluationModal(person)}
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                          >
                            <FontAwesomeIcon icon={faPenToSquare} />
                            Penilaian
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

        {!loadingList && totalItems > 0 && (
          <div className="flex flex-col items-center justify-between gap-4 border-t border-slate-200 px-4 py-4 sm:flex-row">
            <div className="text-sm text-slate-600">
              Menampilkan <span className="font-semibold text-slate-900">{currentItems.length}</span> dari <span className="font-semibold text-slate-900">{totalItems}</span> pegawai
            </div>

            <div className="flex items-center gap-2 flex-wrap justify-end">
              <button
                type="button"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="rounded-lg border border-slate-300 bg-white p-2 text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <FontAwesomeIcon icon={faAnglesLeft} />
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={currentPage === 1}
                className="rounded-lg border border-slate-300 bg-white p-2 text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <FontAwesomeIcon icon={faChevronLeft} />
              </button>

              <div className="hidden items-center gap-2 sm:flex">{renderPagination()}</div>

              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                disabled={currentPage === totalPages}
                className="rounded-lg border border-slate-300 bg-white p-2 text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <FontAwesomeIcon icon={faChevronRight} />
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="rounded-lg border border-slate-300 bg-white p-2 text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <FontAwesomeIcon icon={faAnglesRight} />
              </button>
            </div>
          </div>
        )}
      </div>

      <TemplateEditorModal
        open={templateModalOpen}
        creator={templateCreator}
        templateJson={templateJson}
        onClose={() => setTemplateModalOpen(false)}
        onUseDefault={handleUseDefaultTemplate}
      />

      <AssignmentModal
        open={assignmentModalOpen}
        employee={selectedEmployee}
        assignmentForm={assignmentForm}
        setAssignmentForm={setAssignmentForm}
        assignableOptions={assignableOptions}
        loadingOptions={loadingAll}
        saving={savingAssignment}
        onClose={() => setAssignmentModalOpen(false)}
        onSave={handleSaveAssignment}
      />

      <EvaluationSurveyModal
        open={evaluationModalOpen}
        employee={selectedEmployee}
        assignment={
          selectedEmployee
            ? normalizeAssignmentRecord(
                assignmentStore[getEmployeeNip(selectedEmployee)],
              )
            : null
        }
        templateJson={templateJson}
        onClose={() => setEvaluationModalOpen(false)}
      />
    </div>
  );
}
