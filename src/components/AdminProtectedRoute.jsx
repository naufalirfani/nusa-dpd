import { Navigate } from 'react-router-dom';
import useAdminAuthStore from '../stores/adminAuth';

export default function AdminProtectedRoute({ children }) {
  const { isSessionValid } = useAdminAuthStore();

  if (!isSessionValid()) {
    return <Navigate to="/admin" replace />;
  }

  return children;
}
