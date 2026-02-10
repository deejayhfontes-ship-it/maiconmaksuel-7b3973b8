/**
 * Kiosk Layout - Modern Premium Client-Facing Display
 * 
 * Clean, minimal layout for client kiosk:
 * - Uses configured theme from settings
 * - Shows minimal controls on touch
 * - Offline indicator when disconnected
 */

import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useLastRoute } from "@/hooks/useLastRoute";
import { useKioskSettings } from "@/hooks/useKioskSettings";
import { useKioskFullscreen } from "@/hooks/useKioskFullscreen";
import { usePinAuth } from "@/contexts/PinAuthContext";
import { useSalonSettings } from "@/contexts/SalonSettingsContext";
import { useEffect, useState, useRef } from "react";
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
  const { appearance } = useSalonSettings();
  const { isFullscreen, isSupported, isFailed, requestFullscreen, toggleFullscreen } = useKioskFullscreen();
  const [showFullscreenPrompt, setShowFullscreenPrompt] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  useLastRoute();

  // Apply kiosk theme - respects kiosk-specific setting OR inherits from system
  useEffect(() => {
    const root = document.documentElement;
    
    // If kiosk has explicit theme, use it; otherwise inherit from system appearance
    if (settings.tema_kiosk === 'dark') {
      root.classList.add('dark');
    } else if (settings.tema_kiosk === 'light') {
      root.classList.remove('dark');
    }
    // If 'light' (default), keep whatever the system theme is
    
  }, [settings.tema_kiosk, appearance?.tema]);

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
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 5000);
  };

  // Cleanup timeout
  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, []);

  const isHome = location.pathname === '/kiosk';

  // Determine background style - default to clean gradient for light theme
  const getBackgroundStyle = (): React.CSSProperties => {
    // If explicit background is set, use it
    if (settings.fundo_tipo === 'color' && settings.fundo_valor) {
      return { backgroundColor: settings.fundo_valor };
    }
    if (settings.fundo_tipo === 'gradient' && settings.fundo_valor) {
      return { background: settings.fundo_valor };
    }
    if (settings.fundo_tipo === 'image' && settings.fundo_valor) {
      return {
        backgroundImage: `url(${settings.fundo_valor})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      };
    }
    // Default: clean light gradient background
    return {};
  };

  return (
    <div 
      className={cn(
        "min-h-screen flex flex-col",
        settings.tipografia_grande && "text-lg",
        // Default modern light background when no custom background is set
        !settings.fundo_valor && "bg-gradient-to-br from-white via-gray-50 to-white"
      )}
      style={getBackgroundStyle()}
      onClick={handleShowControls}
    >
      {/* Fullscreen Prompt Modal - Modern design */}
      {showFullscreenPrompt && isSupported && !isFailed && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[100] pointer-events-auto">
          <div className="bg-white rounded-3xl p-8 max-w-sm mx-4 shadow-2xl border border-gray-100">
            <div className="flex items-start gap-4 mb-6">
              <div className="p-3 rounded-2xl bg-primary/10">
                <Maximize2 className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-gray-900 text-lg">Modo Fullscreen</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Para a melhor experiência no kiosk, recomendamos ativar o modo tela cheia.
                </p>
              </div>
              <button
                onClick={handleDismissFullscreenPrompt}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>
            <Button
              onClick={handleFullscreenRequest}
              className="w-full gap-2 h-12 rounded-xl text-base font-semibold"
            >
              <Maximize2 className="h-5 w-5" />
              Ativar Fullscreen
            </Button>
            <p className="text-xs text-gray-400 mt-4 text-center">
              Pressione ESC para sair do fullscreen a qualquer momento.
            </p>
          </div>
        </div>
      )}

      {/* Minimal Controls - Floating pill design */}
      {showControls && (
        <div 
          className="fixed top-6 right-6 z-50 animate-fade-in"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-2 p-2 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-gray-100">
            {/* Home Button - Only show if not on home */}
            {!isHome && (
              <Button
                variant="ghost"
                size={settings.alvos_touch_grandes ? "lg" : "default"}
                onClick={() => navigate('/kiosk')}
                className={cn(
                  "rounded-xl hover:bg-gray-100",
                  settings.alvos_touch_grandes && "h-14 w-14"
                )}
              >
                <Home className="h-5 w-5 text-gray-600" />
              </Button>
            )}

            {/* Fullscreen Toggle */}
            {isSupported && (
              <Button
                variant="ghost"
                size={settings.alvos_touch_grandes ? "lg" : "default"}
                onClick={toggleFullscreen}
                className={cn(
                  "rounded-xl hover:bg-gray-100",
                  settings.alvos_touch_grandes && "h-14 w-14"
                )}
              >
                {isFullscreen ? (
                  <Minimize2 className="h-5 w-5 text-gray-600" />
                ) : (
                  <Maximize2 className="h-5 w-5 text-gray-600" />
                )}
              </Button>
            )}

            {/* Logout */}
            <Button
              variant="ghost"
              size={settings.alvos_touch_grandes ? "lg" : "default"}
              onClick={handleLogout}
              className={cn(
                "rounded-xl hover:bg-red-50 text-gray-400 hover:text-red-500",
                settings.alvos_touch_grandes && "h-14 w-14"
              )}
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      )}

      {/* Main content - Full screen */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Offline Overlay */}
      <KioskOfflineOverlay largeTouch={settings.alvos_touch_grandes} />

      {/* Fade in animation */}
      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fade-in {
          animation: fade-in 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
