import { useState, useEffect, useMemo, useCallback } from "react";
import {
    Package,
    Plus,
    Search,
    Users,
    Calendar,
    CheckCircle2,
    XCircle,
    Clock,
    Scissors,
    DollarSign,
    BarChart3,
    RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

// Tipos
interface Plano {
    id: string;
    nome: string;
    descricao: string | null;
    servicos: string[];
    sessoes_total: number;
    preco: number;
    validade_dias: number;
    ativo: boolean;
    created_at: string;
}

interface PlanoCliente {
    id: string;
    plano_id: string;
    cliente_id: string;
    sessoes_usadas: number;
    status: "ativo" | "finalizado" | "expirado" | "cancelado";
    data_inicio: string;
    data_fim: string | null;
    created_at: string;
    plano?: Plano;
    cliente_nome?: string;
}

const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

export default function PlanosPacotes() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [planos, setPlanos] = useState<Plano[]>([]);
    const [planosClientes, setPlanosClientes] = useState<PlanoCliente[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [activeTab, setActiveTab] = useState("planos");
    const [showCriarPlano, setShowCriarPlano] = useState(false);

    // Form Plano
    const [novoNome, setNovoNome] = useState("");
    const [novaDescricao, setNovaDescricao] = useState("");
    const [novoSessoes, setNovoSessoes] = useState("");
    const [novoPreco, setNovoPreco] = useState("");
    const [novoValidade, setNovoValidade] = useState("90");

    const fetchPlanos = useCallback(async () => {
        setLoading(true);
        try {
            const { data: planosData } = await supabase
                .from("planos")
                .select("*")
                .order("created_at", { ascending: false });

            if (planosData) setPlanos(planosData as Plano[]);

            const { data: pcData } = await supabase
                .from("planos_clientes")
                .select("*")
                .order("created_at", { ascending: false });

            if (pcData) setPlanosClientes(pcData as PlanoCliente[]);
        } catch {
            console.error("Tabelas ainda não existem");
            setPlanos([]);
            setPlanosClientes([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPlanos();
    }, [fetchPlanos]);

    // Totais
    const totais = useMemo(() => ({
        totalPlanos: planos.length,
        planosAtivos: planos.filter((p) => p.ativo).length,
        vendasAtivas: planosClientes.filter((pc) => pc.status === "ativo").length,
        receitaTotal: planosClientes.reduce((acc, pc) => {
            const plano = planos.find((p) => p.id === pc.plano_id);
            return acc + (plano?.preco || 0);
        }, 0),
    }), [planos, planosClientes]);

    // Filtro
    const filteredPlanos = useMemo(() => {
        if (!searchQuery) return planos;
        const q = searchQuery.toLowerCase();
        return planos.filter((p) =>
            p.nome.toLowerCase().includes(q) ||
            (p.descricao && p.descricao.toLowerCase().includes(q))
        );
    }, [planos, searchQuery]);

    // Criar plano
    const handleCriarPlano = async () => {
        if (!novoNome || !novoSessoes || !novoPreco) {
            toast({ title: "Preencha todos os campos obrigatórios", variant: "destructive" });
            return;
        }

        try {
            const { error } = await supabase.from("planos").insert([{
                nome: novoNome,
                descricao: novaDescricao || null,
                servicos: [],
                sessoes_total: parseInt(novoSessoes),
                preco: parseFloat(novoPreco),
                validade_dias: parseInt(novoValidade),
                ativo: true,
            }]);

            if (error) throw error;

            toast({ title: "📦 Plano criado!", description: novoNome });
            setShowCriarPlano(false);
            resetForm();
            fetchPlanos();
        } catch (error) {
            console.error("Erro ao criar plano:", error);
            toast({
                title: "Erro",
                description: "Verifique se a tabela planos existe no Supabase.",
                variant: "destructive",
            });
        }
    };

    const resetForm = () => {
        setNovoNome("");
        setNovaDescricao("");
        setNovoSessoes("");
        setNovoPreco("");
        setNovoValidade("90");
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Package className="h-7 w-7 text-primary" />
                        Planos & Pacotes
                    </h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        Gerencie pacotes de serviços com sessões pré-definidas
                    </p>
                </div>
                <Button onClick={() => setShowCriarPlano(true)}>
                    <Plus className="h-4 w-4 mr-1" />
                    Novo Plano
                </Button>
            </div>

            {/* Cards Resumo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="ios-card">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="h-12 w-12 rounded-2xl bg-blue-500/10 flex items-center justify-center">
                                <Package className="h-6 w-6 text-blue-500" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Total Planos</p>
                                <p className="text-xl font-bold">{totais.totalPlanos}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="ios-card">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="h-12 w-12 rounded-2xl bg-green-500/10 flex items-center justify-center">
                                <CheckCircle2 className="h-6 w-6 text-green-500" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Planos Ativos</p>
                                <p className="text-xl font-bold text-green-600">{totais.planosAtivos}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="ios-card">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="h-12 w-12 rounded-2xl bg-purple-500/10 flex items-center justify-center">
                                <Users className="h-6 w-6 text-purple-500" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Vendas Ativas</p>
                                <p className="text-xl font-bold text-purple-600">{totais.vendasAtivas}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="ios-card">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="h-12 w-12 rounded-2xl bg-amber-500/10 flex items-center justify-center">
                                <DollarSign className="h-6 w-6 text-amber-500" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Receita Total</p>
                                <p className="text-xl font-bold text-amber-600">{formatCurrency(totais.receitaTotal)}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Busca */}
            <Card className="ios-card">
                <CardContent className="pt-6">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar planos..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
                    <TabsTrigger value="planos">📦 Planos ({planos.length})</TabsTrigger>
                    <TabsTrigger value="vendas">👥 Vendas ({planosClientes.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="planos" className="mt-4">
                    {filteredPlanos.length === 0 ? (
                        <Card className="ios-card">
                            <CardContent className="py-12 text-center">
                                <Package className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                                <p className="text-muted-foreground">Nenhum plano cadastrado</p>
                                <Button className="mt-4" onClick={() => setShowCriarPlano(true)}>
                                    <Plus className="h-4 w-4 mr-1" />
                                    Criar Primeiro Plano
                                </Button>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredPlanos.map((plano) => (
                                <Card key={plano.id} className="ios-card hover:shadow-lg transition-all">
                                    <CardHeader className="pb-3">
                                        <div className="flex items-start justify-between">
                                            <CardTitle className="text-lg">{plano.nome}</CardTitle>
                                            <Badge variant={plano.ativo ? "default" : "secondary"}>
                                                {plano.ativo ? "Ativo" : "Inativo"}
                                            </Badge>
                                        </div>
                                        {plano.descricao && (
                                            <p className="text-sm text-muted-foreground">{plano.descricao}</p>
                                        )}
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="flex items-center gap-1.5 text-muted-foreground">
                                                <Scissors className="h-4 w-4" />
                                                Sessões
                                            </span>
                                            <span className="font-medium">{plano.sessoes_total}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="flex items-center gap-1.5 text-muted-foreground">
                                                <Calendar className="h-4 w-4" />
                                                Validade
                                            </span>
                                            <span className="font-medium">{plano.validade_dias} dias</span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm pt-2 border-t">
                                            <span className="flex items-center gap-1.5 text-muted-foreground">
                                                <DollarSign className="h-4 w-4" />
                                                Preço
                                            </span>
                                            <span className="font-bold text-lg text-primary">
                                                {formatCurrency(plano.preco)}
                                            </span>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="vendas" className="mt-4">
                    {planosClientes.length === 0 ? (
                        <Card className="ios-card">
                            <CardContent className="py-12 text-center">
                                <Users className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                                <p className="text-muted-foreground">Nenhuma venda de plano registrada</p>
                            </CardContent>
                        </Card>
                    ) : (
                        <Card className="ios-card">
                            <CardContent className="pt-6">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Cliente</TableHead>
                                            <TableHead>Plano</TableHead>
                                            <TableHead className="text-center">Progresso</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Início</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {planosClientes.map((pc) => {
                                            const plano = planos.find((p) => p.id === pc.plano_id);
                                            const progress = plano
                                                ? (pc.sessoes_usadas / plano.sessoes_total) * 100
                                                : 0;

                                            return (
                                                <TableRow key={pc.id}>
                                                    <TableCell className="font-medium">
                                                        {pc.cliente_nome || "—"}
                                                    </TableCell>
                                                    <TableCell>{plano?.nome || "—"}</TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            <Progress value={progress} className="h-2 flex-1" />
                                                            <span className="text-xs text-muted-foreground w-12 text-right">
                                                                {pc.sessoes_usadas}/{plano?.sessoes_total || 0}
                                                            </span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge
                                                            variant={
                                                                pc.status === "ativo" ? "default" :
                                                                    pc.status === "finalizado" ? "secondary" :
                                                                        "destructive"
                                                            }
                                                        >
                                                            {pc.status}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-sm">
                                                        {format(new Date(pc.data_inicio), "dd/MM/yyyy")}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>
            </Tabs>

            {/* Dialog Criar Plano */}
            <Dialog open={showCriarPlano} onOpenChange={setShowCriarPlano}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>📦 Novo Plano</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div>
                            <Label>Nome do Plano *</Label>
                            <Input
                                value={novoNome}
                                onChange={(e) => setNovoNome(e.target.value)}
                                placeholder="Ex: Pacote Hidratação 5 sessões"
                                className="mt-1"
                            />
                        </div>
                        <div>
                            <Label>Descrição</Label>
                            <Input
                                value={novaDescricao}
                                onChange={(e) => setNovaDescricao(e.target.value)}
                                placeholder="Descrição opcional..."
                                className="mt-1"
                            />
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <Label>Sessões *</Label>
                                <Input
                                    type="number"
                                    value={novoSessoes}
                                    onChange={(e) => setNovoSessoes(e.target.value)}
                                    placeholder="5"
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label>Preço (R$) *</Label>
                                <Input
                                    type="number"
                                    value={novoPreco}
                                    onChange={(e) => setNovoPreco(e.target.value)}
                                    placeholder="250.00"
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label>Validade (dias)</Label>
                                <Input
                                    type="number"
                                    value={novoValidade}
                                    onChange={(e) => setNovoValidade(e.target.value)}
                                    placeholder="90"
                                    className="mt-1"
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => { setShowCriarPlano(false); resetForm(); }}>
                            Cancelar
                        </Button>
                        <Button onClick={handleCriarPlano}>
                            <Plus className="h-4 w-4 mr-1" />
                            Criar Plano
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
