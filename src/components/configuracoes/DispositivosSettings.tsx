/**
 * Devices & Kiosk Management Component
 */

import { useSystemSettings } from '@/hooks/useSystemSettings';
import { usePinAuth } from '@/contexts/PinAuthContext';
import { getDeviceInfo, setDeviceMode, getDeviceModeSetting } from '@/lib/deviceType';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Monitor, Laptop, Tablet, Trash2, RefreshCw, Loader2, ShieldAlert } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useState, useEffect } from 'react';

const deviceTypeConfig = {
  admin: { label: 'Admin', icon: Monitor, color: 'bg-primary text-primary-foreground' },
  notebook: { label: 'Notebook', icon: Laptop, color: 'bg-blue-500 text-white' },
  kiosk: { label: 'Kiosk', icon: Tablet, color: 'bg-orange-500 text-white' },
  auto: { label: 'Automático', icon: Monitor, color: 'bg-muted text-muted-foreground' },
};

export default function DispositivosSettings() {
  const { session } = usePinAuth();
  const { devices, currentDeviceId, updateDeviceMode, removeDevice, registerDevice, isLoading } = useSystemSettings();
  const [currentMode, setCurrentMode] = useState(getDeviceModeSetting());
  const [deviceInfo] = useState(getDeviceInfo());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deviceToDelete, setDeviceToDelete] = useState<string | null>(null);

  // Only admin can access
  if (session?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <ShieldAlert className="h-12 w-12 mx-auto mb-4 text-destructive" />
          <p className="text-lg font-medium">Acesso Restrito</p>
          <p className="text-muted-foreground">Apenas administradores podem gerenciar dispositivos</p>
        </div>
      </div>
    );
  }

  const handleModeChange = (mode: string) => {
    const validMode = mode as 'admin' | 'notebook' | 'kiosk' | 'auto';
    setCurrentMode(validMode === 'admin' ? 'notebook' : validMode);
    
    // For device mode setting, treat 'admin' as 'notebook' since they have similar capabilities
    if (validMode === 'auto') {
      setDeviceMode('auto');
    } else if (validMode === 'admin' || validMode === 'notebook') {
      setDeviceMode('notebook');
    } else {
      setDeviceMode('kiosk');
    }
    
    // Register/update device in Supabase
    registerDevice(`Dispositivo ${validMode}`, validMode);
  };

  const handleDeleteDevice = async () => {
    if (deviceToDelete) {
      await removeDevice(deviceToDelete);
      setDeleteDialogOpen(false);
      setDeviceToDelete(null);
    }
  };

  const currentDevice = devices.find(d => d.device_id === currentDeviceId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Device */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Monitor className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Este Dispositivo</CardTitle>
              <CardDescription>
                Configuração do dispositivo atual
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">ID do Dispositivo</p>
              <p className="font-mono text-sm truncate">{currentDeviceId}</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">Tipo Detectado</p>
              <p className="capitalize">{deviceInfo.type}</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">Tela</p>
              <p>{deviceInfo.screenWidth} x {deviceInfo.screenHeight}</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">Touch</p>
              <p>{deviceInfo.isTouch ? 'Sim' : 'Não'}</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Modo de Operação</Label>
            <Select value={currentMode} onValueChange={handleModeChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(deviceTypeConfig).map(([key, config]) => {
                  const Icon = config.icon;
                  return (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        <span>{config.label}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Define quais funcionalidades estarão disponíveis neste dispositivo
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Registered Devices */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                <Laptop className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>Dispositivos Registrados</CardTitle>
                <CardDescription>
                  Lista de todos os dispositivos que acessaram o sistema
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Último Acesso</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {devices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Nenhum dispositivo registrado
                  </TableCell>
                </TableRow>
              ) : (
                devices.map((device) => {
                  const config = deviceTypeConfig[device.tipo] || deviceTypeConfig.auto;
                  const Icon = config.icon;
                  const isCurrentDevice = device.device_id === currentDeviceId;
                  
                  return (
                    <TableRow key={device.id} className={isCurrentDevice ? 'bg-primary/5' : ''}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{device.nome}</span>
                          {isCurrentDevice && (
                            <Badge variant="outline" className="text-xs">Este</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={config.color}>
                          <Icon className="h-3 w-3 mr-1" />
                          {config.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {device.ultimo_acesso
                          ? format(new Date(device.ultimo_acesso), "dd/MM/yy HH:mm", { locale: ptBR })
                          : 'Nunca'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={device.ativo ? 'success' : 'secondary'}>
                          {device.ativo ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {!isCurrentDevice && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => {
                              setDeviceToDelete(device.id);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Dispositivo</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover este dispositivo? Ele precisará se registrar novamente ao acessar o sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteDevice}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
