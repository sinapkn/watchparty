import { createServer } from 'http'
import { parse } from 'url'
import next from 'next'
import { Server } from 'socket.io'
import { PrismaClient } from '@prisma/client'

const dev = process.env.NODE_ENV !== 'production'
const hostname = '0.0.0.0'
const port = parseInt(process.env.PORT || '3000', 10)

const prisma = new PrismaClient()

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url!, true)
      await handle(req, res, parsedUrl)
    } catch (err) {
      console.error('Error handling request:', err)
      res.statusCode = 500
      res.end('Internal Server Error')
    }
  })

  const io = new Server(server, {
    path: '/api/socketio',
    cors: {
      origin: process.env.RAILWAY_PUBLIC_DOMAIN
        ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
        : '*',
      methods: ['GET', 'POST'],
    },
  })

  // ── State ──
  const rooms = new Map<string, Set<string>>()
  const socketUserMap = new Map<string, { username: string; roomId: string }>()
  const emptyRoomTimers = new Map<string, ReturnType<typeof setTimeout>>()
  const pendingDisconnects = new Map<string, ReturnType<typeof setTimeout>>() // key: "roomId:username"
  const ROOM_EMPTY_TIMEOUT = 120_000 // 120 seconds before deleting empty room
  const DISCONNECT_GRACE = 15_000 // 15 seconds grace period for reconnection

  // ── Delete empty room from DB and cleanup ──
  async function deleteRoom(roomId: string) {
    console.log(`[Cleanup] Deleting empty room ${roomId}`)
    try {
      await prisma.room.delete({ where: { id: roomId } })
      console.log(`[Cleanup] Room ${roomId} deleted from database`)
    } catch (err) {
      console.error(`[Cleanup] Failed to delete room ${roomId}:`, err)
    }
  }

  // ── Start empty-room timer ──
  function startEmptyTimer(roomId: string) {
    if (emptyRoomTimers.has(roomId)) return
    const timer = setTimeout(() => {
      emptyRoomTimers.delete(roomId)
      // Double-check room is still empty
      const users = rooms.get(roomId)
      if (!users || users.size === 0) {
        rooms.delete(roomId)
        deleteRoom(roomId)
      }
    }, ROOM_EMPTY_TIMEOUT)
    emptyRoomTimers.set(roomId, timer)
    console.log(`[Cleanup] Timer started for room ${roomId} (${ROOM_EMPTY_TIMEOUT / 1000}s)`)
  }

  // ── Cancel empty-room timer ──
  function cancelEmptyTimer(roomId: string) {
    const timer = emptyRoomTimers.get(roomId)
    if (timer) {
      clearTimeout(timer)
      emptyRoomTimers.delete(roomId)
      console.log(`[Cleanup] Timer cancelled for room ${roomId}`)
    }
  }

  // ── Cancel pending disconnect for a user ──
  function cancelPendingDisconnect(roomId: string, username: string) {
    const key = `${roomId}:${username}`
    const timer = pendingDisconnects.get(key)
    if (timer) {
      clearTimeout(timer)
      pendingDisconnects.delete(key)
      console.log(`[Grace] Pending disconnect cancelled for ${username} in room ${roomId}`)
      return true // was pending (i.e. reconnection)
    }
    return false
  }

  // ── Actually remove a disconnected user after grace period expires ──
  function finalizeDisconnect(roomId: string, username: string, socketId: string) {
    const roomUsers = rooms.get(roomId)
    if (roomUsers) {
      roomUsers.delete(username)
      if (roomUsers.size === 0) {
        startEmptyTimer(roomId)
      } else {
        io.to(roomId).emit('user-left', { username, userCount: roomUsers.size })
        console.log(`[Grace] ${username} removed from room ${roomId} after grace period. Count: ${roomUsers.size}`)
      }
    }
    socketUserMap.delete(socketId)
  }

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id)

    socket.on('join-room', ({ roomId, username }) => {
      socket.join(roomId)
      socketUserMap.set(socket.id, { username, roomId })

      // Cancel any pending deletion timer for the room
      cancelEmptyTimer(roomId)

      // Check if this user has a pending disconnect (reconnection scenario)
      const isReconnect = cancelPendingDisconnect(roomId, username)

      if (!rooms.has(roomId)) rooms.set(roomId, new Set())
      rooms.get(roomId)!.add(username)

      const userCount = rooms.get(roomId)!.size
      const existingUsers = Array.from(rooms.get(roomId)!)

      if (isReconnect) {
        // User reconnected — don't emit join/leave spam, just update count
        io.to(roomId).emit('user-count', { userCount })
        console.log(`${username} reconnected to room ${roomId}. Count: ${userCount}`)
      } else {
        // Send existing user list to the new joiner
        socket.emit('room-users', { users: existingUsers })
        io.to(roomId).emit('user-joined', { username, userCount })
        console.log(`${username} joined room ${roomId}. Count: ${userCount}`)
      }
    })

    socket.on('leave-room', ({ roomId }) => {
      const userData = socketUserMap.get(socket.id)
      if (userData) {
        // Cancel any pending disconnect for this user (they explicitly left)
        cancelPendingDisconnect(roomId, userData.username)

        const roomUsers = rooms.get(roomId)
        if (roomUsers) {
          roomUsers.delete(userData.username)
          if (roomUsers.size === 0) {
            startEmptyTimer(roomId)
          }
        }

        const userCount = rooms.get(roomId)?.size || 0
        socket.to(roomId).emit('user-left', { username: userData.username, userCount })
        console.log(`${userData.username} left room ${roomId}. Count: ${userCount}`)

        // Clean up socket mapping
        socketUserMap.delete(socket.id)
      }
      socket.leave(roomId)
    })

    socket.on('chat-message', ({ roomId, message }) => {
      io.to(roomId).emit('chat-message', message)
    })

    socket.on('video-sync', ({ roomId, isPlaying, currentTime, timestamp }) => {
      socket.to(roomId).emit('video-sync', { isPlaying, currentTime, timestamp })
    })

    socket.on('disconnect', () => {
      const userData = socketUserMap.get(socket.id)
      if (userData) {
        const { username, roomId } = userData
        console.log(`${username} disconnected from room ${roomId} — grace period started (${DISCONNECT_GRACE / 1000}s)`)

        // Start grace period — don't remove user yet
        const key = `${roomId}:${username}`
        const timer = setTimeout(() => {
          pendingDisconnects.delete(key)
          finalizeDisconnect(roomId, username, socket.id)
        }, DISCONNECT_GRACE)
        pendingDisconnects.set(key, timer)
      } else {
        console.log('User disconnected:', socket.id)
      }
    })
  })

  server.listen(port, hostname, () => {
    console.log(`> Ready on http://${hostname}:${port}`)
    console.log(`> Socket.io server running on /api/socketio`)
  })
})
