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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useSidebarContext } from "./MainLayout";
import logoMaicon from "@/assets/logo.svg";
import { useEffect, useState } from "react";

const menuItems = [
  { title: "Início", icon: Home, path: "/dashboard" },
  { title: "Clientes", icon: Users, path: "/clientes" },
  { title: "Profissionais", icon: UserCheck, path: "/profissionais" },
  { title: "Serviços", icon: Scissors, path: "/servicos" },
  { title: "Produtos", icon: Package, path: "/produtos" },
  { title: "Agenda", icon: Calendar, path: "/agenda" },
  { title: "Atendimentos", icon: ClipboardList, path: "/atendimentos" },
  { title: "Caixa", icon: DollarSign, path: "/caixa" },
  { title: "Financeiro", icon: TrendingUp, path: "/financeiro" },
  { title: "Relatórios", icon: BarChart3, path: "/relatorios" },
];

export function AppSidebar() {
  const { collapsed, setCollapsed, mobileOpen, setMobileOpen } = useSidebarContext();
  const location = useLocation();
  const [isMobile, setIsMobile] = useState(false);

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
  const isVisible = isMobile ? mobileOpen : true;

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-50 h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300 ease-in-out custom-scrollbar overflow-y-auto",
        sidebarWidth,
        isMobile && !mobileOpen && "-translate-x-full",
        isMobile && mobileOpen && "translate-x-0 animate-slide-in-left"
      )}
    >
      {/* Logo */}
      <div className={cn(
        "flex items-center justify-between border-b border-sidebar-border px-3 transition-all duration-300",
        collapsed ? "h-16" : "h-32 lg:h-48"
      )}>
        <img 
          src={logoMaicon} 
          alt="Maicon Concept" 
          className={cn(
            "object-contain transition-all duration-300 dark:brightness-0 dark:invert",
            collapsed ? "h-10 w-10" : "h-24 lg:h-40 max-w-[200px]"
          )}
        />
        {isMobile && mobileOpen && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileOpen(false)}
            className="lg:hidden"
          >
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-2 mt-2">
        {menuItems.map((item, index) => {
          const isActive = location.pathname === item.path;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              style={{ animationDelay: `${index * 30}ms` }}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 animate-fade-in",
                "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:translate-x-1",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                  : "text-sidebar-foreground"
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
        <div className="absolute bottom-4 left-0 right-0 px-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCollapsed(!collapsed)}
            className="w-full justify-center text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
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
  );
}