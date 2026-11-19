import { useState } from 'react';
import { Link } from 'react-router-dom';
import StatusBadge from './StatusBadge';
import { formatINR, formatDate } from '../utils/format';

export default function BookingCard({
  booking,
  counterpartLabel = 'User',
  counterpartName = '',
  counterpartEmail = '',
  actions = null,
}) {
  const [imgError, setImgError] = useState(false);
  const hasItem = Boolean(booking.item);
  const item = booking.item || {};
  const itemId = item.id || item._id;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col md:flex-row gap-5 items-start">
      {/* Thumbnail */}
      <div className="relative w-full md:w-36 h-36 md:h-36 rounded-xl bg-slate-100 overflow-hidden shrink-0">
        {hasItem && item.imageUrl && !imgError ? (
          <img
            src={item.imageUrl}
            alt={item.title || 'Item image'}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-50 to-slate-100 text-3xl">
            📦
          </div>
        )}
      </div>

      {/* Main Info */}
      <div className="flex-1 flex flex-col justify-between w-full space-y-3">
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
            {hasItem ? (
              <Link
                to={`/items/${itemId}`}
                className="text-lg font-bold text-slate-900 hover:text-indigo-600 transition-colors line-clamp-1"
              >
                {item.title || 'Untitled Item'}
              </Link>
            ) : (
              <span className="text-lg font-bold text-slate-900 line-clamp-1">
                Item removed
              </span>
            )}
            <StatusBadge status={booking.status} />
          </div>

          {/* Counterpart info */}
          <div className="text-xs text-slate-500 flex items-center gap-1.5 mb-2">
            <span className="font-medium text-slate-700">{counterpartLabel}:</span>
            <span>{counterpartName || 'Unknown'}</span>
            {counterpartEmail && (
              <span className="text-slate-400">({counterpartEmail})</span>
            )}
          </div>

          {/* Dates & Fees */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600">
            <div className="inline-flex items-center gap-1">
              <span>📅</span>
              <span className="font-medium text-slate-800">
                {formatDate(booking.startDate)} – {formatDate(booking.endDate)}
              </span>
            </div>
            <div className="text-xs text-slate-400">
              ({booking.days} {booking.days === 1 ? 'day' : 'days'})
            </div>
            <div className="font-bold text-slate-900 ml-auto md:ml-0">
              {formatINR(booking.totalFee)}
            </div>
          </div>
        </div>

        {/* Message if any */}
        {booking.message && (
          <div className="rounded-lg bg-slate-50 border border-slate-100 p-2.5 text-xs text-slate-600 italic">
            <span className="font-semibold not-italic text-slate-400 mr-1">Note:</span>
            "{booking.message}"
          </div>
        )}

        {/* Action Buttons passed by parent */}
        {actions && (
          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-2">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
