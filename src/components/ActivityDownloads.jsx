import React, { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faDownload,
  faFolder,
  faImage,
  faSpinner,
  faExternalLinkAlt,
} from "@fortawesome/free-solid-svg-icons";
import { getApiHeaders } from "../config/api";

const BE_URL = import.meta.env.VITE_BE_URL || "http://localhost:8000";

function isExternalUrl(url) {
  if (!url || typeof url !== "string") return false;
  return url.startsWith("http://") || url.startsWith("https://");
}

function ActivityDownloads({ activity, overlay = false }) {
  const [loadingField, setLoadingField] = useState("");

  const rawMateri = activity?.materi_url || activity?.materi;
  const isMateriUrl = isExternalUrl(rawMateri);

  const rawVb = activity?.virtual_background_url || activity?.virtual_background;
  const isVbUrl = isExternalUrl(rawVb);

  const resources = [
    rawMateri
      ? {
          field: "materi",
          label: isMateriUrl ? "Buka Materi" : "Materi",
          icon: isMateriUrl ? faExternalLinkAlt : faFolder,
          isLink: isMateriUrl,
          url: rawMateri,
        }
      : null,
    rawVb
      ? {
          field: "virtual_background",
          label: isVbUrl ? "Buka Virtual Background" : "Virtual Background",
          icon: isVbUrl ? faExternalLinkAlt : faImage,
          isLink: isVbUrl,
          url: rawVb,
        }
      : null,
  ].filter(Boolean);

  if (!activity?.id || resources.length === 0) return null;

  const getDownloadUrl = (field) => {
    const endpoint = field === "materi" ? "materi" : "virtual-background";
    return `${BE_URL}/api/kegiatan/${encodeURIComponent(activity.id)}/download/${endpoint}`;
  };

  const buildProxyDownloadUrl = (rawUrl) => {
    if (!rawUrl) return "";
    return `${window.location.origin}/api/media/download/${encodeURIComponent(rawUrl)}`;
  };

  const getSafeDownloadUrl = (rawUrl) => {
    if (!rawUrl) return "";
    try {
      const parsed = new URL(rawUrl, window.location.origin);
      const backendOrigin = (() => {
        try {
          return new URL(BE_URL).origin;
        } catch {
          return "";
        }
      })();

      if (
        backendOrigin &&
        ["localhost", "127.0.0.1", "::1"].includes(parsed.hostname)
      ) {
        const backend = new URL(backendOrigin);
        parsed.protocol = backend.protocol;
        parsed.host = backend.host;
      }

      if (window.location.protocol === "https:" && parsed.protocol === "http:") {
        parsed.protocol = "https:";
      }

      return parsed.toString();
    } catch {
      return rawUrl;
    }
  };

  const handleDownload = async (field, label) => {
    const fileUrl = getDownloadUrl(field);
    const safeFileUrl = getSafeDownloadUrl(fileUrl);
    const proxyDownloadUrl = buildProxyDownloadUrl(safeFileUrl);
    const headers = await getApiHeaders();

    setLoadingField(field);
    try {
      let response;
      try {
        response = await fetch(safeFileUrl, {
          method: "GET",
          mode: "cors",
          credentials: "include",
          headers,
        });
      } catch {
        response = null;
      }

      if (!response || !response.ok) {
        response = await fetch(proxyDownloadUrl, {
          method: "GET",
          mode: "cors",
          credentials: "include",
          headers,
        });
      }

      if (!response.ok) {
        throw new Error(`Download failed with status ${response.status}`);
      }

      const blob = await response.blob();
      const disposition = response.headers.get("content-disposition") || "";
      const match = disposition.match(/filename\*?=(?:UTF-8''|\")?([^;\"]+)/i);
      const fileNameFromUrl = (() => {
        try {
          const pathname = new URL(safeFileUrl).pathname;
          return pathname.split("/").pop() || `${label}.bin`;
        } catch {
          return `${label}.bin`;
        }
      })();
      const fileName = decodeURIComponent(
        (match?.[1] || fileNameFromUrl).replace(/\"/g, "").trim(),
      );

      const blobUrl = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = blobUrl;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Failed to download activity file:", error);
    } finally {
      setLoadingField("");
    }
  };

  return (
    <section
      onClick={(e) => {
        if (overlay) e.stopPropagation();
      }}
      className={`${overlay ? "absolute inset-x-3 bottom-3 z-20" : "mt-4"} rounded-xl border border-gray-200/80 dark:border-gray-700 bg-white/90 dark:bg-gray-900/85 backdrop-blur-sm shadow-lg overflow-hidden transition-all duration-300 ease-out ${overlay ? "pointer-events-auto" : ""}`}
    >
      <div className={`${overlay ? "px-3 py-2" : "p-3"}`}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 font-semibold text-gray-900 dark:text-white">
              <span className="text-xs">Materi & Virtual Background</span>
            </div>
          </div>
        </div>

        <div
          className={`grid gap-2 transition-all duration-300 ease-out ${overlay ? "mt-0 max-h-0 translate-y-2 opacity-0 overflow-hidden group-hover:mt-3 group-hover:max-h-40 group-hover:translate-y-0 group-hover:opacity-100" : "mt-3 grid-cols-1 sm:grid-cols-2"}`}
        >
          {resources.map((resource) => {
            const isLoading = loadingField === resource.field;
            return (
              <button
                key={resource.field}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (resource.isLink && resource.url) {
                    window.open(resource.url, "_blank", "noopener,noreferrer");
                  } else {
                    handleDownload(resource.field, resource.label);
                  }
                }}
                disabled={isLoading}
                className={`w-full inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition shadow-sm disabled:cursor-not-allowed disabled:opacity-70 ${resource.field === "materi" ? "bg-teal-500 text-white hover:bg-teal-600" : "bg-purple-500 text-white hover:bg-purple-600"}`}
              >
                <FontAwesomeIcon
                  icon={isLoading ? faSpinner : resource.icon}
                  spin={isLoading}
                  className="text-white"
                />
                {isLoading ? "Mengunduh..." : resource.label}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default ActivityDownloads;