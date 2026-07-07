import React, { useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import GlobalLoading from './components/GlobalLoading';
import LoginPage from './components/LoginPage';
import Dashboard from './components/Dashboard';
import NotFound from './components/NotFound';
import AuthCallback from './components/AuthCallback';
import ProtectedRoute from './components/ProtectedRoute';
import UserNotFound from './components/UserNotFound';
import AdminLogin from './components/AdminLogin';
import AdminDashboard from './components/AdminDashboard';
import AdminProtectedRoute from './components/AdminProtectedRoute';
import KegiatanList from './components/KegiatanList';
import KegiatanForm from './components/KegiatanForm';
import RespondenList from './components/RespondenList';
import ActivitiesList from './components/ActivitiesList';
import ActivityEvaluation from './components/ActivityEvaluation';
import PublicActivityEvaluation from './components/PublicActivityEvaluation';
import FormSelectionPage from './components/FormSelectionPage';
import AttendedActivities from './components/AttendedActivities';
import Linktree from './components/Linktree';
import CertificateList from './components/CertificateList';
import CertificateVerification from './components/CertificateVerification';
import useAdminAuthStore from './stores/adminAuth';
import FeedbackList from './components/FeedbackList';
import FeedbackTemplatePage from './components/FeedbackTemplatePage';
import Feedback360Page from './components/Feedback360Page';
import FeedbackPenilaianPage from './components/FeedbackPenilaianPage';

function App() {
  const location = useLocation();

  // Initialize admin auth on app load
  useEffect(() => {
    const initAuth = async () => {
      const { initializeAuth } = useAdminAuthStore.getState();
      await initializeAuth();
    };
    initAuth();
  }, []);

  useEffect(() => {
    const p = location.pathname || '/';

    function getTitle(pathname) {
      if (pathname === '/' ) return 'Beranda | NUSA';
      if (pathname === '/login') return 'Login | NUSA';
      if (pathname === '/auth/callback') return 'Autentikasi | NUSA';
      if (pathname === '/user-not-found') return 'User Tidak Ditemukan | NUSA';
      if (pathname === '/admin') return 'Admin Login | NUSA';
      if (pathname === '/activities') return 'Daftar Kegiatan | NUSA';
      if (pathname.startsWith('/activity-evaluation')) return 'Form Presensi | NUSA';
      if (pathname.startsWith('/public-activity-evaluation')) return 'Form Presensi Umum | NUSA';
      if (pathname.startsWith('/form-selection')) return 'Pilih Jenis Peserta | NUSA';
      if (pathname === '/attended-activities') return 'Riwayat Kegiatan | NUSA';
      if (pathname === '/umpan-balik-360') return 'Umpan Balik 360 | NUSA';
      if (pathname.startsWith('/linktree')) return 'Linktree | NUSA';
      if (pathname.startsWith('/sertifikat')) return 'Daftar Sertifikat | NUSA';
      if (pathname.startsWith('/verify')) return 'Verifikasi Sertifikat | NUSA';
      if (pathname === '/admin/login') return 'Admin Login | NUSA';
      if (pathname.startsWith('/admin/kegiatan/responden')) return 'Daftar Responden | Admin | NUSA';
      if (pathname.startsWith('/admin/kegiatan/tambah')) return 'Tambah Kegiatan | Admin | NUSA';
      if (pathname.startsWith('/admin/kegiatan/edit')) return 'Ubah Kegiatan | Admin | NUSA';
      if (pathname.startsWith('/admin')) return 'Dashboard Admin | NUSA';

      // fallback: derive from first segment
      const seg = pathname.split('/').filter(Boolean)[0] || 'Beranda';
      return `${seg.charAt(0).toUpperCase() + seg.slice(1)} | NUSA`;
    }

    document.title = getTitle(p);
  }, [location.pathname]);
  return (
    <>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/user-not-found" element={<UserNotFound />} />
        
        {/* Public Routes */}
        <Route path="/linktree/:slug" element={<Linktree />} />
        <Route path="/sertifikat/:kegiatan_id" element={<CertificateList />} />
        <Route path="/verify/:token" element={<CertificateVerification />} />
        <Route path="/form-selection/:id" element={<FormSelectionPage />} />
        <Route path="/public-activity-evaluation/:id" element={<PublicActivityEvaluation />} />
        
        {/* Admin Routes */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route
          path="/admin"
          element={
            <AdminProtectedRoute>
              <AdminDashboard />
            </AdminProtectedRoute>
          }
        >
          <Route index element={<KegiatanList />} />
          <Route path="umpan-balik" element={<FeedbackList />} />
          <Route path="umpan-balik/template" element={<FeedbackTemplatePage />} />
          <Route path="umpan-balik/penilaian" element={<FeedbackPenilaianPage />} />
          <Route path="kegiatan/tambah" element={<KegiatanForm />} />
          <Route path="kegiatan/edit/:id" element={<KegiatanForm />} />
          <Route path="kegiatan/responden/:kegiatan_id" element={<RespondenList />} />
        </Route>
        
        {/* Main App Routes */}
        <Route 
          path="/" 
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/activities" 
          element={
            <ProtectedRoute>
              <ActivitiesList />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/activity-evaluation/:id" 
          element={
            <ProtectedRoute>
              <ActivityEvaluation />
            </ProtectedRoute>
          } 
        />
        <Route
          path="/attended-activities"
          element={
            <ProtectedRoute>
              <AttendedActivities />
            </ProtectedRoute>
          }
        />
        <Route
          path="/umpan-balik-360"
          element={
            <ProtectedRoute>
              <Feedback360Page />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <GlobalLoading />
    </>
  );
}

export default App;
