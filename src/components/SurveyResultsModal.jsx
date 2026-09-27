import { faTimes, faFileAlt, faUserTie } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, { useEffect, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { Model } from "survey-core";
import { Survey } from "survey-react-ui";
import { buildSpeakerOnlySurvey, detectSurveyType } from "../utils/kegiatan";
import "survey-core/survey-core.min.css";
import "survey-core/survey.i18n";

export default function SurveyResultsModal({
  open,
  onClose,
  loading,
  data,
  resolvePegawaiName,
}) {
  const [isClosing, setIsClosing] = useState(false);
  const [selectedTab, setSelectedTab] = useState("survei_kegiatan");

  const isiJson = useMemo(() => {
    const rawIsi =
      data &&
      (data.isi_form || data.isi || data.isi_formulir || data.form || data);
    if (!rawIsi) return null;
    if (typeof rawIsi === "string") {
      try {
        return JSON.parse(rawIsi);
      } catch (e) {
        console.error("Failed to parse isi_form JSON", e);
        return null;
      }
    }
    return rawIsi;
  }, [data]);

  const surveyType = useMemo(() => {
    return detectSurveyType(isiJson, data?.jenis_survei);
  }, [isiJson, data?.jenis_survei]);

  useEffect(() => {
    if (open) {
      setIsClosing(false);
      if (surveyType === "evaluasi_narasumber") {
        setSelectedTab("evaluasi_narasumber");
      } else {
        setSelectedTab("survei_kegiatan");
      }
    }
  }, [open, surveyType]);

  const activeMode =
    surveyType === "gabungan" ? selectedTab : surveyType;

  const formJson = useMemo(() => {
    if (!data) return null;
    const kegiatanObj = data.kegiatan || data;

    if (activeMode === "evaluasi_narasumber") {
      return buildSpeakerOnlySurvey(kegiatanObj, resolvePegawaiName, isiJson);
    }

    const rawForm =
      kegiatanObj?.form_evaluasi ||
      kegiatanObj?.form ||
      data.form_evaluasi ||
      data.form;
    if (!rawForm) return null;
    if (typeof rawForm === "string") {
      try {
        return JSON.parse(rawForm);
      } catch (e) {
        console.error("Failed to parse form_evaluasi JSON", e);
        return null;
      }
    }
    return rawForm;
  }, [data, activeMode, resolvePegawaiName, isiJson]);

  const surveyModel = useMemo(() => {
    if (!formJson) return null;
    try {
      const model = new Model(formJson);
      model.data = isiJson || {};
      model.mode = "display"; // read-only
      model.locale = "id";
      model.onTextMarkdown.add((_, options) => {
        options.html = options.text.replace(
          /\*\*(.*?)\*\*/g,
          "<strong>$1</strong>",
        );
      });
      return model;
    } catch (err) {
      console.error("Error creating survey model in SurveyResultsModal", err);
      return null;
    }
  }, [formJson, isiJson]);

  // Fallback map & keys for legacy display when no formJson is present
  const fieldMap = {};
  const ordered = [];
  try {
    if (formJson && Array.isArray(formJson.pages)) {
      formJson.pages.forEach((p) => {
        if (Array.isArray(p.elements)) {
          p.elements.forEach((el) => {
            if (el && el.name) {
              fieldMap[el.name] = el.title || el.name;
              ordered.push(el.name);
            }
          });
        }
      });
    }
  } catch (e) {
    // ignore
  }

  const remaining = [];
  if (isiJson && typeof isiJson === "object") {
    Object.keys(isiJson).forEach((k) => {
      if (!ordered.includes(k)) remaining.push(k);
    });
  }

  if (!open) return null;

  function handleClose() {
    setIsClosing(true);
    setTimeout(() => {
      if (typeof onClose === "function") onClose();
    }, 300);
  }

  if (typeof document === "undefined") return null;

  const hasParticipantProfile =
    isiJson &&
    typeof isiJson === "object" &&
    (isiJson.nama_lengkap ||
      isiJson.nip_no_absen ||
      isiJson.jabatan ||
      isiJson.unit_kerja ||
      isiJson.status_pegawai);

  return createPortal(
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${
        isClosing ? "opacity-0" : "opacity-100"
      }`}
      onClick={handleClose}
    >
      <div
        className={`relative w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl bg-white dark:bg-gray-900 shadow-2xl transition-all duration-300 ${
          isClosing ? "scale-95 opacity-0" : "scale-100 opacity-100"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-800">
          <div>
            <div className="flex items-center gap-2.5">
              <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
                {activeMode === "evaluasi_narasumber"
                  ? "Hasil Evaluasi Narasumber"
                  : "Hasil Survei Kegiatan"}
              </h3>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  activeMode === "evaluasi_narasumber"
                    ? "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300"
                    : "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300"
                }`}
              >
                <FontAwesomeIcon
                  icon={
                    activeMode === "evaluasi_narasumber" ? faUserTie : faFileAlt
                  }
                  className="w-3 h-3"
                />
                {activeMode === "evaluasi_narasumber"
                  ? "Evaluasi Narasumber"
                  : "Survei Kegiatan"}
              </span>
            </div>
            {formJson && formJson.title && (
              <div className="text-xs text-gray-500 mt-0.5">{formJson.title}</div>
            )}
          </div>

          <div className="flex items-center gap-3 self-end sm:self-auto">
            {surveyType === "gabungan" && (
              <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-xl border border-gray-200 dark:border-gray-600">
                <button
                  type="button"
                  onClick={() => setSelectedTab("survei_kegiatan")}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeMode === "survei_kegiatan"
                      ? "bg-white dark:bg-gray-800 text-teal-700 dark:text-teal-400 shadow-xs"
                      : "text-gray-600 dark:text-gray-300 hover:text-gray-900"
                  }`}
                >
                  <FontAwesomeIcon icon={faFileAlt} className="w-3 h-3" />
                  Survei Kegiatan
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedTab("evaluasi_narasumber")}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeMode === "evaluasi_narasumber"
                      ? "bg-white dark:bg-gray-800 text-purple-700 dark:text-purple-400 shadow-xs"
                      : "text-gray-600 dark:text-gray-300 hover:text-gray-900"
                  }`}
                >
                  <FontAwesomeIcon icon={faUserTie} className="w-3 h-3" />
                  Evaluasi Narasumber
                </button>
              </div>
            )}

            <button
              onClick={handleClose}
              className="p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-600 dark:hover:text-gray-300 transition cursor-pointer"
            >
              <FontAwesomeIcon icon={faTimes} />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto px-6 py-6 max-h-[calc(90vh-80px)] space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-600 border-t-transparent" />
            </div>
          ) : (
            <>
              {activeMode === "evaluasi_narasumber" && hasParticipantProfile && (
                <div className="rounded-xl border border-purple-100 dark:border-gray-700 bg-purple-50/50 dark:bg-gray-800/60 p-4">
                  <div className="text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400 mb-2.5">
                    Data Responden
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                    {isiJson.nama_lengkap && (
                      <div>
                        <span className="text-gray-500 dark:text-gray-400 block">
                          Nama Lengkap
                        </span>
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {String(isiJson.nama_lengkap)}
                        </span>
                      </div>
                    )}
                    {isiJson.nip_no_absen && (
                      <div>
                        <span className="text-gray-500 dark:text-gray-400 block">
                          NIP / No. Absen
                        </span>
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {String(isiJson.nip_no_absen)}
                        </span>
                      </div>
                    )}
                    {isiJson.status_pegawai && (
                      <div>
                        <span className="text-gray-500 dark:text-gray-400 block">
                          Status Pegawai
                        </span>
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {String(isiJson.status_pegawai)}
                        </span>
                      </div>
                    )}
                    {isiJson.jabatan && (
                      <div>
                        <span className="text-gray-500 dark:text-gray-400 block">
                          Jabatan
                        </span>
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {String(isiJson.jabatan)}
                        </span>
                      </div>
                    )}
                    {isiJson.unit_kerja && (
                      <div className="sm:col-span-2">
                        <span className="text-gray-500 dark:text-gray-400 block">
                          Unit Kerja
                        </span>
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {String(isiJson.unit_kerja)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {surveyModel ? (
                <div className="survey-container-readonly">
                  <Survey model={surveyModel} />
                </div>
              ) : !isiJson ? (
                <p className="text-gray-600 dark:text-gray-400">
                  Tidak ada hasil survei yang tersedia.
                </p>
              ) : typeof isiJson === "object" ? (
                <div className="space-y-3">
                  {ordered.map((name) =>
                    isiJson[name] !== undefined ? (
                      <div
                        key={name}
                        className="border rounded-md p-3 bg-gray-50 dark:bg-gray-800"
                      >
                        <div className="text-sm text-gray-500">
                          {fieldMap[name] || name}
                        </div>
                        <div className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                          {String(isiJson[name])}
                        </div>
                      </div>
                    ) : null,
                  )}

                  {remaining.map((name) => (
                    <div
                      key={name}
                      className="border rounded-md p-3 bg-gray-50 dark:bg-gray-800"
                    >
                      <div className="text-sm text-gray-500">
                        {fieldMap[name] || name}
                      </div>
                      <div className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                        {String(isiJson[name])}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <pre className="whitespace-pre-wrap text-sm text-gray-900 dark:text-gray-100">
                  {String(isiJson)}
                </pre>
              )}
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
