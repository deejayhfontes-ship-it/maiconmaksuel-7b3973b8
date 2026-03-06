const { app, BrowserWindow, ipcMain, Menu, shell, safeStorage, globalShortcut } = require('electron')
const path = require('path')
const fs = require('fs')
const { autoUpdater } = require('electron-updater')

const isDev = !app.isPackaged
let mainWindow

// Configuração do Auto-Updater
autoUpdater.autoDownload = false
autoUpdater.autoInstallOnAppQuit = true

// Caminho do arquivo de configuração
const userDataPath = app.getPath('userData')
const configPath = path.join(userDataPath, 'config.json')

// Função helper para ler config
function getConfig() {
    try {
        if (fs.existsSync(configPath)) {
            const data = fs.readFileSync(configPath)
            return JSON.parse(data)
        }
    } catch (error) {
        console.error('Erro ao ler config:', error)
    }
    return { kioskEnabled: false }
}

// Função helper para salvar config
function saveConfig(config) {
    try {
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2))
        return true
    } catch (error) {
        console.error('Erro ao salvar config:', error)
        return false
    }
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1200,
        minHeight: 700,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.cjs'),
            webSecurity: true
        },
        title: 'MAICON MAKSUEL GESTÃO',
        backgroundColor: '#ffffff',
        show: false,
        frame: true
    })

    // === LÓGICA DE CARREGAMENTO ===
    if (isDev) {
        // DEV: Carrega servidor local (Vite) — porta 8080 do projeto correto
        mainWindow.loadURL('http://localhost:8080')
        mainWindow.webContents.openDevTools()
    } else {
        // PROD: Janela principal SEMPRE inicia na rota admin (login/dashboard)
        const indexPath = path.join(__dirname, '../dist/index.html')
        console.log('[Boot] Main window loading admin route')
        mainWindow.loadFile(indexPath).catch(err => {
            console.error('Falha ao carregar index.html:', err)
        })
    }

    mainWindow.once('ready-to-show', () => {
        mainWindow.show()
        // Verifica updates silenciosamente no boot (em produção)
        if (!isDev) autoUpdater.checkForUpdates().catch(err => console.error(err))

        // Se kioskEnabled, abre automaticamente a 2ª janela kiosk
        const config = getConfig()
        if (config.kioskEnabled) {
            console.log('[Boot] kioskEnabled=true → opening secondary kiosk window')
            createKioskWindow()
        }
    })

    // Bloqueia abertura de novas janelas e redireciona externas para navegador
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        if (url.startsWith('https:') || url.startsWith('http:')) {
            shell.openExternal(url)
        }
        return { action: 'deny' }
    })

    if (!isDev) {
        Menu.setApplicationMenu(null)
    }

    mainWindow.on('closed', () => {
        mainWindow = null
    })
}

app.whenReady().then(() => {
    createWindow()
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })

    // ============================
    // ESCAPE HATCH — Global Shortcuts
    // ============================
    const triggerEscapeHatch = () => {
        console.log('[EscapeHatch] Triggered via globalShortcut')
        if (mainWindow && mainWindow.webContents) {
            mainWindow.webContents.send('trigger-kiosk-escape')
        }
        if (kioskWindow && kioskWindow.webContents) {
            kioskWindow.webContents.send('trigger-kiosk-escape')
        }
    }

    const primaryRegistered = globalShortcut.register('CommandOrControl+Shift+K', triggerEscapeHatch)
    if (!primaryRegistered) {
        console.warn('[EscapeHatch] Failed to register primary shortcut (Ctrl+Shift+K)')
    }

    const fallbackRegistered = globalShortcut.register('CommandOrControl+Alt+K', triggerEscapeHatch)
    if (!fallbackRegistered) {
        console.warn('[EscapeHatch] Failed to register fallback shortcut (Ctrl+Alt+K)')
    }

    console.log('[EscapeHatch] Shortcuts registered:', {
        primary: primaryRegistered,
        fallback: fallbackRegistered
    })
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
})

app.on('will-quit', () => {
    globalShortcut.unregisterAll()
    console.log('[EscapeHatch] All global shortcuts unregistered')
})

// ============================
// AUTO-UPDATER EVENTOS
// ============================

const forwardEvent = (eventName, ...args) => {
    if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.send(eventName, ...args)
    }
}

autoUpdater.on('checking-for-update', () => console.log('Verificando atualizações...'))
autoUpdater.on('update-available', (info) => forwardEvent('update-available', info))
autoUpdater.on('update-not-available', (info) => {
    console.log('Nenhuma atualização disponível.')
    forwardEvent('update-not-available', info)
})
autoUpdater.on('download-progress', (progress) => forwardEvent('update-progress', progress))
autoUpdater.on('update-downloaded', (info) => forwardEvent('update-downloaded', info))
autoUpdater.on('error', (err) => {
    console.error('Erro auto-updater:', err)
    forwardEvent('update-error', err.message)
})

// ============================
// IPC HANDLERS
// ============================

// Kiosk Config
ipcMain.handle('get-kiosk-enabled', () => {
    return getConfig().kioskEnabled
})

ipcMain.handle('set-kiosk-enabled', (_, enabled) => {
    const config = getConfig()
    config.kioskEnabled = !!enabled
    return saveConfig(config)
})

// Auto-Update Controls
ipcMain.handle('check-updates', async () => {
    console.log('[AutoUpdater] check-updates IPC received')
    if (!isDev) return autoUpdater.checkForUpdates()
    console.log('[AutoUpdater] Skipping in dev mode')
    return { dev: true }
})

ipcMain.handle('download-update', () => autoUpdater.downloadUpdate())
ipcMain.handle('install-update', () => autoUpdater.quitAndInstall())

// ============================
// SECONDARY KIOSK WINDOW
// ============================
let kioskWindow = null

function createKioskWindow() {
    if (kioskWindow) {
        kioskWindow.show()
        kioskWindow.focus()
        return
    }

    kioskWindow = new BrowserWindow({
        width: 1024,
        height: 768,
        minWidth: 800,
        minHeight: 600,
        frame: true,
        resizable: true,
        minimizable: true,
        maximizable: true,
        fullscreenable: true,
        show: false,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.cjs'),
            webSecurity: true
        },
        title: 'Kiosk - MAICON MAKSUEL GESTÃO',
        backgroundColor: '#ffffff'
    })

    kioskWindow.setMenuBarVisibility(false)

    if (isDev) {
        kioskWindow.loadURL('http://localhost:8080/#/kiosk')
    } else {
        const indexPath = path.join(__dirname, '../dist/index.html')
        kioskWindow.loadFile(indexPath, { hash: '#/kiosk' })
    }

    kioskWindow.once('ready-to-show', () => {
        kioskWindow.show()
    })

    kioskWindow.webContents.setWindowOpenHandler(({ url }) => {
        if (url.startsWith('https:') || url.startsWith('http:')) {
            shell.openExternal(url)
        }
        return { action: 'deny' }
    })

    kioskWindow.on('closed', () => {
        kioskWindow = null
    })
}

// IPC Handlers for Kiosk Window
ipcMain.handle('kiosk-open', () => {
    createKioskWindow()
    return true
})

ipcMain.handle('kiosk-close', () => {
    if (kioskWindow) {
        kioskWindow.close()
        return true
    }
    return false
})

ipcMain.handle('kiosk-is-open', () => !!kioskWindow)

ipcMain.handle('kiosk-set-fullscreen', (_, fullscreen) => {
    if (kioskWindow) {
        kioskWindow.setFullScreen(fullscreen)
        return true
    }
    return false
})

ipcMain.handle('kiosk-toggle-fullscreen', () => {
    if (kioskWindow) {
        kioskWindow.setFullScreen(!kioskWindow.isFullScreen())
        return kioskWindow.isFullScreen()
    }
    return false
})

// ============================
// ESCAPE HATCH — IPC Handler
// ============================
ipcMain.handle('exit-kiosk-mode', () => {
    console.log('[EscapeHatch] exit-kiosk-mode triggered')

    const config = getConfig()
    config.kioskEnabled = false
    saveConfig(config)

    if (mainWindow && mainWindow.isFullScreen()) {
        mainWindow.setFullScreen(false)
    }

    if (kioskWindow) {
        kioskWindow.close()
    }

    return true
})

// Utils
ipcMain.handle('app-version', () => app.getVersion())
ipcMain.handle('app-name', () => app.getName())
ipcMain.handle('is-dev', () => isDev)
