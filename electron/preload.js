const { contextBridge, ipcRenderer } = require('electron')

// Expor APIs seguras para o frontend
contextBridge.exposeInMainWorld('electron', {
  // Verificar se é Electron
  isElectron: true,
  
  // Informações da aplicação
  getAppVersion: () => ipcRenderer.invoke('app-version'),
  getAppName: () => ipcRenderer.invoke('app-name'),
  getPlatform: () => ipcRenderer.invoke('get-platform'),
  isDev: () => ipcRenderer.invoke('is-dev'),
  
  // Kiosk mode persistence
  setKioskEnabled: (enabled) => ipcRenderer.invoke('set-kiosk-enabled', enabled),
  getKioskEnabled: () => ipcRenderer.invoke('get-kiosk-enabled'),
  
  // Atualização automática
  checkForUpdates: () => ipcRenderer.invoke('check-updates'),
  downloadUpdate: () => ipcRenderer.invoke('download-update'),
  installUpdate: () => ipcRenderer.invoke('install-update'),
  
  // Listeners de eventos de atualização
  onUpdateAvailable: (callback) => {
    ipcRenderer.on('update-available', (_event, info) => callback(info))
  },
  onUpdateProgress: (callback) => {
    ipcRenderer.on('update-progress', (_event, progress) => callback(progress))
  },
  onUpdateDownloaded: (callback) => {
    ipcRenderer.on('update-downloaded', (_event, info) => callback(info))
  },
  onUpdateError: (callback) => {
    ipcRenderer.on('update-error', (_event, error) => callback(error))
  },
  
  // Remover listeners
  removeUpdateListeners: () => {
    ipcRenderer.removeAllListeners('update-available')
    ipcRenderer.removeAllListeners('update-progress')
    ipcRenderer.removeAllListeners('update-downloaded')
    ipcRenderer.removeAllListeners('update-error')
  }
})

// Log para confirmar que preload foi carregado
console.log('Preload script carregado - Electron API disponível')
