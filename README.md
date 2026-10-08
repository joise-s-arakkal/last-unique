# Last Unique — Vercel MVP

A first playable version of the 8×8 / 1–64 multiplayer game.

## Rules
- A room has up to 50 players.
- Players get 60 seconds to choose one number.
- A number selected by 2+ players is invalid for everyone who selected it.
- The highest unique selection wins.
- If nobody has a unique selection, there is no winner.
- If the room does not fill, bots are added after 8 seconds.

## Stack
- Static HTML/CSS/JavaScript frontend
- Vercel Functions (Node.js)
- Upstash Redis for shared game state

Vercel supports FastAPI and WebSockets, but this MVP intentionally uses short HTTP polling plus Redis because it is simpler to deploy and keeps game state shared across server instances. It can later be upgraded to WebSockets.

## Deploy
1. Create an Upstash Redis database.
2. Get `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`.
3. Import this repository into Vercel.
4. Add those two environment variables in the Vercel project settings.
5. Deploy.

## Local development
Install Node.js 18+.

```bash
npm install
npx vercel dev
```

The Vercel CLI will provide the local URL.

## Important MVP note
The matchmaking list is intentionally simple. For a high-traffic production release, replace the queue write/read sequence with an atomic Redis transaction or Lua script, add rate limiting, authenticated player sessions, and durable match history.
