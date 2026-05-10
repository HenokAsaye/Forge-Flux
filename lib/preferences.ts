export const PREFS_STORAGE_KEY = "forgeflux:coach:prefs:v1";

export const PERSONAS = [
  {
    id: "supportive",
    label: "Supportive Mentor",
    blurb: "Warm encouragement and practical next steps.",
  },
  {
    id: "blunt",
    label: "Brutally Honest Tech Lead",
    blurb: "Direct feedback; no fluff.",
  },
  {
    id: "data",
    label: "The Data Scientist",
    blurb: "Patterns, streaks, and what the rhythm implies.",
  },
] as const;

export type PersonaId = (typeof PERSONAS)[number]["id"];

export type RoleChoice = "student" | "pro" | "hobby";

export type CoachPrefs = {
  goal: string;
  role: RoleChoice;
  persona: PersonaId;
  setupComplete: boolean;
};

export const defaultPrefs = (): CoachPrefs => ({
  goal: "",
  role: "student",
  persona: "supportive",
  setupComplete: false,
});

export function loadPrefs(): CoachPrefs {
  if (typeof window === "undefined") return defaultPrefs();
  try {
    const raw = window.localStorage.getItem(PREFS_STORAGE_KEY);
    if (!raw) return defaultPrefs();
    const parsed = JSON.parse(raw) as Partial<CoachPrefs>;
    return {
      ...defaultPrefs(),
      ...parsed,
    };
  } catch {
    return defaultPrefs();
  }
}

export function savePrefs(prefs: CoachPrefs) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(prefs));
}
