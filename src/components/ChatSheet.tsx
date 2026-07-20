'use client'

import { useState, useRef, useEffect, useImperativeHandle, forwardRef, useCallback } from 'react'
import { Message } from '@/types'

interface ChatSheetHandle {
  open: () => void
  close: () => void
  peek: () => void
}

type SheetState = 'collapsed' | 'peek' | 'full'

interface ChatSheetProps {
  messages: Message[]
  onSendMessage: (content: string) => void
  username: string
  unreadCount?: number
  /** Controlled state from parent */
  state?: 'collapsed' | 'peek' | 'full'
  onStateChange?: (state: 'collapsed' | 'peek' | 'full') => void
}

export const ChatSheet = forwardRef<ChatSheetHandle, ChatSheetProps>(
  ({ messages, onSendMessage, username, unreadCount = 0, state: controlledState, onStateChange }, ref) => {
    const [state, setState] = useState<SheetState>('collapsed')
    const isControlled = controlledState !== undefined
    const effectiveState = isControlled ? controlledState : state

    const setStateWrapper = useCallback((newState: SheetState) => {
      if (!isControlled) {
        setState(newState)
      }
      onStateChange?.(newState)
    }, [isControlled, onStateChange])

    const sheetRef = useRef<HTMLDivElement>(null)
    const backdropRef = useRef<HTMLDivElement>(null)
    const startY = useRef(0)
    const currentY = useRef(0)
    const isDragging = useRef(false)
    const unreadHandledRef = useRef(false)

    useImperativeHandle(ref, () => ({
      open: () => setStateWrapper('full'),
      close: () => setStateWrapper('collapsed'),
      peek: () => setStateWrapper('peek'),
    }))

    // Track unread count changes via ref to avoid setState in effect
    const prevUnreadRef = useRef(unreadCount)
    useEffect(() => {
      if (unreadCount > prevUnreadRef.current && effectiveState === 'collapsed' && !unreadHandledRef.current) {
        unreadHandledRef.current = true
        setStateWrapper('peek')
      } else if (unreadCount === 0) {
        unreadHandledRef.current = false
      }
      prevUnreadRef.current = unreadCount
    }, [unreadCount, effectiveState, setStateWrapper])

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
      if (effectiveState === 'collapsed') return
      isDragging.current = true
      startY.current = e.touches[0].clientY
    }, [effectiveState])

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
      if (!isDragging.current || effectiveState === 'collapsed') return
      currentY.current = e.touches[0].clientY
      const delta = currentY.current - startY.current
      // Only allow dragging down to close
      if (delta > 0) {
        e.preventDefault()
        if (sheetRef.current) {
          const peekOffset = window.innerHeight * 0.4
          const fullOffset = 0
          const baseOffset = effectiveState === 'peek' ? peekOffset : fullOffset
          sheetRef.current.style.transform = `translateY(${Math.min(baseOffset + delta, window.innerHeight)}px)`
        }
      }
    }, [effectiveState])

    const handleTouchEnd = useCallback(() => {
      if (!isDragging.current || effectiveState === 'collapsed') return
      isDragging.current = false
      const delta = currentY.current - startY.current
      const threshold = window.innerHeight * 0.15

      if (delta > threshold) {
        // Swipe down enough - collapse
        setStateWrapper('collapsed')
      } else {
        // Snap back
        setStateWrapper(effectiveState)
      }
      if (sheetRef.current) {
        sheetRef.current.style.transform = ''
      }
    }, [effectiveState, setStateWrapper])

    const handleBackdropClick = useCallback(() => {
      setStateWrapper('collapsed')
    }, [setStateWrapper])

    const handleHandleClick = useCallback(() => {
      if (effectiveState === 'collapsed') {
        setStateWrapper(unreadCount > 0 ? 'full' : 'peek')
      } else if (effectiveState === 'peek') {
        setStateWrapper('full')
      } else {
        setStateWrapper('peek')
      }
    }, [effectiveState, unreadCount, setStateWrapper])

    // Prevent body scroll when sheet is open
    useEffect(() => {
      if (effectiveState !== 'collapsed') {
        document.body.style.overflow = 'hidden'
      } else {
        document.body.style.overflow = ''
      }
      return () => { document.body.style.overflow = '' }
    }, [effectiveState])

    // Render nothing on desktop - handled by sidebar
    if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
      return null
    }

    return (
      <>
        {/* Backdrop */}
        <div
          ref={backdropRef}
          className={`chat-sheet-backdrop ${effectiveState !== 'collapsed' ? 'visible' : ''}`}
          onClick={handleBackdropClick}
          aria-hidden="true"
        />

        {/* Chat Sheet */}
        <div
          ref={sheetRef}
          className={`chat-sheet ${effectiveState}`}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          role="dialog"
          aria-label="чат"
          aria-modal={effectiveState !== 'collapsed'}
        >
          {/* Handle */}
          <button
            className="chat-sheet-handle w-full h-12 flex items-center justify-center bg-[var(--bg-card)] border-b border-white/5"
            onClick={handleHandleClick}
            aria-expanded={state !== 'collapsed'}
            aria-controls="chat-sheet-content"
          >
            <div className="chat-sheet-handle" />
            {unreadCount > 0 && state === 'collapsed' && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 min-w-[20px] h-5 bg-[var(--accent)] text-black text-[11px] font-bold rounded-full flex items-center justify-center px-2"
                aria-live="polite"
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {/* Content */}
          <div id="chat-sheet-content" className="chat-sheet-content">
            <div className="flex-1 min-h-0">
              <ChatSheetInner
                messages={messages}
                onSendMessage={onSendMessage}
                username={username}
                isFull={state === 'full'}
              />
            </div>
          </div>
        </div>
      </>
    )
  }
)

ChatSheet.displayName = 'ChatSheet'

// Inner component to avoid re-rendering the whole sheet
function ChatSheetInner({ messages, onSendMessage, username }: {
  messages: Message[]
  onSendMessage: (content: string) => void
  username: string
  isFull: boolean
}) {
  const [input, setInput] = useState('')
  const [showEmoji, setShowEmoji] = useState(false)
  const [emojiTab, setEmojiTab] = useState(0)
  const endRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const emojiRef = useRef<HTMLDivElement>(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  useEffect(() => {
    if (!showEmoji) return
    const h = (e: MouseEvent) => { if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) setShowEmoji(false) }
    setTimeout(() => document.addEventListener('mousedown', h), 0)
    return () => document.removeEventListener('mousedown', h)
  }, [showEmoji])

  const send = (e: React.FormEvent) => {
    e.preventDefault()
    if (input.trim()) { onSendMessage(input.trim()); setInput(''); setShowEmoji(false) }
  }

  const fmtTime = (d: string) => new Date(d).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })

  const isEmojiOnly = (c: string) => /^[\p{Emoji_Presentation}\p{Extended_Pictographic}\s]+$/u.test(c.trim()) && c.trim().length <= 12

  const groups = messages.reduce((g: { username: string; messages: Message[] }[], m) => {
    const l = g[g.length - 1]
    if (l && l.username === m.username) l.messages.push(m)
    else g.push({ username: m.username, messages: [m] })
    return g
  }, [])

  const emojiCategories = [
    { name: 'احساسات', emojis: ['😀', '😂', '🥹', '😍', '🤩', '😎', '🥳', '😭', '😱', '🤔', '🫡', '😴', '🤯', '🥺', '😏'] },
    { name: 'واکنش', emojis: ['👍', '👎', '❤️', '🔥', '💯', '🎉', '👏', '🤝', '💪', '🫶', '👀', '✨', '🎬', '🍿', '🫰'] },
    { name: 'اشیاء', emojis: ['🎬', '🎞️', '📺', '🎤', '🎵', '🎶', '🏆', '⭐', '🌟', '💡', '🎯', '🎲', '🎮', '🎪', '🎭'] },
  ]

  return (
    <div className="flex flex-col h-full bg-[var(--bg-surface)] min-h-0">
      {/* Messages */}
      <div className="chat-scroll-container flex-1 overflow-y-auto overflow-x-hidden px-3 py-2 space-y-1 min-h-0">
        {!messages.length ? (
          <div className="flex flex-col items-center justify-center h-full text-white/20">
            <svg className="w-10 h-10 mb-3 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p className="text-xs" style={{ fontFamily: 'var(--font-body)' }}>شروع گفتگو</p>
          </div>
        ) : groups.map((g, gi) => {
          const self = g.username === username
          const sys = g.username === 'سیستم'
          if (sys) return g.messages.map(m => (
            <div key={m.id} className="flex justify-center my-1">
              <span className="text-[11px] text-amber-400/50 bg-amber-400/5 px-3 py-1 rounded-full" style={{ fontFamily: 'var(--font-body)' }}>{m.content}</span>
            </div>
          ))
          return (
            <div key={gi} className={`flex gap-1.5 ${self ? 'flex-row-reverse' : ''}`}>
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                style={{ background: `linear-gradient(135deg, #00D4AA, #00B4D8)` }}>
                {g.username.charAt(0).toUpperCase()}
              </div>
              <div className={`flex flex-col ${self ? 'items-end' : 'items-start'} max-w-[85%]`}>
                {!self && <span className="text-[10px] font-medium text-[#00B4D8] mb-0.5 px-0.5" style={{ fontFamily: 'var(--font-heading)' }}>{g.username}</span>}
                <div className="space-y-0.5">
                  {g.messages.map(m => (
                    <div key={m.id} className={self ? 'flex justify-end' : ''}>
                      {isEmojiOnly(m.content) ? (
                        <span className="text-2xl leading-none">{m.content}</span>
                      ) : (
                        <div className={`chat-bubble px-3 py-1.5 text-[13px] leading-relaxed break-words whitespace-pre-wrap ${
                          self
                            ? 'bg-[var(--accent)] text-black rounded-2xl rounded-br-md'
                            : 'bg-white/5 text-white/90 rounded-2xl rounded-bl-md border border-white/5'
                        }`} style={{ fontFamily: 'var(--font-body)' }}>
                          {m.content}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <span className="text-[9px] text-white/20 mt-0.5 px-0.5" style={{ fontFamily: 'var(--font-mono)', direction: 'ltr' }}>{fmtTime(g.messages[0].createdAt)}</span>
              </div>
            </div>
          )
        })}
        <div ref={endRef} />
      </div>

      {/* Emoji picker */}
      {showEmoji && (
        <div ref={emojiRef} className="border-t border-white/5 bg-[var(--bg-deep)] flex-shrink-0 animate-fade-in">
          <div className="flex border-b border-white/5">
            {emojiCategories.map((c, i) => (
              <button key={i} onClick={() => setEmojiTab(i)} className={`flex-1 py-2.5 text-xs font-medium transition-all ${
                emojiTab === i
                  ? 'text-[var(--accent)] border-b-2 border-[var(--accent)] bg-[var(--accent)]/5'
                  : 'text-white/30 hover:text-white/60 hover:bg-white/5'
              }`} style={{ fontFamily: 'var(--font-body)' }}>
                {c.name}
              </button>
            ))}
          </div>
          <div className="p-2 grid grid-cols-7 gap-0.5 max-h-[120px] overflow-y-auto">
            {emojiCategories[emojiTab].emojis.map(e => (
              <button key={e} onClick={() => { setInput(p => p + e); inputRef.current?.focus() }} className="flex items-center justify-center text-lg hover:bg-white/10 rounded-xl transition-all active:scale-85 h-9">
                {e}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Quick reactions */}
      <div className="px-2 py-1.5 border-t border-white/5 flex-shrink-0">
        <div className="flex gap-1 justify-center">
          {['👍', '❤️', '😂', '🔥', '🎉', '👏', '😮', '💯'].map(e => (
            <button key={e} onClick={() => onSendMessage(e)} className="w-9 h-9 flex items-center justify-center text-base hover:bg-white/10 rounded-xl transition-all active:scale-85 active:bg-white/15">
              {e}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <form onSubmit={send} className="p-2 border-t border-white/5 flex-shrink-0 safe-bottom">
        <div className="flex gap-1.5 items-center">
          <button type="button" onClick={() => setShowEmoji(!showEmoji)} className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all flex-shrink-0 active:scale-90 ${
            showEmoji
              ? 'bg-[var(--accent)]/15 text-[var(--accent)] shadow-inner'
              : 'text-white/30 hover:text-white/60 hover:bg-white/5 active:bg-white/10'
          }`}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z" />
            </svg>
          </button>
          <input ref={inputRef} type="text" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) send(e) }} placeholder="پیام..." className="flex-1 px-3.5 py-2.5 bg-white/5 border border-white/5 rounded-xl text-white placeholder-white/20 focus:outline-none focus:border-[var(--accent)]/50 focus:bg-white/[0.07] text-[13px] min-w-0 transition-all" style={{ fontFamily: 'var(--font-body)' }} />
          <button type="submit" disabled={!input.trim()} className="w-10 h-10 flex items-center justify-center bg-gradient-to-br from-[var(--accent)] to-cyan-400 text-black rounded-xl hover:shadow-lg hover:shadow-[var(--accent)]/20 active:scale-90 disabled:opacity-20 disabled:cursor-not-allowed disabled:hover:shadow-none disabled:active:scale-100 transition-all flex-shrink-0">
            <svg className="w-4 h-4 rotate-180" fill="currentColor" viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" /></svg>
          </button>
        </div>
      </form>
    </div>
  )
}

ChatSheetInner.displayName = 'ChatSheetInner'