import { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faTimes,
  faUpload,
  faFileUpload,
  faSearch,
  faUserCheck,
  faUsers,
  faFilePdf,
  faCheck,
  faSpinner,
  faTrashAlt,
  faInfoCircle,
  faExclamationTriangle,
  faChevronDown,
  faFileExcel,
  faDownload,
} from "@fortawesome/free-solid-svg-icons";
import * as XLSX from "xlsx";
import {
  getPegawai,
  getKegiatanPegawai,
  uploadCertificatesKegiatan,
} from "../config/api";

export default function UploadCertificateModal({ kegiatan, onClose, onSuccess }) {
  // Mode: "bulk" (single file for all) or "individual" (file per employee)
  const [uploadMode, setUploadMode] = useState("bulk");

  // Loading states
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Data states
  const [employees, setEmployees] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [selectedEmployees, setSelectedEmployees] = useState([]); // Array of employee objects

  // Search & Filter
  const [sourceTab, setSourceTab] = useState("all"); // "all" or "registered"
  const [searchQuery, setSearchQuery] = useState("");
  const [filterUnitKerja, setFilterUnitKerja] = useState("");

  // Bulk Mode inputs
  const [masterFile, setMasterFile] = useState(null);
  const [masterNomorSertifikat, setMasterNomorSertifikat] = useState("");

  // Individual Mode files: { [nip]: File }
  const [individualFiles, setIndividualFiles] = useState({});
  // Individual Mode nomor sertifikat: { [nip]: string }
  const [individualNomors, setIndividualNomors] = useState({});

  // UI / Drag and drop
  const [isDraggingMaster, setIsDraggingMaster] = useState(false);
  const [isDraggingBatch, setIsDraggingBatch] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const fileInputRef = useRef(null);
  const batchFileInputRef = useRef(null);
  const excelFileInputRef = useRef(null);

  // Excel Import states
  const [excelFileName, setExcelFileName] = useState("");
  const [excelImportStats, setExcelImportStats] = useState(null);
  const [isDraggingExcel, setIsDraggingExcel] = useState(false);

  // Load employees and registered participants
  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setLoadingEmployees(true);
      try {
        const empRes = await getPegawai({ with_unit_parent: true });
        const empData = Array.isArray(empRes)
          ? empRes
          : Array.isArray(empRes?.data)
            ? empRes.data
            : [];
        if (!cancelled) {
          setEmployees(empData);
        }
      } catch (err) {
        console.error("Gagal memuat daftar pegawai:", err);
      } finally {
        if (!cancelled) setLoadingEmployees(false);
      }

      if (kegiatan?.id) {
        setLoadingParticipants(true);
        try {
          const partRes = await getKegiatanPegawai({
            kegiatan_id: kegiatan.id,
            with_pagination: false,
          });
          const partData = Array.isArray(partRes)
            ? partRes
            : Array.isArray(partRes?.data)
              ? partRes.data
              : [];
          if (!cancelled) {
            setParticipants(partData);
          }
        } catch (err) {
          console.error("Gagal memuat peserta terdaftar:", err);
        } finally {
          if (!cancelled) setLoadingParticipants(false);
        }
      }
    }

    loadData();

    return () => {
      cancelled = true;
    };
  }, [kegiatan?.id]);

  // Map of registered participant by NIP
  const participantMap = useMemo(() => {
    const map = new Map();
    participants.forEach((p) => {
      const nip = String(p.nip || p.isi_form?.nip_no_absen || "").trim();
      if (nip) {
        map.set(nip, p);
      }
    });
    return map;
  }, [participants]);

  // Normalize employee object to standard structure
  const normalizeEmployee = (emp) => {
    const nip = String(
      emp?.nip || emp?.nip_baru || emp?.nipBaru || emp?.nip_lama || emp?.isi_form?.nip_no_absen || ""
    ).trim();

    const nama =
      emp?.nama_lengkap ||
      emp?.nama ||
      emp?.name ||
      emp?.fullname ||
      emp?.isi_form?.nama_lengkap ||
      "-";

    const jabatan =
      emp?.nama_jabatan ||
      emp?.jabatan?.nama ||
      (typeof emp?.jabatan === "string" ? emp?.jabatan : "") ||
      emp?.isi_form?.jabatan ||
      "-";

    const unitKerja =
      emp?.unit?.parent?.nama ||
      emp?.unit?.nama ||
      emp?.nama_unit_organisasi ||
      emp?.unit_kerja ||
      emp?.isi_form?.unit_kerja ||
      "-";

    const statusPegawai =
      emp?.status_pegawai ||
      emp?.jenis_pegawai ||
      emp?.isi_form?.status_pegawai ||
      "PNS";

    const hasCert =
      participantMap.has(nip) && !!participantMap.get(nip)?.link_sertifikat;

    return {
      nip,
      nama_lengkap: nama,
      jabatan,
      unit_kerja: unitKerja,
      status_pegawai: statusPegawai,
      hasCert,
      existingRecord: participantMap.get(nip) || null,
    };
  };

  // Unique unit kerja options for filter
  const unitKerjaOptions = useMemo(() => {
    const units = new Set();
    employees.forEach((emp) => {
      const u =
        emp?.unit?.parent?.nama ||
        emp?.unit?.nama ||
        emp?.nama_unit_organisasi ||
        emp?.unit_kerja;
      if (u && typeof u === "string" && u.trim() !== "") {
        units.add(u.trim());
      }
    });
    return Array.from(units).sort();
  }, [employees]);

  // Filtered employee list according to active source tab and search/filter
  const filteredEmployees = useMemo(() => {
    const rawList =
      sourceTab === "registered"
        ? participants.map((p) => normalizeEmployee(p))
        : employees.map((e) => normalizeEmployee(e));

    const q = searchQuery.toLowerCase().trim();

    return rawList.filter((emp) => {
      if (!emp.nip || emp.nip === "-" || emp.nip.toLowerCase() === "umum") {
        return false;
      }

      if (q) {
        const matchName = emp.nama_lengkap.toLowerCase().includes(q);
        const matchNip = emp.nip.toLowerCase().includes(q);
        const matchJabatan = emp.jabatan.toLowerCase().includes(q);
        if (!matchName && !matchNip && !matchJabatan) {
          return false;
        }
      }

      if (filterUnitKerja && emp.unit_kerja !== filterUnitKerja) {
        return false;
      }

      return true;
    });
  }, [employees, participants, sourceTab, searchQuery, filterUnitKerja, participantMap]);

  // Check if an employee is currently selected
  const isSelected = (nip) => {
    return selectedEmployees.some((e) => e.nip === nip);
  };

  // Toggle selection for a single employee
  const toggleSelectEmployee = (emp) => {
    if (isSelected(emp.nip)) {
      setSelectedEmployees(selectedEmployees.filter((e) => e.nip !== emp.nip));
      // Clean up individual files/numbers
      setIndividualFiles((prev) => {
        const copy = { ...prev };
        delete copy[emp.nip];
        return copy;
      });
      setIndividualNomors((prev) => {
        const copy = { ...prev };
        delete copy[emp.nip];
        return copy;
      });
    } else {
      setSelectedEmployees([...selectedEmployees, emp]);
    }
  };

  // Select all visible filtered employees
  const handleSelectAllFiltered = () => {
    const newItems = filteredEmployees.filter(
      (emp) => !isSelected(emp.nip)
    );
    setSelectedEmployees([...selectedEmployees, ...newItems]);
  };

  // Deselect all
  const handleDeselectAll = () => {
    setSelectedEmployees([]);
    setIndividualFiles({});
    setIndividualNomors({});
    setExcelFileName("");
    setExcelImportStats(null);
  };

  // Handle master file selection (bulk mode)
  const handleMasterFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setMasterFile(file);
      setErrorMsg("");
    }
  };

  // Handle master file drop
  const handleMasterFileDrop = (e) => {
    e.preventDefault();
    setIsDraggingMaster(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setMasterFile(file);
      setErrorMsg("");
    }
  };

  // Handle individual file selection per employee
  const handleIndividualFileChange = (nip, file) => {
    if (!file) return;
    setIndividualFiles((prev) => ({
      ...prev,
      [nip]: file,
    }));
  };

  // Handle individual nomor sertifikat change
  const handleIndividualNomorChange = (nip, val) => {
    setIndividualNomors((prev) => ({
      ...prev,
      [nip]: val,
    }));
  };

  // Handle batch dropping files that auto-match by NIP in filename
  const handleBatchFileDrop = (e) => {
    e.preventDefault();
    setIsDraggingBatch(false);
    const files = Array.from(e.dataTransfer.files || []);
    matchBatchFiles(files);
  };

  const handleBatchFileInputChange = (e) => {
    const files = Array.from(e.target.files || []);
    matchBatchFiles(files);
  };

  const matchBatchFiles = (files) => {
    if (!files.length) return;
    const newFilesMap = { ...individualFiles };
    let matchedCount = 0;

    files.forEach((file) => {
      const fileName = file.name;
      // Find matching employee among selected
      selectedEmployees.forEach((emp) => {
        if (fileName.includes(emp.nip)) {
          newFilesMap[emp.nip] = file;
          matchedCount++;
        }
      });
    });

    setIndividualFiles(newFilesMap);
    if (matchedCount > 0) {
      if (typeof window.Swal !== "undefined") {
        window.Swal.fire({
          icon: "info",
          title: "File Dicocokkan",
          text: `${matchedCount} file berhasil dicocokkan otomatis berdasarkan NIP pegawai terpilih.`,
          timer: 2500,
          showConfirmButton: false,
        });
      }
    } else {
      setErrorMsg("Tidak ada file yang nama filenya mengandung NIP dari pegawai yang dipilih.");
    }
  };

  // Download Excel Template for NIP and Nomor Sertifikat
  const downloadExcelTemplate = () => {
    try {
      const wb = XLSX.utils.book_new();

      const data = [
        ["NIP", "Nomor Sertifikat"]
      ];

      // Pre-fill registered participants if available, or sample rows
      if (participants && participants.length > 0) {
        participants.forEach((p) => {
          const nip = String(p.nip || p.isi_form?.nip_no_absen || "").trim();
          if (nip && nip !== "-" && nip.toLowerCase() !== "umum") {
            const currentNomor = p.nomor_sertifikat || "";
            data.push([nip, currentNomor]);
          }
        });
      } else {
        data.push(
          ["198501012010011001", "KP.04.00/1/12/DPDRI/X/2026"],
          ["199002022015022002", "KP.04.00/1/13/DPDRI/X/2026"]
        );
      }

      const ws = XLSX.utils.aoa_to_sheet(data);

      // Explicitly format column A (NIP) as text string so Excel does not convert to scientific notation
      const range = XLSX.utils.decode_range(ws["!ref"] || "A1:B1");
      for (let R = 1; R <= range.e.r; ++R) {
        const cellRef = XLSX.utils.encode_cell({ r: R, c: 0 });
        if (ws[cellRef]) {
          ws[cellRef].t = "s";
          ws[cellRef].z = "@";
        }
      }

      ws["!cols"] = [
        { wch: 25 }, // NIP
        { wch: 35 }, // Nomor Sertifikat
      ];

      XLSX.utils.book_append_sheet(wb, ws, "Data Sertifikat");

      const cleanName = (kegiatan?.nama_kegiatan || "Kegiatan")
        .replace(/[^a-zA-Z0-9_-]/g, "_")
        .substring(0, 30);
      const filename = `Template_Upload_Sertifikat_${cleanName}.xlsx`;

      XLSX.writeFile(wb, filename);
    } catch (err) {
      console.error("Gagal mengunduh template Excel:", err);
      if (typeof window.Swal !== "undefined") {
        window.Swal.fire({
          icon: "error",
          title: "Gagal Mengunduh",
          text: "Terjadi kesalahan saat membuat template Excel.",
          confirmButtonColor: "#ef4444",
        });
      } else {
        alert("Gagal mengunduh template Excel.");
      }
    }
  };

  // Handle Excel file upload selection
  const handleExcelUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    parseExcelFile(file);
    if (e.target) e.target.value = "";
  };

  // Handle Excel file drag and drop
  const handleExcelDrop = (e) => {
    e.preventDefault();
    setIsDraggingExcel(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      parseExcelFile(file);
    }
  };

  // Parse Excel file and extract NIP + Nomor Sertifikat
  const parseExcelFile = async (file) => {
    try {
      setErrorMsg("");
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array" });
      const sheetName = wb.SheetNames[0];
      if (!sheetName) {
        throw new Error("File Excel kosong atau tidak memiliki lembar kerja.");
      }

      const ws = wb.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(ws, { defval: "", raw: false });

      if (!rows || rows.length === 0) {
        throw new Error("Tidak ada baris data ditemukan di dalam file Excel.");
      }

      // Find column keys
      const sampleRow = rows[0];
      const keys = Object.keys(sampleRow);

      const nipKey = keys.find((k) => {
        const clean = k.trim().toLowerCase().replace(/[\s_\.]+/g, "");
        return clean === "nip" || clean.startsWith("nip") || clean.includes("noinduk") || clean.includes("nomorinduk");
      }) || keys.find((k) => /nip/i.test(k));

      const nomorKey = keys.find((k) => {
        const clean = k.trim().toLowerCase().replace(/[\s_\.]+/g, "");
        return clean.includes("nomorsertifikat") || clean.includes("nosertifikat") || clean === "sertifikat";
      }) || keys.find((k) => /sertifikat/i.test(k));

      if (!nipKey) {
        throw new Error(
          "Kolom 'NIP' tidak ditemukan pada header file Excel. Pastikan header memuat kolom bernama 'NIP'."
        );
      }

      // Map employees by NIP for fast matching
      const empByNip = new Map();
      employees.forEach((emp) => {
        const nip = String(
          emp?.nip || emp?.nip_baru || emp?.nipBaru || emp?.nip_lama || ""
        ).trim();
        if (nip) empByNip.set(nip, emp);
      });

      const newSelected = [...selectedEmployees];
      const newNomors = { ...individualNomors };
      let addedCount = 0;
      let updatedNomorCount = 0;
      let notFoundInMasterCount = 0;

      rows.forEach((row) => {
        let rawNip = String(row[nipKey] || "").trim();
        if (rawNip.endsWith(".0")) {
          rawNip = rawNip.slice(0, -2);
        }
        rawNip = rawNip.replace(/\s+/g, "");

        if (!rawNip || rawNip === "-" || rawNip.toLowerCase() === "null") {
          return;
        }

        const rawNomor = nomorKey ? String(row[nomorKey] || "").trim() : "";

        // Look up employee object
        let empObj = newSelected.find((e) => e.nip === rawNip);

        if (!empObj) {
          if (empByNip.has(rawNip)) {
            empObj = normalizeEmployee(empByNip.get(rawNip));
          } else if (participantMap.has(rawNip)) {
            empObj = normalizeEmployee(participantMap.get(rawNip));
          } else {
            empObj = {
              nip: rawNip,
              nama_lengkap: `Pegawai (${rawNip})`,
              jabatan: "-",
              unit_kerja: "-",
              status_pegawai: "PNS",
              hasCert: false,
              existingRecord: null,
            };
            notFoundInMasterCount++;
          }
          newSelected.push(empObj);
          addedCount++;
        }

        if (rawNomor) {
          newNomors[rawNip] = rawNomor;
          updatedNomorCount++;
        }
      });

      if (newSelected.length === 0) {
        throw new Error("Tidak ada NIP valid yang berhasil dibaca dari file Excel.");
      }

      setSelectedEmployees(newSelected);
      setIndividualNomors(newNomors);
      setExcelFileName(file.name);
      setExcelImportStats({
        totalRows: rows.length,
        selectedTotal: newSelected.length,
        newlyAdded: addedCount,
        withNomor: updatedNomorCount,
        notFoundInMaster: notFoundInMasterCount,
      });

      if (typeof window.Swal !== "undefined") {
        window.Swal.fire({
          icon: "success",
          title: "Import Excel Berhasil",
          html: `
            <div class="text-left text-xs space-y-1.5 p-1">
              <p><strong>File:</strong> ${file.name}</p>
              <p><strong>Total Pegawai Terpilih:</strong> ${newSelected.length} orang (+${addedCount} baru)</p>
              <p><strong>Nomor Sertifikat Ditetapkan:</strong> ${updatedNomorCount} pegawai</p>
              ${
                notFoundInMasterCount > 0
                  ? `<p class="text-amber-600 bg-amber-50 dark:bg-amber-950/40 p-2 rounded-lg"><strong>Catatan:</strong> ${notFoundInMasterCount} NIP belum ada di master SDM lokal, data tetap dimasukkan untuk diproses otomatis oleh server.</p>`
                  : ""
              }
            </div>
          `,
          confirmButtonColor: "#10b981",
        });
      }
    } catch (err) {
      console.error("Gagal mengurai file Excel:", err);
      const msg = err.message || "Gagal membaca file Excel.";
      setErrorMsg(msg);
      if (typeof window.Swal !== "undefined") {
        window.Swal.fire({
          icon: "error",
          title: "Import Excel Gagal",
          text: msg,
          confirmButtonColor: "#ef4444",
        });
      }
    }
  };

  // Submit Handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (selectedEmployees.length === 0) {
      setErrorMsg("Pilih minimal 1 pegawai terlebih dahulu.");
      return;
    }

    if (uploadMode === "bulk" && !masterFile) {
      setErrorMsg("Pilih file sertifikat yang akan diunggah untuk pegawai terpilih.");
      return;
    }

    if (uploadMode === "individual") {
      const missingFiles = selectedEmployees.filter(
        (emp) => !individualFiles[emp.nip]
      );
      if (missingFiles.length > 0) {
        setErrorMsg(
          `Ada ${missingFiles.length} pegawai terpilih yang belum memiliki file sertifikat: ${missingFiles.map((m) => m.nama_lengkap).slice(0, 3).join(", ")}${missingFiles.length > 3 ? "..." : ""}`
        );
        return;
      }
    }

    const confirmMsg =
      uploadMode === "bulk"
        ? `Upload 1 file sertifikat untuk ${selectedEmployees.length} pegawai terpilih? Data kegiatan_pegawai akan dibuat jika belum ada, atau sertifikat diperbarui jika sudah ada.`
        : `Upload ${selectedEmployees.length} file sertifikat untuk masing-masing pegawai terpilih? Data kegiatan_pegawai akan dibuat jika belum ada, atau sertifikat diperbarui jika sudah ada.`;

    const confirmed =
      typeof window.Swal !== "undefined"
        ? (
            await window.Swal.fire({
              title: "Konfirmasi Upload Sertifikat",
              text: confirmMsg,
              icon: "question",
              showCancelButton: true,
              confirmButtonText: "Ya, Upload Sekarang",
              cancelButtonText: "Batal",
              confirmButtonColor: "#3085d6",
              cancelButtonColor: "#ef4444",
              reverseButtons: true,
            })
          ).isConfirmed
        : window.confirm(confirmMsg);

    if (!confirmed) return;

    setIsSubmitting(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append("kegiatan_id", kegiatan.id);

      // Build employees payload with profiles
      const pegawaiPayload = selectedEmployees.map((emp) => {
        const item = {
          nip: emp.nip,
          nama_lengkap: emp.nama_lengkap,
          jabatan: emp.jabatan,
          unit_kerja: emp.unit_kerja,
          status_pegawai: emp.status_pegawai,
        };
        if (individualNomors[emp.nip] && individualNomors[emp.nip].trim()) {
          item.nomor_sertifikat = individualNomors[emp.nip].trim();
        } else if (uploadMode === "bulk" && masterNomorSertifikat.trim()) {
          item.nomor_sertifikat = masterNomorSertifikat.trim();
        }
        return item;
      });

      formData.append("pegawai", JSON.stringify(pegawaiPayload));

      // Build profiles map
      const profilesMap = {};
      selectedEmployees.forEach((emp) => {
        profilesMap[emp.nip] = {
          nama_lengkap: emp.nama_lengkap,
          jabatan: emp.jabatan,
          unit_kerja: emp.unit_kerja,
          status_pegawai: emp.status_pegawai,
        };
      });
      formData.append("pegawai_profiles", JSON.stringify(profilesMap));

      if (uploadMode === "bulk") {
        formData.append("file", masterFile);
        if (masterNomorSertifikat.trim()) {
          formData.append("nomor_sertifikat", masterNomorSertifikat.trim());
        }
      } else {
        // Append individual files keyed by NIP
        selectedEmployees.forEach((emp) => {
          const f = individualFiles[emp.nip];
          if (f) {
            formData.append(`files[${emp.nip}]`, f);
          }
        });
      }

      const res = await uploadCertificatesKegiatan(formData, (percent) => {
        setUploadProgress(percent);
      });

      const successText =
        res?.message ||
        `Berhasil mengunggah sertifikat untuk ${selectedEmployees.length} pegawai.`;

      if (typeof window.Swal !== "undefined") {
        await window.Swal.fire({
          icon: "success",
          title: "Upload Berhasil",
          text: successText,
          confirmButtonColor: "#3085d6",
        });
      } else {
        alert(successText);
      }

      onClose();

      if (typeof onSuccess === "function") {
        try {
          onSuccess(res);
        } catch (callbackErr) {
          console.error("Error in onSuccess callback:", callbackErr);
        }
      }
    } catch (err) {
      console.error("Gagal mengunggah sertifikat:", err);
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Gagal mengunggah sertifikat.";
      setErrorMsg(msg);
      if (typeof window.Swal !== "undefined") {
        window.Swal.fire({
          icon: "error",
          title: "Upload Gagal",
          text: msg,
          confirmButtonColor: "#ef4444",
        });
      }
    } finally {
      setIsSubmitting(false);
      setUploadProgress(0);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-4xl w-full my-8 max-h-[92vh] flex flex-col border border-gray-200 dark:border-gray-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-800/50 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
              <FontAwesomeIcon icon={faFileUpload} className="text-lg" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                Upload Sertifikat Pegawai
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-xl">
                {kegiatan?.nama_kegiatan} • {kegiatan?.tanggal || "-"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            title="Tutup"
          >
            <FontAwesomeIcon icon={faTimes} className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {errorMsg && (
            <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl flex items-start gap-3 text-red-700 dark:text-red-300 text-sm">
              <FontAwesomeIcon
                icon={faExclamationTriangle}
                className="mt-0.5 flex-shrink-0 text-red-500"
              />
              <span className="flex-1">{errorMsg}</span>
              <button
                onClick={() => setErrorMsg("")}
                className="text-red-400 hover:text-red-600"
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
          )}

          {/* Mode Switcher */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
              Metode Upload Sertifikat
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setUploadMode("bulk")}
                className={`p-3.5 rounded-xl border text-left transition-all flex items-start gap-3 cursor-pointer ${
                  uploadMode === "bulk"
                    ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-200 shadow-xs"
                    : "border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-850"
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full border flex items-center justify-center mt-0.5 flex-shrink-0 ${
                    uploadMode === "bulk"
                      ? "border-emerald-600 bg-emerald-600 text-white"
                      : "border-gray-300 dark:border-gray-600"
                  }`}
                >
                  {uploadMode === "bulk" && (
                    <FontAwesomeIcon icon={faCheck} className="text-xs" />
                  )}
                </div>
                <div>
                  <div className="font-semibold text-sm">
                    Satu File untuk Semua Pegawai
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    1 sertifikat dibagikan ke seluruh pegawai yang dipilih sekaligus.
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setUploadMode("individual")}
                className={`p-3.5 rounded-xl border text-left transition-all flex items-start gap-3 cursor-pointer ${
                  uploadMode === "individual"
                    ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-200 shadow-xs"
                    : "border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-850"
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full border flex items-center justify-center mt-0.5 flex-shrink-0 ${
                    uploadMode === "individual"
                      ? "border-emerald-600 bg-emerald-600 text-white"
                      : "border-gray-300 dark:border-gray-600"
                  }`}
                >
                  {uploadMode === "individual" && (
                    <FontAwesomeIcon icon={faCheck} className="text-xs" />
                  )}
                </div>
                <div>
                  <div className="font-semibold text-sm">
                    File Terpisah Per Pegawai
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Unggah file sertifikat khusus untuk masing-masing pegawai.
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Upload Section: Bulk Mode */}
          {uploadMode === "bulk" && (
            <div className="space-y-4 p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/40 dark:bg-gray-850/40">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                  File Sertifikat <span className="text-red-500">*</span>
                </label>
                <span className="text-xs text-gray-500">
                  Format: PDF, JPG, PNG (Maks. 20MB)
                </span>
              </div>

              {!masterFile ? (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDraggingMaster(true);
                  }}
                  onDragLeave={() => setIsDraggingMaster(false)}
                  onDrop={handleMasterFileDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                    isDraggingMaster
                      ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20"
                      : "border-gray-300 dark:border-gray-700 hover:border-emerald-400 bg-white dark:bg-gray-900"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleMasterFileChange}
                    className="hidden"
                  />
                  <div className="w-12 h-12 mx-auto rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3">
                    <FontAwesomeIcon icon={faUpload} className="text-xl" />
                  </div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Klik untuk memilih file atau seret file sertifikat ke sini
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    File ini akan dipasangkan ke semua pegawai yang Anda pilih di bawah
                  </p>
                </div>
              ) : (
                <div className="flex items-center justify-between p-3.5 bg-white dark:bg-gray-900 border border-emerald-200 dark:border-emerald-900/60 rounded-xl">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0">
                      <FontAwesomeIcon icon={faFilePdf} className="text-lg" />
                    </div>
                    <div className="truncate">
                      <div className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">
                        {masterFile.name}
                      </div>
                      <div className="text-xs text-gray-400">
                        {(masterFile.size / 1024 / 1024).toFixed(2)} MB
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMasterFile(null)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors"
                    title="Hapus File"
                  >
                    <FontAwesomeIcon icon={faTrashAlt} />
                  </button>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Nomor Sertifikat (Opsional)
                </label>
                <input
                  type="text"
                  value={masterNomorSertifikat}
                  onChange={(e) => setMasterNomorSertifikat(e.target.value)}
                  placeholder="Contoh: KP.04.00/1/12/DPDRI/X/2026 (Kosongkan jika otomatis)"
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Bila dikosongkan, sistem otomatis membuat nomor sertifikat resmi berdasarkan urutan kegiatan.
                </p>
              </div>

              {Object.keys(individualNomors).length > 0 && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-start gap-2">
                  <FontAwesomeIcon icon={faInfoCircle} className="mt-0.5 text-emerald-600 flex-shrink-0" />
                  <span>
                    Terdeteksi <strong>{Object.keys(individualNomors).length}</strong> nomor sertifikat spesifik per pegawai (dari file Excel). Nomor tersebut akan dipasangkan ke masing-masing pegawai saat disimpan.
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Section: Employee Selection */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <label className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <FontAwesomeIcon icon={faUsers} className="text-emerald-600" />
                  Pilih Pegawai Penerima Sertifikat
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                    {selectedEmployees.length} dipilih
                  </span>
                </label>
                <p className="text-xs text-gray-500">
                  Data yang belum ada di kegiatan akan otomatis ditambahkan ke tabel kegiatan_pegawai.
                </p>
              </div>

              {/* Fast Action Buttons */}
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={handleSelectAllFiltered}
                  className="px-2.5 py-1 text-xs font-medium rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
                >
                  Pilih Semua Hasil Filter ({filteredEmployees.length})
                </button>
                {selectedEmployees.length > 0 && (
                  <button
                    type="button"
                    onClick={handleDeselectAll}
                    className="px-2.5 py-1 text-xs font-medium rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                  >
                    Batal Semua
                  </button>
                )}
              </div>
            </div>

            {/* Excel Upload & Template Section */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDraggingExcel(true);
              }}
              onDragLeave={() => setIsDraggingExcel(false)}
              onDrop={handleExcelDrop}
              className={`p-4 rounded-xl border border-dashed transition-colors ${
                isDraggingExcel
                  ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30"
                  : "border-emerald-300 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/20"
              } space-y-3`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <FontAwesomeIcon icon={faFileExcel} className="text-base" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                      Import Data Pegawai & Nomor Sertifikat dari Excel
                    </h4>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">
                      Header wajib: <strong className="text-emerald-700 dark:text-emerald-400">NIP</strong> dan <strong className="text-emerald-700 dark:text-emerald-400">Nomor Sertifikat</strong>. Data NIP akan langsung dipilih otomatis tanpa perlu dicentang satu per satu.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={downloadExcelTemplate}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-gray-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs whitespace-nowrap"
                    title="Unduh Template Excel format NIP dan Nomor Sertifikat"
                  >
                    <FontAwesomeIcon icon={faDownload} />
                    Unduh Template Excel
                  </button>

                  <button
                    type="button"
                    onClick={() => excelFileInputRef.current?.click()}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs whitespace-nowrap"
                  >
                    <FontAwesomeIcon icon={faUpload} />
                    Unggah File Excel
                  </button>
                  <input
                    ref={excelFileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleExcelUpload}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Status if Excel imported */}
              {excelFileName && (
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-white dark:bg-gray-800 border border-emerald-200 dark:border-emerald-800/60 text-xs">
                  <div className="flex items-center gap-2 truncate">
                    <FontAwesomeIcon icon={faCheck} className="text-emerald-500 text-xs" />
                    <span className="font-semibold text-gray-800 dark:text-gray-200 truncate">
                      {excelFileName}
                    </span>
                    {excelImportStats && (
                      <span className="text-[11px] text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full font-medium">
                        {excelImportStats.selectedTotal} pegawai dipilih ({excelImportStats.withNomor} nomor sertifikat)
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setExcelFileName("");
                      setExcelImportStats(null);
                    }}
                    className="text-gray-400 hover:text-red-500 ml-2 p-1"
                    title="Reset info file Excel"
                  >
                    <FontAwesomeIcon icon={faTimes} className="text-xs" />
                  </button>
                </div>
              )}
            </div>

            {/* Source Tab Toggle */}
            <div className="flex border-b border-gray-200 dark:border-gray-800">
              <button
                type="button"
                onClick={() => setSourceTab("all")}
                className={`py-2 px-4 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                  sourceTab === "all"
                    ? "border-emerald-600 text-emerald-600 dark:text-emerald-400"
                    : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                }`}
              >
                Semua Pegawai SDM ({employees.length})
              </button>
              <button
                type="button"
                onClick={() => setSourceTab("registered")}
                className={`py-2 px-4 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                  sourceTab === "registered"
                    ? "border-emerald-600 text-emerald-600 dark:text-emerald-400"
                    : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                }`}
              >
                Peserta Terdaftar ({participants.length})
                {loadingParticipants && (
                  <FontAwesomeIcon icon={faSpinner} spin className="text-xs" />
                )}
              </button>
            </div>

            {/* Search & Filter Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="relative">
                <FontAwesomeIcon
                  icon={faSearch}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari nama, NIP, atau jabatan..."
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                />
              </div>

              <div className="relative">
                <select
                  value={filterUnitKerja}
                  onChange={(e) => setFilterUnitKerja(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none appearance-none pr-8 truncate"
                >
                  <option value="">Semua Unit Kerja</option>
                  {unitKerjaOptions.map((unit) => (
                    <option key={unit} value={unit}>
                      {unit}
                    </option>
                  ))}
                </select>
                <FontAwesomeIcon
                  icon={faChevronDown}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none"
                />
              </div>
            </div>

            {/* Selected Chips */}
            {selectedEmployees.length > 0 && (
              <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-xl border border-emerald-100 dark:border-emerald-900/40">
                <div className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 mb-2">
                  Pegawai Terpilih ({selectedEmployees.length}):
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                  {selectedEmployees.map((emp) => (
                    <span
                      key={emp.nip}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-white dark:bg-gray-800 border border-emerald-200 dark:border-emerald-800 text-gray-800 dark:text-gray-200 shadow-2xs"
                    >
                      <span className="font-medium truncate max-w-[140px]">
                        {emp.nama_lengkap}
                      </span>
                      <span className="text-gray-400 text-[10px]">({emp.nip})</span>
                      {individualNomors[emp.nip] && (
                        <span
                          className="text-emerald-700 dark:text-emerald-300 font-mono text-[10px] bg-emerald-100 dark:bg-emerald-950/60 px-1.5 py-0.2 rounded font-medium max-w-[130px] truncate"
                          title={`Nomor Sertifikat: ${individualNomors[emp.nip]}`}
                        >
                          #{individualNomors[emp.nip]}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => toggleSelectEmployee(emp)}
                        className="text-gray-400 hover:text-red-500 ml-0.5 p-0.5"
                      >
                        <FontAwesomeIcon icon={faTimes} className="text-[10px]" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Employee Picker Table / List */}
            <div className="border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden max-h-60 overflow-y-auto bg-white dark:bg-gray-900">
              {loadingEmployees ? (
                <div className="p-8 text-center text-gray-400 flex flex-col items-center justify-center gap-2">
                  <FontAwesomeIcon icon={faSpinner} spin className="text-2xl text-emerald-500" />
                  <span className="text-xs">Memuat data pegawai...</span>
                </div>
              ) : filteredEmployees.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-xs">
                  Tidak ada pegawai yang cocok dengan filter pencarian.
                </div>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800/60 text-xs font-semibold text-gray-600 dark:text-gray-300 sticky top-0 z-10">
                    <tr>
                      <th className="w-10 px-3 py-2.5 text-center">Pilih</th>
                      <th className="px-3 py-2.5">Nama & NIP</th>
                      <th className="px-3 py-2.5 hidden sm:table-cell">Jabatan</th>
                      <th className="px-3 py-2.5 hidden md:table-cell">Unit Kerja</th>
                      <th className="px-3 py-2.5 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {filteredEmployees.map((emp) => {
                      const checked = isSelected(emp.nip);
                      return (
                        <tr
                          key={emp.nip}
                          onClick={() => toggleSelectEmployee(emp)}
                          className={`cursor-pointer transition-colors ${
                            checked
                              ? "bg-emerald-50/60 dark:bg-emerald-950/30"
                              : "hover:bg-gray-50 dark:hover:bg-gray-850"
                          }`}
                        >
                          <td className="px-3 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleSelectEmployee(emp)}
                              className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4 cursor-pointer"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <div className="font-semibold text-gray-900 dark:text-gray-100 text-xs sm:text-sm">
                              {emp.nama_lengkap}
                            </div>
                            <div className="text-[11px] text-gray-500 dark:text-gray-400 font-mono">
                              {emp.nip}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-xs text-gray-600 dark:text-gray-300 hidden sm:table-cell">
                            {emp.jabatan}
                          </td>
                          <td className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400 hidden md:table-cell truncate max-w-xs">
                            {emp.unit_kerja}
                          </td>
                          <td className="px-3 py-2 text-center">
                            {emp.hasCert ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                                <FontAwesomeIcon icon={faCheck} className="text-[9px]" />
                                Bersertifikat
                              </span>
                            ) : emp.existingRecord ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                                Terdaftar
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                                Baru
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Mode 2: Individual Files Table / Multi dropzone */}
          {uploadMode === "individual" && selectedEmployees.length > 0 && (
            <div className="space-y-4 p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/40 dark:bg-gray-850/40">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                    File Sertifikat Per Pegawai
                  </h3>
                  <p className="text-xs text-gray-400">
                    Upload file untuk masing-masing pegawai di bawah atau gunakan fitur pencocokan otomatis.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => batchFileInputRef.current?.click()}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors self-start sm:self-auto flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <FontAwesomeIcon icon={faUpload} />
                  Drop Multiple Files (Auto-Match NIP)
                </button>
                <input
                  ref={batchFileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleBatchFileInputChange}
                  className="hidden"
                />
              </div>

              {/* Multi-file dropzone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDraggingBatch(true);
                }}
                onDragLeave={() => setIsDraggingBatch(false)}
                onDrop={handleBatchFileDrop}
                className={`border-2 border-dashed rounded-xl p-4 text-center transition-colors ${
                  isDraggingBatch
                    ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20"
                    : "border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900"
                }`}
              >
                <p className="text-xs text-gray-600 dark:text-gray-300 font-medium">
                  Tarik banyak file sertifikat ke area ini sekaligus
                </p>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  File yang memiliki NIP pada namanya (contoh: <code>19900101...pdf</code>) akan langsung otomatis dipasangkan ke pegawai yang sesuai.
                </p>
              </div>

              {/* Individual Rows */}
              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {selectedEmployees.map((emp, idx) => {
                  const file = individualFiles[emp.nip];
                  const nomor = individualNomors[emp.nip] || "";

                  return (
                    <div
                      key={emp.nip}
                      className="p-3 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-xs flex items-center justify-center font-bold">
                            {idx + 1}
                          </span>
                          <span className="font-semibold text-xs sm:text-sm text-gray-900 dark:text-white">
                            {emp.nama_lengkap}
                          </span>
                          <span className="text-xs text-gray-400 font-mono">
                            ({emp.nip})
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleSelectEmployee(emp)}
                          className="text-gray-400 hover:text-red-500 text-xs p-1"
                          title="Hapus Pegawai"
                        >
                          <FontAwesomeIcon icon={faTrashAlt} />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        <div>
                          <label className="block text-[11px] font-medium text-gray-500 mb-0.5">
                            File Sertifikat <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={(e) =>
                              handleIndividualFileChange(emp.nip, e.target.files?.[0])
                            }
                            className="block w-full text-xs text-gray-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer"
                          />
                          {file && (
                            <span className="text-[10px] text-emerald-600 font-medium mt-0.5 block truncate">
                              ✓ {file.name} ({(file.size / 1024).toFixed(0)} KB)
                            </span>
                          )}
                        </div>

                        <div>
                          <label className="block text-[11px] font-medium text-gray-500 mb-0.5">
                            Nomor Sertifikat (Opsional)
                          </label>
                          <input
                            type="text"
                            value={nomor}
                            onChange={(e) =>
                              handleIndividualNomorChange(emp.nip, e.target.value)
                            }
                            placeholder="Nomor sertifikat khusus (opsional)..."
                            className="w-full px-2.5 py-1 text-xs rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Progress Bar during submit */}
          {isSubmitting && (
            <div className="space-y-1.5 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
              <div className="flex items-center justify-between text-xs font-semibold text-emerald-900 dark:text-emerald-200">
                <span className="flex items-center gap-2">
                  <FontAwesomeIcon icon={faSpinner} spin />
                  Sedang mengunggah dan memproses sertifikat...
                </span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-emerald-200 dark:bg-emerald-900/60 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-emerald-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-800/50 rounded-b-2xl">
          <div className="text-xs text-gray-500">
            {selectedEmployees.length > 0 ? (
              <span className="font-medium text-emerald-600 dark:text-emerald-400">
                {selectedEmployees.length} pegawai siap diproses
              </span>
            ) : (
              "Pilih pegawai terlebih dahulu"
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium rounded-xl border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              Batal
            </button>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || selectedEmployees.length === 0}
              className="px-5 py-2 text-sm font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <FontAwesomeIcon icon={faSpinner} spin />
                  Memproses...
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faUpload} />
                  Upload & Simpan ({selectedEmployees.length})
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

