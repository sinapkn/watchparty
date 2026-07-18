'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function CreateRoom() {
  const router = useRouter()
  const [roomName, setRoomName] = useState('')
  const [videoUrl, setVideoUrl] = useState('')
  const [videoType, setVideoType] = useState<'youtube' | 'direct'>('youtube')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!roomName.trim()) {
      setError('لطفاً نام اتاق را وارد کنید')
      return
    }

    if (!videoUrl.trim()) {
      setError('لطفاً لینک ویدیو را وارد کنید')
      return
    }

    let finalVideoUrl = videoUrl

    if (videoType === 'youtube') {
      const youtubeId = extractYouTubeId(videoUrl)
      if (!youtubeId) {
        setError('لینک یوتیوب معتبر نیست')
        return
      }
      finalVideoUrl = youtubeId
    }

    setLoading(true)
    try {
      const response = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: roomName,
          videoUrl: finalVideoUrl,
          videoType,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create room')
      }

      const room = await response.json()
      router.push(`/room/${room.id}`)
    } catch {
      setError('خطا در ساخت اتاق')
    } finally {
      setLoading(false)
    }
  }

  const extractYouTubeId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=)([^&\s]+)/,
      /(?:youtu\.be\/)([^?\s]+)/,
      /(?:youtube\.com\/embed\/)([^?\s]+)/,
    ]
    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match) return match[1]
    }
    return null
  }

  return (
    <div className="bg-[var(--bg-card)] rounded-xl p-5 sm:p-6 shadow-[var(--shadow-elevated)] border border-[var(--border-subtle)]">
      <h2
        className="text-lg sm:text-xl font-bold text-[var(--text-primary)] mb-5 sm:mb-6 flex items-center gap-2.5 sm:gap-3"
        style={{ fontFamily: 'var(--font-heading)' }}
      >
        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center bg-gradient-to-br from-[var(--accent)] to-[#00B4D8]">
          <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </div>
        ساخت اتاق جدید
      </h2>

      <form onSubmit={handleSubmit} className="space-y-3.5 sm:space-y-4">
        {/* Video Type Toggle */}
        <div>
          <label className="block text-xs sm:text-sm font-medium text-[var(--text-secondary)] mb-1.5" style={{ fontFamily: 'var(--font-body)' }}>
            منبع ویدیو
          </label>
          <div className="grid grid-cols-2 gap-2 p-1 bg-[var(--bg-surface)] rounded-xl border border-[var(--border-subtle)]">
            <button
              type="button"
              onClick={() => setVideoType('youtube')}
              className={`flex items-center justify-center gap-1.5 sm:gap-2 py-3 px-3 rounded-lg font-medium transition-all duration-200 text-sm ${
                videoType === 'youtube'
                  ? 'bg-gradient-to-r from-red-600 to-red-500 text-white shadow-lg shadow-red-600/20 scale-[1.02]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] active:scale-[0.98]'
              }`}
              style={{ fontFamily: 'var(--font-body)' }}
            >
              <svg className="w-4 h-4 sm:w-[18px] sm:h-[18px]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
              </svg>
              یوتیوب
            </button>
            <button
              type="button"
              onClick={() => setVideoType('direct')}
              className={`flex items-center justify-center gap-1.5 sm:gap-2 py-3 px-3 rounded-lg font-medium transition-all duration-200 text-sm ${
                videoType === 'direct'
                  ? 'bg-gradient-to-r from-[var(--accent)] to-cyan-400 text-[var(--bg-deep)] shadow-lg shadow-[var(--accent)]/20 scale-[1.02]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] active:scale-[0.98]'
              }`}
              style={{ fontFamily: 'var(--font-body)' }}
            >
              <svg className="w-4 h-4 sm:w-[18px] sm:h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
              </svg>
              لینک مستقیم
            </button>
          </div>
        </div>

        {/* Room Name */}
        <div>
          <label className="block text-xs sm:text-sm font-medium text-[var(--text-secondary)] mb-1.5" style={{ fontFamily: 'var(--font-body)' }}>
            نام اتاق
          </label>
          <input
            type="text"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            placeholder="مثال: تماشای فیلم با دوستان"
            className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition text-[16px] sm:text-sm"
            style={{ fontFamily: 'var(--font-body)' }}
          />
        </div>

        {/* Video URL */}
        <div>
          <label className="block text-xs sm:text-sm font-medium text-[var(--text-secondary)] mb-1.5" style={{ fontFamily: 'var(--font-body)' }}>
            {videoType === 'youtube' ? 'لینک ویدیو یوتیوب' : 'لینک مستقیم ویدیو'}
          </label>
          <input
            type="url"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder={videoType === 'youtube' ? 'https://www.youtube.com/watch?v=...' : 'https://example.com/video.mp4'}
            className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition text-[16px] sm:text-sm"
            style={{ fontFamily: 'var(--font-body)' }}
          />
          {videoType === 'direct' && (
            <p className="mt-1.5 text-[10px] sm:text-xs text-[var(--text-muted)]" style={{ fontFamily: 'var(--font-body)' }}>
              پشتیبانی از فرمت‌های MP4، WebM، MKV و سایر فرمت‌های ویدیویی
            </p>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/25 text-red-400 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg text-xs sm:text-sm text-center" style={{ fontFamily: 'var(--font-body)' }}>
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 px-6 bg-gradient-to-r from-[var(--accent)] to-cyan-400 text-[var(--bg-deep)] font-bold rounded-xl shadow-lg shadow-[var(--accent)]/20 hover:shadow-xl hover:shadow-[var(--accent)]/30 hover:scale-[1.01] active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 focus:ring-offset-[var(--bg-card)] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-lg transition-all duration-200 text-sm min-h-[48px]"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              در حال ساخت...
            </span>
          ) : (
            'ساخت اتاق'
          )}
        </button>
      </form>
    </div>
  )
}
