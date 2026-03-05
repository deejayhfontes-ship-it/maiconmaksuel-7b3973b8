import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Star,
  Plus,
  Pencil,
  Trash2,
  Send,
  Clock,
  Eye,
  BarChart3,
  MessageSquare,
  ThumbsUp,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PosAtendimentoConfig {
  id: string;
  nome: string;
  tipo: string;
  template_mensagem: string;
  ativo: boolean;
  enviar_apos_minutos: number;
  incluir_link_avaliacao: boolean;
  incluir_cupom: boolean;
  cupom_desconto: string | null;
  dias_da_semana: number[];
  created_at: string;
}

type FormData = Omit<PosAtendimentoConfig, "id" | "created_at">;

const TIPOS = [
  { value: "agradecimento", label: "Agradecimento", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  { value: "pesquisa", label: "Pesquisa", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  { value: "retorno", label: "Retorno", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  { value: "promocao", label: "Promoção", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
];

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

const defaultForm: FormData = {
  nome: "",
  tipo: "agradecimento",
  template_mensagem: "",
  ativo: true,
  enviar_apos_minutos: 60,
  incluir_link_avaliacao: true,
  incluir_cupom: false,
  cupom_desconto: null,
  dias_da_semana: [1, 2, 3, 4, 5, 6],
};

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

export function ComunicacaoPosAtendimento() {
  const [configs, setConfigs] = useState<PosAtendimentoConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>({ ...defaultForm });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("comunicacao_pos_atendimento")
      .select("*")
      .order("created_at", { ascending: false }) as { data: PosAtendimentoConfig[] | null; error: any };
    if (error) {
      console.error("Erro ao buscar pós-atendimento:", error);
    }
    setConfigs(data || []);
    setLoading(false);
  };

  const handleOpenNew = () => {
    setEditingId(null);
    setForm({ ...defaultForm });
    setDialogOpen(true);
  };

  const handleOpenEdit = (config: PosAtendimentoConfig) => {
    setEditingId(config.id);
    setForm({
      nome: config.nome,
      tipo: config.tipo,
      template_mensagem: config.template_mensagem,
      ativo: config.ativo,
      enviar_apos_minutos: config.enviar_apos_minutos,
      incluir_link_avaliacao: config.incluir_link_avaliacao,
      incluir_cupom: config.incluir_cupom,
      cupom_desconto: config.cupom_desconto,
      dias_da_semana: config.dias_da_semana,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.nome.trim() || !form.template_mensagem.trim()) {
      toast.error("Preencha nome e mensagem");
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        const { error } = await supabase
          .from("comunicacao_pos_atendimento")
          .update(form as any)
          .eq("id", editingId);
        if (error) throw error;
        toast.success("Mensagem atualizada!");
      } else {
        const { error } = await supabase
          .from("comunicacao_pos_atendimento")
          .insert([form as any]);
        if (error) throw error;
        toast.success("Mensagem criada!");
      }
      setDialogOpen(false);
      fetchConfigs();
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from("comunicacao_pos_atendimento")
      .delete()
      .eq("id", id);
    if (error) {
      toast.error("Erro ao excluir");
    } else {
      toast.success("Mensagem excluída");
      fetchConfigs();
    }
  };

  const handleToggleAtivo = async (id: string, ativo: boolean) => {
    const { error } = await supabase
      .from("comunicacao_pos_atendimento")
      .update({ ativo } as any)
      .eq("id", id);
    if (error) {
      toast.error("Erro ao atualizar status");
    } else {
      setConfigs((prev) => prev.map((c) => (c.id === id ? { ...c, ativo } : c)));
    }
  };

  const insertVariable = (variable: string) => {
    setForm((prev) => ({
      ...prev,
      template_mensagem: prev.template_mensagem + variable,
    }));
  };

  const tipoInfo = (tipo: string) => TIPOS.find((t) => t.value === tipo) || TIPOS[0];
  const ativos = configs.filter((c) => c.ativo).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Star className="h-6 w-6 text-primary" />
            Pós-atendimento
          </h2>
          <p className="text-muted-foreground mt-1">
            Mensagens automáticas enviadas após finalização do atendimento
          </p>
        </div>
        <Button onClick={handleOpenNew}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Mensagem
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Send className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{ativos}</p>
              <p className="text-xs text-muted-foreground">Mensagens ativas</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <BarChart3 className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">—</p>
              <p className="text-xs text-muted-foreground">Taxa de abertura</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <ThumbsUp className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">—</p>
              <p className="text-xs text-muted-foreground">Avaliações recebidas</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de mensagens */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando...</div>
      ) : configs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <MessageSquare className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <h3 className="font-semibold text-lg">Nenhuma mensagem configurada</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              Crie sua primeira mensagem pós-atendimento
            </p>
            <Button onClick={handleOpenNew}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Mensagem
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {configs.map((config) => {
            const tipo = tipoInfo(config.tipo);
            return (
              <Card key={config.id} className={!config.ativo ? "opacity-60" : ""}>
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold">{config.nome}</h3>
                        <Badge className={`${tipo.color} border-0 text-xs`}>
                          {tipo.label}
                        </Badge>
                        <Badge variant="outline" className="text-xs gap-1">
                          <Clock className="h-3 w-3" />
                          {formatTempo(config.enviar_apos_minutos)}
                        </Badge>
                      </div>
                      <div className="p-3 bg-muted/50 rounded-lg text-sm">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                          <Eye className="h-3 w-3" /> Preview
                        </div>
                        <p className="whitespace-pre-wrap text-foreground/80">
                          {previewMensagem(config.template_mensagem)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {config.incluir_link_avaliacao && <Badge variant="secondary" className="text-xs">📎 Link avaliação</Badge>}
                        {config.incluir_cupom && config.cupom_desconto && (
                          <Badge variant="secondary" className="text-xs">🎫 {config.cupom_desconto}</Badge>
                        )}
                        <span>
                          Dias: {config.dias_da_semana.map((d) => DIAS.find((dia) => dia.value === d)?.label).join(", ")}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Switch
                        checked={config.ativo}
                        onCheckedChange={(checked) => handleToggleAtivo(config.id, checked)}
                      />
                      <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(config)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir mensagem?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza que deseja excluir "{config.nome}"? Esta ação não pode ser desfeita.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(config.id)}>
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialog Criar/Editar */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Editar Mensagem" : "Nova Mensagem Pós-atendimento"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Nome da mensagem</Label>
                <Input
                  placeholder="Ex: Agradecimento padrão"
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIPOS.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Template da mensagem</Label>
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
                placeholder="Olá {{nome}}! Obrigado por visitar nosso salão..."
                value={form.template_mensagem}
                onChange={(e) => setForm({ ...form, template_mensagem: e.target.value })}
                rows={4}
              />
            </div>

            {/* Preview ao vivo */}
            {form.template_mensagem && (
              <div className="p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                  <Eye className="h-3 w-3" /> Preview ao vivo
                </div>
                <p className="text-sm whitespace-pre-wrap">
                  {previewMensagem(form.template_mensagem)}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label>Enviar após finalizar atendimento: {formatTempo(form.enviar_apos_minutos)}</Label>
              <Slider
                value={[form.enviar_apos_minutos]}
                onValueChange={([v]) => setForm({ ...form, enviar_apos_minutos: v })}
                min={5}
                max={1440}
                step={5}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>5min</span>
                <span>24h</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Incluir link de avaliação</Label>
                <p className="text-xs text-muted-foreground">Adiciona link para avaliar o atendimento</p>
              </div>
              <Switch
                checked={form.incluir_link_avaliacao}
                onCheckedChange={(checked) => setForm({ ...form, incluir_link_avaliacao: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Incluir cupom de desconto</Label>
                <p className="text-xs text-muted-foreground">Oferece um cupom para o próximo atendimento</p>
              </div>
              <Switch
                checked={form.incluir_cupom}
                onCheckedChange={(checked) => setForm({ ...form, incluir_cupom: checked })}
              />
            </div>

            {form.incluir_cupom && (
              <div className="space-y-2">
                <Label>Código do cupom</Label>
                <Input
                  placeholder="Ex: VOLTE10"
                  value={form.cupom_desconto || ""}
                  onChange={(e) => setForm({ ...form, cupom_desconto: e.target.value })}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Dias da semana para envio</Label>
              <div className="flex flex-wrap gap-3">
                {DIAS.map((dia) => (
                  <label key={dia.value} className="flex items-center gap-1.5 text-sm">
                    <Checkbox
                      checked={form.dias_da_semana.includes(dia.value)}
                      onCheckedChange={(checked) => {
                        setForm((prev) => ({
                          ...prev,
                          dias_da_semana: checked
                            ? [...prev.dias_da_semana, dia.value].sort()
                            : prev.dias_da_semana.filter((d) => d !== dia.value),
                        }));
                      }}
                    />
                    {dia.label}
                  </label>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Salvando..." : editingId ? "Salvar Alterações" : "Criar Mensagem"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
