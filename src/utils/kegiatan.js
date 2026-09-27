/**
 * Helper utilities for Kegiatan & Narasumber
 */

export function buildDefaultSpeakerEvaluationTemplate() {
  return {
    title: "Form Evaluasi Narasumber",
    description: "Mohon berikan penilaian Anda terhadap penampilan dan penyampaian materi oleh Narasumber.",
    showQuestionNumbers: "off",
    completedHtml: '<h3 class="sv-title">Terima kasih, evaluasi narasumber Anda telah tersimpan.</h3>',
    pages: [
      {
        name: "page1",
        title: "Penilaian Narasumber",
        elements: [
          {
            type: "rating",
            name: "penguasaan_materi",
            title: "Penguasaan dan Pemahaman Materi oleh Narasumber",
            isRequired: true,
            rateMax: 5,
            displayMode: "buttons"
          },
          {
            type: "rating",
            name: "kejelasan_penyampaian",
            title: "Kejelasan dan Komunikatif dalam Menyampaikan Materi",
            isRequired: true,
            rateMax: 5,
            displayMode: "buttons"
          },
          {
            type: "rating",
            name: "respon_pertanyaan",
            title: "Kemampuan Merespon dan Menjawab Pertanyaan Peserta",
            isRequired: true,
            rateMax: 5,
            displayMode: "buttons"
          },
          {
            type: "rating",
            name: "kualitas_presentasi",
            title: "Kualitas Media & Slide Presentasi yang Digunakan",
            isRequired: true,
            rateMax: 5,
            displayMode: "buttons"
          },
          {
            type: "comment",
            name: "catatan_narasumber",
            title: "Catatan, Kritik, atau Masukan untuk Narasumber Ini"
          }
        ]
      }
    ]
  };
}

/**
 * Extract array of narasumber items from activity object.
 * Handles JSON array string, array, or legacy single string.
 */
export function parseNarasumberList(kegiatan) {
  if (!kegiatan) return [];
  
  let rawList = kegiatan.narasumber_list;
  if (typeof rawList === "string") {
    try {
      rawList = JSON.parse(rawList);
    } catch (e) {}
  }

  if (Array.isArray(rawList) && rawList.length > 0) {
    return rawList.map((item, idx) => ({
      id: item.id || `narasumber-${idx}`,
      narasumber: item.narasumber || item.nama || "",
      asal_narasumber: item.asal_narasumber || item.asal || "Internal",
    }));
  }

  let raw = kegiatan.narasumber;
  if (!raw) return [];

  if (typeof raw === "string") {
    try {
      const decoded = JSON.parse(raw);
      if (Array.isArray(decoded) && decoded.length > 0) {
        return decoded.map((item, idx) => ({
          id: item.id || `narasumber-${idx}`,
          narasumber: item.narasumber || item.nama || "",
          asal_narasumber: item.asal_narasumber || item.asal || "Internal",
        }));
      }
    } catch (e) {
      // not JSON string
    }
    return [
      {
        id: "narasumber-0",
        narasumber: raw,
        asal_narasumber: kegiatan.asal_narasumber || "Internal",
      }
    ];
  }

  if (Array.isArray(raw) && raw.length > 0) {
    return raw.map((item, idx) => ({
      id: item.id || `narasumber-${idx}`,
      narasumber: item.narasumber || item.nama || "",
      asal_narasumber: item.asal_narasumber || item.asal || "Internal",
    }));
  }

  return [];
}

function resolveSpeakerTemplate(activityData) {
  let parsed = null;
  if (activityData?.form_evaluasi_narasumber) {
    try {
      parsed =
        typeof activityData.form_evaluasi_narasumber === "string"
          ? JSON.parse(activityData.form_evaluasi_narasumber)
          : activityData.form_evaluasi_narasumber;
    } catch (e) {
      parsed = null;
    }
  }
  if (parsed && Array.isArray(parsed.pages) && parsed.pages.length > 0) {
    return parsed;
  }
  return buildDefaultSpeakerEvaluationTemplate();
}

/**
 * Detect whether an isi_form object represents:
 * - "evaluasi_narasumber"
 * - "survei_kegiatan"
 * - "gabungan" (both Survei Kegiatan & Evaluasi Narasumber keys present)
 */
export function detectSurveyType(isiForm, jenisSurveiHint = null) {
  let parsed = isiForm;
  if (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed);
    } catch (e) {
      parsed = null;
    }
  }

  if (parsed && typeof parsed === "object") {
    const identityKeys = new Set([
      "nama_lengkap",
      "nip_no_absen",
      "jabatan",
      "unit_kerja",
      "status_pegawai",
      "nomor_sertifikat",
      "nip",
    ]);

    let hasSpeakerEval = false;
    let hasActivityEval = false;

    Object.keys(parsed).forEach((key) => {
      if (/^ns_\d+_/.test(key)) {
        hasSpeakerEval = true;
      } else if (!identityKeys.has(key)) {
        hasActivityEval = true;
      }
    });

    if (hasSpeakerEval && hasActivityEval) return "gabungan";
    if (hasSpeakerEval) return "evaluasi_narasumber";
    if (hasActivityEval) return "survei_kegiatan";
  }

  if (
    jenisSurveiHint === "evaluasi_narasumber" ||
    jenisSurveiHint === "survei_kegiatan" ||
    jenisSurveiHint === "gabungan"
  ) {
    return jenisSurveiHint;
  }

  return "survei_kegiatan";
}

/**
 * Combine main activity survey JSON and per-speaker evaluation pages for all speakers.
 */
export function combineActivityAndSpeakerSurvey(activityData, resolvePegawaiNameFn) {
  let mainSurveyJson = {};
  if (activityData?.form_evaluasi) {
    mainSurveyJson =
      typeof activityData.form_evaluasi === "string"
        ? JSON.parse(activityData.form_evaluasi)
        : activityData.form_evaluasi;
  }

  const speakerSurveyTpl = resolveSpeakerTemplate(activityData);
  const speakers = parseNarasumberList(activityData);

  const combined = JSON.parse(JSON.stringify(mainSurveyJson || { pages: [] }));
  if (!combined.pages) combined.pages = [];

  if (speakers.length > 0 && speakerSurveyTpl && Array.isArray(speakerSurveyTpl.pages)) {
    speakers.forEach((speaker, sIdx) => {
      const isInternal = (speaker.asal_narasumber || "Internal").toLowerCase() === "internal";
      let speakerName = speaker.narasumber || `Narasumber ${sIdx + 1}`;
      if (isInternal && resolvePegawaiNameFn) {
        const resolved = resolvePegawaiNameFn(speaker.narasumber);
        if (resolved) speakerName = resolved;
      }

      speakerSurveyTpl.pages.forEach((page, pIdx) => {
        const pageClone = JSON.parse(JSON.stringify(page));
        pageClone.name = `ns_page_${sIdx}_${pIdx}`;
        pageClone.title = `Evaluasi Narasumber: ${speakerName}`;

        if (Array.isArray(pageClone.elements)) {
          pageClone.elements = pageClone.elements.map((elem) => {
            const originalName = elem.name;
            const elemClone = JSON.parse(JSON.stringify(elem));
            elemClone.name = `ns_${sIdx}_${originalName}`;
            
            let title = elemClone.title || "";
            if (title.includes("Narasumber Ini")) {
              title = title.replace("Narasumber Ini", speakerName);
            } else if (title.includes("Narasumber")) {
              title = title.replace("Narasumber", speakerName);
            } else if (!title.includes(speakerName)) {
              title = `${title} (${speakerName})`;
            }
            elemClone.title = title;
            return elemClone;
          });
        }

        combined.pages.push(pageClone);
      });
    });
  }

  return combined;
}

/**
 * Build survey model exclusively for speaker evaluations (Form Evaluasi Narasumber only).
 */
export function buildSpeakerOnlySurvey(activityData, resolvePegawaiNameFn, isiData = null) {
  const speakerSurveyTpl = resolveSpeakerTemplate(activityData);

  const speakers = [...parseNarasumberList(activityData)];
  if (isiData && typeof isiData === "object") {
    let maxIdx = -1;
    Object.keys(isiData).forEach((k) => {
      const m = k.match(/^ns_(\d+)_/);
      if (m) {
        const idx = parseInt(m[1], 10);
        if (!Number.isNaN(idx) && idx > maxIdx) {
          maxIdx = idx;
        }
      }
    });
    while (speakers.length <= maxIdx) {
      const nextIdx = speakers.length;
      speakers.push({
        id: `narasumber-${nextIdx}`,
        narasumber: `Narasumber ${nextIdx + 1}`,
        asal_narasumber: "Eksternal",
      });
    }
  }

  const surveyJson = {
    title: `Evaluasi Narasumber: ${activityData?.nama_kegiatan || ""}`.trim(),
    showProgressBar: "top",
    progressBarType: "pages",
    completedHtml: '<h3 class="sv-title">Terima kasih, evaluasi narasumber Anda telah tersimpan.</h3>',
    pages: [],
  };

  if (speakers.length > 0 && speakerSurveyTpl && Array.isArray(speakerSurveyTpl.pages)) {
    speakers.forEach((speaker, sIdx) => {
      const isInternal = (speaker.asal_narasumber || "Internal").toLowerCase() === "internal";
      let speakerName = speaker.narasumber || `Narasumber ${sIdx + 1}`;
      if (isInternal && resolvePegawaiNameFn) {
        const resolved = resolvePegawaiNameFn(speaker.narasumber);
        if (resolved) speakerName = resolved;
      }

      speakerSurveyTpl.pages.forEach((page, pIdx) => {
        const pageClone = JSON.parse(JSON.stringify(page));
        pageClone.name = `ns_page_${sIdx}_${pIdx}`;
        pageClone.title = `Evaluasi Narasumber: ${speakerName}`;

        if (Array.isArray(pageClone.elements)) {
          pageClone.elements = pageClone.elements.map((elem) => {
            const originalName = elem.name;
            const elemClone = JSON.parse(JSON.stringify(elem));
            elemClone.name = `ns_${sIdx}_${originalName}`;
            
            let title = elemClone.title || "";
            if (title.includes("Narasumber Ini")) {
              title = title.replace("Narasumber Ini", speakerName);
            } else if (title.includes("Narasumber")) {
              title = title.replace("Narasumber", speakerName);
            } else if (!title.includes(speakerName)) {
              title = `${title} (${speakerName})`;
            }
            elemClone.title = title;
            return elemClone;
          });
        }

        surveyJson.pages.push(pageClone);
      });
    });
  } else {
    surveyJson.pages.push({
      name: "page_narasumber_fallback",
      title: "Evaluasi Narasumber",
      elements: [
        {
          type: "comment",
          name: "ns_0_catatan_narasumber",
          title: "Catatan atau Masukan untuk Narasumber",
        },
      ],
    });
  }

  return surveyJson;
}

/**
 * Format array of strings into Indonesian list syntax ("A", "A dan B", "A, B, dan C")
 */
export function formatIndonesianList(arr) {
  if (!arr || !Array.isArray(arr) || arr.length === 0) return "-";
  const valid = arr.filter((x) => x && x !== "-");
  if (valid.length === 0) return "-";
  if (valid.length === 1) return valid[0];
  if (valid.length === 2) return `${valid[0]} dan ${valid[1]}`;
  
  const last = valid[valid.length - 1];
  const rest = valid.slice(0, valid.length - 1);
  return `${rest.join(", ")}, dan ${last}`;
}

/**
 * Format narasumber items into a readable string or array for display.
 */
export function formatNarasumberDisplay(kegiatan, resolvePegawaiNameFn, memuatPegawai = false) {
  const list = parseNarasumberList(kegiatan);
  if (!list || list.length === 0) return "-";

  const names = list.map((item) => {
    const isInternal = (item.asal_narasumber || "Internal").toLowerCase() === "internal";
    let name = item.narasumber || "";
    if (isInternal) {
      if (memuatPegawai) return "Memuat...";
      if (resolvePegawaiNameFn) {
        name = resolvePegawaiNameFn(item.narasumber) || item.narasumber;
      }
    }
    return name || "-";
  });

  return formatIndonesianList(names);
}
