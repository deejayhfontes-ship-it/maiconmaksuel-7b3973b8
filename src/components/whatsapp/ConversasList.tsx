import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Search,
  Star,
  StarOff,
  Clock,
  CheckCircle,
  AlertCircle,
  Archive,
  Tag,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { Conversa } from "@/hooks/useWhatsAppConversas";

interface ConversasListProps {
  conversas: Conversa[];
  conversaSelecionada: Conversa | null;
  onSelectConversa: (conversa: Conversa) => void;
  onToggleFavorita: (id: string) => void;
  loading?: boolean;
}

type FiltroStatus = "todos" | "ativo" | "aguardando" | "resolvido" | "favoritas";

export function ConversasList({
  conversas,
  conversaSelecionada,
  onSelectConversa,
  onToggleFavorita,
  loading,
}: ConversasListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>("todos");

  const getInitials = (nome: string) => {
    return nome
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  const getStatusIcon = (status: Conversa["status"]) => {
    switch (status) {
      case "ativo":
        return <span className="h-2 w-2 rounded-full bg-[#25D366]" />;
      case "aguardando":
        return <Clock className="h-3 w-3 text-warning" />;
      case "resolvido":
        return <CheckCircle className="h-3 w-3 text-muted-foreground" />;
      default:
        return null;
    }
  };

  const getEtiquetaBadge = (etiqueta: Conversa["etiqueta"]) => {
    if (!etiqueta) return null;
    const colors: Record<string, string> = {
      urgente: "bg-destructive/20 text-destructive",
      orcamento: "bg-primary/20 text-primary",
      reclamacao: "bg-warning/20 text-warning",
      agendamento: "bg-success/20 text-success",
      geral: "bg-muted text-muted-foreground",
    };
    return (
      <Badge className={cn("text-[10px] px-1.5 py-0", colors[etiqueta])}>
        {etiqueta}
      </Badge>
    );
  };

  const conversasFiltradas = conversas.filter((c) => {
    const matchSearch =
      c.nome_contato.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.telefone.includes(searchQuery) ||
      c.ultima_mensagem?.toLowerCase().includes(searchQuery.toLowerCase());

    let matchStatus = true;
    if (filtroStatus === "favoritas") {
      matchStatus = c.favorita;
    } else if (filtroStatus !== "todos") {
      matchStatus = c.status === filtroStatus;
    }

    return matchSearch && matchStatus;
  });

  const filtros: { key: FiltroStatus; label: string; icon?: React.ReactNode }[] = [
    { key: "todos", label: "Todos" },
    { key: "ativo", label: "Ativos" },
    { key: "aguardando", label: "Aguardando" },
    { key: "resolvido", label: "Resolvidos" },
    { key: "favoritas", label: "⭐" },
  ];

  return (
    <div className="flex flex-col h-full border-r bg-card">
      {/* Search */}
      <div className="p-3 space-y-2 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar conversas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1 overflow-x-auto pb-1">
          {filtros.map((filtro) => (
            <Button
              key={filtro.key}
              variant={filtroStatus === filtro.key ? "default" : "ghost"}
              size="sm"
              className="text-xs shrink-0"
              onClick={() => setFiltroStatus(filtro.key)}
            >
              {filtro.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Conversations */}
      <ScrollArea className="flex-1">
        {loading ? (
          <div className="p-4 text-center text-muted-foreground">
            Carregando...
          </div>
        ) : conversasFiltradas.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <Search className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhuma conversa encontrada</p>
          </div>
        ) : (
          <div className="divide-y">
            {conversasFiltradas.map((conversa) => (
              <button
                key={conversa.id}
                onClick={() => onSelectConversa(conversa)}
                className={cn(
                  "w-full flex items-start gap-3 p-3 text-left transition-colors hover:bg-muted/50",
                  conversaSelecionada?.id === conversa.id && "bg-primary/5"
                )}
              >
                <div className="relative shrink-0">
                  <Avatar className="h-12 w-12">
                    <AvatarImage
                      src={
                        conversa.cliente?.foto_url ||
                        conversa.foto_url ||
                        undefined
                      }
                    />
                    <AvatarFallback className="bg-[#25D366]/10 text-[#25D366] font-semibold">
                      {getInitials(conversa.nome_contato)}
                    </AvatarFallback>
                  </Avatar>
                  {conversa.nao_lidas > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#25D366] text-[10px] font-bold text-white">
                      {conversa.nao_lidas}
                    </span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {conversa.favorita && (
                        <Star className="h-3 w-3 text-warning fill-warning shrink-0" />
                      )}
                      <p className="font-semibold truncate">
                        {conversa.nome_contato}
                      </p>
                      {conversa.cliente && (
                        <Badge variant="secondary" className="text-[9px] px-1">
                          Cliente
                        </Badge>
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                      {conversa.ultima_mensagem_hora &&
                        formatDistanceToNow(
                          new Date(conversa.ultima_mensagem_hora),
                          { addSuffix: false, locale: ptBR }
                        )}
                    </span>
                  </div>

                  <p className="text-sm text-muted-foreground truncate mt-0.5">
                    {conversa.ultima_mensagem || "Sem mensagens"}
                  </p>

                  <div className="flex items-center gap-1.5 mt-1">
                    {getStatusIcon(conversa.status)}
                    {getEtiquetaBadge(conversa.etiqueta)}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Stats footer */}
      <div className="p-2 border-t bg-muted/30 text-xs text-muted-foreground text-center">
        {conversas.length} conversas •{" "}
        {conversas.reduce((acc, c) => acc + c.nao_lidas, 0)} não lidas
      </div>
    </div>
  );
}
