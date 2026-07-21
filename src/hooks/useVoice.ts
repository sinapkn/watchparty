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
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ],
      })

      room.on(RoomEvent.Connected, () => {
        console.log('[Voice] Connected! Room participants:', room.remoteParticipants.size)
        setConnected(true)
        setMuted(false)
        updateParticipants(room)

        // Subscribe to all existing audio tracks
        room.remoteParticipants.forEach((p) => {
          p.audioTracks.forEach((trackPub) => {
            if (trackPub.track && !trackPub.isSubscribed) {
              trackPub.setSubscribed(true)
            }
          })
        })
      })

      room.on(RoomEvent.Disconnected, () => {
        console.log('[Voice] Disconnected')
        setConnected(false)
        setParticipants([])
      })

      room.on(RoomEvent.ParticipantConnected, () => updateParticipants(room))
      room.on(RoomEvent.ParticipantDisconnected, () => updateParticipants(room))

      room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
        const speakerNames = speakers
          .map((s: { identity?: string }) => s.identity ?? '')
          .filter(Boolean)
        setSpeaking(speakerNames)
      })

      room.on(RoomEvent.MediaDevicesError, (err: Error) => {
        console.error('[Voice] Media device error:', err)
        setError('دسترسی به میکروفون مجاز نیست. لطفاً از مرورگر اجازه بدید.')
      })

      await room.connect(url, token)
      roomRef.current = room

      // Request microphone permission
      try {
        await room.localParticipant.setMicrophoneEnabled(true)
        console.log('[Voice] Microphone enabled')
      } catch (micErr) {
        console.error('[Voice] Microphone error:', micErr)
        setError('خطا در دسترسی به میکروفون. لطفاً مجوز میکروفون رو در مرورگر بررسی کنید.')
      }

      updateParticipants(room)
    } catch (err: any) {
      console.error('[Voice] Join error:', err)
      setError(err.message || 'خطا در اتصال ویس')
      setConnected(false)
    } finally {
      setConnecting(false)
    }
  }, [roomId, username, connecting])

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

  const toggleMute = useCallback(() => {
    if (!roomRef.current) return
    const room = roomRef.current
    const newMuted = !room.localParticipant.isMicrophoneEnabled
    room.localParticipant.setMicrophoneEnabled(!newMuted)
    setMuted(newMuted)
  }, [])

  const updateParticipants = (room: Room) => {
    const names: string[] = []
    if (room.localParticipant) names.push(room.localParticipant.identity)
    const remoteParticipants = room.remoteParticipants
    if (remoteParticipants) {
      remoteParticipants.forEach((p: { identity: string }) => names.push(p.identity))
    }
    setParticipants(names)
  }

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
