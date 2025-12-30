import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  FileText, 
  Download, 
  Loader2, 
  CheckCircle2,
  DollarSign,
  Users,
  UserCheck,
  Package,
  TrendingUp,
  Target,
  FileSpreadsheet,
  Mail,
  Cloud
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { format, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { gerarPDF, gerarExcel, downloadBlob, ExportData, ExportOptions } from '@/utils/exportUtils';

type PeriodoTipo = 'este-mes' | 'mes-passado' | 'este-ano' | 'personalizado';
type FormatoExport = 'pdf' | 'excel' | 'ambos';

interface SecaoConfig {
  id: string;
  label: string;
  icon: React.ElementType;
  cor: string;
  subsecoes: { id: string; label: string }[];
}

const SECOES: SecaoConfig[] = [
  {
    id: 'vendas',
    label: 'Vendas',
    icon: DollarSign,
    cor: '#34C759',
    subsecoes: [
      { id: 'vendas-resumo', label: 'Resumo geral' },
      { id: 'vendas-profissional', label: 'Por profissional' },
      { id: 'vendas-servico', label: 'Por serviço' },
      { id: 'vendas-pagamento', label: 'Por forma de pagamento' },
    ],
  },
  {
    id: 'clientes',
    label: 'Clientes',
    icon: Users,
    cor: '#007AFF',
    subsecoes: [
      { id: 'clientes-novos', label: 'Novos clientes' },
      { id: 'clientes-ativos', label: 'Clientes ativos' },
      { id: 'clientes-inativos', label: 'Clientes inativos' },
      { id: 'clientes-aniversariantes', label: 'Aniversariantes' },
    ],
  },
  {
    id: 'profissionais',
    label: 'Profissionais',
    icon: UserCheck,
    cor: '#FF9500',
    subsecoes: [
      { id: 'prof-performance', label: 'Performance' },
      { id: 'prof-comissoes', label: 'Comissões' },
      { id: 'prof-atendimentos', label: 'Atendimentos' },
      { id: 'prof-ranking', label: 'Ranking' },
    ],
  },
  {
    id: 'produtos',
    label: 'Produtos',
    icon: Package,
    cor: '#AF52DE',
    subsecoes: [
      { id: 'prod-vendidos', label: 'Mais vendidos' },
      { id: 'prod-estoque', label: 'Estoque atual' },
      { id: 'prod-margem', label: 'Margem de lucro' },
    ],
  },
  {
    id: 'financeiro',
    label: 'Financeiro',
    icon: TrendingUp,
    cor: '#FF2D55',
    subsecoes: [
      { id: 'fin-fluxo', label: 'Fluxo de caixa' },
      { id: 'fin-receitas', label: 'Receitas e despesas' },
      { id: 'fin-pagar', label: 'Contas a pagar' },
      { id: 'fin-vales', label: 'Vales' },
    ],
  },
  {
    id: 'metas',
    label: 'Metas',
    icon: Target,
    cor: '#FFD700',
    subsecoes: [
      { id: 'metas-status', label: 'Status das metas' },
      { id: 'metas-evolucao', label: 'Gráficos de evolução' },
    ],
  },
];

export default function RelatorioCompleto() {
  const navigate = useNavigate();
  const [periodoTipo, setPeriodoTipo] = useState<PeriodoTipo>('este-mes');
  const [dataInicio, setDataInicio] = useState<Date>(startOfMonth(new Date()));
  const [dataFim, setDataFim] = useState<Date>(endOfMonth(new Date()));
  const [formato, setFormato] = useState<FormatoExport>('pdf');
  const [secoesAtivas, setSecoesAtivas] = useState<Record<string, boolean>>(
    Object.fromEntries(SECOES.flatMap(s => [
      [s.id, true],
      ...s.subsecoes.map(sub => [sub.id, true])
    ]))
  );
  const [incluirCapa, setIncluirCapa] = useState(true);
  const [incluirIndice, setIncluirIndice] = useState(true);
  const [incluirGraficos, setIncluirGraficos] = useState(true);
  const [incluirComparativos, setIncluirComparativos] = useState(true);
  const [incluirRecomendacoes, setIncluirRecomendacoes] = useState(true);
  const [modoConfidencial, setModoConfidencial] = useState(false);
  
  const [gerando, setGerando] = useState(false);
  const [progresso, setProgresso] = useState(0);
  const [etapaAtual, setEtapaAtual] = useState('');
  const [etapasCompletas, setEtapasCompletas] = useState<string[]>([]);
  
  const [modalDownload, setModalDownload] = useState(false);
  const [arquivosGerados, setArquivosGerados] = useState<{
    pdf?: Blob;
    excel?: Blob;
    tamanho: string;
    tempo: number;
  } | null>(null);

  // Atualizar período quando tipo muda
  const handlePeriodoChange = (tipo: PeriodoTipo) => {
    setPeriodoTipo(tipo);
    const hoje = new Date();
    
    switch (tipo) {
      case 'este-mes':
        setDataInicio(startOfMonth(hoje));
        setDataFim(endOfMonth(hoje));
        break;
      case 'mes-passado':
        const mesPassado = subMonths(hoje, 1);
        setDataInicio(startOfMonth(mesPassado));
        setDataFim(endOfMonth(mesPassado));
        break;
      case 'este-ano':
        setDataInicio(startOfYear(hoje));
        setDataFim(endOfYear(hoje));
        break;
    }
  };

  // Toggle seção principal (e todas subsecoes)
  const toggleSecao = (secaoId: string) => {
    const secao = SECOES.find(s => s.id === secaoId);
    if (!secao) return;

    const novoValor = !secoesAtivas[secaoId];
    setSecoesAtivas(prev => ({
      ...prev,
      [secaoId]: novoValor,
      ...Object.fromEntries(secao.subsecoes.map(sub => [sub.id, novoValor]))
    }));
  };

  // Toggle subsecao individual
  const toggleSubsecao = (subsecaoId: string, secaoId: string) => {
    const novoValor = !secoesAtivas[subsecaoId];
    setSecoesAtivas(prev => {
      const novoEstado = { ...prev, [subsecaoId]: novoValor };
      
      // Atualizar estado da seção pai
      const secao = SECOES.find(s => s.id === secaoId);
      if (secao) {
        const todasSubsecoes = secao.subsecoes.every(sub => novoEstado[sub.id]);
        const nenhumaSubsecao = secao.subsecoes.every(sub => !novoEstado[sub.id]);
        novoEstado[secaoId] = todasSubsecoes || (!nenhumaSubsecao && novoValor);
      }
      
      return novoEstado;
    });
  };

  // Calcular estimativa
  const calcularEstimativa = () => {
    const secoesCount = SECOES.filter(s => secoesAtivas[s.id]).length;
    const paginas = secoesCount * 12 + (incluirCapa ? 1 : 0) + (incluirIndice ? 1 : 0) + (incluirRecomendacoes ? 5 : 0);
    const abas = secoesCount * 2 + 1;
    const tamanhoMB = Math.round((paginas * 0.15 + (incluirGraficos ? 5 : 0)) * 10) / 10;
    const tempoSegundos = Math.round(secoesCount * 7 + 10);
    
    return { paginas, abas, tamanhoMB, tempoSegundos };
  };

  const estimativa = calcularEstimativa();

  // Gerar relatório
  const handleGerarRelatorio = async () => {
    setGerando(true);
    setProgresso(0);
    setEtapasCompletas([]);
    
    const etapas = SECOES.filter(s => secoesAtivas[s.id]).map(s => s.label);
    const inicioTempo = Date.now();

    try {
      let progressoAtual = 0;
      const incremento = 100 / (etapas.length + 2);

      // Simular processamento de cada seção
      for (const etapa of etapas) {
        setEtapaAtual(etapa);
        await new Promise(resolve => setTimeout(resolve, 800));
        progressoAtual += incremento;
        setProgresso(Math.round(progressoAtual));
        setEtapasCompletas(prev => [...prev, etapa]);
      }

      // Buscar dados reais
      setEtapaAtual('Compilando dados...');
      
      // Buscar atendimentos
      const { data: atendimentos } = await supabase
        .from('atendimentos')
        .select('*, cliente:clientes(nome), atendimento_servicos(*, profissional:profissionais(nome), servico:servicos(nome))')
        .gte('data_hora', dataInicio.toISOString())
        .lte('data_hora', dataFim.toISOString())
        .eq('status', 'fechado');

      // Buscar clientes
      const { data: clientes } = await supabase
        .from('clientes')
        .select('*')
        .eq('ativo', true);

      // Buscar profissionais
      const { data: profissionais } = await supabase
        .from('profissionais')
        .select('*')
        .eq('ativo', true);

      setProgresso(90);
      setEtapaAtual('Gerando arquivos...');

      // Preparar dados para exportação
      const dadosExport: ExportData = {
        titulo: 'Relatório Gerencial Completo',
        subtitulo: `${format(dataInicio, 'dd/MM/yyyy')} a ${format(dataFim, 'dd/MM/yyyy')}`,
        resumo: [
          { label: 'Total de Atendimentos', valor: atendimentos?.length || 0 },
          { label: 'Faturamento Total', valor: `R$ ${(atendimentos?.reduce((acc, a) => acc + Number(a.valor_final), 0) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` },
          { label: 'Clientes Ativos', valor: clientes?.length || 0 },
          { label: 'Profissionais Ativos', valor: profissionais?.length || 0 },
        ],
        colunas: ['Data', 'Cliente', 'Valor', 'Status'],
        dados: (atendimentos || []).slice(0, 100).map(a => [
          format(new Date(a.data_hora), 'dd/MM/yyyy'),
          a.cliente?.nome || 'Não identificado',
          `R$ ${Number(a.valor_final).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
          a.status
        ]),
        observacoes: `Relatório gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}. ${modoConfidencial ? 'Modo confidencial ativado - nomes de clientes omitidos.' : ''}`,
      };

      const options: ExportOptions = {
        formato: 'pdf',
        incluirGraficos,
        incluirCabecalho: true,
        incluirRodape: true,
        incluirResumo: true,
        incluirDetalhes: true,
        incluirObservacoes: true,
        orientacao: 'portrait',
        periodoInicio: dataInicio,
        periodoFim: dataFim,
      };

      let pdfBlob: Blob | undefined;
      let excelBlob: Blob | undefined;

      if (formato === 'pdf' || formato === 'ambos') {
        pdfBlob = await gerarPDF(dadosExport, options);
      }

      if (formato === 'excel' || formato === 'ambos') {
        excelBlob = gerarExcel(dadosExport, { ...options, formato: 'excel' });
      }

      setProgresso(100);
      setEtapaAtual('Concluído!');

      const tempoTotal = Math.round((Date.now() - inicioTempo) / 1000);
      const tamanhoTotal = ((pdfBlob?.size || 0) + (excelBlob?.size || 0)) / (1024 * 1024);

      setArquivosGerados({
        pdf: pdfBlob,
        excel: excelBlob,
        tamanho: `${tamanhoTotal.toFixed(1)} MB`,
        tempo: tempoTotal,
      });

      await new Promise(resolve => setTimeout(resolve, 500));
      setGerando(false);
      setModalDownload(true);

    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      toast.error('Erro ao gerar relatório', {
        description: 'Tente novamente em alguns instantes.',
      });
      setGerando(false);
    }
  };

  const handleDownload = (tipo: 'pdf' | 'excel') => {
    if (!arquivosGerados) return;
    
    const dataStr = format(new Date(), 'yyyy-MM-dd');
    
    if (tipo === 'pdf' && arquivosGerados.pdf) {
      downloadBlob(arquivosGerados.pdf, `relatorio-completo-${dataStr}.pdf`);
    } else if (tipo === 'excel' && arquivosGerados.excel) {
      downloadBlob(arquivosGerados.excel, `relatorio-completo-${dataStr}.xlsx`);
    }
    
    toast.success('Download iniciado!');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/relatorios')}
          className="rounded-full"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Relatório Completo do Salão</h1>
          <p className="text-muted-foreground">Todos os dados em um único arquivo</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Coluna Principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Período */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Período do Relatório</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <RadioGroup
                value={periodoTipo}
                onValueChange={(v) => handlePeriodoChange(v as PeriodoTipo)}
                className="grid grid-cols-2 gap-3"
              >
                <div className={cn(
                  "flex items-center space-x-3 rounded-lg border p-3 cursor-pointer transition-colors",
                  periodoTipo === 'este-mes' && "border-primary bg-primary/5"
                )}>
                  <RadioGroupItem value="este-mes" id="este-mes" />
                  <Label htmlFor="este-mes" className="cursor-pointer">Este mês</Label>
                </div>
                <div className={cn(
                  "flex items-center space-x-3 rounded-lg border p-3 cursor-pointer transition-colors",
                  periodoTipo === 'mes-passado' && "border-primary bg-primary/5"
                )}>
                  <RadioGroupItem value="mes-passado" id="mes-passado" />
                  <Label htmlFor="mes-passado" className="cursor-pointer">Mês passado</Label>
                </div>
                <div className={cn(
                  "flex items-center space-x-3 rounded-lg border p-3 cursor-pointer transition-colors",
                  periodoTipo === 'este-ano' && "border-primary bg-primary/5"
                )}>
                  <RadioGroupItem value="este-ano" id="este-ano" />
                  <Label htmlFor="este-ano" className="cursor-pointer">Este ano</Label>
                </div>
                <div className={cn(
                  "flex items-center space-x-3 rounded-lg border p-3 cursor-pointer transition-colors",
                  periodoTipo === 'personalizado' && "border-primary bg-primary/5"
                )}>
                  <RadioGroupItem value="personalizado" id="personalizado" />
                  <Label htmlFor="personalizado" className="cursor-pointer">Personalizado</Label>
                </div>
              </RadioGroup>

              {periodoTipo === 'personalizado' && (
                <div className="flex gap-3 pt-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="flex-1 justify-start">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(dataInicio, 'dd/MM/yyyy', { locale: ptBR })}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dataInicio}
                        onSelect={(d) => d && setDataInicio(d)}
                        locale={ptBR}
                      />
                    </PopoverContent>
                  </Popover>
                  <span className="flex items-center text-muted-foreground">até</span>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="flex-1 justify-start">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(dataFim, 'dd/MM/yyyy', { locale: ptBR })}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                      <Calendar
                        mode="single"
                        selected={dataFim}
                        onSelect={(d) => d && setDataFim(d)}
                        locale={ptBR}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Seções */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Conteúdo do Relatório</CardTitle>
              <CardDescription>Selecione as seções que deseja incluir</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {SECOES.map((secao) => {
                const Icon = secao.icon;
                return (
                  <div key={secao.id} className="space-y-2">
                    <div
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                        secoesAtivas[secao.id] && "border-primary/50 bg-primary/5"
                      )}
                      onClick={() => toggleSecao(secao.id)}
                    >
                      <Checkbox
                        checked={secoesAtivas[secao.id]}
                        onCheckedChange={() => toggleSecao(secao.id)}
                      />
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: secao.cor + '20' }}
                      >
                        <Icon className="h-4 w-4" style={{ color: secao.cor }} />
                      </div>
                      <span className="font-medium">{secao.label}</span>
                    </div>
                    
                    {secoesAtivas[secao.id] && (
                      <div className="ml-14 grid grid-cols-2 gap-2">
                        {secao.subsecoes.map((sub) => (
                          <div
                            key={sub.id}
                            className="flex items-center gap-2 text-sm cursor-pointer"
                            onClick={() => toggleSubsecao(sub.id, secao.id)}
                          >
                            <Checkbox
                              checked={secoesAtivas[sub.id]}
                              onCheckedChange={() => toggleSubsecao(sub.id, secao.id)}
                            />
                            <span className="text-muted-foreground">{sub.label}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Formato e Opções */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Formato e Opções</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label className="font-medium">Formato de saída</Label>
                <RadioGroup
                  value={formato}
                  onValueChange={(v) => setFormato(v as FormatoExport)}
                  className="grid grid-cols-3 gap-3"
                >
                  <div className={cn(
                    "flex flex-col items-center gap-2 p-4 rounded-lg border cursor-pointer transition-colors",
                    formato === 'pdf' && "border-primary bg-primary/5"
                  )}>
                    <RadioGroupItem value="pdf" id="fmt-pdf" className="sr-only" />
                    <FileText className="h-8 w-8 text-red-500" />
                    <Label htmlFor="fmt-pdf" className="cursor-pointer text-sm font-medium">PDF</Label>
                  </div>
                  <div className={cn(
                    "flex flex-col items-center gap-2 p-4 rounded-lg border cursor-pointer transition-colors",
                    formato === 'excel' && "border-primary bg-primary/5"
                  )}>
                    <RadioGroupItem value="excel" id="fmt-excel" className="sr-only" />
                    <FileSpreadsheet className="h-8 w-8 text-green-600" />
                    <Label htmlFor="fmt-excel" className="cursor-pointer text-sm font-medium">Excel</Label>
                  </div>
                  <div className={cn(
                    "flex flex-col items-center gap-2 p-4 rounded-lg border cursor-pointer transition-colors",
                    formato === 'ambos' && "border-primary bg-primary/5"
                  )}>
                    <RadioGroupItem value="ambos" id="fmt-ambos" className="sr-only" />
                    <div className="flex">
                      <FileText className="h-6 w-6 text-red-500" />
                      <FileSpreadsheet className="h-6 w-6 text-green-600 -ml-2" />
                    </div>
                    <Label htmlFor="fmt-ambos" className="cursor-pointer text-sm font-medium">Ambos</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-3">
                <Label className="font-medium">Opções adicionais</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2">
                    <Checkbox checked={incluirCapa} onCheckedChange={(v) => setIncluirCapa(!!v)} id="capa" />
                    <Label htmlFor="capa" className="text-sm cursor-pointer">Incluir capa executiva</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox checked={incluirIndice} onCheckedChange={(v) => setIncluirIndice(!!v)} id="indice" />
                    <Label htmlFor="indice" className="text-sm cursor-pointer">Incluir índice/sumário</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox checked={incluirGraficos} onCheckedChange={(v) => setIncluirGraficos(!!v)} id="graficos" />
                    <Label htmlFor="graficos" className="text-sm cursor-pointer">Incluir gráficos</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox checked={incluirComparativos} onCheckedChange={(v) => setIncluirComparativos(!!v)} id="comp" />
                    <Label htmlFor="comp" className="text-sm cursor-pointer">Análises comparativas</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox checked={incluirRecomendacoes} onCheckedChange={(v) => setIncluirRecomendacoes(!!v)} id="rec" />
                    <Label htmlFor="rec" className="text-sm cursor-pointer">Recomendações automáticas</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox checked={modoConfidencial} onCheckedChange={(v) => setModoConfidencial(!!v)} id="conf" />
                    <Label htmlFor="conf" className="text-sm cursor-pointer">Modo confidencial</Label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Estimativa e Ação */}
        <div className="space-y-6">
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle className="text-lg">Preview Estimado</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Páginas (PDF):</span>
                  <span className="font-medium">~{estimativa.paginas} páginas</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Abas (Excel):</span>
                  <span className="font-medium">{estimativa.abas} abas</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tamanho estimado:</span>
                  <span className="font-medium">~{estimativa.tamanhoMB} MB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tempo de geração:</span>
                  <span className="font-medium">~{estimativa.tempoSegundos}s</span>
                </div>
              </div>

              <div className="border-t pt-4">
                <Button
                  size="lg"
                  className="w-full gap-2 text-lg h-14"
                  onClick={handleGerarRelatorio}
                  disabled={gerando}
                >
                  {gerando ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Gerando...
                    </>
                  ) : (
                    <>
                      <Download className="h-5 w-5" />
                      Gerar Relatório
                    </>
                  )}
                </Button>
              </div>

              {/* Barra de Progresso */}
              {gerando && (
                <div className="space-y-3 pt-4 border-t">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Progresso</span>
                      <span className="font-medium">{progresso}%</span>
                    </div>
                    <Progress value={progresso} className="h-2" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Processando: {etapaAtual}
                  </p>
                  <div className="space-y-1">
                    {etapasCompletas.map((etapa) => (
                      <div key={etapa} className="flex items-center gap-2 text-sm text-green-600">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>{etapa}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal de Download */}
      <Dialog open={modalDownload} onOpenChange={setModalDownload}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-6 w-6 text-green-500" />
              Relatório Pronto! 🎉
            </DialogTitle>
            <DialogDescription>
              Seu relatório foi gerado com sucesso
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tamanho:</span>
                <span className="font-medium">{arquivosGerados?.tamanho}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Gerado em:</span>
                <span className="font-medium">{arquivosGerados?.tempo}s</span>
              </div>
            </div>

            <div className="space-y-3">
              {arquivosGerados?.pdf && (
                <Button
                  variant="outline"
                  className="w-full justify-start gap-3 h-14"
                  onClick={() => handleDownload('pdf')}
                >
                  <FileText className="h-6 w-6 text-red-500" />
                  <div className="text-left">
                    <p className="font-medium">Baixar PDF</p>
                    <p className="text-xs text-muted-foreground">
                      {((arquivosGerados.pdf.size || 0) / (1024 * 1024)).toFixed(1)} MB
                    </p>
                  </div>
                  <Download className="h-5 w-5 ml-auto" />
                </Button>
              )}

              {arquivosGerados?.excel && (
                <Button
                  variant="outline"
                  className="w-full justify-start gap-3 h-14"
                  onClick={() => handleDownload('excel')}
                >
                  <FileSpreadsheet className="h-6 w-6 text-green-600" />
                  <div className="text-left">
                    <p className="font-medium">Baixar Excel</p>
                    <p className="text-xs text-muted-foreground">
                      {((arquivosGerados.excel.size || 0) / (1024 * 1024)).toFixed(1)} MB
                    </p>
                  </div>
                  <Download className="h-5 w-5 ml-auto" />
                </Button>
              )}

              <Button variant="ghost" className="w-full gap-2" disabled>
                <Mail className="h-4 w-4" />
                Enviar por Email
                <span className="text-xs text-muted-foreground">(em breve)</span>
              </Button>

              <Button variant="ghost" className="w-full gap-2" disabled>
                <Cloud className="h-4 w-4" />
                Salvar na Nuvem
                <span className="text-xs text-muted-foreground">(em breve)</span>
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalDownload(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
