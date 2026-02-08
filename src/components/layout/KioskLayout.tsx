/**
 * Kiosk Layout - Minimal client-facing display
 * 
 * Removed all admin/cash features:
 * - No navigation bar for cash/agenda
 * - Only shows: home (idle/comanda), ponto
 * - Clean, distraction-free interface
 */

import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useKioskSettings } from "@/hooks/useKioskSettings";
import { useKioskFullscreen } from "@/hooks/useKioskFullscreen";
import { usePinAuth } from "@/contexts/PinAuthContext";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { 
  LogOut,
  Maximize2,
  Minimize2,
  Home,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { KioskOfflineOverlay } from "@/components/kiosk/KioskOfflineOverlay";

export default function KioskLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = usePinAuth();
  const { settings } = useKioskSettings();
  const { isFullscreen, isSupported, isFailed, requestFullscreen, toggleFullscreen } = useKioskFullscreen();
  const [showFullscreenPrompt, setShowFullscreenPrompt] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const controlsTimeoutRef = useState<NodeJS.Timeout | null>(null);

  // Apply kiosk theme
  useEffect(() => {
    if (settings.tema_kiosk === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.tema_kiosk]);

  // Handle fullscreen based on setting
  useEffect(() => {
    if (settings.forcar_fullscreen && isSupported && !isFullscreen && !isFailed) {
      setShowFullscreenPrompt(true);
    }
  }, [settings.forcar_fullscreen, isSupported, isFullscreen, isFailed]);

  // Handle fullscreen prompt action
  const handleFullscreenRequest = async () => {
    const success = await requestFullscreen();
    if (success) {
      setShowFullscreenPrompt(false);
    }
  };

  const handleDismissFullscreenPrompt = () => {
    setShowFullscreenPrompt(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Show controls briefly on touch/click, then hide
  const handleShowControls = () => {
    setShowControls(true);
    if (controlsTimeoutRef[0]) {
      clearTimeout(controlsTimeoutRef[0]);
    }
    const timeout = setTimeout(() => {
      setShowControls(false);
    }, 5000);
    controlsTimeoutRef[1](timeout);
  };

  const isHome = location.pathname === '/kiosk';

  // Determine background style
  const getBackgroundStyle = () => {
    if (settings.fundo_tipo === 'color') {
      return { backgroundColor: settings.fundo_valor };
    }
    if (settings.fundo_tipo === 'gradient') {
      return { background: settings.fundo_valor };
    }
    if (settings.fundo_tipo === 'image') {
      return {
        backgroundImage: `url(${settings.fundo_valor})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      };
    }
    return {};
  };

  return (
    <div 
      className={cn(
        "min-h-screen flex flex-col bg-background",
        settings.tipografia_grande && "text-lg"
      )}
      style={getBackgroundStyle()}
      onClick={handleShowControls}
    >
      {/* Fullscreen Prompt Modal */}
      {showFullscreenPrompt && isSupported && !isFailed && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] pointer-events-auto">
          <div className="bg-background border border-primary rounded-lg p-6 max-w-sm mx-4 shadow-2xl">
            <div className="flex items-start gap-3 mb-4">
              <Maximize2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-foreground">Modo Fullscreen</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Para melhor experiência no kiosk, ative o modo fullscreen.
                </p>
              </div>
              <button
                onClick={handleDismissFullscreenPrompt}
                className="ml-auto text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <Button
              onClick={handleFullscreenRequest}
              className="w-full gap-2"
            >
              <Maximize2 className="h-4 w-4" />
              Ativar Fullscreen
            </Button>
            <p className="text-xs text-muted-foreground mt-3 text-center">
              Pressione ESC para sair do fullscreen a qualquer momento.
            </p>
          </div>
        </div>
      )}

      {/* Minimal Controls - Only visible on touch/click */}
      {showControls && (
        <div 
          className="fixed top-4 right-4 z-50 flex items-center gap-2 animate-fade-in"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Home Button - Only show if not on home */}
          {!isHome && (
            <Button
              variant="ghost"
              size={settings.alvos_touch_grandes ? "lg" : "default"}
              onClick={() => navigate('/kiosk')}
              className={cn(
                "bg-background/80 backdrop-blur-sm shadow-lg",
                settings.alvos_touch_grandes && "h-14 px-6"
              )}
            >
              <Home className="h-5 w-5" />
            </Button>
          )}

          {/* Fullscreen Toggle */}
          {isSupported && (
            <Button
              variant="ghost"
              size={settings.alvos_touch_grandes ? "lg" : "default"}
              onClick={toggleFullscreen}
              className={cn(
                "bg-background/80 backdrop-blur-sm shadow-lg",
                settings.alvos_touch_grandes && "h-14 px-6"
              )}
            >
              {isFullscreen ? (
                <Minimize2 className="h-5 w-5" />
              ) : (
                <Maximize2 className="h-5 w-5" />
              )}
            </Button>
          )}

          {/* Logout */}
          <Button
            variant="ghost"
            size={settings.alvos_touch_grandes ? "lg" : "default"}
            onClick={handleLogout}
            className={cn(
              "bg-background/80 backdrop-blur-sm shadow-lg text-muted-foreground",
              settings.alvos_touch_grandes && "h-14 px-6"
            )}
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      )}

      {/* Main content - Full screen */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Offline Overlay */}
      <KioskOfflineOverlay largeTouch={settings.alvos_touch_grandes} />
    </div>
  );
}
