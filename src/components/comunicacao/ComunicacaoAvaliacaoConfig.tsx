import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Star,
  Save,
  Eye,
  BarChart3,
  MessageSquare,
  ThumbsUp,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AvaliacaoConfig {
  id: string;
  ativo: boolean;
  enviar_apos_minutos: number;
  template_mensagem: string;
  incluir_link_avaliacao: boolean;
  nota_minima_destaque: number;
  solicitar_comentario: boolean;
  dias_da_semana: number[];
}

const DIAS = [
  { value: 1, label: "Seg" },
  { value: 2, label: "Ter" },
  { value: 3, label: "Qua" },
  { value: 4, label: "Qui" },
  { value: 5, label: "Sex" },
  { value: 6, label: "Sáb" },
  { value: 7, label: "Dom" },
];

const VARIAVEIS = ["{{nome}}", "{{servico}}", "{{profissional}}", "{{data}}", "{{empresa}}", "{{link_avaliacao}}"];

function formatTempo(minutos: number): string {
  if (minutos < 60) return `${minutos}min após`;
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return m > 0 ? `${h}h${m}min após` : `${h}h após`;
}

function previewMensagem(template: string): string {
  return template
    .replace(/\{\{nome\}\}/g, "Maria Silva")
    .replace(/\{\{servico\}\}/g, "Corte + Escova")
    .replace(/\{\{profissional\}\}/g, "Ana")
    .replace(/\{\{data\}\}/g, "15/01/2026")
    .replace(/\{\{empresa\}\}/g, "Salão Beauty")
    .replace(/\{\{link_avaliacao\}\}/g, "https://avalie.me/abc123");
}

interface ComunicacaoAvaliacaoConfigProps {
  avaliacoes?: any[];
}

export function ComunicacaoAvaliacaoConfig({ avaliacoes = [] }: ComunicacaoAvaliacaoConfigProps) {
  const [config, setConfig] = useState<AvaliacaoConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("comunicacao_avaliacao_config")
      .select("*")
      .maybeSingle() as { data: AvaliacaoConfig | null; error: any };
    if (error) console.error("Erro ao buscar config avaliação:", error);
    setConfig(data);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("comunicacao_avaliacao_config")
        .update({
          ativo: config.ativo,
          enviar_apos_minutos: config.enviar_apos_minutos,
          template_mensagem: config.template_mensagem,
          incluir_link_avaliacao: config.incluir_link_avaliacao,
          nota_minima_destaque: config.nota_minima_destaque,
          solicitar_comentario: config.solicitar_comentario,
          dias_da_semana: config.dias_da_semana,
        } as any)
        .eq("id", config.id);
      if (error) throw error;
      toast.success("Configuração de avaliação salva!");
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const insertVariable = (variable: string) => {
    if (!config) return;
    setConfig({ ...config, template_mensagem: config.template_mensagem + variable });
  };

  const mediaNotas = avaliacoes.length > 0
    ? (avaliacoes.reduce((acc, a) => acc + a.nota, 0) / avaliacoes.length).toFixed(1)
    : "—";

  if (loading) {
    return <div className="text-center py-12 text-muted-foreground">Carregando...</div>;
  }

  if (!config) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Star className="h-12 w-12 mx-auto mb-4 opacity-30" />
        <p>Configuração não encontrada</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Star className="h-6 w-6 text-primary" />
            Avaliação
          </h2>
          <p className="text-muted-foreground mt-1">
            Solicite avaliações e feedbacks dos clientes automaticamente
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Label>Ativo</Label>
            <Switch
              checked={config.ativo}
              onCheckedChange={(checked) => setConfig({ ...config, ativo: checked })}
            />
          </div>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <MessageSquare className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{avaliacoes.length}</p>
              <p className="text-xs text-muted-foreground">Avaliações recebidas</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <Star className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{mediaNotas}</p>
              <p className="text-xs text-muted-foreground">Média das notas</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <ThumbsUp className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {avaliacoes.filter((a) => a.nota >= (config.nota_minima_destaque || 4)).length}
              </p>
              <p className="text-xs text-muted-foreground">Avaliações positivas</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Config */}
      <Card>
        <CardContent className="p-6 space-y-6">
          <div className="space-y-2">
            <Label>Template da mensagem de avaliação</Label>
            <div className="flex flex-wrap gap-1 mb-1">
              {VARIAVEIS.map((v) => (
                <Button
                  key={v}
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs font-mono"
                  onClick={() => insertVariable(v)}
                >
                  {v}
                </Button>
              ))}
            </div>
            <Textarea
              value={config.template_mensagem}
              onChange={(e) => setConfig({ ...config, template_mensagem: e.target.value })}
              rows={5}
            />
          </div>

          {config.template_mensagem && (
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                <Eye className="h-3 w-3" /> Preview ao vivo
              </div>
              <p className="text-sm whitespace-pre-wrap">
                {previewMensagem(config.template_mensagem)}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label>Enviar após finalizar atendimento: {formatTempo(config.enviar_apos_minutos)}</Label>
            <Slider
              value={[config.enviar_apos_minutos]}
              onValueChange={([v]) => setConfig({ ...config, enviar_apos_minutos: v })}
              min={5}
              max={1440}
              step={5}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>5min</span>
              <span>24h</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Nota mínima para destaque</Label>
            <Input
              type="number"
              min={1}
              max={5}
              value={config.nota_minima_destaque}
              onChange={(e) => setConfig({ ...config, nota_minima_destaque: parseInt(e.target.value) || 4 })}
              className="w-24"
            />
            <p className="text-xs text-muted-foreground">
              Avaliações com nota ≥ {config.nota_minima_destaque} serão destacadas
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Incluir link de avaliação</Label>
              <p className="text-xs text-muted-foreground">Adiciona link direto para avaliar</p>
            </div>
            <Switch
              checked={config.incluir_link_avaliacao}
              onCheckedChange={(checked) => setConfig({ ...config, incluir_link_avaliacao: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Solicitar comentário</Label>
              <p className="text-xs text-muted-foreground">Pede ao cliente que deixe um comentário</p>
            </div>
            <Switch
              checked={config.solicitar_comentario}
              onCheckedChange={(checked) => setConfig({ ...config, solicitar_comentario: checked })}
            />
          </div>

          <div className="space-y-2">
            <Label>Dias de envio</Label>
            <div className="flex flex-wrap gap-2">
              {DIAS.map((dia) => (
                <label key={dia.value} className="flex items-center gap-1.5">
                  <Checkbox
                    checked={config.dias_da_semana.includes(dia.value)}
                    onCheckedChange={(checked) => {
                      setConfig({
                        ...config,
                        dias_da_semana: checked
                          ? [...config.dias_da_semana, dia.value].sort()
                          : config.dias_da_semana.filter((d) => d !== dia.value),
                      });
                    }}
                  />
                  <span className="text-sm">{dia.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Recent evaluations */}
          {avaliacoes.length > 0 && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Avaliações recentes
              </Label>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {avaliacoes.slice(0, 10).map((av) => (
                  <div key={av.id} className="p-3 bg-muted/30 rounded-lg flex items-center gap-3">
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star
                          key={n}
                          className={`h-4 w-4 ${n <= av.nota ? "text-amber-500 fill-amber-500" : "text-muted-foreground/30"}`}
                        />
                      ))}
                    </div>
                    {av.comentario && (
                      <p className="text-sm text-muted-foreground truncate flex-1">{av.comentario}</p>
                    )}
                    <Badge variant={av.nota >= (config.nota_minima_destaque || 4) ? "default" : "secondary"} className="text-xs">
                      {av.nota}/5
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
