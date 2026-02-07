/**
 * Kiosk Routes Settings
 * Configure which kiosk routes are enabled and view access status
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useKioskSettings, KIOSK_ROUTES, type KioskRoutesEnabled } from "@/hooks/useKioskSettings";
import { CheckCircle, XCircle, Clock, Route } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function KioskRoutesSettings() {
  const { settings, updateSettings, isSaving } = useKioskSettings();

  const handleRouteToggle = (routeKey: keyof KioskRoutesEnabled, enabled: boolean) => {
    updateSettings({
      rotas_habilitadas: {
        ...settings.rotas_habilitadas,
        [routeKey]: enabled,
      },
    });
  };

  const formatLastAccess = (timestamp: string | undefined): string => {
    if (!timestamp) return 'Nunca acessado';
    try {
      return format(new Date(timestamp), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    } catch {
      return 'Data inválida';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Route className="h-5 w-5" />
          Rotas do Kiosk
        </CardTitle>
        <CardDescription>
          Gerencie quais rotas estão habilitadas no modo kiosk e visualize o status de acesso
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {Object.entries(KIOSK_ROUTES).map(([key, route]) => {
          const routeKey = key as keyof KioskRoutesEnabled;
          const isEnabled = settings.rotas_habilitadas[routeKey];
          const lastAccess = settings.ultimo_acesso_rotas[routeKey];

          return (
            <div
              key={key}
              className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
            >
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    {isEnabled ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-destructive" />
                    )}
                    <Label htmlFor={`route-${key}`} className="font-medium">
                      {route.label}
                    </Label>
                  </div>
                  <Badge variant={isEnabled ? "default" : "secondary"}>
                    {isEnabled ? 'Ativo' : 'Desativado'}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {route.path}
                </p>
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                  <Clock className="h-3 w-3" />
                  {formatLastAccess(lastAccess)}
                </div>
              </div>
              <Switch
                id={`route-${key}`}
                checked={isEnabled}
                onCheckedChange={(checked) => handleRouteToggle(routeKey, checked)}
                disabled={isSaving}
              />
            </div>
          );
        })}

        <div className="pt-4 border-t">
          <p className="text-sm text-muted-foreground">
            <strong>Nota:</strong> Desabilitar uma rota impede o acesso a ela no modo kiosk.
            O kiosk será redirecionado automaticamente para a rota principal se tentar acessar uma rota desabilitada.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
