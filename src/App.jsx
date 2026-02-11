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
import ActivitiesList from './components/ActivitiesList';
import ActivityEvaluation from './components/ActivityEvaluation';
import AttendedActivities from './components/AttendedActivities';
import Linktree from './components/Linktree';

function App() {
  const location = useLocation();

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
      if (pathname === '/attended-activities') return 'Riwayat Kegiatan | NUSA';
      if (pathname.startsWith('/linktree')) return 'Linktree | NUSA';
      if (pathname.startsWith('/admin/dashboard/kegiatan/tambah')) return 'Tambah Kegiatan | Admin | NUSA';
      if (pathname.startsWith('/admin/dashboard/kegiatan/edit')) return 'Edit Kegiatan | Admin | NUSA';
      if (pathname.startsWith('/admin/dashboard')) return 'Dashboard Admin | NUSA';

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
        
        {/* Admin Routes */}
        <Route path="/admin" element={<AdminLogin />} />
        <Route
          path="/admin/dashboard"
          element={
            <AdminProtectedRoute>
              <AdminDashboard />
            </AdminProtectedRoute>
          }
        >
          <Route index element={<KegiatanList />} />
          <Route path="kegiatan/tambah" element={<KegiatanForm />} />
          <Route path="kegiatan/edit/:id" element={<KegiatanForm />} />
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
        <Route path="*" element={<NotFound />} />
      </Routes>
      <GlobalLoading />
    </>
  );
}

export default App;
