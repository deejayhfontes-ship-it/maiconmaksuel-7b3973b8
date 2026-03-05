import { useState, useEffect, useMemo, useCallback } from "react";
import {
    ClipboardCheck,
    Plus,
    Search,
    Users,
    Calendar,
    Camera,
    ImageIcon,
    FileText,
    Star,
    ChevronRight,
    Eye,
    Trash2,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

// Tipos
interface FichaAvaliacao {
    id: string;
    cliente_id: string;
    cliente_nome?: string;
    profissional_id: string | null;
    tipo_avaliacao: string;
    observacoes: string | null;
    campos_personalizados: Record<string, string> | null;
    fotos_antes: string[];
    fotos_depois: string[];
    nota_satisfacao: number | null;
    data_avaliacao: string;
    created_at: string;
}

interface Cliente {
    id: string;
    nome: string;
}

export default function FichaAvaliacao() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [fichas, setFichas] = useState<FichaAvaliacao[]>([]);
    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [showCriarDialog, setShowCriarDialog] = useState(false);
    const [showDetalheDialog, setShowDetalheDialog] = useState(false);
    const [fichaDetalhe, setFichaDetalhe] = useState<FichaAvaliacao | null>(null);

    // Form state
    const [clienteId, setClienteId] = useState("");
    const [tipoAvaliacao, setTipoAvaliacao] = useState("geral");
    const [observacoes, setObservacoes] = useState("");
    const [notaSatisfacao, setNotaSatisfacao] = useState<number>(5);
    const [campoTipoPele, setCampoTipoPele] = useState("");
    const [campoAlergias, setCampoAlergias] = useState("");
    const [campoTratamentos, setCampoTratamentos] = useState("");
    const [campoObjetivos, setCampoObjetivos] = useState("");

    const fetchFichas = useCallback(async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("fichas_avaliacao")
                .select("*")
                .order("created_at", { ascending: false });

            if (data) setFichas(data as FichaAvaliacao[]);
            if (error) {
                console.error("Erro ao buscar fichas:", error);
                setFichas([]);
            }

            // Buscar clientes para o select
            const { data: clientesData } = await supabase
                .from("clientes")
                .select("id, nome")
                .order("nome");

            if (clientesData) setClientes(clientesData as Cliente[]);
        } catch {
            setFichas([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchFichas();
    }, [fetchFichas]);

    // Filtro
    const filteredFichas = useMemo(() => {
        if (!searchQuery) return fichas;
        const q = searchQuery.toLowerCase();
        return fichas.filter(
            (f) =>
                (f.cliente_nome && f.cliente_nome.toLowerCase().includes(q)) ||
                f.tipo_avaliacao.toLowerCase().includes(q) ||
                (f.observacoes && f.observacoes.toLowerCase().includes(q))
        );
    }, [fichas, searchQuery]);

    // Totais
    const totais = useMemo(() => ({
        total: fichas.length,
        esteMes: fichas.filter((f) => {
            const d = new Date(f.created_at);
            const now = new Date();
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        }).length,
        comFotos: fichas.filter((f) => (f.fotos_antes?.length > 0 || f.fotos_depois?.length > 0)).length,
        mediaSatisfacao: fichas.length > 0
            ? (fichas.reduce((acc, f) => acc + (f.nota_satisfacao || 0), 0) / fichas.filter(f => f.nota_satisfacao).length).toFixed(1)
            : "—",
    }), [fichas]);

    const tiposAvaliacao = [
        { value: "geral", label: "Avaliação Geral" },
        { value: "capilar", label: "Avaliação Capilar" },
        { value: "pele", label: "Avaliação de Pele" },
        { value: "corporal", label: "Avaliação Corporal" },
        { value: "unhas", label: "Avaliação de Unhas" },
        { value: "designer_sobrancelha", label: "Design de Sobrancelha" },
        { value: "colorimetria", label: "Colorimetria" },
    ];

    // Criar ficha
    const handleCriarFicha = async () => {
        if (!clienteId) {
            toast({ title: "Selecione um cliente", variant: "destructive" });
            return;
        }

        const cliente = clientes.find((c) => c.id === clienteId);
        const campos: Record<string, string> = {};
        if (campoTipoPele) campos.tipo_pele = campoTipoPele;
        if (campoAlergias) campos.alergias = campoAlergias;
        if (campoTratamentos) campos.tratamentos_anteriores = campoTratamentos;
        if (campoObjetivos) campos.objetivos = campoObjetivos;

        try {
            const { error } = await supabase.from("fichas_avaliacao").insert([{
                cliente_id: clienteId,
                cliente_nome: cliente?.nome || "",
                tipo_avaliacao: tipoAvaliacao,
                observacoes: observacoes || null,
                campos_personalizados: Object.keys(campos).length > 0 ? campos : null,
                nota_satisfacao: notaSatisfacao,
                fotos_antes: [],
                fotos_depois: [],
                data_avaliacao: new Date().toISOString(),
            }]);

            if (error) throw error;

            toast({
                title: "📋 Ficha criada!",
                description: `Avaliação para ${cliente?.nome}`,
            });

            setShowCriarDialog(false);
            resetForm();
            fetchFichas();
        } catch (error) {
            console.error("Erro ao criar ficha:", error);
            toast({
                title: "Erro",
                description: "Verifique se a tabela fichas_avaliacao existe no Supabase.",
                variant: "destructive",
            });
        }
    };

    const resetForm = () => {
        setClienteId("");
        setTipoAvaliacao("geral");
        setObservacoes("");
        setNotaSatisfacao(5);
        setCampoTipoPele("");
        setCampoAlergias("");
        setCampoTratamentos("");
        setCampoObjetivos("");
    };

    const abrirDetalhe = (ficha: FichaAvaliacao) => {
        setFichaDetalhe(ficha);
        setShowDetalheDialog(true);
    };

    // Renderizar estrelas de nota
    const renderStars = (nota: number | null, interactive = false, onChange?: (n: number) => void) => {
        const stars = [];
        for (let i = 1; i <= 5; i++) {
            stars.push(
                <Star
                    key={i}
                    className={`h-5 w-5 transition-colors ${i <= (nota || 0)
                            ? "text-amber-400 fill-amber-400"
                            : "text-gray-300"
                        } ${interactive ? "cursor-pointer hover:text-amber-300" : ""}`}
                    onClick={() => interactive && onChange && onChange(i)}
                />
            );
        }
        return <div className="flex gap-0.5">{stars}</div>;
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <ClipboardCheck className="h-7 w-7 text-primary" />
                        Ficha de Avaliação
                    </h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        Avaliações personalizadas com fotos antes/depois
                    </p>
                </div>
                <Button onClick={() => setShowCriarDialog(true)}>
                    <Plus className="h-4 w-4 mr-1" />
                    Nova Avaliação
                </Button>
            </div>

            {/* Cards Resumo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="ios-card">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="h-12 w-12 rounded-2xl bg-blue-500/10 flex items-center justify-center">
                                <FileText className="h-6 w-6 text-blue-500" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Total Fichas</p>
                                <p className="text-xl font-bold">{totais.total}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="ios-card">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="h-12 w-12 rounded-2xl bg-green-500/10 flex items-center justify-center">
                                <Calendar className="h-6 w-6 text-green-500" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Este Mês</p>
                                <p className="text-xl font-bold text-green-600">{totais.esteMes}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="ios-card">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="h-12 w-12 rounded-2xl bg-purple-500/10 flex items-center justify-center">
                                <Camera className="h-6 w-6 text-purple-500" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Com Fotos</p>
                                <p className="text-xl font-bold text-purple-600">{totais.comFotos}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="ios-card">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="h-12 w-12 rounded-2xl bg-amber-500/10 flex items-center justify-center">
                                <Star className="h-6 w-6 text-amber-500" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Satisfação Média</p>
                                <p className="text-xl font-bold text-amber-600">{totais.mediaSatisfacao}/5</p>
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
                            placeholder="Buscar por cliente ou tipo de avaliação..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Lista de fichas */}
            {filteredFichas.length === 0 ? (
                <Card className="ios-card">
                    <CardContent className="py-12 text-center">
                        <ClipboardCheck className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                        <p className="text-muted-foreground">Nenhuma ficha de avaliação encontrada</p>
                        <Button className="mt-4" onClick={() => setShowCriarDialog(true)}>
                            <Plus className="h-4 w-4 mr-1" />
                            Criar Primeira Avaliação
                        </Button>
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
                                        <TableHead>Tipo</TableHead>
                                        <TableHead className="text-center">Satisfação</TableHead>
                                        <TableHead className="text-center">Fotos</TableHead>
                                        <TableHead>Data</TableHead>
                                        <TableHead className="text-right">Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredFichas.map((ficha) => (
                                        <TableRow
                                            key={ficha.id}
                                            className="cursor-pointer hover:bg-muted/50"
                                            onClick={() => abrirDetalhe(ficha)}
                                        >
                                            <TableCell className="font-medium">
                                                {ficha.cliente_nome || "—"}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline">
                                                    {tiposAvaliacao.find((t) => t.value === ficha.tipo_avaliacao)?.label ||
                                                        ficha.tipo_avaliacao}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {renderStars(ficha.nota_satisfacao)}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {(ficha.fotos_antes?.length || 0) + (ficha.fotos_depois?.length || 0) > 0 ? (
                                                    <Badge className="bg-purple-100 text-purple-700">
                                                        <ImageIcon className="h-3 w-3 mr-1" />
                                                        {(ficha.fotos_antes?.length || 0) + (ficha.fotos_depois?.length || 0)}
                                                    </Badge>
                                                ) : (
                                                    <span className="text-muted-foreground text-xs">—</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-sm">
                                                {format(new Date(ficha.created_at), "dd/MM/yyyy")}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="icon" className="h-7 w-7">
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Dialog Criar Ficha */}
            <Dialog open={showCriarDialog} onOpenChange={setShowCriarDialog}>
                <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>📋 Nova Ficha de Avaliação</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div>
                            <Label>Cliente *</Label>
                            <Select value={clienteId} onValueChange={setClienteId}>
                                <SelectTrigger className="mt-1">
                                    <SelectValue placeholder="Selecione o cliente..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {clientes.map((c) => (
                                        <SelectItem key={c.id} value={c.id}>
                                            {c.nome}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label>Tipo de Avaliação</Label>
                                <Select value={tipoAvaliacao} onValueChange={setTipoAvaliacao}>
                                    <SelectTrigger className="mt-1">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {tiposAvaliacao.map((t) => (
                                            <SelectItem key={t.value} value={t.value}>
                                                {t.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>Satisfação</Label>
                                <div className="mt-2">
                                    {renderStars(notaSatisfacao, true, setNotaSatisfacao)}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3 border rounded-lg p-3">
                            <p className="text-sm font-medium text-muted-foreground">Campos Personalizados</p>
                            <div>
                                <Label className="text-xs">Tipo de Pele/Cabelo</Label>
                                <Input
                                    value={campoTipoPele}
                                    onChange={(e) => setCampoTipoPele(e.target.value)}
                                    placeholder="Ex: Oleosa, Seca, Mista..."
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label className="text-xs">Alergias / Restrições</Label>
                                <Input
                                    value={campoAlergias}
                                    onChange={(e) => setCampoAlergias(e.target.value)}
                                    placeholder="Ex: Nenhuma, Amônia..."
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label className="text-xs">Tratamentos Anteriores</Label>
                                <Input
                                    value={campoTratamentos}
                                    onChange={(e) => setCampoTratamentos(e.target.value)}
                                    placeholder="Ex: Progressiva, Botox capilar..."
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label className="text-xs">Objetivos</Label>
                                <Input
                                    value={campoObjetivos}
                                    onChange={(e) => setCampoObjetivos(e.target.value)}
                                    placeholder="Ex: Hidratar, Alisar, Tingir..."
                                    className="mt-1"
                                />
                            </div>
                        </div>

                        <div>
                            <Label>Observações</Label>
                            <Textarea
                                value={observacoes}
                                onChange={(e) => setObservacoes(e.target.value)}
                                placeholder="Observações gerais sobre a avaliação..."
                                rows={3}
                                className="mt-1"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => { setShowCriarDialog(false); resetForm(); }}>
                            Cancelar
                        </Button>
                        <Button onClick={handleCriarFicha}>
                            <Plus className="h-4 w-4 mr-1" />
                            Criar Ficha
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Dialog Detalhe */}
            <Dialog open={showDetalheDialog} onOpenChange={setShowDetalheDialog}>
                <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            📋 Ficha — {fichaDetalhe?.cliente_nome}
                        </DialogTitle>
                    </DialogHeader>
                    {fichaDetalhe && (
                        <div className="space-y-4 py-2">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <p className="text-xs text-muted-foreground">Tipo</p>
                                    <Badge variant="outline" className="mt-1">
                                        {tiposAvaliacao.find((t) => t.value === fichaDetalhe.tipo_avaliacao)?.label ||
                                            fichaDetalhe.tipo_avaliacao}
                                    </Badge>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Data</p>
                                    <p className="text-sm font-medium mt-1">
                                        {format(new Date(fichaDetalhe.created_at), "dd/MM/yyyy 'às' HH:mm")}
                                    </p>
                                </div>
                            </div>

                            <div>
                                <p className="text-xs text-muted-foreground mb-1">Satisfação</p>
                                {renderStars(fichaDetalhe.nota_satisfacao)}
                            </div>

                            {fichaDetalhe.campos_personalizados && (
                                <div className="border rounded-lg p-3 space-y-2">
                                    <p className="text-sm font-medium">Dados da Avaliação</p>
                                    {Object.entries(fichaDetalhe.campos_personalizados).map(([key, value]) => (
                                        <div key={key} className="flex justify-between text-sm">
                                            <span className="text-muted-foreground capitalize">
                                                {key.replace(/_/g, " ")}
                                            </span>
                                            <span className="font-medium">{value}</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {fichaDetalhe.observacoes && (
                                <div>
                                    <p className="text-xs text-muted-foreground mb-1">Observações</p>
                                    <p className="text-sm bg-muted/50 rounded-lg p-3">
                                        {fichaDetalhe.observacoes}
                                    </p>
                                </div>
                            )}

                            {/* Fotos Antes/Depois */}
                            {(fichaDetalhe.fotos_antes?.length > 0 || fichaDetalhe.fotos_depois?.length > 0) && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-xs text-muted-foreground mb-2 text-center">📸 Antes</p>
                                        <div className="space-y-2">
                                            {fichaDetalhe.fotos_antes?.map((url, i) => (
                                                <img
                                                    key={i}
                                                    src={url}
                                                    alt={`Antes ${i + 1}`}
                                                    className="rounded-lg w-full object-cover aspect-square"
                                                />
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground mb-2 text-center">✨ Depois</p>
                                        <div className="space-y-2">
                                            {fichaDetalhe.fotos_depois?.map((url, i) => (
                                                <img
                                                    key={i}
                                                    src={url}
                                                    alt={`Depois ${i + 1}`}
                                                    className="rounded-lg w-full object-cover aspect-square"
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
