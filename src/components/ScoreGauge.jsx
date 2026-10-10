import { useEffect, useState } from 'react'

export const scoreColor = (s) => (s < 50 ? '#ef4444' : s < 75 ? '#f97316' : '#22c55e')

export default function ScoreGauge({ score, size = 168 }) {
  const [shown, setShown] = useState(0)
  const stroke = 12
  const r = (size - stroke) / 2
  const circumference = 2 * Math.PI * r

  // Count up from 0 with an ease-out curve.
  useEffect(() => {
    let frame
    const start = performance.now()
    const duration = 1200
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration)
      setShown(Math.round(score * (1 - Math.pow(1 - t, 3))))
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [score])

  const color = scoreColor(shown)
  const offset = circumference * (1 - shown / 100)

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ filter: `drop-shadow(0 0 8px ${color}80)`, transition: 'stroke 0.3s' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-5xl font-extrabold tabular-nums" style={{ color }}>
          {shown}
        </span>
        <span className="text-xs uppercase tracking-widest text-neutral-500">/ 100</span>
      </div>
    </div>
  )
}
