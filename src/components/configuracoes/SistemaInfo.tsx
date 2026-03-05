/**
 * System Information Component
 */

import { useSystemSettings } from '@/hooks/useSystemSettings';
import { usePinAuth } from '@/contexts/PinAuthContext';
import { useOffline } from '@/contexts/OfflineContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  Info, 
  Monitor, 
  Globe, 
  Cloud, 
  CloudOff, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw,
  LogOut,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { isElectron } from '@/lib/platform';

export default function SistemaInfo() {
  const { settings, isOnline, syncStatus, isLoading } = useSystemSettings();
  const { session, logout } = usePinAuth();
  const offline = useOffline();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const getSyncStatusBadge = () => {
    switch (syncStatus) {
      case 'synced':
        return (
          <Badge variant="success" className="gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Sincronizado
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="warning" className="gap-1">
            <RefreshCw className="h-3 w-3 animate-spin" />
            Pendente
          </Badge>
        );
      case 'error':
        return (
          <Badge variant="destructive" className="gap-1">
            <AlertCircle className="h-3 w-3" />
            Erro
          </Badge>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* System Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Info className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Informações do Sistema</CardTitle>
              <CardDescription>
                Detalhes sobre a versão e ambiente
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">Versão</p>
              <p className="font-semibold">{settings.versao_atual}</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">Ambiente</p>
              <Badge variant={settings.ambiente === 'production' ? 'success' : 'warning'}>
                {settings.ambiente === 'production' ? 'Produção' : 'Desenvolvimento'}
              </Badge>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">Plataforma</p>
              <div className="flex items-center gap-2">
                <Monitor className="h-4 w-4" />
                <span>{isElectron() ? 'Desktop (Electron)' : 'Web (Navegador)'}</span>
              </div>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">Última Atualização</p>
              <p>
                {settings.updated_at
                  ? format(new Date(settings.updated_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
                  : '-'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Connection Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${isOnline ? 'bg-success/10' : 'bg-destructive/10'}`}>
              {isOnline ? (
                <Cloud className="h-5 w-5 text-success" />
              ) : (
                <CloudOff className="h-5 w-5 text-destructive" />
              )}
            </div>
            <div>
              <CardTitle>Status de Conexão</CardTitle>
              <CardDescription>
                Conectividade com o servidor
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
            <div className="flex items-center gap-3">
              <Globe className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Internet</p>
                <p className="text-sm text-muted-foreground">Conexão de rede</p>
              </div>
            </div>
            <Badge variant={isOnline ? 'success' : 'destructive'}>
              {isOnline ? 'Online' : 'Offline'}
            </Badge>
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
            <div className="flex items-center gap-3">
              <Cloud className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Sincronização</p>
                <p className="text-sm text-muted-foreground">Dados locais vs servidor</p>
              </div>
            </div>
            {getSyncStatusBadge()}
          </div>

          {!isOnline && (
            <div className="p-4 rounded-lg bg-warning/10 border border-warning/20">
              <p className="text-sm text-warning-foreground">
                O sistema está funcionando offline. As alterações serão sincronizadas quando a conexão for restabelecida.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Session Info */}
      <Card>
        <CardHeader>
          <CardTitle>Sessão Atual</CardTitle>
          <CardDescription>
            Informações sobre o acesso atual
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {session && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">Usuário</p>
                <p className="font-semibold">{session.nome}</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">Nível de Acesso</p>
                <Badge className="capitalize">{session.role}</Badge>
              </div>
              <div className="p-4 rounded-lg bg-muted/50 sm:col-span-2">
                <p className="text-sm text-muted-foreground">Login em</p>
                <p>
                  {format(new Date(session.loginTime), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
              </div>
            </div>
          )}

          <Separator />

          <Button variant="destructive" onClick={handleLogout} className="w-full">
            <LogOut className="mr-2 h-4 w-4" />
            Sair do Sistema
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
