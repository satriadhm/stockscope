"use client";

type SectorType =
  | "finance"
  | "energy"
  | "tech"
  | "consumer"
  | "industrial"
  | "property"
  | "healthcare"
  | "mining";

interface SectorBadgeProps {
  sector: SectorType;
  size?: "sm" | "md";
}

export function SectorBadge({
  sector,
  size = "sm",
}: SectorBadgeProps): React.ReactElement {
  const sectorColors: Record<SectorType, string> = {
    finance: "sector-finance",
    energy: "sector-energy",
    tech: "sector-tech",
    consumer: "sector-consumer",
    industrial: "sector-industrial",
    property: "sector-property",
    healthcare: "sector-healthcare",
    mining: "sector-mining",
  };

  const sectorLabels: Record<SectorType, string> = {
    finance: "Finance",
    energy: "Energy",
    tech: "Technology",
    consumer: "Consumer",
    industrial: "Industrial",
    property: "Property",
    healthcare: "Healthcare",
    mining: "Mining",
  };

  const sizeClasses = {
    sm: "px-2.5 py-1 text-2xs",
    md: "px-3 py-1.5 text-xs",
  };

  return (
    <div
      className={`
        inline-flex items-center justify-center
        rounded-full
        text-white font-medium
        bg-${sectorColors[sector]}
        ${sizeClasses[size]}
      `}
    >
      {sectorLabels[sector]}
    </div>
  );
}
