"use client";
import type { NhlGoal } from "@/lib/types";

function periodLabel(period: number, periodType: string): string {
  if (periodType === "OT") return "OT";
  if (periodType === "SO") return "SO";
  if (period === 1) return "1st";
  if (period === 2) return "2nd";
  if (period === 3) return "3rd";
  return `${period}th`;
}

function StrengthBadge({ strength }: { strength: string }) {
  if (strength === "EV" || !strength) return null;
  const styles: Record<string, string> = {
    PP: "bg-pp-gold/90 text-black",
    SH: "bg-sh-red/90 text-white",
    EN: "bg-en-orange/90 text-white",
  };
  const cls = styles[strength] ?? "bg-ice-blue/80 text-white";
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded text-xs font-lexend font-bold uppercase tracking-wide ${cls}`}
      style={{ fontSize: 11 }}
    >
      {strength}
    </span>
  );
}

export default function LowerThird({ goal }: { goal: NhlGoal }) {
  const shadow = "0 1px 4px rgba(0,0,0,1), 0 0 16px rgba(0,0,0,0.8)";
  const periodStr = periodLabel(goal.period, goal.periodType);
  const assistLine =
    goal.assists.length > 0 ? goal.assists.join(", ") : "Unassisted";

  return (
    <div
      style={{
        background:
          "linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.65) 30%, rgba(0,0,0,0.92) 100%)",
        padding: "72px 16px 20px",
      }}
    >
      {/* Line 1: Scorer */}
      <p
        className="text-ice-white font-bold text-2xl font-lexend"
        style={{ textShadow: shadow }}
      >
        {goal.scorer}
        <span className="text-ice-grey font-normal text-xl ml-1">
          ({goal.scorerSeasonTotal})
        </span>
      </p>

      {/* Line 2: Assists */}
      <p
        className="text-ice-grey text-sm mt-0.5"
        style={{ textShadow: "0 1px 3px rgba(0,0,0,0.9)" }}
      >
        {assistLine}
      </p>

      {/* Line 3: Context */}
      <div
        className="flex items-center gap-2 text-white/80 text-sm mt-1.5 flex-wrap"
        style={{ textShadow: "0 1px 3px rgba(0,0,0,0.9)" }}
      >
        <span>
          {goal.timeInPeriod} · {periodStr}
        </span>
        <span>·</span>
        <span>
          {goal.awayScore}–{goal.homeScore}
        </span>
        {(goal.strength !== "EV" || goal.emptyNet) && (
          <>
            <span>·</span>
            <StrengthBadge strength={goal.strength} />
          </>
        )}
      </div>
    </div>
  );
}
