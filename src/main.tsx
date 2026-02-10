import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { installGlobalErrorHandlers } from "./lib/globalErrorHandler";

// Install global error handlers to capture unhandled errors
installGlobalErrorHandlers();

// Register Service Worker for offline support (production only)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        console.log('[App] Service Worker registrado, scope:', reg.scope);
        
        // Check for updates periodically
        setInterval(() => reg.update(), 60 * 60 * 1000); // every hour
      })
      .catch((err) => {
        console.warn('[App] Service Worker falhou:', err);
      });
  });
}

createRoot(document.getElementById("root")!).render(<App />);
