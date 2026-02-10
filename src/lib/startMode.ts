/**
 * Start Mode & Last Route Helpers
 * Handles deep linking (?mode=kiosk), last route persistence,
 * and start route resolution for both web and desktop.
 */

const LAST_ROUTE_ADMIN_KEY = "lastRouteAdmin";
const LAST_ROUTE_KIOSK_KEY = "lastRouteKiosk";
const REMEMBER_ROUTE_KEY = "rememberLastRoute";

/** Check if "remember last route" is enabled */
export function isRememberRouteEnabled(): boolean {
  return localStorage.getItem(REMEMBER_ROUTE_KEY) === "true";
}

/** Toggle "remember last route" */
export function setRememberRouteEnabled(enabled: boolean) {
  localStorage.setItem(REMEMBER_ROUTE_KEY, enabled ? "true" : "false");
}

/** Save the current route for a given context */
export function saveLastRoute(context: "admin" | "kiosk", route: string) {
  const key = context === "kiosk" ? LAST_ROUTE_KIOSK_KEY : LAST_ROUTE_ADMIN_KEY;
  localStorage.setItem(key, JSON.stringify({ route, timestamp: Date.now() }));
}

/** Get saved last route for a context */
export function getLastRoute(context: "admin" | "kiosk"): string | null {
  const key = context === "kiosk" ? LAST_ROUTE_KIOSK_KEY : LAST_ROUTE_ADMIN_KEY;
  try {
    const data = JSON.parse(localStorage.getItem(key) || "null");
    if (data?.route) return data.route;
  } catch {}
  return null;
}

/**
 * Determine the start mode from URL params.
 * Checks: ?mode=kiosk | ?mode=admin | hash contains /kiosk
 */
export function getStartMode(): "kiosk" | "admin" | null {
  try {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get("mode");
    if (mode === "kiosk") return "kiosk";
    if (mode === "admin") return "admin";

    // Also check hash for desktop wrapper
    if (window.location.hash.includes("/kiosk")) return "kiosk";
  } catch {}
  return null;
}

/**
 * Get the initial route the app should navigate to.
 * Priority: deep link mode > remembered route > default
 */
export function getStartRoute(defaultRoute: string = "/login"): string {
  const mode = getStartMode();

  if (mode === "kiosk") return "/kiosk";
  if (mode === "admin") return "/dashboard";

  if (isRememberRouteEnabled()) {
    // Try to restore last route based on context
    const lastAdmin = getLastRoute("admin");
    if (lastAdmin) return lastAdmin;
  }

  return defaultRoute;
}
