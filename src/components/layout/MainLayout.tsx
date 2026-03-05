import { useState, useEffect, createContext, useContext, useCallback } from "react";
import { Outlet } from "react-router-dom";
import { useLastRoute } from "@/hooks/useLastRoute";
import { AppSidebar } from "./AppSidebar";
import { Topbar } from "./Topbar";
import { NotificationPermissionBanner } from "./NotificationPermissionBanner";
import { cn } from "@/lib/utils";
import { useBrowserNotifications } from "@/hooks/useBrowserNotifications";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { KeyboardShortcutsHelp } from "@/components/KeyboardShortcutsHelp";
import { GlobalSearch } from "@/components/GlobalSearch";
import { KioskModeBadge } from "@/components/KioskModeBadge";
import { WhatsAppFloatingButtonZendesk } from "@/components/dashboard/WhatsAppDrawer";

interface SidebarContextType {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  isSearchOpen: boolean;
  setIsSearchOpen: (open: boolean) => void;
}

export const SidebarContext = createContext<SidebarContextType>({
  collapsed: false,
  setCollapsed: () => {},
  mobileOpen: false,
  setMobileOpen: () => {},
  isSearchOpen: false,
  setIsSearchOpen: () => {},
});

export const useSidebarContext = () => useContext(SidebarContext);

export function MainLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Keyboard shortcuts
  const { isHelpOpen, setIsHelpOpen, isFullscreen, toggleFullscreen } = useKeyboardShortcuts({
    onOpenSearch: () => setIsSearchOpen(true),
  });

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
      if (window.innerWidth >= 1024) {
        setMobileOpen(false);
      }
    };
    
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Close mobile sidebar when route changes
  useEffect(() => {
    if (mobileOpen) {
      setMobileOpen(false);
    }
  }, []);

  // Inicializar hook de notificações do navegador
  useBrowserNotifications();
  useLastRoute();

  return (
    <SidebarContext.Provider value={{ collapsed, setCollapsed, mobileOpen, setMobileOpen, isSearchOpen, setIsSearchOpen }}>
      <div className="min-h-screen bg-background theme-transition">
        {/* Mobile Overlay */}
        {mobileOpen && isMobile && (
          <div 
            className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm animate-fade-in lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}
        
        <AppSidebar />
        <Topbar />
        
        <main 
          className={cn(
            "min-h-screen pt-16 transition-all duration-300",
            isMobile ? "ml-0" : (collapsed ? "ml-16" : "ml-64")
          )}
        >
          <div className="p-4 md:p-6 animate-fade-in">
            <Outlet />
          </div>
        </main>

        {/* Banner de permissão de notificações */}
        <NotificationPermissionBanner />

        {/* Global Search (Cmd+K) */}
        <GlobalSearch open={isSearchOpen} onClose={() => setIsSearchOpen(false)} />

        {/* Keyboard Shortcuts Help (Shift+?) */}
        <KeyboardShortcutsHelp open={isHelpOpen} onClose={() => setIsHelpOpen(false)} />

        {/* Kiosk Mode Badge */}
        <KioskModeBadge isFullscreen={isFullscreen} onToggle={toggleFullscreen} />

        {/* WhatsApp Floating Button - Zendesk Style */}
        <WhatsAppFloatingButtonZendesk />
      </div>
    </SidebarContext.Provider>
  );
}