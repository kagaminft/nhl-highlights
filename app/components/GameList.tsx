"use client";

import GameCard from "./GameCard";
import type { NhlGame } from "@/lib/types";

export default function GameList({ games }: { games: NhlGame[] }) {
  return (
    <>
      {games.map((g) => (
        <GameCard key={g.gameId} game={g} />
      ))}
    </>
  );
}
