/**
 * Kiosk Live Preview Component - Modern Premium Design
 * Real-time sandboxed preview of the kiosk interface
 */

import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useKioskSettings } from "@/hooks/useKioskSettings";
import { useSalonSettings } from "@/contexts/SalonSettingsContext";
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
  ZoomIn,
  ZoomOut,
  Play,
  Square,
  Fingerprint,
  Clock,
  Check,
  Receipt,
  Heart,
  Sparkles,
  AlertCircle
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// Device presets
const PREVIEW_DEVICES = [
  { id: 'tablet-landscape', name: 'Tablet (Landscape)', width: 1024, height: 768, icon: Tablet },
  { id: 'tablet-portrait', name: 'Tablet (Portrait)', width: 768, height: 1024, icon: Tablet },
  { id: 'kiosk-fullhd', name: 'Kiosk Full HD', width: 1920, height: 1080, icon: Monitor },
  { id: 'kiosk-vertical', name: 'Kiosk Vertical', width: 1080, height: 1920, icon: Monitor },
  { id: 'mobile', name: 'Mobile', width: 375, height: 812, icon: Smartphone },
];

// Preview states
type PreviewKioskState = 'idle' | 'ponto' | 'comanda' | 'thankyou';

interface PreviewState {
  isRunning: boolean;
  kioskState: PreviewKioskState;
  isOffline: boolean;
  isFullscreenSim: boolean;
  deviceId: string;
  scale: number;
}

export default function KioskLivePreview() {
  const { settings } = useKioskSettings();
  const { salonData } = useSalonSettings();
  
  const [previewState, setPreviewState] = useState<PreviewState>({
    isRunning: false,
    kioskState: 'idle',
    isOffline: false,
    isFullscreenSim: false,
    deviceId: 'tablet-landscape',
    scale: 0.5,
  });

  const currentDevice = useMemo(() => 
    PREVIEW_DEVICES.find(d => d.id === previewState.deviceId) || PREVIEW_DEVICES[0],
    [previewState.deviceId]
  );

  // Logo URL - prioritize kiosk settings, fallback to salon
  const logoUrl = settings.logo_url || salonData?.logo_url;
  const salonName = salonData?.nome_salao || "Salão de Beleza";

  // State handlers
  const togglePreview = useCallback(() => {
    setPreviewState(prev => ({
      ...prev,
      isRunning: !prev.isRunning,
      kioskState: 'idle',
    }));
  }, []);

  const setKioskState = useCallback((state: PreviewKioskState) => {
    setPreviewState(prev => ({ ...prev, kioskState: state }));
  }, []);

  const restartPreview = useCallback(() => {
    setPreviewState(prev => ({
      ...prev,
      kioskState: 'idle',
      isOffline: false,
    }));
  }, []);

  const toggleOffline = useCallback(() => {
    setPreviewState(prev => ({ ...prev, isOffline: !prev.isOffline }));
  }, []);

  const toggleFullscreenSim = useCallback(() => {
    setPreviewState(prev => ({ ...prev, isFullscreenSim: !prev.isFullscreenSim }));
  }, []);

  const changeDevice = useCallback((deviceId: string) => {
    setPreviewState(prev => ({ ...prev, deviceId }));
  }, []);

  const changeScale = useCallback((value: number[]) => {
    setPreviewState(prev => ({ ...prev, scale: value[0] }));
  }, []);

  // Calculate preview dimensions
  const previewDimensions = useMemo(() => {
    const width = currentDevice.width * previewState.scale;
    const height = currentDevice.height * previewState.scale;
    return { width, height };
  }, [currentDevice, previewState.scale]);

  const stateButtons: { state: PreviewKioskState; label: string; color: string }[] = [
    { state: 'idle', label: 'Espera', color: 'bg-blue-500' },
    { state: 'ponto', label: 'Ponto', color: 'bg-orange-500' },
    { state: 'comanda', label: 'Comanda', color: 'bg-green-500' },
    { state: 'thankyou', label: 'Obrigado', color: 'bg-pink-500' },
  ];

  return (
    <div className="space-y-4">
      {/* Header Card */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Kiosk Live Preview
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

            {/* State Switcher */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Estado</label>
              <div className="flex flex-wrap gap-1">
                {stateButtons.map(({ state, label, color }) => (
                  <Button
                    key={state}
                    variant={previewState.kioskState === state ? "default" : "outline"}
                    size="sm"
                    onClick={() => setKioskState(state)}
                    disabled={!previewState.isRunning}
                    className="text-xs px-2"
                  >
                    {label}
                  </Button>
                ))}
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
                  variant="outline"
                  size="sm"
                  onClick={restartPreview}
                  disabled={!previewState.isRunning}
                  className="gap-1"
                >
                  <RefreshCw className="h-4 w-4" />
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
                <Badge variant="secondary">
                  Estado: {stateButtons.find(s => s.state === previewState.kioskState)?.label}
                </Badge>
                {previewState.isOffline && (
                  <Badge variant="destructive" className="gap-1">
                    <WifiOff className="h-3 w-3" />
                    Modo Offline
                  </Badge>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleFullscreenSim}
              >
                {previewState.isFullscreenSim ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </Button>
            </div>

            {/* Preview Container */}
            <div className="flex justify-center overflow-auto py-4 bg-gray-100 rounded-lg">
              <div
                className="relative bg-white rounded-2xl shadow-2xl overflow-hidden border-4 border-gray-200"
                style={{
                  width: previewDimensions.width,
                  height: previewDimensions.height,
                  minWidth: previewDimensions.width,
                }}
              >
                {/* Preview Content - Sandbox Render */}
                <KioskPreviewRenderer
                  settings={settings}
                  kioskState={previewState.kioskState}
                  isOffline={previewState.isOffline}
                  logoUrl={logoUrl}
                  salonName={salonName}
                  scale={previewState.scale}
                  onNavigate={setKioskState}
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
                <li>• Use os botões de estado para simular diferentes telas</li>
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
 * Kiosk Preview Renderer - Modern Premium Design
 */
interface KioskPreviewRendererProps {
  settings: ReturnType<typeof useKioskSettings>['settings'];
  kioskState: PreviewKioskState;
  isOffline: boolean;
  logoUrl: string | null | undefined;
  salonName: string;
  scale: number;
  onNavigate: (state: PreviewKioskState) => void;
}

function KioskPreviewRenderer({ 
  settings, 
  kioskState, 
  isOffline,
  logoUrl,
  salonName,
  scale,
  onNavigate,
}: KioskPreviewRendererProps) {
  const fontScale = settings.tipografia_grande ? 1.15 : 1;
  const touchScale = settings.alvos_touch_grandes ? 1.25 : 1;
  const currentTime = new Date();

  // Background style
  const getBackgroundStyle = (): React.CSSProperties => {
    if (settings.fundo_tipo === 'color' && settings.fundo_valor) {
      return { backgroundColor: settings.fundo_valor };
    }
    if (settings.fundo_tipo === 'gradient' && settings.fundo_valor) {
      return { background: settings.fundo_valor };
    }
    if (settings.fundo_tipo === 'image' && settings.fundo_valor) {
      return {
        backgroundImage: `url(${settings.fundo_valor})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      };
    }
    return {};
  };

  const hasCustomBg = settings.fundo_valor && settings.fundo_tipo !== 'color';

  return (
    <div
      className={cn(
        "h-full flex flex-col relative",
        settings.tema_kiosk === 'dark' 
          ? 'bg-gray-900 text-white' 
          : !hasCustomBg && 'bg-gradient-to-br from-white via-gray-50 to-white text-gray-900'
      )}
      style={{
        ...getBackgroundStyle(),
        fontSize: `${12 * fontScale}px`,
      }}
    >
      {/* Offline Overlay */}
      {isOffline && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 text-center max-w-xs shadow-2xl">
            <WifiOff className="h-12 w-12 mx-auto mb-4 text-red-500" />
            <p className="font-bold text-gray-900 mb-2">Sem Conexão</p>
            <p className="text-sm text-gray-500">
              Modo offline simulado
            </p>
          </div>
        </div>
      )}

      {/* IDLE STATE */}
      {kioskState === 'idle' && (
        <div className="h-full flex flex-col items-center justify-center p-6">
          {/* Background elements */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-50">
            <div className="absolute top-1/4 -left-10 w-40 h-40 bg-primary/5 rounded-full blur-3xl" />
            <div className="absolute bottom-1/4 -right-10 w-32 h-32 bg-primary/3 rounded-full blur-3xl" />
          </div>

          {/* Logo */}
          <div className="relative z-10 mb-6">
            {logoUrl ? (
              <img 
                src={logoUrl} 
                alt={salonName}
                className={cn(
                  "h-20 w-auto rounded-2xl shadow-lg object-contain",
                  settings.logo_animacao === 'pulse' && 'animate-pulse'
                )}
              />
            ) : (
              <div className="flex flex-col items-center">
                <div className="h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center shadow-lg mb-2">
                  <Sparkles className="h-10 w-10 text-primary" />
                </div>
                <div className="flex items-center gap-1 px-2 py-1 bg-yellow-100 rounded text-[8px] text-yellow-700">
                  <AlertCircle className="h-2 w-2" />
                  Logo não configurado
                </div>
              </div>
            )}
          </div>

          {/* Salon Name */}
          <h1 
            className="font-black text-center mb-2"
            style={{ fontSize: `${18 * fontScale}px` }}
          >
            {salonName}
          </h1>

          {/* Clock */}
          <div 
            className="font-black text-primary mb-8"
            style={{ fontSize: `${32 * fontScale}px` }}
          >
            {currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </div>

          {/* Ponto Button */}
          {settings.ponto_habilitado && (
            <button
              onClick={() => onNavigate('ponto')}
              className={cn(
                "flex items-center gap-3 px-6 py-4 rounded-xl",
                settings.tema_kiosk === 'dark'
                  ? "bg-white/10 hover:bg-white/20"
                  : "bg-white shadow-lg hover:shadow-xl border border-gray-100"
              )}
              style={{ padding: `${16 * touchScale}px ${24 * touchScale}px` }}
            >
              <div className="p-2 rounded-lg bg-primary/10">
                <Fingerprint className="h-5 w-5 text-primary" />
              </div>
              <span className="font-semibold" style={{ fontSize: `${12 * fontScale}px` }}>
                Registrar Ponto
              </span>
            </button>
          )}

          {/* Date footer */}
          <div className="absolute bottom-4 left-0 right-0 flex justify-center">
            <div 
              className={cn(
                "flex items-center gap-1 px-3 py-1 rounded-full text-[10px]",
                settings.tema_kiosk === 'dark' ? "bg-white/10 text-white/60" : "bg-white/80 text-gray-500"
              )}
            >
              <Clock className="h-2.5 w-2.5" />
              {format(currentTime, "EEEE, dd 'de' MMMM", { locale: ptBR })}
            </div>
          </div>
        </div>
      )}

      {/* PONTO STATE */}
      {kioskState === 'ponto' && (
        <div className="h-full flex flex-col p-6">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            {logoUrl && (
              <img src={logoUrl} alt="" className="h-8 w-auto rounded-lg object-contain" />
            )}
            <div>
              <h2 className="font-bold" style={{ fontSize: `${14 * fontScale}px` }}>
                Ponto Eletrônico
              </h2>
              <p className="text-[10px] opacity-60">{salonName}</p>
            </div>
          </div>

          {/* Ponto Grid */}
          <div className="flex-1 flex items-center justify-center">
            <div className="grid grid-cols-2 gap-3 w-full max-w-xs">
              {['Entrada', 'Saída', 'Almoço', 'Retorno'].map((tipo) => (
                <button
                  key={tipo}
                  className={cn(
                    "p-4 rounded-xl font-semibold transition-all",
                    settings.tema_kiosk === 'dark'
                      ? "bg-white/10 hover:bg-white/20"
                      : "bg-white shadow-md hover:shadow-lg border border-gray-100"
                  )}
                  style={{ fontSize: `${11 * fontScale}px`, padding: `${16 * touchScale}px` }}
                >
                  {tipo}
                </button>
              ))}
            </div>
          </div>

          {/* Back */}
          <button
            onClick={() => onNavigate('idle')}
            className={cn(
              "mx-auto px-4 py-2 rounded-lg text-sm opacity-60 hover:opacity-100",
              settings.tema_kiosk === 'dark' ? "text-white" : "text-gray-500"
            )}
          >
            ← Voltar
          </button>
        </div>
      )}

      {/* COMANDA STATE */}
      {kioskState === 'comanda' && (
        <div className="h-full flex flex-col p-4 bg-gradient-to-br from-gray-50 via-white to-gray-50">
          {/* Header */}
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              {logoUrl && (
                <img src={logoUrl} alt="" className="h-6 w-auto rounded-lg object-contain" />
              )}
              <span className="font-bold text-gray-900" style={{ fontSize: `${11 * fontScale}px` }}>
                {salonName}
              </span>
            </div>
            <span className="text-primary font-bold" style={{ fontSize: `${14 * fontScale}px` }}>
              {currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          {/* Card */}
          <div className="flex-1 bg-white rounded-2xl shadow-lg border border-gray-100 p-4 overflow-hidden flex flex-col">
            <div className="flex items-center gap-2 mb-4">
              <Receipt className="h-4 w-4 text-primary" />
              <h3 className="font-bold text-gray-900" style={{ fontSize: `${12 * fontScale}px` }}>
                Resumo do Atendimento
              </h3>
            </div>

            {/* Sample items */}
            <div className="flex-1 space-y-2">
              {['Corte Feminino', 'Escova', 'Hidratação'].map((item, i) => (
                <div key={i} className="flex justify-between p-2 bg-gray-50 rounded-lg">
                  <span className="text-gray-700" style={{ fontSize: `${10 * fontScale}px` }}>{item}</span>
                  <span className="font-medium text-gray-900" style={{ fontSize: `${10 * fontScale}px` }}>
                    R$ {(30 + i * 20).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            {/* Total */}
            <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center">
              <span className="font-bold text-gray-900" style={{ fontSize: `${12 * fontScale}px` }}>TOTAL</span>
              <span className="font-black text-primary" style={{ fontSize: `${20 * fontScale}px` }}>R$ 110,00</span>
            </div>
          </div>
        </div>
      )}

      {/* THANK YOU STATE */}
      {kioskState === 'thankyou' && (
        <div className="h-full flex flex-col items-center justify-center p-6 bg-gradient-to-br from-white via-green-50/30 to-white">
          {/* Success Icon */}
          <div className="relative mb-6">
            <div className="absolute inset-0 w-20 h-20 rounded-full bg-green-200 animate-ping opacity-20" />
            <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center shadow-xl">
              <Check className="h-10 w-10 text-white" strokeWidth={3} />
            </div>
          </div>

          {/* Message */}
          <h1 
            className="font-bold text-gray-900 text-center mb-2"
            style={{ fontSize: `${18 * fontScale}px` }}
          >
            Obrigado pela preferência!
          </h1>
          <p 
            className="text-gray-500 text-center mb-6"
            style={{ fontSize: `${12 * fontScale}px` }}
          >
            Volte sempre ao {salonName}
          </p>

          {/* Logo */}
          {logoUrl && (
            <img 
              src={logoUrl} 
              alt={salonName}
              className="h-10 w-auto object-contain opacity-40"
            />
          )}

          {/* Hearts */}
          <div className="mt-6 flex gap-2 opacity-30">
            <Heart className="h-4 w-4 text-pink-400 animate-pulse" fill="currentColor" />
            <Heart className="h-4 w-4 text-pink-400 animate-pulse" fill="currentColor" style={{ animationDelay: '200ms' }} />
            <Heart className="h-4 w-4 text-pink-400 animate-pulse" fill="currentColor" style={{ animationDelay: '400ms' }} />
          </div>
        </div>
      )}
    </div>
  );
}
