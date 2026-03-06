const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electron', {
    // === Auto-Update Events ===
    onUpdateAvailable: (callback) => ipcRenderer.on('update-available', (_, info) => callback(info)),
    onUpdateProgress: (callback) => ipcRenderer.on('update-progress', (_, progress) => callback(progress)),
    onUpdateDownloaded: (callback) => ipcRenderer.on('update-downloaded', (_, info) => callback(info)),
    onUpdateError: (callback) => ipcRenderer.on('update-error', (_, error) => callback(error)),
    onUpdateNotAvailable: (callback) => ipcRenderer.on('update-not-available', (_, info) => callback(info)),

    // Remove listeners to avoid memory leaks
    removeUpdateListeners: () => {
        ipcRenderer.removeAllListeners('update-available')
        ipcRenderer.removeAllListeners('update-progress')
        ipcRenderer.removeAllListeners('update-downloaded')
        ipcRenderer.removeAllListeners('update-error')
        ipcRenderer.removeAllListeners('update-not-available')
    },

    // === Auto-Update Actions ===
    checkForUpdates: () => ipcRenderer.invoke('check-updates'),
    downloadUpdate: () => ipcRenderer.invoke('download-update'),
    installUpdate: () => ipcRenderer.invoke('install-update'),

    // === Kiosk Configuration ===
    getKioskEnabled: () => ipcRenderer.invoke('get-kiosk-enabled'),
    setKioskEnabled: (enabled) => ipcRenderer.invoke('set-kiosk-enabled', enabled),

    // === Kiosk Secondary Window ===
    openKioskWindow: () => ipcRenderer.invoke('kiosk-open'),
    closeKioskWindow: () => ipcRenderer.invoke('kiosk-close'),
    isKioskWindowOpen: () => ipcRenderer.invoke('kiosk-is-open'),
    setKioskFullscreen: (enabled) => ipcRenderer.invoke('kiosk-set-fullscreen', enabled),
    toggleKioskFullscreen: () => ipcRenderer.invoke('kiosk-toggle-fullscreen'),

    // === Kiosk Escape Hatch ===
    onKioskEscapeTrigger: (callback) => ipcRenderer.on('trigger-kiosk-escape', () => callback()),
    removeKioskEscapeListener: () => ipcRenderer.removeAllListeners('trigger-kiosk-escape'),
    exitKioskMode: () => ipcRenderer.invoke('exit-kiosk-mode'),

    // === Utils & Platform ===
    getAppVersion: () => ipcRenderer.invoke('app-version'),
    getAppName: () => ipcRenderer.invoke('app-name'),
    getPlatform: () => process.platform,
    isDev: () => ipcRenderer.invoke('is-dev'),
    isElectron: true
})
