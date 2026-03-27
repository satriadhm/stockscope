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
        rounded-xl border border-border-subtle
        bg-surface-elevated/70 p-4
        shadow-[0_10px_30px_-24px_rgba(59,130,246,0.45)]
        hover:border-border hover:bg-surface-elevated
        transition-all duration-150
      "
    >
      <div className="flex items-start justify-between mb-2">
        <span className="label text-text-secondary">{label}</span>
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
