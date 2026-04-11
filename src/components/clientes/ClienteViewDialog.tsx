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
import { Phone, Mail, MapPin, Calendar, FileText, MessageCircle, BarChart3, Star, ClipboardCheck, Plus, Trash2, Scissors, NotebookPen, History } from "lucide-react";
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

interface TimelineItem {
  id: string;
  type: 'manual' | 'atendimento';
  date: string;
  title: string;
  description: string;
  value?: number;
  services?: string[];
  professionals?: string[];
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
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [loadingTimeline, setLoadingTimeline] = useState(false);
  const [novaAnotacao, setNovaAnotacao] = useState({ tipo: "", obs: "" });
  const [criando, setCriando] = useState(false);

  useEffect(() => {
    if (open && cliente?.id) {
      loadTimeline();
    }
  }, [open, cliente?.id]);

  const loadTimeline = async () => {
    if (!cliente) return;
    setLoadingTimeline(true);
    
    // 1. Fetch manual entries
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any;
    const { data: manualData } = await db
      .from("cliente_historico_manual")
      .select("*")
      .eq("cliente_id", cliente.id)
      .order("created_at", { ascending: false });
      
    // 2. Fetch atendimentos
    const { data: atendData } = await supabase
      .from("atendimentos")
      .select(`
        id,
        numero_comanda,
        valor_final,
        created_at,
        atendimento_servicos (
          servicos ( nome ),
          profissionais ( nome )
        )
      `)
      .eq("cliente_id", cliente.id)
      .order("created_at", { ascending: false });

    // Combine and sort
    const combined: TimelineItem[] = [];
    
    if (manualData) {
      manualData.forEach(m => {
        combined.push({
          id: m.id,
          type: 'manual',
          date: m.created_at,
          title: m.tipo_registro,
          description: m.observacoes || "",
        });
      });
    }
    
    if (atendData) {
      atendData.forEach((a) => {
        const atendimentoServicos = (a.atendimento_servicos as unknown as Record<string, unknown>[]) || [];
        const services = atendimentoServicos.map(s => (s.servicos as Record<string, unknown>)?.nome).filter(Boolean) as string[];
        const profissionais = [...new Set(atendimentoServicos.map(s => (s.profissionais as Record<string, unknown>)?.nome).filter(Boolean))] as string[];
        
        combined.push({
          id: a.id,
          type: 'atendimento',
          date: a.created_at,
          title: `Comanda ${a.numero_comanda ? '#' + a.numero_comanda : ''}`,
          description: "Atendimento concluído",
          value: a.valor_final,
          services,
          professionals: profissionais,
        });
      });
    }
    
    // sort descending by date
    combined.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    setTimeline(combined);
    setLoadingTimeline(false);
  };

  const handleCriarAnotacao = async () => {
    if (!cliente || !novaAnotacao.tipo) return;
    setCriando(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from("cliente_historico_manual").insert({
      cliente_id: cliente.id,
      tipo_registro: novaAnotacao.tipo,
      observacoes: novaAnotacao.obs || null,
    });
    
    if (error) {
      toast({ title: "Erro ao salvar anotação", variant: "destructive" });
    } else {
      toast({ title: "Anotação salva com sucesso!" });
      setNovaAnotacao({ tipo: "", obs: "" });
      loadTimeline();
    }
    setCriando(false);
  };

  const handleDeletarAnotacao = async (id: string, type: string) => {
    if (type !== 'manual') return; // Only allow deleting manual notes
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from("cliente_historico_manual").delete().eq("id", id);
    setTimeline((prev) => prev.filter((t) => t.id !== id));
    toast({ title: "Anotação removida" });
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
            <TabsTrigger value="historico" className="flex-1">
              <History className="h-4 w-4 mr-2" />
              Histórico {timeline.length > 0 && `(${timeline.length})`}
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

          {/* ABA HISTÓRICO / TIMELINE */}
          <TabsContent value="historico" className="space-y-4 pt-4">
            {/* Formulário nova anotação */}
            <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <Plus className="h-4 w-4" /> Nova Anotação / Observação
              </h4>
              <input
                className="w-full border rounded px-3 py-2 text-sm bg-background"
                placeholder="Ex do que registrar: Preferências, alergias, cor da coloração..."
                value={novaAnotacao.tipo}
                onChange={(e) => setNovaAnotacao((p) => ({ ...p, tipo: e.target.value }))}
              />
              <textarea
                className="w-full border rounded px-3 py-2 text-sm bg-background resize-none"
                rows={2}
                placeholder="Detalhes (opcional)"
                value={novaAnotacao.obs}
                onChange={(e) => setNovaAnotacao((p) => ({ ...p, obs: e.target.value }))}
              />
              <Button size="sm" onClick={handleCriarAnotacao} disabled={criando || !novaAnotacao.tipo}>
                {criando ? "Salvando..." : "Salvar no Histórico"}
              </Button>
            </div>

            {/* Timeline List */}
            {loadingTimeline ? (
              <p className="text-sm text-muted-foreground text-center py-4">Carregando histórico...</p>
            ) : timeline.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Histórico vazio para este cliente.
              </p>
            ) : (
              <div className="relative border-l-2 border-muted ml-3 space-y-6 pt-2 pb-4">
                {timeline.map((item) => (
                  <div key={item.id} className="relative pl-6">
                    {/* Icon na linha do tempo */}
                    <div className={`absolute -left-3.5 top-0 h-7 w-7 rounded-full flex items-center justify-center border-2 border-background shadow-sm ${item.type === 'atendimento' ? 'bg-primary text-white' : 'bg-orange-100 text-orange-600'}`}>
                      {item.type === 'atendimento' ? <Scissors className="h-3.5 w-3.5" /> : <NotebookPen className="h-3.5 w-3.5" />}
                    </div>

                    {/* Conteúdo do item */}
                    <div className="border rounded-lg bg-card p-3 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            {format(new Date(item.date), "dd MMM yyyy 'às' HH:mm", { locale: ptBR })}
                          </p>
                          <h4 className="font-semibold text-base flex items-center gap-2 mt-0.5">
                            {item.title}
                            {item.type === 'atendimento' && item.value !== undefined && (
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.value)}
                              </Badge>
                            )}
                          </h4>
                        </div>

                        {/* Botão deletar só para manual */}
                        {item.type === 'manual' && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-destructive hover:bg-destructive/10"
                            onClick={() => handleDeletarAnotacao(item.id, item.type)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>

                      {item.description && <p className="text-sm text-foreground/90">{item.description}</p>}

                      {/* Detalhes específicos de atendimentos */}
                      {item.type === 'atendimento' && (item.services?.length || item.professionals?.length) ? (
                        <div className="mt-3 grid gap-2 md:grid-cols-2 text-sm bg-muted/40 p-2.5 rounded-md">
                          {item.services && item.services.length > 0 && (
                            <div>
                              <span className="font-medium text-xs text-muted-foreground uppercase">Serviços executados:</span>
                              <ul className="list-disc list-inside mt-0.5 ml-1 text-foreground/80">
                                {item.services.map((s, i) => <li key={i} className="truncate">{s}</li>)}
                              </ul>
                            </div>
                          )}
                          {item.professionals && item.professionals.length > 0 && (
                            <div>
                              <span className="font-medium text-xs text-muted-foreground uppercase">Profissionais:</span>
                              <div className="flex flex-wrap gap-1 mt-0.5">
                                {item.professionals.map((p, i) => (
                                  <Badge key={i} variant="secondary" className="font-normal text-xs">{p}</Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : null}
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
