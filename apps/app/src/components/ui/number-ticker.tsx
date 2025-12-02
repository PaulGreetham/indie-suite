"use client"

import * as React from "react"

type NumberTickerProps = {
  value: number
  startValue?: number
  direction?: "up" | "down"
  delay?: number
  decimalPlaces?: number
  className?: string
}

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3)
}

export function NumberTicker({
  value,
  startValue,
  direction = "up",
  delay = 0,
  decimalPlaces = 0,
  className,
}: NumberTickerProps) {
  const [display, setDisplay] = React.useState<number>(startValue ?? (direction === "down" ? value : 0))
  const startRef = React.useRef<number>(display)
  const targetRef = React.useRef<number>(value)

  React.useEffect(() => {
    startRef.current = typeof startValue === "number" ? startValue : (direction === "down" ? value : 0)
    targetRef.current = value
    let raf: number | null = null
    const duration = 800
    const startTs = performance.now() + delay

    const tick = (ts: number) => {
      if (ts < startTs) {
        raf = requestAnimationFrame(tick)
        return
      }
      const p = Math.min(1, (ts - startTs) / duration)
      const eased = easeOutCubic(p)
      const current = startRef.current + (targetRef.current - startRef.current) * eased
      setDisplay(current)
      if (p < 1) raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => {
      if (raf) cancelAnimationFrame(raf)
    }
  }, [value, startValue, direction, delay])

  const fmt = React.useMemo(() =>
    new Intl.NumberFormat("en-GB", { minimumFractionDigits: decimalPlaces, maximumFractionDigits: decimalPlaces }),
  [decimalPlaces])

  return <span className={className}>{fmt.format(display)}</span>
}


