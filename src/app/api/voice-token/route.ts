import { NextRequest } from 'next/server'
import { AccessToken } from 'livekit-server-sdk'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { room, username } = await request.json()

    if (!room || !username) {
      return Response.json({ error: 'room and username are required' }, { status: 400 })
    }

    const apiKey = process.env.LIVEKIT_API_KEY
    const apiSecret = process.env.LIVEKIT_API_SECRET
    const livekitUrl = process.env.LIVEKIT_URL

    if (!apiKey || !apiSecret) {
      return Response.json({ error: 'LiveKit not configured' }, { status: 500 })
    }

    // Create access token
    const at = new AccessToken(apiKey, apiSecret, {
      identity: username,
      name: username,
    })

    // Grant access to the room
    at.addGrant({
      room,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    })

    const token = await at.toJwt()

    return Response.json({
      token,
      url: livekitUrl,
    })
  } catch (error) {
    console.error('Voice token error:', error)
    return Response.json({ error: 'Failed to generate token' }, { status: 500 })
  }
}
