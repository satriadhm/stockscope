import React from "react";

interface TrendBadgeProps {
  value: number;
  className?: string;
}

export function TrendBadge({ value, className = "" }: TrendBadgeProps) {
  const isPositive = value >= 0;
  const formattedText = `${isPositive ? "+" : ""}${value.toFixed(2)}%`;
  const colorClass = isPositive ? "text-[--color-positive]" : "text-[--color-negative]";
  const bgClass = isPositive ? "bg-[--color-positive]/10" : "bg-[--color-negative]/10";

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium tabular-data ${colorClass} ${bgClass} ${className}`}>
      {formattedText}
    </span>
  );
}
