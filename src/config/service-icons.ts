/** Icons a service may use (Lucide names). Validated server-side against this list. */
export const serviceIcons = [
  "hard-hat",
  "building-2",
  "route",
  "hammer",
  "paint-roller",
  "clipboard-check",
  "ruler",
  "drafting-compass",
  "truck",
  "factory",
  "warehouse",
  "landmark",
  "zap",
  "droplets",
  "trees",
] as const;

export type ServiceIconName = (typeof serviceIcons)[number];
