import React from 'react';
import logoPath from '../assets/logo.png';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEnvelope, faMapMarkerAlt } from '@fortawesome/free-solid-svg-icons';

function Footer() {
  return (
    <footer id="footer" className="relative overflow-hidden">
      {/* Modern gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-800 via-slate-900 to-gray-900"></div>

      {/* Decorative elements */}
      <div className="absolute inset-0">
        <div className="absolute top-20 right-20 w-80 h-80 bg-gradient-to-br from-teal-500/10 to-cyan-500/10 rounded-full mix-blend-multiply filter blur-3xl"></div>
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-gradient-to-tr from-blue-500/10 to-purple-500/10 rounded-full mix-blend-multiply filter blur-3xl"></div>
      </div>

      <div className="relative z-1">
        <div className="mx-auto px-4 sm:px-6 lg:px-12 pt-16 pb-8">
          {/* App info */}
          <div className="text-center mb-12">
            <div className="md:flex items-center justify-center space-x-4 mb-6">
              <div className="flex items-center justify-center">
                <img src={logoPath} alt="Logo" className="h-14 w-auto rounded-lg" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white inline-block relative">
                  NUSA - <i><b>Nurturing Smart</b></i> ASN
                  <span className="block h-1 bg-gradient-to-r from-teal-500 to-cyan-600 rounded-full mt-2"></span>
                </h2>
              </div>
            </div>

            {/* Contact info */}
            <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-8">
              <div className="flex flex-col items-center text-center sm:flex-row sm:items-center sm:text-left space-y-2 sm:space-y-0 sm:space-x-3 text-gray-300">
                <div className="w-8 h-8 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-lg flex items-center justify-center">
                  <FontAwesomeIcon icon={faEnvelope} className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-400">Email</p>
                  <p className="text-sm">sdm@dpd.go.id</p>
                </div>
              </div>

              <div className="flex flex-col items-center text-center sm:flex-row sm:items-center sm:text-left space-y-2 sm:space-y-0 sm:space-x-3 text-gray-300">
                <div className="w-8 h-8 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-lg flex items-center justify-center">
                  <FontAwesomeIcon icon={faMapMarkerAlt} className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-400">Lokasi</p>
                  <p className="text-sm">Lantai 4, Gedung B, Setjen DPD RI</p>
                </div>
              </div>
            </div>
          </div>

          {/* Copyright */}
          <div className="border-t border-slate-700/50 pt-8">
            <p className="text-center text-sm text-gray-400">
              &copy; 2025. BPSDM. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
