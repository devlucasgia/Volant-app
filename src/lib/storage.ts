import { Entry, Settings } from "@/types";

const ENTRIES_KEY = "drivefin.entries.v1";
const SETTINGS_KEY = "drivefin.settings.v1";

export function loadEntries(): Entry[] {
  try {
    const raw = localStorage.getItem(ENTRIES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveEntries(entries: Entry[]) {
  localStorage.setItem(ENTRIES_KEY, JSON.stringify(entries));
}

const DEFAULT_SETTINGS: Settings = {
  dailyGoal: 250,
  maintenanceIntervalKm: 10000,
  lastMaintenanceKm: 0,
  theme: "dark",
};

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(s: Settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}
