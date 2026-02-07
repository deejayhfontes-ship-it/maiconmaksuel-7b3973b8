import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  MessageSquare,
  Search,
  ArrowRight,
  Settings,
  CheckCheck,
  X,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Conversa {
  id: string;
  cliente_nome: string;
  cliente_celular: string;
  cliente_foto: string | null;
  ultima_mensagem: string;
  ultima_mensagem_hora: Date;
  nao_lidas: number;
  status: "ativo" | "aguardando" | "resolvido";
}

// Mock data
const conversasMock: Conversa[] = [
  {
    id: "1",
    cliente_nome: "Maria Silva",
    cliente_celular: "(11) 99999-1234",
    cliente_foto: null,
    ultima_mensagem: "Oi, gostaria de confirmar meu horário",
    ultima_mensagem_hora: new Date(Date.now() - 300000),
    nao_lidas: 2,
    status: "ativo",
  },
  {
    id: "2",
    cliente_nome: "João Santos",
    cliente_celular: "(11) 98888-5678",
    cliente_foto: null,
    ultima_mensagem: "Perfeito, até amanhã!",
    ultima_mensagem_hora: new Date(Date.now() - 3600000),
    nao_lidas: 0,
    status: "resolvido",
  },
  {
    id: "3",
    cliente_nome: "Ana Costa",
    cliente_celular: "(11) 97777-9012",
    cliente_foto: null,
    ultima_mensagem: "Qual o valor do corte?",
    ultima_mensagem_hora: new Date(Date.now() - 7200000),
    nao_lidas: 1,
    status: "aguardando",
  },
];

interface WhatsAppDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WhatsAppDrawer({ open, onOpenChange }: WhatsAppDrawerProps) {
  const [conversas] = useState<Conversa[]>(conversasMock);
  const [searchQuery, setSearchQuery] = useState("");

  const getInitials = (nome: string) => {
    return nome
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  const getStatusColor = (status: Conversa["status"]) => {
    switch (status) {
      case "ativo":
        return "bg-[#25D366]";
      case "aguardando":
        return "bg-warning";
      case "resolvido":
        return "bg-muted-foreground";
    }
  };

  const conversasFiltradas = conversas.filter(
    (c) =>
      c.cliente_nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.cliente_celular.includes(searchQuery)
  );

  const totalNaoLidas = conversas.reduce((acc, c) => acc + c.nao_lidas, 0);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="p-4 pb-2 border-b">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#25D366]/10">
                <MessageSquare className="h-4 w-4 text-[#25D366]" />
              </div>
              <span>Conversas</span>
              {totalNaoLidas > 0 && (
                <Badge className="bg-[#25D366] text-white">
                  {totalNaoLidas}
                </Badge>
              )}
            </SheetTitle>
            <Button variant="ghost" size="icon" asChild>
              <Link to="/configuracoes/whatsapp" onClick={() => onOpenChange(false)}>
                <Settings className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </SheetHeader>

        {/* Search */}
        <div className="p-3 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar conversas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Conversations */}
        <ScrollArea className="flex-1">
          <div className="divide-y">
            {conversasFiltradas.map((conversa) => (
              <Link
                key={conversa.id}
                to="/atendimento-whatsapp"
                onClick={() => onOpenChange(false)}
                className="flex items-start gap-3 p-3 hover:bg-muted/50 transition-colors"
              >
                <div className="relative">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={conversa.cliente_foto || undefined} />
                    <AvatarFallback className="bg-[#25D366]/10 text-[#25D366] font-semibold">
                      {getInitials(conversa.cliente_nome)}
                    </AvatarFallback>
                  </Avatar>
                  <span
                    className={cn(
                      "absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background",
                      getStatusColor(conversa.status)
                    )}
                  />
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
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-sm text-muted-foreground truncate flex-1">
                      {conversa.ultima_mensagem}
                    </p>
                    {conversa.nao_lidas > 0 && (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#25D366] text-[10px] font-bold text-white px-1">
                        {conversa.nao_lidas}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
            {conversasFiltradas.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nenhuma conversa encontrada</p>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="p-3 border-t">
          <Button asChild className="w-full bg-[#25D366] hover:bg-[#25D366]/90">
            <Link to="/atendimento-whatsapp" onClick={() => onOpenChange(false)}>
              Abrir Atendimento Completo
              <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// Floating Button Component
export function WhatsAppFloatingButtonZendesk() {
  const [isOpen, setIsOpen] = useState(false);
  const [conversas] = useState<Conversa[]>(conversasMock);

  const totalNaoLidas = conversas.reduce((acc, c) => acc + c.nao_lidas, 0);

  return (
    <>
      {/* Floating Button - WhatsApp Green */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-all hover:scale-110 hover:shadow-xl active:scale-95 hover:bg-[#128C7E]"
        title="Conversas WhatsApp"
      >
        <MessageSquare className="h-6 w-6" />
        {totalNaoLidas > 0 && (
          <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-[11px] font-bold text-white animate-pulse shadow-md">
            {totalNaoLidas}
          </span>
        )}
      </button>

      {/* Drawer */}
      <WhatsAppDrawer open={isOpen} onOpenChange={setIsOpen} />
    </>
  );
}
