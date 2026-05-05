import { Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import useAdminAuthStore from '../stores/adminAuth';

export default function AdminProtectedRoute({ children }) {
  const { verifyToken, logout } = useAdminAuthStore();
  const [isValid, setIsValid] = useState(null);

  useEffect(() => {
    const checkToken = async () => {
      // If no token in store, check if there's one in sessionStorage
      const token = sessionStorage.getItem('admin_token');
      
      if (!token) {
        setIsValid(false);
        return;
      }

      // Verify token with backend
      const valid = await verifyToken();
      
      if (!valid) {
        logout();
        setIsValid(false);
      } else {
        setIsValid(true);
      }
    };

    checkToken();
  }, [verifyToken, logout]);

  // While verifying, show loading
  if (isValid === null) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  // If not valid, redirect to login
  if (!isValid) {
    return <Navigate to="/admin/login" replace />;
  }

  return children;
}
