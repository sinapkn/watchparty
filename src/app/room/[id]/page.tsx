'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { io, Socket } from 'socket.io-client'
import VideoPlayer from '@/components/VideoPlayer'
import Chat from '@/components/Chat'
import RoomHeader from '@/components/RoomHeader'
import UserSetup from '@/components/UserSetup'
import { Room, Message, VideoSyncState } from '@/types'
import { useVoice } from '@/hooks/useVoice'

export default function RoomPage() {
  const params = useParams()
  const router = useRouter()
  const roomId = params.id as string

  const [room, setRoom] = useState<Room | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [username, setUsername] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [userCount, setUserCount] = useState(1)
  const [onlineUsers, setOnlineUsers] = useState<string[]>([])
  const [syncState, setSyncState] = useState<VideoSyncState | null>(null)
  const [mobileTab, setMobileTab] = useState<'video' | 'chat'>('video')
  const [chatReadCount, setChatReadCount] = useState(0)
  const socketRef = useRef<Socket | null>(null)
  // Only create voice when username is available (after UserSetup)
  const voice = useVoice(roomId, username ?? '')

  // Reset unread counter when switching to chat tab
  useEffect(() => {
    if (mobileTab === 'chat') setChatReadCount(messages.length)
  }, [mobileTab, messages.length])

  useEffect(() => {
    const fetchRoom = async () => {
      try {
        const r = await fetch(`/api/rooms?id=${roomId}`)
        if (!r.ok) throw new Error('اتاق یافت نشد')
        const d = await r.json(); setRoom(d)
        if (d.messages) setMessages(d.messages)
      } catch (err) { setError(err instanceof Error ? err.message : 'خطا در بارگذاری اتاق') }
      finally { setLoading(false) }
    }
    fetchRoom()
  }, [roomId])

  useEffect(() => {
    if (!username || !room) return
    const socket = io(window.location.origin, { path: '/api/socketio' })
    socketRef.current = socket

    socket.on('connect', () => socket.emit('join-room', { roomId, username }))
    socket.on('chat-message', (m: Message) => setMessages(p => [...p, m]))
    socket.on('video-sync', (s: VideoSyncState) => setSyncState(s))
    socket.on('room-users', (d: { users: string[] }) => {
      setOnlineUsers(d.users)
    })
    socket.on('user-count', (d: { userCount: number }) => {
      setUserCount(d.userCount)
    })
    socket.on('user-joined', (d: { username: string; userCount: number }) => {
      setOnlineUsers(p => p.includes(d.username) ? p : [...p, d.username])
      setUserCount(d.userCount)
      if (d.username !== username) setMessages(p => [...p, { id: Date.now().toString(), roomId, username: 'سیستم', content: `${d.username} به اتاق پیوست`, createdAt: new Date().toISOString() }])
    })
    socket.on('user-left', (d: { username: string; userCount: number }) => {
      setOnlineUsers(p => p.filter(u => u !== d.username))
      setUserCount(d.userCount)
      setMessages(p => [...p, { id: Date.now().toString(), roomId, username: 'سیستم', content: `${d.username} از اتاق خارج شد`, createdAt: new Date().toISOString() }])
    })

    return () => { socket.emit('leave-room', { roomId }); socket.disconnect() }
  }, [username, room, roomId])

  const handleSend = useCallback((content: string) => {
    if (!socketRef.current || !username) return
    socketRef.current.emit('chat-message', { roomId, message: { id: Date.now().toString(), roomId, username, content, createdAt: new Date().toISOString() } })
  }, [roomId, username])

  const handleSync = useCallback((state: { isPlaying: boolean; currentTime: number }) => {
    if (socketRef.current) socketRef.current.emit('video-sync', { roomId, ...state, timestamp: Date.now() })
  }, [roomId])

  const handleJoin = (name: string) => { setUsername(name); setOnlineUsers([name]) }

  if (loading) return (
    <div className="min-h-dvh sm:min-h-screen bg-[#0B0D11] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-full border-[3px] border-[var(--accent)] border-t-transparent animate-spin" />
        <span className="text-sm text-white/40" style={{ fontFamily: 'var(--font-body)' }}>در حال بارگذاری...</span>
      </div>
    </div>
  )

  if (error || !room) return (
    <div className="min-h-dvh sm:min-h-screen bg-[#0B0D11] flex items-center justify-center p-4">
      <div className="bg-[#12141a] rounded-2xl p-6 sm:p-8 text-center border border-white/5 max-w-sm w-full animate-fade-in-up">
        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-3 sm:mb-4">
          <svg className="w-6 h-6 sm:w-7 sm:h-7 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        </div>
        <h2 className="text-base sm:text-lg font-bold text-white mb-2" style={{ fontFamily: 'var(--font-heading)' }}>{error || 'اتاق یافت نشد'}</h2>
        <button onClick={() => router.push('/')} className="mt-3 sm:mt-4 px-6 py-2.5 bg-[var(--accent)] text-black rounded-xl hover:bg-[var(--accent-dim)] transition font-medium text-sm min-h-[44px]" style={{ fontFamily: 'var(--font-body)' }}>بازگشت</button>
      </div>
    </div>
  )

  if (!username) return <UserSetup onJoin={handleJoin} />

  return (
    <div className="room-viewport h-dvh sm:h-screen bg-[#0B0D11] flex flex-col overflow-hidden relative grid-pattern">
      {/* Subtle ambient glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[300px] left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-[var(--accent)]/[0.03] rounded-full blur-[120px]" />
        <div className="absolute -bottom-[200px] right-0 w-[500px] h-[400px] bg-[#00B4D8]/[0.02] rounded-full blur-[100px]" />
      </div>

      {/* Top bar */}
      <header className="flex-shrink-0 border-b border-white/5 bg-[#0B0D11]/80 backdrop-blur-xl z-50 relative safe-top">
        <div className="max-w-[1800px] mx-auto px-3 sm:px-5 h-11 sm:h-12 flex items-center justify-between gap-2">
          {/* Back */}
          <button onClick={() => router.push('/')} className="flex items-center gap-1.5 sm:gap-2 text-white/40 hover:text-white/80 transition-all text-xs sm:text-sm flex-shrink-0 min-w-0 min-h-[36px] px-2 -ml-2 rounded-lg hover:bg-white/5 active:bg-white/10 active:scale-95" style={{ fontFamily: 'var(--font-body)' }}>
            <svg className="w-4 h-4 rotate-180 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            <span className="hidden sm:inline">بازگشت</span>
          </button>

          {/* Room info */}
          <div className="relative min-w-0 flex-1 flex justify-center">
            <RoomHeader roomName={room.name} roomId={room.id} userCount={userCount} users={onlineUsers} speakingUsers={voice.speaking} />
          </div>

          {/* User + Voice */}
          <div className="flex items-center gap-1.5 sm:gap-2 text-white/40 text-xs sm:text-sm flex-shrink-0 min-w-0 relative">
            {/* Voice button */}
            <button
              onClick={voice.connected ? voice.leave : voice.join}
              className={`w-9 h-9 flex items-center justify-center rounded-lg transition-all flex-shrink-0 active:scale-90 ${
                voice.connected
                  ? voice.muted
                    ? 'bg-red-500/15 text-red-400 border border-red-500/20'
                    : voice.speaking.includes(username || '')
                      ? 'bg-[var(--accent)]/20 text-[var(--accent)] border border-[var(--accent)]/30 shadow-[0_0_12px_var(--accent-glow)]'
                      : 'bg-[var(--accent)]/15 text-[var(--accent)] border border-[var(--accent)]/20'
                  : 'bg-white/5 text-white/30 hover:text-white/60 border border-white/10'
              }`}
              title={voice.connected ? (voice.muted ? 'میکروفون قطع' : 'در حال صحبت...') : 'ویس چت'}
            >
              {voice.connected ? (
                voice.muted ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                ) : (
                  <svg className={`w-4 h-4 ${voice.speaking.includes(username || '') ? 'animate-pulse' : ''}`} fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                    <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                  </svg>
                )
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              )}
            </button>

            {/* Voice status indicator */}
            {voice.connected && !voice.muted && voice.speaking.includes(username || '') && (
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex items-center gap-[2px]">
                <span className="w-[3px] h-[8px] bg-[var(--accent)] rounded-full animate-voice-bar" style={{ animationDelay: '0ms' }} />
                <span className="w-[3px] h-[12px] bg-[var(--accent)] rounded-full animate-voice-bar" style={{ animationDelay: '150ms' }} />
                <span className="w-[3px] h-[6px] bg-[var(--accent)] rounded-full animate-voice-bar" style={{ animationDelay: '300ms' }} />
              </div>
            )}

            <div className="w-px h-4 bg-white/10" />

            {/* Voice error message */}
            {voice.error && (
              <div className="absolute left-0 right-0 top-full mt-2 px-3 z-50">
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-lg px-3 py-2 text-center" style={{ fontFamily: 'var(--font-body)' }}>
                  {voice.error}
                </div>
              </div>
            )}

            <span className="w-2 h-2 bg-[var(--accent)] rounded-full animate-pulse-dot flex-shrink-0" />
            <span className="truncate max-w-[70px] sm:max-w-none" style={{ fontFamily: 'var(--font-body)' }}>{username}</span>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 relative">
        {/* ── Desktop: side by side (unchanged) ── */}
        <div className="hidden lg:flex flex-1 min-h-0">
          <div className="flex-1 min-w-0 p-3 pr-0">
            <div className="w-full h-full">
              <VideoPlayer videoUrl={room.videoUrl} videoType={room.videoType as 'youtube' | 'direct'} onSync={handleSync} externalState={syncState} />
            </div>
          </div>
          <div className="w-[360px] flex-shrink-0 p-3 pl-0 flex flex-col min-h-0">
            <Chat messages={messages} onSendMessage={handleSend} username={username} />
          </div>
        </div>

        {/* ── Mobile: tab-based layout ── */}
        <div className="lg:hidden flex-1 min-h-0 relative">
          {/* Video tab */}
          <div className={`absolute inset-0 ${mobileTab === 'video' ? 'block' : 'hidden'} bg-black`}>
            <VideoPlayer videoUrl={room.videoUrl} videoType={room.videoType as 'youtube' | 'direct'} onSync={handleSync} externalState={syncState} />
          </div>

          {/* Chat tab */}
          <div className={`absolute inset-0 ${mobileTab === 'chat' ? 'flex' : 'hidden'} flex-col`}>
            <Chat messages={messages} onSendMessage={handleSend} username={username} />
          </div>
        </div>
      </div>

      {/* ── Mobile bottom tab bar ── */}
      <div className="lg:hidden flex-shrink-0 border-t border-white/5 bg-[#0B0D11]/95 backdrop-blur-xl safe-bottom relative z-50">
        <div className="flex">
          <button
            onClick={() => setMobileTab('video')}
            className={`flex-1 flex flex-col items-center justify-center gap-1 py-2.5 transition-all min-h-[52px] ${
              mobileTab === 'video'
                ? 'text-[var(--accent)]'
                : 'text-white/40 active:text-white/60'
            }`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
            </svg>
            <span className="text-[11px] font-medium" style={{ fontFamily: 'var(--font-body)' }}>ویدیو</span>
          </button>
          <button
            onClick={() => setMobileTab('chat')}
            className={`flex-1 flex flex-col items-center justify-center gap-1 py-2.5 transition-all min-h-[52px] relative ${
              mobileTab === 'chat'
                ? 'text-[var(--accent)]'
                : 'text-white/40 active:text-white/60'
            }`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
            </svg>
            <span className="text-[11px] font-medium" style={{ fontFamily: 'var(--font-body)' }}>چت</span>
            {/* Unread indicator — show when new messages arrived since last chat view */}
            {mobileTab === 'video' && messages.length > chatReadCount && (
              <span className="absolute top-2 right-1/2 translate-x-3 w-2 h-2 bg-[var(--accent-warm)] rounded-full animate-pulse-dot" />
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
