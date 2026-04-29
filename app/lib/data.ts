import type { NhlPayload } from "@/lib/types";
import fs from "fs";
import path from "path";

const GITHUB_URL =
  "https://raw.githubusercontent.com/kagaminft/nhl-highlights/main/nhl-latest.json";

export async function fetchNhlData(): Promise<NhlPayload | null> {
  // In development, read the local public file directly (avoids needing localhost URL)
  if (process.env.NODE_ENV === "development") {
    try {
      const localPath = path.join(process.cwd(), "public", "nhl-latest.json");
      const raw = fs.readFileSync(localPath, "utf-8");
      return JSON.parse(raw) as NhlPayload;
    } catch {
      return null;
    }
  }

  try {
    const res = await fetch(GITHUB_URL, { cache: "no-store" });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}
