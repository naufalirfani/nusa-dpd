import React from 'react';

function ProfileModal({ profile, onClose }) {
  if (!profile) return null;

  const formatPersonName = (name) => {
    try {
      if (!name) return '';
      const parts = name.split(',');
      const main = (parts[0] || '').trim();
      const suffix = parts.slice(1).join(',').trim();
      const words = main.split(/\s+/).filter(Boolean).map((w) => {
        const lower = w.toLowerCase();
        if (lower.length <= 2) return lower.toUpperCase();
        return lower.charAt(0).toUpperCase() + lower.slice(1);
      });
      const formattedMain = words.join(' ');
      return suffix ? `${formattedMain}, ${suffix}` : formattedMain;
    } catch (e) {
      return name;
    }
  };

  const rawName = profile.nama || profile.name || profile.nama_lengkap || profile.full_name || profile.namaLengkap || '';
  const gelarDepan = profile.gelarDepan || profile.gelar_depan || '';
  const gelarBelakang = profile.gelarBelakang || profile.gelar_belakang || '';
  
  const displayName = (() => {
    if (rawName) {
      const nama = formatPersonName(rawName);
      const front = gelarDepan ? `${gelarDepan} ` : '';
      const back = gelarBelakang ? `, ${gelarBelakang}` : '';
      return `${front}${nama}${back}`.trim();
    }
    return profile.name || 'Pengguna';
  })();

  const initials = displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const jabatan = profile.jabatan || profile.jabatan_nama || profile.position || '';
  const instansi = profile.instansi || profile.nama_instansi || profile.organization || 'DPD RI';
  const golongan = profile.golongan || profile.golonganRuang || profile.rank || '';
  const nip = profile.nip || profile.nipBaru || profile.nip_baru || '-';
  const email = profile.email || profile.emailGov || profile.email_address || '-';
  const phone = profile.noHp || profile.no_hp || profile.phone || '-';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>

      {/* Modal card */}
      <div className="relative w-full max-w-3xl overflow-hidden" style={{ maxHeight: '92vh' }}>
        <div className="relative m-4 rounded-2xl ring-1 ring-black/5 shadow-2xl bg-white/80 backdrop-blur-xl">
          {/* Header */}
          <header className="relative px-6 pt-6 pb-4">
            <div className="flex items-start gap-4 sm:gap-6">
              {/* Avatar */}
              <div className="relative -mt-10 sm:-mt-12">
                <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl ring-2 ring-white shadow-xl bg-gradient-to-br from-indigo-600 to-sky-500 text-white grid place-items-center text-2xl sm:text-3xl font-semibold select-none">
                  {initials}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 truncate">
                      {displayName}
                    </h3>
                    <p className="mt-1 text-sm text-slate-600 flex flex-wrap items-center gap-x-2 gap-y-1">
                      {jabatan && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-slate-100 text-slate-700">
                          {jabatan}
                        </span>
                      )}
                      {instansi && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-sky-50 text-sky-700">
                          {instansi}
                        </span>
                      )}
                      {golongan && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-50 text-emerald-700">
                          {golongan}
                        </span>
                      )}
                    </p>
                  </div>
                  <button
                    className="shrink-0 text-slate-500 hover:text-slate-700 rounded-lg p-2 hover:bg-slate-100 transition"
                    onClick={onClose}
                    aria-label="Tutup"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </header>

          {/* Body */}
          <div className="px-6 pb-6 overflow-y-auto" style={{ maxHeight: 'calc(92vh - 12rem)' }}>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-50">
                  <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">NIP</p>
                  <p className="font-medium text-slate-900">{nip}</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-50">
                  <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">Email</p>
                  <p className="font-medium text-slate-900 truncate">{email}</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-50">
                  <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">No. Telepon</p>
                  <p className="font-medium text-slate-900">{phone}</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-50">
                  <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">Instansi</p>
                  <p className="font-medium text-slate-900">{instansi}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProfileModal;
