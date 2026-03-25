export interface TourStep {
  id: string;
  selector: string;
  title: string;
  description: string;
  position?: 'top' | 'bottom';
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: 'kpi-cards',
    selector: "[data-tour='kpi-cards']",
    title: 'Key Performance Indicators',
    description:
      "Monitor your portfolio's health with real-time KPIs: total stocks, average concentration, and market signal.",
  },
  {
    id: 'tab-overview',
    selector: "[data-tour='tab-overview']",
    title: 'Overview Tab',
    description:
      'Get a high-level view of your portfolio composition and risk distribution.',
  },
  {
    id: 'tab-screener',
    selector: "[data-tour='tab-screener']",
    title: 'Screener Tool',
    description: 'Filter and analyze stocks based on custom criteria.',
  },
  {
    id: 'search',
    selector: "[data-tour='search']",
    title: 'Search',
    description: 'Quickly find specific stocks or companies in your portfolio.',
  },
  {
    id: 'presets',
    selector: "[data-tour='presets']",
    title: 'Quick Filters',
    description:
      'Use preset filters to instantly identify high-risk or concentrated positions.',
  },
];
