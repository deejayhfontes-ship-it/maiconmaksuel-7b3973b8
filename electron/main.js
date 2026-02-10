const { app, BrowserWindow, ipcMain, Menu, shell } = require('electron')
const path = require('path')
const { autoUpdater } = require('electron-updater')
const Store = require('electron-store')

// Persistent settings store
const store = new Store({
  defaults: {
    kioskEnabled: false,
  }
})

// Detectar se está em desenvolvimento
const isDev = !app.isPackaged

let mainWindow

// Configurar auto-updater
autoUpdater.autoDownload = false
autoUpdater.autoInstallOnAppQuit = true

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: true
    },
    title: 'MAICON MAKSUEL GESTÃO',
    icon: path.join(__dirname, '../build/icon.png'),
    backgroundColor: '#ffffff',
    show: false,
    frame: true,
    titleBarStyle: 'default'
  })

  // Carregar aplicação — rota baseada na flag kioskEnabled
  const kioskEnabled = store.get('kioskEnabled', false)

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
  } else {
    const hash = kioskEnabled ? '/kiosk' : '/login'
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'), { hash })
  }

  // Mostrar quando pronto
  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
    
    // Verificar atualizações (apenas em produção)
    if (!isDev) {
      autoUpdater.checkForUpdates()
    }
  })

  // DevTools apenas em desenvolvimento
  if (isDev) {
    mainWindow.webContents.openDevTools()
  }

  // Abrir links externos no navegador padrão
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  // Remover menu padrão em produção
  if (!isDev) {
    Menu.setApplicationMenu(null)
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// Criar janela quando app estiver pronto
app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

// Fechar app quando todas janelas forem fechadas
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// Auto-updater events
autoUpdater.on('checking-for-update', () => {
  console.log('Verificando atualizações...')
})

autoUpdater.on('update-available', (info) => {
  console.log('Atualização disponível:', info.version)
  if (mainWindow) {
    mainWindow.webContents.send('update-available', info)
  }
})

autoUpdater.on('update-not-available', () => {
  console.log('Nenhuma atualização disponível')
})

autoUpdater.on('download-progress', (progressObj) => {
  if (mainWindow) {
    mainWindow.webContents.send('update-progress', progressObj)
  }
})

autoUpdater.on('update-downloaded', (info) => {
  console.log('Atualização baixada:', info.version)
  if (mainWindow) {
    mainWindow.webContents.send('update-downloaded', info)
  }
})

autoUpdater.on('error', (err) => {
  console.error('Erro no auto-updater:', err)
  if (mainWindow) {
    mainWindow.webContents.send('update-error', err.message)
  }
})

// IPC Handlers
ipcMain.handle('app-version', () => {
  return app.getVersion()
})

ipcMain.handle('app-name', () => {
  return app.getName()
})

ipcMain.handle('check-updates', async () => {
  if (!isDev) {
    try {
      return await autoUpdater.checkForUpdates()
    } catch (error) {
      console.error('Erro ao verificar atualizações:', error)
      return null
    }
  }
  return null
})

ipcMain.handle('download-update', () => {
  autoUpdater.downloadUpdate()
})

ipcMain.handle('install-update', () => {
  autoUpdater.quitAndInstall(false, true)
})

ipcMain.handle('get-platform', () => {
  return process.platform
})

ipcMain.handle('is-dev', () => {
  return isDev
})

// Kiosk mode persistence
ipcMain.handle('set-kiosk-enabled', (_event, enabled) => {
  store.set('kioskEnabled', !!enabled)
  return true
})

ipcMain.handle('get-kiosk-enabled', () => {
  return store.get('kioskEnabled', false)
})

// Kiosk 2nd window
let kioskWindow = null

ipcMain.handle('open-kiosk-window', () => {
  if (kioskWindow && !kioskWindow.isDestroyed()) {
    kioskWindow.focus()
    return
  }

  kioskWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: true
    },
    title: 'Kiosk - MAICON MAKSUEL',
    icon: path.join(__dirname, '../build/icon.png'),
    backgroundColor: '#ffffff',
    show: false,
    frame: true,
  })

  if (isDev) {
    kioskWindow.loadURL('http://localhost:5173/#/kiosk')
  } else {
    kioskWindow.loadFile(path.join(__dirname, '../dist/index.html'), { hash: '/kiosk' })
  }

  kioskWindow.once('ready-to-show', () => {
    kioskWindow.show()
  })

  kioskWindow.on('closed', () => {
    kioskWindow = null
  })

  if (!isDev) {
    kioskWindow.setMenu(null)
  }
})

ipcMain.handle('close-kiosk-window', () => {
  if (kioskWindow && !kioskWindow.isDestroyed()) {
    kioskWindow.close()
    kioskWindow = null
  }
})

ipcMain.handle('toggle-kiosk-fullscreen', () => {
  if (kioskWindow && !kioskWindow.isDestroyed()) {
    kioskWindow.setFullScreen(!kioskWindow.isFullScreen())
  }
})
