/**
 * Appearance Settings Component
 * Manages theme, colors, and UI preferences with immediate application
 */

import { useState, useCallback } from "react";
import { Palette, Sun, Moon, Monitor, RotateCcw, Save, Check, RefreshCw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAppearance } from "@/contexts/SalonSettingsContext";
import { cn } from "@/lib/utils";

// Helper to convert HSL string to hex for color picker
function hslToHex(hslString: string): string {
  const parts = hslString.split(' ');
  if (parts.length !== 3) return '#007AFF';
  
  const h = parseFloat(parts[0]) / 360;
  const s = parseFloat(parts[1].replace('%', '')) / 100;
  const l = parseFloat(parts[2].replace('%', '')) / 100;

  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };

  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }

  const toHex = (x: number) => {
    const hex = Math.round(x * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// Helper to convert hex to HSL string
function hexToHsl(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return '211 100% 50%';

  const r = parseInt(result[1], 16) / 255;
  const g = parseInt(result[2], 16) / 255;
  const b = parseInt(result[3], 16) / 255;

  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

// Theme option component
interface ThemeOptionProps {
  value: 'light' | 'dark' | 'system';
  label: string;
  icon: React.ReactNode;
  selected: boolean;
  onClick: () => void;
}

function ThemeOption({ value, label, icon, selected, onClick }: ThemeOptionProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200",
        "hover:border-primary/50",
        selected ? "border-primary bg-primary/5" : "border-muted"
      )}
    >
      <div className={cn(
        "w-16 h-12 rounded-lg flex items-center justify-center",
        value === 'light' && "bg-white border shadow-sm",
        value === 'dark' && "bg-gray-900 border border-gray-700",
        value === 'system' && "bg-gradient-to-r from-white to-gray-900 border"
      )}>
        {icon}
      </div>
      <span className="text-sm font-medium">{label}</span>
      {selected && (
        <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
          <Check className="h-3 w-3 text-primary-foreground" />
        </div>
      )}
    </button>
  );
}

// Color picker component
interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (hsl: string) => void;
  presets?: string[];
}

function ColorPicker({ label, value, onChange, presets }: ColorPickerProps) {
  const hexValue = hslToHex(value);

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-3">
        <div 
          className="w-12 h-12 rounded-xl border-2 border-muted overflow-hidden cursor-pointer relative"
          style={{ backgroundColor: hexValue }}
        >
          <input
            type="color"
            value={hexValue}
            onChange={(e) => onChange(hexToHsl(e.target.value))}
            className="absolute inset-0 opacity-0 cursor-pointer"
          />
        </div>
        
        {presets && (
          <div className="flex flex-wrap gap-2">
            {presets.map((preset, i) => (
              <button
                key={i}
                onClick={() => onChange(preset)}
                className={cn(
                  "w-8 h-8 rounded-lg border-2 transition-all",
                  value === preset ? "border-primary scale-110" : "border-transparent hover:scale-105"
                )}
                style={{ backgroundColor: hslToHex(preset) }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AparenciaSettings() {
  const { appearance, updateAppearance, resetAppearanceDefaults, isLoading } = useAppearance();
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    tema: appearance?.tema || 'system',
    cor_primaria: appearance?.cor_primaria || '211 100% 50%',
    cor_secundaria: appearance?.cor_secundaria || '142 69% 49%',
    cor_destaque: appearance?.cor_destaque || '4 90% 58%',
    tipografia_grande: appearance?.tipografia_grande || false,
    modo_alto_contraste: appearance?.modo_alto_contraste || false,
    animacoes_reduzidas: appearance?.animacoes_reduzidas || false,
  });

  // Update immediately on change
  const handleThemeChange = useCallback(async (tema: 'light' | 'dark' | 'system') => {
    setFormData(prev => ({ ...prev, tema }));
    await updateAppearance({ tema });
  }, [updateAppearance]);

  const handleColorChange = useCallback(async (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    await updateAppearance({ [field]: value });
  }, [updateAppearance]);

  const handleToggle = useCallback(async (field: string, value: boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    await updateAppearance({ [field]: value });
  }, [updateAppearance]);

  const handleReset = async () => {
    setIsSaving(true);
    try {
      await resetAppearanceDefaults();
      setFormData({
        tema: 'system',
        cor_primaria: '211 100% 50%',
        cor_secundaria: '142 69% 49%',
        cor_destaque: '4 90% 58%',
        tipografia_grande: false,
        modo_alto_contraste: false,
        animacoes_reduzidas: false,
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
          <Palette className="h-5 w-5" />
          Aparência e Tema
        </h2>

        <div className="space-y-8">
          {/* Theme Selection */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Tema</h3>
            <p className="text-sm text-muted-foreground">
              Escolha como o sistema deve aparecer.
            </p>
            
            <div className="flex gap-4">
              <ThemeOption
                value="light"
                label="Claro"
                icon={<Sun className="h-6 w-6 text-yellow-500" />}
                selected={formData.tema === 'light'}
                onClick={() => handleThemeChange('light')}
              />
              <ThemeOption
                value="dark"
                label="Escuro"
                icon={<Moon className="h-6 w-6 text-blue-400" />}
                selected={formData.tema === 'dark'}
                onClick={() => handleThemeChange('dark')}
              />
              <ThemeOption
                value="system"
                label="Auto (Sistema)"
                icon={<Monitor className="h-6 w-6 text-gray-500" />}
                selected={formData.tema === 'system'}
                onClick={() => handleThemeChange('system')}
              />
            </div>
          </div>

          {/* Colors */}
          <div className="space-y-4 border-t pt-6">
            <h3 className="text-lg font-medium">Cores Principais</h3>
            <p className="text-sm text-muted-foreground">
              As cores serão aplicadas em todo o sistema imediatamente.
            </p>

            <div className="grid gap-6">
              <ColorPicker
                label="Cor Primária (Botões, Links)"
                value={formData.cor_primaria}
                onChange={(v) => handleColorChange('cor_primaria', v)}
                presets={[
                  '211 100% 50%', // iOS Blue
                  '252 56% 57%',  // Purple
                  '340 82% 52%',  // Pink
                  '262 83% 58%',  // Violet
                  '0 0% 10%',     // Preto
                  '43 74% 49%',   // Dourado
                ]}
              />

              <ColorPicker
                label="Cor Secundária (Sucesso, Confirmações)"
                value={formData.cor_secundaria}
                onChange={(v) => handleColorChange('cor_secundaria', v)}
                presets={[
                  '142 69% 49%', // iOS Green
                  '173 80% 40%', // Teal
                  '160 84% 39%', // Emerald
                ]}
              />

              <ColorPicker
                label="Cor de Destaque (Erros, Alertas)"
                value={formData.cor_destaque}
                onChange={(v) => handleColorChange('cor_destaque', v)}
                presets={[
                  '4 90% 58%',   // iOS Red
                  '36 100% 50%', // Orange
                  '45 93% 47%',  // Amber
                ]}
              />
            </div>
          </div>

          {/* UI Preferences */}
          <div className="space-y-4 border-t pt-6">
            <h3 className="text-lg font-medium">Preferências de Interface</h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-xl">
                <div>
                  <p className="font-medium">Tipografia Grande</p>
                  <p className="text-sm text-muted-foreground">
                    Aumenta o tamanho base da fonte para melhor leitura
                  </p>
                </div>
                <Switch
                  checked={formData.tipografia_grande}
                  onCheckedChange={(v) => handleToggle('tipografia_grande', v)}
                />
              </div>

              <div className="flex items-center justify-between p-4 border rounded-xl">
                <div>
                  <p className="font-medium">Modo Alto Contraste</p>
                  <p className="text-sm text-muted-foreground">
                    Aumenta o contraste para melhor acessibilidade
                  </p>
                </div>
                <Switch
                  checked={formData.modo_alto_contraste}
                  onCheckedChange={(v) => handleToggle('modo_alto_contraste', v)}
                />
              </div>

              <div className="flex items-center justify-between p-4 border rounded-xl">
                <div>
                  <p className="font-medium">Animações Reduzidas</p>
                  <p className="text-sm text-muted-foreground">
                    Reduz movimentos para sensibilidade a movimento
                  </p>
                </div>
                <Switch
                  checked={formData.animacoes_reduzidas}
                  onCheckedChange={(v) => handleToggle('animacoes_reduzidas', v)}
                />
              </div>
            </div>
          </div>

          {/* Reset Button */}
          <div className="flex gap-2 pt-4 border-t">
            <Button variant="outline" onClick={handleReset} disabled={isSaving}>
              {isSaving ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RotateCcw className="h-4 w-4 mr-2" />
              )}
              Restaurar Cores Padrão
            </Button>
          </div>
        </div>
      </Card>

      {/* Preview Card */}
      <Card className="p-6">
        <h3 className="text-lg font-medium mb-4">Pré-visualização</h3>
        <div className="p-4 rounded-xl border bg-card space-y-4">
          <div className="flex gap-2">
            <Button>Botão Primário</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="destructive">Destrutivo</Button>
          </div>
          <div className="flex gap-2">
            <span className="px-3 py-1 rounded-full text-sm bg-success/10 text-success">
              Sucesso
            </span>
            <span className="px-3 py-1 rounded-full text-sm bg-destructive/10 text-destructive">
              Erro
            </span>
            <span className="px-3 py-1 rounded-full text-sm bg-warning/10 text-warning">
              Aviso
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}
