export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { fetchNhlData } from "@/lib/data";
import StoryPlayer from "@/components/StoryPlayer";
import Link from "next/link";

const appUrl =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://nhl-highlights.vercel.app";

export async function generateMetadata({
  params,
}: {
  params: { gameId: string };
}): Promise<Metadata> {
  const payload = await fetchNhlData();
  const game = payload?.games.find((g) => g.gameId === params.gameId);

  const title = game
    ? `${game.awayTeam} @ ${game.homeTeam} — ${game.awayScore}–${game.homeScore}`
    : "NHL Goals";
  const description = game
    ? `${game.goals.length} goals — watch every one.`
    : "Watch every goal from last night's NHL games.";

  return {
    title,
    description,
    other: {
      "fc:frame": JSON.stringify({
        version: "next",
        imageUrl: `${appUrl}/og-default.png`,
        button: {
          title: "Watch",
          action: {
            type: "launch_frame",
            name: "NHL Goals",
            url: `${appUrl}/game/${params.gameId}`,
            splashImageUrl: `${appUrl}/splash.png`,
            splashBackgroundColor: "#0a1628",
          },
        },
      }),
    },
  };
}

export default async function GamePage({
  params,
}: {
  params: { gameId: string };
}) {
  const payload = await fetchNhlData();
  const game = payload?.games.find((g) => g.gameId === params.gameId);

  if (!game || game.goals.length === 0) {
    return (
      <div className="max-w-[424px] mx-auto min-h-screen bg-ice-dark text-ice-white flex flex-col items-center justify-center gap-4">
        <p className="text-ice-grey">No goals found for this game</p>
        <Link href="/" className="text-ice-blue text-sm underline">
          ← Back to games
        </Link>
      </div>
    );
  }

  return <StoryPlayer game={game} initialIndex={0} />;
}
