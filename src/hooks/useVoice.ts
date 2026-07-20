'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import {
  Room,
  RoomEvent,
  Track,
  ConnectionState,
  type RemoteTrack,
  type LocalTrack,
} from 'livekit-client'

export function useVoice(roomId: string, username: string) {
  const [connected, setConnected] = useState(false)
  const [muted, setMuted] = useState(true)
  const [participants, setParticipants] = useState<string[]>([])
  const [speaking, setSpeaking] = useState<string[]>([])
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
    try {
      // Get token from server
      const res = await fetch('/api/voice-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room: roomId, username }),
      })

      if (!res.ok) throw new Error('Failed to get voice token')

      const { token, url } = await res.json()

      if (!url) throw new Error('LiveKit URL not configured')

      // Create and connect room
      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
      })

      // Listen for events
      room.on(RoomEvent.Connected, () => {
        setConnected(true)
        setMuted(false)
        updateParticipants(room)
      })

      room.on(RoomEvent.Disconnected, () => {
        setConnected(false)
        setParticipants([])
      })

      room.on(RoomEvent.ParticipantConnected, () => {
        updateParticipants(room)
      })

      room.on(RoomEvent.ParticipantDisconnected, () => {
        updateParticipants(room)
      })

      room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
        const speakerNames = speakers
          .map(s => s.identity)
          .filter(Boolean)
        setSpeaking(speakerNames)
      })

      // Connect to room
      await room.connect(url, token)

      // Enable microphone
      await room.localParticipant.setMicrophoneEnabled(true)

      roomRef.current = room
      updateParticipants(room)
    } catch (err) {
      console.error('Voice join error:', err)
      setConnected(false)
    }
  }, [roomId, username])

  const leave = useCallback(() => {
    if (roomRef.current) {
      roomRef.current.disconnect()
      roomRef.current = null
    }
    setConnected(false)
    setMuted(true)
    setParticipants([])
    setSpeaking([])
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
    // Local participant
    if (room.localParticipant) {
      names.push(room.localParticipant.identity)
    }
    // Remote participants
    const remoteParticipants = room.remoteParticipants
    if (remoteParticipants) {
      remoteParticipants.forEach((p: { identity: string }) => {
        names.push(p.identity)
      })
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
  }
}
