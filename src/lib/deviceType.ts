/**
 * Device type detection and access control utilities
 * Distinguishes between kiosk mode (tablet/touch) and notebook/desktop mode
 */

export type DeviceType = 'kiosk' | 'notebook' | 'mobile';

export interface DeviceInfo {
  type: DeviceType;
  isTouch: boolean;
  isFullscreen: boolean;
  screenWidth: number;
  screenHeight: number;
  userAgent: string;
}

/**
 * Detect if the device is in kiosk mode (tablet/touch-based POS)
 */
export function isKioskMode(): boolean {
  // Check localStorage for explicit kiosk mode setting
  const kioskSetting = localStorage.getItem('mm-device-mode');
  if (kioskSetting === 'kiosk') return true;
  if (kioskSetting === 'notebook') return false;
  
  // Auto-detect based on device characteristics
  const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const isFullscreen = !!document.fullscreenElement;
  const isTabletSize = window.innerWidth >= 768 && window.innerWidth <= 1366;
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
  
  // Consider kiosk if: touch device + tablet size OR fullscreen + touch
  return (isTouch && isTabletSize) || (isFullscreen && isTouch) || isStandalone;
}

/**
 * Detect if the device is a mobile phone (not for cash register use)
 */
export function isMobileDevice(): boolean {
  const width = window.innerWidth;
  return width < 768;
}

/**
 * Detect if the device is a notebook/desktop
 */
export function isNotebookMode(): boolean {
  return !isKioskMode() && !isMobileDevice();
}

/**
 * Get comprehensive device information
 */
export function getDeviceInfo(): DeviceInfo {
  const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const isFullscreen = !!document.fullscreenElement;
  
  let type: DeviceType = 'notebook';
  if (isMobileDevice()) {
    type = 'mobile';
  } else if (isKioskMode()) {
    type = 'kiosk';
  }
  
  return {
    type,
    isTouch,
    isFullscreen,
    screenWidth: window.innerWidth,
    screenHeight: window.innerHeight,
    userAgent: navigator.userAgent,
  };
}

/**
 * Set device mode explicitly (persisted to localStorage)
 */
export function setDeviceMode(mode: 'kiosk' | 'notebook' | 'auto'): void {
  if (mode === 'auto') {
    localStorage.removeItem('mm-device-mode');
  } else {
    localStorage.setItem('mm-device-mode', mode);
  }
  // Dispatch event for components to react
  window.dispatchEvent(new CustomEvent('device-mode-changed', { detail: mode }));
}

/**
 * Get the current device mode setting
 */
export function getDeviceModeSetting(): 'kiosk' | 'notebook' | 'auto' {
  const setting = localStorage.getItem('mm-device-mode');
  if (setting === 'kiosk' || setting === 'notebook') return setting;
  return 'auto';
}

/**
 * Check if a feature is allowed on the current device type
 */
export function isFeatureAllowed(feature: CaixaFeature): boolean {
  const deviceType = getDeviceInfo().type;
  
  // Features allowed per device type
  const permissions: Record<CaixaFeature, DeviceType[]> = {
    'abrir-caixa': ['notebook'], // Only managers on notebook can open
    'fechar-caixa': ['notebook'], // Only managers on notebook can close
    'sangria': ['notebook', 'kiosk'], // Both can do cash withdrawal
    'reforco': ['notebook'], // Only notebook for cash reinforcement
    'despesa-rapida': ['notebook', 'kiosk'], // Both can register expenses
    'ver-extrato': ['notebook', 'kiosk'], // Both can view statement
    'ver-gaveta': ['notebook', 'kiosk'], // Both can view drawer
    'atendimento': ['notebook', 'kiosk'], // Both can create orders
    'receber-pagamento': ['notebook', 'kiosk'], // Both can receive payments
    'cancelar-atendimento': ['notebook'], // Only notebook can cancel
    'editar-movimentacao': ['notebook'], // Only notebook can edit
    'ver-comissoes': ['notebook'], // Only notebook can see commissions
    'cheques': ['notebook'], // Only notebook can manage checks
    'ponto-eletronico': ['kiosk'], // Only kiosk for time clock
  };
  
  return permissions[feature]?.includes(deviceType) ?? false;
}

export type CaixaFeature = 
  | 'abrir-caixa'
  | 'fechar-caixa'
  | 'sangria'
  | 'reforco'
  | 'despesa-rapida'
  | 'ver-extrato'
  | 'ver-gaveta'
  | 'atendimento'
  | 'receber-pagamento'
  | 'cancelar-atendimento'
  | 'editar-movimentacao'
  | 'ver-comissoes'
  | 'cheques'
  | 'ponto-eletronico';
