/**
 * Kiosk Visual/Content Settings - Modern Premium Configuration
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useKioskSettings } from "@/hooks/useKioskSettings";
import { useSalonSettings } from "@/contexts/SalonSettingsContext";
import { 
  Palette, 
  Image, 
  Type, 
  Sun, 
  Moon,
  Clock,
  Sparkles,
  MonitorSmartphone,
  Paintbrush,
  AlertCircle
} from "lucide-react";

export default function KioskVisualSettings() {
  const { settings, updateSettings, isSaving } = useKioskSettings();
  const { salonData } = useSalonSettings();

  // Check if logo is configured
  const hasLogo = !!(settings.logo_url || salonData?.logo_url);

  const animationOptions = [
    { value: 'none', label: 'Nenhuma', description: 'Logo estático' },
    { value: 'fade', label: 'Fade', description: 'Aparecer suavemente' },
    { value: 'pulse', label: 'Pulse', description: 'Pulsação suave' },
    { value: 'slide', label: 'Slide', description: 'Deslizar para cima' },
    { value: 'loop', label: 'Loop', description: 'Animação contínua' },
  ];

  const backgroundTypes = [
    { value: 'color', label: 'Cor sólida', icon: Paintbrush },
    { value: 'gradient', label: 'Gradiente', icon: Palette },
    { value: 'image', label: 'Imagem', icon: Image },
  ];

  const logoSizeOptions = [
    { value: 'small', label: 'Pequeno', size: '120px' },
    { value: 'medium', label: 'Médio', size: '160px' },
    { value: 'large', label: 'Grande', size: '200px' },
  ];

  return (
    <div className="space-y-6">
      {/* Theme Selection - Primary */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-primary" />
            Tema do Kiosk
          </CardTitle>
          <CardDescription>
            Escolha a aparência base do kiosk. Recomendamos "Claro" para melhor visibilidade.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => updateSettings({ tema_kiosk: 'light' })}
              disabled={isSaving}
              className={`relative flex flex-col items-center gap-3 p-6 rounded-2xl border-2 transition-all ${
                settings.tema_kiosk === 'light' 
                  ? 'border-primary bg-primary/5 shadow-lg' 
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              {settings.tema_kiosk === 'light' && (
                <Badge className="absolute top-2 right-2 text-xs">Recomendado</Badge>
              )}
              <div className="p-4 rounded-xl bg-white border shadow-sm">
                <Sun className="h-8 w-8 text-amber-500" />
              </div>
              <div className="text-center">
                <p className="font-semibold">Claro</p>
                <p className="text-xs text-muted-foreground">Fundo claro, moderno</p>
              </div>
            </button>
            
            <button
              onClick={() => updateSettings({ tema_kiosk: 'dark' })}
              disabled={isSaving}
              className={`relative flex flex-col items-center gap-3 p-6 rounded-2xl border-2 transition-all ${
                settings.tema_kiosk === 'dark' 
                  ? 'border-primary bg-primary/5 shadow-lg' 
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className="p-4 rounded-xl bg-gray-900 border border-gray-700">
                <Moon className="h-8 w-8 text-blue-400" />
              </div>
              <div className="text-center">
                <p className="font-semibold">Escuro</p>
                <p className="text-xs text-muted-foreground">Fundo escuro</p>
              </div>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Logo Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="h-5 w-5" />
            Logo do Salão
          </CardTitle>
          <CardDescription>
            O logo é exibido na tela de espera, confirmação e agradecimento.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Logo Status */}
          {!hasLogo && (
            <div className="flex items-center gap-3 p-4 bg-yellow-50 rounded-xl border border-yellow-200">
              <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0" />
              <div>
                <p className="font-medium text-yellow-800">Logo não configurado</p>
                <p className="text-sm text-yellow-600">
                  Configure o logo em Configurações → Geral → Dados do Salão, ou insira uma URL abaixo.
                </p>
              </div>
            </div>
          )}

          {/* Logo URL Override */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              URL do Logo (opcional)
            </Label>
            <Input
              placeholder="https://exemplo.com/logo.png"
              value={settings.logo_url || ''}
              onChange={(e) => updateSettings({ logo_url: e.target.value || null })}
              disabled={isSaving}
            />
            <p className="text-xs text-muted-foreground">
              Deixe vazio para usar o logo das configurações do salão.
            </p>
          </div>

          {/* Logo Preview */}
          {hasLogo && (
            <div className="p-6 bg-gray-50 rounded-xl border flex items-center justify-center">
              <img 
                src={settings.logo_url || salonData?.logo_url || ''} 
                alt="Preview do Logo"
                className="max-h-24 w-auto object-contain"
              />
            </div>
          )}

          <Separator />

          {/* Logo Animation */}
          <div className="space-y-3">
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
                {animationOptions.map(({ value, label, description }) => (
                  <SelectItem key={value} value={value}>
                    <div className="flex flex-col">
                      <span>{label}</span>
                      <span className="text-xs text-muted-foreground">{description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Animation Speed (only if animation is set) */}
          {settings.logo_animacao !== 'none' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Velocidade da Animação</Label>
                <span className="text-sm text-muted-foreground">{settings.logo_animacao_velocidade}ms</span>
              </div>
              <Slider
                value={[settings.logo_animacao_velocidade]}
                min={500}
                max={3000}
                step={100}
                onValueChange={(value) => updateSettings({ logo_animacao_velocidade: value[0] })}
                disabled={isSaving}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Background Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Paintbrush className="h-5 w-5" />
            Fundo Personalizado
          </CardTitle>
          <CardDescription>
            Personalize o fundo da tela de espera. Deixe vazio para usar o gradiente padrão.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Background Type */}
          <div className="grid grid-cols-3 gap-3">
            {backgroundTypes.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => updateSettings({ fundo_tipo: value as typeof settings.fundo_tipo })}
                disabled={isSaving}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                  settings.fundo_tipo === value 
                    ? 'border-primary bg-primary/5' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-sm font-medium">{label}</span>
              </button>
            ))}
          </div>

          {/* Background Value Input */}
          <div className="space-y-2">
            <Label>
              {settings.fundo_tipo === 'color' ? 'Cor de Fundo' : 
               settings.fundo_tipo === 'gradient' ? 'Gradiente CSS' : 'URL da Imagem'}
            </Label>
            {settings.fundo_tipo === 'color' ? (
              <div className="flex gap-3">
                <Input
                  type="color"
                  value={settings.fundo_valor || '#ffffff'}
                  onChange={(e) => updateSettings({ fundo_valor: e.target.value })}
                  disabled={isSaving}
                  className="w-20 h-12 p-1 cursor-pointer"
                />
                <Input
                  type="text"
                  placeholder="#ffffff"
                  value={settings.fundo_valor || ''}
                  onChange={(e) => updateSettings({ fundo_valor: e.target.value })}
                  disabled={isSaving}
                  className="flex-1"
                />
              </div>
            ) : (
              <Input
                type="text"
                placeholder={settings.fundo_tipo === 'gradient' 
                  ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
                  : 'https://exemplo.com/fundo.jpg'}
                value={settings.fundo_valor || ''}
                onChange={(e) => updateSettings({ fundo_valor: e.target.value })}
                disabled={isSaving}
              />
            )}
            <p className="text-xs text-muted-foreground">
              Deixe vazio para usar o fundo padrão do tema.
            </p>
          </div>

          {/* Background Preview */}
          {settings.fundo_valor && (
            <div 
              className="h-32 rounded-xl border overflow-hidden"
              style={{
                background: settings.fundo_tipo === 'image' 
                  ? `url(${settings.fundo_valor}) center/cover` 
                  : settings.fundo_valor
              }}
            >
              <div className="h-full flex items-center justify-center">
                <span className="px-3 py-1 bg-white/80 rounded-full text-xs text-gray-600">
                  Preview do fundo
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Display Options */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MonitorSmartphone className="h-5 w-5" />
            Opções de Exibição
          </CardTitle>
          <CardDescription>
            Configure a tipografia e elementos visuais do kiosk.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Large Typography */}
          <div className="flex items-center justify-between p-4 rounded-xl border bg-gray-50/50">
            <div className="flex items-center gap-3">
              <Type className="h-5 w-5 text-primary" />
              <div>
                <Label className="font-medium">Tipografia Grande</Label>
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

          {/* Idle Screen Branding */}
          <div className="flex items-center justify-between p-4 rounded-xl border bg-gray-50/50">
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-primary" />
              <div>
                <Label className="font-medium">Tela de Espera</Label>
                <p className="text-xs text-muted-foreground">
                  Exibe logo e relógio quando não há interação
                </p>
              </div>
            </div>
            <Switch
              checked={settings.modulo_tela_espera}
              onCheckedChange={(checked) => updateSettings({ modulo_tela_espera: checked })}
              disabled={isSaving}
            />
          </div>

          {/* Ponto Module */}
          <div className="flex items-center justify-between p-4 rounded-xl border bg-gray-50/50">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-primary" />
              <div>
                <Label className="font-medium">Ponto Eletrônico</Label>
                <p className="text-xs text-muted-foreground">
                  Permite registro de ponto pelos funcionários
                </p>
              </div>
            </div>
            <Switch
              checked={settings.ponto_habilitado}
              onCheckedChange={(checked) => updateSettings({ ponto_habilitado: checked })}
              disabled={isSaving}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
