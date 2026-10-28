import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faTimes,
  faLink,
  faPlus,
  faCopy,
  faCheck,
  faSpinner,
  faTrashAlt,
  faExternalLinkAlt,
  faInfoCircle,
  faCheckCircle,
  faClock,
  faUser,
  faUsers,
  faFileAlt,
} from "@fortawesome/free-solid-svg-icons";
import {
  getKegiatanTokens,
  createKegiatanToken,
  deleteKegiatanToken,
} from "../config/api";

export default function SpecialEvaluationModal({ kegiatan, onClose }) {
  const [activeJenis, setActiveJenis] = useState("kegiatan"); // "kegiatan" | "narasumber"
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [latestGenerated, setLatestGenerated] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all"); // "all" | "unused" | "used"

  const loadTokens = async () => {
    if (!kegiatan?.id) return;
    try {
      setLoading(true);
      const res = await getKegiatanTokens(kegiatan.id);
      setTokens(res.data || []);
    } catch (err) {
      console.error("Gagal memuat token evaluasi:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTokens();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kegiatan?.id]);

  const handleGenerate = async () => {
    try {
      setGenerating(true);
      const res = await createKegiatanToken(kegiatan.id, { jenis: activeJenis === "narasumber" ? "narasumber" : "kegiatan" });
      const newToken = res.data;
      setLatestGenerated(newToken);
      // Reload token list
      await loadTokens();

      // Automatically copy to clipboard
      const fullUrl = `${window.location.origin}/evaluasi-khusus/${newToken.token}`;
      navigator.clipboard?.writeText(fullUrl).catch(() => {});

      if (typeof window.Swal !== "undefined") {
        window.Swal.fire({
          icon: "success",
          title: "Link Berhasil Dibuat!",
          text: `Link evaluasi ${activeJenis === "kegiatan" ? "kegiatan" : "narasumber"} satu kali pakai telah dibuat dan otomatis disalin ke clipboard.`,
          timer: 2500,
          showConfirmButton: false,
          confirmButtonColor: "#14b8a6",
        });
      }
    } catch (err) {
      console.error("Gagal membuat token evaluasi:", err);
      if (typeof window.Swal !== "undefined") {
        window.Swal.fire({
          icon: "error",
          title: "Gagal",
          text: err.message || "Gagal membuat link evaluasi khusus.",
          confirmButtonColor: "#ef4444",
        });
      } else {
        alert(err.message || "Gagal membuat link evaluasi khusus.");
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async (tokenId) => {
    const confirmed =
      typeof window.Swal !== "undefined"
        ? (
            await window.Swal.fire({
              title: "Hapus Link Ini?",
              text: "Link evaluasi khusus ini akan dihapus dan tidak dapat diakses lagi.",
              icon: "warning",
              showCancelButton: true,
              confirmButtonText: "Ya, Hapus",
              cancelButtonText: "Batal",
              confirmButtonColor: "#ef4444",
              cancelButtonColor: "#6b7280",
            })
          ).isConfirmed
        : confirm("Hapus link evaluasi khusus ini?");

    if (!confirmed) return;

    try {
      setDeletingId(tokenId);
      await deleteKegiatanToken(tokenId);
      if (latestGenerated?.id === tokenId) {
        setLatestGenerated(null);
      }
      await loadTokens();
    } catch (err) {
      console.error("Gagal menghapus token:", err);
      if (typeof window.Swal !== "undefined") {
        window.Swal.fire({
          icon: "error",
          title: "Gagal",
          text: err.message || "Gagal menghapus token evaluasi.",
          confirmButtonColor: "#ef4444",
        });
      } else {
        alert(err.message || "Gagal menghapus token.");
      }
    } finally {
      setDeletingId(null);
    }
  };

  const copyUrl = (tokenStr, id) => {
    const fullUrl = `${window.location.origin}/evaluasi-khusus/${tokenStr}`;
    navigator.clipboard
      ?.writeText(fullUrl)
      .then(() => {
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
      })
      .catch(() => {
        alert("Gagal menyalin link.");
      });
  };

  const formatDateTime = (dt) => {
    if (!dt) return "-";
    try {
      return new Date(dt).toLocaleString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dt;
    }
  };

  // Filter tokens based on active tab and status
  const currentTokens = tokens.filter((t) => {
    if (t.jenis !== activeJenis) return false;
    if (filterStatus === "unused") return !t.is_used;
    if (filterStatus === "used") return t.is_used;
    return true;
  });

  const kegiatanTokenCount = tokens.filter((t) => t.jenis === "kegiatan").length;
  const narasumberTokenCount = tokens.filter((t) => t.jenis === "narasumber").length;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-white rounded-2xl shadow-2xl overflow-hidden animate-fadeIn">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-teal-600 to-teal-700 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <FontAwesomeIcon icon={faLink} className="text-xl text-teal-100" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Link Khusus Evaluasi (Sekali Pakai)</h2>
              <p className="text-xs text-teal-100 truncate max-w-md">
                {kegiatan?.nama_kegiatan}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-teal-100 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Info Card */}
          <div className="p-4 rounded-xl bg-teal-50 border border-teal-200 text-teal-900 flex items-start gap-3">
            <FontAwesomeIcon icon={faInfoCircle} className="text-teal-600 mt-0.5 text-lg flex-shrink-0" />
            <div className="text-xs leading-relaxed space-y-1">
              <p className="font-semibold text-teal-950">
                Fitur Evaluasi Kapan Pun (Bebas Batas Waktu &amp; 1x Pakai)
              </p>
              <p>
                Link ini <strong>dapat diakses kapan pun tanpa batasan waktu</strong> (mengabaikan aturan 30 menit sebelum dan 2 jam sesudah kegiatan).
                Setiap link <strong>hanya dapat digunakan oleh 1 orang saja</strong>. Setelah formulir diisi dan dikirim, link otomatis hangus dan tidak dapat dipakai lagi.
              </p>
            </div>
          </div>

          {/* Tab Selector & Action Button */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="inline-flex p-1 bg-gray-100 rounded-xl">
              <button
                type="button"
                onClick={() => setActiveJenis("kegiatan")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeJenis === "kegiatan"
                    ? "bg-white text-teal-700 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <FontAwesomeIcon icon={faFileAlt} />
                <span>Evaluasi Kegiatan</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-teal-100 text-teal-800">
                  {kegiatanTokenCount}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setActiveJenis("narasumber")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeJenis === "narasumber"
                    ? "bg-white text-purple-700 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <FontAwesomeIcon icon={faUsers} />
                <span>Evaluasi Narasumber</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-purple-100 text-purple-800">
                  {narasumberTokenCount}
                </span>
              </button>
            </div>

            <button
              onClick={handleGenerate}
              disabled={generating}
              className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white shadow-sm transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                activeJenis === "kegiatan"
                  ? "bg-teal-600 hover:bg-teal-700 hover:shadow-md"
                  : "bg-purple-600 hover:bg-purple-700 hover:shadow-md"
              }`}
            >
              {generating ? (
                <FontAwesomeIcon icon={faSpinner} spin />
              ) : (
                <FontAwesomeIcon icon={faPlus} />
              )}
              <span>Generate Link {activeJenis === "kegiatan" ? "Kegiatan" : "Narasumber"} Baru</span>
            </button>
          </div>

          {/* Highlight Newly Generated Token */}
          {latestGenerated && latestGenerated.jenis === activeJenis && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 animate-fadeIn space-y-2">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                  <FontAwesomeIcon icon={faCheckCircle} className="text-emerald-600" />
                  Link Baru Berhasil Dibuat (Siap Dibagikan):
                </span>
                <span className="text-[11px] text-emerald-600">Hanya untuk 1x pengisian</span>
              </div>
              <div className="flex items-center gap-2 bg-white p-2.5 rounded-lg border border-emerald-300">
                <input
                  type="text"
                  readOnly
                  value={`${window.location.origin}/evaluasi-khusus/${latestGenerated.token}`}
                  className="flex-1 text-xs font-mono text-gray-800 bg-transparent focus:outline-hidden truncate"
                />
                <button
                  type="button"
                  onClick={() => copyUrl(latestGenerated.token, "latest")}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer"
                >
                  <FontAwesomeIcon icon={copiedId === "latest" ? faCheck : faCopy} />
                  <span>{copiedId === "latest" ? "Tersalin!" : "Salin Link"}</span>
                </button>
                <a
                  href={`${window.location.origin}/evaluasi-khusus/${latestGenerated.token}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 text-gray-500 hover:text-emerald-700 transition-colors"
                  title="Buka Link di Tab Baru"
                >
                  <FontAwesomeIcon icon={faExternalLinkAlt} />
                </a>
              </div>
            </div>
          )}

          {/* Token History List Header & Status Filter */}
          <div className="flex items-center justify-between pt-2">
            <h3 className="text-sm font-bold text-gray-900">
              Riwayat Link Evaluasi {activeJenis === "kegiatan" ? "Kegiatan" : "Narasumber"}
            </h3>
            <div className="flex items-center gap-1 text-xs">
              <button
                type="button"
                onClick={() => setFilterStatus("all")}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  filterStatus === "all"
                    ? "bg-gray-200 text-gray-800"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Semua ({tokens.filter((t) => t.jenis === activeJenis).length})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus("unused")}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  filterStatus === "unused"
                    ? "bg-emerald-100 text-emerald-800"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Belum Digunakan ({tokens.filter((t) => t.jenis === activeJenis && !t.is_used).length})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus("used")}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  filterStatus === "used"
                    ? "bg-gray-200 text-gray-800"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Sudah Digunakan ({tokens.filter((t) => t.jenis === activeJenis && t.is_used).length})
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="rounded-xl border border-gray-200 overflow-hidden shadow-2xs">
            <table className="w-full text-xs text-left">
              <thead className="bg-gray-50 text-gray-700 font-bold border-b border-gray-200">
                <tr>
                  <th className="px-3 py-2.5 w-10 text-center">No</th>
                  <th className="px-4 py-2.5">Link Evaluasi (1x Pakai)</th>
                  <th className="px-3 py-2.5 w-32 text-center">Status</th>
                  <th className="px-4 py-2.5 w-40">Waktu Dibuat</th>
                  <th className="px-4 py-2.5 w-40">Penggunaan</th>
                  <th className="px-3 py-2.5 w-24 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-400">
                      <FontAwesomeIcon icon={faSpinner} spin className="text-xl text-teal-600 mb-2" />
                      <p>Memuat daftar link khusus...</p>
                    </td>
                  </tr>
                ) : currentTokens.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-400">
                      Belum ada link evaluasi khusus untuk {activeJenis === "kegiatan" ? "kegiatan" : "narasumber"}.
                      <div className="mt-2">
                        <button
                          onClick={handleGenerate}
                          className="text-xs font-semibold text-teal-600 hover:underline"
                        >
                          Klik di sini untuk membuat link baru
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  currentTokens.map((t, idx) => {
                    const fullUrl = `${window.location.origin}/evaluasi-khusus/${t.token}`;
                    return (
                      <tr key={t.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="px-3 py-2.5 text-center text-gray-500 font-medium">
                          {idx + 1}
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-1.5 max-w-sm">
                            <span className="font-mono text-[11px] text-gray-700 truncate" title={fullUrl}>
                              {fullUrl}
                            </span>
                            <button
                              type="button"
                              onClick={() => copyUrl(t.token, t.id)}
                              className={`p-1.5 rounded-md text-xs transition-colors cursor-pointer ${
                                copiedId === t.id
                                  ? "text-emerald-700 bg-emerald-100"
                                  : "text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                              }`}
                              title="Salin Link"
                            >
                              <FontAwesomeIcon icon={copiedId === t.id ? faCheck : faCopy} />
                            </button>
                            {!t.is_used && (
                              <a
                                href={fullUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 text-gray-400 hover:text-teal-600 transition-colors"
                                title="Buka Link di Tab Baru"
                              >
                                <FontAwesomeIcon icon={faExternalLinkAlt} />
                              </a>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          {t.is_used ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-600 border border-gray-200">
                              <FontAwesomeIcon icon={faCheck} className="text-[9px]" />
                              Sudah Digunakan
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <FontAwesomeIcon icon={faCheckCircle} className="text-[9px]" />
                              Belum Digunakan
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-gray-500">
                          {formatDateTime(t.created_at)}
                        </td>
                        <td className="px-4 py-2.5 text-gray-600">
                          {t.is_used ? (
                            <div>
                              <p className="font-medium text-gray-800">{formatDateTime(t.used_at)}</p>
                              {t.used_by && (
                                <p className="text-[10px] text-gray-400 truncate max-w-xs">
                                  Oleh: {t.used_by}
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400 italic">-</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleDelete(t.id)}
                            disabled={deletingId === t.id}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer disabled:opacity-50"
                            title="Hapus Link"
                          >
                            {deletingId === t.id ? (
                              <FontAwesomeIcon icon={faSpinner} spin />
                            ) : (
                              <FontAwesomeIcon icon={faTrashAlt} />
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
          <span className="text-xs text-gray-500">
            Total {tokens.filter((t) => t.jenis === activeJenis).length} link ({activeJenis === "kegiatan" ? "Evaluasi Kegiatan" : "Evaluasi Narasumber"})
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-gray-200 hover:bg-gray-300 text-gray-700 transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

