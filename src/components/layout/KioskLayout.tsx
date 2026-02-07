/**
 * Kiosk Layout - A locked-down layout for kiosk mode
 */

import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useKioskSettings, KIOSK_ROUTES, type KioskRoutesEnabled } from "@/hooks/useKioskSettings";
import { useKioskFullscreen } from "@/hooks/useKioskFullscreen";
import { usePinAuth } from "@/contexts/PinAuthContext";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { 
  CreditCard, 
  Calendar, 
  Clock, 
  Monitor,
  LogOut,
  Maximize2,
  Minimize2,
  AlertCircle,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";

const kioskNavItems = [
  { key: 'kiosk_caixa', path: '/kiosk/caixa', label: 'Caixa', icon: CreditCard },
  { key: 'kiosk_agenda', path: '/kiosk/agenda', label: 'Agenda', icon: Calendar },
  { key: 'kiosk_ponto', path: '/kiosk/ponto', label: 'Ponto', icon: Clock },
  { key: 'kiosk_espelho', path: '/kiosk/espelho-cliente', label: 'Espelho', icon: Monitor },
];

export default function KioskLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = usePinAuth();
  const { settings, isRouteEnabled, updateRouteAccess } = useKioskSettings();
  const { isFullscreen, isSupported, isFailed, requestFullscreen, toggleFullscreen } = useKioskFullscreen();
  const [showNav, setShowNav] = useState(true);
  const [showFullscreenPrompt, setShowFullscreenPrompt] = useState(false);

  // Validate route access
  useEffect(() => {
    const currentPath = location.pathname;
    
    // Find which route key this path belongs to
    const routeEntry = Object.entries(KIOSK_ROUTES).find(([_, route]) => 
      currentPath === route.path || currentPath.startsWith(route.path + '/')
    );

    if (routeEntry) {
      const [routeKey] = routeEntry;
      
      // Check if route is enabled
      if (!isRouteEnabled(routeKey as keyof KioskRoutesEnabled)) {
        // Redirect to main kiosk page
        navigate('/kiosk', { replace: true });
        return;
      }

      // Update access timestamp
      updateRouteAccess(routeKey as keyof KioskRoutesEnabled);
    }
  }, [location.pathname, isRouteEnabled, navigate, updateRouteAccess]);

  // Apply kiosk theme
  useEffect(() => {
    if (settings.tema_kiosk === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.tema_kiosk]);

  // Handle fullscreen based on setting
  // Browser security requires user gesture, so we show prompt instead of auto-requesting
  useEffect(() => {
    if (settings.forcar_fullscreen && isSupported && !isFullscreen && !isFailed) {
      // Show prompt to user instead of forcing fullscreen
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

  const availableNavItems = kioskNavItems.filter(item => 
    isRouteEnabled(item.key as keyof KioskRoutesEnabled)
  );

  return (
    <div 
      className={cn(
        "min-h-screen flex flex-col",
        settings.tipografia_grande && "text-lg",
        settings.tema_kiosk === 'dark' ? 'bg-background' : 'bg-gray-50'
      )}
      style={{
        background: settings.fundo_tipo === 'color' 
          ? settings.fundo_valor 
          : settings.fundo_tipo === 'gradient'
          ? settings.fundo_valor
          : undefined,
        backgroundImage: settings.fundo_tipo === 'image' 
          ? `url(${settings.fundo_valor})` 
          : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Fullscreen Status Prompt - shown when fullscreen is required but not yet activated */}
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

      {/* Fullscreen Unavailable Warning - shown if fullscreen is required but not supported */}
      {settings.forcar_fullscreen && !isSupported && (
        <div className="fixed top-4 right-4 z-40 bg-amber-50 border border-amber-200 rounded-lg p-3 max-w-sm flex gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-900">
              Fullscreen não suportado neste navegador
            </p>
            <p className="text-xs text-amber-800 mt-1">
              O kiosk funcionará normalmente, mas sem modo fullscreen.
            </p>
          </div>
        </div>
      )}

      {/* Top navigation */}
      {showNav && (
        <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
          <div className="flex items-center justify-between p-2">
            {/* Logo */}
            <div className="flex items-center gap-3">
              {settings.logo_url ? (
                <img 
                  src={settings.logo_url} 
                  alt="Logo" 
                  className={cn(
                    "h-10 object-contain",
                    settings.logo_animacao === 'pulse' && 'animate-pulse',
                    settings.logo_animacao === 'fade' && 'animate-fade-in',
                  )}
                />
              ) : (
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Monitor className="h-5 w-5 text-primary" />
                </div>
              )}
            </div>

            {/* Navigation */}
            <nav className="flex items-center gap-2">
              {availableNavItems.map(({ key, path, label, icon: Icon }) => {
                const isActive = location.pathname === path || 
                  location.pathname.startsWith(path + '/');
                
                return (
                  <Button
                    key={key}
                    variant={isActive ? "default" : "ghost"}
                    size={settings.alvos_touch_grandes ? "lg" : "default"}
                    onClick={() => navigate(path)}
                    className={cn(
                      "flex items-center gap-2",
                      settings.alvos_touch_grandes && "h-14 px-6 text-lg"
                    )}
                  >
                    <Icon className={cn(
                      "h-5 w-5",
                      settings.alvos_touch_grandes && "h-6 w-6"
                    )} />
                    <span className="hidden sm:inline">{label}</span>
                  </Button>
                );
              })}

              {/* Fullscreen Toggle - only show if fullscreen is available */}
              {isSupported && (
                <Button
                  variant="ghost"
                  size={settings.alvos_touch_grandes ? "lg" : "default"}
                  onClick={toggleFullscreen}
                  title={isFullscreen ? "Sair do fullscreen (ESC)" : "Ativar fullscreen"}
                  className={cn(
                    "text-muted-foreground hover:text-foreground",
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

              <Button
                variant="ghost"
                size={settings.alvos_touch_grandes ? "lg" : "default"}
                onClick={handleLogout}
                className={cn(
                  "text-muted-foreground",
                  settings.alvos_touch_grandes && "h-14 px-6"
                )}
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </nav>
          </div>
        </header>
      )}

      {/* Main content */}
      <main className="flex-1 p-4">
        <Outlet />
      </main>
    </div>
  );
}
