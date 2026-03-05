import { useState, useEffect, useMemo } from "react";
import {
    Package,
    ArrowUpCircle,
    ArrowDownCircle,
    RotateCw,
    Search,
    Plus,
    AlertTriangle,
    History,
    FileDown,
    ShoppingCart,
    Minus,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import * as XLSX from "xlsx";

interface Produto {
    id: string;
    nome: string;
    codigo_barras: string | null;
    preco_custo: number | null;
    preco_venda: number;
    estoque_atual: number;
    estoque_minimo: number;
    categoria: string | null;
    foto_url: string | null;
    ativo: boolean;
}

interface Movimentacao {
    id: string;
    produto_id: string;
    tipo: string;
    quantidade: number;
    quantidade_anterior: number;
    quantidade_posterior: number;
    motivo: string | null;
    referencia_id: string | null;
    referencia_tipo: string | null;
    usuario_nome: string | null;
    created_at: string;
    produto_nome?: string;
}

type TipoMovimentacao = "entrada" | "saida" | "ajuste";

const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

export default function EstoqueMovimentacoes() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [produtos, setProdutos] = useState<Produto[]>([]);
    const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [filtroTipo, setFiltroTipo] = useState<string>("todos");
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [selectedProduto, setSelectedProduto] = useState<string>("");
    const [tipoMov, setTipoMov] = useState<TipoMovimentacao>("entrada");
    const [quantidade, setQuantidade] = useState<number>(1);
    const [motivo, setMotivo] = useState("");

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Buscar produtos
            const { data: prods } = await supabase
                .from("produtos")
                .select("*")
                .eq("ativo", true)
                .order("nome");
            if (prods) setProdutos(prods as Produto[]);

            // Buscar movimentações recentes
            const { data: movs } = await supabase
                .from("estoque_movimentacoes")
                .select("*")
                .order("created_at", { ascending: false })
                .limit(200);
            if (movs) setMovimentacoes(movs as Movimentacao[]);
        } catch (error) {
            console.error("Erro ao buscar estoque:", error);
            setMovimentacoes([]);
        } finally {
            setLoading(false);
        }
    };

    // Produtos com estoque baixo
    const produtosEstoqueBaixo = useMemo(() => {
        return produtos.filter((p) => p.estoque_atual <= p.estoque_minimo);
    }, [produtos]);

    // Filtrar movimentações
    const movimentacoesFiltradas = useMemo(() => {
        let result = movimentacoes;
        if (filtroTipo !== "todos") {
            result = result.filter((m) => m.tipo === filtroTipo);
        }
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter((m) => {
                const prod = produtos.find((p) => p.id === m.produto_id);
                return prod?.nome.toLowerCase().includes(query) || m.motivo?.toLowerCase().includes(query);
            });
        }
        return result;
    }, [movimentacoes, filtroTipo, searchQuery, produtos]);

    // Registrar movimentação
    const handleRegistrarMovimentacao = async () => {
        if (!selectedProduto || quantidade <= 0) {
            toast({ title: "Erro", description: "Selecione um produto e quantidade.", variant: "destructive" });
            return;
        }

        const produto = produtos.find((p) => p.id === selectedProduto);
        if (!produto) return;

        const qtdAnterior = produto.estoque_atual;
        let qtdPosterior = qtdAnterior;

        if (tipoMov === "entrada") {
            qtdPosterior = qtdAnterior + quantidade;
        } else if (tipoMov === "saida") {
            qtdPosterior = Math.max(0, qtdAnterior - quantidade);
        } else {
            qtdPosterior = quantidade; // ajuste direto
        }

        try {
            // Registrar movimentação
            const { error: movError } = await supabase.from("estoque_movimentacoes").insert({
                produto_id: selectedProduto,
                tipo: tipoMov,
                quantidade: tipoMov === "ajuste" ? Math.abs(quantidade - qtdAnterior) : quantidade,
                quantidade_anterior: qtdAnterior,
                quantidade_posterior: qtdPosterior,
                motivo: motivo || `${tipoMov === "entrada" ? "Entrada" : tipoMov === "saida" ? "Saída" : "Ajuste"} manual`,
                usuario_nome: "Admin",
            });

            if (movError) throw movError;

            // Atualizar estoque do produto
            const { error: prodError } = await supabase
                .from("produtos")
                .update({ estoque_atual: qtdPosterior, updated_at: new Date().toISOString() })
                .eq("id", selectedProduto);

            if (prodError) throw prodError;

            toast({
                title: "✅ Movimentação registrada!",
                description: `${produto.nome}: ${qtdAnterior} → ${qtdPosterior} unidades`,
            });

            setShowAddDialog(false);
            setSelectedProduto("");
            setQuantidade(1);
            setMotivo("");
            fetchData();
        } catch (error) {
            console.error("Erro:", error);
            toast({
                title: "Erro",
                description: "Não foi possível registrar. Verifique se as tabelas foram criadas.",
                variant: "destructive",
            });
        }
    };

    // Exportar
    const exportToExcel = () => {
        const data = movimentacoesFiltradas.map((m) => {
            const prod = produtos.find((p) => p.id === m.produto_id);
            return {
                Data: format(new Date(m.created_at), "dd/MM/yyyy HH:mm"),
                Produto: prod?.nome || "—",
                Tipo: m.tipo,
                Quantidade: m.quantidade,
                "Estoque Anterior": m.quantidade_anterior,
                "Estoque Posterior": m.quantidade_posterior,
                Motivo: m.motivo || "",
            };
        });
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Estoque");
        XLSX.writeFile(wb, `estoque_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
        toast({ title: "📥 Exportado!", description: "Planilha de estoque baixada." });
    };

    const getTipoBadge = (tipo: string) => {
        switch (tipo) {
            case "entrada":
                return <Badge className="bg-green-100 text-green-700 border-green-300"><ArrowUpCircle className="h-3 w-3 mr-1" />Entrada</Badge>;
            case "saida":
                return <Badge className="bg-red-100 text-red-700 border-red-300"><ArrowDownCircle className="h-3 w-3 mr-1" />Saída</Badge>;
            case "ajuste":
                return <Badge className="bg-blue-100 text-blue-700 border-blue-300"><RotateCw className="h-3 w-3 mr-1" />Ajuste</Badge>;
            case "venda":
                return <Badge className="bg-purple-100 text-purple-700 border-purple-300"><ShoppingCart className="h-3 w-3 mr-1" />Venda</Badge>;
            default:
                return <Badge variant="outline">{tipo}</Badge>;
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Package className="h-7 w-7 text-primary" />
                        Controle de Estoque
                    </h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        Movimentações de entrada, saída e ajuste
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={exportToExcel}>
                        <FileDown className="h-4 w-4 mr-1" />
                        Excel
                    </Button>
                    <Button size="sm" onClick={() => setShowAddDialog(true)}>
                        <Plus className="h-4 w-4 mr-1" />
                        Nova Movimentação
                    </Button>
                </div>
            </div>

            {/* Cards de Resumo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="ios-card">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="h-12 w-12 rounded-2xl bg-blue-500/10 flex items-center justify-center">
                                <Package className="h-6 w-6 text-blue-500" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Total Produtos</p>
                                <p className="text-xl font-bold">{produtos.length}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className={`ios-card ${produtosEstoqueBaixo.length > 0 ? "border-red-300 bg-red-50/30" : ""}`}>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className={`h-12 w-12 rounded-2xl flex items-center justify-center ${produtosEstoqueBaixo.length > 0 ? "bg-red-500/10" : "bg-gray-500/10"}`}>
                                <AlertTriangle className={`h-6 w-6 ${produtosEstoqueBaixo.length > 0 ? "text-red-500" : "text-gray-400"}`} />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Estoque Baixo</p>
                                <p className={`text-xl font-bold ${produtosEstoqueBaixo.length > 0 ? "text-red-600" : ""}`}>
                                    {produtosEstoqueBaixo.length}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="ios-card">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="h-12 w-12 rounded-2xl bg-green-500/10 flex items-center justify-center">
                                <ArrowUpCircle className="h-6 w-6 text-green-500" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Entradas (mês)</p>
                                <p className="text-xl font-bold text-green-600">
                                    {movimentacoes.filter((m) => m.tipo === "entrada").length}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="ios-card">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="h-12 w-12 rounded-2xl bg-red-500/10 flex items-center justify-center">
                                <ArrowDownCircle className="h-6 w-6 text-red-500" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Saídas (mês)</p>
                                <p className="text-xl font-bold text-red-600">
                                    {movimentacoes.filter((m) => m.tipo === "saida" || m.tipo === "venda").length}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Alerta de estoque baixo */}
            {produtosEstoqueBaixo.length > 0 && (
                <Card className="ios-card border-amber-300 bg-amber-50/50">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2 text-amber-700">
                            <AlertTriangle className="h-5 w-5" />
                            Produtos com Estoque Baixo ({produtosEstoqueBaixo.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-2">
                            {produtosEstoqueBaixo.slice(0, 10).map((p) => (
                                <Badge key={p.id} variant="outline" className="text-amber-700 border-amber-400 bg-amber-100 px-3 py-1">
                                    {p.nome}: <strong className="ml-1">{p.estoque_atual}</strong>/{p.estoque_minimo}
                                </Badge>
                            ))}
                            {produtosEstoqueBaixo.length > 10 && (
                                <Badge variant="outline" className="text-amber-700">+{produtosEstoqueBaixo.length - 10} mais</Badge>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Filtros */}
            <Card className="ios-card">
                <CardContent className="pt-6">
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar produto ou motivo..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                        <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Tipo" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="todos">Todos</SelectItem>
                                <SelectItem value="entrada">Entradas</SelectItem>
                                <SelectItem value="saida">Saídas</SelectItem>
                                <SelectItem value="ajuste">Ajustes</SelectItem>
                                <SelectItem value="venda">Vendas</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Tabela de Movimentações */}
            <Card className="ios-card">
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        <History className="h-5 w-5" />
                        Histórico de Movimentações
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="text-center py-8 text-muted-foreground">Carregando...</div>
                    ) : movimentacoesFiltradas.length === 0 ? (
                        <div className="text-center py-8">
                            <Package className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                            <p className="text-muted-foreground">Nenhuma movimentação encontrada</p>
                            <p className="text-sm text-muted-foreground/60 mt-1">
                                Clique em "Nova Movimentação" para registrar entradas e saídas
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Data</TableHead>
                                        <TableHead>Produto</TableHead>
                                        <TableHead className="text-center">Tipo</TableHead>
                                        <TableHead className="text-center">Qtd</TableHead>
                                        <TableHead className="text-center">Antes</TableHead>
                                        <TableHead className="text-center">Depois</TableHead>
                                        <TableHead>Motivo</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {movimentacoesFiltradas.map((m) => {
                                        const prod = produtos.find((p) => p.id === m.produto_id);
                                        return (
                                            <TableRow key={m.id}>
                                                <TableCell className="text-sm whitespace-nowrap">
                                                    {format(new Date(m.created_at), "dd/MM/yyyy HH:mm")}
                                                </TableCell>
                                                <TableCell className="font-medium">{prod?.nome || "—"}</TableCell>
                                                <TableCell className="text-center">{getTipoBadge(m.tipo)}</TableCell>
                                                <TableCell className="text-center font-bold">
                                                    {m.tipo === "entrada" ? "+" : m.tipo === "saida" || m.tipo === "venda" ? "-" : ""}
                                                    {m.quantidade}
                                                </TableCell>
                                                <TableCell className="text-center text-muted-foreground">{m.quantidade_anterior}</TableCell>
                                                <TableCell className="text-center font-medium">{m.quantidade_posterior}</TableCell>
                                                <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                                                    {m.motivo || "—"}
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

            {/* Dialog Nova Movimentação */}
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>📦 Nova Movimentação de Estoque</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div>
                            <Label>Produto</Label>
                            <Select value={selectedProduto} onValueChange={setSelectedProduto}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione o produto..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {produtos.map((p) => (
                                        <SelectItem key={p.id} value={p.id}>
                                            {p.nome} (estoque: {p.estoque_atual})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label>Tipo de Movimentação</Label>
                            <Select value={tipoMov} onValueChange={(v) => setTipoMov(v as TipoMovimentacao)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="entrada">
                                        <span className="flex items-center gap-2"><ArrowUpCircle className="h-4 w-4 text-green-500" /> Entrada</span>
                                    </SelectItem>
                                    <SelectItem value="saida">
                                        <span className="flex items-center gap-2"><ArrowDownCircle className="h-4 w-4 text-red-500" /> Saída</span>
                                    </SelectItem>
                                    <SelectItem value="ajuste">
                                        <span className="flex items-center gap-2"><RotateCw className="h-4 w-4 text-blue-500" /> Ajuste (definir quantidade)</span>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label>{tipoMov === "ajuste" ? "Nova Quantidade" : "Quantidade"}</Label>
                            <Input
                                type="number"
                                min={0}
                                value={quantidade}
                                onChange={(e) => setQuantidade(parseInt(e.target.value) || 0)}
                            />
                            {selectedProduto && (
                                <p className="text-xs text-muted-foreground mt-1">
                                    Estoque atual: {produtos.find((p) => p.id === selectedProduto)?.estoque_atual || 0} un.
                                    {tipoMov !== "ajuste" && ` → Novo: ${tipoMov === "entrada"
                                        ? (produtos.find((p) => p.id === selectedProduto)?.estoque_atual || 0) + quantidade
                                        : Math.max(0, (produtos.find((p) => p.id === selectedProduto)?.estoque_atual || 0) - quantidade)
                                        } un.`}
                                </p>
                            )}
                        </div>

                        <div>
                            <Label>Motivo (opcional)</Label>
                            <Textarea
                                placeholder="Ex: Compra fornecedor, Devolução, Contagem..."
                                value={motivo}
                                onChange={(e) => setMotivo(e.target.value)}
                                rows={2}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancelar</Button>
                        <Button onClick={handleRegistrarMovimentacao}>
                            <Plus className="h-4 w-4 mr-1" />
                            Registrar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
