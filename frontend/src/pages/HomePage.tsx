import { useAuthStore } from '@/store/authStore';
import { useNavigate } from 'react-router-dom';
import { authApi } from '@/lib/api';

export function HomePage() {
  const navigate = useNavigate();
  const { user, refreshToken, logout } = useAuthStore();

  const handleLogout = async () => {
    try {
      if (refreshToken) {
        await authApi.logout(refreshToken);
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      logout();
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <nav className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              ARIA
            </h1>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {user?.name}
              </span>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-md transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Welcome to ARIA
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Your AI-powered household assistant
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                Calendar
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Manage household events
              </p>
            </div>

            <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                Tasks
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Track and assign tasks
              </p>
            </div>

            <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                Shopping
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Shared shopping lists
              </p>
            </div>

            <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                Budget
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Track household expenses
              </p>
            </div>

            <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                Notes
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Shared family notes
              </p>
            </div>

            <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                Voice Assistant
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Talk to ARIA
              </p>
            </div>
          </div>

          <div className="mt-8 p-4 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-lg">
            <p className="text-sm text-primary-900 dark:text-primary-100">
              <strong>Role:</strong> {user?.role === 'admin' ? 'Administrator' : 'Member'}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
