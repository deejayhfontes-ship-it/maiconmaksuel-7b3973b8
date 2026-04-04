const { app, BrowserWindow, ipcMain, Menu, shell, globalShortcut, dialog } = require('electron')
const path = require('path')
const fs = require('fs')
const { autoUpdater } = require('electron-updater')

const isDev = !app.isPackaged
let mainWindow

// =========================================================
// PATHS
// =========================================================
const userDataPath = app.getPath('userData')
const configPath = path.join(userDataPath, 'config.json')
const backupDir = path.join(userDataPath, 'backup')

// Garante pasta de backup existe
if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true })

// =========================================================
// CONFIG (kiosk etc)
// =========================================================
function getConfig() {
    try {
        if (fs.existsSync(configPath)) return JSON.parse(fs.readFileSync(configPath))
    } catch (e) { console.error('getConfig:', e) }
    return { kioskEnabled: false }
}
function saveConfig(config) {
    try { fs.writeFileSync(configPath, JSON.stringify(config, null, 2)); return true }
    catch (e) { console.error('saveConfig:', e); return false }
}

// =========================================================
// BACKUP LOCAL — salva/lê JSON por tabela
// Tabelas suportadas: clientes, produtos, agendamentos,
//   servicos, profissionais, caixa, lembretes
// =========================================================
const TABELAS_PERMITIDAS = new Set([
    'clientes', 'produtos', 'agendamentos', 'servicos',
    'profissionais', 'caixa', 'lembretes', 'usuarios'
])

function backupPath(tabela) {
    return path.join(backupDir, `${tabela}.json`)
}

/** Salva array de registros localmente para uma tabela */
function salvarBackupTabela(tabela, dados) {
    if (!TABELAS_PERMITIDAS.has(tabela)) return { ok: false, erro: 'Tabela não permitida' }
    try {
        const payload = {
            tabela,
            atualizadoEm: new Date().toISOString(),
            totalRegistros: Array.isArray(dados) ? dados.length : 0,
            dados
        }
        fs.writeFileSync(backupPath(tabela), JSON.stringify(payload, null, 2), 'utf-8')
        return { ok: true, total: payload.totalRegistros }
    } catch (e) {
        console.error(`salvarBackupTabela(${tabela}):`, e)
        return { ok: false, erro: e.message }
    }
}

/** Lê backup local de uma tabela */
function lerBackupTabela(tabela) {
    if (!TABELAS_PERMITIDAS.has(tabela)) return { ok: false, erro: 'Tabela não permitida' }
    try {
        const p = backupPath(tabela)
        if (!fs.existsSync(p)) return { ok: true, dados: [], atualizadoEm: null, totalRegistros: 0 }
        const raw = JSON.parse(fs.readFileSync(p, 'utf-8'))
        return { ok: true, ...raw }
    } catch (e) {
        console.error(`lerBackupTabela(${tabela}):`, e)
        return { ok: false, erro: e.message }
    }
}

/** Lista todas as tabelas com backup e seus metadados */
function listarBackups() {
    const result = []
    for (const tabela of TABELAS_PERMITIDAS) {
        const p = backupPath(tabela)
        if (fs.existsSync(p)) {
            try {
                const raw = JSON.parse(fs.readFileSync(p, 'utf-8'))
                result.push({
                    tabela,
                    totalRegistros: raw.totalRegistros || 0,
                    atualizadoEm: raw.atualizadoEm || null,
                    tamanhoKB: Math.round(fs.statSync(p).size / 1024)
                })
            } catch { result.push({ tabela, erro: true }) }
        }
    }
    return result
}

/** Exporta todos os backups para um arquivo ZIP/JSON escolhido pelo usuário */
async function exportarTodosBackups(win) {
    const { filePath } = await dialog.showSaveDialog(win, {
        title: 'Exportar Backup Completo',
        defaultPath: `backup-salao-${new Date().toISOString().slice(0, 10)}.json`,
        filters: [{ name: 'JSON', extensions: ['json'] }]
    })
    if (!filePath) return { ok: false, cancelado: true }
    try {
        const tudo = {}
        for (const tabela of TABELAS_PERMITIDAS) {
            const p = backupPath(tabela)
            if (fs.existsSync(p)) tudo[tabela] = JSON.parse(fs.readFileSync(p, 'utf-8'))
        }
        const meta = { exportadoEm: new Date().toISOString(), app: app.getName(), versao: app.getVersion(), tabelas: tudo }
        fs.writeFileSync(filePath, JSON.stringify(meta, null, 2), 'utf-8')
        return { ok: true, caminho: filePath }
    } catch (e) {
        return { ok: false, erro: e.message }
    }
}

// =========================================================
// JANELA PRINCIPAL
// =========================================================
function createWindow() {
    const iconPath = isDev
        ? path.join(__dirname, '../.icon-ico/icon.ico')
        : path.join(__dirname, '../public/icon.ico')

    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1200,
        minHeight: 700,
        icon: fs.existsSync(iconPath) ? iconPath : undefined,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.cjs'),
            webSecurity: true
        },
        title: 'MAICON MAKSUEL GESTÃO',
        backgroundColor: '#0f0a02',
        show: false,
        frame: true
    })

    if (isDev) {
        mainWindow.loadURL('http://localhost:8080')
        mainWindow.webContents.openDevTools()
    } else {
        const indexPath = path.join(__dirname, '../dist/index.html')
        mainWindow.loadFile(indexPath).catch(err => console.error('Falha ao carregar index.html:', err))
    }

    mainWindow.once('ready-to-show', () => {
        mainWindow.show()
        if (!isDev) autoUpdater.checkForUpdates().catch(() => { /* silencia erro se não há releases publicadas */ })
        const config = getConfig()
        if (config.kioskEnabled) createKioskWindow()
    })

    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        if (url.startsWith('https:') || url.startsWith('http:')) shell.openExternal(url)
        return { action: 'deny' }
    })

    if (!isDev) Menu.setApplicationMenu(null)
    mainWindow.on('closed', () => { mainWindow = null })
}

// =========================================================
// APP LIFECYCLE
// =========================================================
autoUpdater.autoDownload = false
autoUpdater.autoInstallOnAppQuit = true

app.whenReady().then(() => {
    createWindow()
    app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })

    // Escape hatch shortcuts
    const triggerEscape = () => {
        if (mainWindow?.webContents) mainWindow.webContents.send('trigger-kiosk-escape')
        if (kioskWindow?.webContents) kioskWindow.webContents.send('trigger-kiosk-escape')
    }
    globalShortcut.register('CommandOrControl+Shift+K', triggerEscape)
    globalShortcut.register('CommandOrControl+Alt+K', triggerEscape)
})

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
app.on('will-quit', () => globalShortcut.unregisterAll())

// =========================================================
// AUTO-UPDATER
// =========================================================
const forwardEvent = (ev, ...args) => { if (mainWindow?.webContents) mainWindow.webContents.send(ev, ...args) }
autoUpdater.on('update-available', (i) => forwardEvent('update-available', i))
autoUpdater.on('update-not-available', (i) => forwardEvent('update-not-available', i))
autoUpdater.on('download-progress', (p) => forwardEvent('update-progress', p))
autoUpdater.on('update-downloaded', (i) => forwardEvent('update-downloaded', i))
autoUpdater.on('error', (e) => { /* silenciado — sem releases publicadas é esperado */ })

// =========================================================
// IPC — CONFIG & UPDATER
// =========================================================
ipcMain.handle('get-kiosk-enabled', () => getConfig().kioskEnabled)
ipcMain.handle('set-kiosk-enabled', (_, v) => saveConfig({ ...getConfig(), kioskEnabled: !!v }))
ipcMain.handle('check-updates', async () => isDev ? { dev: true } : autoUpdater.checkForUpdates())
ipcMain.handle('download-update', () => autoUpdater.downloadUpdate())
ipcMain.handle('install-update', () => autoUpdater.quitAndInstall())
ipcMain.handle('app-version', () => app.getVersion())
ipcMain.handle('app-name', () => app.getName())
ipcMain.handle('is-dev', () => isDev)
ipcMain.handle('backup-dir', () => backupDir)

// =========================================================
// IPC — BACKUP LOCAL
// =========================================================
ipcMain.handle('backup-salvar', (_, tabela, dados) => salvarBackupTabela(tabela, dados))
ipcMain.handle('backup-ler', (_, tabela) => lerBackupTabela(tabela))
ipcMain.handle('backup-listar', () => listarBackups())
ipcMain.handle('backup-exportar', () => exportarTodosBackups(mainWindow))

// =========================================================
// KIOSK WINDOW
// =========================================================
let kioskWindow = null

function createKioskWindow() {
    if (kioskWindow) { kioskWindow.show(); kioskWindow.focus(); return }
    kioskWindow = new BrowserWindow({
        width: 1024, height: 768,
        minWidth: 800, minHeight: 600,
        frame: true, resizable: true, show: false,
        webPreferences: {
            nodeIntegration: false, contextIsolation: true,
            preload: path.join(__dirname, 'preload.cjs'), webSecurity: true
        },
        title: 'Kiosk - MAICON MAKSUEL GESTÃO',
        backgroundColor: '#0f0a02'
    })
    kioskWindow.setMenuBarVisibility(false)
    if (isDev) {
        kioskWindow.loadURL('http://localhost:8080/#/kiosk')
    } else {
        kioskWindow.loadFile(path.join(__dirname, '../dist/index.html'), { hash: '#/kiosk' })
    }
    kioskWindow.once('ready-to-show', () => kioskWindow.show())
    kioskWindow.webContents.setWindowOpenHandler(({ url }) => {
        if (url.startsWith('https:') || url.startsWith('http:')) shell.openExternal(url)
        return { action: 'deny' }
    })
    kioskWindow.on('closed', () => { kioskWindow = null })
}

ipcMain.handle('kiosk-open', () => { createKioskWindow(); return true })
ipcMain.handle('kiosk-close', () => { if (kioskWindow) { kioskWindow.close(); return true } return false })
ipcMain.handle('kiosk-is-open', () => !!kioskWindow)
ipcMain.handle('kiosk-set-fullscreen', (_, v) => { if (kioskWindow) { kioskWindow.setFullScreen(v); return true } return false })
ipcMain.handle('kiosk-toggle-fullscreen', () => { if (kioskWindow) { kioskWindow.setFullScreen(!kioskWindow.isFullScreen()); return kioskWindow.isFullScreen() } return false })
ipcMain.handle('exit-kiosk-mode', () => {
    saveConfig({ ...getConfig(), kioskEnabled: false })
    if (mainWindow?.isFullScreen()) mainWindow.setFullScreen(false)
    if (kioskWindow) kioskWindow.close()
    return true
})
