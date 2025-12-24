import { useState, useEffect, createContext, useContext } from "react";
import { Outlet } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { Topbar } from "./Topbar";
import { NotificationPermissionBanner } from "./NotificationPermissionBanner";
import { cn } from "@/lib/utils";
import { useBrowserNotifications } from "@/hooks/useBrowserNotifications";

interface SidebarContextType {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

export const SidebarContext = createContext<SidebarContextType>({
  collapsed: false,
  setCollapsed: () => {},
  mobileOpen: false,
  setMobileOpen: () => {},
});

export const useSidebarContext = () => useContext(SidebarContext);

export function MainLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

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

  return (
    <SidebarContext.Provider value={{ collapsed, setCollapsed, mobileOpen, setMobileOpen }}>
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
      </div>
    </SidebarContext.Provider>
  );
}