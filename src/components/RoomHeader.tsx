'use client'

import { useState, useRef, useEffect } from 'react'

interface RoomHeaderProps {
  roomName: string
  roomId: string
  userCount: number
  users: string[]
  speakingUsers?: string[]
}

export default function RoomHeader({ roomName, roomId, userCount, users, speakingUsers = [] }: RoomHeaderProps) {
  const [copied, setCopied] = useState(false)
  const [showUsers, setShowUsers] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [dropdownAlign, setDropdownAlign] = useState<'left' | 'right'>('left')

  // Calculate dropdown position to keep it in viewport
  useEffect(() => {
    if (!showUsers || !buttonRef.current) return
    const btn = buttonRef.current.getBoundingClientRect()
    const dropdownWidth = 180
    const spaceRight = window.innerWidth - btn.right
    const spaceLeft = btn.left
    setDropdownAlign(spaceRight < dropdownWidth && spaceLeft > spaceRight ? 'right' : 'left')
  }, [showUsers])

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!showUsers) return
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowUsers(false)
      }
    }
    setTimeout(() => document.addEventListener('mousedown', handler), 0)
    return () => document.removeEventListener('mousedown', handler)
  }, [showUsers])

  const copyLink = async () => {
    const url = `${window.location.origin}/room/${roomId}`
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = url; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex items-center justify-between gap-2 sm:gap-4 w-full relative">
      {/* Left: room info */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <div className="w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse-dot flex-shrink-0" />
        <div className="min-w-0">
          <h1 className="text-xs sm:text-sm font-bold text-white truncate max-w-[120px] sm:max-w-none" style={{ fontFamily: 'var(--font-heading)' }}>{roomName}</h1>
<div className="relative inline-block" ref={containerRef}>
            <button ref={buttonRef} onClick={() => setShowUsers(!showUsers)} className="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs text-white/40 hover:text-white/70 transition-all min-h-[24px] px-1 -mx-1 rounded-md hover:bg-white/5" style={{ fontFamily: 'var(--font-body)' }}>
              <span>{userCount} نفر آنلاین</span>
              <svg className={`w-3 h-3 transition-transform duration-200 ${showUsers ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>

            {/* Users dropdown — positioned relative to button, auto-aligns to stay in viewport */}
            {showUsers && (
              <div ref={dropdownRef} className="absolute top-full mt-2 z-50 animate-fade-in" style={{
                left: dropdownAlign === 'left' ? 0 : 'auto',
                right: dropdownAlign === 'right' ? 0 : 'auto'
              }}>
                <div className="bg-[#1c1f26] border border-white/10 rounded-xl p-3 shadow-2xl flex flex-wrap gap-1.5 min-w-[160px]">
                  {users.length === 0 ? (
                    <span className="text-[11px] text-white/30 px-1" style={{ fontFamily: 'var(--font-body)' }}>کسی آنلاین نیست</span>
                  ) : users.map((u, i) => (
                    <span key={i} className={`px-2.5 py-1.5 text-[11px] flex items-center gap-1.5 rounded-lg transition-colors ${
                      speakingUsers.includes(u)
                        ? 'bg-[var(--accent)]/15 text-[var(--accent)] border border-[var(--accent)]/20'
                        : 'bg-white/5 text-white/70'
                    }`} style={{ fontFamily: 'var(--font-body)' }}>
                      {speakingUsers.includes(u) ? (
                        <div className="flex gap-[1.5px] items-end h-3">
                          <span className="w-[2.5px] bg-current rounded-full animate-voice-bar" style={{ height: '6px', animationDelay: '0ms' }} />
                          <span className="w-[2.5px] bg-current rounded-full animate-voice-bar" style={{ height: '10px', animationDelay: '150ms' }} />
                          <span className="w-[2.5px] bg-current rounded-full animate-voice-bar" style={{ height: '7px', animationDelay: '300ms' }} />
                        </div>
                      ) : (
                        <span className="w-1.5 h-1.5 bg-current rounded-full flex-shrink-0" />
                      )}
                      {u}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right: share */}
      <button onClick={copyLink} className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-[10px] sm:text-xs font-medium transition-all duration-200 flex-shrink-0 min-h-[32px] active:scale-95 ${copied ? 'bg-[var(--accent)] text-[var(--bg-deep)] shadow-md shadow-[var(--accent)]/20' : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white border border-white/10 active:bg-white/15'}`} style={{ fontFamily: 'var(--font-body)' }}>
        {copied ? (
          <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg><span className="hidden sm:inline">کپی شد</span></>
        ) : (
          <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg><span className="hidden sm:inline">اشتراک‌گذاری</span></>
        )}
      </button>
    </div>
  )
}
