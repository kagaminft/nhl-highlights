"use client";
import { useRouter } from "next/navigation";
import type { NhlGame } from "@/lib/types";

function nhlLogoUrl(abbr: string): string {
  return `https://assets.nhle.com/logos/nhl/svg/${abbr}_light.svg`;
}

function periodBadge(periodType: string): string | null {
  if (periodType === "OT") return "OT";
  if (periodType === "SO") return "SO";
  return null;
}

export default function GameCard({ game }: { game: NhlGame }) {
  const router = useRouter();
  const badge = periodBadge(game.periodType);
  const goalCount = game.goals.length;

  return (
    <div
      onClick={() => router.push(`/game/${game.gameId}`)}
      className="bg-ice-card border border-ice-blue/20 rounded-xl overflow-hidden shadow-lg cursor-pointer active:scale-[0.98] transition-transform"
    >
      {/* Header strip */}
      <div className="px-4 py-2 flex justify-between items-center bg-ice-mid border-b border-ice-blue/20">
        <span className="font-lexend font-semibold text-xs uppercase tracking-widest text-ice-grey">
          Final{badge ? ` · ${badge}` : ""}
        </span>
        <span className="font-lexend text-xs text-ice-grey/70">
          {goalCount} goal{goalCount !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Score row */}
      <div className="px-6 py-5 flex justify-between items-center">
        {/* Away team */}
        <div className="flex flex-col items-center w-20">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={nhlLogoUrl(game.awayTeam)}
            alt={game.awayTeam}
            width={56}
            height={56}
            className="w-14 h-14 object-contain mb-2"
          />
          <span className="font-lexend font-bold text-lg text-ice-white">
            {game.awayTeam}
          </span>
        </div>

        {/* Center scores */}
        <div className="flex items-center gap-4 px-2">
          <span className="font-epilogue font-black text-5xl text-ice-white">
            {game.awayScore}
          </span>
          <div className="w-px h-8 bg-ice-blue/30" />
          <span className="font-epilogue font-black text-5xl text-ice-white">
            {game.homeScore}
          </span>
        </div>

        {/* Home team */}
        <div className="flex flex-col items-center w-20">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={nhlLogoUrl(game.homeTeam)}
            alt={game.homeTeam}
            width={56}
            height={56}
            className="w-14 h-14 object-contain mb-2"
          />
          <span className="font-lexend font-bold text-lg text-ice-white">
            {game.homeTeam}
          </span>
        </div>
      </div>
    </div>
  );
}
