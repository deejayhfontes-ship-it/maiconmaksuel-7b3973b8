import { useState, useEffect } from "react";
import { usePinAuth } from "@/contexts/PinAuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Search, Shield, ShieldCheck, User, Users, ShieldAlert } from "lucide-react";
import { Navigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type NivelAcesso = "admin" | "gerente" | "operador";

interface Usuario {
  id: string;
  nome: string;
  email: string;
  foto_url: string | null;
  created_at: string;
  role: NivelAcesso;
}

export default function Usuarios() {
  const { session } = usePinAuth();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState<string>("all");
  const [changeRoleDialog, setChangeRoleDialog] = useState<{
    open: boolean;
    usuario: Usuario | null;
    newRole: NivelAcesso | null;
  }>({ open: false, usuario: null, newRole: null });

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
    
    // Fetch profiles with their roles
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (profilesError) {
      toast.error("Erro ao carregar usuários");
      setLoading(false);
      return;
    }

    // Fetch roles for all users
    const { data: roles, error: rolesError } = await supabase
      .from("user_roles")
      .select("user_id, role");

    if (rolesError) {
      toast.error("Erro ao carregar níveis de acesso");
      setLoading(false);
      return;
    }

    // Combine profiles with roles
    const usuariosComRoles = profiles.map((profile) => {
      const userRole = roles.find((r) => r.user_id === profile.id);
      return {
        ...profile,
        role: (userRole?.role as NivelAcesso) || "operador",
      };
    });

    setUsuarios(usuariosComRoles);
    setLoading(false);
  };

  const handleRoleChange = async () => {
    if (!changeRoleDialog.usuario || !changeRoleDialog.newRole) return;

    const { usuario, newRole } = changeRoleDialog;

    const { error } = await supabase
      .from("user_roles")
      .update({ role: newRole })
      .eq("user_id", usuario.id);

    if (error) {
      toast.error("Erro ao alterar nível de acesso");
      return;
    }

    // Update local state
    setUsuarios((prev) =>
      prev.map((u) => (u.id === usuario.id ? { ...u, role: newRole } : u))
    );

    toast.success(`Nível de ${usuario.nome} alterado para ${getRoleLabel(newRole)}`);
    setChangeRoleDialog({ open: false, usuario: null, newRole: null });
  };

  const getRoleLabel = (role: NivelAcesso) => {
    switch (role) {
      case "admin":
        return "Administrador";
      case "gerente":
        return "Gerente";
      case "operador":
        return "Operador";
    }
  };

  const getRoleBadge = (role: NivelAcesso) => {
    switch (role) {
      case "admin":
        return <Badge className="bg-primary">Administrador</Badge>;
      case "gerente":
        return <Badge variant="secondary">Gerente</Badge>;
      case "operador":
        return <Badge variant="outline">Operador</Badge>;
    }
  };

  const getRoleIcon = (role: NivelAcesso) => {
    switch (role) {
      case "admin":
        return <ShieldCheck className="h-4 w-4" />;
      case "gerente":
        return <Shield className="h-4 w-4" />;
      case "operador":
        return <User className="h-4 w-4" />;
    }
  };

  const getInitials = (nome: string) => {
    return nome
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  const filteredUsuarios = usuarios.filter((usuario) => {
    const matchesSearch =
      usuario.nome.toLowerCase().includes(search.toLowerCase()) ||
      usuario.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = filterRole === "all" || usuario.role === filterRole;
    return matchesSearch && matchesRole;
  });

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
              {usuarios.length} usuário{usuarios.length !== 1 ? "s" : ""} • Gestão de acessos
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterRole} onValueChange={setFilterRole}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Nível de acesso" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os níveis</SelectItem>
            <SelectItem value="admin">Administrador</SelectItem>
            <SelectItem value="gerente">Gerente</SelectItem>
            <SelectItem value="operador">Operador</SelectItem>
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
                <TableHead>Email</TableHead>
                <TableHead>Nível de Acesso</TableHead>
                <TableHead>Cadastrado em</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <Skeleton className="h-4 w-32" />
                      </div>
                    </TableCell>
                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : filteredUsuarios.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Nenhum usuário encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsuarios.map((usuario) => (
                  <TableRow key={usuario.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          {usuario.foto_url && (
                            <AvatarImage src={usuario.foto_url} alt={usuario.nome} />
                          )}
                          <AvatarFallback className="bg-secondary text-secondary-foreground">
                            {getInitials(usuario.nome)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="font-medium">{usuario.nome}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {usuario.email}
                    </TableCell>
                    <TableCell>
                      {getRoleBadge(usuario.role)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(usuario.created_at), "dd/MM/yyyy", { locale: ptBR })}
                    </TableCell>
                    <TableCell className="text-right">
                      <Select
                        value={usuario.role}
                        onValueChange={(value: NivelAcesso) => {
                          if (value !== usuario.role) {
                            setChangeRoleDialog({
                              open: true,
                              usuario,
                              newRole: value,
                            });
                          }
                        }}
                      >
                        <SelectTrigger className="w-[140px]">
                          <div className="flex items-center gap-2">
                            {getRoleIcon(usuario.role)}
                            <SelectValue />
                          </div>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">
                            <div className="flex items-center gap-2">
                              <ShieldCheck className="h-4 w-4" />
                              Administrador
                            </div>
                          </SelectItem>
                          <SelectItem value="gerente">
                            <div className="flex items-center gap-2">
                              <Shield className="h-4 w-4" />
                              Gerente
                            </div>
                          </SelectItem>
                          <SelectItem value="operador">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4" />
                              Operador
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Confirm Role Change Dialog */}
      <AlertDialog
        open={changeRoleDialog.open}
        onOpenChange={(open) =>
          !open && setChangeRoleDialog({ open: false, usuario: null, newRole: null })
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Alterar nível de acesso</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja alterar o nível de acesso de{" "}
              <strong>{changeRoleDialog.usuario?.nome}</strong> para{" "}
              <strong>{changeRoleDialog.newRole && getRoleLabel(changeRoleDialog.newRole)}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleRoleChange}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
