import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="border-b border-slate-200 bg-white sticky top-0 z-30">
      <div className="max-w-6xl mx-auto px-4 h-16 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <Link to="/" className="text-xl font-bold tracking-tight text-indigo-600">
            Lendly
          </Link>
          <Link
            to="/"
            className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            Browse
          </Link>
        </div>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <Link
                to="/items/new"
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors shadow-sm"
              >
                List an item
              </Link>
              <Link
                to="/dashboard"
                className="text-sm font-medium text-slate-600 hover:text-slate-900 px-2 py-1 transition-colors"
              >
                Dashboard
              </Link>
              <span className="text-sm font-medium text-slate-700 px-1">
                {user.name}
              </span>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="text-sm font-medium text-slate-600 hover:text-slate-900 px-3 py-2 transition-colors"
              >
                Log in
              </Link>
              <Link
                to="/register"
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors shadow-sm"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
