"use client";

interface ChangeIndicatorProps {
  value: number;
  showBg?: boolean;
  size?: "xs" | "sm" | "md";
}

export function ChangeIndicator({
  value,
  showBg = false,
  size = "sm",
}: ChangeIndicatorProps): React.ReactElement {
  const isPositive = value >= 0;
  const color = isPositive ? "bull" : "bear";
  const bgColor = isPositive ? "bull-bg" : "bear-bg";

  const sizeClasses = {
    xs: "text-2xs gap-0.5",
    sm: "text-xs gap-1",
    md: "text-sm gap-1.5",
  };

  return (
    <div
      className={`
        flex items-center
        ${sizeClasses[size]}
        ${showBg ? `px-2 py-1 rounded-full bg-${bgColor}` : ""}
      `}
    >
      <span
        className={`
          text-${color}
          font-semibold
          num
        `}
      >
        {isPositive ? "▲" : "▼"}
      </span>
      <span
        className={`
          text-${color}
          font-medium
          num
        `}
      >
        {Math.abs(value).toFixed(2)}%
      </span>
    </div>
  );
}
