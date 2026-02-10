interface UpdateInfo {
  version: string
  releaseDate: string
  releaseName?: string
  releaseNotes?: string
}

interface ProgressInfo {
  total: number
  delta: number
  transferred: number
  percent: number
  bytesPerSecond: number
}

interface ElectronAPI {
  isElectron: boolean
  getAppVersion: () => Promise<string>
  getAppName: () => Promise<string>
  getPlatform: () => Promise<string>
  isDev: () => Promise<boolean>
  checkForUpdates: () => Promise<any>
  downloadUpdate: () => Promise<void>
  installUpdate: () => Promise<void>
  setKioskEnabled: (enabled: boolean) => Promise<boolean>
  getKioskEnabled: () => Promise<boolean>
  setStartMode: (mode: 'admin' | 'kiosk') => Promise<boolean>
  getStartMode: () => Promise<string>
  openKioskWindow: () => Promise<void>
  closeKioskWindow: () => Promise<void>
  toggleKioskFullscreen: () => Promise<void>
  onUpdateAvailable: (callback: (info: UpdateInfo) => void) => void
  onUpdateProgress: (callback: (progress: ProgressInfo) => void) => void
  onUpdateDownloaded: (callback: (info: UpdateInfo) => void) => void
  onUpdateError: (callback: (error: string) => void) => void
  removeUpdateListeners: () => void
}

declare global {
  interface Window {
    electron?: ElectronAPI
  }
}

export {}
