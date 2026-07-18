'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { Message } from '@/types'

interface ChatProps {
  messages: Message[]
  onSendMessage: (content: string) => void
  username: string
}

const emojiCategories = [
  { name: 'احساسات', emojis: ['😀', '😂', '🥹', '😍', '🤩', '😎', '🥳', '😭', '😱', '🤔', '🫡', '😴', '🤯', '🥺', '😏'] },
  { name: 'واکنش', emojis: ['👍', '👎', '❤️', '🔥', '💯', '🎉', '👏', '🤝', '💪', '🫶', '👀', '✨', '🎬', '🍿', '🫰'] },
  { name: 'اشیاء', emojis: ['🎬', '🎞️', '📺', '🎤', '🎵', '🎶', '🏆', '⭐', '🌟', '💡', '🎯', '🎲', '🎮', '🎪', '🎭'] },
]

function Avatar({ name }: { name: string }) {
  const colors = [['#FF6B6B', '#FFB347'], ['#00D4AA', '#00B4D8'], ['#A78BFA', '#818CF8'], ['#F472B6', '#EC4899'], ['#FBBF24', '#F59E0B'], ['#34D399', '#10B981'], ['#60A5FA', '#3B82F6'], ['#F87171', '#EF4444']]
  const [c1, c2] = colors[name.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % colors.length]
  return (
    <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0" style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}>
      {name.charAt(0).toUpperCase()}
    </div>
  )
}

export default function Chat({ messages, onSendMessage, username }: ChatProps) {
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

  const groups = useMemo(() => {
    const g: { username: string; messages: Message[] }[] = []
    for (const m of messages) { const l = g[g.length - 1]; if (l && l.username === m.username) l.messages.push(m); else g.push({ username: m.username, messages: [m] }) }
    return g
  }, [messages])

  return (
    <div className="flex flex-col h-full bg-[#12141a] rounded-2xl border border-white/5 overflow-hidden min-h-0">
      {/* Header */}
      <div className="px-3 sm:px-4 py-2.5 sm:py-3 border-b border-white/5 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2 sm:gap-2.5">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-[var(--accent)]/10 flex items-center justify-center">
            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <div>
            <h3 className="text-xs font-bold text-white" style={{ fontFamily: 'var(--font-heading)' }}>گفتگو</h3>
            <p className="text-[10px] text-white/30" style={{ fontFamily: 'var(--font-body)' }}>{messages.length} پیام</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 bg-[var(--accent)] rounded-full animate-pulse-dot" />
          <span className="text-[10px] text-white/30" style={{ fontFamily: 'var(--font-body)' }}>زنده</span>
        </div>
      </div>

      {/* Messages — independent scroll container with containment */}
      <div className="chat-scroll-container flex-1 px-2.5 sm:px-3 py-2 sm:py-3 space-y-0.5 min-h-0">
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
            <div key={m.id} className="flex justify-center my-2">
              <span className="text-[11px] text-amber-400/50 bg-amber-400/5 px-3 py-1 rounded-full" style={{ fontFamily: 'var(--font-body)' }}>{m.content}</span>
            </div>
          ))
          return (
            <div key={gi} className={`flex gap-1.5 sm:gap-2 mb-2.5 sm:mb-3 ${self ? 'flex-row-reverse' : ''}`}>
              <Avatar name={g.username} />
              <div className={`flex flex-col ${self ? 'items-end' : 'items-start'} max-w-[85%] sm:max-w-[80%]`}>
                {!self && <span className="text-[10px] font-medium text-[#00B4D8] mb-0.5 px-0.5" style={{ fontFamily: 'var(--font-heading)' }}>{g.username}</span>}
                <div className="space-y-0.5">
                  {g.messages.map(m => (
                    <div key={m.id} className={self ? 'flex justify-end' : ''}>
                      {isEmojiOnly(m.content) ? (
                        <span className="text-2xl sm:text-3xl leading-none">{m.content}</span>
                      ) : (
                        <div className={`chat-bubble px-3 py-1.5 sm:py-1.5 text-[14px] sm:text-[13px] leading-relaxed break-words whitespace-pre-wrap ${self ? 'bg-[var(--accent)] text-black rounded-2xl rounded-br-md' : 'bg-white/5 text-white/90 rounded-2xl rounded-bl-md border border-white/5'}`} style={{ fontFamily: 'var(--font-body)' }}>
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
        <div ref={emojiRef} className="border-t border-white/5 bg-[#0f1117] flex-shrink-0 animate-fade-in">
          <div className="flex border-b border-white/5">
            {emojiCategories.map((c, i) => (
              <button key={i} onClick={() => setEmojiTab(i)} className={`flex-1 py-2.5 text-xs font-medium transition-all ${emojiTab === i ? 'text-[var(--accent)] border-b-2 border-[var(--accent)] bg-[var(--accent)]/5' : 'text-white/30 hover:text-white/60 hover:bg-white/5'}`} style={{ fontFamily: 'var(--font-body)' }}>{c.name}</button>
            ))}
          </div>
          <div className="emoji-grid p-2 grid grid-cols-7 sm:grid-cols-8 gap-0.5 max-h-[120px] sm:max-h-[110px] overflow-y-auto">
            {emojiCategories[emojiTab].emojis.map(e => (
              <button key={e} onClick={() => { setInput(p => p + e); inputRef.current?.focus() }} className="flex items-center justify-center text-lg hover:bg-white/10 rounded-xl transition-all active:scale-85 h-9 sm:h-8">{e}</button>
            ))}
          </div>
        </div>
      )}

      {/* Quick reactions */}
      <div className="px-1.5 sm:px-2 py-1.5 border-t border-white/5 flex-shrink-0">
        <div className="flex gap-1 justify-center">
          {['👍', '❤️', '😂', '🔥', '🎉', '👏', '😮', '💯'].map(e => (
            <button key={e} onClick={() => onSendMessage(e)} className="reaction-btn w-9 h-9 sm:w-8 sm:h-8 flex items-center justify-center text-base sm:text-lg hover:bg-white/10 rounded-xl transition-all active:scale-85 active:bg-white/15">{e}</button>
          ))}
        </div>
      </div>

      {/* Input */}
      <form onSubmit={send} className="p-2 sm:p-2.5 border-t border-white/5 flex-shrink-0 safe-bottom">
        <div className="flex gap-1.5 sm:gap-2 items-center">
          <button type="button" onClick={() => setShowEmoji(!showEmoji)} className={`chat-emoji-btn w-11 h-11 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl transition-all flex-shrink-0 active:scale-90 ${showEmoji ? 'bg-[var(--accent)]/15 text-[var(--accent)] shadow-inner' : 'text-white/30 hover:text-white/60 hover:bg-white/5 active:bg-white/10'}`}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z" />
            </svg>
          </button>
          <input ref={inputRef} type="text" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) send(e) }} placeholder="پیام..." className="chat-input-field flex-1 px-3.5 py-2.5 bg-white/5 border border-white/5 rounded-xl text-white placeholder-white/20 focus:outline-none focus:border-[var(--accent)]/50 focus:bg-white/[0.07] text-[14px] sm:text-[13px] min-w-0 transition-all" style={{ fontFamily: 'var(--font-body)' }} />
          <button type="submit" disabled={!input.trim()} className="chat-send-btn w-11 h-11 sm:w-10 sm:h-10 flex items-center justify-center bg-gradient-to-br from-[var(--accent)] to-cyan-400 text-black rounded-xl hover:shadow-lg hover:shadow-[var(--accent)]/20 active:scale-90 disabled:opacity-20 disabled:cursor-not-allowed disabled:hover:shadow-none disabled:active:scale-100 transition-all flex-shrink-0">
            <svg className="w-4 h-4 rotate-180" fill="currentColor" viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" /></svg>
          </button>
        </div>
      </form>
    </div>
  )
}
