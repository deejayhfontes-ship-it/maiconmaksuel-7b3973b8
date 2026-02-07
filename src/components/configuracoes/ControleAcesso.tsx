/**
 * Complete Access Control / PIN Management Component
 * Includes: PIN Management, Permissions, Access Logs, Password Update
 */

import { useState } from 'react';
import { usePinosAcesso, PinoAcesso, PinRole, CreatePinoData } from '@/hooks/usePinosAcesso';
import { useLogsAcesso, LogAcesso } from '@/hooks/useLogsAcesso';
import { usePermissoesModulos, Modulo, MODULOS_CONFIG } from '@/hooks/usePermissoesModulos';
import { usePinAuth } from '@/contexts/PinAuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Key, 
  Plus, 
  Pencil, 
  Trash2, 
  Shield, 
  Laptop, 
  Monitor,
  ShieldAlert,
  Eye,
  EyeOff,
  Users,
  Lock,
  History,
  ShieldCheck,
  CheckCircle,
  XCircle,
  RefreshCw,
  Save,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

const roleConfig: Record<PinRole, { label: string; icon: React.ReactNode; color: string; description: string }> = {
  admin: {
    label: 'Administrador',
    icon: <Shield className="h-4 w-4" />,
    color: 'bg-primary text-primary-foreground',
    description: 'Acesso total ao sistema',
  },
  notebook: {
    label: 'Notebook',
    icon: <Laptop className="h-4 w-4" />,
    color: 'bg-blue-500 text-white',
    description: 'Agenda e gestão básica (sem financeiro)',
  },
  kiosk: {
    label: 'Kiosk',
    icon: <Monitor className="h-4 w-4" />,
    color: 'bg-orange-500 text-white',
    description: 'Caixa, ponto eletrônico e mini agenda',
  },
};

export default function ControleAcesso() {
  const { session } = usePinAuth();
  const { pinos, loading, saving, createPino, updatePino, togglePinoAtivo, deletePino, validatePin } = usePinosAcesso();
  const { logs, loading: logsLoading, fetchLogs, clearOldLogs } = useLogsAcesso();
  const { permissoes, loading: permsLoading, saving: permsSaving, updatePermissao, getPermissoesByRole } = usePermissoesModulos();
  
  const [activeTab, setActiveTab] = useState('pinos');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedPino, setSelectedPino] = useState<PinoAcesso | null>(null);
  const [showPin, setShowPin] = useState<Record<string, boolean>>({});
  const [selectedRole, setSelectedRole] = useState<PinRole>('admin');
  
  // Form state
  const [formData, setFormData] = useState<CreatePinoData>({
    pin: '',
    nome: '',
    role: 'notebook',
    descricao: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Password change state
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  // Only admin can access this
  if (session?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <ShieldAlert className="h-12 w-12 mx-auto mb-4 text-destructive" />
          <p className="text-lg font-medium">Acesso Restrito</p>
          <p className="text-muted-foreground">Apenas administradores podem gerenciar usuários e acesso</p>
        </div>
      </div>
    );
  }

  const resetForm = () => {
    setFormData({ pin: '', nome: '', role: 'notebook', descricao: '' });
    setFormErrors({});
    setSelectedPino(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (pino: PinoAcesso) => {
    setSelectedPino(pino);
    setFormData({
      pin: pino.pin,
      nome: pino.nome,
      role: pino.role,
      descricao: pino.descricao || '',
    });
    setFormErrors({});
    setIsDialogOpen(true);
  };

  const openDeleteDialog = (pino: PinoAcesso) => {
    setSelectedPino(pino);
    setIsDeleteDialogOpen(true);
  };

  const handleInputChange = (field: keyof CreatePinoData, value: string) => {
    if (field === 'pin') {
      value = value.replace(/\D/g, '').slice(0, 4);
    }
    setFormData(prev => ({ ...prev, [field]: value }));
    setFormErrors(prev => ({ ...prev, [field]: '' }));
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.pin || formData.pin.length !== 4) {
      errors.pin = 'PIN deve ter 4 dígitos';
    } else if (!validatePin(formData.pin)) {
      errors.pin = 'PIN deve conter apenas números';
    }
    if (!formData.nome.trim()) {
      errors.nome = 'Nome é obrigatório';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    let success: boolean;
    if (selectedPino) {
      success = await updatePino(selectedPino.id, formData);
    } else {
      success = await createPino(formData);
    }
    if (success) {
      setIsDialogOpen(false);
      resetForm();
    }
  };

  const handleDelete = async () => {
    if (!selectedPino) return;
    const success = await deletePino(selectedPino.id);
    if (success) {
      setIsDeleteDialogOpen(false);
      setSelectedPino(null);
    }
  };

  const toggleShowPin = (id: string) => {
    setShowPin(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const formatPin = (pin: string, show: boolean) => {
    return show ? pin : '••••';
  };

  const handlePasswordChange = async () => {
    if (!currentPin || !newPin || !confirmPin) {
      toast.error('Preencha todos os campos');
      return;
    }
    if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      toast.error('Novo PIN deve ter 4 dígitos numéricos');
      return;
    }
    if (newPin !== confirmPin) {
      toast.error('PINs não coincidem');
      return;
    }
    if (currentPin !== session?.pin) {
      toast.error('PIN atual incorreto');
      return;
    }

    setChangingPassword(true);
    const success = await updatePino(session!.id, { pin: newPin });
    if (success) {
      toast.success('PIN alterado com sucesso! Faça login novamente.');
      setCurrentPin('');
      setNewPin('');
      setConfirmPin('');
    }
    setChangingPassword(false);
  };

  const handlePermissionChange = async (modulo: Modulo, field: 'pode_visualizar' | 'pode_editar' | 'pode_excluir', value: boolean) => {
    await updatePermissao(selectedRole, modulo, { [field]: value });
  };

  const rolePermissions = getPermissoesByRole(selectedRole);

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 w-full max-w-2xl">
          <TabsTrigger value="pinos" className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            <span className="hidden sm:inline">PINs</span>
          </TabsTrigger>
          <TabsTrigger value="permissoes" className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" />
            <span className="hidden sm:inline">Permissões</span>
          </TabsTrigger>
          <TabsTrigger value="senha" className="flex items-center gap-2">
            <Lock className="h-4 w-4" />
            <span className="hidden sm:inline">Minha Senha</span>
          </TabsTrigger>
          <TabsTrigger value="logs" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            <span className="hidden sm:inline">Logs</span>
          </TabsTrigger>
        </TabsList>

        {/* PINs Tab */}
        <TabsContent value="pinos" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Usuários Cadastrados</CardTitle>
                    <CardDescription>Gerencie os PINs de acesso e suas permissões</CardDescription>
                  </div>
                </div>
                <Button onClick={openCreateDialog}>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo PIN
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Role Legend */}
              <div className="flex flex-wrap gap-4 mb-6 p-4 bg-muted/50 rounded-lg">
                {Object.entries(roleConfig).map(([role, config]) => (
                  <div key={role} className="flex items-center gap-2">
                    <Badge className={config.color}>
                      {config.icon}
                      <span className="ml-1">{config.label}</span>
                    </Badge>
                    <span className="text-sm text-muted-foreground">{config.description}</span>
                  </div>
                ))}
              </div>

              {/* PINs Table */}
              <ScrollArea className="max-h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>PIN</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Nível de Acesso</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Último Acesso</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      Array.from({ length: 3 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                          <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                          <TableCell><Skeleton className="h-6 w-28" /></TableCell>
                          <TableCell><Skeleton className="h-6 w-40" /></TableCell>
                          <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                          <TableCell><Skeleton className="h-6 w-12" /></TableCell>
                          <TableCell><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
                        </TableRow>
                      ))
                    ) : pinos.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          Nenhum PIN cadastrado
                        </TableCell>
                      </TableRow>
                    ) : (
                      pinos.map((pino) => {
                        const config = roleConfig[pino.role];
                        return (
                          <TableRow key={pino.id} className={!pino.ativo ? 'opacity-50' : ''}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <code className="bg-muted px-2 py-1 rounded font-mono">
                                  {formatPin(pino.pin, showPin[pino.id])}
                                </code>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => toggleShowPin(pino.id)}
                                >
                                  {showPin[pino.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                                </Button>
                              </div>
                            </TableCell>
                            <TableCell className="font-medium">{pino.nome}</TableCell>
                            <TableCell>
                              <Badge className={config.color}>
                                {config.icon}
                                <span className="ml-1">{config.label}</span>
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground max-w-[200px] truncate">
                              {pino.descricao || '-'}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {pino.ultimo_acesso
                                ? format(new Date(pino.ultimo_acesso), "dd/MM/yy HH:mm", { locale: ptBR })
                                : 'Nunca'}
                            </TableCell>
                            <TableCell>
                              <Switch
                                checked={pino.ativo}
                                onCheckedChange={(checked) => togglePinoAtivo(pino.id, checked)}
                                disabled={saving}
                              />
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button variant="ghost" size="icon" onClick={() => openEditDialog(pino)}>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive hover:text-destructive"
                                  onClick={() => openDeleteDialog(pino)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Permissions Tab */}
        <TabsContent value="permissoes" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Permissões por Módulo</CardTitle>
                  <CardDescription>Configure o acesso de cada perfil aos módulos do sistema</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-6">
                <Label>Perfil</Label>
                <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as PinRole)}>
                  <SelectTrigger className="w-64 mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(roleConfig).map(([role, config]) => (
                      <SelectItem key={role} value={role}>
                        <div className="flex items-center gap-2">
                          {config.icon}
                          <span>{config.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {permsLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Módulo</TableHead>
                        <TableHead className="text-center">Visualizar</TableHead>
                        <TableHead className="text-center">Editar</TableHead>
                        <TableHead className="text-center">Excluir</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {MODULOS_CONFIG.map((modulo) => {
                        const perm = rolePermissions.find(p => p.modulo === modulo.id);
                        return (
                          <TableRow key={modulo.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{modulo.label}</p>
                                <p className="text-sm text-muted-foreground">{modulo.description}</p>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <Checkbox
                                checked={perm?.pode_visualizar ?? false}
                                onCheckedChange={(checked) => handlePermissionChange(modulo.id, 'pode_visualizar', !!checked)}
                                disabled={permsSaving || selectedRole === 'admin'}
                              />
                            </TableCell>
                            <TableCell className="text-center">
                              <Checkbox
                                checked={perm?.pode_editar ?? false}
                                onCheckedChange={(checked) => handlePermissionChange(modulo.id, 'pode_editar', !!checked)}
                                disabled={permsSaving || selectedRole === 'admin'}
                              />
                            </TableCell>
                            <TableCell className="text-center">
                              <Checkbox
                                checked={perm?.pode_excluir ?? false}
                                onCheckedChange={(checked) => handlePermissionChange(modulo.id, 'pode_excluir', !!checked)}
                                disabled={permsSaving || selectedRole === 'admin'}
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}

              {selectedRole === 'admin' && (
                <p className="text-sm text-muted-foreground mt-4">
                  ⚠️ Administradores têm acesso total. As permissões não podem ser alteradas.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Password Tab */}
        <TabsContent value="senha" className="mt-6">
          <Card className="max-w-md">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Lock className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Alterar Minha Senha</CardTitle>
                  <CardDescription>Atualize seu PIN de acesso</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>PIN Atual</Label>
                <Input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="••••"
                  value={currentPin}
                  onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                />
              </div>
              <div className="space-y-2">
                <Label>Novo PIN</Label>
                <Input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="••••"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                />
              </div>
              <div className="space-y-2">
                <Label>Confirmar Novo PIN</Label>
                <Input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="••••"
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                />
              </div>
              <Button onClick={handlePasswordChange} disabled={changingPassword} className="w-full">
                <Save className="h-4 w-4 mr-2" />
                {changingPassword ? 'Salvando...' : 'Alterar PIN'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Logs Tab */}
        <TabsContent value="logs" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <History className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Logs de Acesso</CardTitle>
                    <CardDescription>Histórico de tentativas de login</CardDescription>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={fetchLogs}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Atualizar
                  </Button>
                  <Button variant="outline" size="sm" onClick={clearOldLogs}>
                    Limpar Antigos
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>Usuário</TableHead>
                      <TableHead>Perfil</TableHead>
                      <TableHead>Dispositivo</TableHead>
                      <TableHead>Data/Hora</TableHead>
                      <TableHead>Motivo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logsLoading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell><Skeleton className="h-6 w-8" /></TableCell>
                          <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                          <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                          <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                          <TableCell><Skeleton className="h-6 w-28" /></TableCell>
                          <TableCell><Skeleton className="h-6 w-32" /></TableCell>
                        </TableRow>
                      ))
                    ) : logs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          Nenhum log de acesso
                        </TableCell>
                      </TableRow>
                    ) : (
                      logs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell>
                            {log.sucesso ? (
                              <CheckCircle className="h-5 w-5 text-green-500" />
                            ) : (
                              <XCircle className="h-5 w-5 text-destructive" />
                            )}
                          </TableCell>
                          <TableCell className="font-medium">{log.nome_usuario}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{log.role}</Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{log.dispositivo || 'N/A'}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {format(new Date(log.created_at), "dd/MM/yy HH:mm:ss", { locale: ptBR })}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {log.motivo_falha || '-'}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedPino ? 'Editar PIN' : 'Novo PIN de Acesso'}</DialogTitle>
            <DialogDescription>
              {selectedPino ? 'Modifique as informações do PIN' : 'Crie um novo PIN para acesso ao sistema'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>PIN (4 dígitos)</Label>
              <Input
                type="text"
                inputMode="numeric"
                placeholder="0000"
                maxLength={4}
                value={formData.pin}
                onChange={(e) => handleInputChange('pin', e.target.value)}
                className={formErrors.pin ? 'border-destructive' : ''}
              />
              {formErrors.pin && <p className="text-sm text-destructive">{formErrors.pin}</p>}
            </div>
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input
                placeholder="Ex: Recepção, Gerente Maria"
                value={formData.nome}
                onChange={(e) => handleInputChange('nome', e.target.value)}
                className={formErrors.nome ? 'border-destructive' : ''}
              />
              {formErrors.nome && <p className="text-sm text-destructive">{formErrors.nome}</p>}
            </div>
            <div className="space-y-2">
              <Label>Nível de Acesso</Label>
              <Select
                value={formData.role}
                onValueChange={(value: PinRole) => setFormData(prev => ({ ...prev, role: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(roleConfig).map(([role, config]) => (
                    <SelectItem key={role} value={role}>
                      <div className="flex items-center gap-2">
                        {config.icon}
                        <span>{config.label}</span>
                        <span className="text-muted-foreground text-xs">- {config.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Descrição (opcional)</Label>
              <Input
                placeholder="Descrição adicional"
                value={formData.descricao || ''}
                onChange={(e) => handleInputChange('descricao', e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? 'Salvando...' : selectedPino ? 'Salvar Alterações' : 'Criar PIN'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir PIN</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o PIN <strong>{selectedPino?.nome}</strong>?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
