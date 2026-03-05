import { useState, useEffect, useMemo, useCallback } from "react";
import {
    Ticket,
    Plus,
    Search,
    Copy,
    Trash2,
    Calendar,
    DollarSign,
    Percent,
    Users,
    Clock,
    CheckCircle2,
    XCircle,
    Gift,
    FileDown,
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
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// Tipos
interface Voucher {
    id: string;
    codigo: string;
    tipo_desconto: "percentual" | "valor_fixo";
    valor: number;
    validade: string | null;
    usos_max: number | null;
    usos_atuais: number;
    ativo: boolean;
    descricao: string | null;
    created_at: string;
    servicos_aplicaveis: string[] | null;
}

const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const gerarCodigo = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let codigo = "";
    for (let i = 0; i < 8; i++) {
        codigo += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return codigo;
};

export default function VouchersCupons() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [vouchers, setVouchers] = useState<Voucher[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [filtroStatus, setFiltroStatus] = useState<"todos" | "ativos" | "inativos" | "expirados">("todos");
    const [showCriarDialog, setShowCriarDialog] = useState(false);
    const [activeTab, setActiveTab] = useState("ativos");

    // Form state
    const [novoCodigo, setNovoCodigo] = useState(gerarCodigo());
    const [novoTipo, setNovoTipo] = useState<"percentual" | "valor_fixo">("percentual");
    const [novoValor, setNovoValor] = useState("");
    const [novaValidade, setNovaValidade] = useState("");
    const [novoUsosMax, setNovoUsosMax] = useState("");
    const [novaDescricao, setNovaDescricao] = useState("");

    const fetchVouchers = useCallback(async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("vouchers")
                .select("*")
                .order("created_at", { ascending: false });

            if (data) setVouchers(data as Voucher[]);
            if (error) {
                console.error("Erro ao buscar vouchers:", error);
                setVouchers([]);
            }
        } catch {
            setVouchers([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchVouchers();
    }, [fetchVouchers]);

    // Filtros
    const vouchersAtivos = useMemo(() => {
        return vouchers.filter((v) => {
            const expirado = v.validade && new Date(v.validade) < new Date();
            const esgotado = v.usos_max && v.usos_atuais >= v.usos_max;
            return v.ativo && !expirado && !esgotado;
        });
    }, [vouchers]);

    const vouchersInativos = useMemo(() => {
        return vouchers.filter((v) => {
            const expirado = v.validade && new Date(v.validade) < new Date();
            const esgotado = v.usos_max && v.usos_atuais >= v.usos_max;
            return !v.ativo || expirado || esgotado;
        });
    }, [vouchers]);

    const filteredVouchers = useMemo(() => {
        const list = activeTab === "ativos" ? vouchersAtivos : vouchersInativos;
        if (!searchQuery) return list;
        const q = searchQuery.toLowerCase();
        return list.filter(
            (v) =>
                v.codigo.toLowerCase().includes(q) ||
                (v.descricao && v.descricao.toLowerCase().includes(q))
        );
    }, [activeTab, vouchersAtivos, vouchersInativos, searchQuery]);

    // Totais
    const totais = useMemo(() => ({
        total: vouchers.length,
        ativos: vouchersAtivos.length,
        inativos: vouchersInativos.length,
        totalUsos: vouchers.reduce((acc, v) => acc + v.usos_atuais, 0),
    }), [vouchers, vouchersAtivos, vouchersInativos]);

    // Criar voucher
    const handleCriarVoucher = async () => {
        if (!novoCodigo || !novoValor) {
            toast({ title: "Preencha código e valor", variant: "destructive" });
            return;
        }

        try {
            const { error } = await supabase.from("vouchers").insert([{
                codigo: novoCodigo.toUpperCase(),
                tipo_desconto: novoTipo,
                valor: parseFloat(novoValor),
                validade: novaValidade || null,
                usos_max: novoUsosMax ? parseInt(novoUsosMax) : null,
                descricao: novaDescricao || null,
                ativo: true,
                usos_atuais: 0,
            }]);

            if (error) throw error;

            toast({
                title: "🎫 Voucher criado!",
                description: `Código: ${novoCodigo.toUpperCase()}`,
            });

            setShowCriarDialog(false);
            resetForm();
            fetchVouchers();
        } catch (error) {
            console.error("Erro ao criar voucher:", error);
            toast({
                title: "Erro",
                description: "Não foi possível criar o voucher. Verifique se a tabela existe.",
                variant: "destructive",
            });
        }
    };

    // Desativar voucher
    const handleDesativar = async (id: string) => {
        try {
            const { error } = await supabase
                .from("vouchers")
                .update({ ativo: false })
                .eq("id", id);

            if (error) throw error;
            toast({ title: "Voucher desativado" });
            fetchVouchers();
        } catch {
            toast({ title: "Erro ao desativar", variant: "destructive" });
        }
    };

    // Copiar código
    const copiarCodigo = (codigo: string) => {
        navigator.clipboard.writeText(codigo);
        toast({ title: "📋 Código copiado!", description: codigo });
    };

    const resetForm = () => {
        setNovoCodigo(gerarCodigo());
        setNovoTipo("percentual");
        setNovoValor("");
        setNovaValidade("");
        setNovoUsosMax("");
        setNovaDescricao("");
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Ticket className="h-7 w-7 text-primary" />
                        Vouchers & Cupons
                    </h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        Gerencie cupons de desconto para campanhas e promoções
                    </p>
                </div>
                <Button onClick={() => setShowCriarDialog(true)}>
                    <Plus className="h-4 w-4 mr-1" />
                    Novo Voucher
                </Button>
            </div>

            {/* Cards Resumo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="ios-card">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="h-12 w-12 rounded-2xl bg-blue-500/10 flex items-center justify-center">
                                <Ticket className="h-6 w-6 text-blue-500" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Total Vouchers</p>
                                <p className="text-xl font-bold">{totais.total}</p>
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
                                <p className="text-sm text-muted-foreground">Ativos</p>
                                <p className="text-xl font-bold text-green-600">{totais.ativos}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="ios-card">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="h-12 w-12 rounded-2xl bg-red-500/10 flex items-center justify-center">
                                <XCircle className="h-6 w-6 text-red-500" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Inativos/Expirados</p>
                                <p className="text-xl font-bold text-red-600">{totais.inativos}</p>
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
                                <p className="text-sm text-muted-foreground">Total de Usos</p>
                                <p className="text-xl font-bold text-purple-600">{totais.totalUsos}</p>
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
                            placeholder="Buscar por código ou descrição..."
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
                    <TabsTrigger value="ativos">✅ Ativos ({totais.ativos})</TabsTrigger>
                    <TabsTrigger value="inativos">❌ Inativos ({totais.inativos})</TabsTrigger>
                </TabsList>

                <TabsContent value="ativos" className="mt-4">
                    <VoucherTable vouchers={filteredVouchers} onCopiar={copiarCodigo} onDesativar={handleDesativar} showDesativar />
                </TabsContent>

                <TabsContent value="inativos" className="mt-4">
                    <VoucherTable vouchers={filteredVouchers} onCopiar={copiarCodigo} onDesativar={handleDesativar} showDesativar={false} />
                </TabsContent>
            </Tabs>

            {/* Dialog Criar */}
            <Dialog open={showCriarDialog} onOpenChange={setShowCriarDialog}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>🎫 Novo Voucher</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div>
                            <Label>Código</Label>
                            <div className="flex gap-2 mt-1">
                                <Input
                                    value={novoCodigo}
                                    onChange={(e) => setNovoCodigo(e.target.value.toUpperCase())}
                                    placeholder="DESCONTO20"
                                    className="font-mono tracking-wider"
                                />
                                <Button variant="outline" size="icon" onClick={() => setNovoCodigo(gerarCodigo())}>
                                    <Gift className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label>Tipo</Label>
                                <Select value={novoTipo} onValueChange={(v) => setNovoTipo(v as "percentual" | "valor_fixo")}>
                                    <SelectTrigger className="mt-1">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="percentual">% Percentual</SelectItem>
                                        <SelectItem value="valor_fixo">R$ Valor Fixo</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>{novoTipo === "percentual" ? "% Desconto" : "R$ Desconto"}</Label>
                                <Input
                                    type="number"
                                    value={novoValor}
                                    onChange={(e) => setNovoValor(e.target.value)}
                                    placeholder={novoTipo === "percentual" ? "10" : "50.00"}
                                    className="mt-1"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label>Validade</Label>
                                <Input
                                    type="date"
                                    value={novaValidade}
                                    onChange={(e) => setNovaValidade(e.target.value)}
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label>Usos máximos</Label>
                                <Input
                                    type="number"
                                    value={novoUsosMax}
                                    onChange={(e) => setNovoUsosMax(e.target.value)}
                                    placeholder="Ilimitado"
                                    className="mt-1"
                                />
                            </div>
                        </div>

                        <div>
                            <Label>Descrição (opcional)</Label>
                            <Input
                                value={novaDescricao}
                                onChange={(e) => setNovaDescricao(e.target.value)}
                                placeholder="Promoção de verão..."
                                className="mt-1"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => { setShowCriarDialog(false); resetForm(); }}>
                            Cancelar
                        </Button>
                        <Button onClick={handleCriarVoucher}>
                            <Plus className="h-4 w-4 mr-1" />
                            Criar Voucher
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

// Component: Tabela de vouchers
function VoucherTable({
    vouchers,
    onCopiar,
    onDesativar,
    showDesativar,
}: {
    vouchers: Voucher[];
    onCopiar: (codigo: string) => void;
    onDesativar: (id: string) => void;
    showDesativar: boolean;
}) {
    if (vouchers.length === 0) {
        return (
            <Card className="ios-card">
                <CardContent className="py-12 text-center">
                    <Ticket className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-muted-foreground">Nenhum voucher encontrado</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="ios-card">
            <CardContent className="pt-6">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Código</TableHead>
                                <TableHead>Tipo</TableHead>
                                <TableHead className="text-right">Desconto</TableHead>
                                <TableHead className="text-center">Usos</TableHead>
                                <TableHead>Validade</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {vouchers.map((v) => {
                                const expirado = v.validade && new Date(v.validade) < new Date();
                                const esgotado = v.usos_max !== null && v.usos_atuais >= v.usos_max;

                                return (
                                    <TableRow key={v.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono font-bold tracking-wider text-primary">
                                                    {v.codigo}
                                                </span>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6"
                                                    onClick={() => onCopiar(v.codigo)}
                                                >
                                                    <Copy className="h-3 w-3" />
                                                </Button>
                                            </div>
                                            {v.descricao && (
                                                <p className="text-xs text-muted-foreground mt-0.5">{v.descricao}</p>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline">
                                                {v.tipo_desconto === "percentual" ? (
                                                    <><Percent className="h-3 w-3 mr-1" />Percentual</>
                                                ) : (
                                                    <><DollarSign className="h-3 w-3 mr-1" />Valor Fixo</>
                                                )}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right font-medium">
                                            {v.tipo_desconto === "percentual"
                                                ? `${v.valor}%`
                                                : formatCurrency(v.valor)}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <span className="text-sm">
                                                {v.usos_atuais}{v.usos_max ? `/${v.usos_max}` : ""}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-sm">
                                            {v.validade
                                                ? format(new Date(v.validade), "dd/MM/yyyy")
                                                : "Sem limite"}
                                        </TableCell>
                                        <TableCell>
                                            {!v.ativo ? (
                                                <Badge variant="secondary">Desativado</Badge>
                                            ) : expirado ? (
                                                <Badge className="bg-red-100 text-red-700 border-red-300">Expirado</Badge>
                                            ) : esgotado ? (
                                                <Badge className="bg-amber-100 text-amber-700 border-amber-300">Esgotado</Badge>
                                            ) : (
                                                <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300">Ativo</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {showDesativar && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7 text-red-500 hover:text-red-700"
                                                    onClick={() => onDesativar(v.id)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}
