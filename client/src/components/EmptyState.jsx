export default function EmptyState({
  title = 'No items found',
  message = '',
  action = null,
  icon = '📭',
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm max-w-md mx-auto my-8">
      <div className="text-4xl mb-3">{icon}</div>
      <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
      {message && <p className="mt-1 text-sm text-slate-500">{message}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
