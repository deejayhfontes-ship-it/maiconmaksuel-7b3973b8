/**
 * Start Mode & Last Route Helpers
 * Handles deep linking (?mode=kiosk), last route persistence,
 * and start route resolution for both web and desktop.
 */
import { isDesktopWrapper } from "@/lib/desktopDetection";

const LAST_ROUTE_ADMIN_KEY = "lastRouteAdmin";
const LAST_ROUTE_KIOSK_KEY = "lastRouteKiosk";
const REMEMBER_ROUTE_KEY = "rememberLastRoute";
const KIOSK_DEVICE_ENABLED_KEY = "mm-kiosk-device-enabled";

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
 * Check if kiosk is enabled on this device (localStorage fallback for web).
 * On Electron, the real flag is in electron-store (checked at boot via hash).
 * This localStorage flag mirrors it for React-side logic.
 */
export function isKioskDeviceEnabled(): boolean {
  return localStorage.getItem(KIOSK_DEVICE_ENABLED_KEY) === "true";
}

export function setKioskDeviceEnabled(enabled: boolean) {
  localStorage.setItem(KIOSK_DEVICE_ENABLED_KEY, enabled ? "true" : "false");
}

/**
 * Get the initial route the app should navigate to.
 * Priority: deep link mode > kiosk device flag (desktop) > remembered route > default
 */
export function getStartRoute(defaultRoute: string = "/login"): string {
  const mode = getStartMode();

  if (mode === "kiosk") return "/kiosk";
  if (mode === "admin") return "/dashboard";

  // On desktop, do NOT auto-redirect to kiosk based on localStorage flag alone.
  // Kiosk route is controlled by Electron's startMode config + hash at boot.
  // This prevents the app from "trapping" in kiosk after a restart.

  if (isRememberRouteEnabled()) {
    const lastAdmin = getLastRoute("admin");
    // Never restore a kiosk route as "last admin route"
    if (lastAdmin && !lastAdmin.startsWith("/kiosk")) return lastAdmin;
  }

  return defaultRoute;
}
