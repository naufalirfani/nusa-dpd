import React from "react";
import { useNavigate } from "react-router-dom";
import { useI18n } from "../i18n";
import { logout } from "../config/keycloak";
import logoPath from "../assets/logo.png";

function UserNotFound() {
  const { t } = useI18n();
  const navigate = useNavigate();

  const handleLogout = () => {
    try {
      // Clear local storage
      localStorage.removeItem("token");
      localStorage.removeItem("auth");
      localStorage.removeItem("userProfile");
      localStorage.removeItem("keycloak_access_token");
      localStorage.removeItem("keycloak_id_token");
      localStorage.removeItem("keycloak_refresh_token");

      // Logout from Keycloak
      logout();
    } catch (error) {
      console.error("Logout error:", error);
      // Fallback: just navigate to login
      navigate("/login", { replace: true });
    }
  };

  return (
    <div className="min-h-screen overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 -z-10 animate-gradient bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-teal-200 via-sky-100 to-white"></div>

      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="mb-6">
            <img
              src={logoPath}
              alt="Logo"
              className="h-20 w-auto mx-auto mb-4"
            />
          </div>

          <div className="mb-6">
            <svg
              className="mx-auto h-24 w-24 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-3">
            {t?.userNotFound || "Pengguna Tidak Ditemukan"}
          </h1>

          <p className="text-gray-600 mb-6">
            {t?.userNotFoundMessage ||
              "Akun Anda tidak ditemukan dalam sistem. Silakan hubungi administrator untuk bantuan."}
          </p>

          <button
            onClick={handleLogout}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-lg transition duration-200 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            {t?.logout || "Keluar"}
          </button>

          <p className="mt-4 text-sm text-gray-500">
            {t?.needHelp || "Butuh bantuan?"}{" "}
            <a
              href="mailto:sdm@dpd.go.id"
              className="text-blue-600 hover:text-blue-800 underline"
            >
              {t?.contactSupport || "Hubungi Support"}
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default UserNotFound;
