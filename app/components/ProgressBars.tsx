"use client";

export default function ProgressBars({
  total,
  currentIndex,
  videoDuration,
}: {
  total: number;
  currentIndex: number;
  videoDuration: number;
}) {
  return (
    <>
      <style>{`
        @keyframes fillBar {
          from { transform: scaleX(0); }
          to { transform: scaleX(1); }
        }
      `}</style>
      <div style={{ display: "flex", gap: 4, padding: 8 }}>
        {Array.from({ length: total }).map((_, i) => {
          const isCompleted = i < currentIndex;
          const isActive = i === currentIndex;
          return (
            <div
              key={i}
              style={{
                flex: 1,
                height: 3,
                borderRadius: 2,
                backgroundColor: "rgba(255,255,255,0.3)",
                overflow: "hidden",
              }}
            >
              {isCompleted && (
                <div style={{ width: "100%", height: "100%", backgroundColor: "white" }} />
              )}
              {isActive && (
                <div
                  key={`active-${currentIndex}`}
                  style={{
                    width: "100%",
                    height: "100%",
                    backgroundColor: "white",
                    transformOrigin: "left",
                    animation: `fillBar ${videoDuration}s linear forwards`,
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
