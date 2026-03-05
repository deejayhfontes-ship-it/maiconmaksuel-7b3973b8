import { Navigate, useLocation } from 'react-router-dom';
import { usePinAuth } from '@/contexts/PinAuthContext';
import { Loader2, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEffect } from 'react';
import { toast } from 'sonner';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, loading, canAccessRoute, session, getDefaultRoute } = usePinAuth();
  const location = useLocation();

  // Handle colaborador_agenda redirect with toast
  useEffect(() => {
    if (session?.role === 'colaborador_agenda' && !canAccessRoute(location.pathname)) {
      toast.info("Acesso restrito: Agenda Colaboradores", {
        description: "Você tem permissão apenas para visualizar a agenda."
      });
    }
  }, [location.pathname, session, canAccessRoute]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthenticated) {
    // Save the attempted URL
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // For colaborador_agenda, always redirect to /agenda if trying to access other routes
  if (session?.role === 'colaborador_agenda' && !canAccessRoute(location.pathname)) {
    return <Navigate to="/agenda" replace />;
  }

  // Check if user has permission for this route
  if (!canAccessRoute(location.pathname)) {
    const roleLabel = session?.role === 'colaborador_agenda' ? 'Agenda Colaboradores' : session?.role;
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Acesso Negado</h1>
          <p className="text-muted-foreground mb-6">
            Seu perfil <span className="font-semibold text-foreground">({roleLabel})</span> não tem 
            permissão para acessar esta página.
          </p>
          <Button onClick={() => window.location.href = getDefaultRoute() || '/login'}>
            Voltar para {session?.role === 'admin' ? 'Dashboard' : session?.role === 'notebook' ? 'Agenda' : session?.role === 'kiosk' ? 'Kiosk' : session?.role === 'colaborador_agenda' ? 'Agenda' : 'Início'}
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
