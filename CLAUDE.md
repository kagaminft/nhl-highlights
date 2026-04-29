# NHL Goal Highlights

A private Farcaster mini-app for a small group of friends. Every morning a Python script fetches the prior night's NHL goals and pushes `nhl-latest.json` to this repo. A Next.js mini-app reads that file and presents a swipe-through story player — one clip per goal, no ads.

## Repo structure

```
nhl_fetcher.py        # Daily cron script — fetches NHL API, writes nhl-latest.json, git pushes
validate_nhl_api.py   # One-shot script to inspect NHL API response shape
requirements.txt      # Python deps: requests, pytz, python-dateutil
nhl-latest.json       # Output file — overwritten daily, read by the mini-app via raw GitHub URL
app/                  # Next.js 14 Farcaster mini-app
  app/page.tsx              # Screen 1: game list
  app/game/[gameId]/page.tsx # Screen 2: story player
  components/StoryPlayer.tsx # Swipe story UI — resolves direct MP4s from Brightcove
  components/GameCard.tsx
  components/LowerThird.tsx
  lib/data.ts               # Fetches nhl-latest.json from raw GitHub (prod) or public/ (dev)
  lib/types.ts              # NhlPayload, NhlGame, NhlGoal interfaces
  public/nhl-latest.json    # Local dev copy of nhl-latest.json
```

## How it works

1. `nhl_fetcher.py` runs as a Mac cron job at 7 AM and 9 AM PT
2. It hits `https://api-web.nhle.com/v1/` (free, no key) to get completed games + goals
3. Each goal's `highlightClip` field is a Brightcove video ID
4. The script writes `nhl-latest.json` and runs `git push`
5. The Next.js app fetches `raw.githubusercontent.com/kagaminft/nhl-highlights/main/nhl-latest.json`
6. `StoryPlayer` resolves direct MP4 URLs client-side from the Brightcove Playback API (avoids ads)

## Two tasks still needed

### 1. Set up cron jobs on the Mac

Add two entries to the Mac's crontab (`crontab -e`):

```
0 7 * * * cd /path/to/nhl-goal-mini-app && /usr/bin/python3 nhl_fetcher.py
0 9 * * * cd /path/to/nhl-goal-mini-app && /usr/bin/python3 nhl_fetcher.py --pass 2
```

Replace `/path/to/nhl-goal-mini-app` with the actual clone path.

Pass 1 (7 AM) fetches all completed games. Pass 2 (9 AM) re-fetches any games that had missing video URLs at 7 AM (late West Coast games).

The script requires `requests`, `pytz`, and `python-dateutil`:
```bash
pip3 install requests pytz python-dateutil
```

The script also runs `git push` after writing the JSON. Make sure the repo is cloned with credentials that allow pushing to `kagaminft/nhl-highlights` (SSH key or stored HTTPS token).

### 2. Deploy the mini-app to Vercel

The Next.js app lives in `app/`. Deploy it:

1. Go to vercel.com → New Project → Import `kagaminft/nhl-highlights`
2. Set **Root Directory** to `app`
3. Framework: Next.js (auto-detected)
4. Add environment variable:
   - `NEXT_PUBLIC_APP_URL` = the Vercel deployment URL (e.g. `https://nhl-highlights.vercel.app`)
5. Deploy

After deploying, update `NEXT_PUBLIC_APP_URL` in Vercel to the actual URL if it differs from the placeholder.

To register as a Farcaster mini-app, submit the deployed URL through the Farcaster developer portal. The `fc:miniapp` frame metadata is already wired in `app/app/layout.tsx`.

## Local development

```bash
cd app
npm install
npm run dev
```

The dev server reads `app/public/nhl-latest.json` directly via Node.js `fs` (no HTTP needed).
To refresh local data, run `python3 nhl_fetcher.py` from the repo root — it writes `nhl-latest.json`,
then copy it to `app/public/nhl-latest.json`.

## Key technical notes

- **No database** — the app reads only from `nhl-latest.json` on GitHub. No Vercel KV.
- **No server** — the mini-app is a Next.js frontend with no API routes.
- **Brightcove video resolution** — `StoryPlayer.tsx` calls the Brightcove Playback API client-side using a public policy key extracted from the NHL player JS. This returns signed MP4 URLs that work in a `<video>` tag (no ads, no iframe). The policy key is public and already hardcoded in `StoryPlayer.tsx`.
- **Never overwrite on fetch failure** — `nhl_fetcher.py` only writes `nhl-latest.json` if the full fetch succeeds.
- **Pass 2 logic** — pass 2 skips games that already have full video URLs and only re-fetches games where any goal has `embedUrl: null`.
