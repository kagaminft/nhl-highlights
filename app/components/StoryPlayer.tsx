"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { NhlGame, NhlGoal } from "@/lib/types";
import ProgressBars from "@/components/ProgressBars";
import LowerThird from "@/components/LowerThird";

const BRIGHTCOVE_ACCOUNT = "6415718365001";
const BRIGHTCOVE_POLICY_KEY =
  "BCpkADawqM3l37Vq8trLJ95vVwxubXYZXYglAopEZXQTHTWX3YdalyF9xmkuknxjBgiMYwt8VZ_OZ1jAjYxz_yzuNh_cjC3uOaMspVTD-hZfNUHtNnBnhVD0Gmsih8TBF8QlQFXiCQM3W_u4ydJ1qK2Rx8ZutCUg3PHb7Q";
const FALLBACK_DURATION = 40; // seconds — used when video duration is unknown

async function resolveMp4Url(videoId: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://edge.api.brightcove.com/playback/v1/accounts/${BRIGHTCOVE_ACCOUNT}/videos/${videoId}`,
      { headers: { Accept: `application/json;pk=${BRIGHTCOVE_POLICY_KEY}` } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const mp4s: { src: string; size?: number }[] = (data.sources ?? []).filter(
      (s: { container?: string; src?: string }) =>
        s.container === "MP4" && s.src?.startsWith("https")
    );
    if (mp4s.length === 0) return null;
    mp4s.sort((a, b) => (b.size ?? 0) - (a.size ?? 0));
    return mp4s[0].src;
  } catch {
    return null;
  }
}

export default function StoryPlayer({
  game,
  initialIndex,
}: {
  game: NhlGame;
  initialIndex: number;
}) {
  const router = useRouter();
  const goals = game.goals;
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [mp4Url, setMp4Url] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);
  const [videoDuration, setVideoDuration] = useState(FALLBACK_DURATION);
  const [isMuted, setIsMuted] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const swipeConsumed = useRef(false);
  const videoEndedRef = useRef(false);
  const autoAdvanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const goal: NhlGoal = goals[currentIndex];

  const goBack = useCallback(() => router.push("/"), [router]);

  const handleAdvance = useCallback(() => {
    if (currentIndex < goals.length - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      goBack();
    }
  }, [currentIndex, goals.length, goBack]);

  const handleBack = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
    } else {
      goBack();
    }
  }, [currentIndex, goBack]);

  // Resolve direct MP4 URL when slide changes
  useEffect(() => {
    setMp4Url(null);
    setVideoDuration(FALLBACK_DURATION);
    videoEndedRef.current = false;

    if (!goal.videoId) return;

    setResolving(true);
    resolveMp4Url(goal.videoId).then((url) => {
      setMp4Url(url);
      setResolving(false);
    });
  }, [currentIndex, goal.videoId]);

  // Sync muted state imperatively (React muted prop doesn't reflect as HTML attribute)
  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = isMuted;
  }, [isMuted, currentIndex]);

  // Call play() after mount to recover from autoplay blocks on iOS/Warpcast
  useEffect(() => {
    if (mp4Url) videoRef.current?.play().catch(() => {});
  }, [mp4Url]);

  // Fallback auto-advance timer (kicks in if video fails to load or for null-video slides)
  useEffect(() => {
    if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
    autoAdvanceTimer.current = setTimeout(handleAdvance, FALLBACK_DURATION * 1000);
    return () => {
      if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
    };
  }, [currentIndex, handleAdvance]);

  // Keyboard navigation (desktop)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") handleAdvance();
      else if (e.key === "ArrowLeft") handleBack();
      else if (e.key === "Escape") goBack();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleAdvance, handleBack, goBack]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    swipeConsumed.current = false;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    const adx = Math.abs(dx);
    const ady = Math.abs(dy);

    if (adx < 20 && ady < 20) return; // tap, not swipe

    swipeConsumed.current = true;

    if (ady > adx && dy > 60) {
      goBack(); // swipe down → exit
    } else if (adx > ady) {
      if (dx < -50) handleAdvance(); // swipe left → next
      else if (dx > 50) handleBack(); // swipe right → prev
    }
  };

  return (
    <div
      style={{
        width: "100%",
        height: "100dvh",
        position: "relative",
        overflow: "hidden",
        backgroundColor: "#0a1628",
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Background: direct MP4 video or fallback */}
      {mp4Url ? (
        <video
          ref={videoRef}
          key={currentIndex}
          autoPlay
          muted
          playsInline
          onLoadedMetadata={(e) => {
            const dur = e.currentTarget.duration;
            if (dur && isFinite(dur)) setVideoDuration(dur);
            e.currentTarget.muted = isMuted;
          }}
          onEnded={() => {
            videoEndedRef.current = true;
            if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
            handleAdvance();
          }}
          src={mp4Url}
          style={{
            position: "absolute",
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center",
            zIndex: 0,
          }}
        />
      ) : goal.videoId && resolving ? (
        /* Loading state — dark background while resolving */
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 0,
            background: "linear-gradient(180deg, #0f2040 0%, #0a1628 100%)",
          }}
        />
      ) : (
        /* No video available */
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
            background: "linear-gradient(180deg, #0f2040 0%, #0a1628 100%)",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`https://assets.nhle.com/logos/nhl/svg/${goal.teamAbbrev}_light.svg`}
            alt={goal.teamAbbrev}
            width={80}
            height={80}
            style={{ opacity: 0.5 }}
          />
          <a
            href={goal.fallbackUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ zIndex: 60, position: "relative" }}
            className="px-5 py-2.5 rounded-full bg-ice-blue text-white font-lexend font-semibold text-sm"
            onClick={(e) => e.stopPropagation()}
          >
            Watch on NHL.com →
          </a>
        </div>
      )}

      {/* Progress bars */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 20,
          pointerEvents: "none",
        }}
      >
        <ProgressBars
          total={goals.length}
          currentIndex={currentIndex}
          videoDuration={videoDuration}
        />
      </div>

      {/* Mute toggle — top right, only shown when video is playing */}
      {mp4Url && (
        <button
          onClick={() => setIsMuted((m) => !m)}
          style={{ position: "absolute", top: 40, right: 12, zIndex: 50 }}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-black/30 border border-white/20 text-white"
          aria-label={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
              <line x1="23" y1="9" x2="17" y2="15"/>
              <line x1="17" y1="9" x2="23" y2="15"/>
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
            </svg>
          )}
        </button>
      )}

      {/* Tap zones */}
      <div
        onClick={() => { if (!swipeConsumed.current) handleBack(); }}
        style={{ position: "absolute", top: 0, left: 0, width: "33%", height: "100%", zIndex: 10, cursor: "pointer" }}
      />
      <div
        onClick={() => { if (!swipeConsumed.current) handleAdvance(); }}
        style={{ position: "absolute", top: 0, right: 0, width: "67%", height: "100%", zIndex: 10, cursor: "pointer" }}
      />

      {/* Lower third */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 20,
          pointerEvents: "none",
        }}
      >
        <LowerThird goal={goal} />
      </div>
    </div>
  );
}
