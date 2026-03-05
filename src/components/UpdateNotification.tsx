import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { isElectron } from '@/lib/platform'
import { Download, RefreshCw, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

export function UpdateNotification() {
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [updateDownloaded, setUpdateDownloaded] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [version, setVersion] = useState('')
  const [showRestartDialog, setShowRestartDialog] = useState(false)

  useEffect(() => {
    // Verificar se está rodando no Electron
    if (!isElectron() || !window.electron) return

    const electron = window.electron

    // Listener para atualização disponível
    electron.onUpdateAvailable((info) => {
      setUpdateAvailable(true)
      setVersion(info.version)
      toast.info(`Nova versão disponível: v${info.version}`, {
        duration: 10000,
        action: {
          label: 'Baixar',
          onClick: handleDownload
        }
      })
    })

    // Listener para progresso do download
    electron.onUpdateProgress((progressInfo) => {
      setProgress(Math.round(progressInfo.percent))
    })

    // Listener para download concluído
    electron.onUpdateDownloaded((info) => {
      setUpdateDownloaded(true)
      setDownloading(false)
      setProgress(100)
      setShowRestartDialog(true)
    })

    // Listener para erros
    electron.onUpdateError((error) => {
      setDownloading(false)
      setProgress(0)
      toast.error('Erro ao verificar atualizações', {
        description: error
      })
      console.error('Update error:', error)
    })

    // Verificar atualizações ao abrir (após 5 segundos)
    const timer = setTimeout(() => {
      electron.checkForUpdates()
    }, 5000)

    // Cleanup
    return () => {
      clearTimeout(timer)
      electron.removeUpdateListeners()
    }
  }, [])

  const handleDownload = async () => {
    if (!window.electron) return
    
    setDownloading(true)
    setProgress(0)
    toast.info('Baixando atualização...', {
      icon: <Download className="h-4 w-4 animate-bounce" />
    })
    
    await window.electron.downloadUpdate()
  }

  const handleInstall = async () => {
    if (!window.electron) return
    
    toast.success('Reiniciando para instalar...', {
      icon: <RefreshCw className="h-4 w-4 animate-spin" />
    })
    
    // Pequeno delay para mostrar o toast
    setTimeout(() => {
      window.electron!.installUpdate()
    }, 1000)
  }

  // Não renderiza nada se não estiver no Electron
  if (!isElectron()) return null

  return (
    <>
      {/* Barra de progresso durante download */}
      {downloading && (
        <div className="fixed bottom-4 right-4 z-50 bg-card border rounded-lg shadow-lg p-4 w-80">
          <div className="flex items-center gap-3 mb-2">
            <Download className="h-5 w-5 text-primary animate-bounce" />
            <div className="flex-1">
              <p className="text-sm font-medium">Baixando v{version}</p>
              <p className="text-xs text-muted-foreground">{progress}% concluído</p>
            </div>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      )}

      {/* Dialog para reiniciar após download */}
      <AlertDialog open={showRestartDialog} onOpenChange={setShowRestartDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-success" />
              Atualização Pronta!
            </AlertDialogTitle>
            <AlertDialogDescription>
              A versão {version} foi baixada com sucesso. 
              Reinicie o aplicativo para aplicar a atualização.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Depois</AlertDialogCancel>
            <AlertDialogAction onClick={handleInstall} className="bg-success hover:bg-success/90">
              <RefreshCw className="h-4 w-4 mr-2" />
              Reiniciar Agora
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
