import React from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faMoon,
  faSun,
  faUser,
  faRightFromBracket,
} from "@fortawesome/free-solid-svg-icons";
import { useTheme } from "../stores/theme";
import logoPath from "../assets/logo.png";

function Header({ userName, userNip, showNip, onProfileClick, onLogout, showProfile = true, showLogout = true }) {
  const { isDarkMode, toggleTheme } = useTheme();
  const navigate = useNavigate();

  return (
    <header className="relative z-1 overflow-hidden bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 dark:from-gray-900 dark:via-slate-900 dark:to-gray-800">
      {/* Decorative Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Gradient Orbs */}
        <div className="absolute -top-24 -left-24 w-72 h-72 bg-gradient-to-br from-teal-400/20 to-cyan-400/20 dark:from-teal-500/10 dark:to-cyan-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -top-12 right-1/4 w-56 h-56 bg-gradient-to-br from-blue-400/15 to-indigo-400/15 dark:from-blue-500/10 dark:to-indigo-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute -bottom-20 right-0 w-64 h-64 bg-gradient-to-br from-cyan-400/20 to-teal-400/20 dark:from-teal-500/10 dark:to-teal-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
        
        {/* Geometric Pattern */}
        <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]" 
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
        
        {/* Decorative Lines */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-teal-500/50 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gray-300/50 dark:via-gray-600/50 to-transparent" />
      </div>

      <div className="relative mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mt-6 mb-4 flex flex-col sm:flex-row items-center sm:justify-between gap-4">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
          >
            <img
              src={logoPath}
              alt="Logo"
              className="h-12 w-12 object-contain"
            />
            <div>
              <div className="text-left text-xl font-semibold text-gray-900 dark:text-white tracking-tight">
                NUSA - <i className="font-semibold">Nurturing Smart</i> ASN
              </div>
              <p className="text-gray-600 dark:text-gray-300">
                Portal Pengembangan Sumber Daya Manusia Sekretariat Jenderal DPD
                RI
              </p>
            </div>
          </button>

          <div className="flex items-center gap-3 sm:flex-shrink-0">
            {/* Dark Mode Toggle Switch */}
            {/* <button
              onClick={toggleTheme}
              className="relative inline-flex items-center gap-2 rounded-full bg-white/70 dark:bg-gray-800/70 backdrop-blur border border-gray-200 dark:border-gray-700 px-1 py-1 hover:shadow-md transition-all"
              title={isDarkMode ? "Ubah ke Mode Terang" : "Ubah ke Mode Gelap"}
            >
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300 ${
                  isDarkMode
                    ? "bg-gray-800 text-gray-300"
                    : "bg-gray-100 text-yellow-400"
                }`}
              >
                <FontAwesomeIcon
                  icon={isDarkMode ? faMoon : faSun}
                  className="h-5 w-5"
                />
              </div>
            </button> */}

            {showProfile && userName && (
              onProfileClick ? (
                <button
                  className="flex items-center gap-2 rounded-lg bg-white/70 dark:bg-gray-800/70 backdrop-blur border border-gray-200 dark:border-gray-700 px-3 py-2 text-gray-700 dark:text-gray-300 hover:shadow-md transition"
                  onClick={onProfileClick}
                >
                  <FontAwesomeIcon
                    icon={faUser}
                    className="h-5 w-5 text-teal-500 dark:text-teal-400"
                  />
                  <div className="text-left">
                    <div className="font-medium leading-4">{userName}</div>
                    {showNip && (
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        NIP {userNip}
                      </div>
                    )}
                    {!showNip && (
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {userNip}
                      </div>
                    )}
                  </div>
                </button>
              ) : (
                <div className="flex items-center gap-2 rounded-lg bg-white/70 dark:bg-gray-800/70 backdrop-blur border border-gray-200 dark:border-gray-700 px-3 py-2 text-gray-700 dark:text-gray-300">
                  <FontAwesomeIcon
                    icon={faUser}
                    className="h-5 w-5 text-teal-500 dark:text-teal-400"
                  />
                  <div className="text-left">
                    <div className="font-medium leading-4">{userName}</div>
                    {showNip && (
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        NIP {userNip}
                      </div>
                    )}
                    {!showNip && (
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {userNip}
                      </div>
                    )}
                  </div>
                </div>
              )
            )}
            {showLogout && onLogout && (
              <button
                onClick={onLogout}
                className="inline-flex items-center gap-2 rounded-lg bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-800 px-3 py-2 hover:bg-rose-100 dark:hover:bg-rose-900/50 transition"
              >
                <FontAwesomeIcon icon={faRightFromBracket} className="h-5 w-5" />
                <span className="hidden sm:flex">Keluar</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;
