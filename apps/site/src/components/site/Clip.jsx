import { useEffect, useRef } from 'react'

/** A short demo clip: plays (muted, looping) while it's on screen, pauses when it isn't; still with reduced motion. */
export default function Clip({ id, label }) {
  const ref = useRef(null)
  useEffect(() => {
    const v = ref.current
    if (!v || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) v.play().catch(() => undefined)
        else v.pause()
      },
      { threshold: 0.45 }
    )
    io.observe(v)
    return () => io.disconnect()
  }, [])
  return (
    <div className="clip">
      <video ref={ref} src={`/assets/demo/clip-${id}.mp4`} poster={`/assets/demo/clip-${id}.webp`} muted loop playsInline preload="none" width="1440" height="810" aria-label={label} />
    </div>
  )
}
