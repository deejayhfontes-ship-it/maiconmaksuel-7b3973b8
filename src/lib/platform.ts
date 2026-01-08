/**
 * Utilitários para detectar a plataforma de execução
 */

export const isElectron = (): boolean => {
  return window.electron?.isElectron === true
}

export const isWeb = (): boolean => {
  return !isElectron()
}

export const getAppVersion = async (): Promise<string> => {
  if (isElectron()) {
    return await window.electron!.getAppVersion()
  }
  return 'Web'
}

export const getAppName = async (): Promise<string> => {
  if (isElectron()) {
    return await window.electron!.getAppName()
  }
  return 'MAICON MAKSUEL GESTÃO'
}

export const getPlatform = async (): Promise<string> => {
  if (isElectron()) {
    return await window.electron!.getPlatform()
  }
  return 'web'
}

export const isDevelopment = async (): Promise<boolean> => {
  if (isElectron()) {
    return await window.electron!.isDev()
  }
  return import.meta.env.DEV
}

export const getPlatformLabel = async (): Promise<string> => {
  const platform = await getPlatform()
  
  switch (platform) {
    case 'win32':
      return 'Windows'
    case 'darwin':
      return 'macOS'
    case 'linux':
      return 'Linux'
    case 'web':
      return 'Navegador'
    default:
      return platform
  }
}
