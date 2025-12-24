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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import logoMaicon from "@/assets/logo-maicon.jpg";

const menuItems = [
  { title: "Dashboard", icon: Home, path: "/dashboard" },
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
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-sidebar border-r border-sidebar-border sidebar-transition",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex h-32 items-center justify-center border-b border-sidebar-border px-2">
        <img 
          src={logoMaicon} 
          alt="Maicon Concept" 
          className={cn(
            "object-contain transition-all",
            collapsed ? "h-12 w-12" : "h-28 max-w-[250px]"
          )}
        />
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-2 mt-2">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground"
              )}
            >
              <item.icon className={cn("h-5 w-5 shrink-0", isActive && "text-primary")} />
              {!collapsed && <span>{item.title}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* Collapse Toggle */}
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
    </aside>
  );
}
