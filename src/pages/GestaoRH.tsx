import { useState, useEffect, useCallback } from 'react';
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
  AlertTriangle,
  UserCheck,
  BarChart3,
  Settings
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { addOnlineStatusListener } from '@/lib/syncService';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FuncionarioFormDialog } from '@/components/rh/FuncionarioFormDialog';
import { ComissoesPanel } from '@/components/rh/ComissoesPanel';
import { FolhaPontoPanel } from '@/components/rh/FolhaPontoPanel';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { usePinAuth } from '@/contexts/PinAuthContext';

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

interface Profissional {
  id: string;
  nome: string;
  especialidade: string | null;
  ativo: boolean;
}

interface PontoRegistro {
  id: string;
  tipo_pessoa: string;
  pessoa_id: string;
  nome?: string;
  cargo_especialidade?: string;
  data: string;
  entrada_manha: string | null;
  saida_almoco: string | null;
  entrada_tarde: string | null;
  saida: string | null;
  horas_trabalhadas: number | null;
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
  const { session } = usePinAuth();
  const [activeTab, setActiveTab] = useState('resumo');
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [pontosHoje, setPontosHoje] = useState<PontoRegistro[]>([]);
  const [folhas, setFolhas] = useState<FolhaPagamento[]>([]);
  const [ferias, setFerias] = useState<Ferias[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [funcionarioDialogOpen, setFuncionarioDialogOpen] = useState(false);
  const [selectedFuncionario, setSelectedFuncionario] = useState<Funcionario | null>(null);
  
  // Estados do relógio de ponto
  const [horaAtual, setHoraAtual] = useState(new Date());
  const [pessoaSelecionada, setPessoaSelecionada] = useState<string>('');
  const [pontoAtual, setPontoAtual] = useState<PontoRegistro | null>(null);
  const [registrandoPonto, setRegistrandoPonto] = useState(false);
  
  // Check role access
  const isAdmin = session?.role === 'admin';
  const canEdit = isAdmin; // Only admin can edit

  useEffect(() => {
    fetchData();
    const timer = setInterval(() => setHoraAtual(new Date()), 1000);
    const unsub = addOnlineStatusListener((online) => {
      if (online) {
        console.log('[FUNCIONARIO_WEB] online_reconnect → refetch');
        fetchData();
      }
    });
    return () => { clearInterval(timer); unsub(); };
  }, []);

  useEffect(() => {
    if (pessoaSelecionada) {
      carregarPontoAtual();
    } else {
      setPontoAtual(null);
    }
  }, [pessoaSelecionada]);

  const projectRef = (import.meta.env.VITE_SUPABASE_URL || '').replace(/^https?:\/\//, '').split('.')[0];

  const fetchData = async () => {
    setLoading(true);
    try {
      console.log('[FUNCIONARIO_WEB] fetch_start', { projectRef });
      // Buscar funcionários
      const { data: funcData, error: funcError } = await supabase
        .from('funcionarios')
        .select('*')
        .order('nome');
      
      if (funcError) {
        console.error('[FUNCIONARIO_WEB] fetch_fail', { error: funcError, projectRef });
      } else {
        console.log('[FUNCIONARIO_WEB] fetch_ok', { count: funcData?.length || 0, projectRef });
      }
      if (funcData) setFuncionarios(funcData);

      // Buscar profissionais
      const { data: profData } = await supabase
        .from('profissionais')
        .select('id, nome, especialidade, ativo')
        .order('nome');
      
      if (profData) setProfissionais(profData);

      // Buscar pontos de hoje (nova tabela unificada)
      await carregarPontosHoje(funcData || [], profData || []);

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

  const carregarPontosHoje = async (funcs: Funcionario[], profs: Profissional[]) => {
    const hoje = format(new Date(), 'yyyy-MM-dd');
    
    const { data: pontosData } = await supabase
      .from('ponto_registros')
      .select('*')
      .eq('data', hoje);

    if (pontosData) {
      const pontosFormatados = pontosData.map(p => {
        if (p.tipo_pessoa === 'funcionario') {
          const func = funcs.find(f => f.id === p.pessoa_id);
          return { ...p, nome: func?.nome || 'Funcionário', cargo_especialidade: func?.cargo || '' };
        } else {
          const prof = profs.find(pr => pr.id === p.pessoa_id);
          return { ...p, nome: prof?.nome || 'Profissional', cargo_especialidade: prof?.especialidade || '' };
        }
      });
      setPontosHoje(pontosFormatados);
    }
  };

  const carregarPontoAtual = async () => {
    if (!pessoaSelecionada) return;

    const [tipo, id] = pessoaSelecionada.split('-');
    const hoje = format(new Date(), 'yyyy-MM-dd');

    const { data } = await supabase
      .from('ponto_registros')
      .select('*')
      .eq('tipo_pessoa', tipo)
      .eq('pessoa_id', id)
      .eq('data', hoje)
      .single();

    setPontoAtual(data || null);
  };

  const getProximoPonto = () => {
    if (!pontoAtual || !pontoAtual.entrada_manha) return { tipo: 'entrada_manha', label: 'Entrada' };
    if (!pontoAtual.saida_almoco) return { tipo: 'saida_almoco', label: 'Almoço' };
    if (!pontoAtual.entrada_tarde) return { tipo: 'entrada_tarde', label: 'Retorno' };
    if (!pontoAtual.saida) return { tipo: 'saida', label: 'Saída' };
    return { tipo: 'completo', label: 'Completo' };
  };

  const calcularHorasTrabalhadas = (ponto: Partial<PontoRegistro>) => {
    if (!ponto.entrada_manha || !ponto.saida) return 0;

    const entrada = new Date(`2000-01-01T${ponto.entrada_manha}`);
    const saida = new Date(`2000-01-01T${ponto.saida}`);

    let totalMinutos = (saida.getTime() - entrada.getTime()) / 1000 / 60;

    if (ponto.saida_almoco && ponto.entrada_tarde) {
      const saidaAlmoco = new Date(`2000-01-01T${ponto.saida_almoco}`);
      const entradaTarde = new Date(`2000-01-01T${ponto.entrada_tarde}`);
      const minutosAlmoco = (entradaTarde.getTime() - saidaAlmoco.getTime()) / 1000 / 60;
      totalMinutos -= minutosAlmoco;
    }

    return Number((totalMinutos / 60).toFixed(2));
  };

  const baterPonto = async () => {
    if (!pessoaSelecionada) {
      toast.error('Selecione uma pessoa primeiro');
      return;
    }

    const proximoPonto = getProximoPonto();
    if (proximoPonto.tipo === 'completo') {
      toast.info('Todos os pontos do dia já foram registrados');
      return;
    }

    setRegistrandoPonto(true);
    const [tipo, id] = pessoaSelecionada.split('-');
    const agora = horaAtual.toTimeString().slice(0, 5);
    const hoje = format(new Date(), 'yyyy-MM-dd');

    try {
      const { data: registroExistente } = await supabase
        .from('ponto_registros')
        .select('id')
        .eq('tipo_pessoa', tipo)
        .eq('pessoa_id', id)
        .eq('data', hoje)
        .single();

      if (registroExistente) {
        const updateData: Record<string, unknown> = { [proximoPonto.tipo]: agora };
        
        if (proximoPonto.tipo === 'saida') {
          const newPonto = { ...pontoAtual, saida: agora };
          updateData.horas_trabalhadas = calcularHorasTrabalhadas(newPonto);
        }

        await supabase
          .from('ponto_registros')
          .update(updateData)
          .eq('id', registroExistente.id);
      } else {
        await supabase
          .from('ponto_registros')
          .insert({
            tipo_pessoa: tipo,
            pessoa_id: id,
            data: hoje,
            [proximoPonto.tipo]: agora
          });
      }

      toast.success(`✅ ${proximoPonto.label} registrada às ${agora}`);
      await carregarPontoAtual();
      await carregarPontosHoje(funcionarios, profissionais);
    } catch (error) {
      console.error('Erro ao bater ponto:', error);
      toast.error('Erro ao registrar ponto');
    } finally {
      setRegistrandoPonto(false);
    }
  };

  const funcionariosAtivos = funcionarios.filter(f => f.ativo);
  const profissionaisAtivos = profissionais.filter(p => p.ativo);
  const funcionariosFiltrados = funcionariosAtivos.filter(f => 
    f.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const calcularFolhaMensal = () => {
    return funcionariosAtivos.reduce((acc, f) => acc + Number(f.salario_base || 0), 0);
  };

  const calcularPresencaHoje = () => {
    const totalPessoas = funcionariosAtivos.length + profissionaisAtivos.length;
    const presentes = pontosHoje.filter(p => p.entrada_manha).length;
    return {
      percentual: totalPessoas > 0 ? Math.round((presentes / totalPessoas) * 100) : 0,
      presentes,
      total: totalPessoas
    };
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
  const presencaHoje = calcularPresencaHoje();
  const proximoPonto = getProximoPonto();

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
            Gestão de RH
          </h1>
          <p className="text-muted-foreground mt-1">
            Administração de funcionários, ponto e comissões
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={() => fetchData()}>
            <Search className="w-4 h-4" />
            Atualizar
          </Button>
          <Link to="/ponto">
            <Button variant="outline" className="gap-2">
              <Clock className="w-4 h-4" />
              Ponto (Tela Cheia)
            </Button>
          </Link>
          {isAdmin && (
            <Link to="/configuracoes">
              <Button variant="outline" className="gap-2">
                <Settings className="w-4 h-4" />
                Config. RH
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start border-b pb-0 h-auto bg-transparent">
          <TabsTrigger value="resumo" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
            <Users className="w-4 h-4 mr-2" />
            Resumo
          </TabsTrigger>
          <TabsTrigger value="ponto" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
            <Clock className="w-4 h-4 mr-2" />
            Ponto Hoje
          </TabsTrigger>
          <TabsTrigger value="comissoes" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
            <DollarSign className="w-4 h-4 mr-2" />
            Comissões
          </TabsTrigger>
          <TabsTrigger value="folha" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
            <BarChart3 className="w-4 h-4 mr-2" />
            Folha de Ponto
          </TabsTrigger>
        </TabsList>

        {/* Tab: Resumo */}
        <TabsContent value="resumo" className="space-y-6 mt-6">

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="relative">
          <CardContent className="p-6">
            <div className="absolute top-6 right-6 w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">Funcionários</p>
            <p className="text-3xl font-bold text-foreground mt-2">{funcionariosAtivos.length}</p>
            <p className="text-sm text-muted-foreground mt-2">+ {profissionaisAtivos.length} profissionais</p>
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
            <p className="text-3xl font-bold text-foreground mt-2">{presencaHoje.percentual}%</p>
            <p className="text-sm text-muted-foreground mt-2">
              {presencaHoje.presentes} de {presencaHoje.total} presentes
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

      {/* Seção Relógio de Ponto Unificado */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Relógio de Ponto
              </h2>
              <p className="text-sm text-muted-foreground">
                {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
              </p>
            </div>
            <div className="text-4xl font-bold font-mono text-primary">
              {horaAtual.toTimeString().slice(0, 5)}
            </div>
          </div>

          {/* Seletor e Botão */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <select
              value={pessoaSelecionada}
              onChange={(e) => setPessoaSelecionada(e.target.value)}
              className="flex-1 h-12 px-4 border rounded-xl bg-background text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
            >
              <option value="">Selecione quem vai bater o ponto...</option>
              
              {funcionariosAtivos.length > 0 && (
                <optgroup label="👔 FUNCIONÁRIOS RH">
                  {funcionariosAtivos.map(f => (
                    <option key={`funcionario-${f.id}`} value={`funcionario-${f.id}`}>
                      {f.nome} - {f.cargo || 'Funcionário'}
                    </option>
                  ))}
                </optgroup>
              )}
              
              {profissionaisAtivos.length > 0 && (
                <optgroup label="💇 PROFISSIONAIS">
                  {profissionaisAtivos.map(p => (
                    <option key={`profissional-${p.id}`} value={`profissional-${p.id}`}>
                      {p.nome} - {p.especialidade || 'Profissional'}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>

            <Button 
              onClick={baterPonto}
              disabled={!pessoaSelecionada || proximoPonto.tipo === 'completo' || registrandoPonto}
              className="h-12 px-6 gap-2"
              style={{
                background: proximoPonto.tipo === 'completo' ? undefined : 'linear-gradient(135deg, hsl(142.1, 76.2%, 36.3%) 0%, hsl(142.1, 76.2%, 30%) 100%)'
              }}
            >
              {registrandoPonto ? 'Registrando...' : proximoPonto.tipo === 'completo' ? '✅ Completo' : `🟢 Registrar ${proximoPonto.label}`}
            </Button>
          </div>

          {/* Status do ponto selecionado */}
          {pessoaSelecionada && pontoAtual && (
            <div className="grid grid-cols-4 gap-3 mb-6 p-4 bg-muted/30 rounded-xl">
              <div className="text-center">
                <div className={`text-lg font-semibold ${pontoAtual.entrada_manha ? 'text-green-600' : 'text-muted-foreground'}`}>
                  {formatTime(pontoAtual.entrada_manha)}
                </div>
                <div className="text-xs text-muted-foreground">Entrada</div>
              </div>
              <div className="text-center">
                <div className={`text-lg font-semibold ${pontoAtual.saida_almoco ? 'text-orange-600' : 'text-muted-foreground'}`}>
                  {formatTime(pontoAtual.saida_almoco)}
                </div>
                <div className="text-xs text-muted-foreground">Almoço</div>
              </div>
              <div className="text-center">
                <div className={`text-lg font-semibold ${pontoAtual.entrada_tarde ? 'text-blue-600' : 'text-muted-foreground'}`}>
                  {formatTime(pontoAtual.entrada_tarde)}
                </div>
                <div className="text-xs text-muted-foreground">Retorno</div>
              </div>
              <div className="text-center">
                <div className={`text-lg font-semibold ${pontoAtual.saida ? 'text-purple-600' : 'text-muted-foreground'}`}>
                  {formatTime(pontoAtual.saida)}
                </div>
                <div className="text-xs text-muted-foreground">Saída</div>
              </div>
            </div>
          )}

          {/* Tabela de pontos do dia */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-center">Entrada</TableHead>
                  <TableHead className="text-center">Almoço</TableHead>
                  <TableHead className="text-center">Retorno</TableHead>
                  <TableHead className="text-center">Saída</TableHead>
                  <TableHead className="text-center">Horas</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pontosHoje.length > 0 ? (
                  pontosHoje.map((ponto) => (
                    <TableRow key={`${ponto.tipo_pessoa}-${ponto.pessoa_id}`}>
                      <TableCell className="font-medium">{ponto.nome}</TableCell>
                      <TableCell>
                        <Badge 
                          variant="secondary"
                          className={ponto.tipo_pessoa === 'profissional' 
                            ? 'bg-primary/10 text-primary' 
                            : 'bg-green-500/10 text-green-600'
                          }
                        >
                          {ponto.tipo_pessoa === 'profissional' ? '💇 Profissional' : '👔 Funcionário'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">{formatTime(ponto.entrada_manha)}</TableCell>
                      <TableCell className="text-center">{formatTime(ponto.saida_almoco)}</TableCell>
                      <TableCell className="text-center">{formatTime(ponto.entrada_tarde)}</TableCell>
                      <TableCell className="text-center">{formatTime(ponto.saida)}</TableCell>
                      <TableCell className="text-center font-semibold text-primary">
                        {ponto.horas_trabalhadas ? `${ponto.horas_trabalhadas}h` : '--'}
                      </TableCell>
                      <TableCell className="text-center">
                        {ponto.saida ? (
                          <Badge className="bg-green-600">✅ Completo</Badge>
                        ) : ponto.entrada_manha ? (
                          <Badge variant="secondary" className="bg-orange-500/10 text-orange-600">🟡 Em andamento</Badge>
                        ) : (
                          <Badge variant="destructive">❌ Ausente</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Nenhum ponto registrado hoje
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

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
      </TabsContent>

        {/* Tab: Ponto Hoje */}
        <TabsContent value="ponto" className="mt-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Ponto do Dia
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                  </p>
                </div>
                <div className="text-4xl font-bold font-mono text-primary">
                  {horaAtual.toTimeString().slice(0, 5)}
                </div>
              </div>

              {/* Seletor e Botão de Ponto */}
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <select
                  value={pessoaSelecionada}
                  onChange={(e) => setPessoaSelecionada(e.target.value)}
                  className="flex-1 h-12 px-4 border rounded-xl bg-background text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                >
                  <option value="">Selecione quem vai bater o ponto...</option>
                  
                  {funcionariosAtivos.length > 0 && (
                    <optgroup label="👔 FUNCIONÁRIOS RH">
                      {funcionariosAtivos.map(f => (
                        <option key={`funcionario-${f.id}`} value={`funcionario-${f.id}`}>
                          {f.nome} - {f.cargo || 'Funcionário'}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  
                  {profissionaisAtivos.length > 0 && (
                    <optgroup label="💇 PROFISSIONAIS">
                      {profissionaisAtivos.map(p => (
                        <option key={`profissional-${p.id}`} value={`profissional-${p.id}`}>
                          {p.nome} - {p.especialidade || 'Profissional'}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>

                <Button 
                  onClick={baterPonto}
                  disabled={!pessoaSelecionada || proximoPonto.tipo === 'completo' || registrandoPonto}
                  className="h-12 px-6 gap-2 bg-primary hover:bg-primary/90"
                >
                  {registrandoPonto ? 'Registrando...' : proximoPonto.tipo === 'completo' ? '✅ Completo' : `🟢 Registrar ${proximoPonto.label}`}
                </Button>
              </div>

              {/* Tabela de pontos */}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="text-center">Entrada</TableHead>
                      <TableHead className="text-center">Almoço</TableHead>
                      <TableHead className="text-center">Retorno</TableHead>
                      <TableHead className="text-center">Saída</TableHead>
                      <TableHead className="text-center">Horas</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pontosHoje.length > 0 ? (
                      pontosHoje.map((ponto) => (
                        <TableRow key={`ponto-${ponto.tipo_pessoa}-${ponto.pessoa_id}`}>
                          <TableCell className="font-medium">{ponto.nome}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className={ponto.tipo_pessoa === 'profissional' ? 'bg-primary/10 text-primary' : 'bg-accent text-accent-foreground'}>
                              {ponto.tipo_pessoa === 'profissional' ? '💇 Profissional' : '👔 Funcionário'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">{formatTime(ponto.entrada_manha)}</TableCell>
                          <TableCell className="text-center">{formatTime(ponto.saida_almoco)}</TableCell>
                          <TableCell className="text-center">{formatTime(ponto.entrada_tarde)}</TableCell>
                          <TableCell className="text-center">{formatTime(ponto.saida)}</TableCell>
                          <TableCell className="text-center font-semibold text-primary">
                            {ponto.horas_trabalhadas ? `${ponto.horas_trabalhadas}h` : '--'}
                          </TableCell>
                          <TableCell className="text-center">
                            {ponto.saida ? (
                              <Badge className="bg-primary">✅ Completo</Badge>
                            ) : ponto.entrada_manha ? (
                              <Badge variant="secondary">🟡 Em andamento</Badge>
                            ) : (
                              <Badge variant="destructive">❌ Ausente</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          Nenhum ponto registrado hoje
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Comissões */}
        <TabsContent value="comissoes" className="mt-6">
          <ComissoesPanel />
        </TabsContent>

        {/* Tab: Folha de Ponto */}
        <TabsContent value="folha" className="mt-6">
          <FolhaPontoPanel />
        </TabsContent>
      </Tabs>

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
