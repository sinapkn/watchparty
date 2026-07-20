'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { io, Socket } from 'socket.io-client'
import VideoPlayer from '@/components/VideoPlayer'
import Chat from '@/components/Chat'
import RoomHeader from '@/components/RoomHeader'
import UserSetup from '@/components/UserSetup'
import { Room, Message, VideoSyncState } from '@/types'

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
  const socketRef = useRef<Socket | null>(null)

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
            <RoomHeader roomName={room.name} roomId={room.id} userCount={userCount} users={onlineUsers} />
          </div>

          {/* User */}
          <div className="flex items-center gap-1.5 sm:gap-2 text-white/40 text-xs sm:text-sm flex-shrink-0 min-w-0">
            <span className="w-2 h-2 bg-[var(--accent)] rounded-full animate-pulse-dot flex-shrink-0" />
            <span className="truncate max-w-[70px] sm:max-w-none" style={{ fontFamily: 'var(--font-body)' }}>{username}</span>
          </div>
        </div>
      </header>

      {/* Main content — vertical on mobile, horizontal on desktop */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 relative">
        {/* Video — full width on mobile, flex-1 on desktop */}
        <div className="mobile-video-wrap w-full flex-1 min-w-0 min-h-0 lg:shrink-0 lg:p-3 lg:pr-0">
          <div className="w-full h-full">
            <VideoPlayer videoUrl={room.videoUrl} videoType={room.videoType as 'youtube' | 'direct'} onSync={handleSync} externalState={syncState} />
          </div>
        </div>

        {/* Chat sidebar — desktop */}
        <div className="hidden lg:flex w-[360px] flex-shrink-0 p-3 pl-0 flex-col min-h-0">
          <Chat messages={messages} onSendMessage={handleSend} username={username} />
        </div>

        {/* Chat — mobile: fills remaining space */}
        <div className="lg:hidden flex-1 min-h-0 flex flex-col px-2 pb-2 safe-bottom">
          <Chat messages={messages} onSendMessage={handleSend} username={username} />
        </div>
      </div>
    </div>
  )
}
