export default function StatusBadge({ status }) {
  const normalized = (status || '').toLowerCase();

  const styles = {
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    accepted: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    rejected: 'bg-rose-50 text-rose-700 border-rose-200',
    cancelled: 'bg-slate-100 text-slate-700 border-slate-200',
    completed: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  }[normalized] || 'bg-slate-100 text-slate-700 border-slate-200';

  const label = normalized ? normalized.charAt(0).toUpperCase() + normalized.slice(1) : '';

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles}`}
    >
      {label}
    </span>
  );
}
