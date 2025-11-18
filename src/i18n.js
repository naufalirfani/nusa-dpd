import { ref, computed } from 'vue'

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
  },
}

const locale = ref(localStorage.getItem('locale') || 'id')

// Persist changes to localStorage when locale changes
locale.value = locale.value || 'id'

export function useI18n() {
  const t = (key) => {
    return (messages[locale.value] && messages[locale.value][key]) || messages['en'][key] || key
  }
  return {
    t,
    locale,
  }
}
