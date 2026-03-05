/**
 * Kiosk Interaction & Navigation Rules
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useKioskSettings } from "@/hooks/useKioskSettings";
import { 
  Hand, 
  Keyboard, 
  Target,
  ShieldAlert
} from "lucide-react";

export default function KioskInteractionSettings() {
  const { settings, updateSettings, isSaving } = useKioskSettings();

  const interactionSettings = [
    {
      key: 'apenas_touch',
      label: 'Apenas Touch',
      description: 'Otimiza interface para interações touch',
      icon: Hand,
      value: settings.apenas_touch,
    },
    {
      key: 'desabilitar_teclado',
      label: 'Desabilitar Teclado',
      description: 'Bloqueia entrada via teclado físico',
      icon: Keyboard,
      value: settings.desabilitar_teclado,
    },
    {
      key: 'alvos_touch_grandes',
      label: 'Alvos Touch Grandes',
      description: 'Aumenta área clicável de botões e links',
      icon: Target,
      value: settings.alvos_touch_grandes,
    },
  ] as const;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Hand className="h-5 w-5" />
          Interação e Navegação
        </CardTitle>
        <CardDescription>
          Configure regras de interação e navegação do kiosk
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {interactionSettings.map(({ key, label, description, icon: Icon, value }) => (
          <div
            key={key}
            className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <div>
                <Label htmlFor={key} className="font-medium">
                  {label}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {description}
                </p>
              </div>
            </div>
            <Switch
              id={key}
              checked={value}
              onCheckedChange={(checked) => updateSettings({ [key]: checked })}
              disabled={isSaving}
            />
          </div>
        ))}

        <div className="p-4 rounded-lg border border-amber-500/30 bg-amber-500/5">
          <div className="flex items-start gap-3">
            <ShieldAlert className="h-5 w-5 text-amber-500 mt-0.5" />
            <div>
              <p className="font-medium text-amber-700 dark:text-amber-400">
                Restrições de Navegação
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                O modo kiosk bloqueia automaticamente o acesso a rotas administrativas 
                e financeiras. Apenas as rotas habilitadas em "Rotas do Kiosk" são acessíveis.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
