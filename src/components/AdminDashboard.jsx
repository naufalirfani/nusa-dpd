import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import useAdminAuthStore from '../stores/adminAuth';
import Header from './Header';
import Footer from './Footer';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCalendarAlt } from '@fortawesome/free-solid-svg-icons';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { adminUser, logout } = useAdminAuthStore();

  const handleLogout = () => {
    logout();
    navigate('/admin');
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-gray-900">
      <Header
        userName={adminUser?.username || 'Administrator'}
        userNip={adminUser?.email || 'Admin'}
        showNip={false}
        onProfileClick={null}
        onLogout={handleLogout}
        showProfile={true}
        showLogout={true}
      />

      {/* Navigation Tabs */}
      <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10 overflow-x-auto">
        <div className="mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-1">
            <button
              onClick={() => navigate('/admin')}
              className={`inline-flex items-center gap-2 pr-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                isActive('/admin')
                  ? 'border-teal-500 dark:border-teal-400 text-teal-500 dark:text-teal-400 bg-teal-50/50 dark:bg-teal-900/20'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <FontAwesomeIcon icon={faCalendarAlt} className="h-4 w-4" />
              <span className="font-semibold whitespace-nowrap">Daftar Kegiatan</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="relative z-0 flex-1 bg-gray-100 dark:bg-gray-900 mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <Outlet />
      </main>

      <Footer />
    </div>
  );
}
