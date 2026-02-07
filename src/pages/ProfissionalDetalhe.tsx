import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Phone,
  MapPin,
  Calendar,
  Percent,
  Target,
  Receipt,
  UserCheck,
  Pencil,
  Scissors,
  Package,
  TrendingUp,
  DollarSign,
  Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { SkeletonCard } from "@/components/ui/skeleton";
import ProfissionalFormDialog from "@/components/profissionais/ProfissionalFormDialog";
import ProfissionalValesTab from "@/components/vales/ProfissionalValesTab";
import { DualProgressCard, ProgressBar } from "@/components/profissionais/ProgressBar";
import { useProfissionais, ComissaoDetalhada } from "@/hooks/useProfissionais";
import { usePinAuth } from "@/contexts/PinAuthContext";
import AccessDenied from "@/components/auth/AccessDenied";
import NotFoundResource from "@/components/auth/NotFoundResource";

const ProfissionalDetalhe = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") || "info";
  const { canAccessRoute, isAuthenticated, loading: authLoading } = usePinAuth();
  
  // Check permission before any data loading
  const hasPermission = canAccessRoute('/profissional');

  const { profissionais, loading: profLoading, getComissoesDetalhadas, fetchProfissionais } = useProfissionais();
  const [activeTab, setActiveTab] = useState(initialTab);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [valesAbertos, setValesAbertos] = useState(0);
  const [comissoes, setComissoes] = useState<ComissaoDetalhada[]>([]);
  const [loadingComissoes, setLoadingComissoes] = useState(false);
  const { toast } = useToast();

  const mesAtual = format(new Date(), "MMMM/yyyy", { locale: ptBR });

  // Find professional from the hook's data
  const profissional = useMemo(() => 
    profissionais.find(p => p.id === id) || null,
  [profissionais, id]);

  // Fetch vales count - only if has permission
  useEffect(() => {
    const fetchVales = async () => {
      if (!id || !hasPermission || !isAuthenticated) return;
      const { count } = await supabase
        .from("vales")
        .select("*", { count: "exact", head: true })
        .eq("profissional_id", id)
        .eq("status", "aberto");
      setValesAbertos(count || 0);
    };
    fetchVales();
  }, [id, hasPermission, isAuthenticated]);

  // Fetch commissions when tab changes - only if has permission
  useEffect(() => {
    const fetchComissoes = async () => {
      if (!id || activeTab !== "comissoes" || !hasPermission || !isAuthenticated) return;
      setLoadingComissoes(true);
      const data = await getComissoesDetalhadas(id);
      setComissoes(data);
      setLoadingComissoes(false);
    };
    fetchComissoes();
  }, [id, activeTab, getComissoesDetalhadas, hasPermission, isAuthenticated]);

  const getInitials = (nome: string) =>
    nome
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();

  const formatEndereco = () => {
    if (!profissional) return null;
    const parts = [
      profissional.endereco,
      profissional.bairro,
      profissional.cidade,
      profissional.estado,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : null;
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { 
      style: 'currency', 
      currency: 'BRL' 
    }).format(val);
  };

  const handleEditClose = (refresh?: boolean) => {
    setIsEditOpen(false);
    if (refresh) fetchProfissionais();
  };

  // Check auth loading state first
  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Check permission before showing any content
  if (!hasPermission) {
    return <AccessDenied message="Você não tem permissão para visualizar detalhes de profissionais." />;
  }

  if (profLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (!profissional) {
    return (
      <NotFoundResource 
        resourceName="Profissional"
        backPath="/profissionais"
        backLabel="Voltar para lista"
      />
    );
  }

  // Calculate totals
  const totalComissaoServicos = profissional.comissao_servicos_valor || 0;
  const totalComissaoProdutos = profissional.comissao_produtos_valor || 0;
  const totalComissao = totalComissaoServicos + totalComissaoProdutos;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/profissionais")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-4 flex-1">
          <Avatar className="h-16 w-16 border-4" style={{ borderColor: profissional.cor_agenda }}>
            <AvatarImage src={profissional.foto_url || ""} />
            <AvatarFallback
              className="text-xl font-bold"
              style={{ backgroundColor: profissional.cor_agenda, color: "white" }}
            >
              {getInitials(profissional.nome)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{profissional.nome}</h1>
              <Badge variant={profissional.ativo ? "success" : "destructive"}>
                {profissional.ativo ? "Ativo" : "Inativo"}
              </Badge>
            </div>
            <p className="text-muted-foreground">{profissional.funcao || "Profissional"}</p>
          </div>
          <Button variant="outline" onClick={() => setIsEditOpen(true)}>
            <Pencil className="h-4 w-4 mr-2" />
            Editar
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="info" className="gap-2">
            <UserCheck className="h-4 w-4" />
            <span className="hidden sm:inline">Dados</span>
          </TabsTrigger>
          <TabsTrigger value="comissoes" className="gap-2">
            <DollarSign className="h-4 w-4" />
            <span className="hidden sm:inline">Comissões</span>
          </TabsTrigger>
          <TabsTrigger value="metas" className="gap-2">
            <Target className="h-4 w-4" />
            <span className="hidden sm:inline">Metas</span>
          </TabsTrigger>
          <TabsTrigger value="vales" className="gap-2 relative">
            <Receipt className="h-4 w-4" />
            <span className="hidden sm:inline">Vales</span>
            {valesAbertos > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full text-xs font-bold flex items-center justify-center bg-destructive text-destructive-foreground">
                {valesAbertos}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Dados Básicos */}
        <TabsContent value="info" className="mt-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-0 shadow-sm">
              <CardContent className="p-5">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  Contato
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Telefone</span>
                    <span>{profissional.telefone || "Não informado"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">CPF</span>
                    <span>{profissional.cpf || "Não informado"}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardContent className="p-5">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  Datas
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Admissão</span>
                    <span>
                      {profissional.data_admissao
                        ? format(parseISO(profissional.data_admissao), "dd/MM/yyyy")
                        : "Não informado"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Atendimentos no mês</span>
                    <span className="font-medium">{profissional.total_atendimentos}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {formatEndereco() && (
              <Card className="border-0 shadow-sm md:col-span-2">
                <CardContent className="p-5">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    Endereço
                  </h3>
                  <p className="text-sm">{formatEndereco()}</p>
                  {profissional.cep && (
                    <p className="text-sm text-muted-foreground mt-1">CEP: {profissional.cep}</p>
                  )}
                </CardContent>
              </Card>
            )}

            <Card className="border-0 shadow-sm md:col-span-2">
              <CardContent className="p-5">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Percent className="h-4 w-4 text-muted-foreground" />
                  Percentuais de Comissão
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 rounded-xl bg-muted/50">
                    <p className="text-2xl font-bold text-primary">{profissional.comissao_servicos}%</p>
                    <p className="text-sm text-muted-foreground">Serviços</p>
                  </div>
                  <div className="text-center p-4 rounded-xl bg-muted/50">
                    <p className="text-2xl font-bold text-primary">{profissional.comissao_produtos}%</p>
                    <p className="text-sm text-muted-foreground">Produtos</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab 2: Comissões */}
        <TabsContent value="comissoes" className="mt-6 space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Scissors className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Comissão Serviços</p>
                    <p className="text-xl font-bold">{formatCurrency(totalComissaoServicos)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-success/5 border-success/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-success/10">
                    <Package className="h-5 w-5 text-success" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Comissão Produtos</p>
                    <p className="text-xl font-bold">{formatCurrency(totalComissaoProdutos)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-warning/5 border-warning/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-warning/10">
                    <TrendingUp className="h-5 w-5 text-warning" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total do Mês</p>
                    <p className="text-xl font-bold">{formatCurrency(totalComissao)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Commission Details Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Detalhamento de Comissões - {mesAtual}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loadingComissoes ? (
                <div className="p-8 text-center text-muted-foreground">Carregando...</div>
              ) : comissoes.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  Nenhuma comissão registrada no mês
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead className="text-right">Valor Base</TableHead>
                      <TableHead className="text-right">%</TableHead>
                      <TableHead className="text-right">Comissão</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {comissoes.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell>{format(parseISO(c.data), "dd/MM")}</TableCell>
                        <TableCell>
                          <Badge variant={c.tipo === 'servico' ? 'default' : 'secondary'}>
                            {c.tipo === 'servico' ? 'Serviço' : 'Produto'}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{c.descricao}</TableCell>
                        <TableCell>{c.cliente_nome || '-'}</TableCell>
                        <TableCell className="text-right">{formatCurrency(c.valor_base)}</TableCell>
                        <TableCell className="text-right">{c.percentual}%</TableCell>
                        <TableCell className="text-right font-medium text-success">
                          {formatCurrency(c.valor_comissao)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Metas */}
        <TabsContent value="metas" className="mt-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Meta Serviços */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Scissors className="h-5 w-5 text-primary" />
                  Meta de Serviços - {mesAtual}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-2xl font-bold">{formatCurrency(profissional.meta_servicos_mes)}</p>
                    <p className="text-xs text-muted-foreground">Meta</p>
                  </div>
                  <div className="p-3 rounded-lg bg-primary/10">
                    <p className="text-2xl font-bold text-primary">{formatCurrency(profissional.realizado_servicos)}</p>
                    <p className="text-xs text-muted-foreground">Realizado</p>
                  </div>
                </div>
                <ProgressBar 
                  value={profissional.realizado_servicos} 
                  max={profissional.meta_servicos_mes} 
                  size="lg"
                />
              </CardContent>
            </Card>

            {/* Meta Produtos */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Package className="h-5 w-5 text-success" />
                  Meta de Produtos - {mesAtual}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {profissional.meta_produtos_mes > 0 ? (
                  <>
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div className="p-3 rounded-lg bg-muted/50">
                        <p className="text-2xl font-bold">{formatCurrency(profissional.meta_produtos_mes)}</p>
                        <p className="text-xs text-muted-foreground">Meta</p>
                      </div>
                      <div className="p-3 rounded-lg bg-success/10">
                        <p className="text-2xl font-bold text-success">{formatCurrency(profissional.realizado_produtos)}</p>
                        <p className="text-xs text-muted-foreground">Realizado</p>
                      </div>
                    </div>
                    <ProgressBar 
                      value={profissional.realizado_produtos} 
                      max={profissional.meta_produtos_mes} 
                      size="lg"
                    />
                  </>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Target className="h-12 w-12 mx-auto mb-2 opacity-30" />
                    <p>Sem meta de produtos definida</p>
                    <Button 
                      variant="link" 
                      className="mt-2"
                      onClick={() => setIsEditOpen(true)}
                    >
                      Definir meta
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Summary */}
          <Card className="bg-gradient-to-r from-primary/5 to-success/5">
            <CardContent className="p-6">
              <DualProgressCard
                metaServicos={profissional.meta_servicos_mes}
                realizadoServicos={profissional.realizado_servicos}
                metaProdutos={profissional.meta_produtos_mes}
                realizadoProdutos={profissional.realizado_produtos}
                mesReferencia={mesAtual}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 4: Vales */}
        <TabsContent value="vales" className="mt-6">
          <ProfissionalValesTab profissional={profissional} />
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <ProfissionalFormDialog
        open={isEditOpen}
        onClose={handleEditClose}
        profissional={profissional}
      />
    </div>
  );
};

export default ProfissionalDetalhe;
