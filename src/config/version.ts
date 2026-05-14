// Centralized app version metadata.
// Update here whenever a new release is published; everywhere else reads from this file.
//
// Convention:
// - patch (0.5.0 -> 0.5.1): small bug fixes
// - minor (0.5.x -> 0.6.0): UX improvements / visible refinements
// - major (0.x.x -> 1.0.0): official public launch / major modules

export const APP_VERSION = "0.5.0";
export type AppChannel = "beta" | "rc" | "stable";
export const APP_CHANNEL: AppChannel = "beta";

export const APP_VERSION_LABEL: string =
  APP_CHANNEL === "stable" ? `v${APP_VERSION}` : `${APP_CHANNEL} ${APP_VERSION}`;

export const APP_NAME = "Volant";
