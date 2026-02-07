/**
 * Kiosk Window/System Lockdown Settings
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useKioskSettings } from "@/hooks/useKioskSettings";
import { 
  Monitor, 
  Lock, 
  Maximize, 
  Move, 
  Keyboard, 
  RefreshCw,
  EyeOff
} from "lucide-react";

export default function KioskWindowSettings() {
  const { settings, updateSettings, isSaving } = useKioskSettings();

  const windowSettings = [
    {
      key: 'bloquear_arraste_janela',
      label: 'Bloquear arraste da janela',
      description: 'Impede que a janela seja arrastada',
      icon: Move,
      value: settings.bloquear_arraste_janela,
    },
    {
      key: 'bloquear_posicao_janela',
      label: 'Bloquear posição da janela',
      description: 'Mantém a janela na posição configurada',
      icon: Lock,
      value: settings.bloquear_posicao_janela,
    },
    {
      key: 'bloquear_tamanho_janela',
      label: 'Bloquear tamanho da janela',
      description: 'Impede redimensionamento da janela',
      icon: Monitor,
      value: settings.bloquear_tamanho_janela,
    },
    {
      key: 'forcar_fullscreen',
      label: 'Forçar tela cheia',
      description: 'Inicia automaticamente em modo tela cheia',
      icon: Maximize,
      value: settings.forcar_fullscreen,
    },
    {
      key: 'ocultar_controles_janela',
      label: 'Ocultar controles da janela',
      description: 'Esconde os botões de minimizar, maximizar e fechar',
      icon: EyeOff,
      value: settings.ocultar_controles_janela,
    },
    {
      key: 'bloquear_atalhos_sistema',
      label: 'Bloquear atalhos do sistema',
      description: 'Desabilita Alt+Tab, Alt+F4 e outros atalhos',
      icon: Keyboard,
      value: settings.bloquear_atalhos_sistema,
    },
    {
      key: 'auto_relancar_se_fechado',
      label: 'Auto-relançar se fechado',
      description: 'Reinicia automaticamente o kiosk se for fechado',
      icon: RefreshCw,
      value: settings.auto_relancar_se_fechado,
    },
  ] as const;

  const handleToggle = (key: string, value: boolean) => {
    updateSettings({ [key]: value });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock className="h-5 w-5" />
          Bloqueio de Sistema
        </CardTitle>
        <CardDescription>
          Configure o comportamento da janela e as restrições do sistema para o modo kiosk
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {windowSettings.map(({ key, label, description, icon: Icon, value }) => (
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
              onCheckedChange={(checked) => handleToggle(key, checked)}
              disabled={isSaving}
            />
          </div>
        ))}

        <div className="pt-4 border-t">
          <p className="text-sm text-muted-foreground">
            <strong>Importante:</strong> Algumas configurações requerem que o app seja executado 
            em modo Electron para funcionar corretamente.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
