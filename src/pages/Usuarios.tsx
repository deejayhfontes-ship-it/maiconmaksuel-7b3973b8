import { useState, useEffect } from "react";
import { usePinAuth, PinRole } from "@/contexts/PinAuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { 
  Search, Shield, ShieldCheck, User, Plus, Edit, Trash2, 
  Key, Settings2, ShieldAlert, Phone, RefreshCw, CheckCircle, XCircle
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  PERMISSIONS_CATALOG, 
  PermissionKey, 
  DEFAULT_PERMISSIONS,
  getPermissionsByModule 
} from "@/lib/permissions";

interface Usuario {
  id: string;
  pin: string;
  nome: string;
  role: PinRole;
  telefone: string | null;
  descricao: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  ultimo_acesso: string | null;
}

interface PermissionOverride {
  permission_key: string;
  allowed: boolean;
}

const ROLE_OPTIONS: { value: PinRole; label: string }[] = [
  { value: 'admin', label: 'Administrador' },
  { value: 'notebook', label: 'Notebook/Atendente' },
  { value: 'kiosk', label: 'Terminal Kiosk' },
  { value: 'colaborador_agenda', label: 'Colaborador Agenda' },
];

export default function Usuarios() {
  const { session } = usePinAuth();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  
  // Dialog states
  const [editDialog, setEditDialog] = useState<{ open: boolean; usuario: Usuario | null }>({ 
    open: false, 
    usuario: null 
  });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; usuario: Usuario | null }>({ 
    open: false, 
    usuario: null 
  });
  const [permissionsDialog, setPermissionsDialog] = useState<{ open: boolean; usuario: Usuario | null }>({ 
    open: false, 
    usuario: null 
  });
  
  // Form states
  const [formData, setFormData] = useState({
    nome: '',
    telefone: '',
    role: 'notebook' as PinRole,
    pin: '',
    descricao: '',
    ativo: true,
  });
  const [saving, setSaving] = useState(false);
  
  // Permissions states
  const [userPermissions, setUserPermissions] = useState<Map<string, boolean>>(new Map());
  const [loadingPermissions, setLoadingPermissions] = useState(false);

  useEffect(() => {
    if (session?.role === "admin") {
      fetchUsuarios();
    }
  }, [session?.role]);

  // Only admins can access this page
  if (session?.role !== "admin") {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <ShieldAlert className="h-12 w-12 mx-auto mb-4 text-destructive" />
          <p className="text-lg font-medium">Acesso Restrito</p>
          <p className="text-muted-foreground">Apenas administradores podem acessar esta página</p>
        </div>
      </div>
    );
  }

  const fetchUsuarios = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("pinos_acesso")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar usuários");
      setLoading(false);
      return;
    }

    setUsuarios(data || []);
    setLoading(false);
  };

  const openCreateDialog = () => {
    setFormData({
      nome: '',
      telefone: '',
      role: 'notebook',
      pin: '',
      descricao: '',
      ativo: true,
    });
    setEditDialog({ open: true, usuario: null });
  };

  const openEditDialog = (usuario: Usuario) => {
    setFormData({
      nome: usuario.nome,
      telefone: usuario.telefone || '',
      role: usuario.role,
      pin: usuario.pin,
      descricao: usuario.descricao || '',
      ativo: usuario.ativo,
    });
    setEditDialog({ open: true, usuario });
  };

  const handleSave = async () => {
    // Validate
    if (!formData.nome.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }
    if (!formData.pin || !/^\d{4}$/.test(formData.pin)) {
      toast.error("PIN deve ter exatamente 4 dígitos");
      return;
    }

    // Check PIN uniqueness
    const existingPin = usuarios.find(u => 
      u.pin === formData.pin && u.id !== editDialog.usuario?.id
    );
    if (existingPin) {
      toast.error("Este PIN já está em uso por outro usuário");
      return;
    }

    setSaving(true);
    try {
      if (editDialog.usuario) {
        // Update
        const { error } = await supabase
          .from("pinos_acesso")
          .update({
            nome: formData.nome,
            telefone: formData.telefone || null,
            role: formData.role,
            pin: formData.pin,
            descricao: formData.descricao || null,
            ativo: formData.ativo,
          })
          .eq("id", editDialog.usuario.id);

        if (error) throw error;
        
        // Log audit
        await supabase.from("audit_usuarios").insert({
          actor_pino_id: session?.id,
          action: 'update',
          target_pino_id: editDialog.usuario.id,
          details: { changes: formData },
        });

        toast.success("Usuário atualizado com sucesso");
      } else {
        // Create
        const { error } = await supabase
          .from("pinos_acesso")
          .insert({
            nome: formData.nome,
            telefone: formData.telefone || null,
            role: formData.role,
            pin: formData.pin,
            descricao: formData.descricao || null,
            ativo: formData.ativo,
          });

        if (error) throw error;
        
        toast.success("Usuário criado com sucesso");
      }

      setEditDialog({ open: false, usuario: null });
      fetchUsuarios();
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar usuário");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog.usuario) return;

    try {
      const { error } = await supabase
        .from("pinos_acesso")
        .delete()
        .eq("id", deleteDialog.usuario.id);

      if (error) throw error;

      // Log audit
      await supabase.from("audit_usuarios").insert({
        actor_pino_id: session?.id,
        action: 'delete',
        target_pino_id: deleteDialog.usuario.id,
        details: { deleted_user: deleteDialog.usuario.nome },
      });

      toast.success("Usuário removido com sucesso");
      setDeleteDialog({ open: false, usuario: null });
      fetchUsuarios();
    } catch (error: any) {
      toast.error(error.message || "Erro ao remover usuário");
    }
  };

  const handleToggleStatus = async (usuario: Usuario) => {
    try {
      const { error } = await supabase
        .from("pinos_acesso")
        .update({ ativo: !usuario.ativo })
        .eq("id", usuario.id);

      if (error) throw error;

      toast.success(usuario.ativo ? "Usuário desativado" : "Usuário ativado");
      fetchUsuarios();
    } catch (error: any) {
      toast.error(error.message || "Erro ao alterar status");
    }
  };

  // Permissions Dialog
  const openPermissionsDialog = async (usuario: Usuario) => {
    setPermissionsDialog({ open: true, usuario });
    setLoadingPermissions(true);

    try {
      const { data, error } = await supabase
        .from("user_permissions")
        .select("permission_key, allowed")
        .eq("pino_id", usuario.id);

      if (error) throw error;

      const permMap = new Map<string, boolean>();
      for (const perm of data || []) {
        permMap.set(perm.permission_key, perm.allowed);
      }
      setUserPermissions(permMap);
    } catch (error) {
      console.error("Error loading permissions:", error);
      toast.error("Erro ao carregar permissões");
    } finally {
      setLoadingPermissions(false);
    }
  };

  const handlePermissionChange = (key: PermissionKey, checked: boolean) => {
    setUserPermissions(prev => {
      const newMap = new Map(prev);
      newMap.set(key, checked);
      return newMap;
    });
  };

  const savePermissions = async () => {
    if (!permissionsDialog.usuario) return;

    setSaving(true);
    try {
      // Delete existing
      await supabase
        .from("user_permissions")
        .delete()
        .eq("pino_id", permissionsDialog.usuario.id);

      // Insert new (only overrides)
      const inserts: { pino_id: string; permission_key: string; allowed: boolean }[] = [];
      userPermissions.forEach((allowed, key) => {
        inserts.push({
          pino_id: permissionsDialog.usuario!.id,
          permission_key: key,
          allowed,
        });
      });

      if (inserts.length > 0) {
        const { error } = await supabase
          .from("user_permissions")
          .insert(inserts);

        if (error) throw error;
      }

      // Log audit
      await supabase.from("audit_usuarios").insert({
        actor_pino_id: session?.id,
        action: 'update_permissions',
        target_pino_id: permissionsDialog.usuario.id,
        details: { permissions: Object.fromEntries(userPermissions) },
      });

      toast.success("Permissões salvas com sucesso");
      setPermissionsDialog({ open: false, usuario: null });
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar permissões");
    } finally {
      setSaving(false);
    }
  };

  const getRoleBadge = (role: PinRole) => {
    switch (role) {
      case "admin":
        return <Badge className="bg-primary">Administrador</Badge>;
      case "notebook":
        return <Badge variant="secondary">Notebook</Badge>;
      case "kiosk":
        return <Badge variant="outline">Kiosk</Badge>;
      case "colaborador_agenda":
        return <Badge variant="outline" className="border-accent text-accent-foreground">Colaborador</Badge>;
      default:
        return <Badge variant="outline">{role}</Badge>;
    }
  };

  const filteredUsuarios = usuarios.filter((usuario) => {
    const matchesSearch =
      usuario.nome.toLowerCase().includes(search.toLowerCase()) ||
      usuario.pin.includes(search) ||
      (usuario.telefone && usuario.telefone.includes(search));
    const matchesRole = filterRole === "all" || usuario.role === filterRole;
    const matchesStatus = filterStatus === "all" || 
      (filterStatus === "ativo" && usuario.ativo) ||
      (filterStatus === "inativo" && !usuario.ativo);
    return matchesSearch && matchesRole && matchesStatus;
  });

  const permissionsByModule = getPermissionsByModule();

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
            <ShieldCheck className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Usuários</h1>
            <p className="text-muted-foreground">
              {usuarios.length} usuário{usuarios.length !== 1 ? "s" : ""} • Gestão de acessos e permissões
            </p>
          </div>
        </div>
        <Button onClick={openCreateDialog} className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Usuário
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, PIN ou telefone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterRole} onValueChange={setFilterRole}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Tipo de acesso" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            {ROLE_OPTIONS.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="ativo">Ativos</SelectItem>
            <SelectItem value="inativo">Inativos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead>PIN</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Último Acesso</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-32 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : filteredUsuarios.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Nenhum usuário encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsuarios.map((usuario) => (
                  <TableRow key={usuario.id} className={!usuario.ativo ? 'opacity-50' : ''}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{usuario.nome}</span>
                        {usuario.telefone && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {usuario.telefone}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="bg-muted px-2 py-1 rounded text-sm font-mono">
                        {usuario.pin}
                      </code>
                    </TableCell>
                    <TableCell>{getRoleBadge(usuario.role)}</TableCell>
                    <TableCell>
                      {usuario.ativo ? (
                        <Badge variant="outline" className="border-primary text-primary">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Ativo
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-destructive text-destructive">
                          <XCircle className="h-3 w-3 mr-1" />
                          Inativo
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {usuario.ultimo_acesso
                        ? format(new Date(usuario.ultimo_acesso), "dd/MM/yyyy HH:mm", { locale: ptBR })
                        : "Nunca"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(usuario)}
                          title="Editar"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openPermissionsDialog(usuario)}
                          title="Permissões"
                        >
                          <Settings2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleToggleStatus(usuario)}
                          title={usuario.ativo ? "Desativar" : "Ativar"}
                        >
                          {usuario.ativo ? (
                            <XCircle className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <CheckCircle className="h-4 w-4 text-primary" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteDialog({ open: true, usuario })}
                          title="Excluir"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit/Create Dialog */}
      <Dialog open={editDialog.open} onOpenChange={(open) => !open && setEditDialog({ open: false, usuario: null })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editDialog.usuario ? "Editar Usuário" : "Novo Usuário"}
            </DialogTitle>
          </DialogHeader>
          
          <Tabs defaultValue="dados" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="dados">Dados</TabsTrigger>
              <TabsTrigger value="acesso">Acesso</TabsTrigger>
            </TabsList>
            
            <TabsContent value="dados" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome *</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Nome do usuário"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone/WhatsApp</Label>
                <Input
                  id="telefone"
                  value={formData.telefone}
                  onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                  placeholder="(00) 00000-0000"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="descricao">Descrição</Label>
                <Input
                  id="descricao"
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  placeholder="Descrição do acesso"
                />
              </div>
            </TabsContent>
            
            <TabsContent value="acesso" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="role">Tipo de Acesso *</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value: PinRole) => setFormData({ ...formData, role: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="pin">PIN (4 dígitos) *</Label>
                <Input
                  id="pin"
                  value={formData.pin}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                    setFormData({ ...formData, pin: value });
                  }}
                  placeholder="0000"
                  maxLength={4}
                  className="font-mono text-center text-lg tracking-widest"
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="ativo"
                  checked={formData.ativo}
                  onCheckedChange={(checked) => setFormData({ ...formData, ativo: !!checked })}
                />
                <Label htmlFor="ativo">Usuário ativo</Label>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog({ open: false, usuario: null })}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
              {editDialog.usuario ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Permissions Dialog */}
      <Dialog 
        open={permissionsDialog.open} 
        onOpenChange={(open) => !open && setPermissionsDialog({ open: false, usuario: null })}
      >
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5" />
              Permissões: {permissionsDialog.usuario?.nome}
            </DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="h-[50vh] pr-4">
            {loadingPermissions ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(permissionsByModule).map(([module, perms]) => {
                  const defaultPerms = permissionsDialog.usuario 
                    ? DEFAULT_PERMISSIONS[permissionsDialog.usuario.role] || []
                    : [];
                  
                  return (
                    <Card key={module}>
                      <CardHeader className="py-3">
                        <CardTitle className="text-sm font-medium">{module}</CardTitle>
                      </CardHeader>
                      <CardContent className="py-2">
                        <div className="grid grid-cols-2 gap-2">
                          {perms.map(perm => {
                            const isDefault = defaultPerms.includes(perm.key);
                            const override = userPermissions.get(perm.key);
                            const isChecked = override !== undefined ? override : isDefault;
                            
                            return (
                              <div key={perm.key} className="flex items-center space-x-2">
                                <Checkbox
                                  id={perm.key}
                                  checked={isChecked}
                                  onCheckedChange={(checked) => handlePermissionChange(perm.key, !!checked)}
                                />
                                <Label 
                                  htmlFor={perm.key} 
                                  className={`text-sm ${override !== undefined ? 'font-medium' : 'text-muted-foreground'}`}
                                >
                                  {perm.label}
                                  {isDefault && override === undefined && (
                                    <span className="ml-1 text-xs text-primary">(padrão)</span>
                                  )}
                                </Label>
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPermissionsDialog({ open: false, usuario: null })}>
              Cancelar
            </Button>
            <Button onClick={savePermissions} disabled={saving}>
              {saving ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
              Salvar Permissões
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={deleteDialog.open}
        onOpenChange={(open) => !open && setDeleteDialog({ open: false, usuario: null })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir usuário</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{deleteDialog.usuario?.nome}</strong>?
              Esta ação não pode ser desfeita e todos os dados de acesso serão perdidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
