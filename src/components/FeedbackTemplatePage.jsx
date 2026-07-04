import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SurveyCreator, SurveyCreatorComponent } from "survey-creator-react";
import "survey-core/survey-core.min.css";
import "survey-creator-core/survey-creator-core.min.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faClipboardList,
  faSave,
  faRotateLeft,
  faDownload,
} from "@fortawesome/free-solid-svg-icons";
import { getFeedbackTemplates, saveFeedbackTemplate } from "../config/api";

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

export default function FeedbackTemplatePage() {
  const navigate = useNavigate();
  const [templateJson, setTemplateJson] = useState(buildDefaultTemplate());
  const [creator, setCreator] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const loadingRef = useRef(false);

  useEffect(() => {
    const loadTemplate = async () => {
      if (loadingRef.current) return;

      loadingRef.current = true;

      try {
        const response = await getFeedbackTemplates();

        let nextTemplate = buildDefaultTemplate();

        if (response) {
          nextTemplate = response;
        }

        const surveyCreator = new SurveyCreator({
          showLogicTab: true,
          showTranslationTab: false,
          isAutoSave: false,
        });

        surveyCreator.JSON = nextTemplate;

        setTemplateJson(nextTemplate);
        setCreator(surveyCreator);

        surveyCreator.onModified.add(() => {
          if (loadingRef.current) return;
          setTemplateJson(surveyCreator.JSON);
        });

        surveyModel.onTextMarkdown.add((_, options) => {
          options.html = options.text;
        });
      } catch (err) {
        console.error(err);
      }

      setTimeout(() => {
        loadingRef.current = false;
      }, 0);
    };

    loadTemplate();
  }, []);

  const persistTemplate = async (json) => {
    const response = await saveFeedbackTemplate(json);

    if (!response.ok) {
      throw new Error("Failed to save template");
    }

    return response.json();
  };

  const handleSaveTemplate = async () => {
    try {
      setIsSaving(true);
      setSaveMessage("");

      await persistTemplate(templateJson);

      setSaveMessage("Template berhasil disimpan.");
    } catch (error) {
      console.error(error);
      setSaveMessage("Gagal menyimpan template.");
    } finally {
      setIsSaving(false);
    }
  };

  const questionCount = useMemo(() => {
    return (templateJson?.pages || []).reduce(
      (total, page) => total + (page.elements?.length || 0),
      0,
    );
  }, [templateJson]);

  const pageCount = templateJson?.pages?.length || 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="border-l-4 border-teal-600 pl-4">
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            Sesuaikan Daftar Pertanyaan
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Atur template penilaian Umpan Balik 360 dengan Survey Creator.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/admin/umpan-balik")}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <FontAwesomeIcon icon={faArrowLeft} />
            Kembali
          </button>
          <button
            type="button"
            onClick={() => {
              const defaultTemplate = buildDefaultTemplate();
              loadingRef.current = true;
              if (creator) creator.JSON = defaultTemplate;
              setTemplateJson(defaultTemplate);
              setTimeout(() => {
                loadingRef.current = false;
              }, 0);
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700"
          >
            <FontAwesomeIcon icon={faClipboardList} />
            Gunakan Default Form
          </button>
          <button
            type="button"
            onClick={handleSaveTemplate}
            disabled={isSaving}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <FontAwesomeIcon icon={faSave} />
            {isSaving ? "Menyimpan..." : "Simpan Template"}
          </button>
        </div>
      </div>

      {saveMessage && (
        <div className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-800">
          {saveMessage}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.6fr_0.9fr]">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-4 py-3">
            <div className="text-sm font-semibold text-slate-900">
              Survey Creator
            </div>
            <div className="text-xs text-slate-500">
              {pageCount} halaman · {questionCount} pertanyaan
            </div>
          </div>
          <div className="min-h-[72vh] bg-slate-50 p-3">
            <div className="min-h-[70vh] overflow-hidden rounded-2xl border border-slate-200 bg-white">
              {creator && <SurveyCreatorComponent creator={creator} />}
            </div>
          </div>
        </div>

        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500">
              Judul
            </div>
            <div className="mt-1 text-lg font-semibold text-slate-900">
              {templateJson?.title || "-"}
            </div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500">
              Keterangan
            </div>
            <p className="mt-1 text-sm text-slate-700">
              {templateJson?.description || "-"}
            </p>
          </div>

          {(templateJson?.pages || []).map((page, pageIndex) => (
            <div
              key={page.name || pageIndex}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs uppercase tracking-wide text-slate-500">
                    Halaman {pageIndex + 1}
                  </div>
                  <div className="mt-1 font-semibold text-slate-900">
                    {page.title || page.name || `Page ${pageIndex + 1}`}
                  </div>
                </div>
                <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700">
                  {page.elements?.length || 0} pertanyaan
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
