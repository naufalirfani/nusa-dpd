import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  createKegiatan,
  updateKegiatan,
  getKegiatanById,
  getPegawai,
  deleteMediaFile,
  uploadMedia,
  getMediaFiles,
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
  faFilePowerpoint,
  faPencilAlt,
  faExternalLinkAlt,
  faFolder,
  faEye,
  faEyeSlash,
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

function getFileNameFromPath(value) {
  if (!value || typeof value !== "string") return "";
  return value.split("/").pop() || value;
}

function getMateriPreviewType(fileName, mimeType) {
  const lowerName = String(fileName || "").toLowerCase();
  const lowerMime = String(mimeType || "").toLowerCase();

  if (
    lowerMime.startsWith("image/") ||
    /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(lowerName)
  ) {
    return "image";
  }

  if (lowerMime === "application/pdf" || /\.pdf$/i.test(lowerName)) {
    return "pdf";
  }

  return "file";
}
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
  const [materiPreviewType, setMateriPreviewType] = useState("");
  const [materiPreviewName, setMateriPreviewName] = useState("");
  const [virtualBackgroundPreview, setVirtualBackgroundPreview] = useState("");
  const [certificateDesign, setCertificateDesign] = useState(null);
  const [certificateBackgroundUrl, setCertificateBackgroundUrl] =
    useState(null);
  const [existingBannerPath, setExistingBannerPath] = useState(null);
  const [existingMateriPath, setExistingMateriPath] = useState(null);
  const [existingVirtualBackgroundPath, setExistingVirtualBackgroundPath] =
    useState(null);

  // Template sertifikat tab state
  const [sertifikatTab, setSertifikatTab] = useState("gunakan"); // "buat" | "gunakan"
  const [pptxFile, setPptxFile] = useState(null); // File object, uploaded on submit
  const [existingPptxPath, setExistingPptxPath] = useState(null); // path already on server
  const [availablePptxTemplates, setAvailablePptxTemplates] = useState([]);
  const [showPptxPreview, setShowPptxPreview] = useState(false);
  const [showDefaultTemplatePreview, setShowDefaultTemplatePreview] =
    useState(false);
  const [pptxDefaultSelected, setPptxDefaultSelected] = useState(false); // default template selected by ref
  const [loadingAvailableTemplates, setLoadingAvailableTemplates] =
    useState(false);

  // Survey Creator instance for Form Evaluasi
  const [surveyCreator, setSurveyCreator] = useState(null);
  const autoSaveTimerRef = useRef(null);
  const isLoadingFormEvaluasiRef = useRef(false);
  const materiPreviewObjectUrlRef = useRef(null);

  const clearMateriPreviewObjectUrl = () => {
    if (materiPreviewObjectUrlRef.current) {
      URL.revokeObjectURL(materiPreviewObjectUrlRef.current);
      materiPreviewObjectUrlRef.current = null;
    }
  };

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

  useEffect(() => {
    return () => {
      clearMateriPreviewObjectUrl();
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
            setMateriPreviewName(getFileNameFromPath(data.materi));
            setMateriPreviewType(getMateriPreviewType(data.materi));
            setExistingMateriPath(data.materi);
          }
          if (data.virtual_background) {
            setVirtualBackgroundPreview(getBannerUrl(data.virtual_background));
            setExistingVirtualBackgroundPath(data.virtual_background);
          }
          // Detect template type: if it's a .pptx path, switch to "gunakan" tab
          if (
            data.template_sertifikat &&
            data.template_sertifikat.toLowerCase().endsWith(".pptx")
          ) {
            setSertifikatTab("gunakan");
            setExistingPptxPath(data.template_sertifikat);
          } else if (data.template_sertifikat) {
            setSertifikatTab("buat");
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
                confirmButtonColor: "#3085d6",
              });
            } else {
              Swal.fire({
                icon: "error",
                title: "Gagal memuat data kegiatan",
                text: String(err.message || err),
                confirmButtonColor: "#3085d6",
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
        cancelButtonColor: "#6c757d",
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
          confirmButtonColor: "#3085d6",
        });
      } catch (err) {
        Swal.fire({
          icon: "error",
          title: "Gagal",
          text: "Gagal menghapus banner di server.",
          confirmButtonColor: "#3085d6",
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
      clearMateriPreviewObjectUrl();

      setFormData((prev) => ({
        ...prev,
        materi: file,
      }));

      setMateriPreviewName(file.name);
      setMateriPreviewType(getMateriPreviewType(file.name, file.type));

      const objectUrl = URL.createObjectURL(file);
      materiPreviewObjectUrlRef.current = objectUrl;
      setMateriPreview(objectUrl);
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
        cancelButtonColor: "#6c757d",
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
          confirmButtonColor: "#3085d6",
        });
      } catch (err) {
        Swal.fire({
          icon: "error",
          title: "Gagal",
          text: "Gagal menghapus materi di server.",
          confirmButtonColor: "#3085d6",
        });
        return;
      }
    }

    clearMateriPreviewObjectUrl();
    setMateriPreview("");
    setMateriPreviewType("");
    setMateriPreviewName("");
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
        cancelButtonColor: "#6c757d",
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
          confirmButtonColor: "#3085d6",
        });
      } catch (err) {
        Swal.fire({
          icon: "error",
          title: "Gagal",
          text: "Gagal menghapus virtual background di server.",
          confirmButtonColor: "#3085d6",
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

  // Fetch available PPTX templates from server when "gunakan" tab is active
  useEffect(() => {
    if (sertifikatTab !== "gunakan") return;
    let canceled = false;
    const fetchTemplates = async () => {
      setLoadingAvailableTemplates(true);
      try {
        const res = await getMediaFiles("kegiatan/template_sertifikat");
        const files = (res.data || res || []).filter((f) =>
          (f.path || f.name || "").toLowerCase().endsWith(".pptx"),
        );
        if (!canceled) setAvailablePptxTemplates(files);
      } catch (err) {
        if (!canceled) setAvailablePptxTemplates([]);
      } finally {
        if (!canceled) setLoadingAvailableTemplates(false);
      }
    };
    fetchTemplates();
    return () => {
      canceled = true;
    };
  }, [sertifikatTab]);

  // Store selected .pptx file locally; actual upload happens on submit
  const handlePptxTemplateUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".pptx")) {
      Swal.fire({
        icon: "error",
        title: "Format tidak didukung",
        text: "Hanya file .pptx yang diizinkan sebagai template sertifikat.",
        confirmButtonColor: "#3085d6",
      });
      e.target.value = "";
      return;
    }

    setPptxFile(file);
    // Clear any previously-selected server path; will be replaced on submit
    setExistingPptxPath(null);
    setPptxDefaultSelected(false);
    setFormData((prev) => ({  
      ...prev,
      template_sertifikat: "",
      desain_sertifikat: null,
    }));
    e.target.value = "";
  };

  // Select a previously uploaded template from the list
  const handleSelectExistingPptxTemplate = (template) => {
    const path = template.path || template.name || "";
    setPptxFile(null); // clear any locally-staged file
    setExistingPptxPath(path);
    setPptxDefaultSelected(false);
    setFormData((prev) => ({  
      ...prev,
      template_sertifikat: path,
      desain_sertifikat: null,
    }));
    Swal.fire({
      icon: "success",
      title: "Template dipilih",
      text: `Template "${template.original_name || template.name || path}" berhasil dipilih.`,
      timer: 1800,
      showConfirmButton: false,
    });
  };

  // Remove the currently selected PPTX template
  const handleRemovePptxTemplate = () => {
    setPptxFile(null);
    setExistingPptxPath(null);
    setPptxDefaultSelected(false);
    setFormData((prev) => ({ ...prev, template_sertifikat: "" }));
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
              description: "Silakan disesuaikan apabila data belum benar",
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
              description: "Silakan disesuaikan apabila data belum benar",
              isRequired: true,
              choices: ["PNS", "PPPK", "PPNPN", "CPNS", "Magang", "Lainnya"],
            },
            {
              type: "text",
              name: "jabatan",
              title: "Jabatan",
              description: "Silakan disesuaikan apabila data belum benar",
              isRequired: true,
            },
            {
              type: "text",
              name: "unit_kerja",
              title: "Unit Kerja",
              description: "Silakan disesuaikan apabila data belum benar",
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
        if (sertifikatTab === "gunakan") {
          if (pptxFile) {
            // New file selected locally — send directly as multipart file
            formDataToSend.append("template_sertifikat", pptxFile);
          } else if (pptxDefaultSelected) {
            // Default system template — send path as-is (no /storage/ prefix) and flag BE to skip re-upload
            formDataToSend.append("template_sertifikat", "template_sertifikat.pptx");
            formDataToSend.append("useExistingTemplate", "1");
          } else if (existingPptxPath) {
            // Previously uploaded template — send path as-is and flag BE to skip re-upload
            formDataToSend.append("template_sertifikat", existingPptxPath);
            formDataToSend.append("useExistingTemplate", "1");
          }
        } else {
          // "buat" tab: send only the design JSON; template_sertifikat background
          // was already uploaded by CertificateEditor and is referenced inside desain_sertifikat
          if (formData.desain_sertifikat) {
            const designJson = JSON.stringify(formData.desain_sertifikat);
            formDataToSend.append("desain_sertifikat", designJson);
          }
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
        confirmButtonColor: "#3085d6",
      });

      // Navigate to kegiatan list and force a full reload to guarantee data refresh
      window.location.href = "/admin";
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
          confirmButtonColor: "#3085d6",
        });
      } else {
        // Fallback message
        Swal.fire({
          icon: "error",
          title: isEdit
            ? "Gagal mengupdate kegiatan"
            : "Gagal menambahkan kegiatan",
          text: String(err.message || err),
          confirmButtonColor: "#3085d6",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  if (loadingData || loadingPegawai) {
    return (
      <div className="p-6 w-full">
        <div className="flex items-start gap-4">
          <div className="flex-1 flex items-center justify-center">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-500 border-t-transparent"></div>
              <p className="text-gray-600 dark:text-gray-300">
                {loadingPegawai
                  ? "Memuat pegawai..."
                  : "Memuat kegiatan..."}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate("/admin")}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-teal-600 transition-colors mb-5"
        >
          <FontAwesomeIcon icon={faArrowLeft} className="w-3.5 h-3.5" />
          Kembali
        </button>

        <div className="border-l-4 border-teal-500 pl-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            {isEdit ? "Ubah Kegiatan" : "Tambah Kegiatan Baru"}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {isEdit
              ? "Perbarui informasi dan pengaturan kegiatan"
              : "Lengkapi form di bawah untuk menambahkan kegiatan baru"}
          </p>
        </div>
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
                    : "bg-teal-500 text-white"
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
              className={`w-24 h-1 mx-4 transition-all ${currentStep > 1 ? "bg-teal-500" : "bg-gray-300"}`}
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
                      PNG, JPG, JPEG (MAX. 2MB) | Rasio 4:5 | Rekomendasi:
                      1080x1350px
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
                  materiPreviewType === "image" ? (
                    <div
                      className="relative w-full max-w-md mx-auto rounded-lg overflow-hidden border-2 border-gray-200"
                      style={{ aspectRatio: "4/5" }}
                    >
                      <img
                        src={materiPreview}
                        alt={materiPreviewName || "Preview Materi"}
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
                  ) : materiPreviewType === "pdf" ? (
                    <div className="relative w-full rounded-lg overflow-hidden border-2 border-gray-200 bg-gray-50">
                      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-200 bg-white">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-800 truncate">
                            {materiPreviewName || "Materi PDF"}
                          </p>
                          <p className="text-xs text-gray-500">Pratinjau PDF</p>
                        </div>
                        <button
                          type="button"
                          onClick={handleRemoveMateri}
                          className="flex-shrink-0 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-md"
                        >
                          <FontAwesomeIcon icon={faTimes} className="w-4 h-4" />
                        </button>
                      </div>
                      <iframe
                        src={materiPreview}
                        className="w-full"
                        style={{ minHeight: "520px" }}
                        title={materiPreviewName || "Preview Materi PDF"}
                      />
                    </div>
                  ) : (
                    <div className="relative w-full rounded-lg overflow-hidden border-2 border-gray-200 bg-gray-50">
                      <div className="flex items-start justify-between gap-3 p-4">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="flex-shrink-0 w-11 h-11 rounded-lg bg-blue-100 flex items-center justify-center">
                            <FontAwesomeIcon
                              icon={faFileAlt}
                              className="w-5 h-5 text-blue-600"
                            />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-800 truncate">
                              {materiPreviewName || "Materi file"}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              Pratinjau tidak tersedia untuk tipe file ini.
                            </p>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <a
                                href={materiPreview}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-lg transition-colors"
                              >
                                <FontAwesomeIcon icon={faEye} className="w-3 h-3" />
                                Buka
                              </a>
                              <a
                                href={materiPreview}
                                download={materiPreviewName || true}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                              >
                                <FontAwesomeIcon icon={faFileAlt} className="w-3 h-3" />
                                Unduh
                              </a>
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleRemoveMateri}
                          className="flex-shrink-0 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-md"
                        >
                          <FontAwesomeIcon icon={faTimes} className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )
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
                  (Opsional - Rasio 16:9 - Rekomendasi: 1280x720px)
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
                      PNG, JPG, JPEG (MAX. 2MB) | Rasio 16:9 | Rekomendasi
                      1280x720px
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
                        ? "Memuat pegawai..."
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
                        ? "Memuat pegawai..."
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
                <>
                  {/* Tab Switcher */}
                  <div className="flex border-b border-gray-200 mb-5">
                    <button
                      type="button"
                      onClick={() => setSertifikatTab("gunakan")}
                      className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                        sertifikatTab === "gunakan"
                          ? "border-blue-600 text-blue-600"
                          : "border-transparent text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      <FontAwesomeIcon
                        icon={faFilePowerpoint}
                        className="w-4 h-4"
                      />
                      Gunakan Template
                    </button>
                    <button
                      type="button"
                      onClick={() => setSertifikatTab("buat")}
                      className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                        sertifikatTab === "buat"
                          ? "border-blue-600 text-blue-600"
                          : "border-transparent text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      <FontAwesomeIcon icon={faPencilAlt} className="w-4 h-4" />
                      Buat Template
                    </button>
                  </div>

                  {/* Tab: Gunakan Template (.pptx) */}
                  {sertifikatTab === "gunakan" && (
                    <div className="space-y-5">
                      {/* Variable info */}
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <p className="text-xs font-semibold text-blue-800 mb-2">
                          Variabel yang tersedia untuk template PPTX:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {[
                            "{{nomor_sertifikat}}",
                            "{{nama}}",
                            "{{peran}}",
                            "{{nama_kegiatan}}",
                            "{{judul_kegiatan}}",
                            "{{tanggal}}",
                            "{{tte}}",
                          ].map((v) => (
                            <span
                              key={v}
                              className="inline-block px-2 py-0.5 bg-white border border-blue-300 rounded font-mono text-xs text-blue-700 select-all"
                            >
                              {v}
                            </span>
                          ))}
                        </div>
                        <p className="text-xs text-blue-600 mt-2">
                          Letakkan variabel di dalam teks pada slide PowerPoint.
                          Sistem akan mengganti variabel dengan data kegiatan
                          secara otomatis saat sertifikat dibuat.
                        </p>
                      </div>

                      {/* Default Template */}
                      <div className="border border-purple-200 bg-purple-50 rounded-lg p-4">
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="flex-shrink-0 w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                              <FontAwesomeIcon
                                icon={faFilePowerpoint}
                                className="w-5 h-5 text-purple-600"
                              />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold uppercase tracking-wide text-purple-700 mb-0.5">
                                Template Default
                              </p>
                              <p className="text-sm font-medium text-gray-800">
                                template_sertifikat.pptx
                              </p>
                              <p className="text-xs text-gray-400 mt-0.5">
                                Template bawaan sistem
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <button
                              type="button"
                              onClick={() =>
                                setShowDefaultTemplatePreview((v) => !v)
                              }
                              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                                showDefaultTemplatePreview
                                  ? "text-indigo-700 bg-indigo-100 hover:bg-indigo-200"
                                  : "text-indigo-600 bg-indigo-50 hover:bg-indigo-100"
                              }`}
                              title={showDefaultTemplatePreview ? "Sembunyikan preview" : "Lihat preview"}
                            >
                              <FontAwesomeIcon
                                icon={showDefaultTemplatePreview ? faEyeSlash : faEye}
                                className="w-3 h-3"
                              />
                              {showDefaultTemplatePreview ? "Sembunyikan" : "Preview"}
                            </button>
                            <a
                              href={`${BE_URL}/template_sertifikat.pptx`}
                              download
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-lg transition-colors"
                              title="Unduh template default"
                            >
                              <FontAwesomeIcon
                                icon={faExternalLinkAlt}
                                className="w-3 h-3"
                              />
                              Unduh
                            </a>
                            <button
                              type="button"
                              onClick={() => {
                                setPptxFile(null);
                                setExistingPptxPath(null);
                                setPptxDefaultSelected(true);
                                setShowPptxPreview(false);
                              }}
                              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                                pptxDefaultSelected
                                  ? "text-teal-700 bg-teal-100 hover:bg-teal-200"
                                  : "text-purple-700 bg-purple-100 hover:bg-purple-200"
                              }`}
                              title="Gunakan template default ini"
                            >
                              <FontAwesomeIcon
                                icon={pptxDefaultSelected ? faCheckCircle : faCheck}
                                className="w-3 h-3"
                              />
                              {pptxDefaultSelected ? "Terpilih" : "Gunakan"}
                            </button>
                          </div>
                        </div>
                        {showDefaultTemplatePreview && (
                          <div className="mt-3 border border-indigo-200 rounded-lg overflow-hidden bg-gray-100">
                            <div className="flex items-center justify-between px-3 py-2 bg-indigo-50 border-b border-indigo-200">
                              <span className="text-xs font-semibold text-indigo-700">
                                Preview — template_sertifikat.pptx
                              </span>
                              <span className="text-xs text-indigo-500">
                                Ditenagai oleh Microsoft Office Online
                              </span>
                            </div>
                            <iframe
                              src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(`${BE_URL}/template_sertifikat.pptx`)}`}
                              className="w-full"
                              style={{ height: "480px" }}
                              title="Preview Template Default PPTX"
                              allowFullScreen
                            />
                          </div>
                        )}
                      </div>

                      {/* Upload area */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Upload Template (.pptx)
                        </label>
                        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors border-gray-300 bg-gray-50 hover:bg-gray-100">
                          <div className="flex flex-col items-center justify-center py-4">
                            <FontAwesomeIcon
                              icon={faCloudUploadAlt}
                              className="w-10 h-10 text-gray-400 mb-2"
                            />
                            <p className="text-sm text-gray-600">
                              <span className="font-semibold">
                                Klik untuk upload
                              </span>{" "}
                              atau drag & drop
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              Hanya file .pptx | File akan diupload saat
                              menyimpan kegiatan
                            </p>
                          </div>
                          <input
                            type="file"
                            className="hidden"
                            accept=".pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                            onChange={handlePptxTemplateUpload}
                          />
                        </label>
                      </div>

                      {/* Currently selected / staged template */}
                      {(pptxFile || existingPptxPath || pptxDefaultSelected) && (
                        <div
                          className={`border rounded-lg p-4 ${
                            pptxFile
                              ? "border-yellow-300 bg-yellow-50"
                              : pptxDefaultSelected
                              ? "border-teal-300 bg-teal-50"
                              : "border-teal-200 bg-teal-50"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="flex-shrink-0 w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                                <FontAwesomeIcon
                                  icon={faFilePowerpoint}
                                  className="w-5 h-5 text-orange-600"
                                />
                              </div>
                              <div className="min-w-0">
                                <p
                                  className={`text-xs font-semibold uppercase tracking-wide mb-0.5 ${
                                    pptxFile
                                      ? "text-yellow-600"
                                      : pptxDefaultSelected
                                      ? "text-teal-600"
                                      : "text-teal-600"
                                  }`}
                                >
                                  {pptxFile
                                    ? "Siap diupload saat simpan"
                                    : pptxDefaultSelected
                                    ? "Template Default Terpilih"
                                    : "Template Terpilih"}
                                </p>
                                <p className="text-sm font-medium text-gray-800 truncate">
                                  {pptxFile
                                    ? pptxFile.name
                                    : pptxDefaultSelected
                                    ? "template_sertifikat.pptx"
                                    : existingPptxPath.split("/").pop()}
                                </p>
                                {pptxFile && (
                                  <p className="text-xs text-gray-400 mt-0.5">
                                    {(pptxFile.size / 1024).toFixed(1)} KB
                                  </p>
                                )}
                                {!pptxFile && pptxDefaultSelected && (
                                  <p className="text-xs text-gray-400 font-mono truncate mt-0.5">
                                    Template bawaan sistem
                                  </p>
                                )}
                                {!pptxFile && !pptxDefaultSelected && existingPptxPath && (
                                  <p className="text-xs text-gray-400 font-mono truncate mt-0.5">
                                    {existingPptxPath}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {!pptxFile && (existingPptxPath || pptxDefaultSelected) && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => setShowPptxPreview((v) => !v)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                                      showPptxPreview
                                        ? "text-indigo-700 bg-indigo-100 hover:bg-indigo-200"
                                        : "text-indigo-600 bg-indigo-50 hover:bg-indigo-100"
                                    }`}
                                    title={showPptxPreview ? "Sembunyikan preview" : "Lihat preview template"}
                                  >
                                    <FontAwesomeIcon
                                      icon={showPptxPreview ? faEyeSlash : faEye}
                                      className="w-3 h-3"
                                    />
                                    {showPptxPreview ? "Sembunyikan" : "Preview"}
                                  </button>
                                  <a
                                    href={pptxDefaultSelected ? `${BE_URL}/template_sertifikat.pptx` : `${BE_URL}/storage/${existingPptxPath}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    download
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-lg transition-colors"
                                    title="Unduh file"
                                  >
                                    <FontAwesomeIcon
                                      icon={faExternalLinkAlt}
                                      className="w-3 h-3"
                                    />
                                    Unduh
                                  </a>
                                </>
                              )}
                              <button
                                type="button"
                                onClick={handleRemovePptxTemplate}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-100 hover:bg-red-200 rounded-lg transition-colors"
                                title="Hapus pilihan"
                              >
                                <FontAwesomeIcon
                                  icon={faTimes}
                                  className="w-3 h-3"
                                />
                                Hapus
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Inline PPTX Preview */}
                      {!pptxFile && showPptxPreview && (existingPptxPath || pptxDefaultSelected) && (
                        <div className="border border-indigo-200 rounded-lg overflow-hidden bg-gray-100">
                          <div className="flex items-center justify-between px-3 py-2 bg-indigo-50 border-b border-indigo-200">
                            <span className="text-xs font-semibold text-indigo-700">
                              Preview —{" "}
                              {pptxDefaultSelected
                                ? "template_sertifikat.pptx"
                                : existingPptxPath.split("/").pop()}
                            </span>
                            <span className="text-xs text-indigo-500">
                              Ditenagai oleh Microsoft Office Online
                            </span>
                          </div>
                          <iframe
                            src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(
                              pptxDefaultSelected
                                ? `${BE_URL}/template_sertifikat.pptx`
                                : `${BE_URL}/storage/${existingPptxPath}`
                            )}`}
                            className="w-full"
                            style={{ height: "480px" }}
                            title="Preview Template PPTX"
                            allowFullScreen
                          />
                        </div>
                      )}

                      {/* Staged local file: preview not yet available */}
                      {pptxFile && (
                        <div className="flex items-center gap-2 px-4 py-3 bg-yellow-50 border border-yellow-200 rounded-lg text-xs text-yellow-700">
                          <FontAwesomeIcon icon={faEye} className="w-3.5 h-3.5 flex-shrink-0" />
                          Preview akan tersedia setelah kegiatan disimpan.
                        </div>
                      )}

                      {/* Library: previously uploaded templates */}
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <FontAwesomeIcon
                            icon={faFolder}
                            className="w-4 h-4 text-yellow-500"
                          />
                          <p className="text-sm font-semibold text-gray-700">
                            Gunakan Template yang Pernah Diupload
                          </p>
                        </div>
                        {loadingAvailableTemplates ? (
                          <div className="flex items-center gap-2 py-4 text-gray-500 text-sm">
                            <FontAwesomeIcon
                              icon={faSpinner}
                              spin
                              className="w-4 h-4"
                            />
                            Memuat daftar template...
                          </div>
                        ) : availablePptxTemplates.length === 0 ? (
                          <p className="text-sm text-gray-400 italic py-3">
                            Belum ada template yang pernah diupload.
                          </p>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                            {availablePptxTemplates.map((tmpl, idx) => {
                              const tmplPath = tmpl.path || tmpl.name || "";
                              const isSelected = existingPptxPath === tmplPath;
                              const displayName =
                                tmpl.original_name ||
                                tmpl.name ||
                                tmplPath.split("/").pop();
                              const previewSrc = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(`${BE_URL}/storage/${tmplPath}`)}`;
                              return (
                                <div
                                  key={idx}
                                  className={`rounded-lg border overflow-hidden flex flex-col transition-all ${
                                    isSelected
                                      ? "border-blue-500 ring-2 ring-blue-400 shadow-md"
                                      : "border-gray-200 hover:border-blue-300 hover:shadow-sm"
                                  }`}
                                >
                                  {/* Preview area */}
                                  <div
                                    className="relative bg-gray-100 overflow-hidden"
                                    style={{ height: "160px" }}
                                  >
                                    <iframe
                                      src={previewSrc}
                                      className="absolute inset-0 w-full h-full"
                                      style={{
                                        pointerEvents: "none",
                                        transform: "scale(0.5)",
                                        transformOrigin: "top left",
                                        width: "200%",
                                        height: "200%",
                                      }}
                                      title={`Preview ${displayName}`}
                                      scrolling="no"
                                      tabIndex={-1}
                                    />
                                    {isSelected && (
                                      <div className="absolute top-2 right-2 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center shadow">
                                        <FontAwesomeIcon
                                          icon={faCheck}
                                          className="w-3 h-3 text-white"
                                        />
                                      </div>
                                    )}
                                  </div>

                                  {/* Card footer */}
                                  <div className="p-2 bg-white border-t border-gray-100 flex flex-col gap-1.5">
                                    <p
                                      className="text-xs font-medium text-gray-800 truncate"
                                      title={displayName}
                                    >
                                      {displayName}
                                    </p>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleSelectExistingPptxTemplate(tmpl)
                                      }
                                      className={`w-full flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                                        isSelected
                                          ? "bg-blue-600 text-white hover:bg-blue-700"
                                          : "bg-gray-100 text-gray-700 hover:bg-blue-50 hover:text-blue-700 border border-gray-200 hover:border-blue-300"
                                      }`}
                                    >
                                      <FontAwesomeIcon
                                        icon={
                                          isSelected
                                            ? faCheck
                                            : faFilePowerpoint
                                        }
                                        className="w-3 h-3 flex-shrink-0"
                                      />
                                      {isSelected ? "Terpilih" : "Gunakan"}
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Tab: Buat Template (custom CertificateEditor) */}
                  {sertifikatTab === "buat" && (
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
                </>
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
                onClick={() => navigate("/admin")}
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
                className="px-6 py-2.5 bg-teal-500 text-white font-semibold rounded-lg hover:bg-teal-600 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
