import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format, subMonths, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Users, Wallet, TrendingUp, Clock, Calendar, AlertTriangle,
  Download, BarChart3
} from "lucide-react";
import { Link } from "react-router-dom";

export default function RelatoriosRH() {
  const { data: funcionarios = [] } = useQuery({
    queryKey: ["funcionarios"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("funcionarios")
        .select("*")
        .order("nome");
      if (error) throw error;
      return data;
    },
  });

  const { data: folhas = [] } = useQuery({
    queryKey: ["folhas-pagamento"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("folhas_pagamento")
        .select("*")
        .order("mes_referencia", { ascending: false })
        .limit(12);
      if (error) throw error;
      return data;
    },
  });

  const { data: pontos = [] } = useQuery({
    queryKey: ["pontos-mes"],
    queryFn: async () => {
      const inicio = format(subMonths(new Date(), 1), "yyyy-MM-01");
      const { data, error } = await supabase
        .from("ponto_funcionarios")
        .select("*")
        .gte("data", inicio);
      if (error) throw error;
      return data;
    },
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value || 0);
  };

  // Cálculos
  const funcionariosAtivos = funcionarios.filter(f => f.ativo && !f.data_demissao);
  const funcionariosInativos = funcionarios.filter(f => !f.ativo || f.data_demissao);
  
  const custoMensal = funcionariosAtivos.reduce((acc, f) => 
    acc + (Number(f.salario_base) || 0) + 
    (Number(f.vale_transporte) || 0) + 
    (Number(f.vale_refeicao) || 0) + 
    (Number(f.plano_saude) || 0), 0);

  const totalFaltas = pontos.filter(p => p.falta).length;
  const faltasJustificadas = pontos.filter(p => p.falta && p.justificada).length;
  const totalHorasExtras = pontos.reduce((acc, p) => acc + (Number(p.horas_extras) || 0), 0);

  // Férias vencendo
  const feriasVencendo = funcionariosAtivos.filter(f => {
    const dias = differenceInDays(new Date(), new Date(f.data_admissao));
    const anosCompletos = Math.floor(dias / 365);
    const diasNoAnoAtual = dias - (anosCompletos * 365);
    return diasNoAnoAtual >= 305; // 60 dias antes de vencer
  });

  // Departamentos
  const porDepartamento = funcionariosAtivos.reduce((acc: any, f) => {
    const dep = f.departamento || "outros";
    if (!acc[dep]) acc[dep] = { count: 0, custo: 0 };
    acc[dep].count++;
    acc[dep].custo += (Number(f.salario_base) || 0);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Relatórios de RH</h1>
          <p className="text-muted-foreground">Visão geral e indicadores do departamento</p>
        </div>
        <Button variant="outline" asChild>
          <Link to="/rh/funcionarios">
            ← Voltar para Funcionários
          </Link>
        </Button>
      </div>

      {/* Cards Principais */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{funcionariosAtivos.length}</p>
                <p className="text-xs text-muted-foreground">Funcionários Ativos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <Wallet className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-lg font-bold">{formatCurrency(custoMensal)}</p>
                <p className="text-xs text-muted-foreground">Custo Mensal Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-500/10 rounded-lg">
                <Calendar className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{feriasVencendo.length}</p>
                <p className="text-xs text-muted-foreground">Férias Vencendo</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/10 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalFaltas}</p>
                <p className="text-xs text-muted-foreground">Faltas no Mês</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Custo por Departamento */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Custo por Departamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(porDepartamento).map(([dep, data]: any) => (
                <div key={dep} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium capitalize">{dep}</p>
                    <p className="text-sm text-muted-foreground">{data.count} funcionário(s)</p>
                  </div>
                  <p className="font-semibold">{formatCurrency(data.custo)}</p>
                </div>
              ))}
              {Object.keys(porDepartamento).length === 0 && (
                <p className="text-muted-foreground text-center py-4">Sem dados</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Absenteísmo */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Absenteísmo (Último Mês)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span>Total de Faltas</span>
                <span className="font-semibold">{totalFaltas}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Faltas Justificadas</span>
                <span className="font-semibold text-yellow-500">{faltasJustificadas}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Faltas Não Justificadas</span>
                <span className="font-semibold text-red-500">{totalFaltas - faltasJustificadas}</span>
              </div>
              <div className="flex items-center justify-between border-t pt-2">
                <span>Horas Extras Realizadas</span>
                <span className="font-semibold text-green-500">{totalHorasExtras.toFixed(1)}h</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Turnover */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Turnover
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span>Funcionários Ativos</span>
                <span className="font-semibold">{funcionariosAtivos.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Desligados (Total)</span>
                <span className="font-semibold text-red-500">{funcionariosInativos.length}</span>
              </div>
              <div className="flex items-center justify-between border-t pt-2">
                <span>Taxa de Turnover</span>
                <span className="font-semibold">
                  {funcionariosAtivos.length > 0 
                    ? ((funcionariosInativos.length / (funcionariosAtivos.length + funcionariosInativos.length)) * 100).toFixed(1)
                    : 0}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Folhas de Pagamento Recentes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Folhas de Pagamento Recentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {folhas.slice(0, 5).map((folha) => (
                <div key={folha.id} className="flex items-center justify-between">
                  <span className="capitalize">
                    {format(new Date(folha.mes_referencia), "MMMM/yyyy", { locale: ptBR })}
                  </span>
                  <span className="font-semibold">{formatCurrency(folha.valor_total_liquido)}</span>
                </div>
              ))}
              {folhas.length === 0 && (
                <p className="text-muted-foreground text-center py-4">Nenhuma folha processada</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alertas */}
      {(feriasVencendo.length > 0 || totalFaltas > 0) && (
        <Card className="border-yellow-500/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-yellow-600">
              <AlertTriangle className="h-5 w-5" />
              Alertas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {feriasVencendo.map(f => (
                <li key={f.id} className="flex items-center gap-2 text-sm">
                  <span className="text-yellow-500">⚠️</span>
                  Férias de <strong>{f.nome}</strong> vencem em breve
                </li>
              ))}
              {totalFaltas > 5 && (
                <li className="flex items-center gap-2 text-sm">
                  <span className="text-red-500">🚨</span>
                  Alto índice de faltas no último mês ({totalFaltas} faltas)
                </li>
              )}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
