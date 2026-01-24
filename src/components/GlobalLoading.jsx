import React from 'react';
import { useLoading } from '../stores/loading';

function GlobalLoading() {
  const { loading } = useLoading();

  if (!loading) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-200"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      {/* Dim/blurred backdrop with subtle aurora blobs */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm"></div>
      <div className="pointer-events-none absolute -top-24 -left-24 h-80 w-80 rounded-full bg-teal-400/20 blur-3xl"></div>
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-sky-400/20 blur-3xl"></div>

      {/* Glass card */}
      <div className="relative mx-4 w-full max-w-md">
        <div className="relative overflow-hidden rounded-2xl bg-white/75 p-6 shadow-2xl ring-1 ring-black/5 backdrop-blur-lg sm:p-8">
          {/* subtle gradient border glow */}
          <div className="pointer-events-none absolute inset-px rounded-2xl bg-gradient-to-br from-white/0 via-white/10 to-white/0"></div>

          <div className="relative flex items-center gap-4">
            {/* Spinner */}
            <div className="relative h-12 w-12 sm:h-14 sm:w-14">
              <span className="absolute inset-0 rounded-full border-2 border-teal-400/20"></span>
              <span className="absolute inset-0 rounded-full border-2 border-transparent border-t-teal-500 animate-spin"></span>
              <span className="absolute inset-2 rounded-full bg-gradient-to-br from-teal-100 to-sky-100 opacity-60"></span>
            </div>

            <div className="min-w-0">
              <div className="text-base font-semibold tracking-tight text-gray-800 sm:text-lg">
                Memproses...
              </div>
              <p className="mt-0.5 text-sm text-gray-600">Silakan tunggu sebentar</p>

              {/* Progress shimmer bar */}
              <div className="mt-3 h-1.5 w-44 overflow-hidden rounded-full bg-gray-200/80 sm:w-56">
                <div className="h-full w-1/3 animate-shimmer rounded-full bg-gradient-to-r from-teal-400 via-sky-400 to-teal-400"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default GlobalLoading;
