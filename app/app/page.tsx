export const dynamic = "force-dynamic";

import { fetchNhlData } from "@/lib/data";
import GameList from "@/components/GameList";

export default async function Home() {
  const payload = await fetchNhlData();
  const games = payload?.games ?? [];
  const date = payload?.date ?? null;

  const dateLabel = date
    ? new Date(date + "T12:00:00").toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <div className="max-w-[424px] mx-auto min-h-screen bg-ice-dark flex flex-col">
      {/* Fixed top bar */}
      <div className="fixed top-0 left-0 right-0 z-10 h-14 bg-ice-mid border-b border-ice-blue/20 flex items-center px-4">
        <span className="font-lexend font-bold text-ice-white uppercase tracking-widest text-base">
          NHL Goals
        </span>
      </div>

      <div className="pt-14 flex-1 flex flex-col">
        {games.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 gap-2">
            <span className="text-4xl">🏒</span>
            <p className="text-ice-grey text-center text-sm">No games last night</p>
            {dateLabel && (
              <p className="text-ice-grey/50 text-center text-xs">{dateLabel}</p>
            )}
          </div>
        ) : (
          <>
            {/* Date row */}
            <div className="flex items-center justify-center gap-3 px-4 py-3">
              <div className="flex-1 rink-divider" />
              <span className="font-lexend font-semibold text-xs uppercase tracking-widest text-ice-grey whitespace-nowrap">
                {dateLabel}
              </span>
              <div className="flex-1 rink-divider" />
            </div>

            {/* Game cards */}
            <div className="flex-1 overflow-y-auto px-4 space-y-3 pb-6">
              <GameList games={games} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
