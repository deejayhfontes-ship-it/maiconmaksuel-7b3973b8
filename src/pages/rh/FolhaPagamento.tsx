import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { format, startOfMonth, subMonths, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Plus, FileText, Check, Download, ChevronDown, ChevronRight, 
  DollarSign, Calculator, Wallet, CreditCard
} from "lucide-react";

export default function FolhaPagamento() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [mesReferencia, setMesReferencia] = useState(format(new Date(), "yyyy-MM"));
  const [processando, setProcessando] = useState(false);
  const [expandedRows, setExpandedRows] = useState<string[]>([]);

  const { data: folhas = [], isLoading } = useQuery({
    queryKey: ["folhas-pagamento"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("folhas_pagamento")
        .select("*, itens:itens_folha_pagamento(*, funcionario:funcionarios(*))")
        .order("mes_referencia", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: funcionarios = [] } = useQuery({
    queryKey: ["funcionarios-ativos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("funcionarios")
        .select("*")
        .eq("ativo", true)
        .is("data_demissao", null);
      if (error) throw error;
      return data;
    },
  });

  const calcularINSS = (salario: number) => {
    if (salario <= 1412) return salario * 0.075;
    if (salario <= 2666.68) return salario * 0.09;
    if (salario <= 4000.03) return salario * 0.12;
    return salario * 0.14;
  };

  const calcularIRRF = (salario: number, inss: number) => {
    const base = salario - inss;
    if (base <= 2259.20) return 0;
    if (base <= 2826.65) return base * 0.075 - 169.44;
    if (base <= 3751.05) return base * 0.15 - 381.44;
    if (base <= 4664.68) return base * 0.225 - 662.77;
    return base * 0.275 - 896.00;
  };

  const handleProcessarFolha = async () => {
    if (funcionarios.length === 0) {
      toast.error("Não há funcionários ativos para processar");
      return;
    }

    const mesRef = `${mesReferencia}-01`;
    const folhaExistente = folhas.find(f => f.mes_referencia === mesRef);
    if (folhaExistente) {
      toast.error("Já existe uma folha para este mês");
      return;
    }

    setProcessando(true);
    try {
      // Criar folha
      const { data: folha, error: folhaError } = await supabase
        .from("folhas_pagamento")
        .insert({
          mes_referencia: mesRef,
          status: "rascunho",
        })
        .select()
        .single();

      if (folhaError) throw folhaError;

      // Criar itens para cada funcionário
      const itens = funcionarios.map((f) => {
        const salario = Number(f.salario_base) || 0;
        const vt = Number(f.vale_transporte) || 0;
        const vr = Number(f.vale_refeicao) || 0;
        const ps = Number(f.plano_saude) || 0;
        const inss = calcularINSS(salario);
        const irrf = Math.max(0, calcularIRRF(salario, inss));
        const descontoVT = salario * 0.06;
        const totalProventos = salario + vt + vr;
        const totalDescontos = inss + irrf + descontoVT + (ps * 0.5);
        const liquido = totalProventos - totalDescontos;

        return {
          folha_pagamento_id: folha.id,
          funcionario_id: f.id,
          salario_base: salario,
          vale_transporte: vt,
          vale_refeicao: vr,
          plano_saude: ps,
          inss: inss,
          irrf: irrf,
          outros_descontos: descontoVT + (ps * 0.5),
          total_proventos: totalProventos,
          total_descontos: totalDescontos,
          salario_liquido: liquido,
        };
      });

      const { error: itensError } = await supabase
        .from("itens_folha_pagamento")
        .insert(itens);

      if (itensError) throw itensError;

      // Atualizar totais
      const totalBruto = itens.reduce((acc, i) => acc + i.total_proventos, 0);
      const totalDescontos = itens.reduce((acc, i) => acc + i.total_descontos, 0);
      const totalLiquido = itens.reduce((acc, i) => acc + i.salario_liquido, 0);

      await supabase
        .from("folhas_pagamento")
        .update({
          valor_total_bruto: totalBruto,
          valor_total_descontos: totalDescontos,
          valor_total_liquido: totalLiquido,
        })
        .eq("id", folha.id);

      toast.success("Folha de pagamento processada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["folhas-pagamento"] });
      setDialogOpen(false);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao processar folha de pagamento");
    } finally {
      setProcessando(false);
    }
  };

  const handleAprovarFolha = async (folhaId: string) => {
    try {
      const { error } = await supabase
        .from("folhas_pagamento")
        .update({ status: "aprovada", data_aprovacao: new Date().toISOString() })
        .eq("id", folhaId);
      if (error) throw error;
      toast.success("Folha aprovada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["folhas-pagamento"] });
    } catch (error) {
      toast.error("Erro ao aprovar folha");
    }
  };

  const handleMarcarPaga = async (folhaId: string) => {
    try {
      const { error } = await supabase
        .from("folhas_pagamento")
        .update({ status: "paga", data_pagamento: new Date().toISOString() })
        .eq("id", folhaId);
      if (error) throw error;
      toast.success("Folha marcada como paga!");
      queryClient.invalidateQueries({ queryKey: ["folhas-pagamento"] });
    } catch (error) {
      toast.error("Erro ao marcar como paga");
    }
  };

  const toggleRow = (id: string) => {
    setExpandedRows(prev => 
      prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
    );
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value || 0);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "rascunho":
        return <Badge variant="secondary">📝 Rascunho</Badge>;
      case "aprovada":
        return <Badge variant="outline" className="border-blue-500 text-blue-500">✓ Aprovada</Badge>;
      case "paga":
        return <Badge className="bg-green-500">✅ Paga</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // Stats
  const folhaAtual = folhas[0];
  const totalMes = folhaAtual?.valor_total_liquido || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Folha de Pagamento</h1>
          <p className="text-muted-foreground">Gerencie os pagamentos mensais dos funcionários</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Processar Nova Folha
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Wallet className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatCurrency(totalMes)}</p>
                <p className="text-xs text-muted-foreground">Total Líquido (Última Folha)</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <DollarSign className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{funcionarios.length}</p>
                <p className="text-xs text-muted-foreground">Funcionários Ativos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <FileText className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{folhas.length}</p>
                <p className="text-xs text-muted-foreground">Folhas Processadas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Folhas */}
      <div className="space-y-4">
        {isLoading ? (
          <Card className="animate-pulse">
            <CardContent className="p-6 h-32" />
          </Card>
        ) : folhas.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Calculator className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhuma folha processada</h3>
              <p className="text-muted-foreground mb-4">Processe a primeira folha de pagamento</p>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Processar Folha
              </Button>
            </CardContent>
          </Card>
        ) : (
          folhas.map((folha) => (
            <Card key={folha.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-lg">
                      {format(new Date(folha.mes_referencia), "MMMM/yyyy", { locale: ptBR }).toUpperCase()}
                    </CardTitle>
                    {getStatusBadge(folha.status)}
                  </div>
                  <div className="flex gap-2">
                    {folha.status === "rascunho" && (
                      <Button size="sm" onClick={() => handleAprovarFolha(folha.id)}>
                        <Check className="h-4 w-4 mr-1" />
                        Aprovar
                      </Button>
                    )}
                    {folha.status === "aprovada" && (
                      <Button size="sm" variant="outline" onClick={() => handleMarcarPaga(folha.id)}>
                        <CreditCard className="h-4 w-4 mr-1" />
                        Marcar como Paga
                      </Button>
                    )}
                    <Button size="sm" variant="outline">
                      <Download className="h-4 w-4 mr-1" />
                      PDF
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Total Bruto</p>
                    <p className="font-medium">{formatCurrency(folha.valor_total_bruto)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Total Descontos</p>
                    <p className="font-medium text-red-500">-{formatCurrency(folha.valor_total_descontos)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Total Líquido</p>
                    <p className="font-semibold text-green-600">{formatCurrency(folha.valor_total_liquido)}</p>
                  </div>
                </div>

                {folha.status === "paga" && folha.data_pagamento && (
                  <p className="text-xs text-muted-foreground mb-4">
                    Pago em: {format(new Date(folha.data_pagamento), "dd/MM/yyyy")}
                  </p>
                )}

                <Collapsible open={expandedRows.includes(folha.id)}>
                  <CollapsibleTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="w-full"
                      onClick={() => toggleRow(folha.id)}
                    >
                      {expandedRows.includes(folha.id) ? (
                        <>
                          <ChevronDown className="h-4 w-4 mr-2" />
                          Ocultar Detalhes
                        </>
                      ) : (
                        <>
                          <ChevronRight className="h-4 w-4 mr-2" />
                          Ver Detalhes ({folha.itens?.length || 0} funcionários)
                        </>
                      )}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-4">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Funcionário</TableHead>
                          <TableHead className="text-right">Salário</TableHead>
                          <TableHead className="text-right">Proventos</TableHead>
                          <TableHead className="text-right">Descontos</TableHead>
                          <TableHead className="text-right">Líquido</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {folha.itens?.map((item: any) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">
                              {item.funcionario?.nome || "Funcionário"}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(item.salario_base)}
                            </TableCell>
                            <TableCell className="text-right text-green-600">
                              +{formatCurrency(item.total_proventos)}
                            </TableCell>
                            <TableCell className="text-right text-red-500">
                              -{formatCurrency(item.total_descontos)}
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              {formatCurrency(item.salario_liquido)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CollapsibleContent>
                </Collapsible>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Dialog Nova Folha */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Processar Nova Folha</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Mês de Referência</Label>
              <Input
                type="month"
                value={mesReferencia}
                onChange={(e) => setMesReferencia(e.target.value)}
              />
            </div>
            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-sm text-muted-foreground mb-2">O sistema irá processar automaticamente:</p>
              <ul className="text-sm space-y-1">
                <li>• {funcionarios.length} funcionários ativos</li>
                <li>• Salários base</li>
                <li>• Benefícios (VT, VR, Plano de Saúde)</li>
                <li>• Descontos (INSS, IRRF)</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleProcessarFolha} disabled={processando}>
              {processando ? "Processando..." : "Processar Folha"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
