import { useState, useEffect } from 'react';
import { 
  Users, 
  DollarSign, 
  CheckCircle, 
  Calendar,
  Plus,
  Search,
  Edit,
  Clock,
  Plane,
  Eye,
  Download,
  AlertTriangle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FuncionarioFormDialog } from '@/components/rh/FuncionarioFormDialog';
import { toast } from 'sonner';

interface Funcionario {
  id: string;
  nome: string;
  cargo: string;
  salario_base: number;
  ativo: boolean;
  foto_url: string | null;
  data_admissao: string;
  cpf: string;
  tipo_contrato: string;
}

interface PontoHoje {
  id: string;
  funcionario_id: string;
  funcionario?: Funcionario;
  data: string;
  entrada_manha: string | null;
  saida_almoco: string | null;
  entrada_tarde: string | null;
  saida: string | null;
  horas_trabalhadas: number | null;
  falta: boolean;
}

interface FolhaPagamento {
  id: string;
  mes_referencia: string;
  status: string;
  valor_total_bruto: number | null;
  valor_total_liquido: number | null;
  data_pagamento: string | null;
}

interface Ferias {
  id: string;
  funcionario_id: string;
  funcionario?: Funcionario;
  periodo_aquisitivo_inicio: string;
  periodo_aquisitivo_fim: string;
  dias_direito: number;
  dias_gozados: number;
  data_inicio_ferias: string | null;
  data_fim_ferias: string | null;
  status: string;
  valor_ferias: number | null;
}

const GestaoRH = () => {
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [pontoHoje, setPontoHoje] = useState<PontoHoje[]>([]);
  const [folhas, setFolhas] = useState<FolhaPagamento[]>([]);
  const [ferias, setFerias] = useState<Ferias[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [funcionarioDialogOpen, setFuncionarioDialogOpen] = useState(false);
  const [selectedFuncionario, setSelectedFuncionario] = useState<Funcionario | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Buscar funcionários
      const { data: funcData } = await supabase
        .from('funcionarios')
        .select('*')
        .order('nome');
      
      if (funcData) setFuncionarios(funcData);

      // Buscar ponto de hoje
      const hoje = format(new Date(), 'yyyy-MM-dd');
      const { data: pontoData } = await supabase
        .from('ponto_funcionarios')
        .select('*')
        .eq('data', hoje);
      
      if (pontoData) setPontoHoje(pontoData);

      // Buscar folhas de pagamento
      const { data: folhasData } = await supabase
        .from('folhas_pagamento')
        .select('*')
        .order('mes_referencia', { ascending: false })
        .limit(5);
      
      if (folhasData) setFolhas(folhasData);

      // Buscar férias
      const { data: feriasData } = await supabase
        .from('ferias_funcionarios')
        .select('*')
        .order('periodo_aquisitivo_fim');
      
      if (feriasData) setFerias(feriasData);

    } catch (error) {
      console.error('Erro ao buscar dados:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const funcionariosAtivos = funcionarios.filter(f => f.ativo);
  const funcionariosFiltrados = funcionariosAtivos.filter(f => 
    f.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const calcularFolhaMensal = () => {
    return funcionariosAtivos.reduce((acc, f) => acc + Number(f.salario_base || 0), 0);
  };

  const calcularPresencaHoje = () => {
    const presentes = pontoHoje.filter(p => p.entrada_manha && !p.falta).length;
    const total = funcionariosAtivos.length;
    return total > 0 ? Math.round((presentes / total) * 100) : 0;
  };

  const getFeriasVencendo = () => {
    const hoje = new Date();
    const em60dias = new Date();
    em60dias.setDate(em60dias.getDate() + 60);
    
    return ferias.filter(f => {
      const fimPeriodo = new Date(f.periodo_aquisitivo_fim);
      return fimPeriodo >= hoje && fimPeriodo <= em60dias && f.status !== 'gozadas';
    });
  };

  const getInitials = (nome: string) => {
    return nome.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const formatTime = (time: string | null) => {
    if (!time) return '--:--';
    return time.substring(0, 5);
  };

  const handleEditFuncionario = (func: Funcionario) => {
    setSelectedFuncionario(func);
    setFuncionarioDialogOpen(true);
  };

  const handleNewFuncionario = () => {
    setSelectedFuncionario(null);
    setFuncionarioDialogOpen(true);
  };

  const feriasVencendo = getFeriasVencendo();

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
          Gestão de RH
        </h1>
        <p className="text-muted-foreground mt-1">
          Administração de funcionários e folha de pagamento
        </p>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="relative">
          <CardContent className="p-6">
            <div className="absolute top-6 right-6 w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">Funcionários Ativos</p>
            <p className="text-3xl font-bold text-foreground mt-2">{funcionariosAtivos.length}</p>
            <p className="text-sm text-green-600 mt-2">Total cadastrado</p>
          </CardContent>
        </Card>

        <Card className="relative">
          <CardContent className="p-6">
            <div className="absolute top-6 right-6 w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">Folha Mensal</p>
            <p className="text-3xl font-bold text-foreground mt-2">{formatCurrency(calcularFolhaMensal())}</p>
            <p className="text-sm text-muted-foreground mt-2">Salários base</p>
          </CardContent>
        </Card>

        <Card className="relative">
          <CardContent className="p-6">
            <div className="absolute top-6 right-6 w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">Presença Hoje</p>
            <p className="text-3xl font-bold text-foreground mt-2">{calcularPresencaHoje()}%</p>
            <p className="text-sm text-muted-foreground mt-2">
              {pontoHoje.filter(p => p.entrada_manha && !p.falta).length} de {funcionariosAtivos.length} presentes
            </p>
          </CardContent>
        </Card>

        <Card className="relative">
          <CardContent className="p-6">
            <div className="absolute top-6 right-6 w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center">
              <Calendar className="w-6 h-6 text-orange-500" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">Férias Vencendo</p>
            <p className="text-3xl font-bold text-foreground mt-2">{feriasVencendo.length}</p>
            <p className="text-sm text-orange-500 mt-2">
              {feriasVencendo.length > 0 ? '⚠️ Próximos 60 dias' : 'Nenhuma pendente'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Seção Funcionários */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <h2 className="text-xl font-semibold text-foreground">Funcionários</h2>
            <Button onClick={handleNewFuncionario} className="gap-2">
              <Plus className="w-4 h-4" />
              Novo Funcionário
            </Button>
          </div>

          {/* Filtros */}
          <div className="flex gap-4 mb-6">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar funcionário..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Grid de Funcionários */}
          {funcionariosFiltrados.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {funcionariosFiltrados.slice(0, 8).map((func) => (
                <div key={func.id} className="border rounded-xl p-4 text-center hover:shadow-md transition-shadow">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-primary/80 mx-auto mb-3 flex items-center justify-center text-2xl font-bold text-primary-foreground">
                    {func.foto_url ? (
                      <img src={func.foto_url} alt={func.nome} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      getInitials(func.nome)
                    )}
                  </div>
                  <p className="font-semibold text-foreground truncate">{func.nome}</p>
                  <p className="text-sm text-muted-foreground mb-2">{func.cargo || 'Não definido'}</p>
                  <p className="font-semibold text-foreground mb-2">{formatCurrency(Number(func.salario_base))}</p>
                  <Badge variant={func.ativo ? 'default' : 'secondary'} className="mb-3">
                    {func.ativo ? '● Ativo' : '● Inativo'}
                  </Badge>
                  <div className="flex flex-col gap-2">
                    <Button variant="outline" size="sm" className="w-full gap-2" onClick={() => handleEditFuncionario(func)}>
                      <Edit className="w-3 h-3" />
                      Editar
                    </Button>
                    <Button variant="outline" size="sm" className="w-full gap-2">
                      <Clock className="w-3 h-3" />
                      Ponto
                    </Button>
                    <Button variant="outline" size="sm" className="w-full gap-2">
                      <Plane className="w-3 h-3" />
                      Férias
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              {loading ? 'Carregando...' : 'Nenhum funcionário encontrado'}
            </div>
          )}

          {funcionariosFiltrados.length > 8 && (
            <Button variant="outline" className="w-full mt-4">
              Ver Todos Funcionários ({funcionariosFiltrados.length})
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Seção Ponto */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <h2 className="text-xl font-semibold text-foreground">Ponto Hoje</h2>
              <p className="text-sm text-muted-foreground">
                {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
              </p>
            </div>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Registrar Ponto
            </Button>
          </div>

          {funcionariosAtivos.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead className="text-center">Entrada</TableHead>
                    <TableHead className="text-center">Almoço</TableHead>
                    <TableHead className="text-center">Retorno</TableHead>
                    <TableHead className="text-center">Saída</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {funcionariosAtivos.map((func) => {
                    const ponto = pontoHoje.find(p => p.funcionario_id === func.id);
                    const horasTrabalhadas = ponto?.horas_trabalhadas || 0;
                    const isFalta = ponto?.falta || (!ponto?.entrada_manha && pontoHoje.length > 0);
                    
                    return (
                      <TableRow key={func.id}>
                        <TableCell className="font-medium">{func.nome}</TableCell>
                        <TableCell className="text-center">{formatTime(ponto?.entrada_manha || null)}</TableCell>
                        <TableCell className="text-center">{formatTime(ponto?.saida_almoco || null)}</TableCell>
                        <TableCell className="text-center">{formatTime(ponto?.entrada_tarde || null)}</TableCell>
                        <TableCell className="text-center">{formatTime(ponto?.saida || null)}</TableCell>
                        <TableCell className="text-center">
                          {isFalta ? (
                            <Badge variant="destructive">❌ Falta</Badge>
                          ) : ponto?.entrada_manha ? (
                            <Badge variant="default" className="bg-green-600">
                              ✅ {horasTrabalhadas}h
                            </Badge>
                          ) : (
                            <Badge variant="secondary">🟡 Pendente</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum funcionário cadastrado
            </div>
          )}

          <div className="flex gap-3 mt-4">
            <Button variant="outline" className="flex-1">
              Ver Calendário Mensal
            </Button>
            <Button variant="outline" className="flex-1">
              Relatório de Ponto
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Seção Folha de Pagamento */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <h2 className="text-xl font-semibold text-foreground">Folha de Pagamento</h2>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Processar Nova Folha
            </Button>
          </div>

          {folhas.length > 0 ? (
            <div className="space-y-3">
              {folhas.map((folha) => (
                <div key={folha.id} className="border rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <p className="font-semibold text-foreground">
                      {format(new Date(folha.mes_referencia), 'MMMM/yyyy', { locale: ptBR }).toUpperCase()}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatCurrency(Number(folha.valor_total_liquido || folha.valor_total_bruto || 0))}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={
                      folha.status === 'paga' ? 'default' :
                      folha.status === 'aprovada' ? 'secondary' :
                      'outline'
                    } className={folha.status === 'paga' ? 'bg-green-600' : ''}>
                      {folha.status === 'paga' ? '✅ Paga' :
                       folha.status === 'aprovada' ? '📋 Aprovada' :
                       '📝 Rascunho'}
                    </Badge>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="gap-1">
                        <Eye className="w-4 h-4" />
                        Detalhes
                      </Button>
                      <Button variant="outline" size="sm" className="gap-1">
                        <Download className="w-4 h-4" />
                        PDF
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma folha processada
            </div>
          )}

          <Button variant="outline" className="w-full mt-4">
            Ver Histórico Completo
          </Button>
        </CardContent>
      </Card>

      {/* Seção Férias */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <h2 className="text-xl font-semibold text-foreground">Gestão de Férias</h2>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Programar Férias
            </Button>
          </div>

          {feriasVencendo.length > 0 && (
            <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4 mb-6 flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-orange-500" />
              <div>
                <p className="font-semibold text-orange-600">ATENÇÃO</p>
                <p className="text-sm text-muted-foreground">
                  {feriasVencendo.length} funcionário(s) com férias vencendo nos próximos 60 dias
                </p>
              </div>
            </div>
          )}

          {ferias.length > 0 ? (
            <div className="space-y-3">
              {ferias.map((f) => {
                const funcionario = funcionarios.find(func => func.id === f.funcionario_id);
                const diasRestantes = Math.ceil(
                  (new Date(f.periodo_aquisitivo_fim).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
                );
                
                return (
                  <div key={f.id} className="border rounded-xl p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="font-semibold text-foreground">{funcionario?.nome || 'Funcionário'}</p>
                        <p className="text-sm text-muted-foreground">
                          Período: {format(new Date(f.periodo_aquisitivo_inicio), 'dd/MM/yyyy')} - {format(new Date(f.periodo_aquisitivo_fim), 'dd/MM/yyyy')}
                        </p>
                        <p className="text-sm text-foreground mt-1">
                          Direito: {f.dias_direito} dias | Gozados: {f.dias_gozados} dias
                        </p>
                      </div>
                      <Badge variant={
                        f.status === 'gozadas' ? 'default' :
                        diasRestantes <= 60 ? 'destructive' :
                        'secondary'
                      } className={f.status === 'gozadas' ? 'bg-green-600' : ''}>
                        {f.status === 'gozadas' ? '✅ Gozadas' :
                         f.status === 'programadas' ? '📅 Programadas' :
                         diasRestantes <= 60 ? `⚠️ Vence em ${diasRestantes} dias` :
                         '🕐 Pendente'}
                      </Badge>
                    </div>
                    <Button 
                      variant={f.status === 'gozadas' ? 'outline' : 'default'} 
                      className="w-full"
                    >
                      {f.status === 'gozadas' ? 'Ver Detalhes' : 'Programar Agora'}
                    </Button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma programação de férias
            </div>
          )}

          <Button variant="outline" className="w-full mt-4">
            Ver Calendário Anual
          </Button>
        </CardContent>
      </Card>

      {/* Dialog de Funcionário */}
      <FuncionarioFormDialog
        open={funcionarioDialogOpen}
        onOpenChange={setFuncionarioDialogOpen}
        funcionario={selectedFuncionario}
        onSuccess={fetchData}
      />
    </div>
  );
};

export default GestaoRH;
