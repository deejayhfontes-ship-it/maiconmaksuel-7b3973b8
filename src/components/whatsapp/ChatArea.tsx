import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Send,
  Smile,
  Paperclip,
  MoreVertical,
  Check,
  CheckCheck,
  Clock,
  AlertCircle,
  User,
  Calendar,
  History,
  Tag,
  Archive,
  Star,
  Phone,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { Conversa, Mensagem, RespostaRapida } from "@/hooks/useWhatsAppConversas";

interface ChatAreaProps {
  conversa: Conversa | null;
  mensagens: Mensagem[];
  respostasRapidas: RespostaRapida[];
  enviando: boolean;
  onEnviarMensagem: (texto: string) => Promise<boolean>;
  onUpdateStatus: (status: Conversa["status"]) => void;
  onUpdateEtiqueta: (etiqueta: Conversa["etiqueta"]) => void;
  onArquivar: () => void;
  onToggleFavorita: () => void;
  onVerCliente?: () => void;
  onNovoAgendamento?: () => void;
}

export function ChatArea({
  conversa,
  mensagens,
  respostasRapidas,
  enviando,
  onEnviarMensagem,
  onUpdateStatus,
  onUpdateEtiqueta,
  onArquivar,
  onToggleFavorita,
  onVerCliente,
  onNovoAgendamento,
}: ChatAreaProps) {
  const [novaMensagem, setNovaMensagem] = useState("");
  const [showRespostas, setShowRespostas] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [mensagens]);

  const handleEnviar = async () => {
    if (!novaMensagem.trim() || enviando) return;
    const texto = novaMensagem;
    setNovaMensagem("");
    await onEnviarMensagem(texto);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleEnviar();
    }
  };

  const handleRespostaRapida = (resposta: RespostaRapida) => {
    setNovaMensagem(resposta.mensagem);
    setShowRespostas(false);
    textareaRef.current?.focus();
  };

  const getStatusIcon = (status: Mensagem["status"]) => {
    switch (status) {
      case "enviando":
        return <Clock className="h-3 w-3 text-muted-foreground" />;
      case "enviada":
        return <Check className="h-3 w-3 text-muted-foreground" />;
      case "entregue":
        return <CheckCheck className="h-3 w-3 text-muted-foreground" />;
      case "lida":
        return <CheckCheck className="h-3 w-3 text-primary" />;
      case "erro":
        return <AlertCircle className="h-3 w-3 text-destructive" />;
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

  const getStatusBadge = (status: Conversa["status"]) => {
    const styles: Record<string, string> = {
      ativo: "bg-success/20 text-success",
      aguardando: "bg-warning/20 text-warning",
      resolvido: "bg-muted text-muted-foreground",
      arquivado: "bg-muted text-muted-foreground",
    };
    return (
      <Badge className={cn("border-0", styles[status])}>{status}</Badge>
    );
  };

  if (!conversa) {
    return (
      <div className="flex-1 flex items-center justify-center bg-muted/20">
        <div className="text-center text-muted-foreground">
          <Phone className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">Selecione uma conversa</p>
          <p className="text-sm">Escolha uma conversa ao lado para começar</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b bg-card">
        <Avatar className="h-10 w-10">
          <AvatarImage
            src={conversa.cliente?.foto_url || conversa.foto_url || undefined}
          />
          <AvatarFallback className="bg-[#25D366]/10 text-[#25D366]">
            {getInitials(conversa.nome_contato)}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold truncate">{conversa.nome_contato}</p>
            {conversa.favorita && (
              <Star className="h-4 w-4 text-warning fill-warning" />
            )}
          </div>
          <p className="text-xs text-muted-foreground">{conversa.telefone}</p>
        </div>

        {getStatusBadge(conversa.status)}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {conversa.cliente && onVerCliente && (
              <DropdownMenuItem onClick={onVerCliente}>
                <User className="h-4 w-4 mr-2" />
                Ver Cliente
              </DropdownMenuItem>
            )}
            {onNovoAgendamento && (
              <DropdownMenuItem onClick={onNovoAgendamento}>
                <Calendar className="h-4 w-4 mr-2" />
                Novo Agendamento
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onToggleFavorita}>
              <Star className="h-4 w-4 mr-2" />
              {conversa.favorita ? "Remover Favorito" : "Favoritar"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onUpdateStatus("ativo")}>
              Marcar como Ativo
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onUpdateStatus("aguardando")}>
              Marcar como Aguardando
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onUpdateStatus("resolvido")}>
              Marcar como Resolvido
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onUpdateEtiqueta("urgente")}>
              <Tag className="h-4 w-4 mr-2 text-destructive" />
              Urgente
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onUpdateEtiqueta("agendamento")}>
              <Tag className="h-4 w-4 mr-2 text-success" />
              Agendamento
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onUpdateEtiqueta("orcamento")}>
              <Tag className="h-4 w-4 mr-2 text-primary" />
              Orçamento
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onUpdateEtiqueta(null)}>
              Remover Etiqueta
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onArquivar} className="text-destructive">
              <Archive className="h-4 w-4 mr-2" />
              Arquivar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-3 max-w-3xl mx-auto">
          {mensagens.map((msg) => (
            <div
              key={msg.id}
              className={cn("flex", msg.enviada ? "justify-end" : "justify-start")}
            >
              <div
                className={cn(
                  "max-w-[75%] rounded-2xl px-4 py-2 shadow-sm",
                  msg.enviada
                    ? "bg-[#DCF8C6] text-foreground rounded-br-md"
                    : "bg-card border rounded-bl-md"
                )}
              >
                {msg.tipo === "sistema" ? (
                  <p className="text-xs text-muted-foreground italic text-center">
                    {msg.texto}
                  </p>
                ) : (
                  <>
                    <p className="text-sm whitespace-pre-wrap">{msg.texto}</p>
                    <div
                      className={cn(
                        "flex items-center justify-end gap-1 mt-1",
                        "text-muted-foreground"
                      )}
                    >
                      <span className="text-[10px]">
                        {format(new Date(msg.created_at), "HH:mm")}
                      </span>
                      {msg.enviada && getStatusIcon(msg.status)}
                    </div>
                    {msg.status === "erro" && msg.erro_mensagem && (
                      <p className="text-[10px] text-destructive mt-1">
                        {msg.erro_mensagem}
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Quick Replies */}
      {showRespostas && respostasRapidas.length > 0 && (
        <div className="px-4 py-2 border-t bg-muted/30">
          <p className="text-xs text-muted-foreground mb-2">⚡ Respostas Rápidas:</p>
          <div className="flex flex-wrap gap-1.5">
            {respostasRapidas.map((r) => (
              <Button
                key={r.id}
                variant="secondary"
                size="sm"
                className="text-xs h-7"
                onClick={() => handleRespostaRapida(r)}
              >
                {r.titulo}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-3 border-t bg-card">
        <div className="flex items-end gap-2 max-w-3xl mx-auto">
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0"
            onClick={() => setShowRespostas(!showRespostas)}
          >
            <Smile className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="shrink-0">
            <Paperclip className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <textarea
              ref={textareaRef}
              value={novaMensagem}
              onChange={(e) => setNovaMensagem(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Digite uma mensagem..."
              className="w-full min-h-[44px] max-h-[120px] p-3 rounded-2xl border bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary text-sm"
              rows={1}
            />
          </div>
          <Button
            size="icon"
            className="h-11 w-11 rounded-full shrink-0 bg-[#25D366] hover:bg-[#128C7E]"
            onClick={handleEnviar}
            disabled={!novaMensagem.trim() || enviando}
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
