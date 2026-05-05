// Configuration for Featured Services shown on the Dashboard
// Edit this file to enable/disable services, change labels, descriptions, icons, and order.

import logoCmb from '../assets/logo_cmb.png';
import logoLms from '../assets/logo_lms.png';
import logoSimantap from '../assets/logo_simantap.png';
import logoKms from '../assets/logo_kms.png';

// Helper to read boolean-like env values
function envBool(name, defaultValue) {
  const v = import.meta.env[name];
  if (v === undefined) return defaultValue;
  const s = String(v).toLowerCase().trim();
  return s === 'true' || s === '1' || s === 'yes';
}

const featuredServices = [
  {
    id: 'cmb',
    key: 'CMB',
    title: 'CMB',
    subtitle: 'Coaching, Mentoring & Belajar Mandiri',
    category: 'Pembelajaran',
    logo: logoCmb,
    accent: 'teal',
    enabled: envBool('VITE_FEATURED_CMB_ENABLED', true),
    order: 1,
  },
  {
    id: 'lms',
    key: 'LMS',
    title: 'LMS',
    subtitle: 'Learning Management System',
    category: 'Pembelajaran',
    logo: logoLms,
    accent: 'purple',
    enabled: envBool('VITE_FEATURED_LMS_ENABLED', true),
    order: 2,
  },
  {
    id: 'simantap',
    key: 'SIMANTAP',
    title: 'SIMANTAP',
    subtitle: 'Sistem Manajemen Talenta Pegawai',
    category: 'Layanan',
    logo: logoSimantap,
    accent: 'amber',
    enabled: envBool('VITE_FEATURED_SIMANTAP_ENABLED', true),
    order: 3,
  },
  {
    id: 'kms',
    key: 'KMS',
    title: 'KMS',
    subtitle: 'Knowledge Management System',
    category: 'Pembelajaran',
    logo: logoKms,
    accent: 'blue',
    enabled: envBool('VITE_FEATURED_KMS_ENABLED', true),
    order: 4,
  },
];

export default featuredServices;
