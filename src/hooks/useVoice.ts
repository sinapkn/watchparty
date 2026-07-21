'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import {
  Room,
  RoomEvent,
  type RemoteTrack,
  type LocalTrack,
} from 'livekit-client'

export function useVoice(roomId: string, username: string) {
  const [connected, setConnected] = useState(false)
  const [muted, setMuted] = useState(true)
  const [participants, setParticipants] = useState<string[]>([])
  const [speaking, setSpeaking] = useState<string[]>([])
  const [error, setError] = useState<string>('')
  const [connecting, setConnecting] = useState(false)
  const roomRef = useRef<Room | null>(null)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (roomRef.current) {
        roomRef.current.disconnect()
        roomRef.current = null
      }
    }
  }, [])

  const updateParticipants = useCallback((room: Room) => {
    const names: string[] = []
    if (room.localParticipant) names.push(room.localParticipant.identity)
    const remoteParticipants = room.remoteParticipants
    if (remoteParticipants) {
      remoteParticipants.forEach((p: { identity: string }) => names.push(p.identity))
    }
    setParticipants(names)
  }, [])

  const join = useCallback(async () => {
    if (connecting) return
    setConnecting(true)
    setError('')

    try {
      console.log('[Voice] Fetching token for', roomId, username)

      const res = await fetch('/api/voice-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room: roomId, username }),
      })

      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || `Server error: ${res.status}`)
      }

      const { token, url } = await res.json()
      console.log('[Voice] Token received, connecting to', url)

      if (!url) throw new Error('LiveKit URL not configured (missing LIVEKIT_URL in env)')

      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
      })

      // ── TrackPublished — when local audio is published ──
      room.localParticipant.on('trackPublished', (trackPub: any) => {
        console.log('[Voice] Local track published:', trackPub.kind)
      })

      // ── Participant disconnected ──
      room.on(RoomEvent.ParticipantDisconnected, (p) => {
        console.log('[Voice] Participant left:', p.identity)
        updateParticipants(room)
      })

      // ── Participant connected ──
      room.on(RoomEvent.ParticipantConnected, (p) => {
        console.log('[Voice] Participant joined:', p.identity)
        updateParticipants(room)
      })

      // ── Track subscribed — when we receive remote audio ──
      room.on(RoomEvent.TrackSubscribed, (_track: RemoteTrack, publication: any, p: any) => {
        console.log('[Voice] Track subscribed from:', p.identity, publication.kind)
        if (publication.kind === 'audio') {
          const audioElement = _track.attach()
          audioElement.play().catch(console.error)
        }
      })

      // ── Active speakers ──
      room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
        const speakerNames = speakers
          .map((s: { identity?: string }) => s.identity ?? '')
          .filter(Boolean)
        setSpeaking(speakerNames)
      })

      // ── Audio level (for faster speaking detection) ──
      // @ts-ignore
      room.on('localAudioLevel', (level: number) => {
        if (level > 0.01 && username) {
          setSpeaking(prev => prev.includes(username) ? prev : [...prev, username])
        }
      })

      // ── Connected ──
      room.on(RoomEvent.Connected, () => {
        console.log('[Voice] Connected! Enabling mic...')
        setConnected(true)
        updateParticipants(room)
      })

      // ── Media error ──
      room.on(RoomEvent.MediaDevicesError, (err: Error) => {
        console.error('[Voice] Media device error:', err)
        setError('دسترسی به میکروفون مجاز نیست')
      })

      // ── Disconnected ──
      room.on(RoomEvent.Disconnected, () => {
        console.log('[Voice] Disconnected')
        setConnected(false)
        setMuted(true)
        setParticipants([])
      })

      await room.connect(url, token)
      roomRef.current = room

      // Wait a bit for ICE to settle, then enable mic
      setTimeout(async () => {
        try {
          await room.localParticipant.setMicrophoneEnabled(true)
          console.log('[Voice] Microphone enabled successfully')
          setMuted(false)
        } catch (micErr) {
          console.error('[Voice] Microphone error:', micErr)
          setError('خطا در دسترسی به میکروفون')
        }
      }, 1000)

    } catch (err: any) {
      console.error('[Voice] Join error:', err)
      setError(err.message || 'خطا در اتصال ویس')
      setConnected(false)
    } finally {
      setConnecting(false)
    }
  }, [roomId, username, connecting, updateParticipants])

  const leave = useCallback(() => {
    if (roomRef.current) {
      roomRef.current.disconnect()
      roomRef.current = null
    }
    setConnected(false)
    setMuted(true)
    setParticipants([])
    setSpeaking([])
    setError('')
  }, [])

  const toggleMute = useCallback(async () => {
    if (!roomRef.current) return
    const room = roomRef.current
    const newMuted = room.localParticipant.isMicrophoneEnabled
    try {
      await room.localParticipant.setMicrophoneEnabled(newMuted)
      setMuted(!newMuted)
    } catch (err) {
      console.error('[Voice] Toggle mute error:', err)
    }
  }, [])

  return {
    join,
    leave,
    toggleMute,
    connected,
    muted,
    participants,
    speaking,
    error,
    connecting,
  }
}
