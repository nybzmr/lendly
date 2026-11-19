import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/Spinner';
import EmptyState from '../components/EmptyState';
import BookingPanel from '../components/BookingPanel';
import { formatINR } from '../utils/format';
import { CATEGORY_EMOJIS } from '../utils/constants';

export default function ItemDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [imgError, setImgError] = useState(false);
  const [updatingAvailability, setUpdatingAvailability] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchItem = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/items/${id}`);
      setItem(res.data.item);
    } catch (err) {
      console.error('Failed to load item:', err);
      setError(err.response?.data?.message || 'Item not found');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchItem();
  }, [fetchItem]);

  const isOwner = Boolean(
    user && item && (user.id === item.owner?.id || user.id === item.owner?._id)
  );

  const handleToggleAvailability = async () => {
    if (!item) return;
    setUpdatingAvailability(true);
    const newStatus = !item.isAvailable;
    try {
      const res = await api.patch(`/items/${item.id}/availability`, {
        isAvailable: newStatus,
      });
      setItem(res.data.item);
      toast.success(newStatus ? 'Item marked as available' : 'Item marked as unavailable');
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update availability';
      toast.error(msg);
    } finally {
      setUpdatingAvailability(false);
    }
  };

  const handleDelete = async () => {
    if (!item) return;
    const confirmed = window.confirm('Are you sure you want to delete this item? This action cannot be undone.');
    if (!confirmed) return;

    setDeleting(true);
    try {
      await api.delete(`/items/${item.id}`);
      toast.success('Item deleted successfully');
      navigate('/');
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to delete item';
      toast.error(msg);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Spinner size="lg" />
        <p className="mt-3 text-sm text-slate-500">Loading item details...</p>
      </div>
    );
  }

  if (error || !item) {
    return (
      <EmptyState
        title="Item not found"
        message={error || "We couldn't find the item you're looking for."}
        action={
          <Link
            to="/"
            className="inline-block rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors shadow-sm"
          >
            Back to Browse
          </Link>
        }
      />
    );
  }

  const emoji = CATEGORY_EMOJIS[item.category] || '📦';
  const showFallback = !item.imageUrl || imgError;

  return (
    <div className="py-6 max-w-5xl mx-auto space-y-8">
      {/* Breadcrumb / Back button */}
      <div>
        <Link
          to="/"
          className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors"
        >
          ← Back to Browse
        </Link>
      </div>

      {/* Two columns on desktop */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 items-start">
        {/* Left Column: Big Image */}
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
          <div className="relative aspect-[4/3] w-full bg-slate-100 flex items-center justify-center overflow-hidden">
            {showFallback ? (
              <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-indigo-50 via-slate-50 to-slate-100">
                <span className="text-6xl select-none" role="img" aria-label={item.category}>
                  {emoji}
                </span>
                <span className="mt-2 text-sm text-slate-400 font-medium">{item.category}</span>
              </div>
            ) : (
              <img
                src={item.imageUrl}
                alt={item.title}
                onError={() => setImgError(true)}
                className="w-full h-full object-cover"
              />
            )}
          </div>
        </div>

        {/* Right Column: Details */}
        <div className="flex flex-col space-y-6">
          {/* Header section */}
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                <span>{emoji}</span>
                <span>{item.category}</span>
              </span>

              {item.isAvailable ? (
                <span className="inline-flex items-center rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-700">
                  ● Available
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full bg-rose-50 border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-700">
                  ● Unavailable
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 mb-2">
              {item.title}
            </h1>

            <div className="flex items-baseline gap-1 text-2xl font-bold text-slate-900">
              {formatINR(item.pricePerDay)}
              <span className="text-sm font-normal text-slate-500"> / day</span>
            </div>
          </div>

          {/* Description */}
          <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-2xs space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Description
            </h2>
            <p className="text-sm md:text-base text-slate-600 whitespace-pre-line leading-relaxed">
              {item.description}
            </p>
          </div>

          {/* Owner info */}
          <div className="flex items-center gap-3 text-sm text-slate-500">
            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
              {item.owner?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div>
              <span className="text-slate-400 text-xs block">Listed by</span>
              <span className="font-semibold text-slate-800">{item.owner?.name || 'Anonymous'}</span>
            </div>
          </div>

          {/* Owner Actions OR Booking Panel Spot */}
          {isOwner ? (
            <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-5 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-700">
                Owner Controls
              </h3>
              <div className="flex flex-wrap gap-2.5">
                <Link
                  to={`/items/${item.id}/edit`}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors shadow-xs"
                >
                  Edit Item
                </Link>

                <button
                  type="button"
                  onClick={handleToggleAvailability}
                  disabled={updatingAvailability}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors border shadow-xs ${
                    item.isAvailable
                      ? 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100'
                      : 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                  }`}
                >
                  {updatingAvailability
                    ? 'Updating...'
                    : item.isAvailable
                    ? 'Mark as Unavailable'
                    : 'Mark as Available'}
                </button>

                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="rounded-lg border border-rose-300 bg-white px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50 transition-colors shadow-xs ml-auto disabled:opacity-50"
                >
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          ) : (
            <BookingPanel item={item} />
          )}
        </div>
      </div>
    </div>
  );
}
