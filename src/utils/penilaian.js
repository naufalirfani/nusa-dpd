/**
 * Shared helpers for the Umpan Balik 360 (penilaian pegawai) feature.
 */

/** Event dispatched on window after a penilaian is saved, so listeners can refresh. */
export const PENILAIAN_UPDATED_EVENT = "penilaian-updated";

/** Default Umpan Balik 360 template used when none is configured yet. */
export function buildDefaultTemplate() {
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

/**
 * Normalize whatever getFeedbackTemplates returns into a usable template JSON,
 * falling back to the default template when the payload has no pages.
 * @param {*} payload
 * @returns {object}
 */
export function normalizeTemplate(payload) {
  if (payload && Array.isArray(payload.pages)) return payload;
  if (payload?.data && Array.isArray(payload.data.pages)) return payload.data;
  if (payload?.json && Array.isArray(payload.json.pages)) return payload.json;
  return buildDefaultTemplate();
}

/**
 * Filter the template JSON to remove questions not suitable for specific roles.
 * e.g., if the role is 'Diri Sendiri', hide the 'durasi' (duration working together) section.
 * @param {object} templateJson
 * @param {string} role
 * @returns {object}
 */
export function getTemplateForRole(templateJson, role) {
  if (!templateJson) return null;
  if (role === "Diri Sendiri") {
    const cloned = JSON.parse(JSON.stringify(templateJson));
    if (cloned.pages) {
      cloned.pages = cloned.pages.map((page) => {
        if (page.elements) {
          page.elements = page.elements.filter((elem) => elem.name !== "durasi");
        }
        return page;
      });
    }
    return cloned;
  }
  return templateJson;
}

function hasValue(value) {
  if (value === null || value === undefined || value === "") return false;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

/**
 * Collect the actual assessment questions from a template, ignoring the
 * read-only pegawai data fields and non-input elements (html/image/panel).
 * @param {object} templateJson
 * @returns {Array<{ name: string, isRequired: boolean }>}
 */
export function getAssessmentQuestions(templateJson) {
  const questions = [];
  const skipTypes = new Set(["html", "image", "panel", "expression"]);

  (templateJson?.pages || []).forEach((page) => {
    (page?.elements || []).forEach((element) => {
      if (!element?.name || element.readOnly) return;
      if (skipTypes.has(element.type)) return;
      questions.push({ name: element.name, isRequired: !!element.isRequired });
    });
  });

  return questions;
}

/**
 * Determine how far a penilaian has been filled in.
 * @param {object} templateJson
 * @param {object} penilaian - Stored answers
 * @returns {"empty"|"partial"|"complete"}
 */
export function getPenilaianStatus(templateJson, penilaian) {
  let tpl = templateJson;
  let data = penilaian;

  if (
    data === undefined &&
    tpl &&
    typeof tpl === "object" &&
    !Array.isArray(tpl.pages) &&
    !Array.isArray(tpl.data?.pages) &&
    !Array.isArray(tpl.json?.pages)
  ) {
    data = tpl;
    tpl = null;
  }

  tpl = normalizeTemplate(tpl);
  const dataObj = data && typeof data === "object" ? data : {};
  const questions = getAssessmentQuestions(tpl);

  if (questions.length === 0) {
    return Object.keys(dataObj).length > 0 ? "complete" : "empty";
  }

  const answeredCount = questions.filter((q) => hasValue(dataObj[q.name])).length;
  if (answeredCount === 0) return "empty";

  const allRequiredAnswered = questions
    .filter((q) => q.isRequired)
    .every((q) => hasValue(dataObj[q.name]));

  return allRequiredAnswered ? "complete" : "partial";
}

/**
 * True when every required question has an answer (form is fully filled).
 */
export function isPenilaianComplete(templateJson, penilaian) {
  return getPenilaianStatus(templateJson, penilaian) === "complete";
}

/**
 * True when the penilaian still needs the penilai's attention
 * (not started or only partially filled).
 */
export function isPenilaianPending(templateJson, penilaian) {
  return getPenilaianStatus(templateJson, penilaian) !== "complete";
}
