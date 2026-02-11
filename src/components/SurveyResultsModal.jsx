import { faTimes } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React from "react";
import { createPortal } from "react-dom";

export default function SurveyResultsModal({ open, onClose, loading, data }) {
  if (!open) return null;

  let isi = data && (data.isi_form || data.isi || data.isi_formulir || data.form || data);
  // try parse if isi is a JSON string
  if (typeof isi === "string") {
    try {
      isi = JSON.parse(isi);
    } catch {}
  }

  const form = data && (data.kegiatan?.form_evaluasi || data.kegiatan?.form || data.form_evaluasi || data.form);

  // build name->title map and ordered keys from form
  const fieldMap = {};
  const ordered = [];
  try {
    if (form && Array.isArray(form.pages)) {
      form.pages.forEach((p) => {
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

  // collect remaining keys not in form order
  const remaining = [];
  if (isi && typeof isi === "object") {
    Object.keys(isi).forEach((k) => {
      if (!ordered.includes(k)) remaining.push(k);
    });
  }

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 z-[99998]" onClick={onClose}></div>
      <div className="relative max-w-2xl w-full bg-white dark:bg-gray-900 rounded-lg shadow-lg overflow-auto max-h-[80vh] z-[99999]">
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800 sticky top-0 bg-white dark:bg-gray-900">
          <div>
            <h3 className="font-semibold text-lg text-gray-900 dark:text-white">Hasil Survei</h3>
            {form && form.title && (
              <div className="text-xs text-gray-500">{form.title}</div>
            )}
          </div>
          <button onClick={onClose} className="text-gray-600 dark:text-gray-300 hover:text-gray-900"><FontAwesomeIcon icon={faTimes} /></button>
        </div>
        <div className="p-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-600 border-t-transparent" />
            </div>
          ) : !isi ? (
            <p className="text-gray-600 dark:text-gray-400">Tidak ada hasil survei yang tersedia.</p>
          ) : (typeof isi === "object" ? (
            <div className="space-y-3">
              {ordered.map((name) => (
                (isi[name] !== undefined && (
                  <div key={name} className="border rounded-md p-3 bg-gray-50 dark:bg-gray-800">
                    <div className="text-sm text-gray-500">{fieldMap[name] || name}</div>
                    <div className="mt-1 text-sm text-gray-900 dark:text-gray-100">{String(isi[name])}</div>
                  </div>
                ))
              ))}

              {remaining.map((name) => (
                <div key={name} className="border rounded-md p-3 bg-gray-50 dark:bg-gray-800">
                  <div className="text-sm text-gray-500">{fieldMap[name] || name}</div>
                  <div className="mt-1 text-sm text-gray-900 dark:text-gray-100">{String(isi[name])}</div>
                </div>
              ))}
            </div>
          ) : (
            <pre className="whitespace-pre-wrap text-sm text-gray-900 dark:text-gray-100">{String(isi)}</pre>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}
