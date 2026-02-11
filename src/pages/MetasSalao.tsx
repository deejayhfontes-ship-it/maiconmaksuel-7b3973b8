import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
} from "@/components/ui/alert-dialog";
import {
  Target,
  ArrowLeft,
  Plus,
  Clock,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  DollarSign,
  Scissors,
  Users,
  ShoppingCart,
  RotateCcw,
  BarChart3,
  Trophy,
  AlertTriangle,
  Edit,
  Trash2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfMonth, endOfMonth, addMonths, subMonths, differenceInDays, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

interface Meta {
  id: string;
  tipo: string;
  nome: string;
  periodo_tipo: string;
  data_inicio: string;
  data_fim: string;
  mes: number | null;
  ano: number;
  valor_meta: number;
  unidade: string;
  calculo_automatico: boolean;
  percentual_crescimento: number;
  alerta_50: boolean;
  alerta_75: boolean;
  alerta_atraso: boolean;
  alerta_100: boolean;
  ativo: boolean;
  observacoes: string | null;
}

interface MetaComProgresso extends Meta {
  valor_atual: number;
  percentual: number;
  projecao: number;
  status: "otimo" | "bom" | "atencao" | "critico";
}

const tiposMeta = [
  { value: "faturamento", label: "Faturamento (R$)", icon: DollarSign, color: "#007AFF" },
  { value: "servicos", label: "Quantidade de Serviços (#)", icon: Scissors, color: "#34C759" },
  { value: "novos_clientes", label: "Novos Clientes (#)", icon: Users, color: "#FF2D55" },
  { value: "ticket_medio", label: "Ticket Médio (R$)", icon: BarChart3, color: "#FF9500" },
  { value: "produtos", label: "Vendas de Produtos (R$)", icon: ShoppingCart, color: "#AF52DE" },
  { value: "taxa_retorno", label: "Taxa de Retorno (%)", icon: RotateCcw, color: "#5AC8FA" },
  { value: "personalizada", label: "Personalizada", icon: Target, color: "#FFD700" },
];

const MetasSalao = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [metas, setMetas] = useState<MetaComProgresso[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingMeta, setEditingMeta] = useState<Meta | null>(null);
  const [showHistorico, setShowHistorico] = useState(false);

  const [formMeta, setFormMeta] = useState({
    tipo: "faturamento",
    nome: "",
    periodo_tipo: "mensal",
    valor_meta: "",
    unidade: "R$",
    calculo_automatico: false,
    percentual_crescimento: "10",
    alerta_50: true,
    alerta_75: true,
    alerta_atraso: true,
    alerta_100: true,
    observacoes: "",
  });

  const mesReferencia = format(currentMonth, "yyyy-MM");
  const mesNome = format(currentMonth, "MMMM 'de' yyyy", { locale: ptBR });
  const inicioMes = startOfMonth(currentMonth);
  const fimMes = endOfMonth(currentMonth);
  const diasNoMes = differenceInDays(fimMes, inicioMes) + 1;
  const diasPassados = Math.min(differenceInDays(new Date(), inicioMes) + 1, diasNoMes);
  const diasRestantes = Math.max(diasNoMes - diasPassados, 0);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  const calcularValorAtual = async (meta: Meta): Promise<number> => {
    const inicio = format(inicioMes, "yyyy-MM-dd");
    const fim = format(fimMes, "yyyy-MM-dd");

    switch (meta.tipo) {
      case "faturamento": {
        const { data } = await supabase
          .from("atendimentos")
          .select("valor_final")
          .eq("status", "fechado")
          .gte("data_hora", `${inicio}T00:00:00`)
          .lte("data_hora", `${fim}T23:59:59`);
        return data?.reduce((acc, a) => acc + Number(a.valor_final), 0) || 0;
      }
      case "servicos": {
        const { count } = await supabase
          .from("atendimento_servicos")
          .select("id", { count: "exact", head: true })
          .gte("created_at", `${inicio}T00:00:00`)
          .lte("created_at", `${fim}T23:59:59`);
        return count || 0;
      }
      case "novos_clientes": {
        const { count } = await supabase
          .from("clientes")
          .select("id", { count: "exact", head: true })
          .gte("created_at", `${inicio}T00:00:00`)
          .lte("created_at", `${fim}T23:59:59`);
        return count || 0;
      }
      case "produtos": {
        const { data } = await supabase
          .from("atendimento_produtos")
          .select("subtotal")
          .gte("created_at", `${inicio}T00:00:00`)
          .lte("created_at", `${fim}T23:59:59`);
        return data?.reduce((acc, p) => acc + Number(p.subtotal), 0) || 0;
      }
      case "ticket_medio": {
        const { data: atendimentos } = await supabase
          .from("atendimentos")
          .select("valor_final")
          .eq("status", "fechado")
          .gte("data_hora", `${inicio}T00:00:00`)
          .lte("data_hora", `${fim}T23:59:59`);
        if (!atendimentos || atendimentos.length === 0) return 0;
        const total = atendimentos.reduce((acc, a) => acc + Number(a.valor_final), 0);
        return total / atendimentos.length;
      }
      default:
        return 0;
    }
  };

  const fetchMetas = async () => {
    setLoading(true);
    const mes = currentMonth.getMonth() + 1;
    const ano = currentMonth.getFullYear();

    const { data: metasData } = await supabase
      .from("metas")
      .select("*")
      .eq("ativo", true)
      .eq("mes", mes)
      .eq("ano", ano);

    if (metasData && metasData.length > 0) {
      const metasComProgresso: MetaComProgresso[] = [];
      
      for (const meta of metasData) {
        const valorAtual = await calcularValorAtual(meta);
        const percentual = (valorAtual / meta.valor_meta) * 100;
        const taxaDiaria = valorAtual / Math.max(diasPassados, 1);
        const projecao = taxaDiaria * diasNoMes;
        
        let status: "otimo" | "bom" | "atencao" | "critico" = "bom";
        const projecaoPercentual = (projecao / meta.valor_meta) * 100;
        
        if (projecaoPercentual >= 100) status = "otimo";
        else if (projecaoPercentual >= 90) status = "bom";
        else if (projecaoPercentual >= 70) status = "atencao";
        else status = "critico";

        metasComProgresso.push({
          ...meta,
          valor_atual: valorAtual,
          percentual: Math.min(percentual, 100),
          projecao,
          status,
        });
      }
      
      setMetas(metasComProgresso);
    } else {
      // Criar metas padrão se não existirem
      setMetas([]);
    }
    
    setLoading(false);
  };

  useEffect(() => {
    fetchMetas();
  }, [currentMonth]);

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentMonth(prev => direction === "prev" ? subMonths(prev, 1) : addMonths(prev, 1));
  };

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { label: string; color: string; emoji: string }> = {
      otimo: { label: "ÓTIMO", color: "#34C759", emoji: "✅" },
      bom: { label: "EM DIA", color: "#007AFF", emoji: "🟡" },
      atencao: { label: "ATENÇÃO", color: "#FF9500", emoji: "⚠️" },
      critico: { label: "CRÍTICO", color: "#FF3B30", emoji: "🔴" },
    };
    return configs[status] || configs.bom;
  };

  const getMetaIcon = (tipo: string) => {
    const config = tiposMeta.find(t => t.value === tipo);
    return config || tiposMeta[0];
  };

  const handleSaveMeta = async () => {
    if (!formMeta.valor_meta) {
      toast({ title: "Informe o valor da meta", variant: "destructive" });
      return;
    }

    const mes = currentMonth.getMonth() + 1;
    const ano = currentMonth.getFullYear();
    const tipoConfig = tiposMeta.find(t => t.value === formMeta.tipo);

    const payload = {
      tipo: formMeta.tipo,
      nome: formMeta.nome || tipoConfig?.label || formMeta.tipo,
      periodo_tipo: formMeta.periodo_tipo,
      data_inicio: format(inicioMes, "yyyy-MM-dd"),
      data_fim: format(fimMes, "yyyy-MM-dd"),
      mes,
      ano,
      valor_meta: parseFloat(formMeta.valor_meta),
      unidade: formMeta.unidade,
      calculo_automatico: formMeta.calculo_automatico,
      percentual_crescimento: parseFloat(formMeta.percentual_crescimento) || 0,
      alerta_50: formMeta.alerta_50,
      alerta_75: formMeta.alerta_75,
      alerta_atraso: formMeta.alerta_atraso,
      alerta_100: formMeta.alerta_100,
      ativo: true,
      observacoes: formMeta.observacoes || null,
    };

    if (editingMeta) {
      const { error } = await supabase.from("metas").update(payload).eq("id", editingMeta.id);
      if (error) {
        toast({ title: "Erro ao atualizar meta", variant: "destructive" });
      } else {
        toast({ title: "Meta atualizada!" });
        fetchMetas();
      }
    } else {
      const { error } = await supabase.from("metas").insert(payload);
      if (error) {
        toast({ title: "Erro ao criar meta", variant: "destructive" });
      } else {
        toast({ title: "Meta criada!" });
        fetchMetas();
      }
    }

    setShowForm(false);
    setEditingMeta(null);
    setFormMeta({
      tipo: "faturamento",
      nome: "",
      periodo_tipo: "mensal",
      valor_meta: "",
      unidade: "R$",
      calculo_automatico: false,
      percentual_crescimento: "10",
      alerta_50: true,
      alerta_75: true,
      alerta_atraso: true,
      alerta_100: true,
      observacoes: "",
    });
  };

  const openEditMeta = (meta: Meta) => {
    setEditingMeta(meta);
    setFormMeta({
      tipo: meta.tipo,
      nome: meta.nome,
      periodo_tipo: meta.periodo_tipo,
      valor_meta: meta.valor_meta.toString(),
      unidade: meta.unidade,
      calculo_automatico: meta.calculo_automatico,
      percentual_crescimento: meta.percentual_crescimento.toString(),
      alerta_50: meta.alerta_50,
      alerta_75: meta.alerta_75,
      alerta_atraso: meta.alerta_atraso,
      alerta_100: meta.alerta_100,
      observacoes: meta.observacoes || "",
    });
    setShowForm(true);
  };

  const [isDeleteMetaOpen, setIsDeleteMetaOpen] = useState(false);
  const [metaToDelete, setMetaToDelete] = useState<MetaComProgresso | null>(null);

  const handleDeleteMetaClick = (meta: MetaComProgresso) => {
    setMetaToDelete(meta);
    setIsDeleteMetaOpen(true);
  };

  const deleteMeta = async () => {
    if (!metaToDelete) return;
    const { error } = await supabase.from("metas").delete().eq("id", metaToDelete.id);
    if (error) {
      toast({ title: "Erro ao excluir", variant: "destructive" });
    } else {
      toast({ title: "Meta excluída!" });
      fetchMetas();
    }
    setIsDeleteMetaOpen(false);
    setMetaToDelete(null);
  };

  const resumoGeral = useMemo(() => {
    if (metas.length === 0) return { percentualMedio: 0, noCaminho: 0, precisamAtencao: 0, melhor: null as MetaComProgresso | null, pior: null as MetaComProgresso | null };
    
    const percentualMedio = metas.reduce((acc, m) => acc + m.percentual, 0) / metas.length;
    const noCaminho = metas.filter(m => m.status === "otimo" || m.status === "bom").length;
    const precisamAtencao = metas.filter(m => m.status === "atencao" || m.status === "critico").length;
    const melhor = [...metas].sort((a, b) => b.percentual - a.percentual)[0];
    const pior = [...metas].sort((a, b) => a.percentual - b.percentual)[0];

    return { percentualMedio, noCaminho, precisamAtencao, melhor, pior };
  }, [metas]);

  const formatMetaValue = (meta: MetaComProgresso, value: number) => {
    if (meta.unidade === "R$") return formatCurrency(value);
    if (meta.unidade === "%") return `${value.toFixed(1)}%`;
    return value.toFixed(0);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl" style={{ backgroundColor: "#FFD70020" }}>
            <Target className="h-6 w-6" style={{ color: "#FFD700" }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Metas e Objetivos do Salão</h1>
            <p className="text-muted-foreground">Defina e acompanhe as metas mensais</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowHistorico(true)}>
            <Clock className="h-4 w-4 mr-2" />
            Histórico
          </Button>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Meta
          </Button>
        </div>
      </div>

      {/* Month Selector */}
      <Card className="border-2" style={{ borderColor: "#FFD700" }}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => navigateMonth("prev")}>
              <ChevronLeft className="h-5 w-5 mr-1" />
              Mês Anterior
            </Button>
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground uppercase">
                METAS DE {mesNome.toUpperCase()}
              </p>
              <p className="text-muted-foreground">
                {diasRestantes} dias restantes • {diasPassados}/{diasNoMes} dias passados
              </p>
            </div>
            <Button variant="ghost" onClick={() => navigateMonth("next")}>
              Próximo Mês
              <ChevronRight className="h-5 w-5 ml-1" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Goals Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <div className="h-10 w-10 bg-muted rounded-lg" />
                  <div className="h-5 w-32 bg-muted rounded" />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="h-3 w-full bg-muted rounded-full" />
                <div className="h-4 w-24 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : metas.length === 0 ? (
        <Card className="py-12">
          <CardContent className="text-center">
            <Target className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma meta definida para este mês</h3>
            <p className="text-muted-foreground mb-4">Crie metas para acompanhar o desempenho do seu salão</p>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Criar Primeira Meta
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Goals Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {metas.map((meta) => {
              const Icon = getMetaIcon(meta.tipo).icon;
              const color = getMetaIcon(meta.tipo).color;
              const statusConfig = getStatusConfig(meta.status);
              const falta = Math.max(meta.valor_meta - meta.valor_atual, 0);
              const projecaoPercentual = (meta.projecao / meta.valor_meta) * 100;

              return (
                <Card key={meta.id} className="relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: color }} />
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg" style={{ backgroundColor: `${color}20` }}>
                          <Icon className="h-5 w-5" style={{ color }} />
                        </div>
                        <CardTitle className="text-base">{meta.nome}</CardTitle>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditMeta(meta)} aria-label="Editar meta">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteMetaClick(meta)} aria-label="Excluir meta">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Meta: {formatMetaValue(meta, meta.valor_meta)}</span>
                        <span className="font-semibold">{formatMetaValue(meta, meta.valor_atual)}</span>
                      </div>
                      <Progress value={meta.percentual} className="h-3" />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{meta.percentual.toFixed(1)}%</span>
                        <span>Faltam: {formatMetaValue(meta, falta)}</span>
                      </div>
                    </div>

                    {diasRestantes > 0 && (
                      <div className="text-xs text-muted-foreground">
                        Média/dia necessária: {formatMetaValue(meta, falta / diasRestantes)}
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t">
                      <Badge style={{ backgroundColor: `${statusConfig.color}20`, color: statusConfig.color }}>
                        {statusConfig.emoji} {statusConfig.label}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        Projeção: {projecaoPercentual.toFixed(0)}%
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* General Summary */}
          <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" style={{ color: "#FFD700" }} />
                Desempenho Geral do Mês
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <Progress value={resumoGeral.percentualMedio} className="h-4 mb-2" />
                  <p className="text-3xl font-bold">{resumoGeral.percentualMedio.toFixed(1)}%</p>
                  <p className="text-sm text-muted-foreground">Atingimento médio</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-success">{resumoGeral.noCaminho}</p>
                  <p className="text-sm text-muted-foreground">de {metas.length} metas no caminho</p>
                  {resumoGeral.precisamAtencao > 0 && (
                    <p className="text-sm text-amber-600 mt-1">
                      <AlertTriangle className="h-4 w-4 inline mr-1" />
                      {resumoGeral.precisamAtencao} precisam atenção
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  {resumoGeral.melhor && (
                    <div className="flex items-center gap-2 text-sm">
                      <Trophy className="h-4 w-4 text-success" />
                      <span>Melhor: {resumoGeral.melhor.nome} ({resumoGeral.melhor.percentual.toFixed(0)}%)</span>
                    </div>
                  )}
                  {resumoGeral.pior && resumoGeral.pior.percentual < 100 && (
                    <div className="flex items-center gap-2 text-sm">
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                      <span>Atenção: {resumoGeral.pior.nome} ({resumoGeral.pior.percentual.toFixed(0)}%)</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Form Modal */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingMeta ? "Editar Meta" : "Nova Meta"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Tipo de Meta *</Label>
              <Select value={formMeta.tipo} onValueChange={(v) => {
                const config = tiposMeta.find(t => t.value === v);
                setFormMeta({ 
                  ...formMeta, 
                  tipo: v, 
                  nome: config?.label || v,
                  unidade: v === "taxa_retorno" ? "%" : ["servicos", "novos_clientes"].includes(v) ? "#" : "R$"
                });
              }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {tiposMeta.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      <div className="flex items-center gap-2">
                        <t.icon className="h-4 w-4" style={{ color: t.color }} />
                        {t.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {formMeta.tipo === "personalizada" && (
              <>
                <div>
                  <Label>Nome da Meta *</Label>
                  <Input 
                    value={formMeta.nome}
                    onChange={(e) => setFormMeta({ ...formMeta, nome: e.target.value })}
                    placeholder="Ex: Taxa de ocupação"
                  />
                </div>
                <div>
                  <Label>Unidade</Label>
                  <Select value={formMeta.unidade} onValueChange={(v) => setFormMeta({ ...formMeta, unidade: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="R$">R$ (Reais)</SelectItem>
                      <SelectItem value="#"># (Quantidade)</SelectItem>
                      <SelectItem value="%">% (Percentual)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            <div>
              <Label>Valor da Meta *</Label>
              <Input 
                type="number"
                value={formMeta.valor_meta}
                onChange={(e) => setFormMeta({ ...formMeta, valor_meta: e.target.value })}
                placeholder={formMeta.unidade === "R$" ? "50000" : formMeta.unidade === "%" ? "70" : "500"}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {formMeta.unidade === "R$" && "Ex: 50000 para R$ 50.000,00"}
                {formMeta.unidade === "#" && "Ex: 500 para 500 atendimentos"}
                {formMeta.unidade === "%" && "Ex: 70 para 70%"}
              </p>
            </div>

            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div>
                <Label>Cálculo Automático</Label>
                <p className="text-xs text-muted-foreground">Baseado na média dos últimos 3 meses</p>
              </div>
              <Switch 
                checked={formMeta.calculo_automatico}
                onCheckedChange={(c) => setFormMeta({ ...formMeta, calculo_automatico: c })}
              />
            </div>

            {formMeta.calculo_automatico && (
              <div>
                <Label>Percentual de Crescimento</Label>
                <Input 
                  type="number"
                  value={formMeta.percentual_crescimento}
                  onChange={(e) => setFormMeta({ ...formMeta, percentual_crescimento: e.target.value })}
                  placeholder="10"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Meta será média + {formMeta.percentual_crescimento}%
                </p>
              </div>
            )}

            <div>
              <Label>Alertas</Label>
              <div className="space-y-2 mt-2">
                <div className="flex items-center gap-2">
                  <Checkbox 
                    checked={formMeta.alerta_50}
                    onCheckedChange={(c) => setFormMeta({ ...formMeta, alerta_50: !!c })}
                  />
                  <span className="text-sm">Notificar ao atingir 50%</span>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox 
                    checked={formMeta.alerta_75}
                    onCheckedChange={(c) => setFormMeta({ ...formMeta, alerta_75: !!c })}
                  />
                  <span className="text-sm">Notificar ao atingir 75%</span>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox 
                    checked={formMeta.alerta_atraso}
                    onCheckedChange={(c) => setFormMeta({ ...formMeta, alerta_atraso: !!c })}
                  />
                  <span className="text-sm">Alerta se abaixo de 70% faltando 1 semana</span>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox 
                    checked={formMeta.alerta_100}
                    onCheckedChange={(c) => setFormMeta({ ...formMeta, alerta_100: !!c })}
                  />
                  <span className="text-sm">Notificar ao atingir 100%</span>
                </div>
              </div>
            </div>

            <div>
              <Label>Observações</Label>
              <Textarea 
                value={formMeta.observacoes}
                onChange={(e) => setFormMeta({ ...formMeta, observacoes: e.target.value })}
                placeholder="Ex: Meta agressiva devido Black Friday"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowForm(false); setEditingMeta(null); }}>
              Cancelar
            </Button>
            <Button onClick={handleSaveMeta}>
              {editingMeta ? "Salvar Alterações" : "Criar Meta"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Meta Confirmation */}
      <AlertDialog open={isDeleteMetaOpen} onOpenChange={setIsDeleteMetaOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir meta?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a meta <strong>{metaToDelete?.nome}</strong>?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteMeta}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MetasSalao;
