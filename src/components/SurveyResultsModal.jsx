import { faTimes } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, { useEffect, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { Model } from "survey-core";
import { Survey } from "survey-react-ui";
import "survey-core/survey-core.min.css";
import "survey-core/survey.i18n";

export default function SurveyResultsModal({ open, onClose, loading, data }) {
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (open) setIsClosing(false);
  }, [open]);

  const formJson = useMemo(() => {
    const rawForm = data && (data.kegiatan?.form_evaluasi || data.kegiatan?.form || data.form_evaluasi || data.form);
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
  }, [data]);

  const isiJson = useMemo(() => {
    const rawIsi = data && (data.isi_form || data.isi || data.isi_formulir || data.form || data);
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

  return createPortal(
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${isClosing ? "opacity-0" : "opacity-100"
        }`}
      onClick={handleClose}
    >
      <div
        className={`relative w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl bg-white dark:bg-gray-900 shadow-2xl transition-all duration-300 ${isClosing ? "scale-95 opacity-0" : "scale-100 opacity-100"
          }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-800">
          <div>
            <h3 className="font-semibold text-lg text-gray-900 dark:text-white">Hasil Survei</h3>
            {formJson && formJson.title && (
              <div className="text-xs text-gray-500">{formJson.title}</div>
            )}
          </div>
          <button onClick={handleClose} className="rounded-lg text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-600 dark:hover:text-gray-300 transition">
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-6 max-h-[calc(90vh-80px)]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-600 border-t-transparent" />
            </div>
          ) : surveyModel ? (
            <div className="survey-container-readonly">
              <Survey model={surveyModel} />
            </div>
          ) : !isiJson ? (
            <p className="text-gray-600 dark:text-gray-400">Tidak ada hasil survei yang tersedia.</p>
          ) : typeof isiJson === "object" ? (
            <div className="space-y-3">
              {ordered.map((name) =>
                isiJson[name] !== undefined ? (
                  <div key={name} className="border rounded-md p-3 bg-gray-50 dark:bg-gray-800">
                    <div className="text-sm text-gray-500">{fieldMap[name] || name}</div>
                    <div className="mt-1 text-sm text-gray-900 dark:text-gray-100">{String(isiJson[name])}</div>
                  </div>
                ) : null
              )}

              {remaining.map((name) => (
                <div key={name} className="border rounded-md p-3 bg-gray-50 dark:bg-gray-800">
                  <div className="text-sm text-gray-500">{fieldMap[name] || name}</div>
                  <div className="mt-1 text-sm text-gray-900 dark:text-gray-100">{String(isiJson[name])}</div>
                </div>
              ))}
            </div>
          ) : (
            <pre className="whitespace-pre-wrap text-sm text-gray-900 dark:text-gray-100">{String(isiJson)}</pre>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
