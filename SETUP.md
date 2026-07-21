# Watch Party — Self-Hosting Guide

This guide covers local development setup and deploying on Railway.

<p align="center">
  <a href="./SETUP-FA.md">🇮🇷 راهنمای فارسی</a>
</p>

---

## Local Development

### Prerequisites

- Node.js **≥ 20.9.0**
- PostgreSQL (running)

### Steps

1. **Install dependencies:**

```bash
npm install
```

2. **Create a `.env` file in the project root:**

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/watchparty"
PORT=3000
```

3. **Run database migrations:**

```bash
npm run db:migrate
```

4. **Start the development server:**

```bash
npm run dev
```

5. **Open:**

```
http://localhost:3000
```

---

## Deploy on Railway

### 1. Fork the repository

1. Go to [github.com/sinapkn/WatchParty](https://github.com/sinapkn/WatchParty)
2. Click the **Fork** button (top-right) to create a copy under your own GitHub account

### 2. Create a Railway project

1. Open [Railway](https://railway.app).
2. Create a new project.
3. Add a new service from your **GitHub Repository**.
4. Select your fork of this repository.

### 3. Add PostgreSQL

1. In the same Railway project, click **New**.
2. Select **Database**.
3. Select **PostgreSQL**.
4. Wait until the Postgres service is running.

### 4. Set environment variables (Part 1 — Database)

Open the app service in Railway and go to **Variables**. Add:

```env
DATABASE_URL=${{Postgres.DATABASE_URL}}
```

Railway resolves this from the PostgreSQL service automatically.

### 5. Set up Voice Chat (LiveKit Cloud)

To enable **Voice Chat** in the project, use **LiveKit Cloud**. It's free and doesn't require a credit card.

#### Step 1: Sign up for LiveKit Cloud

```bash
1. Go to https://cloud.livekit.io
2. Sign up with Google or GitHub (free, no credit card required)
3. Click Create Project
4. Name: watchparty
5. Region: nearest to you (e.g., Frankfurt)
6. Click Create
```

#### Step 2: Get API Keys

```bash
1. Go to Settings → API Keys from the left menu
2. Copy these 3 values:

   LIVEKIT_API_KEY     (e.g., sk_abc123...)
   LIVEKIT_API_SECRET   (e.g., xyz456...)
   LIVEKIT_URL          (e.g., wss://xxx.livekit.cloud)
```

#### Step 3: Add variables to Railway

Go to your Watch Party project in Railway → Variables section and add:

```env
LIVEKIT_API_KEY=sk_abc123...      # From LiveKit Cloud
LIVEKIT_API_SECRET=xyz456...       # From LiveKit Cloud
LIVEKIT_URL=wss://xxx.livekit.cloud  # From LiveKit Cloud
```

> **Note:** Only these 3 variables are needed. No second Railway account is required.
```

### 6. Railway config

The project includes `railway.json` which handles:

1. Installing dependencies
2. Running `npm run build`
3. Running Prisma migrations
4. Starting the app with `npm run start`

### 6. Deploy

Click **Deploy** or **Redeploy** in the Railway app service.

After the deploy completes, go to **Networking** or **Settings** and generate a Railway domain for the app service.

---

## Useful Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build the project |
| `npm run start` | Start production server |
| `npm run db:migrate` | Run database migrations |
| `npm run db:push` | Push schema to database |
| `npm run postinstall` | Generate Prisma Client |
| `npm run lint` | Run linter |

---

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `PORT` | Server port | `3000` |
| `LIVEKIT_API_KEY` | API key for voice chat | — |
| `LIVEKIT_API_SECRET` | API secret for voice chat | — |
| `LIVEKIT_URL` | LiveKit server URL | `wss://...` |
