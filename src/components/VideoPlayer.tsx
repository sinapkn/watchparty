'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

interface AudioTrackItem { label: string; language: string; enabled: boolean }
interface AudioTrackList extends ArrayLike<AudioTrackItem> { length: number; [index: number]: AudioTrackItem }

interface VideoPlayerProps {
  videoUrl: string
  videoType: 'youtube' | 'direct'
  onSync: (state: { isPlaying: boolean; currentTime: number }) => void
  externalState?: { isPlaying: boolean; currentTime: number } | null
}

interface SubtitleCue { start: number; end: number; text: string }
interface SubtitleTrack { label: string; language: string; cues: SubtitleCue[] }
interface AudioTrack { label: string; language: string; index: number }
type SettingsPanel = 'none' | 'main' | 'subtitles' | 'audio' | 'subtitle-style'

export default function VideoPlayer({ videoUrl, videoType, onSync, externalState }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const playerRef = useRef<HTMLIFrameElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const subTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const settingsRef = useRef<HTMLDivElement>(null)
  const localAction = useRef(false)

  const [playing, setPlaying] = useState(false)
  const [time, setTime] = useState(0)
  const [dur, setDur] = useState(0)
  const [muted, setMuted] = useState(false)
  const [vol, setVol] = useState(100)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [fs, setFs] = useState(false)
  const [controls, setControls] = useState(true)

  const [subs, setSubs] = useState<SubtitleTrack[]>([])
  const [activeSub, setActiveSub] = useState(-1)
  const [subText, setSubText] = useState('')
  const [panel, setPanel] = useState<SettingsPanel>('none')
  const [subSize, setSubSize] = useState(100)
  const [subColor, setSubColor] = useState('#ffffff')
  const [subBg, setSubBg] = useState(75)
  const [subFont, setSubFont] = useState('default')

  const [audios, setAudios] = useState<AudioTrack[]>([])
  const [activeAudio, setActiveAudio] = useState(0)

  // ── Parsers ──
  const parseSRT = useCallback((t: string): SubtitleCue[] => {
    const n = t.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
    return n.trim().split(/\n\s*\n/).map(b => {
      const l = b.trim().split('\n')
      if (l.length < 2) return null
      const i = l.findIndex(x => x.includes('-->'))
      if (i < 0) return null
      const m = l[i].match(/(\d{2}:\d{2}:\d{2}[.,]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[.,]\d{3})/)
      if (!m) return null
      const p = (s: string) => { const x = s.replace(',', '.').split(':'); return +x[0] * 3600 + +x[1] * 60 + +x[2] }
      return { start: p(m[1]), end: p(m[2]), text: l.slice(i + 1).join('\n').trim() }
    }).filter(Boolean) as SubtitleCue[]
  }, [])

  const parseVTT = useCallback((t: string): SubtitleCue[] => {
    const l = t.replace(/\r\n/g, '\n').split('\n')
    const c: SubtitleCue[] = []; let i = 0
    while (i < l.length && !l[i].includes('-->')) i++
    while (i < l.length) {
      if (l[i].includes('-->')) {
        const m = l[i].match(/(\d{2}:\d{2}:\d{2}\.\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}\.\d{3})/)
        if (m) {
          const p = (s: string) => { const x = s.split(':'); return +x[0] * 3600 + +x[1] * 60 + +x[2] }
          const start = p(m[1]), end = p(m[2]); i++
          const tl: string[] = []
          while (i < l.length && l[i].trim() !== '') { tl.push(l[i]); i++ }
          if (tl.length) c.push({ start, end, text: tl.join('\n') })
        }
      }
      i++
    }
    return c
  }, [])

  // ── Track detection ──
  useEffect(() => {
    const v = videoRef.current
    if (!v || videoType === 'youtube') return
    const detect = () => {
      const ns: SubtitleTrack[] = []
      for (let i = 0; i < v.textTracks.length; i++) {
        const t = v.textTracks[i]; const c: SubtitleCue[] = []
        if (t.cues) for (let j = 0; j < t.cues.length; j++) { const q = t.cues[j] as VTTCue; c.push({ start: q.startTime, end: q.endTime, text: q.text }) }
        ns.push({ label: t.label || t.language || `زیرنویس ${i + 1}`, language: t.language || '', cues: c })
      }
      if (ns.length) setSubs(ns)
      const vv = v as HTMLVideoElement & { audioTracks?: AudioTrackList }
      if (vv.audioTracks && vv.audioTracks.length > 1) {
        const at: AudioTrack[] = []
        for (let i = 0; i < vv.audioTracks.length; i++) { const a = vv.audioTracks[i]; at.push({ label: a.label || a.language || `صدا ${i + 1}`, language: a.language || '', index: i }) }
        setAudios(at)
      }
    }
    v.addEventListener('loadedmetadata', detect)
    const t = setTimeout(detect, 2000)
    return () => { v.removeEventListener('loadedmetadata', detect); clearTimeout(t) }
  }, [videoType])

  // ── Auto-detect MKV embedded subtitles ──
  useEffect(() => {
    if (videoType === 'youtube') return
    const isMkv = videoUrl.toLowerCase().endsWith('.mkv') || videoUrl.toLowerCase().includes('.mkv?')
    if (!isMkv) return

    let cancelled = false
    const detectMKV = async () => {
      try {
        // Step 1: Detect subtitle tracks from MKV header (fetches ~128KB)
        const detectResp = await fetch(`/api/subtitles?action=detect&url=${encodeURIComponent(videoUrl)}`)
        if (!detectResp.ok || cancelled) return
        const { tracks } = await detectResp.json()
        if (!tracks?.length || cancelled) return

        // Step 2: Add each text-based subtitle track
        const textTracks = tracks.filter((t: { codecId: string }) => t.codecId.startsWith('S_TEXT/'))

        for (const track of textTracks) {
          if (cancelled) return

          // Extract subtitles for this track (server fetches specific clusters)
          const extractResp = await fetch(
            `/api/subtitles?action=extract&url=${encodeURIComponent(videoUrl)}&track=${track.number}`
          )
          if (!extractResp.ok || cancelled) continue
          const { cues } = await extractResp.json()
          if (!cues?.length || cancelled) continue

          const label = track.name || track.language || `زیرنویس (${track.codecId.replace('S_TEXT/', '')})`
          setSubs(prev => {
            // Avoid duplicates
            if (prev.some(s => s.label === label && s.language === (track.language || 'mkv'))) return prev
            const next = [...prev, { label, language: track.language || 'mkv', cues }]
            // Auto-select the first one
            if (prev.length === 0) setActiveSub(next.length - 1)
            return next
          })
        }
      } catch (err) {
        console.error('MKV subtitle detection failed:', err)
      }
    }

    const timer = setTimeout(detectMKV, 1000)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [videoUrl, videoType])

  // ── Subtitle file ──
  const loadSub = useCallback(async (file: File) => {
    const text = await file.text()
    const ext = file.name.split('.').pop()?.toLowerCase()
    let c: SubtitleCue[] = []
    if (ext === 'srt') c = parseSRT(text)
    else if (ext === 'vtt') c = parseVTT(text)
    if (c.length) setSubs(p => [...p, { label: file.name.replace(/\.[^.]+$/, ''), language: 'custom', cues: c }])
  }, [parseSRT, parseVTT])

  // ── Sub sync ──
  useEffect(() => {
    const v = videoRef.current
    if (!v || videoType === 'youtube') return
    if (subTimer.current) clearInterval(subTimer.current)
    subTimer.current = setInterval(() => {
      if (activeSub < 0 || activeSub >= subs.length) { setSubText(''); return }
      const tr = subs[activeSub]; if (!tr) return
      const t = v.currentTime
      const active = tr.cues.find(c => t >= c.start && t <= c.end)
      setSubText(active ? active.text : '')
    }, 80)
    return () => { if (subTimer.current) clearInterval(subTimer.current) }
  }, [activeSub, subs, videoType])

  // ── External sync ──
  useEffect(() => {
    if (!externalState || localAction.current || videoType === 'youtube') return
    const v = videoRef.current; if (!v) return
    if (Math.abs(v.currentTime - externalState.currentTime) > 0.5) v.currentTime = externalState.currentTime
    if (externalState.isPlaying && v.paused) v.play().catch(() => {})
    else if (!externalState.isPlaying && !v.paused) v.pause()
  }, [externalState, videoType])

  const emit = useCallback((p: boolean, t: number) => {
    localAction.current = true
    if (syncTimer.current) clearTimeout(syncTimer.current)
    syncTimer.current = setTimeout(() => { onSync({ isPlaying: p, currentTime: t }); localAction.current = false }, 50)
  }, [onSync])

  const togglePlay = () => { const v = videoRef.current; if (v) v.paused ? v.play() : v.pause() }
  const onPlay = () => { setPlaying(true); emit(true, videoRef.current?.currentTime || 0) }
  const onPause = () => { setPlaying(false); emit(false, videoRef.current?.currentTime || 0) }
  const onSeeking = () => { const v = videoRef.current; if (v) emit(playing, v.currentTime) }
  const onTime = () => { const v = videoRef.current; if (v) setTime(v.currentTime) }
  const onSeek = (e: React.ChangeEvent<HTMLInputElement>) => { const v = videoRef.current; if (v) { const t = +e.target.value; v.currentTime = t; setTime(t); emit(playing, t) } }
  const onVol = (e: React.ChangeEvent<HTMLInputElement>) => { const v = videoRef.current; if (v) { const vl = +e.target.value / 100; v.volume = vl; setVol(vl * 100); setMuted(vl === 0) } }
  const toggleMute = () => { const v = videoRef.current; if (v) { v.muted = !v.muted; setMuted(v.muted) } }
  const fmt = (s: number) => { const m = Math.floor(s / 60); return `${m}:${Math.floor(s % 60).toString().padStart(2, '0')}` }

  // ── Orientation lock helpers ──
  const lockLandscape = async () => {
    try {
      const screenAny = screen as Screen & { orientation?: { lock?: (o: string) => Promise<void> } }
      if (screenAny.orientation?.lock) await screenAny.orientation.lock('landscape')
    } catch { /* orientation lock not supported or blocked */ }
  }
  const unlockOrientation = async () => {
    try {
      const screenAny = screen as Screen & { orientation?: { unlock?: () => void } }
      if (screenAny.orientation?.unlock) screenAny.orientation.unlock()
    } catch { /* orientation unlock not supported */ }
  }

  const isMobile = () => /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)

  // ── Fullscreen toggle with orientation lock + iOS fallback ──
  const toggleFs = async () => {
    const c = containerRef.current; if (!c) return
    if (document.fullscreenElement || (document as Document & { webkitFullscreenElement?: Element }).webkitFullscreenElement) {
      // Exit fullscreen
      try {
        if (document.fullscreenElement) await document.exitFullscreen()
        else await (document as Document & { webkitExitFullscreen?: () => Promise<void> }).webkitExitFullscreen?.()
      } catch { /* ignore */ }
      if (isMobile()) unlockOrientation()
    } else {
      // Enter fullscreen
      try {
        if (c.requestFullscreen) await c.requestFullscreen()
        else await (c as HTMLElement & { webkitRequestFullscreen?: () => Promise<void> }).webkitRequestFullscreen?.()
      } catch { /* fallback: try native video fullscreen on iOS */ }
      // iOS Safari: use video element's native fullscreen
      if (!document.fullscreenElement && videoRef.current) {
        const v = videoRef.current as HTMLVideoElement & { webkitEnterFullscreen?: () => void }
        if (v.webkitEnterFullscreen) { v.webkitEnterFullscreen(); return }
      }
      if (isMobile()) lockLandscape()
    }
  }

  useEffect(() => {
    const h = () => {
      const inFs = !!(document.fullscreenElement || (document as Document & { webkitFullscreenElement?: Element }).webkitFullscreenElement)
      setFs(inFs)
      if (!inFs && isMobile()) unlockOrientation()
    }
    document.addEventListener('fullscreenchange', h)
    document.addEventListener('webkitfullscreenchange', h)
    return () => {
      document.removeEventListener('fullscreenchange', h)
      document.removeEventListener('webkitfullscreenchange', h)
    }
  }, [])

  const show = useCallback(() => {
    setControls(true)
    if (hideTimer.current) clearTimeout(hideTimer.current)
    if (playing) hideTimer.current = setTimeout(() => setControls(false), 3500)
  }, [playing])

  useEffect(() => {
    if (playing) show()
    else { setControls(true); if (hideTimer.current) clearTimeout(hideTimer.current) }
    return () => { if (hideTimer.current) clearTimeout(hideTimer.current) }
  }, [playing, show])

  useEffect(() => {
    if (panel === 'none') return
    const h = (e: MouseEvent) => { if (!(e.target as HTMLElement).closest('[data-settings]')) setPanel('none') }
    setTimeout(() => document.addEventListener('click', h), 0)
    return () => document.removeEventListener('click', h)
  }, [panel])

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (videoType === 'youtube') return
      // Don't intercept when user is typing in an input/textarea
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) return
      const v = videoRef.current; if (!v) return
      switch (e.key) {
        case ' ': case 'k': e.preventDefault(); togglePlay(); break
        case 'ArrowRight': e.preventDefault(); v.currentTime = Math.min(v.currentTime + 10, dur); break
        case 'ArrowLeft': e.preventDefault(); v.currentTime = Math.max(v.currentTime - 10, 0); break
        case 'ArrowUp': e.preventDefault(); v.volume = Math.min(v.volume + 0.1, 1); setVol(v.volume * 100); break
        case 'ArrowDown': e.preventDefault(); v.volume = Math.max(v.volume - 0.1, 0); setVol(v.volume * 100); break
        case 'f': e.preventDefault(); toggleFs(); break
        case 'm': e.preventDefault(); toggleMute(); break
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [videoType, dur])

  const pct = dur > 0 ? (time / dur) * 100 : 0
  const subFontFamily = subFont === 'mono' ? 'var(--font-mono)' : 'var(--font-body)'

  if (videoType === 'youtube') {
    return (
      <div ref={containerRef} className="video-player-container relative w-full max-sm:aspect-auto sm:aspect-video bg-black rounded-xl sm:rounded-2xl overflow-hidden ring-1 ring-white/5">
        <iframe ref={playerRef} src={`https://www.youtube.com/embed/${videoUrl}?enablejsapi=1&rel=0`} className="absolute inset-0 w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
      </div>
    )
  }

  const proxyUrl = `/api/proxy?url=${encodeURIComponent(videoUrl)}`

  return (
    <div
      ref={containerRef}
      className="video-player-container relative w-full max-sm:aspect-auto sm:aspect-video bg-black rounded-xl sm:rounded-2xl overflow-hidden group ring-1 ring-white/5 video-glow"
      onMouseMove={show}
      onMouseLeave={() => { if (playing) setControls(false); setPanel('none') }}
      onTouchStart={show}
    >
      {/* Loading */}
      {loading && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 rounded-full border-[3px] border-[var(--accent)] border-t-transparent animate-spin" />
            <span className="text-sm text-white/60" style={{ fontFamily: 'var(--font-body)' }}>در حال بارگذاری...</span>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3 text-center px-6">
            <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center">
              <svg className="w-7 h-7 text-red-400/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <p className="text-sm text-white/70 font-medium" style={{ fontFamily: 'var(--font-body)' }}>خطا در بارگذاری ویدیو</p>
            <p className="text-xs text-white/30 max-w-[250px]" style={{ fontFamily: 'var(--font-body)' }}>
              سرور ویدیو در دسترس نیست. لینک را بررسی کنید یا بعداً تلاش کنید.
            </p>
            <button onClick={() => { setError(false); setLoading(true); const v = videoRef.current; if (v) { v.load() } }} className="mt-1 px-4 py-1.5 bg-white/5 hover:bg-white/10 text-white/50 hover:text-white/70 rounded-lg text-xs transition border border-white/5" style={{ fontFamily: 'var(--font-body)' }}>
              تلاش مجدد
            </button>
          </div>
        </div>
      )}

      <video ref={videoRef} src={proxyUrl} className="w-full h-full object-contain" onPlay={onPlay} onPause={onPause} onSeeking={onSeeking} onTimeUpdate={onTime} onLoadedMetadata={e => { setDur(e.currentTarget.duration); setLoading(false) }} onWaiting={() => setLoading(true)} onCanPlay={() => setLoading(false)} onError={() => { setError(true); setLoading(false) }} onClick={togglePlay} crossOrigin="anonymous" preload="metadata" controls={false} />

      {/* Subtitle */}
      {subText && (
        <div className="subtitle-overlay absolute bottom-16 sm:bottom-20 left-1/2 -translate-x-1/2 z-20 pointer-events-none max-w-[85%] sm:max-w-[80%]">
          <span className="inline-block px-3 py-1.5 rounded-lg whitespace-pre-line leading-relaxed" style={{ fontSize: `${subSize * 0.014}rem`, color: subColor, background: `rgba(0,0,0,${subBg / 100})`, fontFamily: subFontFamily, textShadow: '0 2px 8px rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)', direction: 'rtl' }}>
            {subText}
          </span>
        </div>
      )}

      {/* Controls */}
      {!error && (
        <div dir="ltr" className={`video-controls-overlay absolute inset-0 flex flex-col justify-end transition-opacity duration-300 ${controls ? 'opacity-100' : 'opacity-0'} pointer-events-none`}>
          {/* Gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/20 to-transparent pointer-events-none" />

          {/* Big center play overlay — visible only when paused */}
          {!playing && !loading && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
              <button onClick={togglePlay} className="pointer-events-auto w-14 h-14 sm:w-20 sm:h-20 rounded-full bg-white/15 backdrop-blur-xl border border-white/20 flex items-center justify-center hover:scale-105 active:scale-95 transition-all duration-200 shadow-2xl">
                <svg className="w-6 h-6 sm:w-9 sm:h-9 text-white ml-[-2px] sm:ml-[-3px]" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
              </button>
            </div>
          )}

          {/* Bottom control bar */}
          <div className="relative z-10 pointer-events-auto">
            {/* Progress bar — full-width, easy to scrub */}
            <div className="group/prog cursor-pointer px-3 sm:px-4 pb-1">
              <div className="relative h-[3px] bg-white/15 rounded-full group-hover/prog:h-[5px] transition-all">
                <div className="absolute inset-y-0 left-0 bg-white/30 rounded-full" style={{ width: '100%' }} />
                <div className="absolute inset-y-0 left-0 bg-[var(--accent)] rounded-full" style={{ width: `${pct}%` }} />
                <input type="range" min="0" max={dur || 100} value={time} onChange={onSeek} className="absolute inset-0 w-full opacity-0 cursor-pointer" />
                <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 sm:w-4 sm:h-4 bg-[var(--accent)] rounded-full shadow-lg opacity-0 group-hover/prog:opacity-100 transition-opacity pointer-events-none" style={{ left: `calc(${pct}% - 6px)` }} />
              </div>
            </div>

            {/* Buttons row — compact, well-spaced */}
            <div className="flex items-center justify-between px-2 sm:px-3 pb-2 sm:pb-3 pt-0.5">
              {/* Left group: play, skip, volume, time */}
              <div className="flex items-center">
                {/* Play/Pause — normal size icon, not oversized */}
                <button onClick={togglePlay} className="w-10 h-10 sm:w-10 sm:h-10 flex items-center justify-center text-white hover:text-[var(--accent)] rounded-lg hover:bg-white/10 active:bg-white/15 transition-all">
                  {playing ? (
                    <svg className="w-[18px] h-[18px] sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" /></svg>
                  ) : (
                    <svg className="w-[18px] h-[18px] sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                  )}
                </button>
                {/* Skip back 10s */}
                <button onClick={() => { const v = videoRef.current; if (v) v.currentTime = Math.max(v.currentTime - 10, 0) }} className="w-10 h-10 sm:w-10 sm:h-10 flex items-center justify-center text-white/60 hover:text-white rounded-lg hover:bg-white/10 active:bg-white/15 transition-all" title="۱۰ ثانیه عقب">
                  <svg className="w-[16px] h-[16px] sm:w-[18px] sm:h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M11.25 9l-3 3m0 0l3 3m-3-3h7.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </button>
                {/* Skip fwd 10s */}
                <button onClick={() => { const v = videoRef.current; if (v) v.currentTime = Math.min(v.currentTime + 10, dur) }} className="w-10 h-10 sm:w-10 sm:h-10 flex items-center justify-center text-white/60 hover:text-white rounded-lg hover:bg-white/10 active:bg-white/15 transition-all" title="۱۰ ثانیه جلو">
                  <svg className="w-[16px] h-[16px] sm:w-[18px] sm:h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12.75 15l3-3m0 0l-3-3m3 3h-7.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </button>

                <div className="w-px h-4 bg-white/10 mx-0.5" />

                {/* Volume — compact on mobile */}
                <div className="flex items-center group/vol">
                  <button onClick={toggleMute} className="w-10 h-10 sm:w-10 sm:h-10 flex items-center justify-center text-white/70 hover:text-white rounded-lg hover:bg-white/10 active:bg-white/15 transition-all">
                    {muted || vol === 0 ? (
                      <svg className="w-[18px] h-[18px] sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" /></svg>
                    ) : vol < 50 ? (
                      <svg className="w-[18px] h-[18px] sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z" /></svg>
                    ) : (
                      <svg className="w-[18px] h-[18px] sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" /></svg>
                    )}
                  </button>
                  <input type="range" min="0" max="100" value={vol} onChange={onVol} className="w-0 group-hover/vol:w-20 transition-all duration-200 h-1 accent-[var(--accent)]" />
                </div>

                {/* Time — always visible */}
                <span className="text-white/70 text-[11px] sm:text-[13px] tabular-nums ml-1.5 sm:ml-3 select-none" style={{ fontFamily: 'var(--font-mono)' }}>
                  {fmt(time)}<span className="text-white/30 mx-0.5">/</span>{fmt(dur)}
                </span>
              </div>

              {/* Right group: settings, fullscreen */}
              <div className="flex items-center">
                <input ref={fileRef} type="file" accept=".srt,.vtt" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) loadSub(f); e.target.value = '' }} />

                {/* Settings */}
                <div className="relative" data-settings>
                  <button onClick={e => { e.stopPropagation(); setPanel(panel === 'main' ? 'none' : 'main') }} className="w-10 h-10 sm:w-10 sm:h-10 flex items-center justify-center text-white/60 hover:text-white rounded-lg hover:bg-white/10 active:bg-white/15 transition-all">
                    <svg className="w-[18px] h-[18px] sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </button>

                  {panel === 'main' && (
                    <div className="absolute bottom-full right-0 mb-3 bg-[#1c1f26] border border-white/10 rounded-2xl p-1.5 min-w-[220px] shadow-2xl" onClick={e => e.stopPropagation()}>
                      <button onClick={() => setPanel('subtitles')} className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm text-white/70 hover:bg-white/5 hover:text-white transition">
                        <span className="flex items-center gap-2.5" style={{ fontFamily: 'var(--font-body)' }}>زیرنویس</span>
                        <span className="text-xs text-white/30">{activeSub >= 0 ? subs[activeSub]?.label : 'خاموش'}</span>
                      </button>
                      {audios.length > 1 && <button onClick={() => setPanel('audio')} className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm text-white/70 hover:bg-white/5 hover:text-white transition">
                        <span className="flex items-center gap-2.5" style={{ fontFamily: 'var(--font-body)' }}>صدا</span>
                        <span className="text-xs text-white/30">{audios[activeAudio]?.label || 'پیش‌فرض'}</span>
                      </button>}
                      <button onClick={() => setPanel('subtitle-style')} className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm text-white/70 hover:bg-white/5 hover:text-white transition">
                        <span className="flex items-center gap-2.5" style={{ fontFamily: 'var(--font-body)' }}>ظاهر زیرنویس</span>
                      </button>
                      <div className="border-t border-white/5 mt-1 pt-1">
                        <button onClick={() => fileRef.current?.click()} className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm text-[var(--accent)] hover:bg-[var(--accent)]/10 transition font-medium" style={{ fontFamily: 'var(--font-body)' }}>
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                          </svg>
                          بارگذاری فایل زیرنویس
                        </button>
                      </div>
                    </div>
                  )}

                  {panel === 'subtitles' && (
                    <div className="absolute bottom-full right-0 mb-3 bg-[#1c1f26] border border-white/10 rounded-2xl p-2 min-w-[240px] shadow-2xl" onClick={e => e.stopPropagation()}>
                      <button onClick={() => setPanel('main')} className="flex items-center gap-1 text-xs text-white/40 hover:text-white mb-2 px-2">
                        <svg className="w-3 h-3 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        بازگشت
                      </button>
                      <p className="text-[11px] text-white/30 px-2 mb-1 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>زیرنویس</p>
                      <button onClick={() => { setActiveSub(-1); setPanel('none') }} className={`w-full text-right text-sm px-3 py-2 rounded-xl transition ${activeSub === -1 ? 'bg-[var(--accent)]/15 text-[var(--accent)]' : 'text-white/60 hover:bg-white/5'}`} style={{ fontFamily: 'var(--font-body)' }}>خاموش</button>
                      {subs.map((tr, i) => {
                        const isMKV = tr.language === 'mkv'
                        return (
                          <button key={i} onClick={() => { setActiveSub(i); setPanel('none') }} className={`w-full text-right text-sm px-3 py-2 rounded-xl transition ${activeSub === i ? 'bg-[var(--accent)]/15 text-[var(--accent)]' : 'text-white/60 hover:bg-white/5'}`} style={{ fontFamily: 'var(--font-body)' }}>
                            {isMKV && <span className="text-[10px] bg-[var(--accent)]/20 text-[var(--accent)] px-1.5 py-0.5 rounded-md ml-1.5">MKV</span>}
                            {tr.label}
                          </button>
                        )
                      })}
                      <div className="border-t border-white/5 mt-1 pt-1">
                        <button onClick={() => fileRef.current?.click()} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-[var(--accent)] hover:bg-[var(--accent)]/10 transition font-medium" style={{ fontFamily: 'var(--font-body)' }}>
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                          </svg>
                          بارگذاری فایل زیرنویس
                        </button>
                      </div>
                    </div>
                  )}

                  {panel === 'audio' && (
                    <div className="absolute bottom-full right-0 mb-3 bg-[#1c1f26] border border-white/10 rounded-2xl p-2 min-w-[220px] shadow-2xl" onClick={e => e.stopPropagation()}>
                      <button onClick={() => setPanel('main')} className="flex items-center gap-1 text-xs text-white/40 hover:text-white mb-2 px-2">
                        <svg className="w-3 h-3 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        بازگشت
                      </button>
                      <p className="text-[11px] text-white/30 px-2 mb-1 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>صدا</p>
                      {audios.map((tr, i) => (
                        <button key={i} onClick={() => { setActiveAudio(i); const v = videoRef.current as (HTMLVideoElement & { audioTracks?: AudioTrackList }) | null; if (v?.audioTracks) for (let j = 0; j < v.audioTracks.length; j++) v.audioTracks[j].enabled = j === i; setPanel('none') }} className={`w-full text-right text-sm px-3 py-2 rounded-xl transition ${activeAudio === i ? 'bg-[var(--accent)]/15 text-[var(--accent)]' : 'text-white/60 hover:bg-white/5'}`} style={{ fontFamily: 'var(--font-body)' }}>
                          {tr.label}{tr.language && <span className="text-xs text-white/30 mr-1">({tr.language})</span>}
                        </button>
                      ))}
                    </div>
                  )}

                  {panel === 'subtitle-style' && (
                    <div className="absolute bottom-full right-0 mb-3 bg-[#1c1f26] border border-white/10 rounded-2xl p-4 min-w-[280px] shadow-2xl" onClick={e => e.stopPropagation()}>
                      <button onClick={() => setPanel('main')} className="flex items-center gap-1 text-xs text-white/40 hover:text-white mb-4 px-1">
                        <svg className="w-3 h-3 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        بازگشت
                      </button>
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-1.5"><span className="text-xs text-white/40" style={{ fontFamily: 'var(--font-body)' }}>اندازه</span><span className="text-xs text-[var(--accent)]">{subSize}%</span></div>
                        <input type="range" min="50" max="200" value={subSize} onChange={e => setSubSize(+e.target.value)} className="w-full h-1" />
                      </div>
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-1.5"><span className="text-xs text-white/40" style={{ fontFamily: 'var(--font-body)' }}>شفافیت</span><span className="text-xs text-[var(--accent)]">{subBg}%</span></div>
                        <input type="range" min="0" max="100" value={subBg} onChange={e => setSubBg(+e.target.value)} className="w-full h-1" />
                      </div>
                      <div className="mb-4">
                        <span className="text-xs text-white/40 block mb-2" style={{ fontFamily: 'var(--font-body)' }}>رنگ</span>
                        <div className="flex gap-2">
                          {['#ffffff', '#ffff00', '#00ff00', '#00ffff', '#ff6b6b'].map(c => (
                            <button key={c} onClick={() => setSubColor(c)} className={`w-8 h-8 sm:w-7 sm:h-7 rounded-full border-2 transition-all ${subColor === c ? 'border-white scale-110' : 'border-transparent opacity-60 hover:opacity-100'}`} style={{ background: c }} />
                          ))}
                        </div>
                      </div>
                      <div>
                        <span className="text-xs text-white/40 block mb-2" style={{ fontFamily: 'var(--font-body)' }}>فونت</span>
                        <div className="flex gap-1.5">
                          {[{ k: 'default', l: 'پیش‌فرض' }, { k: 'sans', l: 'Sans' }, { k: 'mono', l: 'Mono' }].map(f => (
                            <button key={f.k} onClick={() => setSubFont(f.k)} className={`px-3 py-2 sm:py-1.5 rounded-lg text-xs transition ${subFont === f.k ? 'bg-[var(--accent)]/15 text-[var(--accent)]' : 'text-white/50 hover:bg-white/5'}`} style={{ fontFamily: f.k === 'mono' ? 'var(--font-mono)' : 'var(--font-body)' }}>{f.l}</button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Fullscreen — always visible, clearly tappable */}
                <button onClick={toggleFs} className="w-10 h-10 sm:w-10 sm:h-10 flex items-center justify-center text-white/60 hover:text-white rounded-lg hover:bg-white/10 active:bg-white/15 transition-all">
                  {fs ? (
                    <svg className="w-[18px] h-[18px] sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z" /></svg>
                  ) : (
                    <svg className="w-[18px] h-[18px] sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" /></svg>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
