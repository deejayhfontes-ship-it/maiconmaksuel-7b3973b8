/**
 * Kiosk Visual/Content Settings
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useKioskSettings } from "@/hooks/useKioskSettings";
import { 
  Palette, 
  Image, 
  Type, 
  Sun, 
  Moon,
  Layers,
  CreditCard,
  List,
  Calendar,
  Clock,
  Monitor
} from "lucide-react";

export default function KioskVisualSettings() {
  const { settings, updateSettings, isSaving } = useKioskSettings();

  const moduleToggles = [
    { key: 'modulo_espelho_caixa', label: 'Espelho de Caixa', icon: CreditCard, description: 'Exibe valores e pagamentos' },
    { key: 'modulo_comandas_abertas', label: 'Comandas Abertas', icon: List, description: 'Lista de comandas em aberto' },
    { key: 'modulo_mini_agenda', label: 'Mini Agenda', icon: Calendar, description: 'Resumo de agendamentos' },
    { key: 'modulo_ponto', label: 'Ponto Eletrônico', icon: Clock, description: 'Registro de ponto' },
    { key: 'modulo_tela_espera', label: 'Tela de Espera', icon: Monitor, description: 'Tela idle com branding' },
  ] as const;

  const animationOptions = [
    { value: 'none', label: 'Nenhuma' },
    { value: 'fade', label: 'Fade' },
    { value: 'slide', label: 'Slide' },
    { value: 'pulse', label: 'Pulse' },
    { value: 'loop', label: 'Loop contínuo' },
  ];

  const backgroundTypes = [
    { value: 'color', label: 'Cor sólida' },
    { value: 'gradient', label: 'Gradiente' },
    { value: 'image', label: 'Imagem' },
    { value: 'video', label: 'Vídeo loop' },
  ];

  return (
    <div className="space-y-6">
      {/* Module Toggles */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Módulos Visíveis
          </CardTitle>
          <CardDescription>
            Escolha quais módulos aparecem no kiosk
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {moduleToggles.map(({ key, label, icon: Icon, description }) => (
            <div key={key} className="flex items-center justify-between p-3 rounded-lg border">
              <div className="flex items-center gap-3">
                <Icon className="h-4 w-4 text-primary" />
                <div>
                  <Label className="font-medium">{label}</Label>
                  <p className="text-xs text-muted-foreground">{description}</p>
                </div>
              </div>
              <Switch
                checked={settings[key] as boolean}
                onCheckedChange={(checked) => updateSettings({ [key]: checked })}
                disabled={isSaving}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Visual Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Aparência Visual
          </CardTitle>
          <CardDescription>
            Personalize a aparência do kiosk
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Theme */}
          <div className="space-y-2">
            <Label>Tema do Kiosk</Label>
            <div className="flex gap-3">
              <button
                onClick={() => updateSettings({ tema_kiosk: 'dark' })}
                className={`flex items-center gap-2 px-4 py-3 rounded-lg border transition-all ${
                  settings.tema_kiosk === 'dark' 
                    ? 'border-primary bg-primary/10' 
                    : 'hover:bg-muted'
                }`}
              >
                <Moon className="h-4 w-4" />
                <span>Escuro</span>
              </button>
              <button
                onClick={() => updateSettings({ tema_kiosk: 'light' })}
                className={`flex items-center gap-2 px-4 py-3 rounded-lg border transition-all ${
                  settings.tema_kiosk === 'light' 
                    ? 'border-primary bg-primary/10' 
                    : 'hover:bg-muted'
                }`}
              >
                <Sun className="h-4 w-4" />
                <span>Claro</span>
              </button>
            </div>
          </div>

          {/* Logo URL */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Image className="h-4 w-4" />
              URL do Logo
            </Label>
            <Input
              placeholder="https://exemplo.com/logo.png"
              value={settings.logo_url || ''}
              onChange={(e) => updateSettings({ logo_url: e.target.value || null })}
              disabled={isSaving}
            />
          </div>

          {/* Logo Animation */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Animação do Logo</Label>
              <Select
                value={settings.logo_animacao}
                onValueChange={(value) => updateSettings({ 
                  logo_animacao: value as typeof settings.logo_animacao 
                })}
                disabled={isSaving}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {animationOptions.map(({ value, label }) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Velocidade (ms)</Label>
              <Input
                type="number"
                min={500}
                max={5000}
                step={100}
                value={settings.logo_animacao_velocidade}
                onChange={(e) => updateSettings({ 
                  logo_animacao_velocidade: parseInt(e.target.value) || 1000 
                })}
                disabled={isSaving}
              />
            </div>
          </div>

          {/* Background */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo de Fundo</Label>
              <Select
                value={settings.fundo_tipo}
                onValueChange={(value) => updateSettings({ 
                  fundo_tipo: value as typeof settings.fundo_tipo 
                })}
                disabled={isSaving}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {backgroundTypes.map(({ value, label }) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>
                {settings.fundo_tipo === 'color' ? 'Cor' : 
                 settings.fundo_tipo === 'gradient' ? 'Gradiente CSS' : 'URL'}
              </Label>
              <Input
                type={settings.fundo_tipo === 'color' ? 'color' : 'text'}
                value={settings.fundo_valor}
                onChange={(e) => updateSettings({ fundo_valor: e.target.value })}
                disabled={isSaving}
                className={settings.fundo_tipo === 'color' ? 'h-10 p-1' : ''}
              />
            </div>
          </div>

          {/* Typography */}
          <div className="flex items-center justify-between p-3 rounded-lg border">
            <div className="flex items-center gap-3">
              <Type className="h-4 w-4 text-primary" />
              <div>
                <Label className="font-medium">Tipografia grande</Label>
                <p className="text-xs text-muted-foreground">
                  Texto maior para visualização à distância
                </p>
              </div>
            </div>
            <Switch
              checked={settings.tipografia_grande}
              onCheckedChange={(checked) => updateSettings({ tipografia_grande: checked })}
              disabled={isSaving}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
