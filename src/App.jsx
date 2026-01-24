import React from 'react';
import { Routes, Route } from 'react-router-dom';
import GlobalLoading from './components/GlobalLoading';
import LoginPage from './components/LoginPage';
import Dashboard from './components/Dashboard';
import NotFound from './components/NotFound';
import AuthCallback from './components/AuthCallback';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route 
          path="/" 
          element={
            <ProtectedRoute>
              <Dashboard />
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
