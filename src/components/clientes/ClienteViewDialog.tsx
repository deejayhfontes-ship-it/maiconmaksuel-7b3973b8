import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Phone, Mail, MapPin, Calendar, FileText } from "lucide-react";

interface Cliente {
  id: string;
  nome: string;
  telefone: string | null;
  celular: string;
  email: string | null;
  cpf: string | null;
  data_nascimento: string | null;
  endereco: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
  observacoes: string | null;
  foto_url: string | null;
  ativo: boolean;
  ultima_visita: string | null;
  created_at: string;
  updated_at: string;
}

interface ClienteViewDialogProps {
  open: boolean;
  onClose: () => void;
  cliente: Cliente | null;
}

const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
};

const getAvatarColor = (name: string) => {
  const colors = [
    "bg-primary",
    "bg-success",
    "bg-warning",
    "bg-pink-500",
    "bg-purple-500",
    "bg-cyan-500",
    "bg-orange-500",
  ];
  const index = name.charCodeAt(0) % colors.length;
  return colors[index];
};

export default function ClienteViewDialog({
  open,
  onClose,
  cliente,
}: ClienteViewDialogProps) {
  if (!cliente) return null;

  const endereco = [
    cliente.endereco,
    cliente.numero && `nº ${cliente.numero}`,
    cliente.complemento,
    cliente.bairro,
    cliente.cidade && cliente.estado && `${cliente.cidade} - ${cliente.estado}`,
    cliente.cep,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Detalhes do Cliente</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header com avatar e nome */}
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={cliente.foto_url || undefined} />
              <AvatarFallback
                className={`${getAvatarColor(cliente.nome)} text-white text-xl`}
              >
                {getInitials(cliente.nome)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="text-xl font-semibold">{cliente.nome}</h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge
                  variant={cliente.ativo ? "default" : "secondary"}
                  className={
                    cliente.ativo
                      ? "bg-success/10 text-success"
                      : "bg-muted text-muted-foreground"
                  }
                >
                  {cliente.ativo ? "Ativo" : "Inativo"}
                </Badge>
                {cliente.cpf && (
                  <span className="text-sm text-muted-foreground">
                    CPF: {cliente.cpf}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Contato */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Contato
            </h4>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{cliente.celular}</span>
                {cliente.telefone && (
                  <span className="text-muted-foreground">
                    / {cliente.telefone}
                  </span>
                )}
              </div>
              {cliente.email && (
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{cliente.email}</span>
                </div>
              )}
            </div>
          </div>

          {/* Data de nascimento */}
          {cliente.data_nascimento && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Aniversário
              </h4>
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>
                  {format(new Date(cliente.data_nascimento), "dd 'de' MMMM", {
                    locale: ptBR,
                  })}
                </span>
              </div>
            </div>
          )}

          {/* Endereço */}
          {endereco && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Endereço
              </h4>
              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                <span>{endereco}</span>
              </div>
            </div>
          )}

          {/* Observações */}
          {cliente.observacoes && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Observações
              </h4>
              <div className="flex items-start gap-3">
                <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                <span className="text-sm">{cliente.observacoes}</span>
              </div>
            </div>
          )}

          {/* Datas */}
          <div className="pt-4 border-t text-xs text-muted-foreground space-y-1">
            <p>
              Cadastrado em:{" "}
              {format(new Date(cliente.created_at), "dd/MM/yyyy 'às' HH:mm", {
                locale: ptBR,
              })}
            </p>
            {cliente.ultima_visita && (
              <p>
                Última visita:{" "}
                {format(new Date(cliente.ultima_visita), "dd/MM/yyyy 'às' HH:mm", {
                  locale: ptBR,
                })}
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
