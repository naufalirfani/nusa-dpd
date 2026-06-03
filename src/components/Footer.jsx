import React from "react";
import logoPath from "../assets/logo.png";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEnvelope, faMapMarkerAlt } from "@fortawesome/free-solid-svg-icons";

function Footer() {
  return (
    <footer id="footer" className="relative overflow-hidden">
      {/* Modern gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-800 via-slate-900 to-gray-900"></div>

      {/* Decorative elements */}
      <div className="absolute inset-0">
        <div className="absolute top-10 right-10 w-80 h-80 bg-gradient-to-br from-teal-500/10 to-cyan-500/10 rounded-full mix-blend-multiply filter blur-3xl"></div>
        <div className="absolute bottom-10 left-10 w-96 h-96 bg-gradient-to-tr from-blue-500/10 to-purple-500/10 rounded-full mix-blend-multiply filter blur-3xl"></div>
      </div>

      <div className="relative z-1">
        <div className="mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="w-full flex items-center justify-between gap-6 flex-nowrap text-sm text-gray-300 overflow-x-auto">
            {/* Left: logo + title */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <img
                src={logoPath}
                alt="Logo"
                className="h-10 w-auto rounded-lg"
              />
              <div className="text-white text-base font-semibold">
                NUSA -{" "}
                <i>
                  <b>Nurturing Smart</b>
                </i>{" "}
                ASN
              </div>
            </div>

            {/* Middle: contact info inline */}
            <div className="flex items-center gap-6 flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-lg flex items-center justify-center">
                  <FontAwesomeIcon
                    icon={faEnvelope}
                    className="w-3.5 h-3.5 text-white"
                  />
                </div>
                <span className="text-gray-300">sdm@dpd.go.id</span>
              </div>

              <div className="h-6 w-px bg-slate-600/40" />

              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-lg flex items-center justify-center">
                  <FontAwesomeIcon
                    icon={faMapMarkerAlt}
                    className="w-3.5 h-3.5 text-white"
                  />
                </div>
                <span className="text-gray-300">
                  Lantai 4, Gedung B, DPD RI
                </span>
              </div>
            </div>

            {/* Right: copyright */}
            <div className="flex-shrink-0 text-gray-400">
              &copy; 2026 BPSDM - SETJEN DPD RI
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
