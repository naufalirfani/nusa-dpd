import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  createKegiatan,
  updateKegiatan,
  getKegiatanById,
  getPegawai,
  deleteMediaFile,
} from "../config/api";
import SearchableSelect from "./SearchableSelect";
import CertificateEditor from "./CertificateEditor";
import Swal from "sweetalert2";
import { SurveyCreatorComponent, SurveyCreator } from "survey-creator-react";
import "survey-core/survey-core.min.css";
// survey-core CSS provides default styles; no runtime StylesManager available in this build
import "survey-creator-core/survey-creator-core.min.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faCheck,
  faTimes,
  faCloudUploadAlt,
  faFileAlt,
  faArrowRight,
  faSpinner,
  faCheckCircle,
  faSync,
} from "@fortawesome/free-solid-svg-icons";

// Module-level cache/promise to avoid duplicate fetches and handle StrictMode
let pegawaiCache = null;
let pegawaiPromise = null;
let kegiatanCache = {}; // Cache by ID
let kegiatanPromises = {}; // Promises by ID
const BE_URL = import.meta.env.VITE_BE_URL || "http://localhost:8000";

// Helpers
function formatDateForInput(value) {
  if (!value) return "";

  const pad = (n) => String(n).padStart(2, "0");

  // If it's already YYYY-MM-DD at start, extract it
  if (typeof value === "string") {
    const m = value.match(/^(\d{4}-\d{2}-\d{2})/);
    if (m) return m[1];

    // Support common DD/MM/YYYY or DD-MM-YYYY formats
    const dm = value.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})/);
    if (dm) {
      const [, dd, mm, yyyy] = dm;
      return `${yyyy}-${mm}-${dd}`;
    }

    // Try ISO-like strings (with space or timezone)
    const tryIso = value.replace(" ", "T");
    const d = new Date(tryIso);
    if (!isNaN(d)) {
      // Convert instant to WIB (UTC+7) to get the correct local date in WIB
      const wib = new Date(d.getTime() + 7 * 3600 * 1000);
      const y = wib.getUTCFullYear();
      const mmV = pad(wib.getUTCMonth() + 1);
      const ddV = pad(wib.getUTCDate());
      return `${y}-${mmV}-${ddV}`;
    }
  }

  if (value instanceof Date && !isNaN(value)) {
    // Treat Date as instant and convert to WIB
    const wib = new Date(value.getTime() + 7 * 3600 * 1000);
    const y = wib.getUTCFullYear();
    const mm = pad(wib.getUTCMonth() + 1);
    const dd = pad(wib.getUTCDate());
    return `${y}-${mm}-${dd}`;
  }

  try {
    const d = new Date(value);
    if (!isNaN(d)) {
      const wib = new Date(d.getTime() + 7 * 3600 * 1000);
      const y = wib.getUTCFullYear();
      const mm = pad(wib.getUTCMonth() + 1);
      const dd = pad(wib.getUTCDate());
      return `${y}-${mm}-${dd}`;
    }
  } catch (e) {
    // fallthrough
  }
  return "";
}

function formatTimeForInput(value) {
  if (!value) return "";
  if (typeof value === "string") {
    // match HH:MM at start (handles HH:MM:SS and HH:MM)
    const m = value.match(/^(\d{2}:\d{2})/);
    if (m) return m[1];
    // ISO datetime like 2023-01-01T08:30:00
    const m2 = value.match(/T(\d{2}:\d{2})/);
    if (m2) return m2[1];
    const d = new Date(value);
    if (!isNaN(d)) {
      // shift to WIB (UTC+7)
      const wib = new Date(d.getTime() + 7 * 3600 * 1000);
      const hh = String(wib.getUTCHours()).padStart(2, "0");
      const mm = String(wib.getUTCMinutes()).padStart(2, "0");
      return `${hh}:${mm}`;
    }
    return value;
  }
  if (value instanceof Date && !isNaN(value)) {
    // treat Date as instant and convert to WIB
    const wib = new Date(value.getTime() + 7 * 3600 * 1000);
    const hh = String(wib.getUTCFullYear());
    const hours = String(wib.getUTCHours()).padStart(2, "0");
    const mins = String(wib.getUTCMinutes()).padStart(2, "0");
    return `${hours}:${mins}`;
  }
  try {
    const d = new Date(value);
    if (!isNaN(d)) return d.toTimeString().slice(0, 5);
  } catch (e) {}
  return "";
}

export default function KegiatanForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(isEdit);
  const [currentStep, setCurrentStep] = useState(1);

  const [pegawaiList, setPegawaiList] = useState([]);
  const [loadingPegawai, setLoadingPegawai] = useState(false);

  const [formData, setFormData] = useState({
    banner: null,
    materi: null,
    virtual_background: null,
    jenis_kegiatan: "",
    nama_kegiatan: "",
    judul: "",
    deskripsi: "",
    narasumber_type: "internal",
    narasumber_pegawai_id: "",
    narasumber_eksternal: "",
    moderator_type: "internal",
    moderator_pegawai_id: "",
    moderator_eksternal: "",
    butuh_sertifikat: true,
    tempat: "",
    tanggal: new Date().toISOString().slice(0, 10),
    jam_mulai: "",
    jam_selesai: "",
    linktree: "",
    youtube: "",
    template_sertifikat: "",
    desain_sertifikat: null,
    form_evaluasi: null,
  });

  const [bannerPreview, setBannerPreview] = useState("");
  const [materiPreview, setMateriPreview] = useState("");
  const [virtualBackgroundPreview, setVirtualBackgroundPreview] = useState("");
  const [certificateDesign, setCertificateDesign] = useState(null);
  const [certificateBackgroundUrl, setCertificateBackgroundUrl] =
    useState(null);
  const [existingBannerPath, setExistingBannerPath] = useState(null);
  const [existingMateriPath, setExistingMateriPath] = useState(null);
  const [existingVirtualBackgroundPath, setExistingVirtualBackgroundPath] =
    useState(null);

  // Survey Creator instance for Form Evaluasi
  const [surveyCreator, setSurveyCreator] = useState(null);
  const autoSaveTimerRef = useRef(null);
  const isLoadingFormEvaluasiRef = useRef(false);

  // Initialize Survey Creator
  useEffect(() => {
    const creator = new SurveyCreator({
      showLogicTab: true,
      showTranslationTab: false,
      isAutoSave: false,
    });

    // Load existing form evaluasi if available
    if (formData.form_evaluasi) {
      try {
        isLoadingFormEvaluasiRef.current = true;
        const parsedJSON =
          typeof formData.form_evaluasi === "string"
            ? JSON.parse(formData.form_evaluasi)
            : formData.form_evaluasi;
        creator.JSON = parsedJSON;
        isLoadingFormEvaluasiRef.current = false;
      } catch (e) {
        isLoadingFormEvaluasiRef.current = false;
      }
    }

    // Auto-save handler with debounce
    creator.onModified.add(() => {
      // Don't auto-save if we're loading data
      if (isLoadingFormEvaluasiRef.current) return;

      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }

      autoSaveTimerRef.current = setTimeout(() => {
        const surveyJSON = creator.JSON;
        setFormData((prev) => ({
          ...prev,
          form_evaluasi: surveyJSON,
        }));
      }, 1000); // Auto-save after 1 second of inactivity
    });

    setSurveyCreator(creator);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, []);

  // Update Survey Creator when form_evaluasi data is loaded or changed
  useEffect(() => {
    if (!surveyCreator) return;

    // Only proceed when there's evaluasi data to load and we're not already loading
    if (!formData.form_evaluasi || isLoadingFormEvaluasiRef.current) return;

    try {
      isLoadingFormEvaluasiRef.current = true;
      const parsedEvaluasi =
        typeof formData.form_evaluasi === "string"
          ? JSON.parse(formData.form_evaluasi)
          : formData.form_evaluasi;
      surveyCreator.JSON = parsedEvaluasi;
      // small delay to ensure onModified handlers won't treat this as user edit
      setTimeout(() => {
        isLoadingFormEvaluasiRef.current = false;
      }, 100);
    } catch (e) {
      isLoadingFormEvaluasiRef.current = false;
    }
  }, [surveyCreator, formData.form_evaluasi]);

  // Fetch pegawai and kegiatan data; use module cache/promise to avoid duplicate network calls
  useEffect(() => {
    let canceled = false;

    const initialize = async () => {
      let loadedPegawaiList = [];

      // Load pegawai FIRST: use cache/promise
      try {
        setLoadingPegawai(true);

        if (pegawaiCache) {
          loadedPegawaiList = pegawaiCache;
          if (!canceled) setPegawaiList(pegawaiCache);
        } else {
          if (!pegawaiPromise) {
            pegawaiPromise = getPegawai()
              .then((d) => {
                pegawaiCache = d;
                pegawaiPromise = null;
                return d;
              })
              .catch((err) => {
                pegawaiPromise = null;
                throw err;
              });
          }

          const data = await pegawaiPromise;
          loadedPegawaiList = data;
          if (!canceled) setPegawaiList(data);
        }
      } catch (err) {
        console.error("Failed to load pegawai:", err);
      } finally {
        if (!canceled) setLoadingPegawai(false);
      }

      // THEN load kegiatan data if edit mode (after pegawai is loaded)
      if (isEdit) {
        try {
          setLoadingData(true);

          // Use cache/promise to avoid duplicate fetches
          let raw;
          if (kegiatanCache[id]) {
            raw = kegiatanCache[id];
          } else {
            if (!kegiatanPromises[id]) {
              kegiatanPromises[id] = getKegiatanById(id)
                .then((result) => {
                  kegiatanCache[id] = result;
                  delete kegiatanPromises[id];
                  return result;
                })
                .catch((err) => {
                  delete kegiatanPromises[id];
                  throw err;
                });
            }
            raw = await kegiatanPromises[id];
          }

          if (canceled) return;
          // API may return { data: {...} } or the object directly
          const data = raw && raw.data ? raw.data : raw;

          // Determine narasumber type and values
          const narasumberType =
            data.asal_narasumber === "Eksternal" ? "eksternal" : "internal";
          let narasumberPegawaiId = "";
          let narasumberEksternal = "";

          if (narasumberType === "internal" && data.narasumber) {
            // Find pegawai by NIP using the just-loaded list
            const peg = loadedPegawaiList.find(
              (p) => p.nip === data.narasumber,
            );
            narasumberPegawaiId = peg ? peg.id : "";
          } else if (narasumberType === "eksternal") {
            narasumberEksternal = data.narasumber || "";
          }

          // Determine moderator type and values
          const moderatorType =
            data.asal_moderator === "Eksternal" ? "eksternal" : "internal";
          let moderatorPegawaiId = "";
          let moderatorEksternal = "";

          if (moderatorType === "internal" && data.moderator) {
            // Find pegawai by NIP using the just-loaded list
            const peg = loadedPegawaiList.find((p) => p.nip === data.moderator);
            moderatorPegawaiId = peg ? peg.id : "";
          } else if (moderatorType === "eksternal") {
            moderatorEksternal = data.moderator || "";
          }

          setFormData({
            banner: null,
            materi: null,
            virtual_background: null,
            jenis_kegiatan: data.jenis_kegiatan || "",
            nama_kegiatan: data.nama_kegiatan || "",
            judul: data.judul_tema || data.judul || "",
            deskripsi: data.deskripsi || "",
            narasumber_type: narasumberType,
            narasumber_pegawai_id: narasumberPegawaiId,
            narasumber_eksternal: narasumberEksternal,
            moderator_type: moderatorType,
            moderator_pegawai_id: moderatorPegawaiId,
            moderator_eksternal: moderatorEksternal,
            butuh_sertifikat: data.desain_sertifikat ? "1" : "0",
            tempat: data.tempat || "",
            tanggal: formatDateForInput(data.tanggal) || "",
            jam_mulai: formatTimeForInput(data.jam_mulai) || "",
            jam_selesai: formatTimeForInput(data.jam_selesai) || "",
            linktree: data.linktree || "",
            youtube: data.youtube || "",
            template_sertifikat: data.template_sertifikat || "",
            desain_sertifikat: data.desain_sertifikat || null,
            form_evaluasi: data.form_evaluasi || null,
          });
          if (data.banner) {
            setBannerPreview(getBannerUrl(data.banner));
            setExistingBannerPath(data.banner);
          }
          if (data.materi) {
            setMateriPreview(getBannerUrl(data.materi));
            setExistingMateriPath(data.materi);
          }
          if (data.virtual_background) {
            setVirtualBackgroundPreview(getBannerUrl(data.virtual_background));
            setExistingVirtualBackgroundPath(data.virtual_background);
          }
          if (data.desain_sertifikat) {
            try {
              const parsedDesign =
                typeof data.desain_sertifikat === "string"
                  ? JSON.parse(data.desain_sertifikat)
                  : data.desain_sertifikat;
              setCertificateDesign(parsedDesign);

              if (parsedDesign && parsedDesign.background) {
                setCertificateBackgroundUrl(parsedDesign.background);
              }
            } catch (e) {
              console.error("Failed to parse certificate design:", e);
            }
          }
        } catch (err) {
          if (!canceled) {
            // Try to extract validation/errors from response-like object
            const extract = (e) => {
              if (!e) return null;
              if (e.errors) return e.errors;
              if (e.response && e.response.data && e.response.data.errors)
                return e.response.data.errors;
              if (e.response && e.response.errors) return e.response.errors;
              return null;
            };

            const errors = extract(err);
            if (errors) {
              const items = Object.keys(errors)
                .map(
                  (k) =>
                    `<li><strong>${k}</strong>: ${errors[k].join(", ")}</li>`,
                )
                .join("");
              Swal.fire({
                icon: "error",
                title: "Gagal memuat data",
                html: `<ul style="text-align:left">${items}</ul>`,
              });
            } else {
              Swal.fire({
                icon: "error",
                title: "Gagal memuat data kegiatan",
                text: String(err.message || err),
              });
            }
          }
        } finally {
          if (!canceled) setLoadingData(false);
        }
      }
    };

    initialize();
    return () => {
      canceled = true;
    };
  }, [id, isEdit]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const getBannerUrl = (banner) => {
    if (!banner) return null;
    // If already a full URL, return as is
    if (banner.startsWith("http")) return banner;
    // Otherwise, prepend BE_URL
    return `${BE_URL}/storage/${banner}`;
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData((prev) => ({
        ...prev,
        banner: file,
      }));

      // Preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setBannerPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveBanner = async () => {
    // If editing and there's an existing banner on server, ask & delete
    if (isEdit && existingBannerPath) {
      const res = await Swal.fire({
        title: "Hapus banner dari server?",
        text: "Menghapus akan menghapus file banner di server. Lanjutkan?",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Hapus",
        cancelButtonText: "Batal",
        confirmButtonColor: "#d33",
        reverseButtons: true,
      });
      if (!res.isConfirmed) return;

      try {
        await deleteMediaFile(existingBannerPath);
        setExistingBannerPath(null);
        Swal.fire({
          icon: "success",
          title: "Terhapus",
          text: "Banner berhasil dihapus dari server.",
        });
      } catch (err) {
        Swal.fire({
          icon: "error",
          title: "Gagal",
          text: "Gagal menghapus banner di server.",
        });
        return;
      }
    }

    // Clear preview and local file value
    setBannerPreview("");
    setFormData((prev) => ({ ...prev, banner: null }));
  };

  const handleMateriChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData((prev) => ({
        ...prev,
        materi: file,
      }));

      // Preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setMateriPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveMateri = async () => {
    if (isEdit && existingMateriPath) {
      const res = await Swal.fire({
        title: "Hapus materi dari server?",
        text: "Menghapus akan menghapus file materi di server. Lanjutkan?",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Hapus",
        cancelButtonText: "Batal",
        confirmButtonColor: "#d33",
        reverseButtons: true,
      });
      if (!res.isConfirmed) return;

      try {
        await deleteMediaFile(existingMateriPath);
        setExistingMateriPath(null);
        Swal.fire({
          icon: "success",
          title: "Terhapus",
          text: "Materi berhasil dihapus dari server.",
        });
      } catch (err) {
        Swal.fire({
          icon: "error",
          title: "Gagal",
          text: "Gagal menghapus materi di server.",
        });
        return;
      }
    }

    setMateriPreview("");
    setFormData((prev) => ({ ...prev, materi: null }));
  };

  const handleVirtualBackgroundChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData((prev) => ({
        ...prev,
        virtual_background: file,
      }));

      // Preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setVirtualBackgroundPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveVirtualBackground = async () => {
    if (isEdit && existingVirtualBackgroundPath) {
      const res = await Swal.fire({
        title: "Hapus virtual background dari server?",
        text: "Menghapus akan menghapus file virtual background di server. Lanjutkan?",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Hapus",
        cancelButtonText: "Batal",
        confirmButtonColor: "#d33",
        reverseButtons: true,
      });
      if (!res.isConfirmed) return;

      try {
        await deleteMediaFile(existingVirtualBackgroundPath);
        setExistingVirtualBackgroundPath(null);
        Swal.fire({
          icon: "success",
          title: "Terhapus",
          text: "Virtual background berhasil dihapus dari server.",
        });
      } catch (err) {
        Swal.fire({
          icon: "error",
          title: "Gagal",
          text: "Gagal menghapus virtual background di server.",
        });
        return;
      }
    }

    setVirtualBackgroundPreview("");
    setFormData((prev) => ({ ...prev, virtual_background: null }));
  };

  const generateLinktreeSlug = () => {
    // Generate a random 15-character slug
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let slug = "";
    for (let i = 0; i < 15; i++) {
      slug += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData((prev) => ({ ...prev, linktree: slug }));
  };

  const handleCertificateDesignSave = (design) => {
    setCertificateDesign(design);
    setFormData((prev) => ({
      ...prev,
      desain_sertifikat: design,
    }));
  };

  const handleCertificateBackgroundChange = (path, url) => {
    setFormData((prev) => ({
      ...prev,
      template_sertifikat: path,
    }));
    setCertificateBackgroundUrl(url);
  };

  const generateDefaultEvaluationForm = () => {
    const narasumberName =
      formData.narasumber_type === "internal"
        ? pegawaiList.find((p) => p.id === formData.narasumber_pegawai_id)
            ?.name || "Narasumber"
        : formData.narasumber_eksternal || "Narasumber";

    const formattedDate = formData.tanggal
      ? new Date(formData.tanggal).toLocaleDateString("id-ID", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : "";

    const defaultTemplate = {
      title: `${formData.nama_kegiatan} "${formData.judul}"`,
      description: `${formattedDate}\n${formData.jam_mulai} - ${formData.jam_selesai} WIB\n\nNarasumber: ${narasumberName}`,
      logoPosition: "right",
      pages: [
        {
          name: "page1",
          elements: [
            {
              type: "text",
              name: "nama_lengkap",
              title: "Nama Lengkap (Untuk Sertifikat)",
              placeholder: "Masukkan nama lengkap Anda",
              isRequired: true,
            },
            {
              type: "text",
              name: "nip_no_absen",
              title: "NIP/No. Absen",
              readOnly: true,
            },
            {
              type: "dropdown",
              name: "status_pegawai",
              title: "Status Pegawai",
              isRequired: true,
              choices: ["PNS", "PPPK", "PPNPN", "CPNS"],
            },
            {
              type: "text",
              name: "jabatan",
              title: "Jabatan",
              isRequired: true,
            },
            {
              type: "text",
              name: "unit_kerja",
              title: "Unit Kerja",
              isRequired: true,
            },
          ],
        },
        {
          name: "page2",
          title: "Survey Kepuasan",
          elements: [
            {
              type: "rating",
              name: "kepuasan_informasi_pendaftaran",
              title: `Seberapa puas Anda dengan informasi pendaftaran ${formData.jenis_kegiatan} ini?`,
              isRequired: true,
              rateMax: 5,
              displayMode: "buttons",
              minRateDescription: "Sangat Tidak Puas",
              maxRateDescription: "Sangat Puas",
            },
            {
              type: "rating",
              name: "kenyamanan_tempat",
              title: `Sejauh mana kenyamanan tempat/lokasi ${formData.jenis_kegiatan} (fisik atau daring) mendukung proses pembelajaran Anda?`,
              isRequired: true,
              rateMax: 5,
              displayMode: "buttons",
              minRateDescription: "Sangat Tidak Mendukung",
              maxRateDescription: "Sangat Mendukung",
            },
            {
              type: "rating",
              name: "kelancaran_teknis",
              title: `Bagaimana penilaian Anda terhadap kelancaran teknis (jadwal, waktu, fasilitas, koneksi, dll.) ${formData.jenis_kegiatan}?`,
              isRequired: true,
              rateMax: 5,
              displayMode: "buttons",
              minRateDescription: "Sangat Tidak Lancar",
              maxRateDescription: "Sangat Lancar",
            },
            {
              type: "rating",
              name: "informasi_panitia",
              title: `Apakah panitia memberikan informasi yang jelas sebelum dan selama kegiatan ${formData.jenis_kegiatan}?`,
              isRequired: true,
              rateMax: 5,
              displayMode: "buttons",
              minRateDescription: "Sangat Tidak Jelas",
              maxRateDescription: "Sangat Jelas",
            },
            {
              type: "rating",
              name: "relevansi_materi",
              title: `Seberapa relevan materi yang disampaikan narasumber dengan tema ${formData.jenis_kegiatan}?`,
              isRequired: true,
              rateMax: 5,
              displayMode: "buttons",
              minRateDescription: "Sangat Tidak Relevan",
              maxRateDescription: "Sangat Relevan",
            },
            {
              type: "rating",
              name: "pemahaman_materi",
              title:
                "Bagaimana tingkat pemahaman Anda terhadap materi yang disampaikan oleh Narasumber?",
              isRequired: true,
              rateMax: 5,
              displayMode: "buttons",
              minRateDescription: "Sangat Sulit Dipahami",
              maxRateDescription: "Sangat Mudah Dipahami",
            },
            {
              type: "rating",
              name: "penyampaian_narasumber",
              title:
                "Sejauh mana Narasumber menyampaikan materi secara menarik dan interaktif?",
              isRequired: true,
              rateMax: 5,
              displayMode: "buttons",
              minRateDescription: "Sangat Tidak Menarik",
              maxRateDescription: "Sangat Menarik",
            },
            {
              type: "rating",
              name: "sesi_tanya_jawab",
              title: `Apakah ada sesi tanya jawab atau diskusi yang cukup selama ${formData.jenis_kegiatan}?`,
              isRequired: true,
              rateMax: 5,
              displayMode: "buttons",
              minRateDescription: "Tidak Ada",
              maxRateDescription: "Sangat Cukup",
            },
            {
              type: "rating",
              name: "manfaat_webinar",
              title: `Seberapa besar manfaat ${formData.jenis_kegiatan} ini terhadap penambahan pengetahuan atau keterampilan Anda?`,
              isRequired: true,
              rateMax: 5,
              displayMode: "buttons",
              minRateDescription: "Sangat Tidak Bermanfaat",
              maxRateDescription: "Sangat Bermanfaat",
            },
            {
              type: "rating",
              name: "penerapan_materi",
              title:
                "Apakah Anda dapat menerapkan materi yang didapat dalam pekerjaan/tugas Anda?",
              isRequired: true,
              rateMax: 5,
              displayMode: "buttons",
              minRateDescription: "Tidak Bisa",
              maxRateDescription: "Sangat Bisa",
            },
            {
              type: "rating",
              name: "inspirasi_motivasi",
              title: `Apakah ${formData.jenis_kegiatan} "${formData.nama_kegiatan
                .replace(/\b(seri|series)\b.*$/i, "")
                .trim()}" ini memberikan inspirasi atau motivasi baru bagi Anda?`,
              isRequired: true,
              rateMax: 5,
              displayMode: "buttons",
              minRateDescription: "Tidak Sama Sekali",
              maxRateDescription: "Sangat Inspiratif",
            },
            {
              type: "rating",
              name: "kesediaan_ikut_lagi",
              title: `Apakah Anda bersedia mengikuti kegiatan ${formData.jenis_kegiatan} "${formData.nama_kegiatan?.replace(/\b(seri|series)\b.*$/i, "").trim()}" selanjutnya?`,
              isRequired: true,
              rateMax: 5,
              displayMode: "buttons",
              minRateDescription: "Tidak Bersedia",
              maxRateDescription: "Sangat Bersedia",
            },
            {
              type: "text",
              name: "yang_disukai",
              title: `Apa yang paling Anda sukai dari kegiatan ${formData.jenis_kegiatan} ini?`,
              isRequired: true,
            },
            {
              type: "text",
              name: "saran_kritik",
              title: `Apa saran atau kritik Anda untuk perbaikan kegiatan ${formData.jenis_kegiatan} "${formData.nama_kegiatan?.replace(/\b(seri|series)\b.*$/i, "").trim()}" selanjutnya?`,
              isRequired: true,
            },
          ],
        },
      ],
    };

    return defaultTemplate;
  };

  const handleLoadDefaultForm = () => {
    if (surveyCreator) {
      const defaultForm = generateDefaultEvaluationForm();
      isLoadingFormEvaluasiRef.current = true;
      surveyCreator.JSON = defaultForm;
      setFormData((prev) => ({
        ...prev,
        form_evaluasi: defaultForm,
      }));
      setTimeout(() => {
        isLoadingFormEvaluasiRef.current = false;
      }, 100);
    }
  };

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    // If we're not on step 2, move to step 2 instead of submitting (prevents accidental submit)
    if (currentStep !== 2) {
      setCurrentStep(2);
      return;
    }

    // Ensure the latest certificate design is saved before submitting
    if (certificateDesign) {
      handleCertificateDesignSave(certificateDesign);
    }

    // Ensure the latest survey creator JSON is saved before submitting
    if (surveyCreator) {
      const surveyJSON = surveyCreator.JSON;
      setFormData((prev) => ({
        ...prev,
        form_evaluasi: surveyJSON,
      }));
    }

    setLoading(true);

    try {
      const formDataToSend = new FormData();

      // banner
      if (formData.banner) {
        formDataToSend.append("banner", formData.banner);
      }

      // materi
      if (formData.materi) {
        formDataToSend.append("materi", formData.materi);
      }

      // virtual_background
      if (formData.virtual_background) {
        formDataToSend.append(
          "virtual_background",
          formData.virtual_background,
        );
      }

      // Basic fields
      formDataToSend.append("jenis_kegiatan", formData.jenis_kegiatan || "");
      formDataToSend.append("nama_kegiatan", formData.nama_kegiatan || "");
      formDataToSend.append(
        "judul_tema",
        formData.judul || formData.judul_tema || "",
      );
      formDataToSend.append("deskripsi", formData.deskripsi || "");
      formDataToSend.append("tempat", formData.tempat || "");
      formDataToSend.append("tanggal", formData.tanggal || "");
      formDataToSend.append(
        "jam_mulai",
        formatTimeForInput(formData.jam_mulai) || "",
      );
      formDataToSend.append(
        "jam_selesai",
        formatTimeForInput(formData.jam_selesai) || "",
      );
      formDataToSend.append("linktree", formData.linktree || "");
      formDataToSend.append("youtube", formData.youtube || "");
      formDataToSend.append(
        "butuh_sertifikat",
        formData.butuh_sertifikat ? "1" : "0",
      );

      // Narasumber
      if (formData.narasumber_type === "internal") {
        // find selected pegawai by id and use NIP
        const peg = pegawaiList.find(
          (p) => p.id === formData.narasumber_pegawai_id,
        );
        const nip = peg ? peg.nip : formData.narasumber_pegawai_id || "";
        formDataToSend.append("narasumber", nip || "");
        formDataToSend.append("asal_narasumber", "Internal");
      } else {
        formDataToSend.append(
          "narasumber",
          formData.narasumber_eksternal || "",
        );
        formDataToSend.append("asal_narasumber", "Eksternal");
      }

      // Moderator
      if (formData.moderator_type === "internal") {
        const peg = pegawaiList.find(
          (p) => p.id === formData.moderator_pegawai_id,
        );
        const nip = peg ? peg.nip : formData.moderator_pegawai_id || "";
        formDataToSend.append("moderator", nip || "");
        formDataToSend.append("asal_moderator", "Internal");
      } else {
        formDataToSend.append("moderator", formData.moderator_eksternal || "");
        formDataToSend.append("asal_moderator", "Eksternal");
      }

      // Certificate template and design
      if (formData.butuh_sertifikat) {
        if (formData.template_sertifikat) {
          formDataToSend.append(
            "template_sertifikat",
            formData.template_sertifikat,
          );
        }
        if (formData.desain_sertifikat) {
          const designJson = JSON.stringify(formData.desain_sertifikat);
          formDataToSend.append("desain_sertifikat", designJson);
        }
      }

      // Form Evaluasi
      if (formData.form_evaluasi || (surveyCreator && surveyCreator.JSON)) {
        const evaluasiJSON = formData.form_evaluasi || surveyCreator.JSON;
        const evaluasiStr = JSON.stringify(evaluasiJSON);
        formDataToSend.append("form_evaluasi", evaluasiStr);
      }

      if (isEdit) {
        await updateKegiatan(id, formDataToSend);
      } else {
        await createKegiatan(formDataToSend);
      }

      // Show success message, then ensure the kegiatan list is reloaded
      await Swal.fire({
        icon: "success",
        title: isEdit ? "Perubahan disimpan" : "Data tersimpan",
        text: isEdit
          ? "Perubahan kegiatan berhasil disimpan."
          : "Kegiatan berhasil ditambahkan.",
        confirmButtonText: "OK",
      });

      // Navigate to kegiatan list and force a full reload to guarantee data refresh
      window.location.href = "/admin/dashboard";
    } catch (err) {
      // If backend returned validation errors in known shape, show them
      const extract = (e) => {
        if (!e) return null;
        if (e.errors) return e.errors;
        if (e.response && e.response.data && e.response.data.errors)
          return e.response.data.errors;
        if (e.response && e.response.errors) return e.response.errors;
        // If it's a fetch Response, try to parse JSON (best-effort)
        return null;
      };

      const errors = extract(err);
      if (errors) {
        const items = Object.keys(errors)
          .map((k) => `<li><strong>${k}</strong>: ${errors[k].join(", ")}</li>`)
          .join("");
        Swal.fire({
          icon: "error",
          title: "Validasi gagal",
          html: `<ul style="text-align:left">${items}</ul>`,
        });
      } else {
        // Fallback message
        Swal.fire({
          icon: "error",
          title: isEdit
            ? "Gagal mengupdate kegiatan"
            : "Gagal menambahkan kegiatan",
          text: String(err.message || err),
        });
      }
    } finally {
      setLoading(false);
    }
  };

  if (loadingData || loadingPegawai) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">
            {loadingPegawai
              ? "Memuat data pegawai..."
              : "Memuat data kegiatan..."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate("/admin/dashboard")}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
        >
          <FontAwesomeIcon icon={faArrowLeft} className="w-5 h-5" />
          Kembali
        </button>
        <h2 className="text-3xl font-bold text-gray-900">
          {isEdit ? "Edit Kegiatan" : "Tambah Kegiatan Baru"}
        </h2>
        <p className="text-gray-600 mt-1">
          {isEdit
            ? "Perbarui informasi kegiatan"
            : "Lengkapi form di bawah untuk menambahkan kegiatan baru"}
        </p>
      </div>

      {/* Step Indicator */}
      <div className="mb-6">
        <div className="flex items-center justify-center">
          <div className="flex items-center">
            {/* Step 1 */}
            <div className="flex items-center">
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-full font-semibold transition-all ${
                  currentStep === 1
                    ? "bg-blue-600 text-white"
                    : "bg-green-500 text-white"
                }`}
              >
                {currentStep > 1 ? (
                  <FontAwesomeIcon icon={faCheck} className="w-4 h-4" />
                ) : (
                  "1"
                )}
              </div>
              <div className="ml-2">
                <p
                  className={`text-sm font-semibold ${currentStep === 1 ? "text-blue-600" : "text-gray-900"}`}
                >
                  Form Utama
                </p>
                <p className="text-xs text-gray-500">Data Kegiatan</p>
              </div>
            </div>

            {/* Connector */}
            <div
              className={`w-24 h-1 mx-4 transition-all ${currentStep > 1 ? "bg-green-500" : "bg-gray-300"}`}
            ></div>

            {/* Step 2 */}
            <div className="flex items-center">
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-full font-semibold transition-all ${
                  currentStep === 2
                    ? "bg-blue-600 text-white"
                    : "bg-gray-300 text-gray-600"
                }`}
              >
                2
              </div>
              <div className="ml-2">
                <p
                  className={`text-sm font-semibold ${currentStep === 2 ? "text-blue-600" : "text-gray-600"}`}
                >
                  Form Evaluasi
                </p>
                <p className="text-xs text-gray-500">Buat Formulir</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
        {/* Step 1: Form Utama */}
        {currentStep === 1 && (
          <div className="p-6 space-y-6">
            {/* Error messages are shown via SweetAlert (Swal.fire) */}

            {/* Banner Upload */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Banner / Flayer Kegiatan
                <span className="text-xs text-gray-500 font-normal ml-2">
                  (Rasio 4:5 - Rekomendasi: 1080x1350px)
                </span>
              </label>
              <div className="flex flex-col gap-4">
                {bannerPreview && (
                  <div
                    className="relative w-full max-w-md mx-auto rounded-lg overflow-hidden border-2 border-gray-200"
                    style={{ aspectRatio: "4/5" }}
                  >
                    <img
                      src={bannerPreview}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveBanner}
                      className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-md"
                    >
                      <FontAwesomeIcon icon={faTimes} className="w-5 h-5" />
                    </button>
                  </div>
                )}
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className="flex flex-col items-center justify-center py-4">
                    <FontAwesomeIcon
                      icon={faCloudUploadAlt}
                      className="w-10 h-10 text-gray-400 mb-2"
                    />
                    <p className="text-sm text-gray-600">
                      <span className="font-semibold">Klik untuk upload</span>{" "}
                      atau drag & drop
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      PNG, JPG, JPEG (MAX. 2MB) | Rasio 4:5 | Rekomendasi: 1080x1350px
                    </p>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleFileChange}
                  />
                </label>
              </div>
            </div>

            {/* Materi Upload */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Materi Kegiatan
                <span className="text-xs text-gray-500 font-normal ml-2">
                  (Opsional)
                </span>
              </label>
              <div className="flex flex-col gap-4">
                {materiPreview && (
                  <div
                    className="relative w-full max-w-md mx-auto rounded-lg overflow-hidden border-2 border-gray-200"
                    style={{ aspectRatio: "4/5" }}
                  >
                    <img
                      src={materiPreview}
                      alt="Preview Materi"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveMateri}
                      className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-md"
                    >
                      <FontAwesomeIcon icon={faTimes} className="w-5 h-5" />
                    </button>
                  </div>
                )}
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className="flex flex-col items-center justify-center py-4">
                    <FontAwesomeIcon
                      icon={faCloudUploadAlt}
                      className="w-10 h-10 text-gray-400 mb-2"
                    />
                    <p className="text-sm text-gray-600">
                      <span className="font-semibold">Klik untuk upload</span>{" "}
                      atau drag & drop
                    </p>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleMateriChange}
                  />
                </label>
              </div>
            </div>

            {/* Virtual Background Upload */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Virtual Background
                <span className="text-xs text-gray-500 font-normal ml-2">
                  (Opsional - Rasio 16:9 -  Rekomendasi: 1280x720px)
                </span>
              </label>
              <div className="flex flex-col gap-4">
                {virtualBackgroundPreview && (
                  <div
                    className="relative w-full max-w-3xl mx-auto rounded-lg overflow-hidden border-2 border-gray-200"
                    style={{ aspectRatio: "16/9" }}
                  >
                    <img
                      src={virtualBackgroundPreview}
                      alt="Preview Virtual Background"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveVirtualBackground}
                      className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-md"
                    >
                      <FontAwesomeIcon icon={faTimes} className="w-5 h-5" />
                    </button>
                  </div>
                )}
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className="flex flex-col items-center justify-center py-4">
                    <FontAwesomeIcon
                      icon={faCloudUploadAlt}
                      className="w-10 h-10 text-gray-400 mb-2"
                    />
                    <p className="text-sm text-gray-600">
                      <span className="font-semibold">Klik untuk upload</span>{" "}
                      atau drag & drop
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      PNG, JPG, JPEG (MAX. 2MB) | Rasio 16:9 | Rekomendasi 1280x720px
                    </p>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleVirtualBackgroundChange}
                  />
                </label>
              </div>
            </div>

            {/* Jenis Kegiatan */}
            <div>
              <label
                htmlFor="jenis_kegiatan"
                className="block text-sm font-semibold text-gray-700 mb-2"
              >
                Jenis Kegiatan <span className="text-red-500">*</span>
              </label>
              <SearchableSelect
                name="jenis_kegiatan"
                value={formData.jenis_kegiatan}
                onChange={handleChange}
                required
                options={[
                  { value: "Webinar", label: "Webinar", name: "Webinar" },
                  {
                    value: "Sharing Session",
                    label: "Sharing Session",
                    name: "Sharing Session",
                  },
                  {
                    value: "Knowledge Sharing",
                    label: "Knowledge Sharing",
                    name: "Knowledge Sharing",
                  },
                  {
                    value: "Sosialisasi",
                    label: "Sosialisasi",
                    name: "Sosialisasi",
                  },
                  { value: "Rapat", label: "Rapat", name: "Rapat" },
                ]}
                placeholder="-- Pilih Jenis Kegiatan --"
              />
            </div>

            {/* Nama Kegiatan */}
            <div>
              <label
                htmlFor="nama_kegiatan"
                className="block text-sm font-semibold text-gray-700 mb-2"
              >
                Nama Kegiatan <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="nama_kegiatan"
                name="nama_kegiatan"
                value={formData.nama_kegiatan}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                placeholder="Contoh: Workshop Manajemen Proyek"
                required
              />
            </div>

            {/* Judul/Tema */}
            <div>
              <label
                htmlFor="judul"
                className="block text-sm font-semibold text-gray-700 mb-2"
              >
                Judul / Tema Kegiatan <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="judul"
                name="judul"
                value={formData.judul}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                placeholder="Contoh: Meningkatkan Produktivitas Tim"
                required
              />
            </div>

            {/* Tempat */}
            <div className="border-t border-gray-200">
              <label
                htmlFor="tempat"
                className="block text-sm font-semibold text-gray-700 mb-2"
              >
                Tempat <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="tempat"
                name="tempat"
                value={formData.tempat}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                placeholder="Contoh: Ruang Serbaguna Gedung A Lt. 3"
                required
              />
            </div>

            {/* YouTube Link */}
            <div>
              <label
                htmlFor="youtube"
                className="block text-sm font-semibold text-gray-700 mb-2"
              >
                Link YouTube
                <span className="text-xs text-gray-500 font-normal ml-2">
                  (Opsional)
                </span>
              </label>
              <input
                type="text"
                id="youtube"
                name="youtube"
                value={formData.youtube}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                placeholder="https://www.youtube.com/watch?v=..."
              />
            </div>
            {/* Linktree */}
            <div>
              <label
                htmlFor="linktree"
                className="block text-sm font-semibold text-gray-700 mb-2"
              >
                Linktree Slug
                <span className="text-xs text-gray-500 font-normal ml-2">
                  (Opsional - Max. 15 karakter)
                </span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  id="linktree"
                  name="linktree"
                  value={formData.linktree}
                  onChange={handleChange}
                  maxLength={15}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  placeholder="contoh: webinar2024a"
                />
                <button
                  type="button"
                  onClick={generateLinktreeSlug}
                  className="px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg flex items-center gap-2"
                  title="Generate slug otomatis"
                >
                  <FontAwesomeIcon icon={faSync} className="w-4 h-4" />
                  Generate
                </button>
              </div>
              {formData.linktree && (
                <p className="text-xs text-gray-500 mt-1">
                  Slug:{" "}
                  <span className="font-mono text-blue-600">
                    {formData.linktree}
                  </span>
                </p>
              )}
            </div>

            {/* Waktu Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Tanggal */}
              <div>
                <label
                  htmlFor="tanggal"
                  className="block text-sm font-semibold text-gray-700 mb-2"
                >
                  Tanggal <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  id="tanggal"
                  name="tanggal"
                  value={formData.tanggal}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  required
                />
              </div>

              {/* Jam Mulai */}
              <div>
                <label
                  htmlFor="jam_mulai"
                  className="block text-sm font-semibold text-gray-700 mb-2"
                >
                  Jam Mulai (WIB) <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  id="jam_mulai"
                  name="jam_mulai"
                  value={formData.jam_mulai}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  required
                />
              </div>

              {/* Jam Selesai */}
              <div>
                <label
                  htmlFor="jam_selesai"
                  className="block text-sm font-semibold text-gray-700 mb-2"
                >
                  Jam Selesai (WIB) <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  id="jam_selesai"
                  name="jam_selesai"
                  value={formData.jam_selesai}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  required
                />
              </div>
            </div>

            {/* Deskripsi */}
            <div>
              <label
                htmlFor="deskripsi"
                className="block text-sm font-semibold text-gray-700 mb-2"
              >
                Deskripsi
              </label>
              <textarea
                id="deskripsi"
                name="deskripsi"
                value={formData.deskripsi}
                onChange={handleChange}
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none"
                placeholder="Jelaskan detail kegiatan..."
              />
            </div>

            {/* Narasumber Section */}
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Narasumber
              </h3>

              {/* Narasumber Type */}
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Tipe Narasumber <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="narasumber_type"
                      value="internal"
                      checked={formData.narasumber_type === "internal"}
                      onChange={handleChange}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <span className="text-sm text-gray-700">
                      Internal (Pegawai)
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="narasumber_type"
                      value="eksternal"
                      checked={formData.narasumber_type === "eksternal"}
                      onChange={handleChange}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <span className="text-sm text-gray-700">Eksternal</span>
                  </label>
                </div>
              </div>

              {/* Narasumber Input */}
              {formData.narasumber_type === "internal" ? (
                <div>
                  <label
                    htmlFor="narasumber_pegawai_id"
                    className="block text-sm font-semibold text-gray-700 mb-2"
                  >
                    Pilih Pegawai <span className="text-red-500">*</span>
                  </label>
                  <SearchableSelect
                    name="narasumber_pegawai_id"
                    value={formData.narasumber_pegawai_id}
                    onChange={handleChange}
                    options={pegawaiList.map((p) => ({
                      value: p.id,
                      label: `${p.name} - ${p.jabatan_name}`,
                      name: p.name,
                      subtitle: p.jabatan_name,
                    }))}
                    placeholder={
                      loadingPegawai
                        ? "Memuat data pegawai..."
                        : "-- Pilih Pegawai --"
                    }
                    disabled={loadingPegawai}
                    required={formData.narasumber_type === "internal"}
                  />
                </div>
              ) : (
                <div>
                  <label
                    htmlFor="narasumber_eksternal"
                    className="block text-sm font-semibold text-gray-700 mb-2"
                  >
                    Nama Narasumber <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="narasumber_eksternal"
                    name="narasumber_eksternal"
                    value={formData.narasumber_eksternal}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    placeholder="Nama lengkap narasumber"
                    required={formData.narasumber_type === "eksternal"}
                  />
                </div>
              )}
            </div>

            {/* Moderator Section */}
            <div className="border-t border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Moderator
              </h3>

              {/* Moderator Type */}
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Tipe Moderator
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="moderator_type"
                      value="internal"
                      checked={formData.moderator_type === "internal"}
                      onChange={handleChange}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <span className="text-sm text-gray-700">
                      Internal (Pegawai)
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="moderator_type"
                      value="eksternal"
                      checked={formData.moderator_type === "eksternal"}
                      onChange={handleChange}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <span className="text-sm text-gray-700">Eksternal</span>
                  </label>
                </div>
              </div>

              {/* Moderator Input */}
              {formData.moderator_type === "internal" ? (
                <div>
                  <label
                    htmlFor="moderator_pegawai_id"
                    className="block text-sm font-semibold text-gray-700 mb-2"
                  >
                    Pilih Pegawai
                  </label>
                  <SearchableSelect
                    name="moderator_pegawai_id"
                    value={formData.moderator_pegawai_id}
                    onChange={handleChange}
                    options={pegawaiList.map((p) => ({
                      value: p.id,
                      label: `${p.name} - ${p.jabatan_name}`,
                      name: p.name,
                      subtitle: p.jabatan_name,
                    }))}
                    placeholder={
                      loadingPegawai
                        ? "Memuat data pegawai..."
                        : "-- Pilih Pegawai --"
                    }
                    disabled={loadingPegawai}
                  />
                </div>
              ) : (
                <div>
                  <label
                    htmlFor="moderator_eksternal"
                    className="block text-sm font-semibold text-gray-700 mb-2"
                  >
                    Nama Moderator
                  </label>
                  <input
                    type="text"
                    id="moderator_eksternal"
                    name="moderator_eksternal"
                    value={formData.moderator_eksternal}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    placeholder="Nama lengkap moderator"
                  />
                </div>
              )}
            </div>

            {/* Certificate Editor Section */}
            <div className="border-t border-gray-200 pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Template Sertifikat
                </h3>
                <label className="flex items-center gap-2 cursor-pointer">
                  <span className="text-sm font-medium text-gray-700">
                    Butuh Sertifikat
                  </span>
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={formData.butuh_sertifikat}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          butuh_sertifikat: e.target.checked,
                        }))
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </div>
                </label>
              </div>
              {formData.butuh_sertifikat && (
                <CertificateEditor
                  key={
                    certificateDesign
                      ? JSON.stringify(certificateDesign).substring(0, 50)
                      : "default"
                  }
                  initialDesign={certificateDesign}
                  backgroundUrl={certificateBackgroundUrl}
                  onSave={handleCertificateDesignSave}
                  onBackgroundChange={handleCertificateBackgroundChange}
                  kegiatanData={{
                    nama_kegiatan: formData.nama_kegiatan,
                    judul: formData.judul,
                    tanggal: formData.tanggal,
                    tempat: formData.tempat,
                  }}
                />
              )}
              {!formData.butuh_sertifikat && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center text-gray-500">
                  Sertifikat tidak diperlukan untuk kegiatan ini
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 2: Form Evaluasi */}
        {currentStep === 2 && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Buat Form Evaluasi Kegiatan
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Gunakan editor di bawah ini untuk membuat formulir evaluasi.
                  Formulir akan otomatis tersimpan saat Anda membuat perubahan.
                </p>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleLoadDefaultForm();
                }}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <FontAwesomeIcon icon={faFileAlt} className="w-4 h-4" />
                Gunakan Default Form
              </button>
            </div>
            <div
              className="border border-gray-200 rounded-lg overflow-hidden"
              style={{ minHeight: "600px" }}
            >
              {surveyCreator && (
                <SurveyCreatorComponent creator={surveyCreator} />
              )}
            </div>
          </div>
        )}

        {/* Form Actions */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex gap-3 justify-end">
          {currentStep === 1 ? (
            <>
              <button
                type="button"
                onClick={() => navigate("/admin/dashboard")}
                className="px-6 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-100 transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setCurrentStep(2);
                }}
                className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-md hover:shadow-lg flex items-center gap-2"
              >
                Selanjutnya
                <FontAwesomeIcon icon={faArrowRight} className="w-5 h-5" />
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setCurrentStep(1);
                }}
                className="px-6 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-100 transition-colors flex items-center gap-2"
              >
                <FontAwesomeIcon icon={faArrowLeft} className="w-5 h-5" />
                Sebelumnya
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSubmit(e);
                }}
                disabled={loading}
                className="px-6 py-2.5 bg-gradient-to-r from-teal-600 to-cyan-600 text-white font-semibold rounded-lg hover:from-teal-700 hover:to-cyan-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <FontAwesomeIcon
                      icon={faSpinner}
                      spin
                      className="h-5 w-5"
                    />
                    {isEdit ? "Menyimpan..." : "Menambahkan..."}
                  </>
                ) : (
                  <>
                    <FontAwesomeIcon icon={faCheckCircle} className="w-5 h-5" />
                    {isEdit ? "Simpan Perubahan" : "Tambah Kegiatan"}
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
