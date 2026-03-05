import { useState, useEffect, useMemo, useCallback } from "react";
import {
    ThumbsUp,
    ThumbsDown,
    Meh,
    TrendingUp,
    Users,
    Calendar,
    Star,
    BarChart3,
    Send,
    Search,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface NpsResposta {
    id: string;
    cliente_id: string | null;
    cliente_nome: string | null;
    nota: number;
    comentario: string | null;
    atendimento_id: string | null;
    created_at: string;
}

export default function NpsPesquisa() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [respostas, setRespostas] = useState<NpsResposta[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [showEnviarDialog, setShowEnviarDialog] = useState(false);

    const fetchRespostas = useCallback(async () => {
        setLoading(true);
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
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchRespostas();
    }, [fetchRespostas]);

    // Cálculos NPS
    const npsData = useMemo(() => {
        if (respostas.length === 0) return { score: 0, promotores: 0, neutros: 0, detratores: 0, total: 0 };

        const promotores = respostas.filter((r) => r.nota >= 9).length;
        const neutros = respostas.filter((r) => r.nota >= 7 && r.nota <= 8).length;
        const detratores = respostas.filter((r) => r.nota <= 6).length;
        const total = respostas.length;
        const score = Math.round(((promotores - detratores) / total) * 100);

        return { score, promotores, neutros, detratores, total };
    }, [respostas]);

    // Score color
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

    // Filtro
    const filteredRespostas = useMemo(() => {
        if (!searchQuery) return respostas;
        const q = searchQuery.toLowerCase();
        return respostas.filter(
            (r) =>
                (r.cliente_nome && r.cliente_nome.toLowerCase().includes(q)) ||
                (r.comentario && r.comentario.toLowerCase().includes(q))
        );
    }, [respostas, searchQuery]);

    // Distribuição de notas
    const distribuicao = useMemo(() => {
        const dist: { [key: number]: number } = {};
        for (let i = 0; i <= 10; i++) dist[i] = 0;
        respostas.forEach((r) => dist[r.nota]++);
        return dist;
    }, [respostas]);

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Star className="h-7 w-7 text-primary" />
                        NPS — Pesquisa de Satisfação
                    </h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        Acompanhe o Net Promoter Score do seu salão
                    </p>
                </div>
            </div>

            {/* Score Principal */}
            <Card className="ios-card bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
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

            {/* Cards Resumo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="ios-card">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="h-12 w-12 rounded-2xl bg-blue-500/10 flex items-center justify-center">
                                <Users className="h-6 w-6 text-blue-500" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Total Respostas</p>
                                <p className="text-xl font-bold">{npsData.total}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="ios-card">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="h-12 w-12 rounded-2xl bg-green-500/10 flex items-center justify-center">
                                <ThumbsUp className="h-6 w-6 text-green-500" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Promotores</p>
                                <p className="text-xl font-bold text-green-600">
                                    {npsData.total > 0 ? Math.round((npsData.promotores / npsData.total) * 100) : 0}%
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="ios-card">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="h-12 w-12 rounded-2xl bg-amber-500/10 flex items-center justify-center">
                                <Meh className="h-6 w-6 text-amber-500" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Neutros</p>
                                <p className="text-xl font-bold text-amber-600">
                                    {npsData.total > 0 ? Math.round((npsData.neutros / npsData.total) * 100) : 0}%
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="ios-card">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="h-12 w-12 rounded-2xl bg-red-500/10 flex items-center justify-center">
                                <ThumbsDown className="h-6 w-6 text-red-500" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Detratores</p>
                                <p className="text-xl font-bold text-red-600">
                                    {npsData.total > 0 ? Math.round((npsData.detratores / npsData.total) * 100) : 0}%
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Distribuição visual de notas */}
            <Card className="ios-card">
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

            {/* Busca */}
            <Card className="ios-card">
                <CardContent className="pt-6">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por cliente ou comentário..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Lista de Respostas */}
            {filteredRespostas.length === 0 ? (
                <Card className="ios-card">
                    <CardContent className="py-12 text-center">
                        <Star className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                        <p className="text-muted-foreground">Nenhuma resposta NPS registrada</p>
                        <p className="text-xs text-muted-foreground mt-1">
                            As respostas aparecerão aqui quando clientes responderem a pesquisa
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <Card className="ios-card">
                    <CardContent className="pt-6">
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
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
