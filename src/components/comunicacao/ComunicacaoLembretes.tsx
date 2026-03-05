import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Clock, 
  Bell, 
  Send, 
  Eye,
  MapPin,
  MessageSquare,
  Star,
  Edit,
  ChevronDown,
  ChevronUp,
  Save
} from "lucide-react";
import { ComunicacaoLembrete } from "@/hooks/useComunicacao";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface Props {
  lembretes: ComunicacaoLembrete[];
  onUpdateLembrete: (id: string, updates: Partial<ComunicacaoLembrete>) => Promise<void>;
  onTestarMensagem: (lembrete: ComunicacaoLembrete) => void;
  saving: boolean;
  testando: boolean;
}

const variaveisDescricao: Record<string, string> = {
  nome_cliente: "Nome do cliente",
  data: "Data do agendamento",
  hora: "Horário",
  servico: "Serviço agendado",
  profissional: "Nome do profissional",
  link_confirmar: "Link de confirmação",
  link_cancelar: "Link de cancelamento",
  link_avaliacao: "Link para avaliação",
  nome_salao: "Nome do salão",
  endereco_salao: "Endereço do salão",
  telefone_salao: "Telefone do salão",
};

const iconePorTipo: Record<string, React.ReactNode> = {
  confirmacao_24h: <Bell className="h-4 w-4" />,
  lembrete_1h: <Clock className="h-4 w-4" />,
  lembrete_4h: <MessageSquare className="h-4 w-4" />,
  pos_atendimento: <Star className="h-4 w-4" />,
};

const descricaoPorTipo: Record<string, string> = {
  confirmacao_24h: "24h antes (Confirmação)",
  lembrete_4h: "4h antes (Urgente)",
  lembrete_1h: "1h antes (Próximo)",
  pos_atendimento: "24h depois (Feedback)",
};

const isNovo = (tipo: string) => ["lembrete_1h", "lembrete_4h", "pos_atendimento"].includes(tipo);

export function ComunicacaoLembretes({ 
  lembretes, 
  onUpdateLembrete, 
  onTestarMensagem,
  saving,
  testando 
}: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<string>("");

  const getPreviewMessage = (template: string) => {
    return template
      .replace(/{nome_cliente}/g, "Maria Silva")
      .replace(/{nome}/g, "Maria")
      .replace(/{data}/g, "15/02/2024")
      .replace(/{hora}/g, "14:30")
      .replace(/{servico}/g, "Corte + Escova")
      .replace(/{profissional}/g, "João")
      .replace(/{link_confirmar}/g, "https://salao.app/confirmar/abc123")
      .replace(/{link_cancelar}/g, "https://salao.app/cancelar/abc123")
      .replace(/{link_avaliacao}/g, "https://salao.app/avaliar/abc123")
      .replace(/{nome_salao}/g, "Maicon Maksuel")
      .replace(/{endereco_salao}/g, "Rua das Flores, 123 - Centro")
      .replace(/{telefone_salao}/g, "(11) 99999-8888");
  };

  // Ordenar lembretes por tipo
  const lembretesOrdenados = [...lembretes].sort((a, b) => {
    const ordem = ["confirmacao_24h", "lembrete_4h", "lembrete_1h", "pos_atendimento"];
    return ordem.indexOf(a.tipo) - ordem.indexOf(b.tipo);
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Configuração de Lembretes</h3>
          <p className="text-sm text-muted-foreground">
            Ative e personalize os lembretes automáticos
          </p>
        </div>
        <Button disabled={saving} className="gap-2">
          <Save className="h-4 w-4" />
          Salvar Configurações
        </Button>
      </div>

      <div className="rounded-xl border bg-card divide-y">
        {lembretesOrdenados.map((lembrete) => (
          <Collapsible 
            key={lembrete.id}
            open={expandedId === lembrete.id}
            onOpenChange={(open) => setExpandedId(open ? lembrete.id : null)}
          >
            {/* Header do lembrete */}
            <div className="flex items-start gap-4 p-4">
              {/* Checkbox ativo */}
              <div className="pt-0.5">
                <Checkbox
                  checked={lembrete.ativo}
                  onCheckedChange={(checked) => 
                    onUpdateLembrete(lembrete.id, { ativo: checked as boolean })
                  }
                  disabled={saving}
                />
              </div>

              {/* Conteúdo principal */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <div className={`p-1.5 rounded-md ${lembrete.ativo ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                    {iconePorTipo[lembrete.tipo] || <Bell className="h-4 w-4" />}
                  </div>
                  <span className={`font-medium ${!lembrete.ativo ? 'text-muted-foreground' : ''}`}>
                    {descricaoPorTipo[lembrete.tipo] || lembrete.nome}
                  </span>
                  {isNovo(lembrete.tipo) && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      ⭐ NOVO
                    </Badge>
                  )}
                </div>

                {/* Detalhes hierárquicos */}
                <div className="ml-9 space-y-1 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground/60">├─</span>
                    <span>Horário: </span>
                    <span className="text-foreground">
                      {lembrete.horario_envio || "Automático"}
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-muted-foreground/60">└─</span>
                    <span className="shrink-0">Template: </span>
                    <span className="text-foreground truncate max-w-md">
                      "{lembrete.template_mensagem.substring(0, 50)}..."
                    </span>
                  </div>
                </div>
              </div>

              {/* Botões de ação */}
              <div className="flex items-center gap-1">
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-1.5">
                    <Edit className="h-3.5 w-3.5" />
                    Editar
                    {expandedId === lembrete.id ? (
                      <ChevronUp className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </CollapsibleTrigger>

                <Dialog>
                  <DialogTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setPreviewTemplate(lembrete.template_mensagem)}
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Preview da Mensagem</DialogTitle>
                    </DialogHeader>
                    <div className="bg-success/10 rounded-lg p-4 border border-success/20">
                      <div className="whitespace-pre-wrap text-sm">
                        {getPreviewMessage(previewTemplate || lembrete.template_mensagem)}
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => onTestarMensagem(lembrete)}
                  disabled={testando || !lembrete.ativo}
                >
                  <Send className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* Conteúdo expandido */}
            <CollapsibleContent>
              <div className="px-4 pb-4 pt-0 ml-8 space-y-4 border-t bg-muted/30">
                <div className="pt-4 grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Horas antes do agendamento</Label>
                    <Input
                      type="number"
                      value={lembrete.horas_antes}
                      onChange={(e) => onUpdateLembrete(lembrete.id, { 
                        horas_antes: parseInt(e.target.value) || 0 
                      })}
                      disabled={saving}
                    />
                    <p className="text-xs text-muted-foreground">
                      Use valores negativos para pós-atendimento
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Horário fixo de envio (opcional)</Label>
                    <Input
                      type="time"
                      value={lembrete.horario_envio || ""}
                      onChange={(e) => onUpdateLembrete(lembrete.id, { 
                        horario_envio: e.target.value || null 
                      })}
                      disabled={saving}
                    />
                    <p className="text-xs text-muted-foreground">
                      Se definido, envia no dia anterior neste horário
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Template da Mensagem</Label>
                  <Textarea
                    className="min-h-[150px] font-mono text-sm"
                    value={lembrete.template_mensagem}
                    onChange={(e) => onUpdateLembrete(lembrete.id, { 
                      template_mensagem: e.target.value 
                    })}
                    disabled={saving}
                  />
                </div>

                <div className="bg-background rounded-lg p-3 border">
                  <Label className="text-xs font-medium mb-2 block">
                    Variáveis Disponíveis (clique para copiar)
                  </Label>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(variaveisDescricao).map(([key, desc]) => (
                      <Badge 
                        key={key} 
                        variant="outline" 
                        className="text-xs cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                        onClick={() => {
                          navigator.clipboard.writeText(`{${key}}`);
                        }}
                      >
                        {`{${key}}`}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={lembrete.incluir_endereco}
                      onCheckedChange={(checked) => onUpdateLembrete(lembrete.id, { 
                        incluir_endereco: checked 
                      })}
                      disabled={saving}
                    />
                    <Label className="text-sm flex items-center gap-1.5 cursor-pointer">
                      <MapPin className="h-3.5 w-3.5" />
                      Incluir endereço/maps
                    </Label>
                  </div>

                  {lembrete.tipo === "pos_atendimento" && (
                    <>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={true}
                          disabled={saving}
                        />
                        <Label className="text-sm cursor-pointer">
                          Incluir link avaliação
                        </Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={true}
                          disabled={saving}
                        />
                        <Label className="text-sm cursor-pointer">
                          Incluir cupom 10%
                        </Label>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        ))}
      </div>
    </div>
  );
}
