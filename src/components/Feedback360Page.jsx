import { useEffect, useMemo, useState } from "react";
import { Model } from "survey-core";
import { Survey } from "survey-react-ui";
import "survey-core/survey-core.min.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCircleCheck,
  faClipboardList,
  faLock,
  faPenToSquare,
  faSpinner,
  faUserClock,
  faUsers,
} from "@fortawesome/free-solid-svg-icons";
import MainLayout from "./MainLayout";
import {
  getFeedbackTemplates,
  getPegawai,
  getPenilaianPegawai,
  inputPenilaian,
} from "../config/api";
import { getCurrentUserNip } from "../utils/auth";
import {
  getPenilaianStatus,
  isPenilaianPending,
  PENILAIAN_UPDATED_EVENT,
} from "../utils/penilaian";

const STATUS_META = {
  empty: {
    label: "Belum dinilai",
    icon: faUserClock,
    iconClass: "bg-amber-100 text-amber-600",
    badgeClass: "bg-amber-50 text-amber-700",
  },
  partial: {
    label: "Belum selesai",
    icon: faPenToSquare,
    iconClass: "bg-blue-100 text-blue-600",
    badgeClass: "bg-blue-50 text-blue-700",
  },
  complete: {
    label: "Selesai",
    icon: faCircleCheck,
    iconClass: "bg-teal-100 text-teal-600",
    badgeClass: "bg-teal-50 text-teal-700",
  },
};

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

function normalizeTemplate(payload) {
  if (payload && Array.isArray(payload.pages)) return payload;
  if (payload?.data && Array.isArray(payload.data.pages)) return payload.data;
  if (payload?.json && Array.isArray(payload.json.pages)) return payload.json;
  return buildDefaultTemplate();
}

function normalizePenilaianResponse(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.data)) return payload.data.data;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
}

function normalizePegawaiResponse(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.data)) return payload.data.data;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
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

function showMessage(type, title, text) {
  if (typeof window !== "undefined" && window.Swal) {
    window.Swal.fire({
      icon: type,
      title,
      text,
      confirmButtonColor: "#0f766e",
    });
    return;
  }
  alert(text || title);
}

export default function Feedback360Page() {
  const [userNip] = useState(() => getCurrentUserNip());
  const [templateJson, setTemplateJson] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [pegawaiLookup, setPegawaiLookup] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [surveyModel, setSurveyModel] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;

    (async () => {
      setLoading(true);
      setError("");
      try {
        const [templateRes, penilaianRes, pegawaiRes] = await Promise.all([
          getFeedbackTemplates().catch(() => null),
          userNip
            ? getPenilaianPegawai({ nip_penilai: userNip })
            : Promise.resolve([]),
          getPegawai().catch(() => []),
        ]);

        if (!active) return;

        const tpl = normalizeTemplate(templateRes);
        setTemplateJson(tpl);

        const records = normalizePenilaianResponse(penilaianRes);
        setAssignments(records);

        const lookup = {};
        normalizePegawaiResponse(pegawaiRes).forEach((person) => {
          const nip = getEmployeeNip(person);
          if (nip) lookup[nip] = person;
        });
        setPegawaiLookup(lookup);

        const firstPending = records.find((item) =>
          isPenilaianPending(tpl, item.penilaian),
        );
        setSelectedId((firstPending || records[0])?.id ?? null);
      } catch (err) {
        if (!active) return;
        console.error("Failed to load umpan balik 360", err);
        setError("Gagal memuat data penilaian.");
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [userNip]);

  const resolvePegawai = (record) => {
    const nip = String(record?.nip_pegawai || "").trim();
    const nested = record?.pegawai;
    const fromLookup = pegawaiLookup[nip];
    const source = nested || fromLookup || {};
    return {
      nama: getEmployeeName(source) || nip || "-",
      nip: getEmployeeNip(source) || nip,
      jabatan: getEmployeeJabatan(source) || "-",
      unit: getEmployeeUnit(source) || "-",
    };
  };

  const pendingCount = useMemo(
    () =>
      assignments.filter((item) =>
        isPenilaianPending(templateJson, item.penilaian),
      ).length,
    [assignments, templateJson],
  );

  const selectedRecord = useMemo(
    () => assignments.find((item) => item.id === selectedId) || null,
    [assignments, selectedId],
  );

  const selectedStatus = useMemo(
    () => getPenilaianStatus(templateJson, selectedRecord?.penilaian),
    [templateJson, selectedRecord],
  );

  // Build a fresh survey model whenever the selected assignment or template changes.
  useEffect(() => {
    if (!selectedRecord || !templateJson) {
      setSurveyModel(null);
      return;
    }

    const pegawai = resolvePegawai(selectedRecord);
    const model = new Model(templateJson);
    const existing =
      selectedRecord.penilaian && typeof selectedRecord.penilaian === "object"
        ? selectedRecord.penilaian
        : {};

    model.data = {
      ...existing,
      nama_pegawai: pegawai.nama,
      nip: pegawai.nip,
      jabatan: pegawai.jabatan,
      unit_kerja: pegawai.unit,
    };

    // Fully-filled penilaian is locked: show it read-only and skip all saving.
    if (getPenilaianStatus(templateJson, existing) === "complete") {
      model.mode = "display";
      setSurveyModel(model);
      return;
    }

    const recordId = selectedRecord.id;

    const persistPenilaian = async (data) => {
      try {
        setSaving(true);
        await inputPenilaian(recordId, { penilaian: data });

        setAssignments((prev) =>
          prev.map((item) =>
            item.id === recordId ? { ...item, penilaian: data } : item,
          ),
        );

        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event(PENILAIAN_UPDATED_EVENT));
        }
        return true;
      } catch (err) {
        console.error("Failed to save penilaian", err);
        return false;
      } finally {
        setSaving(false);
      }
    };

    // Auto-save the partial answers whenever the penilai moves to another page.
    model.onCurrentPageChanged.add((sender) => {
      persistPenilaian(sender.data);
    });

    // Final submit saves everything and marks the penilaian as complete.
    model.onComplete.add(async (sender, options) => {
      if (options?.showSaveInProgress) options.showSaveInProgress();
      const ok = await persistPenilaian(sender.data);
      if (ok) {
        if (options?.showSaveSuccess) options.showSaveSuccess();
      } else {
        if (options?.showSaveError) options.showSaveError();
        showMessage("error", "Gagal", "Gagal menyimpan penilaian.");
      }
    });

    setSurveyModel(model);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, templateJson, pegawaiLookup]);

  return (
    <MainLayout>
      <div className="mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="border-l-4 border-teal-600 pl-4">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
              Umpan Balik 360
            </h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-gray-400">
              Berikan penilaian untuk pegawai dengan jujur dan sebenar-benarnya.
            </p>
          </div>
          {pendingCount > 0 && (
            <div className="inline-flex items-center gap-2 self-start rounded-full bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700">
              <FontAwesomeIcon icon={faClipboardList} />
              {pendingCount} penilaian belum diisi
            </div>
          )}
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white py-16 text-slate-500 dark:border-gray-700 dark:bg-gray-800">
            <FontAwesomeIcon
              icon={faSpinner}
              spin
              className="mr-3 text-teal-600"
            />
            Memuat data penilaian...
          </div>
        ) : assignments.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white py-16 text-center text-slate-500 dark:border-gray-700 dark:bg-gray-800">
            <FontAwesomeIcon
              icon={faUsers}
              className="mb-3 text-3xl text-slate-300"
            />
            <div className="font-medium text-slate-700 dark:text-gray-200">
              Belum ada pegawai yang perlu Anda nilai
            </div>
            <div className="mt-1 text-sm">
              Anda akan melihat daftar di sini ketika ditetapkan sebagai
              penilai.
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[320px_1fr]">
            {/* Sidebar: daftar pegawai yang harus dinilai */}
            <aside className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <div className="border-b border-slate-200 px-4 py-3 dark:border-gray-700">
                <div className="text-sm font-semibold text-slate-900 dark:text-white">
                  Daftar Penilaian
                </div>
                <div className="text-xs text-slate-500 dark:text-gray-400">
                  {assignments.length} pegawai · {pendingCount} belum diisi
                </div>
              </div>
              <div className="max-h-[70vh] divide-y divide-slate-100 overflow-y-auto dark:divide-gray-700">
                {assignments.map((record) => {
                  const pegawai = resolvePegawai(record);
                  const status = getPenilaianStatus(
                    templateJson,
                    record.penilaian,
                  );
                  const meta = STATUS_META[status];
                  const active = record.id === selectedId;

                  return (
                    <button
                      key={record.id}
                      type="button"
                      onClick={() => setSelectedId(record.id)}
                      className={`flex w-full items-start gap-3 px-4 py-3 text-left transition ${
                        active
                          ? "bg-teal-50 dark:bg-teal-900/20"
                          : "hover:bg-slate-50 dark:hover:bg-gray-700/50"
                      }`}
                    >
                      <div
                        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm ${meta.iconClass}`}
                      >
                        <FontAwesomeIcon icon={meta.icon} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                          {pegawai.nama}
                        </div>
                        <div className="truncate text-xs text-slate-500 dark:text-gray-400">
                          Periode {formatPeriodIndo(record.periode)}
                        </div>
                        <div className="truncate text-xs text-slate-500 dark:text-gray-400">
                          Sebagai {record.role || "Penilai"}
                        </div>
                        <span
                          className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[12px] font-semibold ${meta.badgeClass}`}
                        >
                          {meta.label}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </aside>

            {/* Form penilaian */}
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:p-6">
              {selectedRecord ? (
                <>
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-gray-400">
                        Menilai
                      </div>
                      <div className="text-lg font-semibold text-slate-900 dark:text-white">
                        {resolvePegawai(selectedRecord).nama}
                      </div>
                    </div>
                    {saving ? (
                      <span className="inline-flex items-center gap-2 text-sm text-slate-500">
                        <FontAwesomeIcon icon={faSpinner} spin /> Menyimpan...
                      </span>
                    ) : selectedStatus !== "complete" ? (
                      <span className="text-xs text-slate-400">
                        Jawaban tersimpan otomatis saat berpindah halaman.
                      </span>
                    ) : null}
                  </div>

                  {selectedStatus === "complete" && (
                    <div className="mb-4 flex items-center gap-3 rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-800">
                      <FontAwesomeIcon icon={faLock} />
                      Penilaian ini sudah selesai diisi dan tidak dapat diubah lagi.
                    </div>
                  )}

                  {surveyModel ? <Survey model={surveyModel} /> : null}
                </>
              ) : (
                <div className="flex h-full items-center justify-center py-16 text-slate-500">
                  Pilih pegawai di sebelah kiri untuk mulai menilai.
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
