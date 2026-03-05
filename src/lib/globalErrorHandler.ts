import { saveErrorLog } from "@/components/ErrorBoundary";

export function installGlobalErrorHandlers() {
  window.onerror = (message, source, lineno, colno, error) => {
    saveErrorLog({
      timestamp: new Date().toISOString(),
      route: window.location.href,
      message: `${message} (${source}:${lineno}:${colno})`,
      stack: error?.stack,
      type: "global",
    });
  };

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    saveErrorLog({
      timestamp: new Date().toISOString(),
      route: window.location.href,
      message: reason?.message || String(reason),
      stack: reason?.stack,
      type: "promise",
    });
  });
}
