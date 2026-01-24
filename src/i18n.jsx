import { createContext, useContext, useState, useEffect } from 'react';

const messages = {
  en: {
    title: 'Sign in to your account',
    subtitle: 'Enter your NIP and verification code to continue',
    code: 'Verification code',
    lang_id: 'ID',
    lang_en: 'EN',
    send: 'Send',
    sending: 'Sending...',
    login: 'Sign in',
    enter_nip: 'Please enter your NIP',
    invalid_nip: 'NIP must be 18 digits',
    enter_code: 'Please enter the verification code',
    code_sent: 'Verification code sent',
    verify_success: 'Verification successful',
    verify_fail: 'Verification failed — code does not match',
    code_generated: 'New verification code generated',
    refresh: 'Refresh',
    refreshing: 'Refreshing...',
    welcome: 'Welcome',
    token_generate_failed: 'Failed to generate SSO token',
    processing_auth: 'Processing authentication',
    please_wait: 'Please wait while we complete your sign-in...',
    auth_failed: 'Authentication Failed',
    back_to_login: 'Back to Login',
  },
  id: {
    title: 'Masuk ke akun Anda',
    subtitle: 'Masukkan NIP dan kode verifikasi untuk melanjutkan',
    code: 'Kode verifikasi',
    lang_id: 'ID',
    lang_en: 'EN',
    send: 'Kirim',
    sending: 'Mengirim...',
    login: 'Masuk',
    enter_nip: 'Silakan masukkan NIP Anda',
    invalid_nip: 'NIP harus 18 digit',
    enter_code: 'Silakan masukkan kode verifikasi',
    code_sent: 'Kode verifikasi terkirim',
    verify_success: 'Verifikasi berhasil',
    verify_fail: 'Verifikasi gagal — kode tidak sesuai',
    code_generated: 'Kode verifikasi baru berhasil dibuat',
    refresh: 'Segarkan',
    refreshing: 'Menyegarkan...',
    welcome: 'Selamat datang',
    token_generate_failed: 'Gagal membuat token SSO',
    processing_auth: 'Memproses autentikasi',
    please_wait: 'Mohon tunggu sementara kami menyelesaikan proses masuk Anda...',
    auth_failed: 'Autentikasi Gagal',
    back_to_login: 'Kembali ke Halaman Login',
  },
};

const I18nContext = createContext();

export function I18nProvider({ children }) {
  const [locale, setLocale] = useState(() => {
    return localStorage.getItem('locale') || 'id';
  });

  useEffect(() => {
    localStorage.setItem('locale', locale);
    document.documentElement.lang = locale;
  }, [locale]);

  const t = (key) => {
    return (messages[locale] && messages[locale][key]) || messages['en'][key] || key;
  };

  return (
    <I18nContext.Provider value={{ t, locale, setLocale }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    // Fallback for components outside provider
    const locale = 'id';
    const t = (key) => (messages[locale] && messages[locale][key]) || messages['en'][key] || key;
    return { t, locale, setLocale: () => {} };
  }
  return context;
}
