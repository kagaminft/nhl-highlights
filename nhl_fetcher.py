#!/usr/bin/env python3
"""
NHL Goal Fetcher — runs as a daily cron job (two passes: 7 AM and 9 AM PT).
Fetches all prior-night completed games, extracts every goal with video metadata,
and writes nhl-latest.json. Never overwrites on failure.

Usage:
  python nhl_fetcher.py          # pass 1 (default)
  python nhl_fetcher.py --pass 2 # pass 2 (re-fetches missing videos)
"""

from __future__ import annotations

import argparse
import json
import logging
import subprocess
import sys
import time
from datetime import datetime, timedelta
from pathlib import Path

import pytz
import requests

# ---------------------------------------------------------------------------
BASE_URL = "https://api-web.nhle.com/v1"
OUTPUT_FILE = Path(__file__).parent / "nhl-latest.json"
BRIGHTCOVE_EMBED = (
    "https://players.brightcove.net/6415718365001/EXtG1xJ7H_default/index.html"
    "?videoId={video_id}"
)
GAMECENTER_URL = "https://www.nhl.com/gamecenter/{game_id}"
SLEEP_BETWEEN_GAMES = 0.75  # seconds

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)s  %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger(__name__)

HEADERS = {"User-Agent": "nhl-goal-fetcher/1.0"}
SESSION = requests.Session()
SESSION.headers.update(HEADERS)


# ---------------------------------------------------------------------------
# Date helpers
# ---------------------------------------------------------------------------

def yesterday_pt() -> str:
    """Return yesterday's date string in America/Los_Angeles timezone."""
    pt = pytz.timezone("America/Los_Angeles")
    return (datetime.now(pt) - timedelta(days=1)).strftime("%Y-%m-%d")


# ---------------------------------------------------------------------------
# API helpers
# ---------------------------------------------------------------------------

def get(url: str, timeout: int = 20) -> dict:
    r = SESSION.get(url, timeout=timeout)
    r.raise_for_status()
    return r.json()


def fetch_schedule(date_str: str) -> list[dict]:
    """Return all games for the given date."""
    data = get(f"{BASE_URL}/schedule/{date_str}")
    games = []
    for week in data.get("gameWeek", []):
        for g in week.get("games", []):
            games.append(g)
    return games


def fetch_landing(game_id: int) -> dict:
    return get(f"{BASE_URL}/gamecenter/{game_id}/landing")


def fetch_right_rail(game_id: int) -> dict:
    return get(f"{BASE_URL}/gamecenter/{game_id}/right-rail")


# ---------------------------------------------------------------------------
# Data extraction
# ---------------------------------------------------------------------------

def extract_recap_url(rr_data: dict, game_id: int) -> str | None:
    """Extract the 3-min recap embed URL from right-rail data."""
    game_video = rr_data.get("gameVideo", {})
    recap_id = game_video.get("threeMinRecap") or game_video.get("condensedGame")
    if recap_id:
        return BRIGHTCOVE_EMBED.format(video_id=recap_id)
    return None


def period_label(number: int, period_type: str) -> str:
    if period_type == "OT":
        return "OT"
    if period_type == "SO":
        return "SO"
    return str(number)


def extract_goals(landing_data: dict, game_id: int) -> list[dict]:
    """Extract all goals from landing summary.scoring into our schema."""
    goals = []
    scoring_periods = landing_data.get("summary", {}).get("scoring", [])

    for period in scoring_periods:
        pd = period.get("periodDescriptor", {})
        period_num = pd.get("number", 0)
        period_type = pd.get("periodType", "REG")

        for g in period.get("goals", []):
            # Scorer full name
            first = g.get("firstName", {}).get("default", "")
            last = g.get("lastName", {}).get("default", "")
            scorer = f"{first} {last}".strip()

            # Assists full names
            assists = [
                f"{a.get('firstName',{}).get('default','')} {a.get('lastName',{}).get('default','')}".strip()
                for a in g.get("assists", [])
            ]

            # Strength
            raw_strength = g.get("strength", "ev")
            strength_map = {"pp": "PP", "sh": "SH", "ps": "PS"}
            strength = strength_map.get(raw_strength, "EV")

            # Empty net
            empty_net = g.get("goalModifier", "none") == "empty-net"
            if empty_net:
                strength = "EN"

            # Video
            video_id = g.get("highlightClip")
            embed_url = BRIGHTCOVE_EMBED.format(video_id=video_id) if video_id else None
            fallback_url = g.get("highlightClipSharingUrl") or GAMECENTER_URL.format(game_id=game_id)

            goals.append({
                "period": period_num,
                "periodType": period_type,
                "timeInPeriod": g.get("timeInPeriod", ""),
                "teamAbbrev": g.get("teamAbbrev", {}).get("default", ""),
                "scorer": scorer,
                "scorerSeasonTotal": g.get("goalsToDate", 0),
                "assists": assists,
                "homeScore": g.get("homeScore", 0),
                "awayScore": g.get("awayScore", 0),
                "strength": strength,
                "emptyNet": empty_net,
                "shotType": g.get("shotType"),
                "videoId": str(video_id) if video_id else None,
                "embedUrl": embed_url,
                "fallbackUrl": fallback_url,
            })

    return goals


def extract_period_type(landing_data: dict) -> str:
    """Return the final period type of the game (REG, OT, SO)."""
    scoring = landing_data.get("summary", {}).get("scoring", [])
    if not scoring:
        return "REG"
    last_period = scoring[-1]
    return last_period.get("periodDescriptor", {}).get("periodType", "REG")


# ---------------------------------------------------------------------------
# Main fetch logic
# ---------------------------------------------------------------------------

def fetch_game(game_info: dict) -> dict | None:
    """Fetch full data for one game. Returns None on error."""
    game_id = game_info["id"]
    home = game_info.get("homeTeam", {})
    away = game_info.get("awayTeam", {})

    log.info("Fetching game %s: %s @ %s", game_id, away.get("abbrev"), home.get("abbrev"))

    try:
        landing = fetch_landing(game_id)
        rr = fetch_right_rail(game_id)
    except Exception as e:
        log.error("Failed to fetch game %s: %s", game_id, e)
        return None

    goals = extract_goals(landing, game_id)
    recap_url = extract_recap_url(rr, game_id)
    period_type = extract_period_type(landing)

    # Get final scores from landing (more reliable than schedule)
    home_score = landing.get("homeTeam", {}).get("score", home.get("score", 0))
    away_score = landing.get("awayTeam", {}).get("score", away.get("score", 0))

    return {
        "gameId": str(game_id),
        "homeTeam": home.get("abbrev", ""),
        "awayTeam": away.get("abbrev", ""),
        "homeScore": home_score,
        "awayScore": away_score,
        "gameState": game_info.get("gameState", "OFF"),
        "periodType": period_type,
        "recapUrl": recap_url,
        "goals": goals,
    }


def run(pass_number: int = 1) -> None:
    target_date = yesterday_pt()
    fetched_at = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")

    log.info("=== NHL Fetcher — %s  (pass %d) ===", target_date, pass_number)

    # --- Step 1: get schedule ---
    try:
        all_games = fetch_schedule(target_date)
    except Exception as e:
        log.error("Schedule fetch failed: %s — aborting, preserving existing JSON", e)
        sys.exit(1)

    final_games = [g for g in all_games if g.get("gameState") == "OFF"]
    log.info("Completed games: %d / %d total", len(final_games), len(all_games))

    if not final_games:
        log.info("No completed games for %s — writing empty payload", target_date)

    # --- Step 2: per-game fetch ---
    # On pass 2, reload existing JSON and only re-fetch games with missing video
    existing_games: list[dict] = []
    if pass_number == 2 and OUTPUT_FILE.exists():
        try:
            existing = json.loads(OUTPUT_FILE.read_text())
            existing_games = existing.get("games", [])
            log.info("Pass 2: loaded %d existing games from JSON", len(existing_games))
        except Exception:
            log.warning("Pass 2: could not read existing JSON, re-fetching all")

    games_out: list[dict] = []
    for i, game_info in enumerate(final_games):
        game_id = str(game_info["id"])

        # Pass 2: skip if all goals already have video
        if pass_number == 2:
            existing_match = next((g for g in existing_games if g["gameId"] == game_id), None)
            if existing_match:
                missing_video = any(
                    g["embedUrl"] is None for g in existing_match.get("goals", [])
                )
                if not missing_video:
                    log.info("Game %s already has full video — skipping", game_id)
                    games_out.append(existing_match)
                    continue

        game_data = fetch_game(game_info)
        if game_data:
            games_out.append(game_data)
        else:
            # Preserve existing data if we have it
            existing_match = next((g for g in existing_games if g["gameId"] == game_id), None)
            if existing_match:
                log.warning("Using cached data for game %s", game_id)
                games_out.append(existing_match)

        if i < len(final_games) - 1:
            time.sleep(SLEEP_BETWEEN_GAMES)

    # --- Step 3: write output ---
    payload = {
        "date": target_date,
        "fetchedAt": fetched_at,
        "games": games_out,
    }

    try:
        OUTPUT_FILE.write_text(json.dumps(payload, indent=2, ensure_ascii=False))
        log.info("Written: %s  (%d games, %d total goals)",
                 OUTPUT_FILE,
                 len(games_out),
                 sum(len(g["goals"]) for g in games_out))
    except Exception as e:
        log.error("Failed to write output: %s", e)
        sys.exit(1)

    # --- Step 4: git push ---
    try:
        subprocess.run(["git", "add", "nhl-latest.json"], check=True, cwd=OUTPUT_FILE.parent)
        subprocess.run(
            ["git", "commit", "-m", f"NHL goals update {target_date} pass{pass_number}"],
            check=True,
            cwd=OUTPUT_FILE.parent,
        )
        subprocess.run(["git", "push"], check=True, cwd=OUTPUT_FILE.parent)
        log.info("Git push complete")
    except subprocess.CalledProcessError as e:
        log.warning("Git push failed (non-fatal): %s", e)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--pass", dest="pass_number", type=int, default=1,
                        help="Fetch pass number (1 or 2)")
    args = parser.parse_args()
    run(args.pass_number)
