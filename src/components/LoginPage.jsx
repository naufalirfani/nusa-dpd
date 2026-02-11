import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useI18n } from "../i18n";
import { useTheme } from "../stores/theme";
import { encryptTokenForHeader } from "../utils/crypto";
import { generateSsoToken } from "../config/api";
import { login } from "../config/keycloak";
import logoPath from "../assets/logo.png";
import logoCmbPath from "../assets/logo_cmb.png";
import logoLmsPath from "../assets/logo_lms.png";
import logoSimantapPath from "../assets/logo_simantap.png";
import logoKmsPath from "../assets/logo_kms.png";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faSun,
  faMoon,
  faChevronDown,
  faArrowRight,
  faSpinner,
  faPaperPlane,
  faEye,
  faEyeSlash,
} from "@fortawesome/free-solid-svg-icons";

const JWT_EXPIRES = parseInt(import.meta.env.VITE_JWT_EXPIRES, 10) || 3600;
const SSO_API_TOKEN = import.meta.env.VITE_SSO_GENERATE_TOKEN || "";

function LoginPage() {
  const { t, locale, setLocale } = useI18n();
  const { isDarkMode, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState("");
  const [code, setCode] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [nipError, setNipError] = useState("");
  const [showCode, setShowCode] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [open, setOpen] = useState(false);

  const captchaCanvasRef = useRef(null);
  const dropdownRef = useRef(null);

  const logo = logoPath;

  useEffect(() => {
    const ssoEnabled = import.meta.env.VITE_ENABLE_SSO === "true";
    if (ssoEnabled) {
      try {
        // Capture redirect and app parameters from URL
        const urlParams = new URLSearchParams(window.location.search);
        let redirectUrl = urlParams.get("redirect");
        const appParam = urlParams.get("app");

        // If the current URL is not the app root or dashboard, use the current path
        // e.g., accessing /activities should redirect back to /activities after SSO
        const currentFull = `${window.location.origin}${window.location.pathname}`;
        const isRootOrDashboard =
          currentFull === "http://localhost:5173" ||
          currentFull === "http://localhost:5173/" ||
          currentFull === "http://localhost:5173/dashboard";

        if (!isRootOrDashboard) {
          const currentPathWithQuery = `${window.location.pathname}${window.location.search}${window.location.hash || ""}`;
          redirectUrl = redirectUrl || currentPathWithQuery;
        }

        // Store redirect URL in sessionStorage if provided
        if (redirectUrl) {
          sessionStorage.setItem("redirect_after_login", redirectUrl);
          localStorage.setItem("redirect_after_login", redirectUrl);
        }

        // Store app parameter in sessionStorage if provided
        if (appParam) {
          sessionStorage.setItem("app_after_login", appParam);
          localStorage.setItem("app_after_login", appParam);
        }

        // Redirect to Keycloak login using keycloak-js
        login();
      } catch (e) {
        console.error("[LoginPage] SSO redirect failed", e);
      }
    }
  }, []);

  const portalCards = [
    {
      key: "cmb",
      title: "CMB",
      badge: "Coaching · Mentoring · Mandiri",
      desc: "Platform pembelajaran internal untuk penguatan kompetensi.",
      bg: "bg-teal-200",
      logo: logoCmbPath,
    },
    {
      key: "lms",
      title: "LMS",
      badge: "Learning Management System",
      desc: "Modul, kuis, dan sertifikat pembelajaran terstruktur.",
      bg: "bg-purple-200",
      logo: logoLmsPath,
    },
    {
      key: "simantap",
      title: "SIMANTAP",
      badge: "Sistem Manajemen Talenta Pegawai",
      desc: "Manajemen talenta, penilaian, dan pengembangan karir pegawai.",
      bg: "bg-amber-200",
      logo: logoSimantapPath,
    },
    {
      key: "kms",
      title: "KMS",
      badge: "Knowledge Management Center",
      desc: "Pusat pengetahuan untuk berbagi informasi dan best practices.",
      bg: "bg-emerald-200",
      logo: logoKmsPath,
    },
  ];

  function generateCode(len = 6) {
    const chars = "abcdefghijklmnopqrstuvwxyzABDEFGHIJKLMNPQRTUY0123456789";
    let out = "";
    for (let i = 0; i < len; i++)
      out += chars.charAt(Math.floor(Math.random() * chars.length));
    setVerificationCode(out);
    return out;
  }

  function rand(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function drawCaptcha(code) {
    const canvas = captchaCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const w = canvas.width;
    const h = canvas.height;

    // background
    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(0, 0, w, h);

    // noise lines
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.moveTo(rand(0, w), rand(0, h));
      ctx.lineTo(rand(0, w), rand(0, h));
      ctx.strokeStyle = `rgba(${rand(100, 180)},${rand(100, 180)},${rand(100, 180)},${(Math.random() * 0.4 + 0.2).toFixed(2)})`;
      ctx.lineWidth = Math.random() * 1.5 + 0.5;
      ctx.stroke();
    }

    // draw characters
    const text = code || "";
    const charSpace = w / (text.length + 1);
    for (let i = 0; i < text.length; i++) {
      const chr = text.charAt(i);
      const fontsize = rand(30, 36);
      const x = charSpace * (i + 0.6);
      const y = rand(h - 10, h - 8);
      const angle = (Math.random() - 0.5) * 0.6;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.font = `${fontsize}px monospace`;
      ctx.fillStyle = `rgba(${rand(20, 80)},${rand(20, 80)},${rand(20, 80)},${(Math.random() * 0.6 + 0.4).toFixed(2)})`;
      ctx.fillText(chr, -fontsize / 2, 0);
      ctx.restore();
    }

    // dots
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = `rgba(${rand(0, 200)},${rand(0, 200)},${rand(0, 200)},${(Math.random() * 0.6).toFixed(2)})`;
      ctx.beginPath();
      ctx.arc(rand(0, w), rand(0, h), Math.random() * 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  useEffect(() => {
    const code = generateCode();
    drawCaptcha(code);
  }, []);

  useEffect(() => {
    function onDocClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  function onIdentifierInput(e) {
    const val = (e.target.value || "").trim();
    const hasLetter = /[A-Za-z]/.test(val);
    if (val.includes("@") || hasLetter) {
      const cleaned = val.slice(0, 254);
      setIdentifier(cleaned);
      const ok = /^\S+@\S+\.\S+$/.test(cleaned);
      if (ok) setNipError("");
    } else {
      const cleaned = val.replace(/\D/g, "").slice(0, 18);
      setIdentifier(cleaned);
      if (cleaned.length === 18) setNipError("");
    }
  }

  async function createJwt(payload = {}, expiresInSeconds = 3600) {
    const identifierVal =
      payload && (payload.identifier || payload.nip)
        ? payload.identifier || payload.nip
        : "";
    if (!identifierVal)
      throw new Error(
        "Identifier (NIP or email) is required to generate token",
      );

    const expMinutes = Math.ceil(expiresInSeconds / 60);
    let apiToken = SSO_API_TOKEN;

    if (apiToken) {
      try {
        apiToken = await encryptTokenForHeader(apiToken, { salt: apiToken });
      } catch (e) {
        // Use raw token if encryption fails
      }
    }

    return await generateSsoToken(identifierVal, apiToken, expMinutes);
  }

  function handleGenerateCode() {
    const code = generateCode();
    drawCaptcha(code);
  }

  function sendCode() {
    if (!identifier) {
      if (typeof window.Swal !== "undefined")
        window.Swal.fire({ icon: "warning", title: t("enter_nip") });
      else alert(t("enter_nip"));
      return;
    }
    const isEmail = identifier.includes("@");
    if (isEmail) {
      const ok = /^\S+@\S+\.\S+$/.test(identifier);
      if (!ok) {
        if (typeof window.Swal !== "undefined")
          window.Swal.fire({ icon: "warning", title: t("invalid_nip") });
        else alert(t("invalid_nip"));
        return;
      }
    } else {
      if (identifier.length !== 18) {
        if (typeof window.Swal !== "undefined")
          window.Swal.fire({ icon: "warning", title: t("invalid_nip") });
        else alert(t("invalid_nip"));
        return;
      }
    }
    setSending(true);
    setTimeout(() => {
      handleGenerateCode();
      setSending(false);
      if (typeof window.Swal !== "undefined")
        window.Swal.fire({ icon: "success", title: t("code_generated") });
      else alert(t("code_generated"));
    }, 400);
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (!identifier) {
      if (typeof window.Swal !== "undefined")
        window.Swal.fire({ icon: "warning", title: t("enter_nip") });
      else alert(t("enter_nip"));
      return;
    }
    const isEmail = identifier.includes("@");
    if (isEmail) {
      const ok = /^\S+@\S+\.\S+$/.test(identifier);
      if (!ok) {
        setNipError(t("invalid_nip"));
        if (typeof window.Swal !== "undefined")
          window.Swal.fire({ icon: "warning", title: t("invalid_nip") });
        else alert(t("invalid_nip"));
        return;
      }
    } else {
      if (identifier.length !== 18) {
        setNipError(t("invalid_nip"));
        if (typeof window.Swal !== "undefined")
          window.Swal.fire({ icon: "warning", title: t("invalid_nip") });
        else alert(t("invalid_nip"));
        return;
      }
    }
    if (!code) {
      if (typeof window.Swal !== "undefined")
        window.Swal.fire({ icon: "warning", title: t("enter_code") });
      else alert(t("enter_code"));
      return;
    }
    if (code.trim() === verificationCode) {
      const doSuccess = async () => {
        setLoading(true);
        try {
          const token = await createJwt({ identifier }, JWT_EXPIRES);
          localStorage.setItem("token", token);
          localStorage.setItem("auth", "1");
        } catch (err) {
          localStorage.setItem("auth", "1");
          if (typeof window.Swal !== "undefined") {
            await window.Swal.fire({
              icon: "warning",
              title: t("verify_success"),
              text:
                t("token_generate_failed") ||
                "Token generation failed — continuing in demo mode.",
            });
          }
        } finally {
          setLoading(false);
        }
        setNipError("");
        navigate("/");
      };

      if (typeof window.Swal !== "undefined") {
        window.Swal.fire({
          icon: "success",
          title: t("verify_success"),
          showConfirmButton: false,
          timer: 900,
        }).then(doSuccess);
      } else {
        doSuccess();
      }
    } else {
      if (typeof window.Swal !== "undefined")
        window.Swal.fire({ icon: "error", title: t("verify_fail") });
      else alert(t("verify_fail"));
    }
  }

  function openPortal(card) {
    const message = `Silakan login terlebih dahulu untuk mengakses portal ${card.title}.`;
    if (typeof window.Swal !== "undefined") {
      window.Swal.fire({ icon: "info", title: "Portal", text: message });
    } else {
      alert(message);
    }
  }

  function toggleDropdown() {
    setOpen(!open);
  }

  function selectLocale(code) {
    setLocale(code);
    setOpen(false);
  }

  return (
    <div className="relative min-h-screen overflow-hidden pb-6 bg-slate-50 dark:bg-gray-900">
      {/* Animated gradient background */}
      <div className="absolute inset-0 -z-10 animate-gradient bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-teal-200 via-sky-100 to-white dark:from-teal-900/30 dark:via-sky-900/20 dark:to-gray-900"></div>

      {/* Language & Theme Toggle dropdown */}
      <div className="absolute right-4 top-4 z-20 flex items-center gap-2">
        {/* Dark Mode Toggle */}
        <button
          onClick={toggleTheme}
          className="flex items-center justify-center rounded-full bg-white/80 dark:bg-gray-800/80 p-2.5 shadow-md ring-1 ring-black/5 backdrop-blur hover:bg-white dark:hover:bg-gray-800"
          title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          <FontAwesomeIcon
            icon={isDarkMode ? faSun : faMoon}
            className="text-lg"
          />
        </button>

        <div className="relative" ref={dropdownRef}>
          <button
            onClick={toggleDropdown}
            type="button"
            className="inline-flex items-center gap-2 rounded-full bg-white/80 dark:bg-gray-800/80 px-4 py-2 shadow-md ring-1 ring-black/5 backdrop-blur hover:bg-white dark:hover:bg-gray-800"
          >
            <span className="font-medium text-gray-700 dark:text-gray-300">
              {locale === "id" ? t("lang_id") : t("lang_en")}
            </span>
            <FontAwesomeIcon
              icon={faChevronDown}
              className="text-gray-500 dark:text-gray-400 text-sm"
            />
          </button>
          {open && (
            <ul className="absolute right-0 mt-2 w-44 overflow-hidden rounded-lg bg-white/95 dark:bg-gray-800/95 shadow-md ring-1 ring-black/5 backdrop-blur-sm z-10 transition-opacity duration-120">
              <li>
                <button
                  onClick={() => selectLocale("id")}
                  type="button"
                  className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <img
                    src="https://flagcdn.com/w40/id.png"
                    alt="Indonesia"
                    className="h-4 w-6 rounded-sm ring-1 ring-gray-200/50 object-cover"
                  />
                  <span className="text-gray-700 dark:text-gray-300">
                    {t("lang_id")} — Indonesian
                  </span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => selectLocale("en")}
                  type="button"
                  className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <img
                    src="https://flagcdn.com/w40/gb.png"
                    alt="English"
                    className="h-4 w-6 rounded-sm ring-1 ring-gray-200/50 object-cover"
                  />
                  <span className="text-gray-700 dark:text-gray-300">
                    {t("lang_en")} — English
                  </span>
                </button>
              </li>
            </ul>
          )}
        </div>
      </div>

      {/* Main grid */}
      <div className="relative mx-auto grid grid-cols-1 items-center gap-8 px-6 py-12 sm:px-8 lg:grid-cols-2 lg:py-16">
        {/* Left hero */}
        <div className="order-1">
          <div className="mb-6 flex items-center gap-3">
            <img src={logo} alt="Logo" className="h-16 w-auto drop-shadow-md" />
            <div className="text-2xl font-semibold tracking-tight text-gray-800 dark:text-gray-200">
              NUSA DPD
              <p className="text-[16px] text-gray-600 dark:text-gray-400 !pt-0 leading-[1.5]">
                <i>Nurturing Smart</i> ASN DPD - Portal Pengembangan Sumber Daya
                Manusia
              </p>
            </div>
          </div>

          <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-gray-900 dark:text-white sm:text-4xl">
            {t("title")}
          </h1>
          <p className="mt-3 max-w-prose text-base text-gray-600 dark:text-gray-300 sm:text-lg">
            {t("subtitle")}
          </p>

          {/* Feature bullets */}
          <ul className="mt-8 grid grid-cols-1 gap-3 text-gray-700 dark:text-gray-300 sm:grid-cols-2">
            <li className="flex items-center gap-3 rounded-xl bg-white/70 dark:bg-gray-800/70 p-3 shadow-md ring-1 ring-black/5 backdrop-blur">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-500 text-white shadow-md">
                ★
              </span>
              <span>SSO-backed secure access</span>
            </li>
            <li className="flex items-center gap-3 rounded-xl bg-white/70 dark:bg-gray-800/70 p-3 shadow-md ring-1 ring-black/5 backdrop-blur">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-500 text-white shadow-md">
                ✓
              </span>
              <span>Fast OTP verification</span>
            </li>
            <li className="flex items-center gap-3 rounded-xl bg-white/70 dark:bg-gray-800/70 p-3 shadow-md ring-1 ring-black/5 backdrop-blur">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500 text-white shadow-md">
                ⚡
              </span>
              <span>Optimized for performance</span>
            </li>
            <li className="flex items-center gap-3 rounded-xl bg-white/70 dark:bg-gray-800/70 p-3 shadow-md ring-1 ring-black/5 backdrop-blur">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-500 text-white shadow-md">
                ♡
              </span>
              <span>Clean and modern UI</span>
            </li>
          </ul>

          {/* Portal preview grid */}
          <div className="mt-10">
            <h3 className="font-semibold tracking-wide text-gray-700 dark:text-gray-300">
              Portal tujuan
            </h3>
            <p className="mt-1 text-gray-500 dark:text-gray-400">
              Satu pintu menuju layanan pembelajaran dan pengembangan.
            </p>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {portalCards.map((card) => (
                <button
                  key={card.key}
                  type="button"
                  className="group relative flex items-center gap-4 overflow-hidden rounded-xl border border-gray-100 dark:border-gray-700 bg-white/70 dark:bg-gray-800/70 p-4 text-left shadow-md ring-1 ring-black/5 backdrop-blur transition hover:-translate-y-0.5 hover:shadow-md"
                  onClick={() => openPortal(card)}
                >
                  <span
                    className={`absolute -right-10 -top-10 h-24 w-24 rounded-full opacity-20 transition group-hover:opacity-30 ${card.bg}`}
                  ></span>
                  {card.logo && (
                    <img
                      src={card.logo}
                      alt={`${card.title} logo`}
                      className="relative z-[1] h-12 w-12 rounded-md object-cover shadow-inner"
                    />
                  )}
                  <div className="relative z-[1]">
                    <div className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                      {card.title}
                      <span className="ml-2 inline-flex items-center rounded-full bg-gray-900/5 dark:bg-gray-100/10 px-2 py-0.5 text-xs font-medium text-gray-600 dark:text-gray-300">
                        {card.badge}
                      </span>
                    </div>
                    <p className="mt-0.5 text-gray-500">{card.desc}</p>
                    <div className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-teal-700">
                      <span>Akses setelah login</span>
                      <FontAwesomeIcon
                        icon={faArrowRight}
                        className="text-base"
                      />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Auth card */}
        <div className="order-2">
          <div className="relative mx-auto w-full max-w-md">
            <div className="absolute inset-0 -z-10 rounded-3xl bg-gradient-to-br from-white/80 to-white/40 dark:from-gray-800/80 dark:to-gray-800/40 shadow-lg ring-1 ring-black/5 backdrop-blur-xl"></div>
            <div className="relative rounded-3xl p-6 sm:p-8">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
                {t("welcome")}
              </h2>
              <p className="mt-1 text-gray-500 dark:text-gray-400">
                Silakan masukkan NIP dan kode verifikasi untuk masuk.
              </p>

              <form onSubmit={onSubmit} className="mt-6 space-y-5">
                {/* NIP/Email input */}
                <div>
                  <label className="mb-1 block font-medium text-gray-700 dark:text-gray-300">
                    NIP atau Email
                  </label>
                  <div className="relative">
                    <input
                      value={identifier}
                      onChange={onIdentifierInput}
                      type="text"
                      inputMode="text"
                      maxLength={254}
                      className="peer nip-input w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-900/70 px-4 py-3 text-gray-900 dark:text-gray-100 shadow-md outline-none ring-0 transition focus:border-teal-400 focus:bg-white dark:focus:bg-gray-900 focus:ring-2 focus:ring-teal-100 dark:focus:ring-teal-900/50"
                      placeholder="198001012000000000 or email@example.com"
                      aria-describedby="identifierHelp"
                    />
                    <span className="pointer-events-none absolute left-3 top-1.5 -translate-y-1/2 bg-transparent px-1 text-xs text-gray-500 dark:text-gray-400 transition-all peer-placeholder-shown:top-1/2 peer-placeholder-shown:text-sm peer-focus:top-1.5 peer-focus:text-xs">
                      NIP (18 digit) atau Email
                    </span>
                  </div>
                  {nipError && (
                    <p
                      id="identifierHelp"
                      className="mt-2 text-sm text-rose-600 dark:text-rose-400"
                    >
                      {nipError}
                    </p>
                  )}
                </div>

                {/* Captcha */}
                <div>
                  <label className="mb-1 block font-medium text-gray-700 dark:text-gray-300">
                    {t("code")}
                  </label>
                  <div className="flex items-center gap-2">
                    <canvas
                      ref={captchaCanvasRef}
                      width="220"
                      height="48"
                      className="h-12 w-[220px] rounded-xl border border-gray-200 bg-white/70 shadow-md cursor-pointer"
                      title="Click to refresh"
                      onClick={handleGenerateCode}
                      aria-label="Captcha image showing verification code"
                    ></canvas>
                    <button
                      type="button"
                      onClick={sendCode}
                      title={t("refresh")}
                      aria-label="Refresh verification code"
                      disabled={
                        sending ||
                        (identifier.includes("@")
                          ? false
                          : identifier.length !== 18)
                      }
                      className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-500 to-sky-500 px-4 text-white shadow-md transition hover:from-teal-600 hover:to-sky-600 disabled:opacity-50 disabled:shadow-none"
                    >
                      {sending ? (
                        <FontAwesomeIcon
                          icon={faSpinner}
                          spin
                          className="text-base"
                        />
                      ) : (
                        <FontAwesomeIcon
                          icon={faPaperPlane}
                          className="text-base"
                        />
                      )}
                    </button>
                  </div>

                  {/* Code input */}
                  <div className="mt-3">
                    <div className="relative">
                      <input
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        type={showCode ? "text" : "password"}
                        autoComplete="one-time-code"
                        className="w-full rounded-xl border border-gray-200 bg-gray-50/70 px-4 py-3 pr-12 text-gray-900 placeholder:text-gray-400 shadow-md outline-none focus:border-teal-400 focus:bg-white focus:ring-2 focus:ring-teal-100"
                        placeholder="XXXXXX"
                        aria-label="Verification code"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCode(!showCode)}
                        className="absolute inset-y-0 right-3 my-auto inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100"
                      >
                        <FontAwesomeIcon
                          icon={showCode ? faEyeSlash : faEye}
                          className="text-lg"
                        />
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={loading}
                    aria-busy={loading}
                    className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-500 to-sky-500 px-5 py-3 font-medium text-white shadow-md transition hover:from-teal-600 hover:to-sky-600 disabled:opacity-50"
                  >
                    {loading && (
                      <FontAwesomeIcon
                        icon={faSpinner}
                        spin
                        className="text-base"
                      />
                    )}
                    <span>{loading ? t("login") + "..." : t("login")}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
      <div className="mt-10 text-xs text-gray-500 text-center">
        &copy; 2025. BPSDM. All rights reserved.
      </div>

      <style>{`
        @keyframes gradientMove {
          0% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
          100% { transform: translateY(0); }
        }
        .animate-gradient { animation: gradientMove 12s ease-in-out infinite; }
        .nip-input::placeholder { color: transparent !important; transition: color 0.15s ease; }
        .nip-input:focus::placeholder { color: rgba(156, 163, 175, 1) !important; }
      `}</style>
    </div>
  );
}

export default LoginPage;
