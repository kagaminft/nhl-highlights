export interface NhlGoal {
  period: number;
  periodType: string;       // "REG" | "OT" | "SO"
  timeInPeriod: string;     // "03:35"
  teamAbbrev: string;
  scorer: string;
  scorerSeasonTotal: number;
  assists: string[];
  homeScore: number;
  awayScore: number;
  strength: string;         // "EV" | "PP" | "SH" | "EN"
  emptyNet: boolean;
  shotType: string | null;
  videoId: string | null;
  embedUrl: string | null;
  fallbackUrl: string;
}

export interface NhlGame {
  gameId: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  gameState: string;
  periodType: string;       // "REG" | "OT" | "SO"
  recapUrl: string | null;
  goals: NhlGoal[];
}

export interface NhlPayload {
  date: string;
  fetchedAt: string;
  games: NhlGame[];
}
