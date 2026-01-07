import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, AlertTriangle, Clock, Bell, RefreshCw, Save, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ConfigTaxaFalta {
  id: string;
  cobrar_taxa: boolean;
  valor_taxa: number;
  prazo_confirmacao_horas: number;
  prazo_minimo_cancelamento_horas: number;
  comportamento_sem_confirmacao: string;
  comportamento_cancelamento_tardio: string;
  horario_inicio_envio: string;
  horario_fim_envio: string;
  tentar_reenvio: boolean;
  tentativas_reenvio: number;
  intervalo_reenvio_minutos: number;
  notificar_confirmacao: boolean;
  notificar_cancelamento: boolean;
  notificar_sem_resposta: boolean;
  aplicacao_taxa: string;
}

export default function ConfiguracoesTaxaFalta() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<ConfigTaxaFalta>({
    id: "",
    cobrar_taxa: false,
    valor_taxa: 50,
    prazo_confirmacao_horas: 24,
    prazo_minimo_cancelamento_horas: 12,
    comportamento_sem_confirmacao: "marcar_falta",
    comportamento_cancelamento_tardio: "cobrar_100",
    horario_inicio_envio: "08:00",
    horario_fim_envio: "20:00",
    tentar_reenvio: true,
    tentativas_reenvio: 3,
    intervalo_reenvio_minutos: 60,
    notificar_confirmacao: true,
    notificar_cancelamento: true,
    notificar_sem_resposta: true,
    aplicacao_taxa: "proximo_atendimento",
  });

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const { data, error } = await supabase
        .from("configuracoes_taxa_falta")
        .select("*")
        .limit(1)
        .single();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      if (data) {
        setConfig(data);
      }
    } catch (error) {
      console.error("Erro ao carregar configurações:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { id, ...configData } = config;

      if (id) {
        const { error } = await supabase
          .from("configuracoes_taxa_falta")
          .update(configData)
          .eq("id", id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("configuracoes_taxa_falta")
          .insert([configData]);

        if (error) throw error;
      }

      toast.success("Configurações salvas com sucesso!");
      loadConfig();
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast.error("Erro ao salvar configurações");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/configuracoes")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Taxa de Falta</h1>
            <p className="text-muted-foreground">Configure a política de cobrança por faltas</p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Salvar Alterações
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Configuração Principal */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Política de Taxa
            </CardTitle>
            <CardDescription>
              Defina se e como a taxa de falta será cobrada
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Cobrar taxa de falta</Label>
                <p className="text-sm text-muted-foreground">
                  Ativar cobrança quando cliente faltar
                </p>
              </div>
              <Switch
                checked={config.cobrar_taxa}
                onCheckedChange={(checked) => setConfig({ ...config, cobrar_taxa: checked })}
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Valor da taxa (R$)</Label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={config.valor_taxa}
                onChange={(e) => setConfig({ ...config, valor_taxa: parseFloat(e.target.value) || 0 })}
                disabled={!config.cobrar_taxa}
              />
            </div>

            <div className="space-y-2">
              <Label>Aplicação da taxa</Label>
              <Select
                value={config.aplicacao_taxa}
                onValueChange={(value) => setConfig({ ...config, aplicacao_taxa: value })}
                disabled={!config.cobrar_taxa}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="proximo_atendimento">Cobrar no próximo atendimento</SelectItem>
                  <SelectItem value="imediato">Gerar cobrança imediata</SelectItem>
                  <SelectItem value="adicionar_divida">Adicionar como dívida</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Prazos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-500" />
              Prazos
            </CardTitle>
            <CardDescription>
              Configure os prazos para confirmação e cancelamento
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Prazo para confirmação (horas antes)</Label>
              <Input
                type="number"
                min={1}
                max={72}
                value={config.prazo_confirmacao_horas}
                onChange={(e) => setConfig({ ...config, prazo_confirmacao_horas: parseInt(e.target.value) || 24 })}
              />
              <p className="text-xs text-muted-foreground">
                Tempo antes do agendamento para enviar solicitação de confirmação
              </p>
            </div>

            <div className="space-y-2">
              <Label>Prazo mínimo para cancelamento (horas antes)</Label>
              <Input
                type="number"
                min={1}
                max={48}
                value={config.prazo_minimo_cancelamento_horas}
                onChange={(e) => setConfig({ ...config, prazo_minimo_cancelamento_horas: parseInt(e.target.value) || 12 })}
              />
              <p className="text-xs text-muted-foreground">
                Cancelamentos após este prazo podem ser cobrados
              </p>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Comportamento sem confirmação</Label>
              <Select
                value={config.comportamento_sem_confirmacao}
                onValueChange={(value) => setConfig({ ...config, comportamento_sem_confirmacao: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manter_agendamento">Manter agendamento</SelectItem>
                  <SelectItem value="marcar_falta">Marcar como falta</SelectItem>
                  <SelectItem value="cancelar">Cancelar automaticamente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Comportamento cancelamento tardio</Label>
              <Select
                value={config.comportamento_cancelamento_tardio}
                onValueChange={(value) => setConfig({ ...config, comportamento_cancelamento_tardio: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sem_cobranca">Sem cobrança</SelectItem>
                  <SelectItem value="cobrar_50">Cobrar 50% da taxa</SelectItem>
                  <SelectItem value="cobrar_100">Cobrar 100% da taxa</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Envio de Mensagens */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-green-500" />
              Envio de Lembretes
            </CardTitle>
            <CardDescription>
              Configure horários e tentativas de reenvio
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Horário início</Label>
                <Input
                  type="time"
                  value={config.horario_inicio_envio}
                  onChange={(e) => setConfig({ ...config, horario_inicio_envio: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Horário fim</Label>
                <Input
                  type="time"
                  value={config.horario_fim_envio}
                  onChange={(e) => setConfig({ ...config, horario_fim_envio: e.target.value })}
                />
              </div>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Tentar reenvio</Label>
                <p className="text-sm text-muted-foreground">
                  Reenviar se não houver resposta
                </p>
              </div>
              <Switch
                checked={config.tentar_reenvio}
                onCheckedChange={(checked) => setConfig({ ...config, tentar_reenvio: checked })}
              />
            </div>

            {config.tentar_reenvio && (
              <>
                <div className="space-y-2">
                  <Label>Número de tentativas</Label>
                  <Input
                    type="number"
                    min={1}
                    max={5}
                    value={config.tentativas_reenvio}
                    onChange={(e) => setConfig({ ...config, tentativas_reenvio: parseInt(e.target.value) || 3 })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Intervalo entre tentativas (minutos)</Label>
                  <Input
                    type="number"
                    min={15}
                    max={180}
                    step={15}
                    value={config.intervalo_reenvio_minutos}
                    onChange={(e) => setConfig({ ...config, intervalo_reenvio_minutos: parseInt(e.target.value) || 60 })}
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Notificações */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-purple-500" />
              Notificações Automáticas
            </CardTitle>
            <CardDescription>
              Receba alertas sobre confirmações e cancelamentos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Notificar confirmações</Label>
                <p className="text-sm text-muted-foreground">
                  Aviso quando cliente confirmar
                </p>
              </div>
              <Switch
                checked={config.notificar_confirmacao}
                onCheckedChange={(checked) => setConfig({ ...config, notificar_confirmacao: checked })}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Notificar cancelamentos</Label>
                <p className="text-sm text-muted-foreground">
                  Aviso quando cliente cancelar
                </p>
              </div>
              <Switch
                checked={config.notificar_cancelamento}
                onCheckedChange={(checked) => setConfig({ ...config, notificar_cancelamento: checked })}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Notificar sem resposta</Label>
                <p className="text-sm text-muted-foreground">
                  Aviso quando cliente não responder
                </p>
              </div>
              <Switch
                checked={config.notificar_sem_resposta}
                onCheckedChange={(checked) => setConfig({ ...config, notificar_sem_resposta: checked })}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
