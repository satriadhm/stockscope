"use client";

interface MetricCardProps {
  label: string;
  value: string | number;
  delta?: number;
  deltaType?: "positive" | "negative" | "neutral";
}

export function MetricCard({
  label,
  value,
  delta,
  deltaType = "neutral",
}: MetricCardProps): React.ReactElement {
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
        text-center
      "
    >
      <p
        className="
          label text-text-muted mb-2
        "
      >
        {label}
      </p>

      <p
        className="
          num text-xl font-semibold
          text-text-primary mb-1
        "
      >
        {value}
      </p>

      {delta !== undefined && (
        <span
          className={`
            text-2xs font-medium
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
  );
}
