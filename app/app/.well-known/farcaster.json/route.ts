import { NextResponse } from "next/server";

export function GET() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://mini-app-liart.vercel.app";

  const header = process.env.FARCASTER_MANIFEST_HEADER;
  const payload = process.env.FARCASTER_MANIFEST_PAYLOAD;
  const signature = process.env.FARCASTER_MANIFEST_SIGNATURE;

  const body: Record<string, unknown> = {
    miniapp: {
      version: "1",
      name: "Inside Baseball",
      homeUrl: appUrl,
      iconUrl: `${appUrl}/icon.png`,
      splashImageUrl: `${appUrl}/splash.png`,
      splashBackgroundColor: "#000000",
      subtitle: "Daily MLB highlights by WPA",
      description: "Watch the top 5 moments from each MLB game, ranked by win probability added (WPA). New games every morning.",
      primaryCategory: "news-media",
      tags: ["baseball", "mlb", "statcast", "highlights", "sports"],
      ogTitle: "Inside Baseball",
      ogDescription: "Top 5 WPA moments from every MLB game",
      ogImageUrl: `${appUrl}/og-default.png`,
      webhookUrl: `${appUrl}/api/webhook`,
    },
  };

  if (header && payload && signature) {
    body.accountAssociation = { header, payload, signature };
  }

  return NextResponse.json(body, {
    headers: {
      "Content-Type": "application/json",
    },
  });
}
