import type { Metadata } from "next";
import { Epilogue, Lexend } from "next/font/google";
import "./globals.css";
import SdkReady from "@/components/SdkReady";

const epilogue = Epilogue({
  subsets: ["latin"],
  weight: ["700", "800"],
  variable: "--font-epilogue",
  display: "swap",
});

const lexend = Lexend({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-lexend",
  display: "swap",
});

const appUrl =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://nhl-highlights.vercel.app";

const fcFrameValue = JSON.stringify({
  version: "1",
  imageUrl: `${appUrl}/og-default.png`,
  button: {
    title: "Watch",
    action: {
      type: "launch_frame",
      name: "NHL Goals",
      url: appUrl,
      splashImageUrl: `${appUrl}/splash.png`,
      splashBackgroundColor: "#0a1628",
    },
  },
});

export const metadata: Metadata = {
  title: "NHL Goals",
  description: "Watch every goal from last night's NHL games.",
  openGraph: {
    title: "NHL Goals",
    description: "Watch every goal from last night's NHL games.",
    images: [{ url: `${appUrl}/og-default.png`, width: 1200, height: 630 }],
  },
  other: {
    "fc:miniapp": fcFrameValue,
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${epilogue.variable} ${lexend.variable} antialiased`}>
        <SdkReady />
        {children}
      </body>
    </html>
  );
}
