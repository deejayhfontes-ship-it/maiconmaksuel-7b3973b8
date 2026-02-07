/**
 * Campaign Configuration Page
 * Professional SaaS-style dashboard for WhatsApp campaign automation
 */

import { useState, useEffect } from "react";
import { 
  Settings, 
  Users, 
  MessageSquare, 
  Clock, 
  Shield,
  Save,
  Play,
  Pause,
  Trash2,
  ChevronRight,
  Target,
  Gift,
  TrendingUp,
  Calendar,
  Megaphone,
  Plus,
  X,
  Smile,
  Link,
  AlertTriangle,
  Check
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { ComunicacaoCampanha } from "@/hooks/useComunicacao";

interface CampanhaConfiguracaoProps {
  campanha?: ComunicacaoCampanha | null;
  onSave: (data: CampanhaFormData) => Promise<void>;
  onClose: () => void;
  saving?: boolean;
}

interface CampanhaFormData {
  nome: string;
  tipo_segmentacao: string;
  ativo: boolean;
  prioridade: string;
  // Segmentação
  cliente_status: string[];
  dias_inativo: number;
  total_agendamentos_min: number;
  dias_ultima_interacao: number;
  tags: string[];
  logica_segmentacao: 'all' | 'any';
  // Mensagem
  titulo_mensagem: string;
  template_mensagem: string;
  usar_cta: boolean;
  cta_texto: string;
  cta_link: string;
  // Agendamento
  frequencia: string;
  horario_envio: string;
  dias_permitidos: string[];
  horario_silencio_inicio: string;
  horario_silencio_fim: string;
  retentar_falha: boolean;
  max_tentativas: number;
  // Limites
  max_mensagens_dia: number;
  intervalo_mensagens: number;
  parar_se_desconectado: boolean;
  // Meta
  desconto_oferecido: number | null;
  descricao: string;
}

const tiposCampanha = [
  { value: 'reativacao', label: 'Reativação', icon: Users },
  { value: 'aniversariantes', label: 'Aniversariantes', icon: Gift },
  { value: 'vip', label: 'VIP', icon: TrendingUp },
  { value: 'reconquista', label: 'Reconquista', icon: Target },
  { value: 'personalizada', label: 'Personalizada', icon: Megaphone },
];

const tagsDisponiveis = [
  { value: 'vip', label: 'VIP' },
  { value: 'novo_cliente', label: 'Novo Cliente' },
  { value: 'cancelou', label: 'Cancelou' },
  { value: 'fidelizado', label: 'Fidelizado' },
];

const diasSemana = [
  { value: 'seg', label: 'Seg' },
  { value: 'ter', label: 'Ter' },
  { value: 'qua', label: 'Qua' },
  { value: 'qui', label: 'Qui' },
  { value: 'sex', label: 'Sex' },
  { value: 'sab', label: 'Sáb' },
  { value: 'dom', label: 'Dom' },
];

const variaveisDisponiveis = [
  { key: '{{nome}}', desc: 'Nome completo' },
  { key: '{{primeiro_nome}}', desc: 'Primeiro nome' },
  { key: '{{data}}', desc: 'Data atual' },
  { key: '{{hora}}', desc: 'Hora atual' },
  { key: '{{empresa}}', desc: 'Nome do salão' },
];

const emojis = ['😊', '👋', '💇', '💅', '✨', '🎉', '💜', '🌟', '❤️', '👏', '🙏', '💪'];

export function CampanhaConfiguracao({ 
  campanha, 
  onSave, 
  onClose, 
  saving = false 
}: CampanhaConfiguracaoProps) {
  const isEditing = !!campanha;

  const [formData, setFormData] = useState<CampanhaFormData>({
    nome: campanha?.nome || '',
    tipo_segmentacao: campanha?.tipo_segmentacao || 'reativacao',
    ativo: campanha?.ativo ?? false,
    prioridade: 'media',
    // Segmentação
    cliente_status: ['ativo'],
    dias_inativo: campanha?.criterio_dias_inativo || 30,
    total_agendamentos_min: 1,
    dias_ultima_interacao: 30,
    tags: [],
    logica_segmentacao: 'all',
    // Mensagem
    titulo_mensagem: '',
    template_mensagem: campanha?.template_mensagem || '',
    usar_cta: false,
    cta_texto: 'Agendar Agora',
    cta_link: '',
    // Agendamento
    frequencia: 'once',
    horario_envio: '10:00',
    dias_permitidos: ['seg', 'ter', 'qua', 'qui', 'sex'],
    horario_silencio_inicio: '20:00',
    horario_silencio_fim: '08:00',
    retentar_falha: true,
    max_tentativas: 3,
    // Limites
    max_mensagens_dia: 100,
    intervalo_mensagens: 30,
    parar_se_desconectado: true,
    // Meta
    desconto_oferecido: campanha?.desconto_oferecido || null,
    descricao: campanha?.descricao || '',
  });

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const updateField = <K extends keyof CampanhaFormData>(
    field: K, 
    value: CampanhaFormData[K]
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const insertVariable = (variable: string) => {
    updateField('template_mensagem', formData.template_mensagem + variable);
  };

  const insertEmoji = (emoji: string) => {
    updateField('template_mensagem', formData.template_mensagem + emoji);
    setShowEmojiPicker(false);
  };

  const getPreviewMessage = () => {
    return formData.template_mensagem
      .replace(/{{nome}}/g, 'Maria Silva')
      .replace(/{{primeiro_nome}}/g, 'Maria')
      .replace(/{{data}}/g, new Date().toLocaleDateString('pt-BR'))
      .replace(/{{hora}}/g, new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }))
      .replace(/{{empresa}}/g, 'Maicon Maksuel');
  };

  const handleSave = async (asDraft: boolean = true) => {
    await onSave({ ...formData, ativo: asDraft ? false : formData.ativo });
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Dashboard WhatsApp</span>
          <ChevronRight className="h-4 w-4" />
          <span>Campanhas</span>
          <ChevronRight className="h-4 w-4" />
          <span className="text-foreground font-medium">Configurações</span>
        </div>
        
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            {isEditing ? 'Editar Campanha' : 'Nova Campanha'}
          </h2>
          <p className="text-muted-foreground">
            Defina regras, público e mensagens automáticas
          </p>
        </div>
      </div>

      {/* Campaign Basic Info */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            Informações Básicas
          </CardTitle>
          <CardDescription>Configure os dados principais da campanha</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome da Campanha</Label>
              <Input
                id="nome"
                placeholder="Ex: Reativação de Clientes Inativos"
                value={formData.nome}
                onChange={(e) => updateField('nome', e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Tipo de Campanha</Label>
              <Select 
                value={formData.tipo_segmentacao} 
                onValueChange={(v) => updateField('tipo_segmentacao', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {tiposCampanha.map((tipo) => (
                    <SelectItem key={tipo.value} value={tipo.value}>
                      <div className="flex items-center gap-2">
                        <tipo.icon className="h-4 w-4" />
                        {tipo.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Prioridade</Label>
              <Select 
                value={formData.prioridade} 
                onValueChange={(v) => updateField('prioridade', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="baixa">
                    <Badge variant="outline" className="bg-muted">Baixa</Badge>
                  </SelectItem>
                  <SelectItem value="media">
                    <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-200">Média</Badge>
                  </SelectItem>
                  <SelectItem value="alta">
                    <Badge variant="outline" className="bg-red-100 text-red-700 border-red-200">Alta</Badge>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl border bg-muted/30">
              <div>
                <p className="font-medium">Status da Campanha</p>
                <p className="text-sm text-muted-foreground">
                  {formData.ativo ? 'Ativa e enviando' : 'Pausada'}
                </p>
              </div>
              <Switch
                checked={formData.ativo}
                onCheckedChange={(v) => updateField('ativo', v)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea
              id="descricao"
              placeholder="Descreva o objetivo desta campanha..."
              value={formData.descricao}
              onChange={(e) => updateField('descricao', e.target.value)}
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Target Audience (Segmentação) */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Público-Alvo (Segmentação)
          </CardTitle>
          <CardDescription>Defina as regras para selecionar os clientes</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Logic Selector */}
          <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/30 border">
            <Label className="font-medium">Combinar condições:</Label>
            <div className="flex gap-2">
              <Button
                variant={formData.logica_segmentacao === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => updateField('logica_segmentacao', 'all')}
              >
                Todas (E)
              </Button>
              <Button
                variant={formData.logica_segmentacao === 'any' ? 'default' : 'outline'}
                size="sm"
                onClick={() => updateField('logica_segmentacao', 'any')}
              >
                Qualquer (OU)
              </Button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Status do Cliente</Label>
              <div className="flex gap-2">
                {['ativo', 'inativo'].map((status) => (
                  <Button
                    key={status}
                    variant={formData.cliente_status.includes(status) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      const newStatus = formData.cliente_status.includes(status)
                        ? formData.cliente_status.filter(s => s !== status)
                        : [...formData.cliente_status, status];
                      updateField('cliente_status', newStatus);
                    }}
                  >
                    {status === 'ativo' ? 'Ativo' : 'Inativo'}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dias_inativo">Inativo há mais de (dias)</Label>
              <Input
                id="dias_inativo"
                type="number"
                min={1}
                value={formData.dias_inativo}
                onChange={(e) => updateField('dias_inativo', parseInt(e.target.value) || 0)}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="total_agendamentos">Total de agendamentos maior que</Label>
              <Input
                id="total_agendamentos"
                type="number"
                min={0}
                value={formData.total_agendamentos_min}
                onChange={(e) => updateField('total_agendamentos_min', parseInt(e.target.value) || 0)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dias_interacao">Última interação há mais de (dias)</Label>
              <Input
                id="dias_interacao"
                type="number"
                min={1}
                value={formData.dias_ultima_interacao}
                onChange={(e) => updateField('dias_ultima_interacao', parseInt(e.target.value) || 0)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex flex-wrap gap-2">
              {tagsDisponiveis.map((tag) => (
                <Button
                  key={tag.value}
                  variant={formData.tags.includes(tag.value) ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    const newTags = formData.tags.includes(tag.value)
                      ? formData.tags.filter(t => t !== tag.value)
                      : [...formData.tags, tag.value];
                    updateField('tags', newTags);
                  }}
                >
                  {tag.label}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Message Configuration */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Configuração da Mensagem
          </CardTitle>
          <CardDescription>Crie a mensagem que será enviada aos clientes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Editor */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="titulo_mensagem">Título da Mensagem (interno)</Label>
                <Input
                  id="titulo_mensagem"
                  placeholder="Ex: Mensagem de Reativação v1"
                  value={formData.titulo_mensagem}
                  onChange={(e) => updateField('titulo_mensagem', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="template_mensagem">Corpo da Mensagem</Label>
                  <div className="flex gap-1">
                    <div className="relative">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      >
                        <Smile className="h-4 w-4" />
                      </Button>
                      {showEmojiPicker && (
                        <div className="absolute right-0 top-full mt-1 p-2 bg-popover border rounded-lg shadow-lg z-50 flex flex-wrap gap-1 w-48">
                          {emojis.map((emoji) => (
                            <button
                              key={emoji}
                              onClick={() => insertEmoji(emoji)}
                              className="p-1.5 hover:bg-muted rounded text-lg"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <Textarea
                  id="template_mensagem"
                  placeholder="Olá {{primeiro_nome}}! Sentimos sua falta..."
                  value={formData.template_mensagem}
                  onChange={(e) => updateField('template_mensagem', e.target.value)}
                  rows={6}
                  className="font-mono text-sm"
                />
              </div>

              {/* Variables */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Variáveis disponíveis:</Label>
                <div className="flex flex-wrap gap-1.5">
                  {variaveisDisponiveis.map((v) => (
                    <button
                      key={v.key}
                      onClick={() => insertVariable(v.key)}
                      className="px-2 py-1 text-xs rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                      title={v.desc}
                    >
                      {v.key}
                    </button>
                  ))}
                </div>
              </div>

              {/* CTA Option */}
              <div className="p-4 rounded-xl border space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Botão de Ação (CTA)</p>
                    <p className="text-sm text-muted-foreground">Adicionar botão clicável</p>
                  </div>
                  <Switch
                    checked={formData.usar_cta}
                    onCheckedChange={(v) => updateField('usar_cta', v)}
                  />
                </div>
                
                {formData.usar_cta && (
                  <div className="grid gap-3 pt-2">
                    <div className="space-y-2">
                      <Label htmlFor="cta_texto">Texto do Botão</Label>
                      <Input
                        id="cta_texto"
                        placeholder="Agendar Agora"
                        value={formData.cta_texto}
                        onChange={(e) => updateField('cta_texto', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cta_link">Link do Botão</Label>
                      <div className="relative">
                        <Link className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="cta_link"
                          placeholder="https://..."
                          value={formData.cta_link}
                          onChange={(e) => updateField('cta_link', e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Preview */}
            <div className="space-y-3">
              <Label>Pré-visualização</Label>
              <div className="rounded-xl border bg-[#e5ddd5] dark:bg-[#0b141a] p-4 min-h-[300px]">
                <div className="max-w-[280px] ml-auto">
                  <div className="bg-[#dcf8c6] dark:bg-[#005c4b] rounded-lg rounded-tr-none p-3 shadow-sm">
                    <p className="text-sm whitespace-pre-wrap text-[#111b21] dark:text-[#e9edef]">
                      {getPreviewMessage() || 'Digite sua mensagem...'}
                    </p>
                    {formData.usar_cta && formData.cta_texto && (
                      <div className="mt-2 pt-2 border-t border-black/10 dark:border-white/10">
                        <div className="flex items-center justify-center gap-1 text-[#00a5f4] text-sm font-medium">
                          <Link className="h-3.5 w-3.5" />
                          {formData.cta_texto}
                        </div>
                      </div>
                    )}
                    <div className="flex justify-end mt-1">
                      <span className="text-[10px] text-[#667781] dark:text-[#8696a0]">
                        {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Scheduling & Rules */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Agendamento e Regras
          </CardTitle>
          <CardDescription>Configure quando e como as mensagens serão enviadas</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Frequência de Envio</Label>
              <Select 
                value={formData.frequencia} 
                onValueChange={(v) => updateField('frequencia', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="once">Uma vez</SelectItem>
                  <SelectItem value="daily">Diariamente</SelectItem>
                  <SelectItem value="weekly">Semanalmente</SelectItem>
                  <SelectItem value="monthly">Mensalmente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="horario_envio">Horário de Envio</Label>
              <Input
                id="horario_envio"
                type="time"
                value={formData.horario_envio}
                onChange={(e) => updateField('horario_envio', e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Dias Permitidos</Label>
            <div className="flex flex-wrap gap-2">
              {diasSemana.map((dia) => (
                <Button
                  key={dia.value}
                  variant={formData.dias_permitidos.includes(dia.value) ? 'default' : 'outline'}
                  size="sm"
                  className="w-12"
                  onClick={() => {
                    const newDias = formData.dias_permitidos.includes(dia.value)
                      ? formData.dias_permitidos.filter(d => d !== dia.value)
                      : [...formData.dias_permitidos, dia.value];
                    updateField('dias_permitidos', newDias);
                  }}
                >
                  {dia.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Horário de Silêncio (início)</Label>
              <Input
                type="time"
                value={formData.horario_silencio_inicio}
                onChange={(e) => updateField('horario_silencio_inicio', e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Não enviar após este horário</p>
            </div>
            <div className="space-y-2">
              <Label>Horário de Silêncio (fim)</Label>
              <Input
                type="time"
                value={formData.horario_silencio_fim}
                onChange={(e) => updateField('horario_silencio_fim', e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Voltar a enviar após este horário</p>
            </div>
          </div>

          <Separator />

          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex items-center justify-between p-4 rounded-xl border">
              <div>
                <p className="font-medium">Retentar se falhar</p>
                <p className="text-sm text-muted-foreground">Tenta enviar novamente em caso de erro</p>
              </div>
              <Switch
                checked={formData.retentar_falha}
                onCheckedChange={(v) => updateField('retentar_falha', v)}
              />
            </div>

            {formData.retentar_falha && (
              <div className="space-y-2">
                <Label htmlFor="max_tentativas">Máximo de Tentativas</Label>
                <Input
                  id="max_tentativas"
                  type="number"
                  min={1}
                  max={10}
                  value={formData.max_tentativas}
                  onChange={(e) => updateField('max_tentativas', parseInt(e.target.value) || 3)}
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Safety & Limits */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Segurança e Limites
          </CardTitle>
          <CardDescription>Proteja sua conta com limites de envio</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="max_mensagens_dia">Máximo de mensagens por dia</Label>
              <Input
                id="max_mensagens_dia"
                type="number"
                min={1}
                value={formData.max_mensagens_dia}
                onChange={(e) => updateField('max_mensagens_dia', parseInt(e.target.value) || 100)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="intervalo_mensagens">Intervalo entre mensagens (segundos)</Label>
              <Input
                id="intervalo_mensagens"
                type="number"
                min={5}
                value={formData.intervalo_mensagens}
                onChange={(e) => updateField('intervalo_mensagens', parseInt(e.target.value) || 30)}
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl border bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/50">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-amber-900 dark:text-amber-100">Parar se WhatsApp desconectar</p>
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  Interrompe envios automaticamente se a conexão for perdida
                </p>
              </div>
            </div>
            <Switch
              checked={formData.parar_se_desconectado}
              onCheckedChange={(v) => updateField('parar_se_desconectado', v)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Actions Footer */}
      <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
        <Button 
          variant="outline" 
          onClick={() => handleSave(true)}
          disabled={saving}
          className="sm:flex-1"
        >
          <Save className="h-4 w-4 mr-2" />
          Salvar Rascunho
        </Button>
        
        <Button 
          onClick={() => {
            updateField('ativo', true);
            handleSave(false);
          }}
          disabled={saving || !formData.nome || !formData.template_mensagem}
          className="sm:flex-1 bg-green-600 hover:bg-green-700"
        >
          <Play className="h-4 w-4 mr-2" />
          Ativar Campanha
        </Button>

        {isEditing && formData.ativo && (
          <Button 
            variant="secondary"
            onClick={() => {
              updateField('ativo', false);
              handleSave(true);
            }}
            disabled={saving}
          >
            <Pause className="h-4 w-4 mr-2" />
            Pausar
          </Button>
        )}

        {isEditing && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={saving}>
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir Campanha</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja excluir esta campanha? Esta ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}

        <Button variant="ghost" onClick={onClose}>
          <X className="h-4 w-4 mr-2" />
          Cancelar
        </Button>
      </div>
    </div>
  );
}
