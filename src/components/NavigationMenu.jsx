import React, { useCallback, useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faHome,
  faCalendarAlt,
  faHistory,
  faClipboardCheck,
} from '@fortawesome/free-solid-svg-icons';
import { getFeedbackTemplates, getPenilaianPegawai } from '../config/api';
import { getCurrentUserNip } from '../utils/auth';
import { isPenilaianPending, PENILAIAN_UPDATED_EVENT } from '../utils/penilaian';

function NavigationMenu() {
  const [pendingFeedback, setPendingFeedback] = useState(0);

  const loadPendingFeedback = useCallback(async () => {
    const nip = getCurrentUserNip();
    if (!nip) {
      setPendingFeedback(0);
      return;
    }
    try {
      const [response] = await Promise.all([
        getPenilaianPegawai({ nip_penilai: nip }),
      ]);
      const records = Array.isArray(response)
        ? response
        : Array.isArray(response?.data)
          ? response.data
          : [];
      setPendingFeedback(
        records.filter((item) => isPenilaianPending(item.penilaian))
          .length,
      );
    } catch (err) {
      console.error('Failed to load pending penilaian count', err);
    }
  }, []);

  useEffect(() => {
    loadPendingFeedback();

    const handleUpdated = () => loadPendingFeedback();
    window.addEventListener(PENILAIAN_UPDATED_EVENT, handleUpdated);
    return () => window.removeEventListener(PENILAIAN_UPDATED_EVENT, handleUpdated);
  }, [loadPendingFeedback]);

  const navItems = [
    {
      path: '/',
      label: 'Beranda',
      icon: faHome,
    },
    {
      path: '/activities',
      label: 'Kegiatan',
      icon: faCalendarAlt,
    },
    {
      path: '/attended-activities',
      label: 'Riwayat Kegiatan Saya',
      icon: faHistory,
    },
    {
      path: '/umpan-balik-360',
      label: 'Umpan Balik 360',
      icon: faClipboardCheck,
      badge: pendingFeedback,
    },
  ];

  return (
    <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10 overflow-x-auto">
      <div className="mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `relative inline-flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  isActive
                    ? 'border-teal-500 dark:border-teal-400 text-teal-500 dark:text-teal-400 bg-teal-50/50 dark:bg-teal-900/20'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:border-gray-300 dark:hover:border-gray-600'
                }`
              }
            >
              <FontAwesomeIcon icon={item.icon} className="h-4 w-4" />
              <span className="font-semibold whitespace-nowrap">{item.label}</span>
              {item.badge > 0 && (
                <span className="ml-1 inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[11px] font-bold leading-none text-white">
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              )}
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  );
}

export default NavigationMenu;
