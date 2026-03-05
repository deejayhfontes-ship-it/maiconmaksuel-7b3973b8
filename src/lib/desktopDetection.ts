/**
 * Desktop Wrapper Detection
 * Detects if the app is running inside a desktop wrapper (Electron, file://, webview)
 * to determine whether to use HashRouter instead of BrowserRouter.
 */

declare global {
  interface Window {
    __DESKTOP_WRAPPER__?: boolean;
  }
}

export function isDesktopWrapper(): boolean {
  // Explicit flag set by wrapper
  if (window.__DESKTOP_WRAPPER__ === true) return true;

  // Running from file:// protocol (no server)
  if (window.location.protocol === 'file:') return true;

  // Origin is "null" (common in file:// and some webviews)
  if (window.location.origin === 'null') return true;

  // Electron environment
  if (typeof window !== 'undefined' && (window as any).electron?.isElectron === true) return true;

  // Empty host (no server)
  if (!window.location.host || window.location.host === '') return true;

  return false;
}
