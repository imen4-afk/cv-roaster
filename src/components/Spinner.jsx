const SIZES = { sm: 'h-4 w-4 border-2', md: 'h-6 w-6 border-2', lg: 'h-10 w-10 border-[3px]' }

export default function Spinner({ size = 'md', className = '' }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={`inline-block animate-spin rounded-full border-fire-500 border-t-transparent ${SIZES[size]} ${className}`}
    />
  )
}

export function LoadingPanel({ title, subtitle }) {
  return (
    <div className="card fade-up flex flex-col items-center gap-4 px-6 py-14 text-center">
      <div className="relative">
        <Spinner size="lg" />
        <span className="absolute inset-0 flex items-center justify-center text-lg">🔥</span>
      </div>
      <div>
        <p className="text-lg font-semibold">{title}</p>
        {subtitle && <p className="mt-1 text-sm text-neutral-400">{subtitle}</p>}
      </div>
    </div>
  )
}
