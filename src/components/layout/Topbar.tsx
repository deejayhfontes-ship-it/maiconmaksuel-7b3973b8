import { Search, Bell, Moon, Sun, Menu, User, Settings, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "@/components/ThemeProvider";
import { useSidebarContext } from "./MainLayout";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export function Topbar() {
  const { resolvedTheme, setTheme } = useTheme();
  const { collapsed, mobileOpen, setMobileOpen } = useSidebarContext();
  const { profile, role, signOut } = useAuth();
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  const handleSignOut = async () => {
    await signOut();
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

  const getRoleBadge = (role: string | null) => {
    switch (role) {
      case "admin":
        return <Badge variant="default" className="text-xs">Admin</Badge>;
      case "gerente":
        return <Badge variant="secondary" className="text-xs">Gerente</Badge>;
      case "operador":
        return <Badge variant="outline" className="text-xs">Operador</Badge>;
      default:
        return null;
    }
  };

  return (
    <header 
      className={cn(
        "fixed top-0 right-0 z-30 h-16 bg-card border-b border-border transition-all duration-300 theme-transition",
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

        {/* Search */}
        <div className={cn("flex-1 max-w-md", isMobile && "mx-2")}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar clientes, serviços..."
              className="pl-10 bg-secondary border-0 focus-visible:ring-primary"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 md:gap-2">
          {/* Notifications */}
          <div className="relative inline-block">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-destructive text-destructive-foreground text-[11px] font-semibold rounded-full border-2 border-card">
                3
              </span>
            </Button>
          </div>

          {/* Theme Toggle */}
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={toggleTheme}
            className="transition-transform duration-200 hover:rotate-12"
          >
            {resolvedTheme === "dark" ? (
              <Sun className="h-5 w-5 text-warning" />
            ) : (
              <Moon className="h-5 w-5 text-muted-foreground" />
            )}
          </Button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 px-2">
                <Avatar className="h-8 w-8 transition-transform duration-200 hover:scale-105">
                  {profile?.foto_url && (
                    <AvatarImage src={profile.foto_url} alt={profile.nome} />
                  )}
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                    {profile?.nome ? getInitials(profile.nome) : "U"}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium hidden md:inline">
                  {profile?.nome?.split(" ")[0] || "Usuário"}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 animate-scale-in">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">{profile?.nome || "Usuário"}</p>
                  <p className="text-xs text-muted-foreground">{profile?.email}</p>
                  {role && <div className="pt-1">{getRoleBadge(role)}</div>}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer">
                <User className="mr-2 h-4 w-4" />
                Perfil
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer">
                <Settings className="mr-2 h-4 w-4" />
                Configurações
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="text-destructive cursor-pointer"
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
