import { NavLink, useLocation } from "react-router-dom";
import {
  Home,
  Users,
  UserCheck,
  Scissors,
  Package,
  Calendar,
  ClipboardList,
  DollarSign,
  TrendingUp,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  X,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useSidebarContext } from "./MainLayout";
import { useAuth } from "@/contexts/AuthContext";
import logoMaicon from "@/assets/logo.svg";
import { useEffect, useState } from "react";

const menuItems = [
  { title: "Início", icon: Home, path: "/dashboard" },
  { title: "Agenda", icon: Calendar, path: "/agenda" },
  { title: "Atendimentos", icon: ClipboardList, path: "/atendimentos" },
  { title: "Serviços", icon: Scissors, path: "/servicos" },
  { title: "Profissionais", icon: UserCheck, path: "/profissionais" },
  { title: "Produtos", icon: Package, path: "/produtos" },
  { title: "Clientes", icon: Users, path: "/clientes" },
  { title: "Caixa", icon: DollarSign, path: "/caixa" },
  { title: "Financeiro", icon: TrendingUp, path: "/financeiro" },
  { title: "Relatórios", icon: BarChart3, path: "/relatorios" },
];

const adminItems = [
  { title: "Usuários", icon: ShieldCheck, path: "/usuarios" },
];

export function AppSidebar() {
  const { collapsed, setCollapsed, mobileOpen, setMobileOpen } = useSidebarContext();
  const { role } = useAuth();
  const location = useLocation();
  const [isMobile, setIsMobile] = useState(false);
  
  const allMenuItems = role === "admin" 
    ? [...menuItems, ...adminItems] 
    : menuItems;

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Close mobile sidebar on route change
  useEffect(() => {
    if (mobileOpen && isMobile) {
      setMobileOpen(false);
    }
  }, [location.pathname]);

  const sidebarWidth = collapsed ? "w-16" : "w-64";

  return (
    <>
      {/* Mobile Overlay */}
      {isMobile && mobileOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed left-0 top-0 z-50 h-screen transition-all duration-300 ease-ios custom-scrollbar overflow-y-auto",
          "ios-sidebar",
          sidebarWidth,
          isMobile && !mobileOpen && "-translate-x-full",
          isMobile && mobileOpen && "translate-x-0 animate-slide-in-left"
        )}
      >
        {/* Logo com efeito gradiente Apple */}
        <div className={cn(
          "flex items-center justify-center px-4 transition-all duration-300 relative",
          collapsed ? "h-16" : "h-36 lg:h-52"
        )}>
          <div className="relative flex items-center justify-center w-full">
            <img 
              src={logoMaicon} 
              alt="Maicon Concept" 
              className={cn(
                "object-contain transition-all duration-300",
                "dark:brightness-0 dark:invert",
                "[mask-image:linear-gradient(to_bottom,black_60%,transparent_100%)]",
                "[-webkit-mask-image:linear-gradient(to_bottom,black_60%,transparent_100%)]",
                collapsed ? "h-10 w-10" : "h-28 lg:h-44 w-auto max-w-[220px]"
              )}
            />
          </div>
          {isMobile && mobileOpen && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileOpen(false)}
              className="lg:hidden absolute top-3 right-3"
            >
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-3 mt-2">
          {allMenuItems.map((item, index) => {
            const isActive = location.pathname === item.path;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                style={{ animationDelay: `${index * 30}ms` }}
                className={cn(
                  "flex items-center gap-3 rounded-ios-lg px-3 py-2.5 text-[15px] font-medium transition-all duration-200 ease-ios animate-fade-in",
                  "hover:translate-x-1",
                  isActive
                    ? "ios-nav-item-active"
                    : "ios-nav-item text-muted-foreground hover:text-foreground"
                )}
              >
                <item.icon className={cn(
                  "h-5 w-5 shrink-0 transition-colors",
                  isActive && "text-primary"
                )} />
                {!collapsed && (
                  <span className="truncate">{item.title}</span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Collapse Toggle - Desktop only */}
        {!isMobile && (
          <div className="absolute bottom-4 left-0 right-0 px-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCollapsed(!collapsed)}
              className="w-full justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/80 rounded-ios-lg"
            >
              {collapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <>
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  <span>Recolher</span>
                </>
              )}
            </Button>
          </div>
        )}
      </aside>
    </>
  );
}
