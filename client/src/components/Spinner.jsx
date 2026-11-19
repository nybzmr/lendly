export default function Spinner({ size = 'md', className = '' }) {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-2',
    lg: 'w-12 h-12 border-3',
  }[size] || 'w-8 h-8 border-2';

  return (
    <div
      className={`inline-block animate-spin rounded-full border-slate-200 border-t-indigo-600 ${sizeClasses} ${className}`}
      role="status"
      aria-label="Loading"
    />
  );
}
