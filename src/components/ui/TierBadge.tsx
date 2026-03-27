"use client";

type TierType = "s" | "a" | "b" | "c" | "d";

interface TierBadgeProps {
  tier: TierType;
  size?: "sm" | "md";
}

export function TierBadge({ tier, size = "sm" }: TierBadgeProps): React.ReactElement {
  const tierColors: Record<TierType, string> = {
    s: "tier-s",
    a: "tier-a",
    b: "tier-b",
    c: "tier-c",
    d: "tier-d",
  };

  const tierLabels: Record<TierType, string> = {
    s: "S",
    a: "A",
    b: "B",
    c: "C",
    d: "D",
  };

  const sizeClasses = {
    sm: "px-2 py-1 text-xs",
    md: "px-3 py-1.5 text-sm",
  };

  return (
    <div
      className={`
        inline-flex items-center justify-center
        rounded-full font-bold
        text-white
        bg-${tierColors[tier]}
        ${sizeClasses[size]}
      `}
    >
      {tierLabels[tier]}
    </div>
  );
}
