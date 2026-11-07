/** Presentation-only navigation preference, not persisted business data. */
export const INTRO_SEEN_KEY = "agentpay-intro-seen";

export function shouldShowIntro(seen: string | null, directDashboard: boolean): boolean {
  return seen !== "yes" && !directDashboard;
}