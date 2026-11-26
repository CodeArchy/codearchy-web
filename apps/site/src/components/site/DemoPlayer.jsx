import { useEffect, useRef, useState } from 'react'
import data from '../../data/chapters.json'
import { PauseIcon, PlayIcon } from '../icons'

const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/**
 * The product demo, playing like a GIF (muted, looping, inline) but sharper and lighter,
 * with chapters: the current one is highlighted, and choosing one jumps there.
 * With reduced motion it waits on its poster until played.
 */
export default function DemoPlayer() {
  const video = useRef(null)
  const [playing, setPlaying] = useState(false)
  const [time, setTime] = useState(0)

  useEffect(() => {
    const v = video.current
    if (!v) return
    const onTime = () => setTime(v.currentTime)
    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    v.addEventListener('timeupdate', onTime)
    v.addEventListener('play', onPlay)
    v.addEventListener('pause', onPause)
    if (!reduced()) v.play().catch(() => undefined)
    return () => {
      v.removeEventListener('timeupdate', onTime)
      v.removeEventListener('play', onPlay)
      v.removeEventListener('pause', onPause)
    }
  }, [])

  const current = data.chapters.findIndex((c, i) => time >= c.start && (i === data.chapters.length - 1 ? true : time < data.chapters[i + 1].start))
  const seek = (c) => {
    const v = video.current
    if (!v) return
    v.currentTime = c.start + 0.05
    v.play().catch(() => undefined)
  }
  const toggle = () => {
    const v = video.current
    if (!v) return
    if (v.paused) v.play().catch(() => undefined)
    else v.pause()
  }
  const chapter = data.chapters[current]
  const progress = chapter ? Math.min(1, Math.max(0, (time - chapter.start) / (chapter.end - chapter.start))) : 0

  return (
    <figure className="demo">
      <div className="demo__window">
        <div className="demo__bar" aria-hidden="true">
          <span />
          <span />
          <span />
          <em>CodeArchy · acme-shop</em>
        </div>
        <div className="demo__screen">
          <video
            ref={video}
            className="demo__video"
            src="/assets/demo/demo.mp4"
            poster="/assets/demo/demo-poster.webp"
            muted
            loop
            playsInline
            preload="metadata"
            width="1440"
            height="810"
            aria-label="CodeArchy in action: the map of a repository, who owns each part, how much AI wrote, a request traced end to end, and a guided tour"
          />
          <button type="button" className={`demo__toggle${playing ? '' : ' is-paused'}`} onClick={toggle} aria-label={playing ? 'Pause the demo' : 'Play the demo'}>
            {playing ? <PauseIcon /> : <PlayIcon />}
          </button>
        </div>
      </div>
      <figcaption className="demo__chapters" aria-label="Jump to a part of the demo">
        {data.chapters.map((c, i) => (
          <button key={c.id} type="button" className={`demo__chapter${i === current ? ' is-current' : ''}`} onClick={() => seek(c)} aria-current={i === current ? 'true' : undefined}>
            <span className="demo__chapter-label">{c.label}</span>
            <span className="demo__chapter-track" aria-hidden="true">
              <span style={{ transform: `scaleX(${i === current ? progress : i < current ? 1 : 0})` }} />
            </span>
          </button>
        ))}
      </figcaption>
    </figure>
  )
}
