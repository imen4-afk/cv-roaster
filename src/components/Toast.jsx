import { useEffect, useState } from 'react'

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

export function CopyButton({ text, className = '' }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      onClick={async () => {
        if (await copyText(text)) {
          setCopied(true)
          setTimeout(() => setCopied(false), 1500)
        }
      }}
      className={`btn-ghost no-print !px-3 !py-1.5 text-xs ${className}`}
    >
      {copied ? '✓ Copied' : '📋 Copy'}
    </button>
  )
}

export default function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(onClose, 10000)
    return () => clearTimeout(t)
  }, [toast, onClose])

  if (!toast) return null
  return (
    <div className="no-print fixed inset-x-4 bottom-4 z-50 flex justify-center sm:inset-x-auto sm:right-6">
      <div role="status" className="fade-up w-full max-w-md rounded-2xl border border-green-500/40 bg-neutral-900/95 p-4 shadow-2xl shadow-black/60 backdrop-blur">
        <div className="flex items-start gap-3">
          <span className="text-2xl">🎉</span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-green-300">{toast.title}</p>
            {toast.bullet && (
              <p className="mt-2 rounded-lg border border-white/10 bg-neutral-950 p-3 text-sm text-neutral-100" dir="auto">
                {toast.bullet}
              </p>
            )}
            {toast.bullet && <CopyButton text={toast.bullet} className="mt-2" />}
          </div>
          <button onClick={onClose} className="text-neutral-500 hover:text-white" aria-label="Close">
            ✕
          </button>
        </div>
      </div>
    </div>
  )
}
