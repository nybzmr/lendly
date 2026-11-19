import { useState, useEffect, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import Spinner from './Spinner';
import { formatINR, formatDate } from '../utils/format';

function getTodayString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function calcDaysInclusive(startStr, endStr) {
  if (!startStr || !endStr) return 0;
  const start = new Date(`${startStr}T00:00:00.000Z`);
  const end = new Date(`${endStr}T00:00:00.000Z`);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return 0;
  const ms = end.getTime() - start.getTime();
  return Math.round(ms / 86400000) + 1;
}

export default function BookingPanel({ item }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  const todayStr = useMemo(() => getTodayString(), []);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [message, setMessage] = useState('');
  const [bookedRanges, setBookedRanges] = useState([]);
  const [loadingRanges, setLoadingRanges] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Fetch already booked date ranges
  useEffect(() => {
    let isMounted = true;
    const fetchBookedDates = async () => {
      try {
        const res = await api.get(`/items/${item.id}/booked-dates`);
        if (isMounted) {
          setBookedRanges(res.data.ranges || []);
        }
      } catch (err) {
        console.error('Failed to load booked dates:', err);
      } finally {
        if (isMounted) {
          setLoadingRanges(false);
        }
      }
    };

    fetchBookedDates();
    return () => {
      isMounted = false;
    };
  }, [item.id]);

  // Compute inclusive days & price
  const days = useMemo(() => calcDaysInclusive(startDate, endDate), [startDate, endDate]);
  const totalFee = days * (item.pricePerDay || 0);

  // Check overlap against accepted bookings
  const hasOverlap = useMemo(() => {
    if (!startDate || !endDate || days <= 0) return false;
    return bookedRanges.some((range) => {
      const rStart = new Date(range.startDate).toISOString().slice(0, 10);
      const rEnd = new Date(range.endDate).toISOString().slice(0, 10);
      return rStart <= endDate && rEnd >= startDate;
    });
  }, [startDate, endDate, days, bookedRanges]);

  const isRangeTooLong = days > 30;

  // 1. If item is unavailable
  if (!item.isAvailable) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center space-y-2">
        <span className="inline-flex items-center rounded-full bg-rose-50 border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-700">
          Currently Unavailable
        </span>
        <p className="text-sm text-slate-600 font-medium">
          This item is temporarily not accepting borrow requests.
        </p>
      </div>
    );
  }

  // 2. While restoring auth session
  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 flex justify-center items-center">
        <Spinner size="sm" />
      </div>
    );
  }

  // 3. If user is logged out
  if (!user) {
    return (
      <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-6 text-center space-y-4">
        <div>
          <h3 className="text-base font-semibold text-slate-900">Want to borrow this item?</h3>
          <p className="text-sm text-slate-600 mt-1">
            Log in or sign up to check availability and submit a request.
          </p>
        </div>
        <Link
          to="/login"
          state={{ from: location }}
          className="inline-block rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 transition-colors shadow-sm"
        >
          Log in to borrow
        </Link>
      </div>
    );
  }

  // 4. Submitted confirmation state
  if (submitted) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-6 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center text-xl font-bold">
          ✓
        </div>
        <div>
          <h3 className="text-base font-bold text-emerald-900">Request sent!</h3>
          <p className="text-sm text-emerald-800 mt-1">
            Waiting for the owner ({item.owner?.name}) to review your request.
          </p>
        </div>
        <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-center">
          <Link
            to="/dashboard?tab=borrowing"
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition-colors shadow-xs"
          >
            View in Dashboard
          </Link>
          <button
            type="button"
            onClick={() => {
              setSubmitted(false);
              setStartDate('');
              setEndDate('');
              setMessage('');
            }}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
          >
            Request another date
          </button>
        </div>
      </div>
    );
  }

  // Handle submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!startDate || !endDate) {
      toast.error('Please select both start and end dates');
      return;
    }
    if (days <= 0) {
      toast.error('End date must be on or after start date');
      return;
    }
    if (isRangeTooLong) {
      toast.error('Booking range cannot exceed 30 days');
      return;
    }
    if (hasOverlap) {
      toast.error('Selected dates overlap with an existing accepted booking');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/bookings', {
        itemId: item.id,
        startDate,
        endDate,
        message: message.trim(),
      });
      toast.success('Request sent to owner!');
      setSubmitted(true);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to submit booking request';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
      <div className="border-b border-slate-100 pb-4">
        <h3 className="text-lg font-bold text-slate-900">Request to Borrow</h3>
        <p className="text-xs text-slate-500 mt-0.5">
          Select your dates. The owner will review and confirm availability.
        </p>
      </div>

      {/* Booked dates chips */}
      {!loadingRanges && bookedRanges.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3.5 space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-800 block">
            Already booked dates
          </span>
          <div className="flex flex-wrap gap-1.5">
            {bookedRanges.map((r, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 rounded-md bg-white border border-amber-300 px-2 py-0.5 text-xs font-medium text-amber-900 shadow-2xs"
              >
                <span>📅</span>
                <span>
                  {formatDate(r.startDate)} – {formatDate(r.endDate)}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Date Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="startDate" className="block text-xs font-semibold uppercase text-slate-600 mb-1">
              Start Date
            </label>
            <input
              id="startDate"
              name="startDate"
              type="date"
              min={todayStr}
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                if (endDate && e.target.value > endDate) {
                  setEndDate(e.target.value);
                }
              }}
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label htmlFor="endDate" className="block text-xs font-semibold uppercase text-slate-600 mb-1">
              End Date
            </label>
            <input
              id="endDate"
              name="endDate"
              type="date"
              min={startDate || todayStr}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Warning messages */}
        {hasOverlap && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-700">
            ⚠️ The selected dates overlap with an already accepted booking. Please choose different dates.
          </div>
        )}

        {isRangeTooLong && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-700">
            ⚠️ Bookings cannot exceed 30 days ({days} days selected).
          </div>
        )}

        {/* Live Summary */}
        {days > 0 && !hasOverlap && !isRangeTooLong && (
          <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 flex items-center justify-between text-sm">
            <div>
              <span className="text-slate-600 font-medium">Estimated fee</span>
              <div className="text-xs text-slate-400 mt-0.5">
                {days} {days === 1 ? 'day' : 'days'} × {formatINR(item.pricePerDay)}
              </div>
            </div>
            <div className="text-lg font-bold text-indigo-700">
              {formatINR(totalFee)}
            </div>
          </div>
        )}

        {/* Message to Owner */}
        <div>
          <label htmlFor="bookingMessage" className="block text-xs font-semibold uppercase text-slate-600 mb-1">
            Note to Owner <span className="text-slate-400 font-normal lowercase">(optional)</span>
          </label>
          <textarea
            id="bookingMessage"
            name="bookingMessage"
            rows={3}
            maxLength={300}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Tell the owner when you can pick it up or how you plan to use it..."
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <div className="text-right text-xs text-slate-400 mt-0.5">
            {message.length}/300
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={submitting || !startDate || !endDate || days <= 0 || hasOverlap || isRangeTooLong}
          className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
        >
          {submitting ? 'Submitting request...' : 'Request to borrow'}
        </button>
      </form>
    </div>
  );
}
