import { useState } from 'react';
import { Link } from 'react-router-dom';
import { formatINR } from '../utils/format';
import { CATEGORY_EMOJIS } from '../utils/constants';

export default function ItemCard({ item }) {
  const [imgError, setImgError] = useState(false);
  const emoji = CATEGORY_EMOJIS[item.category] || '📦';
  const showFallback = !item.imageUrl || imgError;

  return (
    <Link
      to={`/items/${item.id}`}
      className="group flex flex-col rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden"
    >
      {/* 4:3 Image Area */}
      <div className="relative aspect-[4/3] w-full bg-slate-100 overflow-hidden">
        {showFallback ? (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-indigo-50 via-slate-50 to-slate-100">
            <span className="text-4xl select-none" role="img" aria-label={item.category}>
              {emoji}
            </span>
          </div>
        ) : (
          <img
            src={item.imageUrl}
            alt={item.title}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        )}

        {/* Unavailable overlay / badge */}
        {!item.isAvailable && (
          <div className="absolute top-2.5 right-2.5">
            <span className="inline-flex items-center rounded-full bg-rose-50/90 backdrop-blur-xs border border-rose-200 px-2.5 py-0.5 text-xs font-semibold text-rose-700 shadow-xs">
              Unavailable
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
            <span>{emoji}</span>
            <span>{item.category}</span>
          </span>
          {item.owner?.name && (
            <span className="text-xs text-slate-500 truncate max-w-[120px]" title={item.owner.name}>
              by {item.owner.name}
            </span>
          )}
        </div>

        <h3 className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1 mb-2">
          {item.title}
        </h3>

        <div className="mt-auto pt-2 border-t border-slate-100 flex items-center justify-between">
          <div className="text-sm font-bold text-slate-900">
            {formatINR(item.pricePerDay)}
            <span className="text-xs font-normal text-slate-500"> / day</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
