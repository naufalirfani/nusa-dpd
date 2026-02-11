import React from 'react';
import { NavLink } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHome, faCalendarAlt, faHistory } from '@fortawesome/free-solid-svg-icons';

function NavigationMenu() {
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
  ];

  return (
    <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
      <div className="mx-auto px-4 sm:px-6 lg:px-12">
        <div className="flex items-center gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `inline-flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  isActive
                    ? 'border-teal-600 dark:border-teal-400 text-teal-600 dark:text-teal-400 bg-teal-50/50 dark:bg-teal-900/20'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:border-gray-300 dark:hover:border-gray-600'
                }`
              }
            >
              <FontAwesomeIcon icon={item.icon} className="h-4 w-4" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  );
}

export default NavigationMenu;
