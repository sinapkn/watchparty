# Watch Party 🎬

**Watch Party** is a free, real-time synchronized video-watching platform with voice chat. Create a room, add a video link, share the link with friends, and watch together — everyone's playback stays perfectly in sync.
<p align="center">
  <a href="https://bahampk.ir"><strong>bahampk.ir</strong></a>
</p>
<p align="center">
  <a href="./README-FA.md">🇮🇷 فارسی</a>
</p>

## ✨ Features

### 🎥 Watch Together, in Sync
Create a room and share the link. Everyone's play, pause, and seek actions are synced in real-time — no more "pause at 3:42" texts.

### 🔗 Two Video Sources
- **YouTube** — paste any YouTube link and watch together
- **Direct Link** — MP4, WebM, MKV, and other video formats (served through a built-in proxy)

### 💬 Live Chat
Chat with everyone in the room while watching. Quick reactions with emojis, message groups, and a full emoji picker.

### 📝 Smart Subtitles
- Upload `.srt` or `.vtt` subtitle files
- Auto-detect embedded subtitles in MKV files
- Customize subtitle size, color, transparency, and font
- Multiple subtitle track support

### 🎵 Multi-Audio Tracks
Switch between audio tracks on MKV files with multiple language tracks.

### 📱 Fully Responsive
Works on desktop and mobile. Fullscreen mode with orientation lock on mobile devices.

---

## 🚀 How to Use

1. **Open the website**
2. **Enter your room name** (e.g., "Movie Night with Friends")
3. **Choose a video source:**
   - **YouTube:** paste a YouTube URL
   - **Direct Link:** paste a direct video URL (MP4, WebM, MKV, etc.)
4. **Create the room**
5. **Share the room link** with friends
6. **Enjoy watching together!**

> ⚠️ **Note for YouTube:** This feature is not accessible from Iran without a VPN.

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 16 (App Router) |
| **Language** | TypeScript |
| **Real-time** | Socket.io |
| **Voice Chat** | LiveKit (WebRTC) |
| **Database** | PostgreSQL + Prisma ORM |
| **Styling** | Tailwind CSS v4 |
| **Video Proxy** | Custom Next.js API route |
| **Deploy** | Railway |

---

## 📄 License

Built with ❤️ by **SPK** & **MMDJ**.  
Licensed under the [MIT License](./LICENSE).

---

##  Deploy

Deploy your own instance — see the [Deployment Guide](./SETUP.md).
