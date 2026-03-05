/**
 * useLastRoute - Persists the current route to localStorage
 * so the app can restore it on restart.
 */
import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { saveLastRoute, isRememberRouteEnabled } from "@/lib/startMode";

export function useLastRoute() {
  const location = useLocation();

  useEffect(() => {
    if (!isRememberRouteEnabled()) return;

    const path = location.pathname;

    // Skip saving auth routes
    if (path === "/login" || path === "/cadastro" || path === "/recuperar-senha" || path === "/") return;

    const context = path.startsWith("/kiosk") ? "kiosk" : "admin";
    saveLastRoute(context, path);
  }, [location.pathname]);
}
