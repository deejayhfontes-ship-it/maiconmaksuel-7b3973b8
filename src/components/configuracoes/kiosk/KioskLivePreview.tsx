/**
 * Kiosk Live Preview Component
 * Provides a real-time, sandboxed preview of the kiosk interface
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { useKioskSettings, KIOSK_ROUTES, type KioskRoutesEnabled } from "@/hooks/useKioskSettings";
import { cn } from "@/lib/utils";
import { 
  Eye, 
  RefreshCw, 
  Maximize2,
  Minimize2,
  Wifi,
  WifiOff,
  Smartphone,
  Monitor,
  Tablet,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  ChevronRight,
  CreditCard,
  Calendar,
  Clock,
  Play,
  Square
} from "lucide-react";

// Device presets
const PREVIEW_DEVICES = [
  { id: 'tablet-landscape', name: 'Tablet (Landscape)', width: 1024, height: 768, icon: Tablet },
  { id: 'tablet-portrait', name: 'Tablet (Portrait)', width: 768, height: 1024, icon: Tablet },
  { id: 'kiosk-fullhd', name: 'Kiosk Full HD', width: 1920, height: 1080, icon: Monitor },
  { id: 'kiosk-vertical', name: 'Kiosk Vertical', width: 1080, height: 1920, icon: Monitor },
  { id: 'mobile', name: 'Mobile', width: 375, height: 812, icon: Smartphone },
];

// Kiosk module icons
const MODULE_ICONS = {
  kiosk_caixa: CreditCard,
  kiosk_agenda: Calendar,
  kiosk_ponto: Clock,
  kiosk_espelho: Monitor,
};

interface PreviewState {
  isRunning: boolean;
  currentRoute: string;
  isOffline: boolean;
  isFullscreenSim: boolean;
  deviceId: string;
  scale: number;
}

export default function KioskLivePreview() {
  const { settings, isRouteEnabled } = useKioskSettings();
  
  const [previewState, setPreviewState] = useState<PreviewState>({
    isRunning: false,
    currentRoute: '/kiosk',
    isOffline: false,
    isFullscreenSim: false,
    deviceId: 'tablet-landscape',
    scale: 0.45,
  });

  const currentDevice = useMemo(() => 
    PREVIEW_DEVICES.find(d => d.id === previewState.deviceId) || PREVIEW_DEVICES[0],
    [previewState.deviceId]
  );

  // Available kiosk modules based on settings
  const availableModules = useMemo(() => {
    return [
      { key: 'kiosk_caixa', path: '/kiosk/caixa', label: 'Caixa', enabled: isRouteEnabled('kiosk_caixa') },
      { key: 'kiosk_agenda', path: '/kiosk/agenda', label: 'Agenda', enabled: isRouteEnabled('kiosk_agenda') },
      { key: 'kiosk_ponto', path: '/kiosk/ponto', label: 'Ponto', enabled: isRouteEnabled('kiosk_ponto') },
      { key: 'kiosk_espelho', path: '/kiosk/espelho-cliente', label: 'Espelho', enabled: isRouteEnabled('kiosk_espelho') },
    ].filter(m => m.enabled);
  }, [isRouteEnabled]);

  // Start/Stop preview
  const togglePreview = useCallback(() => {
    setPreviewState(prev => ({
      ...prev,
      isRunning: !prev.isRunning,
      currentRoute: '/kiosk',
    }));
  }, []);

  // Restart preview
  const restartPreview = useCallback(() => {
    setPreviewState(prev => ({
      ...prev,
      currentRoute: '/kiosk',
      isOffline: false,
    }));
  }, []);

  // Navigate within preview
  const navigatePreview = useCallback((route: string) => {
    setPreviewState(prev => ({ ...prev, currentRoute: route }));
  }, []);

  // Toggle offline simulation
  const toggleOffline = useCallback(() => {
    setPreviewState(prev => ({ ...prev, isOffline: !prev.isOffline }));
  }, []);

  // Toggle fullscreen simulation
  const toggleFullscreenSim = useCallback(() => {
    setPreviewState(prev => ({ ...prev, isFullscreenSim: !prev.isFullscreenSim }));
  }, []);

  // Change device
  const changeDevice = useCallback((deviceId: string) => {
    setPreviewState(prev => ({ ...prev, deviceId }));
  }, []);

  // Change scale
  const changeScale = useCallback((value: number[]) => {
    setPreviewState(prev => ({ ...prev, scale: value[0] }));
  }, []);

  // Calculate preview dimensions
  const previewDimensions = useMemo(() => {
    const width = currentDevice.width * previewState.scale;
    const height = currentDevice.height * previewState.scale;
    return { width, height };
  }, [currentDevice, previewState.scale]);

  return (
    <div className="space-y-4">
      {/* Header Card */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Live Preview
              </CardTitle>
              <CardDescription>
                Visualize o kiosk em tempo real com as configurações atuais
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={previewState.isRunning ? "default" : "secondary"}>
                {previewState.isRunning ? 'Executando' : 'Parado'}
              </Badge>
              <Button
                variant={previewState.isRunning ? "destructive" : "default"}
                size="sm"
                onClick={togglePreview}
                className="gap-2"
              >
                {previewState.isRunning ? (
                  <>
                    <Square className="h-4 w-4" />
                    Parar
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    Iniciar Preview
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Controls */}
      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Device Selector */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Dispositivo</label>
              <Select value={previewState.deviceId} onValueChange={changeDevice}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PREVIEW_DEVICES.map(device => {
                    const Icon = device.icon;
                    return (
                      <SelectItem key={device.id} value={device.id}>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          {device.name}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Scale Slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Escala</label>
                <span className="text-xs text-muted-foreground">{Math.round(previewState.scale * 100)}%</span>
              </div>
              <div className="flex items-center gap-2">
                <ZoomOut className="h-4 w-4 text-muted-foreground" />
                <Slider
                  value={[previewState.scale]}
                  min={0.25}
                  max={0.75}
                  step={0.05}
                  onValueChange={changeScale}
                  className="flex-1"
                />
                <ZoomIn className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>

            {/* Simulation Toggles */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Simulação</label>
              <div className="flex items-center gap-2">
                <Button
                  variant={previewState.isOffline ? "destructive" : "outline"}
                  size="sm"
                  onClick={toggleOffline}
                  className="gap-1"
                >
                  {previewState.isOffline ? <WifiOff className="h-4 w-4" /> : <Wifi className="h-4 w-4" />}
                  {previewState.isOffline ? 'Offline' : 'Online'}
                </Button>
                <Button
                  variant={previewState.isFullscreenSim ? "default" : "outline"}
                  size="sm"
                  onClick={toggleFullscreenSim}
                  className="gap-1"
                >
                  {previewState.isFullscreenSim ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Ações</label>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={restartPreview}
                  disabled={!previewState.isRunning}
                  className="gap-1"
                >
                  <RefreshCw className="h-4 w-4" />
                  Reiniciar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigatePreview('/kiosk')}
                  disabled={!previewState.isRunning}
                  className="gap-1"
                >
                  <RotateCcw className="h-4 w-4" />
                  Home
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preview Window */}
      {previewState.isRunning && (
        <Card className={cn(
          "overflow-hidden transition-all",
          previewState.isFullscreenSim && "fixed inset-4 z-50"
        )}>
          <CardContent className="p-4">
            {/* Status Bar */}
            <div className="flex items-center justify-between mb-4 pb-4 border-b">
              <div className="flex items-center gap-4">
                <Badge variant="outline" className="gap-1">
                  <Eye className="h-3 w-3" />
                  Kiosk Live Preview
                </Badge>
                <Badge variant="secondary">
                  {currentDevice.name} ({currentDevice.width}x{currentDevice.height})
                </Badge>
                {previewState.isOffline && (
                  <Badge variant="destructive" className="gap-1">
                    <WifiOff className="h-3 w-3" />
                    Modo Offline
                  </Badge>
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                Rota: {previewState.currentRoute}
              </div>
            </div>

            {/* Preview Container */}
            <div className="flex justify-center overflow-auto py-4 bg-muted/30 rounded-lg">
              <div
                className="relative bg-background rounded-lg shadow-2xl overflow-hidden border-4 border-foreground/10"
                style={{
                  width: previewDimensions.width,
                  height: previewDimensions.height,
                  minWidth: previewDimensions.width,
                }}
              >
                {/* Preview Content - Sandbox Render */}
                <KioskPreviewRenderer
                  settings={settings}
                  currentRoute={previewState.currentRoute}
                  isOffline={previewState.isOffline}
                  availableModules={availableModules}
                  onNavigate={navigatePreview}
                  scale={previewState.scale}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Help Text */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-start gap-3 text-sm text-muted-foreground">
            <Eye className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-foreground mb-1">Sobre o Live Preview</p>
              <ul className="space-y-1">
                <li>• O preview reflete as configurações atuais em tempo real</li>
                <li>• Alterações nas abas anteriores são refletidas automaticamente</li>
                <li>• Nenhuma ação dentro do preview afeta dados reais do sistema</li>
                <li>• O modo offline simula o comportamento sem conexão</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Kiosk Preview Renderer
 * Renders the kiosk UI in a sandboxed manner
 */
interface KioskPreviewRendererProps {
  settings: ReturnType<typeof useKioskSettings>['settings'];
  currentRoute: string;
  isOffline: boolean;
  availableModules: { key: string; path: string; label: string; enabled: boolean }[];
  onNavigate: (route: string) => void;
  scale: number;
}

function KioskPreviewRenderer({ 
  settings, 
  currentRoute, 
  isOffline,
  availableModules,
  onNavigate,
  scale,
}: KioskPreviewRendererProps) {
  const isHome = currentRoute === '/kiosk';
  const activeModule = availableModules.find(m => currentRoute.startsWith(m.path));
  
  // Determine font scale
  const fontScale = settings.tipografia_grande ? 1.15 : 1;
  const touchScale = settings.alvos_touch_grandes ? 1.25 : 1;

  return (
    <div
      className={cn(
        "h-full flex flex-col",
        settings.tema_kiosk === 'dark' ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'
      )}
      style={{
        background: settings.fundo_tipo === 'color' 
          ? settings.fundo_valor 
          : settings.fundo_tipo === 'gradient'
          ? settings.fundo_valor
          : undefined,
        backgroundImage: settings.fundo_tipo === 'image' 
          ? `url(${settings.fundo_valor})` 
          : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        fontSize: `${12 * fontScale}px`,
      }}
    >
      {/* Offline Overlay */}
      {isOffline && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg p-6 text-center max-w-xs">
            <WifiOff className="h-12 w-12 mx-auto mb-4 text-destructive" />
            <p className="font-semibold mb-2">Sem Conexão</p>
            <p className="text-sm text-muted-foreground">
              Modo offline simulado
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <header 
        className={cn(
          "flex items-center justify-between p-2 border-b",
          settings.tema_kiosk === 'dark' ? 'bg-gray-800/90 border-gray-700' : 'bg-white/90 border-gray-200'
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-2">
          {settings.logo_url ? (
            <img 
              src={settings.logo_url} 
              alt="Logo" 
              className={cn(
                "object-contain",
                settings.logo_animacao === 'pulse' && 'animate-pulse'
              )}
              style={{ height: 28 * scale * 2 }}
            />
          ) : (
            <div 
              className="rounded-lg bg-primary/20 flex items-center justify-center"
              style={{ width: 28 * scale * 2, height: 28 * scale * 2 }}
            >
              <Monitor className="text-primary" style={{ width: 14 * scale * 2, height: 14 * scale * 2 }} />
            </div>
          )}
        </div>

        {/* Nav Items */}
        <nav className="flex items-center gap-1">
          {availableModules.map(({ key, path, label }) => {
            const isActive = currentRoute.startsWith(path);
            const Icon = MODULE_ICONS[key as keyof typeof MODULE_ICONS] || Monitor;
            
            return (
              <button
                key={key}
                onClick={() => onNavigate(path)}
                className={cn(
                  "flex items-center gap-1 px-2 py-1 rounded transition-colors",
                  isActive 
                    ? 'bg-primary text-primary-foreground' 
                    : settings.tema_kiosk === 'dark'
                    ? 'text-gray-300 hover:bg-gray-700'
                    : 'text-gray-600 hover:bg-gray-100'
                )}
                style={{
                  padding: `${4 * touchScale}px ${8 * touchScale}px`,
                  fontSize: `${10 * fontScale}px`,
                }}
              >
                <Icon style={{ width: 12 * touchScale, height: 12 * touchScale }} />
                <span className="hidden sm:inline">{label}</span>
              </button>
            );
          })}
        </nav>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4 overflow-auto">
        {isHome ? (
          <KioskHomePreview 
            settings={settings}
            modules={availableModules}
            onNavigate={onNavigate}
            touchScale={touchScale}
            fontScale={fontScale}
          />
        ) : (
          <KioskModulePreview
            module={activeModule}
            settings={settings}
            onBack={() => onNavigate('/kiosk')}
            touchScale={touchScale}
            fontScale={fontScale}
          />
        )}
      </main>
    </div>
  );
}

/**
 * Home screen preview
 */
interface KioskHomePreviewProps {
  settings: ReturnType<typeof useKioskSettings>['settings'];
  modules: { key: string; path: string; label: string }[];
  onNavigate: (route: string) => void;
  touchScale: number;
  fontScale: number;
}

function KioskHomePreview({ settings, modules, onNavigate, touchScale, fontScale }: KioskHomePreviewProps) {
  const moduleColors: Record<string, string> = {
    kiosk_caixa: 'bg-green-500/10 text-green-500 border-green-500/20',
    kiosk_agenda: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    kiosk_ponto: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
    kiosk_espelho: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  };

  return (
    <div className="flex flex-col items-center justify-center text-center w-full max-w-lg">
      {/* Logo */}
      <div className="mb-6">
        {settings.logo_url ? (
          <img 
            src={settings.logo_url} 
            alt="Logo" 
            className={cn(
              "object-contain mx-auto",
              settings.logo_animacao === 'pulse' && 'animate-pulse'
            )}
            style={{ height: 60 }}
          />
        ) : (
          <div 
            className="rounded-2xl bg-primary/10 flex items-center justify-center mx-auto"
            style={{ width: 60, height: 60 }}
          >
            <Monitor className="text-primary" style={{ width: 30, height: 30 }} />
          </div>
        )}
      </div>

      {/* Module Grid */}
      <div className={cn(
        "grid gap-3 w-full",
        modules.length <= 2 ? 'grid-cols-2' : 'grid-cols-2'
      )}>
        {modules.map(({ key, path, label }) => {
          const Icon = MODULE_ICONS[key as keyof typeof MODULE_ICONS] || Monitor;
          const colorClass = moduleColors[key] || 'bg-primary/10 text-primary border-primary/20';
          
          return (
            <button
              key={key}
              onClick={() => onNavigate(path)}
              className={cn(
                "flex flex-col items-center justify-center p-4 rounded-xl border transition-all hover:scale-105",
                colorClass,
                settings.tema_kiosk === 'dark' ? 'bg-opacity-20' : 'bg-opacity-10'
              )}
              style={{
                padding: `${16 * touchScale}px`,
              }}
            >
              <Icon style={{ width: 24 * touchScale, height: 24 * touchScale }} className="mb-2" />
              <span 
                className="font-medium"
                style={{ fontSize: `${12 * fontScale}px` }}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Hint */}
      <p 
        className={cn(
          "mt-6 flex items-center gap-1",
          settings.tema_kiosk === 'dark' ? 'text-gray-400' : 'text-gray-500'
        )}
        style={{ fontSize: `${10 * fontScale}px` }}
      >
        Toque em um módulo para começar
        <ChevronRight style={{ width: 12, height: 12 }} className="animate-pulse" />
      </p>
    </div>
  );
}

/**
 * Module screen preview
 */
interface KioskModulePreviewProps {
  module?: { key: string; path: string; label: string };
  settings: ReturnType<typeof useKioskSettings>['settings'];
  onBack: () => void;
  touchScale: number;
  fontScale: number;
}

function KioskModulePreview({ module, settings, onBack, touchScale, fontScale }: KioskModulePreviewProps) {
  if (!module) {
    return (
      <div className="text-center">
        <p className="text-muted-foreground">Módulo não encontrado</p>
        <Button variant="outline" size="sm" onClick={onBack} className="mt-4">
          Voltar
        </Button>
      </div>
    );
  }

  const Icon = MODULE_ICONS[module.key as keyof typeof MODULE_ICONS] || Monitor;

  // Module-specific placeholder content
  const renderModuleContent = () => {
    switch (module.key) {
      case 'kiosk_caixa':
        return (
          <div className="space-y-3 w-full max-w-xs">
            <div className={cn(
              "p-3 rounded-lg border",
              settings.tema_kiosk === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
            )}>
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="text-2xl font-bold">R$ 0,00</p>
            </div>
            <div className={cn(
              "p-3 rounded-lg border text-center",
              settings.tema_kiosk === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
            )}>
              <p className="text-sm text-muted-foreground">Nenhum item adicionado</p>
            </div>
          </div>
        );
      case 'kiosk_agenda':
        return (
          <div className="space-y-2 w-full max-w-xs">
            {[1, 2, 3].map(i => (
              <div 
                key={i}
                className={cn(
                  "p-2 rounded-lg border",
                  settings.tema_kiosk === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                )}
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary/20" />
                  <div className="flex-1">
                    <div className="h-2 bg-muted rounded w-3/4" />
                    <div className="h-2 bg-muted rounded w-1/2 mt-1" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        );
      case 'kiosk_ponto':
        return (
          <div className="text-center space-y-4 w-full max-w-xs">
            <div className="grid grid-cols-2 gap-2">
              {['entrada', 'saída', 'almoço', 'retorno'].map(tipo => (
                <button
                  key={tipo}
                  className={cn(
                    "p-3 rounded-lg border font-medium capitalize",
                    settings.tema_kiosk === 'dark' 
                      ? 'bg-gray-800 border-gray-700 hover:bg-gray-700' 
                      : 'bg-white border-gray-200 hover:bg-gray-50'
                  )}
                  style={{ fontSize: `${11 * fontScale}px` }}
                >
                  {tipo}
                </button>
              ))}
            </div>
          </div>
        );
      case 'kiosk_espelho':
        return (
          <div className="text-center space-y-4 w-full max-w-xs">
            <div className={cn(
              "p-6 rounded-lg border",
              settings.tema_kiosk === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
            )}>
              <Monitor className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Espelho do Cliente</p>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col items-center justify-center w-full h-full">
      {/* Module Header */}
      <div className="flex items-center gap-2 mb-6">
        <div className="p-2 rounded-lg bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <h2 
          className="font-semibold"
          style={{ fontSize: `${14 * fontScale}px` }}
        >
          {module.label}
        </h2>
      </div>

      {/* Module Content */}
      {renderModuleContent()}

      {/* Back Button */}
      <button
        onClick={onBack}
        className={cn(
          "mt-6 px-4 py-2 rounded-lg text-sm transition-colors",
          settings.tema_kiosk === 'dark' 
            ? 'bg-gray-800 hover:bg-gray-700 text-gray-300' 
            : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
        )}
        style={{ 
          padding: `${8 * touchScale}px ${16 * touchScale}px`,
          fontSize: `${10 * fontScale}px`
        }}
      >
        ← Voltar ao Menu
      </button>
    </div>
  );
}
