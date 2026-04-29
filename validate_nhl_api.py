#!/usr/bin/env python3
"""
Phase 1 validation: confirm the NHL API returns per-goal videoId / clip references.
Hits schedule -> landing -> right-rail for a recent completed game and prints the raw
summary.scoring structure so we know exactly what video fields are available.
"""

import json
import sys
from datetime import date, timedelta

import requests

BASE = "https://api-web.nhle.com/v1"
HEADERS = {"User-Agent": "nhl-goal-validator/1.0"}


def yesterday_pt() -> str:
    from datetime import datetime
    import pytz
    pt = pytz.timezone("America/Los_Angeles")
    return (datetime.now(pt) - timedelta(days=1)).strftime("%Y-%m-%d")


def get_games(d: str) -> list[dict]:
    url = f"{BASE}/schedule/{d}"
    r = requests.get(url, headers=HEADERS, timeout=15)
    r.raise_for_status()
    data = r.json()
    games = []
    for week in data.get("gameWeek", []):
        for g in week.get("games", []):
            games.append(g)
    return games


def main():
    target = yesterday_pt()
    print(f"\n=== NHL API Validation — {target} ===\n")

    # Try yesterday; fall back up to 7 days to find a completed game
    games = []
    checked_date = target
    for days_back in range(7):
        d = (date.fromisoformat(target) - timedelta(days=days_back)).isoformat()
        checked_date = d
        games = get_games(d)
        final = [g for g in games if g.get("gameState") == "OFF"]
        if final:
            print(f"Found {len(final)} completed game(s) on {d}")
            games = final
            break
    else:
        print("No completed games found in the last 7 days. Try again later.")
        sys.exit(1)

    # Pick the first completed game
    game = games[0]
    game_id = game["id"]
    home = game.get("homeTeam", {}).get("abbrev", "?")
    away = game.get("awayTeam", {}).get("abbrev", "?")
    print(f"\nGame: {away} @ {home}  (id={game_id})\n")

    # --- Landing endpoint ---
    print("--- GET /gamecenter/{gameId}/landing ---")
    landing = requests.get(f"{BASE}/gamecenter/{game_id}/landing", headers=HEADERS, timeout=15)
    landing.raise_for_status()
    landing_data = landing.json()

    scoring = landing_data.get("summary", {}).get("scoring", [])
    print(f"Periods in summary.scoring: {len(scoring)}\n")

    goal_count = 0
    video_ids_found = 0
    for period in scoring:
        period_num = period.get("periodDescriptor", {}).get("number", "?")
        period_type = period.get("periodDescriptor", {}).get("periodType", "?")
        goals = period.get("goals", [])
        print(f"  Period {period_num} ({period_type}): {len(goals)} goal(s)")
        for g in goals:
            goal_count += 1
            scorer = g.get("name", {}).get("default", "Unknown")
            vid = g.get("highlightClipSharingUrl") or g.get("highlightClip") or g.get("videoId") or g.get("clipSharingUrl")
            # Print ALL keys in the goal object so we can see the exact field names
            video_keys = {k: v for k, v in g.items() if "video" in k.lower() or "clip" in k.lower() or "highlight" in k.lower() or "media" in k.lower()}
            print(f"    Goal: {scorer}")
            print(f"      Video-related keys: {json.dumps(video_keys, indent=6)}")
            if vid:
                video_ids_found += 1

    print(f"\nTotal goals: {goal_count}")
    print(f"Goals with video reference: {video_ids_found}")

    # Print all top-level keys of one goal for full inspection
    if scoring and scoring[0].get("goals"):
        sample = scoring[0]["goals"][0]
        print(f"\n=== Full first goal object (all keys) ===")
        print(json.dumps(sample, indent=2))

    # --- Right-rail endpoint ---
    print("\n--- GET /gamecenter/{gameId}/right-rail ---")
    rr = requests.get(f"{BASE}/gamecenter/{game_id}/right-rail", headers=HEADERS, timeout=15)
    rr.raise_for_status()
    rr_data = rr.json()

    # Look for recap/condensed game video in right-rail
    recap_keys = {k: v for k, v in rr_data.items() if "video" in k.lower() or "recap" in k.lower() or "highlight" in k.lower()}
    print(f"Video-related top-level keys in right-rail: {list(recap_keys.keys())}")
    if recap_keys:
        print(json.dumps(recap_keys, indent=2)[:2000])  # truncate if huge

    print("\n=== Validation complete ===")


if __name__ == "__main__":
    main()
