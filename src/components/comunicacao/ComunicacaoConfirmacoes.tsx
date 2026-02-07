/**
 * WhatsApp Confirmações Settings
 * Configuration page for automatic WhatsApp confirmation messages
 */

import { useState, useEffect } from "react";
import { 
  MessageSquare, 
  Smartphone, 
  Power, 
  Save, 
  Send, 
  Clock, 
  Shield,
  Wifi,
  WifiOff,
  AlertTriangle
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface ConfirmacoesConfigData {
  ativo: boolean;
  titulo_mensagem: string;
  template_mensagem: string;
  envio_imediato: boolean;
  minutos_apos_agendamento: number;
  reenviar_nao_entregue: boolean;
  max_reenvios: number;
  apenas_horario_comercial: boolean;
  horario_inicio: string;
  horario_fim: string;
  intervalo_protecao: number;
  parar_se_desconectado: boolean;
}

const variaveisDisponiveis = [
  { key: '{{nome}}', desc: 'Nome do cliente' },
  { key: '{{data}}', desc: 'Data do agendamento' },
  { key: '{{hora}}', desc: 'Hora do agendamento' },
  { key: '{{servico}}', desc: 'Nome do serviço' },
  { key: '{{profissional}}', desc: 'Nome do profissional' },
  { key: '{{empresa}}', desc: 'Nome do salão' },
];

interface ComunicacaoConfirmacoesProps {
  whatsappConectado?: boolean;
}

export function ComunicacaoConfirmacoes({ whatsappConectado = false }: ComunicacaoConfirmacoesProps) {
  const [saving, setSaving] = useState(false);
  const [testando, setTestando] = useState(false);
  
  const [config, setConfig] = useState<ConfirmacoesConfigData>({
    ativo: true,
    titulo_mensagem: 'Confirmação de Agendamento',
    template_mensagem: `Olá {{nome}}! 👋

Seu agendamento está confirmado:

📅 *{{data}}* às *{{hora}}*
✂️ {{servico}}

Responda *SIM* para confirmar ou *NÃO* para cancelar.

{{empresa}} 💜`,
    envio_imediato: true,
    minutos_apos_agendamento: 5,
    reenviar_nao_entregue: true,
    max_reenvios: 2,
    apenas_horario_comercial: true,
    horario_inicio: '08:00',
    horario_fim: '20:00',
    intervalo_protecao: 30,
    parar_se_desconectado: true,
  });

  const updateConfig = <K extends keyof ConfirmacoesConfigData>(
    field: K, 
    value: ConfirmacoesConfigData[K]
  ) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const insertVariable = (variable: string) => {
    updateConfig('template_mensagem', config.template_mensagem + variable);
  };

  const getPreviewMessage = () => {
    return config.template_mensagem
      .replace(/{{nome}}/g, 'Maria Silva')
      .replace(/{{data}}/g, 'Segunda, 15/01')
      .replace(/{{hora}}/g, '14:30')
      .replace(/{{servico}}/g, 'Corte + Escova')
      .replace(/{{profissional}}/g, 'Ana')
      .replace(/{{empresa}}/g, 'Maicon Maksuel');
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Configurações salvas com sucesso!');
    } catch (error) {
      toast.error('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  const handleTestMessage = async () => {
    setTestando(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      toast.success('Mensagem de teste enviada!');
    } catch (error) {
      toast.error('Erro ao enviar mensagem de teste');
    } finally {
      setTestando(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Smartphone className="h-6 w-6 text-primary" />
            Confirmações por WhatsApp
          </h2>
          <p className="text-muted-foreground mt-1">
            Mensagens automáticas de confirmação de agendamento
          </p>
        </div>
        
        {/* Status Indicator */}
        <Badge 
          variant={whatsappConectado ? "default" : "secondary"}
          className={whatsappConectado 
            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-0" 
            : ""
          }
        >
          {whatsappConectado ? (
            <>
              <Wifi className="h-3.5 w-3.5 mr-1.5" />
              WhatsApp Conectado
            </>
          ) : (
            <>
              <WifiOff className="h-3.5 w-3.5 mr-1.5" />
              WhatsApp Desconectado
            </>
          )}
        </Badge>
      </div>

      {/* Activation Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-primary/10">
                <Power className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Ativar Confirmações por WhatsApp</h3>
                <p className="text-muted-foreground text-sm mt-0.5">
                  Enviar mensagem automática quando um agendamento for criado
                </p>
              </div>
            </div>
            <Switch
              checked={config.ativo}
              onCheckedChange={(v) => updateConfig('ativo', v)}
              className="scale-125"
            />
          </div>
        </CardContent>
      </Card>

      {/* Message Template Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Template da Mensagem
          </CardTitle>
          <CardDescription>Configure a mensagem que será enviada automaticamente</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Editor */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="titulo">Título da Mensagem (interno)</Label>
                <Input
                  id="titulo"
                  placeholder="Ex: Confirmação Padrão"
                  value={config.titulo_mensagem}
                  onChange={(e) => updateConfig('titulo_mensagem', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="template">Corpo da Mensagem</Label>
                <Textarea
                  id="template"
                  placeholder="Digite sua mensagem..."
                  value={config.template_mensagem}
                  onChange={(e) => updateConfig('template_mensagem', e.target.value)}
                  rows={8}
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
            </div>

            {/* Preview */}
            <div className="space-y-3">
              <Label>Pré-visualização</Label>
              <div className="rounded-xl border bg-[#e5ddd5] dark:bg-[#0b141a] p-4 min-h-[280px]">
                <div className="max-w-[280px] ml-auto">
                  <div className="bg-[#dcf8c6] dark:bg-[#005c4b] rounded-lg rounded-tr-none p-3 shadow-sm">
                    <p className="text-sm whitespace-pre-wrap text-[#111b21] dark:text-[#e9edef]">
                      {getPreviewMessage() || 'Digite sua mensagem...'}
                    </p>
                    <div className="flex justify-end mt-1">
                      <span className="text-[10px] text-[#667781] dark:text-[#8696a0]">
                        10:30 ✓✓
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Send Rules Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Regras de Envio
          </CardTitle>
          <CardDescription>Defina quando e como as mensagens serão enviadas</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl border">
                <div>
                  <p className="font-medium">Enviar imediatamente</p>
                  <p className="text-sm text-muted-foreground">Após criar o agendamento</p>
                </div>
                <Switch
                  checked={config.envio_imediato}
                  onCheckedChange={(v) => updateConfig('envio_imediato', v)}
                />
              </div>

              {!config.envio_imediato && (
                <div className="space-y-2">
                  <Label>Enviar após (minutos)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={60}
                    value={config.minutos_apos_agendamento}
                    onChange={(e) => updateConfig('minutos_apos_agendamento', parseInt(e.target.value) || 5)}
                  />
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl border">
                <div>
                  <p className="font-medium">Reenviar se não entregue</p>
                  <p className="text-sm text-muted-foreground">Tentar novamente em caso de falha</p>
                </div>
                <Switch
                  checked={config.reenviar_nao_entregue}
                  onCheckedChange={(v) => updateConfig('reenviar_nao_entregue', v)}
                />
              </div>

              {config.reenviar_nao_entregue && (
                <div className="space-y-2">
                  <Label>Máximo de tentativas</Label>
                  <Select 
                    value={config.max_reenvios.toString()} 
                    onValueChange={(v) => updateConfig('max_reenvios', parseInt(v))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 tentativa</SelectItem>
                      <SelectItem value="2">2 tentativas</SelectItem>
                      <SelectItem value="3">3 tentativas</SelectItem>
                      <SelectItem value="5">5 tentativas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Safety Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Segurança
          </CardTitle>
          <CardDescription>Proteja sua conta com limites e restrições</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-4 rounded-xl border">
            <div>
              <p className="font-medium">Apenas horário comercial</p>
              <p className="text-sm text-muted-foreground">Não enviar fora do horário de funcionamento</p>
            </div>
            <Switch
              checked={config.apenas_horario_comercial}
              onCheckedChange={(v) => updateConfig('apenas_horario_comercial', v)}
            />
          </div>

          {config.apenas_horario_comercial && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Horário de início</Label>
                <Input
                  type="time"
                  value={config.horario_inicio}
                  onChange={(e) => updateConfig('horario_inicio', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Horário de fim</Label>
                <Input
                  type="time"
                  value={config.horario_fim}
                  onChange={(e) => updateConfig('horario_fim', e.target.value)}
                />
              </div>
            </div>
          )}

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="intervalo">Intervalo de proteção entre mensagens (segundos)</Label>
            <Input
              id="intervalo"
              type="number"
              min={10}
              max={300}
              value={config.intervalo_protecao}
              onChange={(e) => updateConfig('intervalo_protecao', parseInt(e.target.value) || 30)}
            />
            <p className="text-xs text-muted-foreground">
              Tempo mínimo entre o envio de cada mensagem para evitar bloqueios
            </p>
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
              checked={config.parar_se_desconectado}
              onCheckedChange={(v) => updateConfig('parar_se_desconectado', v)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
        <Button 
          onClick={handleSave}
          disabled={saving}
          className="sm:flex-1"
        >
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Salvando...' : 'Salvar Configurações'}
        </Button>
        
        <Button 
          variant="outline"
          onClick={handleTestMessage}
          disabled={testando || !whatsappConectado}
        >
          <Send className="h-4 w-4 mr-2" />
          {testando ? 'Enviando...' : 'Testar Mensagem'}
        </Button>

        <Button 
          variant="ghost"
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={() => updateConfig('ativo', false)}
          disabled={!config.ativo}
        >
          <Power className="h-4 w-4 mr-2" />
          Desativar Confirmações
        </Button>
      </div>
    </div>
  );
}
