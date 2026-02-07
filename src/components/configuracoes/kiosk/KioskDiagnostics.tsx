/**
 * Kiosk Status & Diagnostics Display
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useKioskSettings, KIOSK_ROUTES } from "@/hooks/useKioskSettings";
import { getDeviceModeSetting, getDeviceInfo } from "@/lib/deviceType";
import { 
  Activity, 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  Clock,
  Route,
  Monitor,
  Info,
  CheckCircle,
  AlertCircle,
  XCircle
} from "lucide-react";

export default function KioskDiagnostics() {
  const { 
    isOnline, 
    syncStatus, 
    settings,
    formatUptime,
  } = useKioskSettings();

  const deviceInfo = getDeviceInfo();
  const deviceMode = getDeviceModeSetting();
  const appVersion = '1.0.0'; // Should come from settings or package.json

  const getSyncStatusInfo = () => {
    switch (syncStatus) {
      case 'synced':
        return { icon: CheckCircle, color: 'text-green-500', label: 'Sincronizado', badge: 'default' as const };
      case 'pending':
        return { icon: AlertCircle, color: 'text-amber-500', label: 'Pendente', badge: 'secondary' as const };
      case 'error':
        return { icon: XCircle, color: 'text-destructive', label: 'Erro', badge: 'destructive' as const };
    }
  };

  const syncInfo = getSyncStatusInfo();
  const SyncIcon = syncInfo.icon;

  // Count active routes
  const activeRoutes = Object.entries(settings.rotas_habilitadas || {})
    .filter(([_, enabled]) => enabled)
    .length;
  const totalRoutes = Object.keys(KIOSK_ROUTES).length;

  const diagnosticItems = [
    {
      label: 'Status Online',
      value: isOnline ? 'Online' : 'Offline',
      icon: isOnline ? Wifi : WifiOff,
      iconColor: isOnline ? 'text-green-500' : 'text-destructive',
      badge: isOnline ? 'default' : 'destructive',
    },
    {
      label: 'Status de Sincronização',
      value: syncInfo.label,
      icon: SyncIcon,
      iconColor: syncInfo.color,
      badge: syncInfo.badge,
    },
    {
      label: 'Rotas Ativas',
      value: `${activeRoutes}/${totalRoutes}`,
      icon: Route,
      iconColor: 'text-primary',
      badge: activeRoutes === totalRoutes ? 'default' : 'secondary',
    },
    {
      label: 'Modo do Dispositivo',
      value: deviceMode.charAt(0).toUpperCase() + deviceMode.slice(1),
      icon: Monitor,
      iconColor: 'text-primary',
      badge: 'outline',
    },
    {
      label: 'Tipo de Dispositivo',
      value: deviceInfo.type.charAt(0).toUpperCase() + deviceInfo.type.slice(1),
      icon: Monitor,
      iconColor: 'text-muted-foreground',
      badge: 'outline',
    },
    {
      label: 'Versão do App',
      value: appVersion,
      icon: Info,
      iconColor: 'text-muted-foreground',
      badge: 'outline',
    },
  ] as const;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Diagnóstico do Kiosk
        </CardTitle>
        <CardDescription>
          Status em tempo real e informações do sistema
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Uptime Card */}
        <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">Tempo de Atividade</p>
                <p className="text-sm text-muted-foreground">Desde a última inicialização</p>
              </div>
            </div>
            <span className="text-2xl font-mono font-bold text-primary">
              {formatUptime()}
            </span>
          </div>
        </div>

        {/* Status Grid */}
        <div className="grid grid-cols-2 gap-3">
          {diagnosticItems.map(({ label, value, icon: Icon, iconColor, badge }) => (
            <div key={label} className="p-3 rounded-lg border bg-card">
              <div className="flex items-center gap-2 mb-2">
                <Icon className={`h-4 w-4 ${iconColor}`} />
                <span className="text-sm text-muted-foreground">{label}</span>
              </div>
              <Badge variant={badge as any}>{value}</Badge>
            </div>
          ))}
        </div>

        {/* Last Sync */}
        {settings.updated_at && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2 border-t">
            <RefreshCw className="h-3 w-3" />
            <span>
              Última atualização: {new Date(settings.updated_at).toLocaleString('pt-BR')}
            </span>
          </div>
        )}

        {/* Device Info */}
        <div className="pt-2 border-t space-y-1 text-xs text-muted-foreground">
          <p>
            <strong>Tela:</strong> {deviceInfo.screenWidth}x{deviceInfo.screenHeight}
            {deviceInfo.isTouch && ' (Touch)'}
            {deviceInfo.isFullscreen && ' (Fullscreen)'}
          </p>
          <p className="truncate">
            <strong>User Agent:</strong> {deviceInfo.userAgent.substring(0, 80)}...
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
