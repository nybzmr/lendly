import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/axios';
import ItemCard from '../components/ItemCard';
import Spinner from '../components/Spinner';
import EmptyState from '../components/EmptyState';
import { CATEGORIES, CATEGORY_EMOJIS } from '../utils/constants';

export default function Browse() {
  const [searchParams, setSearchParams] = useSearchParams();

  const currentSearch = searchParams.get('search') || '';
  const currentCategory = searchParams.get('category') || '';
  const currentPage = parseInt(searchParams.get('page') || '1', 10);

  const [searchInput, setSearchInput] = useState(currentSearch);
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);

  // Sync search input if URL changes from back/forward navigation
  useEffect(() => {
    setSearchInput(currentSearch);
  }, [currentSearch]);

  // Debounced search input handler
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== currentSearch) {
        setSearchParams((prev) => {
          const next = new URLSearchParams(prev);
          if (searchInput.trim()) {
            next.set('search', searchInput.trim());
          } else {
            next.delete('search');
          }
          next.set('page', '1');
          return next;
        });
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [searchInput, currentSearch, setSearchParams]);

  // Fetch items
  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page: currentPage,
        limit: 12,
      };
      if (currentSearch.trim()) params.search = currentSearch.trim();
      if (currentCategory && CATEGORIES.includes(currentCategory)) {
        params.category = currentCategory;
      }

      const res = await api.get('/items', { params });
      setItems(res.data.items || []);
      setPagination({
        page: res.data.page || 1,
        pages: res.data.pages || 1,
        total: res.data.total || 0,
      });
    } catch (err) {
      console.error('Failed to load items:', err);
      toast.error('Failed to load items');
    } finally {
      setLoading(false);
    }
  }, [currentSearch, currentCategory, currentPage]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleCategoryClick = (cat) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (cat === currentCategory || cat === 'All') {
        next.delete('category');
      } else {
        next.set('category', cat);
      }
      next.set('page', '1');
      return next;
    });
  };

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > pagination.pages) return;
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('page', newPage.toString());
      return next;
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="space-y-8">
      {/* Compact Hero */}
      <section className="text-center py-6 md:py-10 max-w-2xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 mb-3">
          Borrow what you need.{' '}
          <span className="text-indigo-600">Lend what you don't.</span>
        </h1>
        <p className="text-slate-600 text-sm md:text-base mb-6">
          Everyday items shared among community members. Simple, direct, and local.
        </p>

        {/* Search input */}
        <div className="relative max-w-lg mx-auto">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by title or description..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 bg-white text-sm text-slate-900 shadow-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
          />
          {searchInput && (
            <button
              onClick={() => setSearchInput('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>
      </section>

      {/* Category Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <button
          onClick={() => handleCategoryClick('All')}
          className={`shrink-0 rounded-full px-4 py-1.5 text-xs md:text-sm font-medium transition-colors ${
            !currentCategory
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
          }`}
        >
          ✨ All
        </button>
        {CATEGORIES.map((cat) => {
          const isSelected = currentCategory === cat;
          const emoji = CATEGORY_EMOJIS[cat] || '📦';
          return (
            <button
              key={cat}
              onClick={() => handleCategoryClick(cat)}
              className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs md:text-sm font-medium transition-colors ${
                isSelected
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <span>{emoji}</span>
              <span>{cat}</span>
            </button>
          );
        })}
      </div>

      {/* Items Section */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24">
          <Spinner size="lg" />
          <p className="mt-3 text-sm text-slate-500">Loading items...</p>
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          title="No items found"
          message={
            currentSearch || currentCategory
              ? "We couldn't find anything matching your filters. Try clearing your search or category."
              : 'Be the first to list an item for lending!'
          }
          action={
            <Link
              to="/items/new"
              className="inline-block rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors shadow-sm"
            >
              List an item
            </Link>
          }
        />
      ) : (
        <>
          {/* Responsive Grid: 1 / 2 / 3 / 4 columns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {items.map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-200 pt-6 mt-8">
              <div className="text-sm text-slate-500">
                Page <span className="font-semibold text-slate-800">{pagination.page}</span> of{' '}
                <span className="font-semibold text-slate-800">{pagination.pages}</span> (
                {pagination.total} {pagination.total === 1 ? 'item' : 'items'})
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page >= pagination.pages}
                  className="rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
