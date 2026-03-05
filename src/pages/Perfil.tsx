import { usePinAuth } from "@/contexts/PinAuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { User, Shield } from "lucide-react";

export default function Perfil() {
  const { session } = usePinAuth();

  const getInitials = (nome: string) => {
    return nome
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  const getRoleBadge = (role: string | null) => {
    switch (role) {
      case "admin":
        return <Badge variant="default">Administrador</Badge>;
      case "notebook":
        return <Badge variant="secondary">Notebook</Badge>;
      case "kiosk":
        return <Badge variant="outline">Kiosk</Badge>;
      default:
        return null;
    }
  };

  const getRoleDescription = (role: string | null) => {
    switch (role) {
      case "admin":
        return "Acesso total ao sistema";
      case "notebook":
        return "Agenda e gestão básica, sem financeiro";
      case "kiosk":
        return "PDV/Caixa, ponto e mini agenda";
      default:
        return "Sem perfil definido";
    }
  };

  const perfilNome = session?.nome;
  const role = session?.role;

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Meu Perfil</h1>
        <p className="text-muted-foreground">
          Informações do perfil de acesso atual
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar className="h-20 w-20 ring-4 ring-primary/20">
                <AvatarFallback className="ios-avatar-gradient text-primary-foreground text-xl font-semibold">
                  {perfilNome ? getInitials(perfilNome) : <User className="h-8 w-8" />}
                </AvatarFallback>
              </Avatar>
            </div>
            <div>
              <CardTitle>{perfilNome || "Perfil de Acesso"}</CardTitle>
              <CardDescription className="flex items-center gap-2 mt-1">
                {role && getRoleBadge(role)}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <User className="h-4 w-4" />
                Nome do Perfil
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium">{perfilNome || "Não identificado"}</p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Shield className="h-4 w-4" />
                Nível de Acesso
              </div>
              <div className="p-3 bg-muted rounded-lg">
                {getRoleBadge(role ?? null)}
                <p className="text-xs text-muted-foreground mt-2">
                  {getRoleDescription(role ?? null)}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
