import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { 
  Clock, 
  Bell, 
  Send, 
  Save, 
  Eye,
  MapPin,
  MessageSquare,
  Star
} from "lucide-react";
import { ComunicacaoLembrete } from "@/hooks/useComunicacao";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

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

const iconesPorTipo: Record<string, React.ReactNode> = {
  confirmacao_24h: <Bell className="h-4 w-4" />,
  lembrete_1h: <Clock className="h-4 w-4" />,
  lembrete_4h: <MessageSquare className="h-4 w-4" />,
  pos_atendimento: <Star className="h-4 w-4" />,
};

export function ComunicacaoLembretes({ 
  lembretes, 
  onUpdateLembrete, 
  onTestarMensagem,
  saving,
  testando 
}: Props) {
  const [previewLembrete, setPreviewLembrete] = useState<ComunicacaoLembrete | null>(null);

  const getPreviewMessage = (template: string) => {
    return template
      .replace(/{nome_cliente}/g, "Maria Silva")
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Lembretes Automáticos</h3>
          <p className="text-sm text-muted-foreground">
            Configure quando e como enviar lembretes aos clientes
          </p>
        </div>
      </div>

      <Accordion type="multiple" className="w-full space-y-2">
        {lembretes.map((lembrete) => (
          <AccordionItem 
            key={lembrete.id} 
            value={lembrete.id}
            className="border rounded-lg px-4"
          >
            <AccordionTrigger className="hover:no-underline py-3">
              <div className="flex items-center gap-3 flex-1">
                <div className={`p-2 rounded-lg ${lembrete.ativo ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                  {iconesPorTipo[lembrete.tipo] || <Bell className="h-4 w-4" />}
                </div>
                <div className="text-left">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{lembrete.nome}</span>
                    {lembrete.tipo === 'lembrete_1h' && (
                      <Badge variant="secondary" className="text-xs">⭐ Novo</Badge>
                    )}
                    {lembrete.tipo === 'lembrete_4h' && (
                      <Badge variant="secondary" className="text-xs">⭐ Novo</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {lembrete.horas_antes > 0 
                      ? `${lembrete.horas_antes}h antes do agendamento`
                      : `${Math.abs(lembrete.horas_antes)}h após o atendimento`
                    }
                    {lembrete.horario_envio && ` às ${lembrete.horario_envio}`}
                  </p>
                </div>
                <Switch
                  checked={lembrete.ativo}
                  onCheckedChange={(checked) => onUpdateLembrete(lembrete.id, { ativo: checked })}
                  onClick={(e) => e.stopPropagation()}
                  className="ml-auto mr-2"
                />
              </div>
            </AccordionTrigger>

            <AccordionContent className="space-y-4 pb-4">
              <div className="grid gap-4 sm:grid-cols-2">
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
                  className="min-h-[200px] font-mono text-sm"
                  value={lembrete.template_mensagem}
                  onChange={(e) => onUpdateLembrete(lembrete.id, { 
                    template_mensagem: e.target.value 
                  })}
                  disabled={saving}
                />
              </div>

              <div className="bg-muted/50 rounded-lg p-4">
                <Label className="text-sm font-medium mb-2 block">
                  Variáveis Disponíveis
                </Label>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(variaveisDescricao).map(([key, desc]) => (
                    <Badge 
                      key={key} 
                      variant="secondary" 
                      className="text-xs cursor-pointer hover:bg-primary hover:text-primary-foreground"
                      onClick={() => {
                        navigator.clipboard.writeText(`{${key}}`);
                      }}
                    >
                      {`{${key}}`} - {desc}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={lembrete.incluir_endereco}
                    onCheckedChange={(checked) => onUpdateLembrete(lembrete.id, { 
                      incluir_endereco: checked 
                    })}
                    disabled={saving}
                  />
                  <Label className="text-sm flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    Incluir endereço/maps
                  </Label>
                </div>
              </div>

              <div className="flex gap-2">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setPreviewLembrete(lembrete)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Preview
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Preview da Mensagem</DialogTitle>
                    </DialogHeader>
                    <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-4 border border-green-200 dark:border-green-900">
                      <div className="whitespace-pre-wrap text-sm">
                        {getPreviewMessage(lembrete.template_mensagem)}
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => onTestarMensagem(lembrete)}
                  disabled={testando}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Testar Envio
                </Button>
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
