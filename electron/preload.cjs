const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electron', {

    // === Auto-Update Events ===
    onUpdateAvailable: (cb) => ipcRenderer.on('update-available', (_, i) => cb(i)),
    onUpdateProgress: (cb) => ipcRenderer.on('update-progress', (_, p) => cb(p)),
    onUpdateDownloaded: (cb) => ipcRenderer.on('update-downloaded', (_, i) => cb(i)),
    onUpdateError: (cb) => ipcRenderer.on('update-error', (_, e) => cb(e)),
    onUpdateNotAvailable: (cb) => ipcRenderer.on('update-not-available', (_, i) => cb(i)),
    removeUpdateListeners: () => {
        ['update-available', 'update-progress', 'update-downloaded', 'update-error', 'update-not-available']
            .forEach(ev => ipcRenderer.removeAllListeners(ev))
    },

    // === Auto-Update Actions ===
    checkForUpdates: () => ipcRenderer.invoke('check-updates'),
    downloadUpdate: () => ipcRenderer.invoke('download-update'),
    installUpdate: () => ipcRenderer.invoke('install-update'),

    // === Kiosk Config ===
    getKioskEnabled: () => ipcRenderer.invoke('get-kiosk-enabled'),
    setKioskEnabled: (v) => ipcRenderer.invoke('set-kiosk-enabled', v),

    // === Kiosk Window ===
    openKioskWindow: () => ipcRenderer.invoke('kiosk-open'),
    closeKioskWindow: () => ipcRenderer.invoke('kiosk-close'),
    isKioskWindowOpen: () => ipcRenderer.invoke('kiosk-is-open'),
    setKioskFullscreen: (v) => ipcRenderer.invoke('kiosk-set-fullscreen', v),
    toggleKioskFullscreen: () => ipcRenderer.invoke('kiosk-toggle-fullscreen'),

    // === Kiosk Escape Hatch ===
    onKioskEscapeTrigger: (cb) => ipcRenderer.on('trigger-kiosk-escape', () => cb()),
    removeKioskEscapeListener: () => ipcRenderer.removeAllListeners('trigger-kiosk-escape'),
    exitKioskMode: () => ipcRenderer.invoke('exit-kiosk-mode'),

    // =====================================================
    // BACKUP LOCAL — dados salvos no computador do cliente
    // =====================================================

    /**
     * Salva registros de uma tabela localmente como backup.
     * @param {string} tabela  - ex: 'clientes', 'produtos', 'agendamentos'
     * @param {Array}  dados   - array de objetos (igual ao retorno do Supabase)
     * @returns {{ ok: boolean, total?: number, erro?: string }}
     */
    backupSalvar: (tabela, dados) => ipcRenderer.invoke('backup-salvar', tabela, dados),

    /**
     * Lê o backup local de uma tabela.
     * @param {string} tabela
     * @returns {{ ok: boolean, dados: Array, atualizadoEm: string, totalRegistros: number }}
     */
    backupLer: (tabela) => ipcRenderer.invoke('backup-ler', tabela),

    /**
     * Lista todas as tabelas com backup disponível e seus metadados.
     * @returns {Array<{ tabela, totalRegistros, atualizadoEm, tamanhoKB }>}
     */
    backupListar: () => ipcRenderer.invoke('backup-listar'),

    /**
     * Abre diálogo para salvar um JSON com todos os backups exportados.
     * @returns {{ ok: boolean, caminho?: string, cancelado?: boolean }}
     */
    backupExportar: () => ipcRenderer.invoke('backup-exportar'),

    /** Retorna o caminho da pasta de backup no disco */
    backupDir: () => ipcRenderer.invoke('backup-dir'),

    // === Utils ===
    getAppVersion: () => ipcRenderer.invoke('app-version'),
    getAppName: () => ipcRenderer.invoke('app-name'),
    getPlatform: () => process.platform,
    isDev: () => ipcRenderer.invoke('is-dev'),
    isElectron: true
})
