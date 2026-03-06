import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Phone, Mail, MapPin, Calendar, FileText, MessageCircle, BarChart3, Star, ClipboardCheck, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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
  total_visitas?: number;
  created_at: string;
  updated_at: string;
}

interface FichaAvaliacao {
  id: string;
  tipo_avaliacao: string;
  observacoes: string | null;
  nota: number | null;
  created_at: string;
}

const cleanPhoneForWhatsApp = (phone: string | null | undefined) => {
  if (!phone) return "55";
  const cleaned = phone.replace(/\D/g, "");
  return cleaned.startsWith("55") ? cleaned : `55${cleaned}`;
};

const getFrequencyBadge = (totalVisitas: number) => {
  if (totalVisitas >= 20) {
    return { label: "VIP", color: "bg-purple-500/10 text-purple-500" };
  } else if (totalVisitas >= 10) {
    return { label: "Frequente", color: "bg-success/10 text-success" };
  } else if (totalVisitas >= 5) {
    return { label: "Regular", color: "bg-primary/10 text-primary" };
  } else if (totalVisitas >= 1) {
    return { label: "Novo", color: "bg-warning/10 text-warning" };
  }
  return { label: "Prospect", color: "bg-muted text-muted-foreground" };
};

interface ClienteViewDialogProps {
  open: boolean;
  onClose: () => void;
  cliente: Cliente | null;
}

const getInitials = (name: string | null | undefined) => {
  const safe = (name ?? '').toString();
  if (!safe) return "?";
  return safe
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
};

const getAvatarColor = (name: string | null | undefined) => {
  const safe = (name ?? '').toString();
  const colors = [
    "bg-primary",
    "bg-success",
    "bg-warning",
    "bg-pink-500",
    "bg-purple-500",
    "bg-cyan-500",
    "bg-orange-500",
  ];
  const index = safe.length > 0 ? safe.charCodeAt(0) % colors.length : 0;
  return colors[index];
};

const renderStars = (nota: number | null) => {
  if (!nota) return <span className="text-muted-foreground text-sm">Sem nota</span>;
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`h-4 w-4 ${s <= nota ? "fill-yellow-400 text-yellow-400" : "text-muted"}`}
        />
      ))}
    </div>
  );
};

export default function ClienteViewDialog({
  open,
  onClose,
  cliente,
}: ClienteViewDialogProps) {
  const { toast } = useToast();
  const [fichas, setFichas] = useState<FichaAvaliacao[]>([]);
  const [loadingFichas, setLoadingFichas] = useState(false);
  const [novaFicha, setNovaFicha] = useState({ tipo: "", obs: "", nota: 5 });
  const [criando, setCriando] = useState(false);

  useEffect(() => {
    if (open && cliente?.id) {
      loadFichas();
    }
  }, [open, cliente?.id]);

  const loadFichas = async () => {
    if (!cliente) return;
    setLoadingFichas(true);
    const { data } = await supabase
      .from("fichas_avaliacao")
      .select("id, tipo_avaliacao, observacoes, nota, created_at")
      .eq("cliente_id", cliente.id)
      .order("created_at", { ascending: false });
    setFichas((data as FichaAvaliacao[]) || []);
    setLoadingFichas(false);
  };

  const handleCriarFicha = async () => {
    if (!cliente || !novaFicha.tipo) return;
    setCriando(true);
    const { error } = await supabase.from("fichas_avaliacao").insert({
      cliente_id: cliente.id,
      tipo_avaliacao: novaFicha.tipo,
      observacoes: novaFicha.obs || null,
      nota: novaFicha.nota,
    });
    if (error) {
      toast({ title: "Erro ao salvar ficha", variant: "destructive" });
    } else {
      toast({ title: "Ficha criada com sucesso!" });
      setNovaFicha({ tipo: "", obs: "", nota: 5 });
      loadFichas();
    }
    setCriando(false);
  };

  const handleDeletarFicha = async (id: string) => {
    await supabase.from("fichas_avaliacao").delete().eq("id", id);
    setFichas((prev) => prev.filter((f) => f.id !== id));
    toast({ title: "Ficha removida" });
  };

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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalhes do Cliente</DialogTitle>
        </DialogHeader>

        {/* Header com avatar e nome */}
        <div className="flex items-center gap-4 pb-2">
          <Avatar className="h-16 w-16">
            <AvatarImage src={cliente.foto_url || undefined} />
            <AvatarFallback
              className={`${getAvatarColor(cliente.nome)} text-white text-xl`}
            >
              {getInitials(cliente.nome)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h3 className="text-xl font-semibold">{cliente.nome}</h3>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
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
              {cliente.total_visitas !== undefined && (
                <Badge className={getFrequencyBadge(cliente.total_visitas).color}>
                  {getFrequencyBadge(cliente.total_visitas).label}
                </Badge>
              )}
            </div>
          </div>
          <Button
            size="sm"
            className="bg-green-600 hover:bg-green-700 text-white"
            onClick={() => {
              const phone = cleanPhoneForWhatsApp(cliente.celular);
              window.open(`https://wa.me/${phone}`, "_blank");
            }}
          >
            <MessageCircle className="h-4 w-4 mr-1" />
            WhatsApp
          </Button>
        </div>

        <Tabs defaultValue="dados" className="mt-2">
          <TabsList className="w-full">
            <TabsTrigger value="dados" className="flex-1">
              <FileText className="h-4 w-4 mr-2" /> Dados
            </TabsTrigger>
            <TabsTrigger value="fichas" className="flex-1">
              <ClipboardCheck className="h-4 w-4 mr-2" />
              Fichas de Avaliação {fichas.length > 0 && `(${fichas.length})`}
            </TabsTrigger>
          </TabsList>

          {/* ABA DADOS */}
          <TabsContent value="dados" className="space-y-5 pt-4">
            {/* Estatísticas de visitas */}
            {cliente.total_visitas !== undefined && (
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-2xl font-bold">{cliente.total_visitas}</p>
                    <p className="text-sm text-muted-foreground">visitas realizadas</p>
                  </div>
                </div>
              </div>
            )}

            {/* Contato */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Contato</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{cliente.celular}</span>
                  {cliente.telefone && (
                    <span className="text-muted-foreground">/ {cliente.telefone}</span>
                  )}
                </div>
                {cliente.email && (
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{cliente.email}</span>
                  </div>
                )}
                {cliente.cpf && (
                  <p className="text-sm text-muted-foreground pl-7">CPF: {cliente.cpf}</p>
                )}
              </div>
            </div>

            {/* Data de nascimento */}
            {cliente.data_nascimento && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Aniversário</h4>
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {format(new Date(cliente.data_nascimento), "dd 'de' MMMM", { locale: ptBR })}
                  </span>
                </div>
              </div>
            )}

            {/* Endereço */}
            {endereco && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Endereço</h4>
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <span>{endereco}</span>
                </div>
              </div>
            )}

            {/* Observações */}
            {cliente.observacoes && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Observações</h4>
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
                {format(new Date(cliente.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </p>
              {cliente.ultima_visita && (
                <p>
                  Última visita:{" "}
                  {format(new Date(cliente.ultima_visita), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
              )}
            </div>
          </TabsContent>

          {/* ABA FICHAS DE AVALIAÇÃO */}
          <TabsContent value="fichas" className="space-y-4 pt-4">
            {/* Formulário nova ficha */}
            <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <Plus className="h-4 w-4" /> Nova Ficha
              </h4>
              <input
                className="w-full border rounded px-3 py-2 text-sm bg-background"
                placeholder="Tipo de avaliação (ex: Coloração, Corte, Hidratação...)"
                value={novaFicha.tipo}
                onChange={(e) => setNovaFicha((p) => ({ ...p, tipo: e.target.value }))}
              />
              <textarea
                className="w-full border rounded px-3 py-2 text-sm bg-background resize-none"
                rows={2}
                placeholder="Observações (opcional)"
                value={novaFicha.obs}
                onChange={(e) => setNovaFicha((p) => ({ ...p, obs: e.target.value }))}
              />
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Nota:</span>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button key={s} onClick={() => setNovaFicha((p) => ({ ...p, nota: s }))}>
                      <Star className={`h-5 w-5 ${s <= novaFicha.nota ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />
                    </button>
                  ))}
                </div>
              </div>
              <Button size="sm" onClick={handleCriarFicha} disabled={criando || !novaFicha.tipo}>
                {criando ? "Salvando..." : "Salvar Ficha"}
              </Button>
            </div>

            {/* Lista de fichas */}
            {loadingFichas ? (
              <p className="text-sm text-muted-foreground text-center py-4">Carregando fichas...</p>
            ) : fichas.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhuma ficha de avaliação ainda.
              </p>
            ) : (
              <div className="space-y-3">
                {fichas.map((f) => (
                  <div key={f.id} className="border rounded-lg p-3 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-sm">{f.tipo_avaliacao}</p>
                        {f.observacoes && (
                          <p className="text-sm text-muted-foreground">{f.observacoes}</p>
                        )}
                        <div className="mt-1">{renderStars(f.nota)}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(f.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive hover:bg-destructive/10"
                        onClick={() => handleDeletarFicha(f.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
