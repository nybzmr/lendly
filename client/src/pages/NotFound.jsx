import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm max-w-md w-full">
        <span className="text-5xl font-extrabold text-indigo-600 block mb-2">404</span>
        <h1 className="text-xl font-bold text-slate-900 mb-2">Page not found</h1>
        <p className="text-sm text-slate-500 mb-6">
          Sorry, we couldn't find the page you're looking for. It might have been moved or deleted.
        </p>
        <Link
          to="/"
          className="inline-block rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors shadow-sm"
        >
          Back to Browse
        </Link>
      </div>
    </div>
  );
}
