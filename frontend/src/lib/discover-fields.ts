/** Keep in sync with backend/lib/research-fields.ts DISCOVER_FIELDS */
export const DISCOVER_FIELDS = [
  "AI & Tech",
  "Education",
  "Healthcare",
  "Agriculture",
  "Economics",
] as const;

export type DiscoverField = (typeof DISCOVER_FIELDS)[number];
