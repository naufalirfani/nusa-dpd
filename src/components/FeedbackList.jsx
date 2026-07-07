import { createPortal } from "react-dom";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Model } from "survey-core";
import { Survey } from "survey-react-ui";
import { SurveyCreatorComponent, SurveyCreator } from "survey-creator-react";
import DatePicker, { registerLocale } from "react-datepicker";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import "react-datepicker/dist/react-datepicker.css";
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
  faSync,
  faTimes,
  faUserCheck,
  faUsers,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import {
  createPenilaianPegawai,
  getPegawai,
  getPenilaianPegawai,
  getUnitKerja,
} from "../config/api";
import SearchableSelect from "./SearchableSelect";

registerLocale("id", id);

const TEMPLATE_STORAGE_KEY = "nusa_feedback360_template";
const ASSIGNMENT_STORAGE_KEY = "nusa_feedback360_assignments";
const EVALUATION_STORAGE_KEY = "nusa_feedback360_evaluations";
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

function safeParseJSON(value, fallback) {
  try {
    if (typeof value === "string") return JSON.parse(value);
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

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

function getEmployeeLookupMaps(records) {
  const byNip = new Map();

  (records || []).forEach((person) => {
    const nip = getEmployeeNip(person);
    if (!nip) return;
    byNip.set(nip, {
      label: getEmployeeLabel(person),
      name: getEmployeeName(person),
      jabatan: getEmployeeJabatan(person),
      unit: getEmployeeUnit(person),
    });
  });

  return { byNip };
}

function normalizePegawaiResponse(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.data)) return payload.data.data;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
}

function normalizePenilaianResponse(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.data)) return payload.data.data;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
}

function groupPenilaianByPegawai(records) {
  const grouped = {};

  (records || []).forEach((record) => {
    const nipPegawai = String(record?.nip_pegawai || "").trim();
    if (!nipPegawai) return;

    if (!grouped[nipPegawai]) {
      grouped[nipPegawai] = {
        nip_pegawai: nipPegawai,
        periode: record?.periode || CURRENT_PERIOD,
        penilai: [],
      };
    }

    if (record?.periode) {
      grouped[nipPegawai].periode = record.periode;
    }

    if (record?.nip_penilai) {
      grouped[nipPegawai].penilai.push({
        nip_penilai: String(record.nip_penilai).trim(),
        role: record.role || "",
        penilaian: record.penilaian ?? null,
      });
    }
  });

  Object.keys(grouped).forEach((nip) => {
    grouped[nip].penilai = grouped[nip].penilai.filter((item, index, items) => {
      return (
        index ===
        items.findIndex(
          (candidate) =>
            candidate.nip_penilai === item.nip_penilai &&
            candidate.role === item.role,
        )
      );
    });
  });

  return grouped;
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
            title:
              "Bagaimana penilaian Anda terhadap kinerja utama pegawai ini?",
            isRequired: true,
            rateMax: 5,
            displayMode: "buttons",
          },
          {
            type: "rating",
            name: "komunikasi",
            title:
              "Bagaimana kualitas komunikasi pegawai ini dalam bekerja sama?",
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
            title:
              "Seberapa besar inisiatif pegawai ini dalam menyelesaikan tugas?",
            isRequired: true,
            rateMax: 5,
            displayMode: "buttons",
          },
          {
            type: "rating",
            name: "tanggung_jawab",
            title:
              "Bagaimana penilaian Anda terhadap tanggung jawab pegawai ini?",
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
    diri_sendiri: record?.diri_sendiri || "",
    atasan_langsung: record?.atasan_langsung || "",
    penerima_manfaat: Array.isArray(record?.penerima_manfaat)
      ? record.penerima_manfaat
      : [],
    rekan_kerja: Array.isArray(record?.rekan_kerja) ? record.rekan_kerja : [],
    bawahan: Array.isArray(record?.bawahan) ? record.bawahan : [],
  };
}

function normalizeAssignmentRecord(record, nip) {
  if (!record) return null;

  if (record.penilai && Array.isArray(record.penilai)) {
    const diriSendiri = record.penilai.find(
      (item) => item.role === "Diri Sendiri",
    );
    const atasan = record.penilai.find(
      (item) => item.role === "Atasan Langsung",
    );
    const penerima = record.penilai
      .filter((item) => item.role === "Penerima Manfaat Kerja")
      .map((item) => item.nip_penilai);
    const rekan = record.penilai
      .filter((item) => item.role === "Rekan Kerja")
      .map((item) => item.nip_penilai);
    const bawahan = record.penilai
      .filter((item) => item.role === "Bawahan")
      .map((item) => item.nip_penilai);

    return {
      periode: record.periode || CURRENT_PERIOD,
      diri_sendiri: diriSendiri?.nip_penilai || nip || "",
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
  readOnly = false,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [menuPosition, setMenuPosition] = useState(null);
  const rootRef = useRef(null);
  const menuRef = useRef(null);
  const searchRef = useRef(null);

  const updateMenuPosition = () => {
    const root = rootRef.current;
    if (!root) return;

    const rect = root.getBoundingClientRect();
    const gap = 8;
    const viewportPadding = 12;
    const preferredWidth = Math.max(rect.width, 320);
    let left = rect.left;

    if (left + preferredWidth > window.innerWidth - viewportPadding) {
      left = Math.max(
        viewportPadding,
        window.innerWidth - viewportPadding - preferredWidth,
      );
    }

    const top = rect.bottom + gap;
    const maxHeight = Math.max(180, window.innerHeight - top - viewportPadding);

    setMenuPosition({
      position: "fixed",
      left,
      top,
      width: rect.width,
      maxHeight,
    });
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      const clickedRoot = rootRef.current?.contains(event.target);
      const clickedMenu = menuRef.current?.contains(event.target);
      if (!clickedRoot && !clickedMenu) {
        setOpen(false);
        setQuery("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!open || disabled) return undefined;

    updateMenuPosition();
    const handleWindowChange = () => updateMenuPosition();
    window.addEventListener("resize", handleWindowChange);
    window.addEventListener("scroll", handleWindowChange, true);

    return () => {
      window.removeEventListener("resize", handleWindowChange);
      window.removeEventListener("scroll", handleWindowChange, true);
    };
  }, [open, disabled, query, options]);

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
      const option = options.find(
        (item) => String(item.value) === selectedValue,
      );
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

  const clearSelection = (event) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    onChange(multiple ? [] : "");
    setQuery("");
  };

  const removeSelectedValue = (removeValue) => {
    if (!multiple) {
      clearSelection();
      return;
    }

    onChange(selectedValues.filter((item) => item !== String(removeValue)));
  };

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
        readOnly={readOnly}
        onClick={() => {
          if (disabled || readOnly) return;
          const nextOpen = !open;
          setOpen(nextOpen);
          if (nextOpen) {
            setTimeout(() => searchRef.current?.focus(), 0);
          }
        }}
        className={`flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition ${
          disabled || readOnly
            ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
            : "border-slate-300 bg-white hover:border-teal-400"
        } ${!selectedLabels.length ? "text-slate-400" : "text-slate-900"}`}
      >
        <div className="min-w-0 flex-1">
          {label && (
            <div className="mb-1 text-xs font-semibold text-slate-500">
              {label}
            </div>
          )}
          {multiple ? (
            selectedLabels.length ? (
              <div className="flex flex-wrap gap-2">
                {selectedValues.map((selectedValue) => {
                  const option = options.find(
                    (item) => String(item.value) === selectedValue,
                  );
                  const chipLabel = option?.label || selectedValue;

                  return (
                    <span
                      key={selectedValue}
                      className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700"
                    >
                      <span className="max-w-[15rem] truncate">
                        {chipLabel}
                      </span>
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          removeSelectedValue(selectedValue);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            event.stopPropagation();
                            removeSelectedValue(selectedValue);
                          }
                        }}
                        className="inline-flex h-4 w-4 cursor-pointer items-center justify-center rounded-full text-[10px] leading-none text-teal-700 hover:bg-teal-100"
                        aria-label={`Hapus ${chipLabel}`}
                      >
                        ×
                      </span>
                    </span>
                  );
                })}
              </div>
            ) : (
              <div className="truncate text-sm font-medium">{displayText}</div>
            )
          ) : (
            <div className="truncate text-sm font-medium">{displayText}</div>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {multiple && selectedValues.length > 0 && (
            <span
              role="button"
              tabIndex={0}
              onClick={clearSelection}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  clearSelection(event);
                }
              }}
              className="cursor-pointer rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-200"
            >
              Hapus semua
            </span>
          )}
          <FontAwesomeIcon
            icon={faChevronDown}
            className="shrink-0 text-slate-400"
          />
        </div>
      </button>

      {open &&
        !disabled &&
        menuPosition &&
        createPortal(
          <div
            ref={menuRef}
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
            style={{
              ...menuPosition,
              zIndex: 13050,
            }}
            onMouseDown={(event) => event.stopPropagation()}
          >
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
                  onClick={clearSelection}
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
          </div>,
          document.body,
        )}
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
  if (typeof document === "undefined") return null;

  const selectedPeriodDate = periodToDate(assignmentForm.periode);

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm"
      style={{ zIndex: 12000 }}
      onClick={onClose}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
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
                NIP {getEmployeeNip(employee) || "-"} ·{" "}
                {getEmployeeJabatan(employee) || "-"} ·{" "}
                {getEmployeeUnit(employee) || "-"}
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
                Periode Penilaian
              </label>
              <DatePicker
                selected={selectedPeriodDate}
                onChange={(date) =>
                  setAssignmentForm((prev) => ({
                    ...prev,
                    periode: dateToPeriod(date),
                  }))
                }
                showMonthYearPicker
                dateFormat="MMMM yyyy"
                locale="id"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                wrapperClassName="w-full"
                placeholderText="Pilih periode"
              />
            </div>
          </div>

          <div className="mt-5 space-y-5">
            <EmployeePicker
              label="Diri Sendiri"
              value={employee?.nip}
              onChange={(nextValue) =>
                setAssignmentForm((prev) => ({
                  ...prev,
                  diri_sendiri: nextValue,
                }))
              }
              options={assignableOptions}
              placeholder={
                loadingOptions ? "Memuat pegawai..." : "Pilih diri sendiri"
              }
              readOnly
            />
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
              placeholder={
                loadingOptions ? "Memuat pegawai..." : "Pilih atasan langsung"
              }
              disabled={loadingOptions}
            />

            <EmployeePicker
              label="Penerima Manfaat Kerja"
              multiple
              value={assignmentForm.penerima_manfaat}
              onChange={(nextValue) =>
                setAssignmentForm((prev) => ({
                  ...prev,
                  penerima_manfaat: nextValue,
                }))
              }
              options={assignableOptions}
              placeholder={
                loadingOptions
                  ? "Memuat pegawai..."
                  : "Pilih penerima manfaat kerja"
              }
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
              placeholder={
                loadingOptions ? "Memuat pegawai..." : "Pilih rekan kerja"
              }
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
              placeholder={
                loadingOptions ? "Memuat pegawai..." : "Pilih bawahan"
              }
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
            {saving ? (
              <FontAwesomeIcon icon={faSpinner} spin />
            ) : (
              <FontAwesomeIcon icon={faSave} />
            )}
            Simpan
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function EvaluationSurveyModal({
  open,
  employee,
  assignment,
  templateJson,
  onClose,
}) {
  const [model, setModel] = useState(null);
  const [completed, setCompleted] = useState(false);
  if (typeof document === "undefined") return null;

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

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm"
      style={{ zIndex: 12000 }}
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-6xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-center gap-4 border-b border-slate-200 px-6 py-5">
          Sedang dalam pengembangan...
        </div>
      </div>
    </div>,
    document.body,
  );
}

function ReviewerListModal({
  open,
  employee,
  reviewers,
  resolvePenilaiLabel,
  onClose,
}) {
  if (!open || !employee) return null;
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm"
      style={{ zIndex: 12000 }}
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div>
            <div className="inline-flex rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-teal-700">
              Daftar Penilai
            </div>
            <h2 className="mt-3 text-2xl font-bold text-slate-900">
              {getEmployeeName(employee) || "Pegawai"}
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              NIP {getEmployeeNip(employee) || "-"}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              Periode:{" "}
              {formatPeriodIndo(reviewers?.[0]?.periode || CURRENT_PERIOD)}
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

        <div className="flex-1 space-y-3 overflow-auto px-6 py-5">
          {reviewers?.length ? (
            reviewers.map((item, index) => (
              <div
                key={`${item.role}-${item.nip_penilai}-${index}`}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
              >
                <div className="text-sm font-semibold text-slate-900">
                  {item.role || "Penilai"}
                </div>
                <div className="mt-1 text-sm text-slate-600">
                  {resolvePenilaiLabel(item.nip_penilai)}
                </div>
                <div className="text-xs text-slate-500">
                  NIP: {item.nip_penilai || "-"}
                </div>
                {item.penilaian !== null && item.penilaian !== undefined && (
                  <div className="mt-1 text-xs text-slate-500">
                    Nilai: {String(item.penilaian)}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
              Belum ada penilai yang ditetapkan.
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
    </div>,
    document.body,
  );
}

export default function FeedbackList() {
  const navigate = useNavigate();
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
  const [showFilters, setShowFilters] = useState(false);
  const [templateJson, setTemplateJson] = useState(buildDefaultTemplate());
  const [templateCreator, setTemplateCreator] = useState(null);
  const [assignmentModalOpen, setAssignmentModalOpen] = useState(false);
  const [evaluationModalOpen, setEvaluationModalOpen] = useState(false);
  const [reviewerListModalOpen, setReviewerListModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [assignmentForm, setAssignmentForm] = useState(buildAssignmentForm());
  const [assignmentStore, setAssignmentStore] = useState({});
  const [savingAssignment, setSavingAssignment] = useState(false);
  const [unitKerjaOptions, setUnitKerjaOptions] = useState([]);
  const [loadingUnitKerja, setLoadingUnitKerja] = useState(true);
  const [periodePenilaian, setPeriodePenilaian] = useState(CURRENT_PERIOD);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const templateLoadingRef = useRef(false);
  const hasLoaded = useRef(false);

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
    if (hasLoaded.current) return;

    hasLoaded.current = true;

    const loadUnitKerja = async () => {
      try {
        setLoadingUnitKerja(true);

        const data = await getUnitKerja();

        setUnitKerjaOptions(
          (data || []).map((item) => ({
            value: item.id,
            label: String(item.unit_organisasi),
          })),
        );
      } finally {
        setLoadingUnitKerja(false);
      }
    };

    loadUnitKerja();
  }, []);

  useEffect(() => {
    localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(templateJson));
  }, [templateJson]);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const response = await getPenilaianPegawai({ only_latest_periode: 1 });
        if (!active) return;
        const records = normalizePenilaianResponse(response);
        setAssignmentStore(groupPenilaianByPegawai(records));
        setPeriodePenilaian(records?.[0]?.periode || CURRENT_PERIOD);
      } catch (err) {
        console.error("Failed to load latest penilaian pegawai", err);
        if (!active) return;
        const rawAssignments = localStorage.getItem(ASSIGNMENT_STORAGE_KEY);
        const parsedAssignments = safeParseJSON(rawAssignments, {});
        setAssignmentStore(parsedAssignments || {});
      }
    })();

    return () => {
      active = false;
    };
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
      setLoadingList(true);
      setError("");
      try {
        const params = {};
        params.with_pagination = true;
        params.per_page = itemsPerPage;
        params.page = currentPage;
        if (searchTerm) params.q = searchTerm;
        if (filterJabatan) params.jabatan = filterJabatan;
        if (filterUnitKerja) params.unit_organisasi_id = filterUnitKerja;

        const data = await getPegawai(params);
        setTotalItems(data.meta?.total || 0);
        setTotalPages(data.meta?.last_page || 1);
        if (!active) return;
        setPegawaiList(normalizePegawaiResponse(data.data));
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
  }, [searchTerm, filterJabatan, filterUnitKerja, currentPage, itemsPerPage]);

  useEffect(() => {
    let active = true;

    (async () => {
      setLoadingAll(true);
      setError("");
      try {
        const data = await getPegawai();
        if (!active) return;
        setPegawaiAll(normalizePegawaiResponse(data));
      } catch (err) {
        if (!active) return;
        console.error("Failed to load pegawai list", err);
        setError("Gagal memuat data pegawai");
        setPegawaiAll([]);
      } finally {
        if (active) setLoadingAll(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

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

  const currentItems = useMemo(() => {
    const base = Array.isArray(pegawaiList) ? pegawaiList : [];

    return base.filter((person) => {
      const matchesJabatan =
        !filterJabatan || getEmployeeJabatan(person) === filterJabatan;

      return matchesJabatan;
    });
  }, [pegawaiList, filterJabatan]);

  const assignableOptions = useMemo(() => {
    const source = pegawaiAll;
    return source.map((person) => ({
      value: getEmployeeNip(person),
      label: getEmployeeLabel(person),
      subtitle: getEmployeeUnit(person) || getEmployeeNip(person) || "",
    }));
  }, [pegawaiAll]);

  const pegawaiLookup = useMemo(() => {
    const source = pegawaiAll;
    return getEmployeeLookupMaps(source);
  }, [pegawaiAll]);

  const startIndex = (currentPage - 1) * itemsPerPage;

  const assignmentSummaryCount = (nip) => {
    const record = assignmentStore[nip];
    return Array.isArray(record?.penilai) ? record.penilai.length : 0;
  };

  const resolvePenilaiLabel = (nip) => {
    const key = String(nip || "").trim();
    if (!key) return "-";
    const match = pegawaiLookup.byNip.get(key);
    if (match?.label) return match.label;
    return key;
  };

  const getPenilaiRecords = (nip) => {
    const record = assignmentStore[nip];
    return Array.isArray(record?.penilai) ? record.penilai : [];
  };

  const resolveAssignmentForm = (employee) => {
    const nip = getEmployeeNip(employee);
    const stored = assignmentStore[nip];
    return buildAssignmentForm(normalizeAssignmentRecord(stored, nip));
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

  const openReviewerListModal = (employee) => {
    setSelectedEmployee(employee);
    setReviewerListModalOpen(true);
  };

  const handleSaveAssignment = async () => {
    if (!selectedEmployee) return;

    const nipPegawai = getEmployeeNip(selectedEmployee);
    const penilai = [];

    if (assignmentForm.diri_sendiri) {
      penilai.push({
        nip_penilai: assignmentForm.diri_sendiri,
        role: "Diri Sendiri",
      });
    }

    if (assignmentForm.atasan_langsung) {
      penilai.push({
        nip_penilai: assignmentForm.atasan_langsung,
        role: "Atasan Langsung",
      });
    }

    assignmentForm.penerima_manfaat.forEach((nip) => {
      if (!nip) return;
      penilai.push({ nip_penilai: nip, role: "Penerima Manfaat Kerja" });
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

      showFeedbackMessage("success", "Berhasil", "Penilai berhasil disimpan.");
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
          onClick={() => navigate("/admin/umpan-balik/template")}
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
            <span className="text-slate-600">
              Periode Penilaian:{" "}
              <strong>{formatPeriodIndo(periodePenilaian)}</strong>
            </span>
            <button
              type="button"
              onClick={() => setShowFilters((value) => !value)}
              className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 font-medium rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 transition-all duration-200 flex items-center gap-2 px-4 py-2.5 text-sm"
            >
              <FontAwesomeIcon icon={faFilter} className="text-base" />
              Filter berdasarkan
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
          className={`transition-all duration-300 ease-in-out ${
            showFilters
              ? "max-h-[700px] opacity-100"
              : "max-h-0 opacity-0 overflow-hidden"
          }`}
        >
          <div className="p-4 bg-white rounded-lg border border-gray-200 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unit Kerja
                </label>
                <SearchableSelect
                  value={filterUnitKerja}
                  name="unit_kerja"
                  onChange={(e) => setFilterUnitKerja(e.target.value)}
                  options={[
                    { value: "", label: "Semua Unit Kerja" },
                    ...unitKerjaOptions,
                  ]}
                  placeholder="Pilih unit kerja"
                  disabled={loadingUnitKerja || unitKerjaOptions.length === 0}
                />
              </div>
            </div>

            <div className="flex justify-start gap-2 mt-4">
              <button
                onClick={() => {
                  setSearchTerm("");
                  setSearchInput("");
                  setFilterJabatan("");
                  setFilterUnitKerja("");
                }}
                className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 font-medium rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 transition-all duration-200 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors inline-flex items-center gap-2"
                disabled={!searchTerm && !filterJabatan && !filterUnitKerja}
              >
                <FontAwesomeIcon icon={faSync} className="text-base" />
                Reset Filter
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold">
                  No
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold">
                  Nama
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold">
                  NIP
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold">
                  Jabatan
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold">
                  Unit Kerja
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {loadingList ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center">
                    <div className="flex items-center justify-center gap-3">
                      <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-500 border-t-transparent"></div>
                      <p className="text-sm text-gray-600">Memuat pegawai...</p>
                    </div>
                  </td>
                </tr>
              ) : currentItems.length === 0 ? (
                <tr>
                  <td
                    colSpan="6"
                    className="px-6 py-12 text-center text-slate-500"
                  >
                    <FontAwesomeIcon
                      icon={faUsers}
                      className="mx-auto mb-3 text-3xl text-slate-300"
                    />
                    <div className="font-medium text-slate-700">
                      Tidak ada data pegawai
                    </div>
                    <div className="mt-1 text-sm">
                      Coba ubah kata kunci pencarian atau filter jabatan/unit
                      kerja.
                    </div>
                  </td>
                </tr>
              ) : (
                currentItems.map((person, index) => {
                  const nip = getEmployeeNip(person);
                  const assignmentCount = assignmentSummaryCount(nip);

                  return (
                    <Fragment key={nip || `${index}`}>
                      <tr className="hover:bg-teal-50/40">
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
                              <button
                                type="button"
                                onClick={() => openReviewerListModal(person)}
                                className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700 hover:bg-teal-100"
                              >
                                <FontAwesomeIcon icon={faUserCheck} />
                                {assignmentCount} penilai
                              </button>
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
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {!loadingList && totalItems > 0 && (
          <div className="flex flex-col items-center justify-between gap-4 border-t border-slate-200 px-4 py-4 sm:flex-row">
            <div className="text-sm text-slate-600">
              Menampilkan{" "}
              <span className="font-semibold text-slate-900">
                {currentItems.length}
              </span>{" "}
              dari{" "}
              <span className="font-semibold text-slate-900">{totalItems}</span>{" "}
              pegawai
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

              <div className="hidden items-center gap-2 sm:flex">
                {renderPagination()}
              </div>

              <button
                type="button"
                onClick={() =>
                  setCurrentPage((page) => Math.min(totalPages, page + 1))
                }
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
                getEmployeeNip(selectedEmployee),
              )
            : null
        }
        templateJson={templateJson}
        onClose={() => setEvaluationModalOpen(false)}
      />

      <ReviewerListModal
        open={reviewerListModalOpen}
        employee={selectedEmployee}
        reviewers={
          selectedEmployee
            ? getPenilaiRecords(getEmployeeNip(selectedEmployee))
            : []
        }
        resolvePenilaiLabel={resolvePenilaiLabel}
        onClose={() => setReviewerListModalOpen(false)}
      />
    </div>
  );
}
