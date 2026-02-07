import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  User,
  Calendar,
  History,
  Phone,
  Mail,
  MapPin,
  Clock,
  Star,
  Plus,
  ExternalLink,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Conversa } from "@/hooks/useWhatsAppConversas";

interface ClienteInfoPanelProps {
  conversa: Conversa | null;
  onVerCliente?: () => void;
  onNovoAgendamento?: () => void;
  onVerHistorico?: () => void;
}

export function ClienteInfoPanel({
  conversa,
  onVerCliente,
  onNovoAgendamento,
  onVerHistorico,
}: ClienteInfoPanelProps) {
  if (!conversa) {
    return (
      <div className="w-72 border-l bg-card p-4 hidden xl:block">
        <div className="h-full flex items-center justify-center text-muted-foreground">
          <p className="text-sm text-center">
            Selecione uma conversa para ver detalhes
          </p>
        </div>
      </div>
    );
  }

  const cliente = conversa.cliente;
  const isClienteCadastrado = !!cliente;

  const getInitials = (nome: string) => {
    return nome
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  return (
    <div className="w-72 border-l bg-card p-4 hidden xl:flex flex-col gap-4">
      {/* Header */}
      <div className="text-center">
        <Avatar className="h-20 w-20 mx-auto mb-3">
          <AvatarImage
            src={cliente?.foto_url || conversa.foto_url || undefined}
          />
          <AvatarFallback className="bg-[#25D366]/10 text-[#25D366] text-2xl">
            {getInitials(conversa.nome_contato)}
          </AvatarFallback>
        </Avatar>
        <h3 className="font-semibold text-lg">{conversa.nome_contato}</h3>
        <p className="text-sm text-muted-foreground">{conversa.telefone}</p>
        {isClienteCadastrado ? (
          <Badge className="mt-2 bg-success/20 text-success border-0">
            <Star className="h-3 w-3 mr-1" />
            Cliente Cadastrado
          </Badge>
        ) : (
          <Badge variant="secondary" className="mt-2">
            Novo Contato
          </Badge>
        )}
      </div>

      <Separator />

      {/* Client Info */}
      {isClienteCadastrado && cliente && (
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Informações
          </h4>

          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>
                {cliente.total_visitas} visita
                {cliente.total_visitas !== 1 ? "s" : ""}
              </span>
            </div>
            {cliente.ultima_visita && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>
                  Última visita:{" "}
                  {formatDistanceToNow(new Date(cliente.ultima_visita), {
                    addSuffix: true,
                    locale: ptBR,
                  })}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Conversation Info */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Conversa
        </h4>

        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Status:</span>
            <Badge variant="secondary" className="capitalize">
              {conversa.status}
            </Badge>
          </div>
          {conversa.etiqueta && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Etiqueta:</span>
              <Badge variant="outline" className="capitalize">
                {conversa.etiqueta}
              </Badge>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Iniciada em:</span>
            <span>
              {format(new Date(conversa.created_at), "dd/MM/yyyy", {
                locale: ptBR,
              })}
            </span>
          </div>
        </div>
      </div>

      <Separator />

      {/* Actions */}
      <div className="space-y-2 mt-auto">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Ações Rápidas
        </h4>

        {isClienteCadastrado ? (
          <>
            <Button
              variant="outline"
              className="w-full justify-start"
              size="sm"
              onClick={onVerCliente}
            >
              <User className="h-4 w-4 mr-2" />
              Ver Ficha Completa
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              size="sm"
              onClick={onNovoAgendamento}
            >
              <Calendar className="h-4 w-4 mr-2" />
              Novo Agendamento
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              size="sm"
              onClick={onVerHistorico}
            >
              <History className="h-4 w-4 mr-2" />
              Histórico de Atendimentos
            </Button>
          </>
        ) : (
          <Button
            className="w-full bg-[#25D366] hover:bg-[#128C7E]"
            size="sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            Cadastrar Cliente
          </Button>
        )}
      </div>
    </div>
  );
}
