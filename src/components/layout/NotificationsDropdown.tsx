import { useEffect, useState, useCallback } from "react";
import { Bell, Calendar, Package, Cake, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { format, isToday, isTomorrow, differenceInDays, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Notification {
  id: string;
  type: "agendamento" | "estoque" | "aniversario";
  title: string;
  description: string;
  time?: string;
  read: boolean;
}

export function NotificationsDropdown() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    const notifs: Notification[] = [];

    try {
      // 1. Buscar agendamentos de hoje
      const hoje = new Date();
      const inicioHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 0, 0, 0).toISOString();
      const fimHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 23, 59, 59).toISOString();

      const { data: agendamentos } = await supabase
        .from("agendamentos")
        .select(`
          id,
          data_hora,
          status,
          clientes:cliente_id (nome),
          servicos:servico_id (nome),
          profissionais:profissional_id (nome)
        `)
        .gte("data_hora", inicioHoje)
        .lte("data_hora", fimHoje)
        .in("status", ["agendado", "confirmado"])
        .order("data_hora", { ascending: true })
        .limit(5);

      agendamentos?.forEach((ag: any) => {
        const hora = format(parseISO(ag.data_hora), "HH:mm");
        notifs.push({
          id: `ag-${ag.id}`,
          type: "agendamento",
          title: `${ag.clientes?.nome || "Cliente"}`,
          description: `${ag.servicos?.nome || "Serviço"} às ${hora} com ${ag.profissionais?.nome || "Profissional"}`,
          time: hora,
          read: false,
        });
      });

      // 2. Buscar produtos com estoque baixo
      const { data: produtosBaixoEstoque } = await supabase
        .from("produtos")
        .select("id, nome, estoque_atual, estoque_minimo")
        .eq("ativo", true)
        .limit(10);

      produtosBaixoEstoque?.forEach((prod) => {
        if (prod.estoque_atual <= prod.estoque_minimo) {
          notifs.push({
            id: `prod-${prod.id}`,
            type: "estoque",
            title: "Estoque baixo",
            description: `${prod.nome}: ${prod.estoque_atual} unidades (mín: ${prod.estoque_minimo})`,
            read: false,
          });
        }
      });

      // 3. Buscar aniversariantes da semana
      const { data: clientes } = await supabase
        .from("clientes")
        .select("id, nome, data_nascimento")
        .eq("ativo", true)
        .not("data_nascimento", "is", null);

      clientes?.forEach((cliente) => {
        if (!cliente.data_nascimento) return;
        
        const nascimento = parseISO(cliente.data_nascimento);
        const aniversarioEsteAno = new Date(
          hoje.getFullYear(),
          nascimento.getMonth(),
          nascimento.getDate()
        );
        
        const diasAte = differenceInDays(aniversarioEsteAno, hoje);
        
        if (diasAte >= 0 && diasAte <= 7) {
          let quando = "";
          if (isToday(aniversarioEsteAno)) {
            quando = "Hoje!";
          } else if (isTomorrow(aniversarioEsteAno)) {
            quando = "Amanhã";
          } else {
            quando = format(aniversarioEsteAno, "EEEE, dd/MM", { locale: ptBR });
          }
          
          notifs.push({
            id: `aniv-${cliente.id}`,
            type: "aniversario",
            title: "Aniversário",
            description: `${cliente.nome} - ${quando}`,
            read: false,
          });
        }
      });

      setNotifications(notifs);
    } catch (error) {
      console.error("Erro ao buscar notificações:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    // Atualizar a cada 5 minutos
    const interval = setInterval(fetchNotifications, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const dismissNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  const getIcon = (type: Notification["type"]) => {
    switch (type) {
      case "agendamento":
        return <Calendar className="h-4 w-4 text-primary" />;
      case "estoque":
        return <Package className="h-4 w-4 text-warning" />;
      case "aniversario":
        return <Cake className="h-4 w-4 text-pink-500" />;
    }
  };

  const getIconBg = (type: Notification["type"]) => {
    switch (type) {
      case "agendamento":
        return "bg-primary/10";
      case "estoque":
        return "bg-warning/10";
      case "aniversario":
        return "bg-pink-500/10";
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative ios-icon-button">
          <Bell className="h-5 w-5 text-muted-foreground" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center ios-notification-badge text-[11px] font-semibold rounded-full">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Notificações</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-primary h-auto py-1"
              onClick={markAllAsRead}
            >
              Marcar todas como lidas
            </Button>
          )}
        </div>

        {/* Content */}
        <ScrollArea className="h-[400px]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-sm text-muted-foreground">Carregando...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 px-4">
              <Bell className="h-10 w-10 text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground text-center">
                Nenhuma notificação no momento
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={cn(
                    "flex items-start gap-3 p-4 hover:bg-muted/50 transition-colors cursor-pointer",
                    !notif.read && "bg-primary/5"
                  )}
                  onClick={() => markAsRead(notif.id)}
                >
                  <div className={cn("p-2 rounded-full flex-shrink-0", getIconBg(notif.type))}>
                    {getIcon(notif.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{notif.title}</p>
                      {!notif.read && (
                        <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {notif.description}
                    </p>
                    {notif.time && (
                      <Badge variant="outline" className="mt-1 text-xs">
                        {notif.time}
                      </Badge>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 flex-shrink-0 opacity-0 group-hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      dismissNotification(notif.id);
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="p-3 border-t text-center">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground"
              onClick={() => setNotifications([])}
            >
              Limpar todas
            </Button>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}