/**
 * Pesquisa de Satisfação — Componente Unificado
 * Combina a configuração de Avaliação com o dashboard NPS em uma única experiência.
 * Reutiliza lógica existente de ComunicacaoAvaliacaoConfig + NpsPesquisa.
 */

import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Star,
    Save,
    Eye,
    BarChart3,
    MessageSquare,
    ThumbsUp,
    ThumbsDown,
    Meh,
    Users,
    Search,
    Settings2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

// ========== TIPOS ==========

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

interface NpsResposta {
    id: string;
    cliente_id: string | null;
    cliente_nome: string | null;
    nota: number;
    comentario: string | null;
    atendimento_id: string | null;
    created_at: string;
}

// ========== CONSTANTES ==========

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

// ========== HELPERS ==========

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

// ========== COMPONENTE PRINCIPAL ==========

export function SatisfacaoUnificada() {
    const [innerTab, setInnerTab] = useState("config");

    // --- Estado Configuração (Avaliação) ---
    const [config, setConfig] = useState<AvaliacaoConfig | null>(null);
    const [loadingConfig, setLoadingConfig] = useState(true);
    const [saving, setSaving] = useState(false);

    // --- Estado NPS ---
    const [respostas, setRespostas] = useState<NpsResposta[]>([]);
    const [loadingNps, setLoadingNps] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    // ========== FETCH CONFIG ==========
    useEffect(() => {
        const fetchConfig = async () => {
            setLoadingConfig(true);
            const { data, error } = await supabase
                .from("comunicacao_avaliacao_config")
                .select("*")
                .maybeSingle() as { data: AvaliacaoConfig | null; error: any };
            if (error) console.error("Erro ao buscar config avaliação:", error);
            setConfig(data);
            setLoadingConfig(false);
        };
        fetchConfig();
    }, []);

    // ========== FETCH NPS ==========
    const fetchRespostas = useCallback(async () => {
        setLoadingNps(true);
        try {
            const { data, error } = await supabase
                .from("nps_respostas")
                .select("*")
                .order("created_at", { ascending: false });
            if (data) setRespostas(data as NpsResposta[]);
            if (error) {
                console.error("Erro ao buscar NPS:", error);
                setRespostas([]);
            }
        } catch {
            setRespostas([]);
        } finally {
            setLoadingNps(false);
        }
    }, []);

    useEffect(() => {
        fetchRespostas();
    }, [fetchRespostas]);

    // ========== HANDLERS CONFIG ==========
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
            toast.success("Configuração de satisfação salva!");
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

    // ========== CÁLCULOS NPS ==========
    const npsData = useMemo(() => {
        if (respostas.length === 0) return { score: 0, promotores: 0, neutros: 0, detratores: 0, total: 0 };
        const promotores = respostas.filter((r) => r.nota >= 9).length;
        const neutros = respostas.filter((r) => r.nota >= 7 && r.nota <= 8).length;
        const detratores = respostas.filter((r) => r.nota <= 6).length;
        const total = respostas.length;
        const score = Math.round(((promotores - detratores) / total) * 100);
        return { score, promotores, neutros, detratores, total };
    }, [respostas]);

    const getScoreColor = (score: number) => {
        if (score >= 75) return "text-green-600";
        if (score >= 50) return "text-emerald-500";
        if (score >= 0) return "text-amber-500";
        return "text-red-500";
    };

    const getScoreLabel = (score: number) => {
        if (score >= 75) return "Excelente";
        if (score >= 50) return "Bom";
        if (score >= 0) return "Razoável";
        return "Precisa Melhorar";
    };

    const getNotaCategoria = (nota: number) => {
        if (nota >= 9) return { label: "Promotor", color: "bg-green-100 text-green-700", icon: ThumbsUp };
        if (nota >= 7) return { label: "Neutro", color: "bg-amber-100 text-amber-700", icon: Meh };
        return { label: "Detrator", color: "bg-red-100 text-red-700", icon: ThumbsDown };
    };

    const filteredRespostas = useMemo(() => {
        if (!searchQuery) return respostas;
        const q = searchQuery.toLowerCase();
        return respostas.filter(
            (r) =>
                (r.cliente_nome && r.cliente_nome.toLowerCase().includes(q)) ||
                (r.comentario && r.comentario.toLowerCase().includes(q))
        );
    }, [respostas, searchQuery]);

    const distribuicao = useMemo(() => {
        const dist: { [key: number]: number } = {};
        for (let i = 0; i <= 10; i++) dist[i] = 0;
        respostas.forEach((r) => dist[r.nota]++);
        return dist;
    }, [respostas]);

    // ========== RENDER ==========
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                        <Star className="h-6 w-6 text-primary" />
                        Pesquisa de Satisfação
                    </h2>
                    <p className="text-muted-foreground mt-1">
                        Configure avaliações automáticas e acompanhe o NPS do seu salão
                    </p>
                </div>
                {config && (
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                            <Label>Ativo</Label>
                            <Switch
                                checked={config.ativo}
                                onCheckedChange={(checked) => setConfig({ ...config, ativo: checked })}
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Inner Tabs */}
            <Tabs value={innerTab} onValueChange={setInnerTab}>
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="config" className="flex items-center gap-2">
                        <Settings2 className="h-4 w-4" />
                        Configuração
                    </TabsTrigger>
                    <TabsTrigger value="resultados" className="flex items-center gap-2">
                        <BarChart3 className="h-4 w-4" />
                        Resultados NPS
                    </TabsTrigger>
                </TabsList>

                {/* ========== TAB: CONFIGURAÇÃO ========== */}
                <TabsContent value="config" className="mt-6 space-y-6">
                    {loadingConfig ? (
                        <div className="text-center py-12 text-muted-foreground">Carregando...</div>
                    ) : !config ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <Star className="h-12 w-12 mx-auto mb-4 opacity-30" />
                            <p>Configuração não encontrada</p>
                        </div>
                    ) : (
                        <>
                            {/* Stats */}
                            <div className="grid gap-4 sm:grid-cols-3">
                                <Card>
                                    <CardContent className="p-4 flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-primary/10">
                                            <MessageSquare className="h-5 w-5 text-primary" />
                                        </div>
                                        <div>
                                            <p className="text-2xl font-bold">{npsData.total}</p>
                                            <p className="text-xs text-muted-foreground">Respostas recebidas</p>
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardContent className="p-4 flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-amber-500/10">
                                            <Star className="h-5 w-5 text-amber-600" />
                                        </div>
                                        <div>
                                            <p className={`text-2xl font-bold ${npsData.total > 0 ? getScoreColor(npsData.score) : ""}`}>
                                                {npsData.total > 0 ? npsData.score : "—"}
                                            </p>
                                            <p className="text-xs text-muted-foreground">NPS Score</p>
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardContent className="p-4 flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-green-500/10">
                                            <ThumbsUp className="h-5 w-5 text-green-600" />
                                        </div>
                                        <div>
                                            <p className="text-2xl font-bold">{npsData.promotores}</p>
                                            <p className="text-xs text-muted-foreground">Promotores</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Config Form */}
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
                                            max={10}
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

                                    <Button onClick={handleSave} disabled={saving} className="w-full">
                                        <Save className="h-4 w-4 mr-2" />
                                        {saving ? "Salvando..." : "Salvar Configuração"}
                                    </Button>
                                </CardContent>
                            </Card>
                        </>
                    )}
                </TabsContent>

                {/* ========== TAB: RESULTADOS NPS ========== */}
                <TabsContent value="resultados" className="mt-6 space-y-6">
                    {loadingNps ? (
                        <div className="text-center py-12 text-muted-foreground">Carregando...</div>
                    ) : (
                        <>
                            {/* Score Principal */}
                            <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
                                <CardContent className="pt-6">
                                    <div className="flex flex-col sm:flex-row items-center gap-6">
                                        <div className="text-center">
                                            <p className="text-sm text-muted-foreground mb-1">NPS Score</p>
                                            <p className={`text-6xl font-bold ${getScoreColor(npsData.score)}`}>
                                                {npsData.total > 0 ? npsData.score : "—"}
                                            </p>
                                            {npsData.total > 0 && (
                                                <Badge className="mt-2">{getScoreLabel(npsData.score)}</Badge>
                                            )}
                                        </div>
                                        <div className="flex-1 w-full space-y-3">
                                            <div className="flex items-center gap-3">
                                                <ThumbsUp className="h-5 w-5 text-green-500 shrink-0" />
                                                <div className="flex-1">
                                                    <div className="flex justify-between text-sm mb-1">
                                                        <span>Promotores (9-10)</span>
                                                        <span className="font-medium">{npsData.promotores}</span>
                                                    </div>
                                                    <Progress
                                                        value={npsData.total > 0 ? (npsData.promotores / npsData.total) * 100 : 0}
                                                        className="h-2 bg-green-100"
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <Meh className="h-5 w-5 text-amber-500 shrink-0" />
                                                <div className="flex-1">
                                                    <div className="flex justify-between text-sm mb-1">
                                                        <span>Neutros (7-8)</span>
                                                        <span className="font-medium">{npsData.neutros}</span>
                                                    </div>
                                                    <Progress
                                                        value={npsData.total > 0 ? (npsData.neutros / npsData.total) * 100 : 0}
                                                        className="h-2 bg-amber-100"
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <ThumbsDown className="h-5 w-5 text-red-500 shrink-0" />
                                                <div className="flex-1">
                                                    <div className="flex justify-between text-sm mb-1">
                                                        <span>Detratores (0-6)</span>
                                                        <span className="font-medium">{npsData.detratores}</span>
                                                    </div>
                                                    <Progress
                                                        value={npsData.total > 0 ? (npsData.detratores / npsData.total) * 100 : 0}
                                                        className="h-2 bg-red-100"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Resumo Cards */}
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                <Card>
                                    <CardContent className="pt-6">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                                                <Users className="h-5 w-5 text-blue-500" />
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground">Total</p>
                                                <p className="text-xl font-bold">{npsData.total}</p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardContent className="pt-6">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                                                <ThumbsUp className="h-5 w-5 text-green-500" />
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground">Promotores</p>
                                                <p className="text-xl font-bold text-green-600">
                                                    {npsData.total > 0 ? Math.round((npsData.promotores / npsData.total) * 100) : 0}%
                                                </p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardContent className="pt-6">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                                                <Meh className="h-5 w-5 text-amber-500" />
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground">Neutros</p>
                                                <p className="text-xl font-bold text-amber-600">
                                                    {npsData.total > 0 ? Math.round((npsData.neutros / npsData.total) * 100) : 0}%
                                                </p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardContent className="pt-6">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                                                <ThumbsDown className="h-5 w-5 text-red-500" />
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground">Detratores</p>
                                                <p className="text-xl font-bold text-red-600">
                                                    {npsData.total > 0 ? Math.round((npsData.detratores / npsData.total) * 100) : 0}%
                                                </p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Distribuição de Notas */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <BarChart3 className="h-5 w-5" />
                                        Distribuição de Notas
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex items-end gap-1 h-32">
                                        {Array.from({ length: 11 }, (_, i) => {
                                            const count = distribuicao[i] || 0;
                                            const max = Math.max(...Object.values(distribuicao), 1);
                                            const height = (count / max) * 100;
                                            const color = i >= 9 ? "bg-green-500" : i >= 7 ? "bg-amber-500" : "bg-red-500";
                                            return (
                                                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                                                    <span className="text-xs text-muted-foreground">{count}</span>
                                                    <div
                                                        className={`w-full rounded-t ${color} transition-all duration-500`}
                                                        style={{ height: `${Math.max(height, 4)}%` }}
                                                    />
                                                    <span className="text-xs font-medium">{i}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Busca + Tabela */}
                            <Card>
                                <CardContent className="pt-6 space-y-4">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Buscar por cliente ou comentário..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="pl-9"
                                        />
                                    </div>

                                    {filteredRespostas.length === 0 ? (
                                        <div className="py-8 text-center">
                                            <Star className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                                            <p className="text-muted-foreground">Nenhuma resposta registrada</p>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                As respostas aparecerão aqui quando clientes responderem
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="overflow-x-auto">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>Cliente</TableHead>
                                                        <TableHead className="text-center">Nota</TableHead>
                                                        <TableHead>Categoria</TableHead>
                                                        <TableHead>Comentário</TableHead>
                                                        <TableHead>Data</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {filteredRespostas.map((r) => {
                                                        const cat = getNotaCategoria(r.nota);
                                                        const IconComp = cat.icon;
                                                        return (
                                                            <TableRow key={r.id}>
                                                                <TableCell className="font-medium">
                                                                    {r.cliente_nome || "Anônimo"}
                                                                </TableCell>
                                                                <TableCell className="text-center">
                                                                    <span className="text-2xl font-bold">{r.nota}</span>
                                                                </TableCell>
                                                                <TableCell>
                                                                    <Badge className={cat.color}>
                                                                        <IconComp className="h-3 w-3 mr-1" />
                                                                        {cat.label}
                                                                    </Badge>
                                                                </TableCell>
                                                                <TableCell className="max-w-[200px] truncate text-sm">
                                                                    {r.comentario || "—"}
                                                                </TableCell>
                                                                <TableCell className="text-sm">
                                                                    {format(new Date(r.created_at), "dd/MM/yyyy")}
                                                                </TableCell>
                                                            </TableRow>
                                                        );
                                                    })}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}
