import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  MessageSquare,
  Send,
  Search,
  Bell,
  X,
  ArrowRight,
  User,
  Phone,
  Clock,
  Check,
  CheckCheck,
  MessageCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useComunicacao } from "@/hooks/useComunicacao";

interface Cliente {
  id: string;
  nome: string;
  celular: string;
  foto_url: string | null;
  ultima_visita: string | null;
}

interface Notificacao {
  id: string;
  tipo: "lembrete" | "resposta" | "confirmacao" | "cancelamento";
  titulo: string;
  mensagem: string;
  cliente?: string;
  data: Date;
  lida: boolean;
}

export function WhatsAppDashboardCard() {
  const { estatisticasHoje, creditos, lembretes } = useComunicacao();
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // Simular notificações pendentes
    const mockNotificacoes: Notificacao[] = [
      {
        id: "1",
        tipo: "resposta",
        titulo: "Nova resposta",
        mensagem: "Cliente respondeu à confirmação de agendamento",
        cliente: "Maria Silva",
        data: new Date(),
        lida: false,
      },
      {
        id: "2",
        tipo: "confirmacao",
        titulo: "Agendamento confirmado",
        mensagem: "Cliente confirmou agendamento para amanhã",
        cliente: "João Santos",
        data: new Date(Date.now() - 3600000),
        lida: false,
      },
      {
        id: "3",
        tipo: "cancelamento",
        titulo: "Cancelamento",
        mensagem: "Cliente solicitou cancelamento",
        cliente: "Ana Costa",
        data: new Date(Date.now() - 7200000),
        lida: true,
      },
    ];
    setNotificacoes(mockNotificacoes);
    setUnreadCount(mockNotificacoes.filter((n) => !n.lida).length);
  }, []);

  const getNotificacaoIcon = (tipo: Notificacao["tipo"]) => {
    switch (tipo) {
      case "resposta":
        return <MessageCircle className="h-4 w-4 text-primary" />;
      case "confirmacao":
        return <CheckCheck className="h-4 w-4 text-success" />;
      case "cancelamento":
        return <X className="h-4 w-4 text-destructive" />;
      default:
        return <Bell className="h-4 w-4 text-warning" />;
    }
  };

  const lembretesAtivos = lembretes?.filter((l) => l.ativo).length || 0;

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <MessageSquare className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">
                Central WhatsApp
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {lembretesAtivos} lembretes ativos
              </p>
            </div>
          </div>
          {unreadCount > 0 && (
            <Badge variant="destructive" className="animate-pulse">
              {unreadCount} nova{unreadCount > 1 ? "s" : ""}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Estatísticas rápidas */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg bg-muted/50 p-2 text-center">
            <p className="text-lg font-bold text-foreground">
              {estatisticasHoje?.mensagens_enviadas || 0}
            </p>
            <p className="text-[10px] text-muted-foreground">Enviadas</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-2 text-center">
            <p className="text-lg font-bold text-success">
              {estatisticasHoje?.agendamentos_confirmados || 0}
            </p>
            <p className="text-[10px] text-muted-foreground">Confirmados</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-2 text-center">
            <p className="text-lg font-bold text-foreground">
              {creditos?.saldo_creditos || 0}
            </p>
            <p className="text-[10px] text-muted-foreground">Créditos</p>
          </div>
        </div>

        {/* Notificações recentes */}
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">
            Notificações Recentes
          </p>
          <ScrollArea className="h-[120px]">
            <div className="space-y-1.5">
              {notificacoes.slice(0, 5).map((notif) => (
                <div
                  key={notif.id}
                  className={`flex items-start gap-2 rounded-lg p-2 transition-colors ${
                    notif.lida ? "bg-muted/30" : "bg-primary/10"
                  }`}
                >
                  <div className="mt-0.5">
                    {getNotificacaoIcon(notif.tipo)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">
                      {notif.cliente || notif.titulo}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {notif.mensagem}
                    </p>
                  </div>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                    {format(notif.data, "HH:mm")}
                  </span>
                </div>
              ))}
              {notificacoes.length === 0 && (
                <div className="text-center py-4 text-muted-foreground">
                  <Bell className="h-8 w-8 mx-auto mb-1 opacity-50" />
                  <p className="text-xs">Nenhuma notificação</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Ações */}
        <div className="flex gap-2">
          <Button asChild variant="default" size="sm" className="flex-1">
            <Link to="/configuracoes/whatsapp">
              <MessageSquare className="h-4 w-4 mr-1" />
              Abrir Central
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Floating WhatsApp Button
export function WhatsAppFloatingButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loadingClientes, setLoadingClientes] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [mensagem, setMensagem] = useState("");
  const [enviando, setEnviando] = useState(false);
  const { creditos, templatesProntos } = useComunicacao();
  
  const [notificacoes] = useState<Notificacao[]>([
    {
      id: "1",
      tipo: "resposta",
      titulo: "Nova resposta",
      mensagem: "Cliente respondeu",
      cliente: "Maria Silva",
      data: new Date(),
      lida: false,
    },
    {
      id: "2",
      tipo: "confirmacao",
      titulo: "Confirmado",
      mensagem: "Agendamento confirmado",
      cliente: "João Santos",
      data: new Date(Date.now() - 3600000),
      lida: false,
    },
  ]);

  const unreadCount = notificacoes.filter((n) => !n.lida).length;

  useEffect(() => {
    if (isOpen && searchQuery.length >= 2) {
      searchClientes();
    }
  }, [searchQuery, isOpen]);

  const searchClientes = async () => {
    setLoadingClientes(true);
    try {
      const { data } = await supabase
        .from("clientes")
        .select("id, nome, celular, foto_url, ultima_visita")
        .or(`nome.ilike.%${searchQuery}%,celular.ilike.%${searchQuery}%`)
        .eq("receber_mensagens", true)
        .limit(10);
      setClientes(data || []);
    } catch (error) {
      console.error("Erro ao buscar clientes:", error);
    } finally {
      setLoadingClientes(false);
    }
  };

  const handleEnviarMensagem = async () => {
    if (!selectedCliente || !mensagem.trim()) {
      toast.error("Selecione um cliente e digite uma mensagem");
      return;
    }

    setEnviando(true);
    try {
      // Simular envio (aqui você conectaria com a API do WhatsApp)
      await new Promise((resolve) => setTimeout(resolve, 1500));
      toast.success(`Mensagem enviada para ${selectedCliente.nome}!`);
      setMensagem("");
      setSelectedCliente(null);
      setSearchQuery("");
    } catch (error) {
      toast.error("Erro ao enviar mensagem");
    } finally {
      setEnviando(false);
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

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all hover:scale-110 hover:shadow-xl active:scale-95"
      >
        <MessageSquare className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Modal */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md p-0 gap-0">
          <DialogHeader className="p-4 pb-2 border-b">
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              Envio Rápido de Mensagem
            </DialogTitle>
          </DialogHeader>

          <div className="p-4 space-y-4">
            {/* Buscar Cliente */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Buscar Cliente</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Nome ou telefone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Lista de clientes */}
              {searchQuery.length >= 2 && (
                <ScrollArea className="h-[150px] border rounded-lg">
                  <div className="p-2 space-y-1">
                    {loadingClientes ? (
                      <div className="text-center py-4 text-muted-foreground text-sm">
                        Buscando...
                      </div>
                    ) : clientes.length > 0 ? (
                      clientes.map((cliente) => (
                        <button
                          key={cliente.id}
                          onClick={() => {
                            setSelectedCliente(cliente);
                            setSearchQuery("");
                          }}
                          className={`w-full flex items-center gap-3 p-2 rounded-lg text-left transition-colors hover:bg-muted ${
                            selectedCliente?.id === cliente.id
                              ? "bg-primary/10"
                              : ""
                          }`}
                        >
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={cliente.foto_url || undefined} />
                            <AvatarFallback className="text-xs">
                              {getInitials(cliente.nome)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {cliente.nome}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {cliente.celular}
                            </p>
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="text-center py-4 text-muted-foreground text-sm">
                        Nenhum cliente encontrado
                      </div>
                    )}
                  </div>
                </ScrollArea>
              )}
            </div>

            {/* Cliente selecionado */}
            {selectedCliente && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={selectedCliente.foto_url || undefined} />
                  <AvatarFallback>
                    {getInitials(selectedCliente.nome)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium">{selectedCliente.nome}</p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Phone className="h-3 w-3" />
                    {selectedCliente.celular}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedCliente(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Campo de mensagem */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Mensagem</label>
              <div className="relative">
                <textarea
                  placeholder="Digite sua mensagem..."
                  value={mensagem}
                  onChange={(e) => setMensagem(e.target.value)}
                  className="w-full min-h-[100px] p-3 rounded-lg border bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Use {"{nome}"} para personalizar. Créditos: {creditos?.saldo_creditos || 0}
              </p>
            </div>

            {/* Botões */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setIsOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1"
                onClick={handleEnviarMensagem}
                disabled={!selectedCliente || !mensagem.trim() || enviando}
              >
                {enviando ? (
                  "Enviando..."
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-1" />
                    Enviar
                  </>
                )}
              </Button>
            </div>

            {/* Link para central */}
            <div className="text-center pt-2 border-t">
              <Button asChild variant="link" size="sm">
                <Link
                  to="/configuracoes/whatsapp"
                  onClick={() => setIsOpen(false)}
                >
                  Abrir Central Completa
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
