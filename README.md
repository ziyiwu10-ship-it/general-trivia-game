# Trivia Battle Royale

Real-time multiplayer trivia for a small group of friends. One host spins up
a room, everyone else joins with a short code, and questions (generated live
by Claude) broadcast to every device in sync — including a leaderboard that
updates the instant anyone answers.

Retro/arcade neon visual style: near-black backgrounds, glowing borders,
pixel-font headings, terminal-font body text, scanline/grid texture.

## Stack

- **Next.js 14** (App Router) + TypeScript + Tailwind CSS + Framer Motion
- **Supabase** — Postgres for game/room state, Realtime (broadcast channels) for live sync
- **Anthropic API** — Claude Haiku 4.5, called server-side to generate question banks
- **Vercel** — deploy target, with Vercel Cron for room cleanup

## Local setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Create a Supabase project** at [supabase.com](https://supabase.com), then
   open the SQL editor and run [`supabase/schema.sql`](supabase/schema.sql).
   This creates `rooms`, `players`, `questions`, `answers`, `api_usage`, and
   the RLS policies that keep game state server-authoritative (see
   [Security model](#security-model) below).

   If you already ran this file once against a live project and are
   pulling a later update, `create table if not exists` won't add new
   columns to a table that already exists — see the **Migrations** block
   at the bottom of `schema.sql` for the `alter table` statements to run
   by hand.

3. **Copy the env file and fill in your keys**

   ```bash
   cp .env.example .env.local
   ```

   - `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Project Settings → API
   - `SUPABASE_SERVICE_ROLE_KEY` — same page, **service role** secret (server-only, never exposed to the client)
   - `ANTHROPIC_API_KEY` — from [console.anthropic.com](https://console.anthropic.com)
   - `MAX_DAILY_CLAUDE_REQUESTS` — budget guard, defaults to 20/day (see below)

4. **Run it**

   ```bash
   npm run dev
   ```

   Open `http://localhost:3000`. Use `/play` to test question generation +
   scoring solo without creating a room.

## Deploying to Vercel

1. Push this repo to GitHub and import it in Vercel.
2. Add the same environment variables from `.env.local` in the Vercel project
   settings (Production + Preview).
3. `vercel.json` already defines an hourly Cron hitting `/api/cleanup` to
   delete expired rooms. Optionally set `CRON_SECRET` in your env vars —
   Vercel automatically sends it as a Bearer token on cron-triggered
   requests, and the route checks it if present.
4. Deploy. Supabase Realtime works over WebSockets from the browser directly
   to Supabase, so no special Vercel configuration is needed for it.

## How it works

- **Rooms**: the host picks a category + question count, gets a short code
  (`TRIV42`-style). Friends join with the code + a name on their own device.
- **Question generation**: on "Start Game", the server calls Claude Haiku 4.5
  once to generate the whole question bank for the room, stores it in
  `questions`, and starts question 0.
- **Live sync**: all game-state changes (new question, live score updates,
  answer reveal, game over) broadcast over a per-room Supabase Realtime
  channel (`room:<CODE>`). Every client — including the host's own — reacts
  to the same broadcasts, so nobody special-cases their own actions.
- **Server-authoritative timing**: each question's countdown is derived from
  `question_started_at`, a server timestamp. Clients render the countdown
  locally but never decide when a question ends — the `/reveal` and `/next`
  API routes re-check elapsed server time before doing anything, so a client
  can't fast-forward the game by racing ahead of its local clock.
- **Scoring**: correct answers score a flat base plus a speed bonus that
  decays linearly across the question's time window, computed server-side
  from the server-recorded answer timestamp (never trusts a client-reported
  time).
- **Backgrounded-tab resilience**: mobile browsers throttle JS timers and can
  suspend a tab's websocket when it's not in focus (switching apps, screen
  lock), which can otherwise strand a client mid-question. Every timer that
  drives the game (countdown, reveal, advance) recomputes against an
  absolute server-derived timestamp and re-checks itself on `visibilitychange`
  in addition to its normal interval, and the room page resyncs full state
  every time the realtime channel reaches SUBSCRIBED (first connect and any
  reconnect) — broadcasts have no history/replay, so this catches anything
  that fired during a connection gap instead of leaving a client stuck.
  Leaving a room is deliberately only ever explicit (the Leave Room button)
  — `pagehide`/`beforeunload` fire on far more than just "actually left"
  (backgrounding, app-switching), so auto-removing a player on those events
  was causing spurious "the game reset" moments and has been removed.
- **Difficulty ramp + no repeats**: each generated question bank is tagged
  and ordered from easy to expert-level, and the prompt is given the last
  ~60 questions asked in that category (across any room, since expired rooms
  cascade-delete their questions) so back-to-back games in the same category
  don't repeat themselves.

## Extras

- **Sound**: a small Web Audio synth (`src/lib/sound.ts`) generates all audio
  procedurally — a looping 8-bit background arpeggio plus beeps for
  answering, correct/wrong reveals, the countdown's last 5 seconds, and the
  end-game fanfare. No audio files, nothing to license. Off by default (autoplay
  policies require a user gesture anyway); toggle via the speaker icon,
  top-right on every screen. Preference persists in `localStorage`.
- **Avatars**: players pick from a small set of original pixel/emoji avatars
  when joining or creating a room (`src/lib/avatars.ts`). These are an
  original set in a similar cute-chibi-pixel spirit to the game's visual
  references, not reproductions of any copyrighted character art.
- **Question recap**: once a game finishes, the podium screen has a
  collapsible recap of every question, its correct answer, and a short
  self-contained explanation Claude writes for each question at generation
  time (stored in `questions.explanation`) — this is the primary content,
  since a "just go read Wikipedia" link isn't always reliable (some topics
  don't have a good matching article). A secondary "More on Wikipedia" link
  is still included, pointed at a Wikipedia *search* for a short topic
  Claude tags per question (`/w/index.php?search=...`) rather than a guessed
  direct article URL, so it can't 404 even if the exact title is slightly
  off. Answers are only ever fetchable via `/api/rooms/[code]/recap` once
  `room.status === 'finished'`, so there's no way to peek mid-game.

## Design tradeoffs

- **Joins are blocked once a game starts.** A late joiner has no sane score
  baseline and no way to answer questions already shown. For a small
  friend-group game, it's simpler to have latecomers wait for the next room
  than to design around partial mid-game state. They can join freely during
  the lobby, and up until the host clicks Start.
- **Any player can advance the game, not just the host.** `/reveal` and
  `/next` are gated by server-side elapsed-time checks rather than a host
  check, so if the host's tab is backgrounded or they drop mid-game, the
  game keeps moving — whichever client's local timer fires first wins the
  race, and duplicate calls are no-ops. The host role only matters for
  starting the game from the lobby; if the host leaves the lobby, host
  status migrates automatically to the next-earliest-joined player.
- **If literally everyone leaves an active game**, nothing is left to call
  `/reveal`/`/next`, so the room just idles until it expires (see cleanup
  below). Acceptable for a small, live, synchronous game — there's no
  intended "leave it running and come back later" use case.
- **Room cleanup is time-based, not click-based.** Rooms get a 6-hour
  `expires_at` on creation; the hourly Vercel Cron deletes anything past
  that. There's no manual "close room" action.

## Budget guard

Claude API calls only happen once per room (question generation on Start).
`api_usage` tracks a per-day request count; `MAX_DAILY_CLAUDE_REQUESTS`
(default 20) caps it — once hit, `/api/rooms/[code]/start` and the
single-player `/api/generate-questions` route return HTTP 429 until the next
day. Tune this in your env vars to match your actual usage/budget.

## Security model

The browser only ever holds the Supabase **anon** key. All writes (room
creation, joining, answering, scoring, advancing questions) go through
Next.js Route Handlers using the **service role** key, which bypasses RLS —
this is what makes the game server-authoritative: a player can't edit their
own score or the timer by manipulating client state. RLS policies on `rooms`
and `players` allow public reads (so the UI can show room/leaderboard state
directly), but `questions` has no public read policy at all — the correct
answer is only ever readable server-side, and the current question is
delivered to clients with `correct_index` stripped out.

## Project structure

```
src/
  app/
    page.tsx                 # landing: create/join room
    play/page.tsx             # single-player test flow (no realtime)
    room/[code]/page.tsx      # room shell: lobby / live game / podium
    api/
      rooms/                  # create, join, start, answer, reveal, next, leave
      generate-questions/     # single-player question generation
      cleanup/                # expired-room sweep (Vercel Cron)
  components/                 # Lobby, GameRoom, QuestionScreen, Podium, etc.
  components/ui/               # NeonButton, NeonPanel, PixelHeading
  hooks/                      # usePlayerSession (localStorage identity), useRoomChannel (realtime)
  lib/                        # anthropic.ts, scoring.ts, roomAuth.ts, realtime.ts, supabase/*
  types/game.ts                # shared client/server event + DTO types
supabase/schema.sql            # full DB schema + RLS policies
```
