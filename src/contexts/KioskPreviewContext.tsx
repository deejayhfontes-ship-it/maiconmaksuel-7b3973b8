/**
 * Kiosk Preview Context
 * Provides a sandboxed environment for previewing kiosk settings
 * without affecting production state
 */

import { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';
import { KioskSettings, KioskRoutesEnabled } from '@/hooks/useKioskSettings';

export interface PreviewDevice {
  id: string;
  name: string;
  width: number;
  height: number;
  orientation: 'landscape' | 'portrait';
}

export const PREVIEW_DEVICES: PreviewDevice[] = [
  { id: 'tablet-landscape', name: 'Tablet (Landscape)', width: 1024, height: 768, orientation: 'landscape' },
  { id: 'tablet-portrait', name: 'Tablet (Portrait)', width: 768, height: 1024, orientation: 'portrait' },
  { id: 'kiosk-fullhd', name: 'Kiosk Full HD', width: 1920, height: 1080, orientation: 'landscape' },
  { id: 'kiosk-vertical', name: 'Kiosk Vertical', width: 1080, height: 1920, orientation: 'portrait' },
  { id: 'mobile', name: 'Mobile', width: 375, height: 812, orientation: 'portrait' },
];

interface PreviewState {
  isPreviewMode: boolean;
  currentRoute: string;
  isOffline: boolean;
  isFullscreen: boolean;
  device: PreviewDevice;
  scale: number;
}

interface KioskPreviewContextType {
  // Preview state
  previewState: PreviewState;
  // Settings override (for real-time preview)
  previewSettings: Partial<KioskSettings> | null;
  // Actions
  startPreview: () => void;
  stopPreview: () => void;
  setPreviewRoute: (route: string) => void;
  toggleOfflineSimulation: () => void;
  toggleFullscreenSimulation: () => void;
  setDevice: (device: PreviewDevice) => void;
  setScale: (scale: number) => void;
  restartPreview: () => void;
  applySettingsToPreview: (settings: Partial<KioskSettings>) => void;
  // Helpers
  isRouteEnabled: (routeKey: keyof KioskRoutesEnabled) => boolean;
}

const defaultDevice = PREVIEW_DEVICES[0];

const defaultPreviewState: PreviewState = {
  isPreviewMode: false,
  currentRoute: '/kiosk',
  isOffline: false,
  isFullscreen: false,
  device: defaultDevice,
  scale: 0.5,
};

const KioskPreviewContext = createContext<KioskPreviewContextType | undefined>(undefined);

export function KioskPreviewProvider({ 
  children,
  liveSettings,
}: { 
  children: ReactNode;
  liveSettings: KioskSettings;
}) {
  const [previewState, setPreviewState] = useState<PreviewState>(defaultPreviewState);
  const [previewSettings, setPreviewSettings] = useState<Partial<KioskSettings> | null>(null);

  // Merged settings (live + overrides)
  const effectiveSettings = useMemo(() => {
    return { ...liveSettings, ...previewSettings };
  }, [liveSettings, previewSettings]);

  const startPreview = useCallback(() => {
    setPreviewState(prev => ({ ...prev, isPreviewMode: true, currentRoute: '/kiosk' }));
  }, []);

  const stopPreview = useCallback(() => {
    setPreviewState(defaultPreviewState);
    setPreviewSettings(null);
  }, []);

  const setPreviewRoute = useCallback((route: string) => {
    setPreviewState(prev => ({ ...prev, currentRoute: route }));
  }, []);

  const toggleOfflineSimulation = useCallback(() => {
    setPreviewState(prev => ({ ...prev, isOffline: !prev.isOffline }));
  }, []);

  const toggleFullscreenSimulation = useCallback(() => {
    setPreviewState(prev => ({ ...prev, isFullscreen: !prev.isFullscreen }));
  }, []);

  const setDevice = useCallback((device: PreviewDevice) => {
    setPreviewState(prev => ({ ...prev, device }));
  }, []);

  const setScale = useCallback((scale: number) => {
    setPreviewState(prev => ({ ...prev, scale: Math.max(0.25, Math.min(1, scale)) }));
  }, []);

  const restartPreview = useCallback(() => {
    setPreviewState(prev => ({ 
      ...prev, 
      currentRoute: '/kiosk',
      isOffline: false,
    }));
  }, []);

  const applySettingsToPreview = useCallback((settings: Partial<KioskSettings>) => {
    setPreviewSettings(prev => ({ ...prev, ...settings }));
  }, []);

  const isRouteEnabled = useCallback((routeKey: keyof KioskRoutesEnabled): boolean => {
    return effectiveSettings.rotas_habilitadas?.[routeKey] ?? true;
  }, [effectiveSettings]);

  const contextValue: KioskPreviewContextType = {
    previewState,
    previewSettings: effectiveSettings as Partial<KioskSettings>,
    startPreview,
    stopPreview,
    setPreviewRoute,
    toggleOfflineSimulation,
    toggleFullscreenSimulation,
    setDevice,
    setScale,
    restartPreview,
    applySettingsToPreview,
    isRouteEnabled,
  };

  return (
    <KioskPreviewContext.Provider value={contextValue}>
      {children}
    </KioskPreviewContext.Provider>
  );
}

export function useKioskPreview() {
  const context = useContext(KioskPreviewContext);
  if (context === undefined) {
    throw new Error('useKioskPreview must be used within a KioskPreviewProvider');
  }
  return context;
}
