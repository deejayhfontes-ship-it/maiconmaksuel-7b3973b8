import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { 
  Bot, 
  Plus, 
  Trash2, 
  Edit2, 
  MessageSquare,
  Link,
  MapPin,
  X,
  Calendar,
  Check,
  Save
} from "lucide-react";
import { ComunicacaoRespostaAutomatica } from "@/hooks/useComunicacao";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Props {
  respostas: ComunicacaoRespostaAutomatica[];
  onUpdate: (id: string, updates: Partial<ComunicacaoRespostaAutomatica>) => Promise<void>;
  onCreate: (resposta: Omit<ComunicacaoRespostaAutomatica, 'id'>) => Promise<ComunicacaoRespostaAutomatica>;
  onDelete: (id: string) => Promise<void>;
  saving: boolean;
}

const tiposResposta = [
  { value: 'link_agendamento', label: 'Enviar Link de Agendamento', icon: <Calendar className="h-4 w-4" /> },
  { value: 'tabela_servicos', label: 'Enviar Tabela de Preços', icon: <MessageSquare className="h-4 w-4" /> },
  { value: 'localizacao', label: 'Enviar Localização', icon: <MapPin className="h-4 w-4" /> },
  { value: 'cancelamento', label: 'Iniciar Cancelamento', icon: <X className="h-4 w-4" /> },
  { value: 'confirmacao', label: 'Confirmar Agendamento', icon: <Check className="h-4 w-4" /> },
  { value: 'recusa', label: 'Registrar Recusa', icon: <X className="h-4 w-4" /> },
  { value: 'personalizado', label: 'Resposta Personalizada', icon: <MessageSquare className="h-4 w-4" /> },
];

const acoes = [
  { value: 'enviar_link', label: 'Enviar link de agendamento' },
  { value: 'confirmar_agendamento', label: 'Confirmar agendamento automaticamente' },
  { value: 'marcar_pendente', label: 'Marcar como pendente e alertar recepção' },
  { value: 'iniciar_cancelamento', label: 'Iniciar fluxo de cancelamento' },
  { value: null, label: 'Nenhuma ação especial' },
];

export function ComunicacaoChatbot({ 
  respostas, 
  onUpdate, 
  onCreate, 
  onDelete,
  saving 
}: Props) {
  const [novaResposta, setNovaResposta] = useState({
    palavras_chave: [] as string[],
    tipo_resposta: 'personalizado',
    mensagem_resposta: '',
    acao: null as string | null,
    ativo: true,
    prioridade: 0
  });
  const [novaKeyword, setNovaKeyword] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editando, setEditando] = useState<string | null>(null);

  const addKeyword = () => {
    if (novaKeyword.trim() && !novaResposta.palavras_chave.includes(novaKeyword.trim().toLowerCase())) {
      setNovaResposta(prev => ({
        ...prev,
        palavras_chave: [...prev.palavras_chave, novaKeyword.trim().toLowerCase()]
      }));
      setNovaKeyword('');
    }
  };

  const removeKeyword = (keyword: string) => {
    setNovaResposta(prev => ({
      ...prev,
      palavras_chave: prev.palavras_chave.filter(k => k !== keyword)
    }));
  };

  const handleCreate = async () => {
    if (novaResposta.palavras_chave.length === 0 || !novaResposta.mensagem_resposta.trim()) {
      return;
    }
    await onCreate(novaResposta);
    setNovaResposta({
      palavras_chave: [],
      tipo_resposta: 'personalizado',
      mensagem_resposta: '',
      acao: null,
      ativo: true,
      prioridade: 0
    });
    setDialogOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Respostas Automáticas (Chatbot)
          </h3>
          <p className="text-sm text-muted-foreground">
            Configure respostas automáticas baseadas em palavras-chave
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nova Resposta
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Nova Resposta Automática</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Palavras-chave (detectar quando cliente escrever)</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Digite uma palavra-chave"
                    value={novaKeyword}
                    onChange={(e) => setNovaKeyword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
                  />
                  <Button type="button" onClick={addKeyword} size="icon">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {novaResposta.palavras_chave.map((kw) => (
                    <Badge key={kw} variant="secondary" className="gap-1">
                      {kw}
                      <button onClick={() => removeKeyword(kw)}>
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Tipo de Resposta</Label>
                <Select
                  value={novaResposta.tipo_resposta}
                  onValueChange={(value) => setNovaResposta(prev => ({ ...prev, tipo_resposta: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {tiposResposta.map((tipo) => (
                      <SelectItem key={tipo.value} value={tipo.value}>
                        <div className="flex items-center gap-2">
                          {tipo.icon}
                          {tipo.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Mensagem de Resposta</Label>
                <Textarea
                  placeholder="Digite a mensagem que será enviada..."
                  value={novaResposta.mensagem_resposta}
                  onChange={(e) => setNovaResposta(prev => ({ ...prev, mensagem_resposta: e.target.value }))}
                  className="min-h-[120px]"
                />
              </div>

              <div className="space-y-2">
                <Label>Ação Especial</Label>
                <Select
                  value={novaResposta.acao || 'none'}
                  onValueChange={(value) => setNovaResposta(prev => ({ 
                    ...prev, 
                    acao: value === 'none' ? null : value 
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {acoes.map((acao) => (
                      <SelectItem key={acao.value || 'none'} value={acao.value || 'none'}>
                        {acao.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Prioridade (maior = processa primeiro)</Label>
                <Input
                  type="number"
                  value={novaResposta.prioridade}
                  onChange={(e) => setNovaResposta(prev => ({ 
                    ...prev, 
                    prioridade: parseInt(e.target.value) || 0 
                  }))}
                />
              </div>
            </div>

            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancelar</Button>
              </DialogClose>
              <Button onClick={handleCreate} disabled={saving}>
                Criar Resposta
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Resposta Padrão */}
      <Card className="border-dashed">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            Resposta Padrão (quando não reconhecer)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-muted/50 rounded-lg p-3 text-sm">
            "Olá! Sou o assistente virtual do Maicon Maksuel. Para agendar: {'{link_agendamento}'}. 
            Para falar com atendente, aguarde um momento..."
          </div>
        </CardContent>
      </Card>

      {/* Lista de Respostas */}
      <div className="space-y-3">
        {respostas.map((resposta) => (
          <Card key={resposta.id} className={!resposta.ativo ? "opacity-60" : ""}>
            <CardContent className="pt-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-muted-foreground">Quando detectar:</span>
                    {resposta.palavras_chave.map((kw) => (
                      <Badge key={kw} variant="secondary">{kw}</Badge>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {tiposResposta.find(t => t.value === resposta.tipo_resposta)?.label || resposta.tipo_resposta}
                    </Badge>
                    {resposta.acao && (
                      <Badge variant="default" className="text-xs">
                        {acoes.find(a => a.value === resposta.acao)?.label}
                      </Badge>
                    )}
                  </div>

                  <div className="bg-muted/50 rounded-lg p-3 text-sm whitespace-pre-wrap">
                    {resposta.mensagem_resposta}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <Switch
                    checked={resposta.ativo}
                    onCheckedChange={(checked) => onUpdate(resposta.id, { ativo: checked })}
                  />
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => onDelete(resposta.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
