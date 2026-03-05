/**
 * Kiosk Reset, Maintenance & Safety Controls
 */

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useKioskSettings } from "@/hooks/useKioskSettings";
import { usePinAuth } from "@/contexts/PinAuthContext";
import { 
  RefreshCw, 
  Trash2, 
  RotateCcw, 
  AlertTriangle,
  Shield,
  Database,
  Palette,
  Layout,
  Power
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

export default function KioskMaintenanceSettings() {
  const { 
    resetVisual, 
    resetContent,
    resetInteraction,
    clearCache, 
    forceResync, 
    factoryReset,
    isSaving,
    isOnline,
    syncStatus,
    formatUptime,
  } = useKioskSettings();
  const { session } = usePinAuth();
  const [confirmPin, setConfirmPin] = useState('');
  const [selectedAction, setSelectedAction] = useState<string | null>(null);

  const isAdmin = session?.role === 'admin';
  const adminPin = '0000'; // Default admin PIN for verification

  const handleDestructiveAction = (action: string) => {
    if (!isAdmin) {
      toast.error('Apenas administradores podem executar esta ação');
      return;
    }
    setSelectedAction(action);
    setConfirmPin('');
  };

  const executeAction = () => {
    if (confirmPin !== adminPin) {
      toast.error('PIN incorreto');
      return;
    }

    switch (selectedAction) {
      case 'clear-cache':
        clearCache();
        break;
      case 'factory-reset':
        factoryReset();
        break;
    }

    setSelectedAction(null);
    setConfirmPin('');
  };

  const maintenanceActions = [
    {
      id: 'reset-visual',
      label: 'Resetar Visual',
      description: 'Restaura tema, logo e cores para o padrão',
      icon: Palette,
      action: resetVisual,
      destructive: false,
    },
    {
      id: 'reset-content',
      label: 'Resetar Conteúdo',
      description: 'Restaura mensagens e textos para o padrão',
      icon: Layout,
      action: resetContent,
      destructive: false,
    },
    {
      id: 'reset-interaction',
      label: 'Resetar Interação',
      description: 'Restaura configurações de toque e acessibilidade',
      icon: Layout,
      action: resetInteraction,
      destructive: false,
    },
    {
      id: 'force-sync',
      label: 'Forçar Sincronização',
      description: 'Sincroniza dados com o servidor',
      icon: RefreshCw,
      action: forceResync,
      destructive: false,
    },
  ];

  const destructiveActions = [
    {
      id: 'clear-cache',
      label: 'Limpar Cache',
      description: 'Remove dados locais do kiosk',
      icon: Database,
      warning: 'Isso vai remover todas as configurações armazenadas localmente.',
    },
    {
      id: 'factory-reset',
      label: 'Reset de Fábrica',
      description: 'Restaura TODAS as configurações do kiosk',
      icon: RotateCcw,
      warning: 'Isso vai restaurar TODAS as configurações do kiosk para o padrão. Esta ação não pode ser desfeita.',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Safe Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Manutenção
          </CardTitle>
          <CardDescription>
            Ações de manutenção e sincronização
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {maintenanceActions.map(({ id, label, description, icon: Icon, action }) => (
            <div key={id} className="flex items-center justify-between p-4 rounded-lg border">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{label}</p>
                  <p className="text-sm text-muted-foreground">{description}</p>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={action}
                disabled={isSaving}
              >
                Executar
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Destructive Actions */}
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Ações Destrutivas
          </CardTitle>
          <CardDescription>
            Estas ações requerem confirmação com PIN de administrador
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {destructiveActions.map(({ id, label, description, icon: Icon, warning }) => (
            <div key={id} className="flex items-center justify-between p-4 rounded-lg border border-destructive/20 bg-destructive/5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-destructive/10">
                  <Icon className="h-4 w-4 text-destructive" />
                </div>
                <div>
                  <p className="font-medium">{label}</p>
                  <p className="text-sm text-muted-foreground">{description}</p>
                </div>
              </div>
              <AlertDialog open={selectedAction === id} onOpenChange={(open) => !open && setSelectedAction(null)}>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => handleDestructiveAction(id)}
                    disabled={!isAdmin}
                  >
                    {!isAdmin && <Shield className="h-3 w-3 mr-1" />}
                    Executar
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                      Confirmar {label}
                    </AlertDialogTitle>
                    <AlertDialogDescription className="space-y-4">
                      <p>{warning}</p>
                      <div className="space-y-2">
                        <Label htmlFor="confirm-pin">Digite o PIN de Administrador para confirmar:</Label>
                        <Input
                          id="confirm-pin"
                          type="password"
                          maxLength={4}
                          placeholder="****"
                          value={confirmPin}
                          onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                          className="text-center text-2xl tracking-widest"
                        />
                      </div>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setConfirmPin('')}>
                      Cancelar
                    </AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={executeAction}
                      className="bg-destructive hover:bg-destructive/90"
                      disabled={confirmPin.length !== 4}
                    >
                      Confirmar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Restart Option */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <Power className="h-4 w-4 text-orange-500" />
              </div>
              <div>
                <p className="font-medium">Reiniciar Modo Kiosk</p>
                <p className="text-sm text-muted-foreground">
                  Recarrega a interface do kiosk
                </p>
              </div>
            </div>
            <Button 
              variant="outline" 
              onClick={() => window.location.reload()}
            >
              Reiniciar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
