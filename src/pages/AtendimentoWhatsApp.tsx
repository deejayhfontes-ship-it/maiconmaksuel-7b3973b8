import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  MessageSquare,
  Search,
  Send,
  Phone,
  MoreVertical,
  CheckCheck,
  Check,
  Clock,
  User,
  Calendar,
  ArrowLeft,
  Smile,
  Paperclip,
  Settings,
  Filter,
  RefreshCw,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface Conversa {
  id: string;
  cliente_id: string;
  cliente_nome: string;
  cliente_celular: string;
  cliente_foto: string | null;
  ultima_mensagem: string;
  ultima_mensagem_hora: Date;
  nao_lidas: number;
  status: "ativo" | "aguardando" | "resolvido";
}

interface Mensagem {
  id: string;
  texto: string;
  enviada: boolean; // true = enviada pelo salão, false = recebida do cliente
  hora: Date;
  status: "enviando" | "enviada" | "entregue" | "lida";
}

// Dados mockados para demonstração
const conversasMock: Conversa[] = [
  {
    id: "1",
    cliente_id: "c1",
    cliente_nome: "Maria Silva",
    cliente_celular: "(11) 99999-1234",
    cliente_foto: null,
    ultima_mensagem: "Oi, gostaria de confirmar meu horário de amanhã",
    ultima_mensagem_hora: new Date(Date.now() - 300000),
    nao_lidas: 2,
    status: "ativo",
  },
  {
    id: "2",
    cliente_id: "c2",
    cliente_nome: "João Santos",
    cliente_celular: "(11) 98888-5678",
    cliente_foto: null,
    ultima_mensagem: "Perfeito, até amanhã então!",
    ultima_mensagem_hora: new Date(Date.now() - 3600000),
    nao_lidas: 0,
    status: "resolvido",
  },
  {
    id: "3",
    cliente_id: "c3",
    cliente_nome: "Ana Costa",
    cliente_celular: "(11) 97777-9012",
    cliente_foto: null,
    ultima_mensagem: "Qual o valor do corte + progressiva?",
    ultima_mensagem_hora: new Date(Date.now() - 7200000),
    nao_lidas: 1,
    status: "aguardando",
  },
  {
    id: "4",
    cliente_id: "c4",
    cliente_nome: "Pedro Lima",
    cliente_celular: "(11) 96666-3456",
    cliente_foto: null,
    ultima_mensagem: "Obrigado pelo atendimento!",
    ultima_mensagem_hora: new Date(Date.now() - 86400000),
    nao_lidas: 0,
    status: "resolvido",
  },
];

const mensagensMock: Record<string, Mensagem[]> = {
  "1": [
    { id: "m1", texto: "Olá Maria! Tudo bem? 😊", enviada: true, hora: new Date(Date.now() - 600000), status: "lida" },
    { id: "m2", texto: "Oi! Tudo sim, e você?", enviada: false, hora: new Date(Date.now() - 550000), status: "lida" },
    { id: "m3", texto: "Estamos bem! Em que posso ajudar?", enviada: true, hora: new Date(Date.now() - 500000), status: "lida" },
    { id: "m4", texto: "Oi, gostaria de confirmar meu horário de amanhã", enviada: false, hora: new Date(Date.now() - 300000), status: "lida" },
    { id: "m5", texto: "Está marcado para às 14h com a Fernanda, corte + escova", enviada: false, hora: new Date(Date.now() - 280000), status: "lida" },
  ],
  "2": [
    { id: "m1", texto: "João, seu horário está confirmado para amanhã às 10h", enviada: true, hora: new Date(Date.now() - 7200000), status: "lida" },
    { id: "m2", texto: "Perfeito, até amanhã então!", enviada: false, hora: new Date(Date.now() - 3600000), status: "lida" },
  ],
  "3": [
    { id: "m1", texto: "Qual o valor do corte + progressiva?", enviada: false, hora: new Date(Date.now() - 7200000), status: "lida" },
  ],
};

export default function AtendimentoWhatsApp() {
  const [conversas, setConversas] = useState<Conversa[]>(conversasMock);
  const [conversaSelecionada, setConversaSelecionada] = useState<Conversa | null>(null);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [novaMensagem, setNovaMensagem] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<string>("todos");
  const [enviando, setEnviando] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (conversaSelecionada) {
      setMensagens(mensagensMock[conversaSelecionada.id] || []);
    }
  }, [conversaSelecionada]);

  useEffect(() => {
    scrollToBottom();
  }, [mensagens]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleEnviarMensagem = async () => {
    if (!novaMensagem.trim() || !conversaSelecionada) return;

    setEnviando(true);
    const novaMsgTemp: Mensagem = {
      id: `temp-${Date.now()}`,
      texto: novaMensagem,
      enviada: true,
      hora: new Date(),
      status: "enviando",
    };

    setMensagens((prev) => [...prev, novaMsgTemp]);
    setNovaMensagem("");

    try {
      // Simular envio via API
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setMensagens((prev) =>
        prev.map((m) =>
          m.id === novaMsgTemp.id ? { ...m, status: "entregue" as const } : m
        )
      );

      toast.success("Mensagem enviada!");
    } catch (error) {
      toast.error("Erro ao enviar mensagem");
      setMensagens((prev) => prev.filter((m) => m.id !== novaMsgTemp.id));
    } finally {
      setEnviando(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleEnviarMensagem();
    }
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
    }
  };

  const getStatusBadge = (status: Conversa["status"]) => {
    switch (status) {
      case "ativo":
        return <Badge className="bg-success/20 text-success border-0">Ativo</Badge>;
      case "aguardando":
        return <Badge className="bg-warning/20 text-warning border-0">Aguardando</Badge>;
      case "resolvido":
        return <Badge variant="secondary">Resolvido</Badge>;
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

  const conversasFiltradas = conversas.filter((c) => {
    const matchSearch =
      c.cliente_nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.cliente_celular.includes(searchQuery);
    const matchStatus = filtroStatus === "todos" || c.status === filtroStatus;
    return matchSearch && matchStatus;
  });

  const totalNaoLidas = conversas.reduce((acc, c) => acc + c.nao_lidas, 0);

  // Mobile: Show either list or chat
  if (isMobile && conversaSelecionada) {
    return (
      <div className="h-[calc(100vh-4rem)] flex flex-col bg-background">
        {/* Mobile Chat Header */}
        <div className="flex items-center gap-3 p-3 border-b bg-card">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setConversaSelecionada(null)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Avatar className="h-10 w-10">
            <AvatarImage src={conversaSelecionada.cliente_foto || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary">
              {getInitials(conversaSelecionada.cliente_nome)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-semibold truncate">{conversaSelecionada.cliente_nome}</p>
            <p className="text-xs text-muted-foreground">{conversaSelecionada.cliente_celular}</p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <User className="h-4 w-4 mr-2" />
                Ver cliente
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Calendar className="h-4 w-4 mr-2" />
                Agendar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-3">
            {mensagens.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "flex",
                  msg.enviada ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl px-4 py-2 shadow-sm",
                    msg.enviada
                      ? "bg-primary text-primary-foreground rounded-br-md"
                      : "bg-muted rounded-bl-md"
                  )}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.texto}</p>
                  <div
                    className={cn(
                      "flex items-center justify-end gap-1 mt-1",
                      msg.enviada ? "text-primary-foreground/70" : "text-muted-foreground"
                    )}
                  >
                    <span className="text-[10px]">{format(msg.hora, "HH:mm")}</span>
                    {msg.enviada && getStatusIcon(msg.status)}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="p-3 border-t bg-card">
          <div className="flex items-end gap-2">
            <div className="flex-1 relative">
              <textarea
                value={novaMensagem}
                onChange={(e) => setNovaMensagem(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Digite uma mensagem..."
                className="w-full min-h-[44px] max-h-[120px] p-3 pr-10 rounded-2xl border bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                rows={1}
              />
            </div>
            <Button
              size="icon"
              className="h-11 w-11 rounded-full shrink-0"
              onClick={handleEnviarMensagem}
              disabled={!novaMensagem.trim() || enviando}
            >
              <Send className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#25D366]/10">
            <MessageSquare className="h-6 w-6 text-[#25D366]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Atendimento WhatsApp</h1>
            <p className="text-sm text-muted-foreground">
              {totalNaoLidas > 0
                ? `${totalNaoLidas} mensagem${totalNaoLidas > 1 ? "s" : ""} não lida${totalNaoLidas > 1 ? "s" : ""}`
                : "Todas as conversas em dia"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to="/configuracoes/whatsapp">
              <Settings className="h-4 w-4 mr-1" />
              Configurar
            </Link>
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <Card className="flex-1 flex overflow-hidden">
        {/* Conversations List */}
        <div
          className={cn(
            "flex flex-col border-r",
            isMobile ? "w-full" : "w-80 lg:w-96"
          )}
        >
          {/* Search & Filter */}
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
            <div className="flex gap-1">
              {["todos", "ativo", "aguardando", "resolvido"].map((status) => (
                <Button
                  key={status}
                  variant={filtroStatus === status ? "default" : "ghost"}
                  size="sm"
                  className="flex-1 text-xs capitalize"
                  onClick={() => setFiltroStatus(status)}
                >
                  {status}
                </Button>
              ))}
            </div>
          </div>

          {/* Conversations */}
          <ScrollArea className="flex-1">
            <div className="divide-y">
              {conversasFiltradas.map((conversa) => (
                <button
                  key={conversa.id}
                  onClick={() => setConversaSelecionada(conversa)}
                  className={cn(
                    "w-full flex items-start gap-3 p-3 text-left transition-colors hover:bg-muted/50",
                    conversaSelecionada?.id === conversa.id && "bg-primary/5"
                  )}
                >
                  <div className="relative">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={conversa.cliente_foto || undefined} />
                      <AvatarFallback className="bg-[#25D366]/10 text-[#25D366] font-semibold">
                        {getInitials(conversa.cliente_nome)}
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
                      <p className="font-semibold truncate">{conversa.cliente_nome}</p>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(conversa.ultima_mensagem_hora, {
                          addSuffix: false,
                          locale: ptBR,
                        })}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground truncate mt-0.5">
                      {conversa.ultima_mensagem}
                    </p>
                    <div className="mt-1">{getStatusBadge(conversa.status)}</div>
                  </div>
                </button>
              ))}
              {conversasFiltradas.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Nenhuma conversa encontrada</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Chat Area - Desktop */}
        {!isMobile && (
          <div className="flex-1 flex flex-col">
            {conversaSelecionada ? (
              <>
                {/* Chat Header */}
                <div className="flex items-center gap-3 p-4 border-b bg-card">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={conversaSelecionada.cliente_foto || undefined} />
                    <AvatarFallback className="bg-[#25D366]/10 text-[#25D366]">
                      {getInitials(conversaSelecionada.cliente_nome)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-semibold">{conversaSelecionada.cliente_nome}</p>
                    <p className="text-xs text-muted-foreground">
                      {conversaSelecionada.cliente_celular}
                    </p>
                  </div>
                  {getStatusBadge(conversaSelecionada.status)}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-5 w-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link to={`/clientes`}>
                          <User className="h-4 w-4 mr-2" />
                          Ver cliente
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to="/agenda">
                          <Calendar className="h-4 w-4 mr-2" />
                          Agendar
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Phone className="h-4 w-4 mr-2" />
                        Ligar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Messages */}
                <ScrollArea className="flex-1 p-4 bg-muted/20">
                  <div className="space-y-3 max-w-3xl mx-auto">
                    {mensagens.map((msg) => (
                      <div
                        key={msg.id}
                        className={cn(
                          "flex",
                          msg.enviada ? "justify-end" : "justify-start"
                        )}
                      >
                        <div
                          className={cn(
                            "max-w-[70%] rounded-2xl px-4 py-2 shadow-sm",
                            msg.enviada
                              ? "bg-[#25D366] text-white rounded-br-md"
                              : "bg-card rounded-bl-md"
                          )}
                        >
                          <p className="text-sm whitespace-pre-wrap">{msg.texto}</p>
                          <div
                            className={cn(
                              "flex items-center justify-end gap-1 mt-1",
                              msg.enviada ? "text-white/70" : "text-muted-foreground"
                            )}
                          >
                            <span className="text-[10px]">{format(msg.hora, "HH:mm")}</span>
                            {msg.enviada && getStatusIcon(msg.status)}
                          </div>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                {/* Input */}
                <div className="p-4 border-t bg-card">
                  <div className="flex items-end gap-3 max-w-3xl mx-auto">
                    <Button variant="ghost" size="icon" className="shrink-0">
                      <Smile className="h-5 w-5 text-muted-foreground" />
                    </Button>
                    <Button variant="ghost" size="icon" className="shrink-0">
                      <Paperclip className="h-5 w-5 text-muted-foreground" />
                    </Button>
                    <div className="flex-1 relative">
                      <textarea
                        value={novaMensagem}
                        onChange={(e) => setNovaMensagem(e.target.value)}
                        onKeyDown={handleKeyPress}
                        placeholder="Digite uma mensagem..."
                        className="w-full min-h-[44px] max-h-[120px] p-3 rounded-2xl border bg-background resize-none focus:outline-none focus:ring-2 focus:ring-[#25D366]"
                        rows={1}
                      />
                    </div>
                    <Button
                      size="icon"
                      className="h-11 w-11 rounded-full shrink-0 bg-[#25D366] hover:bg-[#25D366]/90"
                      onClick={handleEnviarMensagem}
                      disabled={!novaMensagem.trim() || enviando}
                    >
                      <Send className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8">
                <div className="w-24 h-24 rounded-full bg-[#25D366]/10 flex items-center justify-center mb-4">
                  <MessageSquare className="h-12 w-12 text-[#25D366]" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  Atendimento WhatsApp
                </h3>
                <p className="text-center max-w-sm">
                  Selecione uma conversa para visualizar as mensagens e responder aos clientes.
                </p>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
