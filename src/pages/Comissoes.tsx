import { useState, useEffect, useMemo, useCallback } from "react";
import {
    Percent,
    Users,
    DollarSign,
    Calendar,
    Download,
    CheckCircle2,
    Clock,
    TrendingUp,
    Search,
    Filter,
    FileDown,
    Banknote,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { isDesktop, isPinAuthenticated } from "@/lib/auth/pin-auth";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import * as XLSX from "xlsx";

// Tipos
interface Profissional {
    id: string;
    nome: string;
    foto_url: string | null;
    cor_agenda: string;
    comissao_padrao?: number;
}

interface ComissaoRegistro {
    id: string;
    profissional_id: string;
    atendimento_id: string | null;
    servico_id: string | null;
    valor_servico: number;
    percentual: number;
    valor_comissao: number;
    status: string;
    data_pagamento: string | null;
    periodo_ref: string | null;
    created_at: string;
    servico_nome?: string;
    profissional_nome?: string;
}

interface ComissaoResumo {
    profissional: Profissional;
    total_servicos: number;
    total_comissao: number;
    total_pendente: number;
    total_pago: number;
    qtd_atendimentos: number;
}

type PeriodoFiltro = "hoje" | "semana" | "mes" | "mes_anterior" | "custom";

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
    }).format(value);
};

const getInitials = (name: string) => {
    return name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase();
};

export default function Comissoes() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [profissionais, setProfissionais] = useState<Profissional[]>([]);
    const [comissoes, setComissoes] = useState<ComissaoRegistro[]>([]);
    const [periodo, setPeriodo] = useState<PeriodoFiltro>("mes");
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedProfissional, setSelectedProfissional] = useState<string>("todos");
    const [showPagarDialog, setShowPagarDialog] = useState(false);
    const [profissionalPagar, setProfissionalPagar] = useState<ComissaoResumo | null>(null);
    const [activeTab, setActiveTab] = useState("resumo");

    // Calcular range de datas baseado no período
    const dateRange = useMemo(() => {
        const now = new Date();
        switch (periodo) {
            case "hoje":
                return { from: new Date(now.setHours(0, 0, 0, 0)), to: new Date() };
            case "semana":
                return { from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfWeek(now, { weekStartsOn: 1 }) };
            case "mes":
                return { from: startOfMonth(now), to: endOfMonth(now) };
            case "mes_anterior": {
                const mesAnterior = subMonths(now, 1);
                return { from: startOfMonth(mesAnterior), to: endOfMonth(mesAnterior) };
            }
            default:
                return { from: startOfMonth(now), to: endOfMonth(now) };
        }
    }, [periodo]);

    // Buscar dados
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        fetchData();
    }, [dateRange]);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            // Buscar profissionais
            const { data: profs } = await supabase
                .from("profissionais")
                .select("id, nome, foto_url, cor_agenda, comissao_padrao")
                .eq("ativo", true)
                .order("nome");

            if (profs) setProfissionais(profs as Profissional[]);

            // Buscar comissões do período
            const { data: comissoesData } = await supabase
                .from("comissoes_registro")
                .select("*")
                .gte("created_at", dateRange.from.toISOString())
                .lte("created_at", dateRange.to.toISOString())
                .order("created_at", { ascending: false });

            if (comissoesData) {
                setComissoes(comissoesData as ComissaoRegistro[]);
            }
        } catch (error) {
            console.error("Erro ao buscar comissões:", error);
            // Se tabela não existe ainda, usar dados vazios
            setComissoes([]);
        } finally {
            setLoading(false);
        }
    }, [dateRange]);

    // Calcular resumo por profissional
    const resumoPorProfissional = useMemo((): ComissaoResumo[] => {
        return profissionais.map((prof) => {
            const comissoesProf = comissoes.filter((c) => c.profissional_id === prof.id);
            const pendentes = comissoesProf.filter((c) => c.status === "pendente");
            const pagas = comissoesProf.filter((c) => c.status === "pago");

            return {
                profissional: prof,
                total_servicos: comissoesProf.reduce((acc, c) => acc + c.valor_servico, 0),
                total_comissao: comissoesProf.reduce((acc, c) => acc + c.valor_comissao, 0),
                total_pendente: pendentes.reduce((acc, c) => acc + c.valor_comissao, 0),
                total_pago: pagas.reduce((acc, c) => acc + c.valor_comissao, 0),
                qtd_atendimentos: new Set(comissoesProf.map((c) => c.atendimento_id)).size,
            };
        }).filter((r) => r.total_comissao > 0 || selectedProfissional !== "todos");
    }, [profissionais, comissoes, selectedProfissional]);

    // Totais gerais
    const totais = useMemo(() => {
        return {
            totalComissoes: resumoPorProfissional.reduce((acc, r) => acc + r.total_comissao, 0),
            totalPendente: resumoPorProfissional.reduce((acc, r) => acc + r.total_pendente, 0),
            totalPago: resumoPorProfissional.reduce((acc, r) => acc + r.total_pago, 0),
            totalServicos: resumoPorProfissional.reduce((acc, r) => acc + r.total_servicos, 0),
        };
    }, [resumoPorProfissional]);

    // Filtrar por busca
    const filteredResumo = useMemo(() => {
        let result = resumoPorProfissional;
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter((r) => r.profissional.nome.toLowerCase().includes(query));
        }
        if (selectedProfissional !== "todos") {
            result = result.filter((r) => r.profissional.id === selectedProfissional);
        }
        return result;
    }, [resumoPorProfissional, searchQuery, selectedProfissional]);

    // Detalhes de comissão filtrados
    const comissoesFiltradas = useMemo(() => {
        let result = comissoes;
        if (selectedProfissional !== "todos") {
            result = result.filter((c) => c.profissional_id === selectedProfissional);
        }
        return result;
    }, [comissoes, selectedProfissional]);

    // Pagar comissões de um profissional
    const handlePagarComissoes = async () => {
        if (!profissionalPagar) return;

        try {
            const { error } = await supabase
                .from("comissoes_registro")
                .update({ status: "pago", data_pagamento: new Date().toISOString() })
                .eq("profissional_id", profissionalPagar.profissional.id)
                .eq("status", "pendente")
                .gte("created_at", dateRange.from.toISOString())
                .lte("created_at", dateRange.to.toISOString());

            if (error) throw error;

            toast({
                title: "✅ Comissões pagas!",
                description: `Comissões de ${profissionalPagar.profissional.nome} marcadas como pagas.`,
            });

            setShowPagarDialog(false);
            setProfissionalPagar(null);
            fetchData();
        } catch (error) {
            console.error("Erro ao pagar comissões:", error);
            toast({
                title: "Erro",
                description: "Não foi possível registrar o pagamento. Verifique se as tabelas foram criadas.",
                variant: "destructive",
            });
        }
    };

    // Exportar para Excel
    const exportToExcel = () => {
        const data = filteredResumo.map((r) => ({
            Profissional: r.profissional.nome,
            "Total Serviços": r.total_servicos,
            "Total Comissão": r.total_comissao,
            Pendente: r.total_pendente,
            Pago: r.total_pago,
            Atendimentos: r.qtd_atendimentos,
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Comissões");
        XLSX.writeFile(wb, `comissoes_${format(new Date(), "yyyy-MM-dd")}.xlsx`);

        toast({ title: "📥 Exportado!", description: "Planilha de comissões baixada." });
    };

    const periodoLabel = useMemo(() => {
        switch (periodo) {
            case "hoje": return "Hoje";
            case "semana": return "Esta Semana";
            case "mes": return format(new Date(), "MMMM yyyy", { locale: ptBR });
            case "mes_anterior": return format(subMonths(new Date(), 1), "MMMM yyyy", { locale: ptBR });
            default: return "Período";
        }
    }, [periodo]);

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Percent className="h-7 w-7 text-primary" />
                        Comissões
                    </h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        Gerencie as comissões dos profissionais • {periodoLabel}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={exportToExcel}>
                        <FileDown className="h-4 w-4 mr-1" />
                        Excel
                    </Button>
                </div>
            </div>

            {/* Cards de Resumo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="ios-card">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="h-12 w-12 rounded-2xl bg-blue-500/10 flex items-center justify-center">
                                <DollarSign className="h-6 w-6 text-blue-500" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Total Serviços</p>
                                <p className="text-xl font-bold">{formatCurrency(totais.totalServicos)}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="ios-card">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="h-12 w-12 rounded-2xl bg-green-500/10 flex items-center justify-center">
                                <TrendingUp className="h-6 w-6 text-green-500" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Total Comissões</p>
                                <p className="text-xl font-bold text-green-600">{formatCurrency(totais.totalComissoes)}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="ios-card">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="h-12 w-12 rounded-2xl bg-amber-500/10 flex items-center justify-center">
                                <Clock className="h-6 w-6 text-amber-500" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Pendente</p>
                                <p className="text-xl font-bold text-amber-600">{formatCurrency(totais.totalPendente)}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="ios-card">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                                <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Pago</p>
                                <p className="text-xl font-bold text-emerald-600">{formatCurrency(totais.totalPago)}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filtros */}
            <Card className="ios-card">
                <CardContent className="pt-6">
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar profissional..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                        <Select value={periodo} onValueChange={(v) => setPeriodo(v as PeriodoFiltro)}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Período" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="hoje">Hoje</SelectItem>
                                <SelectItem value="semana">Esta Semana</SelectItem>
                                <SelectItem value="mes">Este Mês</SelectItem>
                                <SelectItem value="mes_anterior">Mês Anterior</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={selectedProfissional} onValueChange={setSelectedProfissional}>
                            <SelectTrigger className="w-[200px]">
                                <SelectValue placeholder="Profissional" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="todos">Todos</SelectItem>
                                {profissionais.map((p) => (
                                    <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Tabs: Resumo / Detalhes */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
                    <TabsTrigger value="resumo">📊 Resumo</TabsTrigger>
                    <TabsTrigger value="detalhes">📋 Detalhes</TabsTrigger>
                </TabsList>

                {/* Tab Resumo - Cards por Profissional */}
                <TabsContent value="resumo" className="mt-4">
                    {loading ? (
                        <div className="text-center py-12 text-muted-foreground">Carregando...</div>
                    ) : filteredResumo.length === 0 ? (
                        <Card className="ios-card">
                            <CardContent className="py-12 text-center">
                                <Percent className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                                <p className="text-muted-foreground">Nenhuma comissão encontrada no período</p>
                                <p className="text-sm text-muted-foreground/60 mt-1">
                                    As comissões serão geradas automaticamente ao fechar comandas
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredResumo.map((resumo) => (
                                <Card key={resumo.profissional.id} className="ios-card hover:shadow-lg transition-shadow">
                                    <CardContent className="pt-6">
                                        {/* Header do card */}
                                        <div className="flex items-center gap-3 mb-4">
                                            <Avatar className="h-12 w-12 border-2" style={{ borderColor: resumo.profissional.cor_agenda }}>
                                                <AvatarImage src={resumo.profissional.foto_url || undefined} />
                                                <AvatarFallback style={{ backgroundColor: resumo.profissional.cor_agenda + "20", color: resumo.profissional.cor_agenda }}>
                                                    {getInitials(resumo.profissional.nome)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1">
                                                <h3 className="font-semibold">{resumo.profissional.nome}</h3>
                                                <p className="text-sm text-muted-foreground">{resumo.qtd_atendimentos} atendimentos</p>
                                            </div>
                                        </div>

                                        {/* Valores */}
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-muted-foreground">Total Serviços</span>
                                                <span className="font-medium">{formatCurrency(resumo.total_servicos)}</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-muted-foreground">Comissão</span>
                                                <span className="font-bold text-green-600">{formatCurrency(resumo.total_comissao)}</span>
                                            </div>
                                            <div className="h-px bg-border my-2" />
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm">
                                                    <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">
                                                        Pendente
                                                    </Badge>
                                                </span>
                                                <span className="text-amber-600 font-medium">{formatCurrency(resumo.total_pendente)}</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm">
                                                    <Badge variant="outline" className="text-emerald-600 border-emerald-300 bg-emerald-50">
                                                        Pago
                                                    </Badge>
                                                </span>
                                                <span className="text-emerald-600 font-medium">{formatCurrency(resumo.total_pago)}</span>
                                            </div>
                                        </div>

                                        {/* Botão pagar */}
                                        {resumo.total_pendente > 0 && (
                                            <Button
                                                className="w-full mt-4"
                                                size="sm"
                                                onClick={() => {
                                                    setProfissionalPagar(resumo);
                                                    setShowPagarDialog(true);
                                                }}
                                            >
                                                <Banknote className="h-4 w-4 mr-1" />
                                                Pagar {formatCurrency(resumo.total_pendente)}
                                            </Button>
                                        )}
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </TabsContent>

                {/* Tab Detalhes - Tabela */}
                <TabsContent value="detalhes" className="mt-4">
                    <Card className="ios-card">
                        <CardContent className="pt-6">
                            {comissoesFiltradas.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    Nenhuma comissão detalhada encontrada
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Data</TableHead>
                                                <TableHead>Profissional</TableHead>
                                                <TableHead>Serviço</TableHead>
                                                <TableHead className="text-right">Valor Serviço</TableHead>
                                                <TableHead className="text-center">%</TableHead>
                                                <TableHead className="text-right">Comissão</TableHead>
                                                <TableHead className="text-center">Status</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {comissoesFiltradas.map((c) => {
                                                const prof = profissionais.find((p) => p.id === c.profissional_id);
                                                return (
                                                    <TableRow key={c.id}>
                                                        <TableCell className="text-sm">
                                                            {format(new Date(c.created_at), "dd/MM/yyyy HH:mm")}
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex items-center gap-2">
                                                                <Avatar className="h-7 w-7">
                                                                    <AvatarImage src={prof?.foto_url || undefined} />
                                                                    <AvatarFallback className="text-xs">
                                                                        {prof ? getInitials(prof.nome) : "?"}
                                                                    </AvatarFallback>
                                                                </Avatar>
                                                                <span className="text-sm font-medium">{prof?.nome || "—"}</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-sm">{c.servico_nome || "—"}</TableCell>
                                                        <TableCell className="text-right text-sm">{formatCurrency(c.valor_servico)}</TableCell>
                                                        <TableCell className="text-center text-sm font-medium">{c.percentual}%</TableCell>
                                                        <TableCell className="text-right text-sm font-bold text-green-600">
                                                            {formatCurrency(c.valor_comissao)}
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            {c.status === "pago" ? (
                                                                <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300">
                                                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                                                    Pago
                                                                </Badge>
                                                            ) : (
                                                                <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">
                                                                    <Clock className="h-3 w-3 mr-1" />
                                                                    Pendente
                                                                </Badge>
                                                            )}
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
                </TabsContent>
            </Tabs>

            {/* Dialog de Pagamento */}
            <Dialog open={showPagarDialog} onOpenChange={setShowPagarDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>💰 Confirmar Pagamento de Comissões</DialogTitle>
                    </DialogHeader>
                    {profissionalPagar && (
                        <div className="space-y-4 py-4">
                            <div className="flex items-center gap-3">
                                <Avatar className="h-14 w-14 border-2" style={{ borderColor: profissionalPagar.profissional.cor_agenda }}>
                                    <AvatarImage src={profissionalPagar.profissional.foto_url || undefined} />
                                    <AvatarFallback>{getInitials(profissionalPagar.profissional.nome)}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <h3 className="text-lg font-semibold">{profissionalPagar.profissional.nome}</h3>
                                    <p className="text-sm text-muted-foreground">
                                        {profissionalPagar.qtd_atendimentos} atendimentos no período
                                    </p>
                                </div>
                            </div>

                            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                                <div className="flex justify-between">
                                    <span>Total Serviços:</span>
                                    <span className="font-medium">{formatCurrency(profissionalPagar.total_servicos)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Já Pago:</span>
                                    <span className="text-emerald-600">{formatCurrency(profissionalPagar.total_pago)}</span>
                                </div>
                                <div className="h-px bg-border" />
                                <div className="flex justify-between text-lg">
                                    <span className="font-semibold">A Pagar:</span>
                                    <span className="font-bold text-green-600">{formatCurrency(profissionalPagar.total_pendente)}</span>
                                </div>
                            </div>

                            <p className="text-sm text-muted-foreground">
                                Ao confirmar, todas as comissões pendentes deste profissional no período selecionado serão marcadas como pagas.
                            </p>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowPagarDialog(false)}>
                            Cancelar
                        </Button>
                        <Button onClick={handlePagarComissoes} className="bg-green-600 hover:bg-green-700">
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Confirmar Pagamento
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
