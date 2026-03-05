/**
 * Layout for Colaborador Agenda role
 * Ultra-restricted, read-only view with simple header and logout
 * Mobile-first design
 */

import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { usePinAuth } from "@/contexts/PinAuthContext";
import { Button } from "@/components/ui/button";
import { LogOut, Calendar, Eye } from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";

export function ColaboradorLayout() {
  const { logout, session, canAccessRoute } = usePinAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect to /agenda if trying to access unauthorized routes
  useEffect(() => {
    if (session?.role === 'colaborador_agenda' && !canAccessRoute(location.pathname)) {
      toast.info("Acesso restrito: Agenda Colaboradores", {
        description: "Você tem permissão apenas para visualizar a agenda."
      });
      navigate('/agenda', { replace: true });
    }
  }, [location.pathname, session, canAccessRoute, navigate]);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Simple Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10">
              <Calendar className="h-4 w-4 text-purple-600" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold leading-none">
                Agenda Colaboradores
              </span>
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Eye className="h-3 w-3" />
                Somente leitura
              </span>
            </div>
          </div>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleLogout}
            className="h-8 gap-1.5"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Sair</span>
          </Button>
        </div>
      </header>

      {/* Main Content - Read Only Agenda */}
      <main className="flex-1 p-3 sm:p-4">
        <Outlet />
      </main>

      {/* Footer indicator */}
      <footer className="border-t py-2 px-4 text-center">
        <p className="text-[10px] text-muted-foreground">
          {session?.nome} • Visualização apenas
        </p>
      </footer>
    </div>
  );
}

export default ColaboradorLayout;
