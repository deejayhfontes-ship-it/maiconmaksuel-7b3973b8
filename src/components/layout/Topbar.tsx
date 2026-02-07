import { Search, Moon, Sun, Menu, Settings, LogOut, Type, Plus, Command, Shield, Monitor, Tablet } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useTheme } from "@/components/ThemeProvider";
import { useSidebarContext } from "./MainLayout";
import { usePinAuth } from "@/contexts/PinAuthContext";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { NotificationsDropdown } from "./NotificationsDropdown";
import { OfflineIndicator } from "@/components/OfflineIndicator";

const fontSizes = [
  { label: "1x", root: "14px" },
  { label: "2x", root: "16px" },
  { label: "3x", root: "18px" },
];

export function Topbar() {
  const { resolvedTheme, setTheme } = useTheme();
  const { collapsed, mobileOpen, setMobileOpen, setIsSearchOpen } = useSidebarContext();
  const { session, logout } = usePinAuth();
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(false);
  const [fontSizeIndex, setFontSizeIndex] = useState(1);

  // Load saved font size on mount
  useEffect(() => {
    const saved = localStorage.getItem("app-font-size");
    if (saved) {
      const index = parseInt(saved, 10);
      if (index >= 0 && index < fontSizes.length) {
        setFontSizeIndex(index);
        document.documentElement.style.fontSize = fontSizes[index].root;
      }
    }
  }, []);

  const handleFontSizeChange = () => {
    const nextIndex = (fontSizeIndex + 1) % fontSizes.length;
    setFontSizeIndex(nextIndex);
    document.documentElement.style.fontSize = fontSizes[nextIndex].root;
    localStorage.setItem("app-font-size", nextIndex.toString());
  };

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  const handleSignOut = () => {
    logout();
    navigate("/login");
  };

  const getInitials = (nome: string) => {
    return nome
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  const getRoleIcon = (role: string | undefined) => {
    switch (role) {
      case "admin":
        return <Shield className="h-3 w-3" />;
      case "notebook":
        return <Monitor className="h-3 w-3" />;
      case "kiosk":
        return <Tablet className="h-3 w-3" />;
      default:
        return null;
    }
  };

  const getRoleBadge = (role: string | undefined) => {
    switch (role) {
      case "admin":
        return <Badge variant="default" className="text-xs gap-1">{getRoleIcon(role)} Admin</Badge>;
      case "notebook":
        return <Badge variant="secondary" className="text-xs gap-1">{getRoleIcon(role)} Notebook</Badge>;
      case "kiosk":
        return <Badge variant="outline" className="text-xs gap-1">{getRoleIcon(role)} Kiosk</Badge>;
      default:
        return null;
    }
  };

  return (
    <header 
      className={cn(
        "fixed top-0 right-0 z-30 h-16 transition-all duration-300 ease-ios",
        "ios-header",
        isMobile ? "left-0" : (collapsed ? "left-16" : "left-64")
      )}
    >
      <div className="flex h-full items-center justify-between px-4 md:px-6">
        {/* Mobile Menu Button */}
        {isMobile && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}

        {/* Search Button - Opens Global Search */}
        <div className={cn("flex-1 max-w-md", isMobile && "mx-2")}>
          <Button
            variant="outline"
            onClick={() => setIsSearchOpen(true)}
            className="w-full justify-start text-muted-foreground hover:text-foreground"
          >
            <Search className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Buscar clientes, serviços...</span>
            <span className="sm:hidden">Buscar...</span>
            <kbd className="pointer-events-none ml-auto hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-xs font-medium opacity-100 sm:flex">
              <Command className="h-3 w-3" />K
            </kbd>
          </Button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 md:gap-3">
          {/* Offline Status Indicator */}
          <OfflineIndicator />

          {/* Notifications */}
          <NotificationsDropdown />

          {/* Theme Toggle */}
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={toggleTheme}
            className="ios-icon-button transition-transform duration-200 hover:rotate-12"
          >
            {resolvedTheme === "dark" ? (
              <Sun className="h-5 w-5 text-warning" />
            ) : (
              <Moon className="h-5 w-5 text-muted-foreground" />
            )}
          </Button>

          {/* Font Size Toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleFontSizeChange}
                className="ios-icon-button relative"
              >
                <Type className="h-5 w-5 text-muted-foreground" />
                <Plus className="h-2.5 w-2.5 absolute -top-0.5 -right-0.5 text-primary" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Fonte: {fontSizes[fontSizeIndex].label}</p>
            </TooltipContent>
          </Tooltip>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 px-2 ios-icon-button">
                <Avatar className="h-8 w-8 ring-2 ring-primary/20 transition-transform duration-200 hover:scale-105">
                  <AvatarFallback className="ios-avatar-gradient text-primary-foreground text-sm font-semibold">
                    {session?.nome ? getInitials(session.nome) : "U"}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium hidden md:inline">
                  {session?.nome?.split(" ")[0] || "Usuário"}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 ios-dropdown">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-semibold">{session?.nome || "Usuário"}</p>
                  <p className="text-xs text-muted-foreground">{session?.descricao || 'Acesso via PIN'}</p>
                  {session?.role && <div className="pt-1">{getRoleBadge(session.role)}</div>}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {session?.role === 'admin' && (
                <>
                  <DropdownMenuItem 
                    className="cursor-pointer rounded-ios-sm"
                    onClick={() => navigate("/configuracoes")}
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    Configurações
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem 
                className="text-destructive cursor-pointer rounded-ios-sm"
                onClick={handleSignOut}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
