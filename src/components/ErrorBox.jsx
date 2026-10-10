export default function ErrorBox({ message, onRetry, onDismiss }) {
  if (!message) return null
  return (
    <div role="alert" className="fade-up flex items-start gap-3 rounded-xl border border-ember-500/40 bg-ember-500/10 p-4 text-sm text-red-200">
      <span className="text-lg leading-none">😬</span>
      <div className="flex-1">
        <p>{message}</p>
        {(onRetry || onDismiss) && (
          <div className="mt-3 flex gap-2">
            {onRetry && (
              <button onClick={onRetry} className="btn-ghost !py-1.5">
                Try again
              </button>
            )}
            {onDismiss && (
              <button onClick={onDismiss} className="btn-ghost !py-1.5">
                Dismiss
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
