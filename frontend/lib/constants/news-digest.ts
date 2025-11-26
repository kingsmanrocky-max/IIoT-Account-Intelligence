// News Digest Constants - Frontend mirror of backend constants
// Options for News Digest workflow customization

export interface NewsFocusArea {
  id: string;
  name: string;
  description: string;
}

export interface TimePeriod {
  id: string;
  label: string;
  days: number;
}

export interface OutputStyle {
  id: string;
  label: string;
  description: string;
}

// News focus areas - multi-select topics to prioritize
export const NEWS_FOCUS_AREAS: NewsFocusArea[] = [
  { id: 'technology', name: 'Technology', description: 'Product launches, innovations, R&D' },
  { id: 'financials', name: 'Financials', description: 'Earnings, funding, investments' },
  { id: 'leadership', name: 'Leadership', description: 'Executive changes, board updates' },
  { id: 'ma-activity', name: 'M&A Activity', description: 'Mergers, acquisitions, partnerships' },
  { id: 'market-expansion', name: 'Market Expansion', description: 'New markets, geographic growth' },
  { id: 'sustainability', name: 'Sustainability', description: 'ESG, environmental initiatives' },
];

// Time periods - single-select for news recency
export const TIME_PERIODS: TimePeriod[] = [
  { id: 'last-week', label: 'Last 7 Days', days: 7 },
  { id: 'last-month', label: 'Last 30 Days', days: 30 },
  { id: 'last-quarter', label: 'Last 90 Days', days: 90 },
];

// Output styles - single-select for content format
export const OUTPUT_STYLES: OutputStyle[] = [
  { id: 'executive-brief', label: 'Executive Brief', description: 'Bullet points, scannable' },
  { id: 'narrative', label: 'Narrative', description: 'Flowing prose, storytelling' },
  { id: 'podcast-ready', label: 'Podcast Ready', description: 'Conversational, audio-friendly' },
];

// Default values
export const DEFAULT_TIME_PERIOD = 'last-month';
export const DEFAULT_OUTPUT_STYLE = 'executive-brief';
