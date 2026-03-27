"use client";

interface StatCardProps {
  label: string;
  value: string | number;
  delta?: number;
  deltaType?: "positive" | "negative" | "neutral";
  icon?: React.ReactNode;
}

export function StatCard({
  label,
  value,
  delta,
  deltaType = "neutral",
  icon,
}: StatCardProps): React.ReactElement {
  const deltaColor = {
    positive: "text-bull",
    negative: "text-bear",
    neutral: "text-text-secondary",
  };

  return (
    <div
      className="
        bg-surface-card
        border border-border-subtle
        rounded-xl p-4
        hover:border-border
        hover:bg-surface-elevated
        transition-all duration-150
      "
    >
      <div className="flex items-start justify-between mb-2">
        <span className="label text-text-muted">{label}</span>
        {icon && <span className="text-lg">{icon}</span>}
      </div>

      <div className="flex items-end justify-between">
        <span
          className="
            num text-lg font-semibold
            text-text-primary
          "
        >
          {value}
        </span>

        {delta !== undefined && (
          <span
            className={`
              text-xs font-medium
              num
              ${deltaColor[deltaType]}
            `}
          >
            {deltaType === "positive" && "▲ "}
            {deltaType === "negative" && "▼ "}
            {Math.abs(delta).toFixed(2)}%
          </span>
        )}
      </div>
    </div>
  );
}
