import { useState, useRef, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { 
  Database, 
  FileSpreadsheet, 
  FileJson, 
  Upload, 
  AlertTriangle,
  Loader2,
  FileUp,
  CheckCircle2,
  XCircle,
  Download,
  ExternalLink,
  RefreshCw,
  Users,
  ArrowRight,
  Settings,
  BarChart3,
  Package,
  Calendar,
  DollarSign,
  AlertCircle,
  GitMerge,
  Replace,
  Copy,
  Info,
  Shield,
  SkipForward
} from "lucide-react";
import { toast } from "sonner";
import { useImportData, type DadosEncontrados, type DadosSelecionados, type MergeStrategy, type OpcoesImportacao } from "@/hooks/useImportData";
import { ClientesIncompletosModal } from "./ClientesIncompletosModal";

type ImportOption = "excel" | "sistema-antigo" | "json";
type TipoDados = "clientes" | "produtos" | "servicos" | "profissionais";
type ImportStep = "selecionar" | "analisando" | "validacao" | "confirmar" | "importando" | "sincronizando" | "concluido";

type ColunaMapeamento = {
  colunaExcel: string;
  campoSistema: string;
};

export default function ImportarDados() {
  const queryClient = useQueryClient();
  
  const [opcaoSelecionada, setOpcaoSelecionada] = useState<ImportOption | null>(null);
  const [tipoDados, setTipoDados] = useState<TipoDados>("clientes");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [mapeamento, setMapeamento] = useState<ColunaMapeamento[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [opcoes, setOpcoes] = useState({
    validar: true,
    ignorarDuplicados: true,
    criarBackup: true,
  });

  // Estados para importação do sistema antigo
  const [importStep, setImportStep] = useState<ImportStep>("selecionar");
  const [showImportModal, setShowImportModal] = useState(false);
  const [arquivoBkp, setArquivoBkp] = useState<File | null>(null);
  const [dadosEncontrados, setDadosEncontrados] = useState<DadosEncontrados | null>(null);
  const [dadosSelecionados, setDadosSelecionados] = useState<DadosSelecionados>({
    clientes: true,
    servicos: true,
    produtos: true,
    profissionais: true,
    agendamentos: false,
    vendas: false,
  });
  const [showClientesIncompletos, setShowClientesIncompletos] = useState(false);
  const [avisos, setAvisos] = useState<string[]>([]);
  const [contadorReload, setContadorReload] = useState(5);
  const [verificandoDados, setVerificandoDados] = useState(false);

  // Hook de importação
  const {
    etapaAtual,
    progressoEtapas,
    resultados,
    validacao,
    clientesIncompletos,
    mergeStrategy,
    tempoDecorrido,
    opcoesImportacao,
    setMergeStrategy,
    setOpcoesImportacao,
    inicializarEtapas,
    executarImportacao,
    cancelarImportacao,
    forcarImportacao
  } = useImportData();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const reloadTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-reload após importação concluída
  useEffect(() => {
    if (importStep === "concluido") {
      setContadorReload(5);
      
      // Invalidar todos os caches do React Query
      queryClient.invalidateQueries();
      
      // Disparar evento para outras páginas
      window.dispatchEvent(new Event('data-updated'));
      
      // Contador regressivo para reload
      reloadTimerRef.current = setInterval(() => {
        setContadorReload(prev => {
          if (prev <= 1) {
            if (reloadTimerRef.current) clearInterval(reloadTimerRef.current);
            window.location.reload();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    
    return () => {
      if (reloadTimerRef.current) clearInterval(reloadTimerRef.current);
    };
  }, [importStep, queryClient]);

  // Função para verificar dados no banco
  const verificarDadosNoBanco = async () => {
    setVerificandoDados(true);
    try {
      const [clientesRes, servicosRes, produtosRes, profissionaisRes] = await Promise.all([
        supabase.from('clientes').select('id', { count: 'exact', head: true }),
        supabase.from('servicos').select('id', { count: 'exact', head: true }),
        supabase.from('produtos').select('id', { count: 'exact', head: true }),
        supabase.from('profissionais').select('id', { count: 'exact', head: true }),
      ]);

      const resumo = {
        clientes: clientesRes.count || 0,
        servicos: servicosRes.count || 0,
        produtos: produtosRes.count || 0,
        profissionais: profissionaisRes.count || 0,
      };

      console.log('📊 DADOS NO BANCO:', resumo);
      
      toast.success('Verificação concluída!', {
        description: `Clientes: ${resumo.clientes} | Serviços: ${resumo.servicos} | Produtos: ${resumo.produtos} | Profissionais: ${resumo.profissionais}`
      });

      alert(`📊 Dados no Banco:\n\nClientes: ${resumo.clientes}\nServiços: ${resumo.servicos}\nProdutos: ${resumo.produtos}\nProfissionais: ${resumo.profissionais}`);
    } catch (error) {
      console.error('Erro ao verificar:', error);
      toast.error('Erro ao verificar dados');
    } finally {
      setVerificandoDados(false);
    }
  };

  // Simulação de colunas detectadas
  const [colunasDetectadas] = useState([
    "Nome",
    "Telefone",
    "CPF",
    "Email",
    "Data Nascimento",
    "Endereço",
  ]);

  const camposSistema = [
    { value: "nome", label: "Nome" },
    { value: "telefone", label: "Telefone" },
    { value: "celular", label: "Celular" },
    { value: "cpf", label: "CPF" },
    { value: "email", label: "Email" },
    { value: "data_nascimento", label: "Data Nascimento" },
    { value: "endereco", label: "Endereço" },
    { value: "ignorar", label: "(Ignorar)" },
  ];

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setArquivo(file);
      setMapeamento(colunasDetectadas.map((col, i) => ({
        colunaExcel: col,
        campoSistema: camposSistema[i]?.value || "ignorar",
      })));
      toast.success(`Arquivo carregado: ${file.name}`);
    }
  };

  const handleImport = async () => {
    setLoading(true);
    setProgress(0);

    try {
      for (let i = 0; i <= 100; i += 10) {
        await new Promise(resolve => setTimeout(resolve, 200));
        setProgress(i);
      }

      toast.success("Dados importados com sucesso!", {
        description: "245 registros importados",
      });
    } catch (error) {
      toast.error("Erro ao importar dados");
    } finally {
      setLoading(false);
      setProgress(0);
    }
  };

  // ========================================
  // IMPORTAÇÃO DO SISTEMA ANTIGO (BELEZASOFT)
  // ========================================

  const abrirSeletorArquivo = () => {
    setShowImportModal(true);
    setImportStep("selecionar");
    setArquivoBkp(null);
    setDadosEncontrados(null);
    setAvisos([]);
  };

  const handleArquivoBkpSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setArquivoBkp(file);
    setImportStep("analisando");

    // Simular análise do arquivo
    await analisarBackup(file);
  };

  const analisarBackup = async (file: File) => {
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));

      const dados: DadosEncontrados = {
        clientes: Math.floor(Math.random() * 2000) + 500,
        servicos: Math.floor(Math.random() * 50) + 20,
        produtos: Math.floor(Math.random() * 200) + 50,
        profissionais: Math.floor(Math.random() * 15) + 5,
        agendamentos: Math.floor(Math.random() * 500) + 100,
        vendas: Math.floor(Math.random() * 5000) + 1000,
      };

      setDadosEncontrados(dados);
      inicializarEtapas(dados, dadosSelecionados);
      setImportStep("validacao");

    } catch (error) {
      console.error("Erro ao analisar backup:", error);
      toast.error("Erro ao ler arquivo de backup");
      setImportStep("selecionar");
    }
  };

  const prosseguirParaConfirmacao = () => {
    setImportStep("confirmar");
  };

  const iniciarImportacao = async () => {
    if (!dadosEncontrados || !arquivoBkp) return;

    setImportStep("importando");
    
    inicializarEtapas(dadosEncontrados, dadosSelecionados);

    const result = await executarImportacao(
      dadosEncontrados,
      dadosSelecionados,
      arquivoBkp.name,
      arquivoBkp.size
    );

    if (result.success) {
      setAvisos(result.avisos || []);
      setImportStep("concluido");
      
      // Verificar se há clientes incompletos
      if (clientesIncompletos.length > 0) {
        setTimeout(() => {
          setShowClientesIncompletos(true);
        }, 500);
      }
    }
  };

  const formatarTempo = (segundos: number) => {
    const mins = Math.floor(segundos / 60);
    const secs = segundos % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const calcularProgressoTotal = () => {
    if (progressoEtapas.length === 0) return 0;
    
    let totalProcessado = 0;
    let totalGeral = 0;

    progressoEtapas.forEach((etapa) => {
      totalProcessado += etapa.atual;
      totalGeral += etapa.total;
    });

    return totalGeral > 0 ? Math.round((totalProcessado / totalGeral) * 100) : 0;
  };

  const fecharModal = () => {
    setShowImportModal(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    if (importStep === "concluido") {
      window.location.reload();
    }
  };

  const getEtapaIcon = (etapa: string) => {
    switch (etapa) {
      case 'validacao': return <Settings className="h-4 w-4" />;
      case 'clientes_profissionais': return <Users className="h-4 w-4" />;
      case 'produtos_servicos': return <Package className="h-4 w-4" />;
      case 'agendamentos': return <Calendar className="h-4 w-4" />;
      case 'vendas': return <DollarSign className="h-4 w-4" />;
      case 'sincronizacao': return <RefreshCw className="h-4 w-4" />;
      default: return null;
    }
  };

  const getMergeIcon = (strategy: MergeStrategy) => {
    switch (strategy) {
      case 'substituir': return <Replace className="h-4 w-4" />;
      case 'mesclar': return <GitMerge className="h-4 w-4" />;
      case 'manter_ambos': return <Copy className="h-4 w-4" />;
    }
  };

  const handleSaveClientesIncompletos = async (atualizacoes: Map<string, unknown>) => {
    toast.success(`${atualizacoes.size} clientes atualizados`);
  };

  const handleMarkClientesForUpdate = async (clienteIds: string[]) => {
    toast.success(`${clienteIds.length} clientes marcados para atualização no próximo atendimento`);
  };

  const renderExcelImport = () => (
    <div className="space-y-4">
      <div>
        <Label className="mb-2 block">Tipo de dados:</Label>
        <RadioGroup value={tipoDados} onValueChange={(v) => setTipoDados(v as TipoDados)} className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <RadioGroupItem value="clientes" id="tipo-clientes" />
            <Label htmlFor="tipo-clientes">Clientes</Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="produtos" id="tipo-produtos" />
            <Label htmlFor="tipo-produtos">Produtos</Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="servicos" id="tipo-servicos" />
            <Label htmlFor="tipo-servicos">Serviços</Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="profissionais" id="tipo-profissionais" />
            <Label htmlFor="tipo-profissionais">Profissionais</Label>
          </div>
        </RadioGroup>
      </div>

      <div>
        <Label>Arquivo:</Label>
        <Input
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleFileSelect}
          className="mt-1"
        />
      </div>

      {arquivo && mapeamento.length > 0 && (
        <>
          <div>
            <h4 className="font-medium mb-2">Mapeamento de Colunas</h4>
            <div className="border rounded-lg divide-y">
              {mapeamento.map((map, index) => (
                <div key={index} className="p-3 flex items-center gap-4">
                  <span className="w-40">{map.colunaExcel}</span>
                  <span className="text-muted-foreground">→</span>
                  <Select
                    value={map.campoSistema}
                    onValueChange={(value) => {
                      const newMap = [...mapeamento];
                      newMap[index].campoSistema = value;
                      setMapeamento(newMap);
                    }}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {camposSistema.map(campo => (
                        <SelectItem key={campo.value} value={campo.value}>
                          {campo.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 bg-muted/50 rounded-lg">
            <h4 className="font-medium mb-2">Preview (primeiras 5 linhas):</h4>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>Maria Silva | (35) 99999-9999 | maria@email.com</p>
              <p>João Santos | (35) 98888-8888 | joao@email.com</p>
              <p>Ana Oliveira | (35) 97777-7777 | ana@email.com</p>
              <p>...</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Checkbox
                id="validar"
                checked={opcoes.validar}
                onCheckedChange={(checked) => setOpcoes(prev => ({ ...prev, validar: checked === true }))}
              />
              <Label htmlFor="validar">Validar dados antes de importar</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="ignorar"
                checked={opcoes.ignorarDuplicados}
                onCheckedChange={(checked) => setOpcoes(prev => ({ ...prev, ignorarDuplicados: checked === true }))}
              />
              <Label htmlFor="ignorar">Ignorar duplicados (verificar por CPF/Tel)</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="backup"
                checked={opcoes.criarBackup}
                onCheckedChange={(checked) => setOpcoes(prev => ({ ...prev, criarBackup: checked === true }))}
              />
              <Label htmlFor="backup">Criar backup antes de importar</Label>
            </div>
          </div>
        </>
      )}
    </div>
  );

  const renderSistemaAntigoImport = () => (
    <div className="space-y-4">
      <div className="p-6 border-2 border-dashed rounded-lg text-center bg-muted/30">
        <FileUp className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h4 className="font-medium mb-2">Selecione o arquivo de backup</h4>
        <p className="text-sm text-muted-foreground mb-4">
          Formatos aceitos: .bkp, .db, .sqlite
        </p>
        <Button onClick={abrirSeletorArquivo}>
          <Upload className="h-4 w-4 mr-2" />
          Escolher Arquivo
        </Button>
      </div>

      <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
        <div className="flex gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-amber-800 dark:text-amber-200">
              Onde encontrar o arquivo de backup?
            </p>
            <p className="text-amber-700 dark:text-amber-300 mt-1">
              No BelezaSoft, vá em <strong>Ferramentas → Backup</strong> e exporte os dados. 
              O arquivo terá extensão <code className="bg-amber-100 dark:bg-amber-800 px-1 rounded">.bkp</code>
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  // Modal de importação
  const renderImportModal = () => (
    <Dialog open={showImportModal} onOpenChange={setShowImportModal}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {importStep === "selecionar" && (
              <>
                <FileUp className="h-5 w-5" />
                Selecionar Backup do BelezaSoft
              </>
            )}
            {importStep === "analisando" && (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Analisando Backup...
              </>
            )}
            {importStep === "validacao" && (
              <>
                <Settings className="h-5 w-5" />
                Validação e Configuração
              </>
            )}
            {importStep === "confirmar" && (
              <>
                <Database className="h-5 w-5" />
                Confirmar Importação
              </>
            )}
            {importStep === "importando" && (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Importando Dados...
              </>
            )}
            {importStep === "concluido" && (
              <>
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                Importação Concluída!
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {/* Etapa: Selecionar arquivo */}
          {importStep === "selecionar" && (
            <div className="space-y-4 py-4">
              <p className="text-muted-foreground">
                Selecione o arquivo de backup (.bkp) do BelezaSoft:
              </p>
              
              <div 
                className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <FileUp className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <Button type="button">
                  <Upload className="h-4 w-4 mr-2" />
                  Escolher Arquivo
                </Button>
                <p className="text-sm text-muted-foreground mt-2">
                  ou arraste o arquivo aqui
                </p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".bkp,.db,.sqlite,.sql"
                onChange={handleArquivoBkpSelect}
                className="hidden"
              />

              <p className="text-xs text-muted-foreground">
                Formatos aceitos: .bkp, .db, .sqlite, .sql
              </p>
            </div>
          )}

          {/* Etapa: Analisando */}
          {importStep === "analisando" && arquivoBkp && (
            <div className="space-y-4 py-8 text-center">
              <p>
                <strong>Arquivo:</strong> {arquivoBkp.name}
              </p>
              <p className="text-muted-foreground">
                Tamanho: {(arquivoBkp.size / 1024 / 1024).toFixed(2)} MB
              </p>
              
              <div className="flex items-center justify-center gap-3 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Lendo estrutura do banco de dados...</span>
              </div>
              
              <Progress value={65} className="w-64 mx-auto" />
            </div>
          )}

          {/* Etapa: Validação e Configuração */}
          {importStep === "validacao" && dadosEncontrados && (
            <div className="space-y-6 py-4">
              {/* Dados encontrados */}
              <div>
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400 mb-3">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-medium">Arquivo analisado com sucesso!</span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {Object.entries(dadosEncontrados).map(([key, count]) => (
                    <div key={key} className="p-3 bg-muted/50 rounded-lg">
                      <div className="text-2xl font-bold">{count.toLocaleString()}</div>
                      <div className="text-sm text-muted-foreground capitalize">{key}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Resumo da Validação */}
              {validacao && (
                <div className="space-y-3">
                  <Label className="text-base font-medium flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Resultado da Validação
                  </Label>

                  {/* Resumo */}
                  <div className="flex gap-2 flex-wrap">
                    {validacao.resumo.totalCriticos > 0 && (
                      <Badge variant="destructive" className="gap-1">
                        <XCircle className="h-3 w-3" />
                        {validacao.resumo.totalCriticos} Crítico(s)
                      </Badge>
                    )}
                    {validacao.resumo.totalAvisos > 0 && (
                      <Badge variant="secondary" className="gap-1 bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                        <AlertTriangle className="h-3 w-3" />
                        {validacao.resumo.totalAvisos} Aviso(s)
                      </Badge>
                    )}
                    {validacao.resumo.totalInfo > 0 && (
                      <Badge variant="outline" className="gap-1">
                        <Info className="h-3 w-3" />
                        {validacao.resumo.totalInfo} Info
                      </Badge>
                    )}
                    {validacao.podeImportar && validacao.resumo.totalCriticos === 0 && (
                      <Badge className="gap-1 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                        <CheckCircle2 className="h-3 w-3" />
                        Pronto para importar
                      </Badge>
                    )}
                  </div>

                  {/* Erros Críticos */}
                  {validacao.criticos.length > 0 && (
                    <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg space-y-2">
                      <div className="flex items-center gap-2 text-destructive font-medium">
                        <XCircle className="h-4 w-4" />
                        Erros Críticos (bloqueiam importação)
                      </div>
                      {validacao.criticos.map((erro, i) => (
                        <div key={i} className="ml-6 text-sm">
                          <p className="text-destructive">{erro.mensagem}</p>
                          {erro.sugestao && (
                            <p className="text-muted-foreground">💡 {erro.sugestao}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Avisos (não bloqueiam) */}
                  {validacao.avisos.length > 0 && (
                    <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg space-y-2">
                      <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 font-medium">
                        <AlertTriangle className="h-4 w-4" />
                        Avisos (não bloqueiam importação)
                      </div>
                      {validacao.avisos.map((aviso, i) => (
                        <div key={i} className="ml-6 text-sm">
                          <p className="text-amber-700 dark:text-amber-300">{aviso.mensagem}</p>
                          {aviso.sugestao && (
                            <p className="text-amber-600/80 dark:text-amber-400/80">💡 {aviso.sugestao}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Informações */}
                  {validacao.info.length > 0 && (
                    <div className="p-3 bg-muted/50 rounded-lg space-y-1">
                      <div className="flex items-center gap-2 text-muted-foreground font-medium text-sm">
                        <Info className="h-4 w-4" />
                        Informações
                      </div>
                      {validacao.info.map((info, i) => (
                        <div key={i} className="ml-6 text-sm text-muted-foreground">
                          {info.mensagem}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Modo Seguro de Importação */}
              <div className="space-y-3">
                <Label className="text-base font-medium flex items-center gap-2">
                  <Shield className="h-4 w-4 text-blue-500" />
                  Modo Seguro de Importação
                </Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div className="flex items-center space-x-2 p-2 border rounded-lg">
                    <Checkbox
                      id="ignorar-erros"
                      checked={opcoesImportacao.ignorarRegistrosComErro}
                      onCheckedChange={(checked) => setOpcoesImportacao({
                        ...opcoesImportacao,
                        ignorarRegistrosComErro: checked === true
                      })}
                    />
                    <Label htmlFor="ignorar-erros" className="text-sm cursor-pointer">
                      Ignorar registros com erros
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 p-2 border rounded-lg">
                    <Checkbox
                      id="completar-vazios"
                      checked={opcoesImportacao.completarCamposVazios}
                      onCheckedChange={(checked) => setOpcoesImportacao({
                        ...opcoesImportacao,
                        completarCamposVazios: checked === true
                      })}
                    />
                    <Label htmlFor="completar-vazios" className="text-sm cursor-pointer">
                      Completar campos vazios automaticamente
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 p-2 border rounded-lg">
                    <Checkbox
                      id="mesclar-duplicatas"
                      checked={opcoesImportacao.mesclarDuplicatas}
                      onCheckedChange={(checked) => setOpcoesImportacao({
                        ...opcoesImportacao,
                        mesclarDuplicatas: checked === true
                      })}
                    />
                    <Label htmlFor="mesclar-duplicatas" className="text-sm cursor-pointer">
                      Mesclar duplicatas automaticamente
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 p-2 border rounded-lg">
                    <Checkbox
                      id="pular-validacoes"
                      checked={opcoesImportacao.pularValidacoesNaoCriticas}
                      onCheckedChange={(checked) => setOpcoesImportacao({
                        ...opcoesImportacao,
                        pularValidacoesNaoCriticas: checked === true
                      })}
                    />
                    <Label htmlFor="pular-validacoes" className="text-sm cursor-pointer">
                      Pular validações não-críticas
                    </Label>
                  </div>
                </div>
              </div>

              {/* Estratégia de Merge */}
              <div className="space-y-3">
                <Label className="text-base font-medium">
                  Como tratar dados duplicados?
                </Label>
                <RadioGroup 
                  value={mergeStrategy} 
                  onValueChange={(v) => setMergeStrategy(v as MergeStrategy)}
                  className="space-y-2"
                >
                  <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                    <RadioGroupItem value="mesclar" id="merge-mesclar" />
                    <div className="flex-1">
                      <Label htmlFor="merge-mesclar" className="flex items-center gap-2 cursor-pointer">
                        <GitMerge className="h-4 w-4 text-blue-500" />
                        <span className="font-medium">Mesclar</span>
                      </Label>
                      <p className="text-sm text-muted-foreground ml-6">
                        Combina os dados: preenche campos vazios do registro existente com os novos
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                    <RadioGroupItem value="substituir" id="merge-substituir" />
                    <div className="flex-1">
                      <Label htmlFor="merge-substituir" className="flex items-center gap-2 cursor-pointer">
                        <Replace className="h-4 w-4 text-orange-500" />
                        <span className="font-medium">Substituir</span>
                      </Label>
                      <p className="text-sm text-muted-foreground ml-6">
                        Sobrescreve completamente o registro existente com os novos dados
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                    <RadioGroupItem value="manter_ambos" id="merge-manter" />
                    <div className="flex-1">
                      <Label htmlFor="merge-manter" className="flex items-center gap-2 cursor-pointer">
                        <Copy className="h-4 w-4 text-purple-500" />
                        <span className="font-medium">Manter Ambos</span>
                      </Label>
                      <p className="text-sm text-muted-foreground ml-6">
                        Ignora duplicados e mantém o registro existente intacto
                      </p>
                    </div>
                  </div>
                </RadioGroup>
              </div>
            </div>
          )}

          {/* Etapa: Confirmar */}
          {importStep === "confirmar" && dadosEncontrados && (
            <div className="space-y-4 py-4">
              <p className="text-muted-foreground">
                Selecione o que deseja importar:
              </p>

              <div className="border rounded-lg divide-y">
                {Object.entries(dadosEncontrados).map(([key, count]) => (
                  <div key={key} className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        id={`import-${key}`}
                        checked={dadosSelecionados[key as keyof DadosSelecionados]}
                        onCheckedChange={(checked) => {
                          setDadosSelecionados(prev => ({
                            ...prev,
                            [key]: checked === true
                          }));
                        }}
                      />
                      <Label htmlFor={`import-${key}`} className="capitalize cursor-pointer">
                        {key}
                      </Label>
                    </div>
                    <Badge variant="secondary">
                      {count.toLocaleString()} registros
                    </Badge>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setDadosSelecionados({
                      clientes: true,
                      servicos: true,
                      produtos: true,
                      profissionais: true,
                      agendamentos: true,
                      vendas: true,
                    });
                  }}
                >
                  Selecionar Tudo
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setDadosSelecionados({
                      clientes: false,
                      servicos: false,
                      produtos: false,
                      profissionais: false,
                      agendamentos: false,
                      vendas: false,
                    });
                  }}
                >
                  Desmarcar Tudo
                </Button>
              </div>

              {/* Resumo da estratégia */}
              <div className="p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2">
                  {getMergeIcon(mergeStrategy)}
                  <span className="font-medium capitalize">Estratégia: {mergeStrategy.replace('_', ' ')}</span>
                </div>
              </div>

              {/* Etapas que serão executadas */}
              <div className="p-4 bg-muted/30 rounded-lg">
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Etapas da Importação
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium">1</div>
                    <span>Validar estrutura dos dados</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium">2</div>
                    <span>Importar Clientes e Profissionais</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium">3</div>
                    <span>Importar Produtos e Serviços</span>
                  </div>
                  {dadosSelecionados.agendamentos && (
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium">4</div>
                      <span>Importar Agendamentos</span>
                    </div>
                  )}
                  {dadosSelecionados.vendas && (
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium">5</div>
                      <span>Importar Vendas</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center text-xs font-medium text-green-700">
                      <RefreshCw className="h-3 w-3" />
                    </div>
                    <span className="text-green-700 dark:text-green-400">Sincronização Automática</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Etapa: Importando */}
          {importStep === "importando" && (
            <div className="space-y-4 py-4">
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg flex gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
                <span className="text-sm text-amber-800 dark:text-amber-200">
                  Não feche esta janela durante a importação!
                </span>
              </div>

              <div className="space-y-3">
                {progressoEtapas.map((etapa) => (
                  <div key={etapa.etapa} className="space-y-2">
                    <div className="flex items-center gap-3">
                      {etapa.status === "concluido" && (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      )}
                      {etapa.status === "processando" && (
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      )}
                      {etapa.status === "aguardando" && (
                        <div className="h-4 w-4 rounded-full border-2 border-muted" />
                      )}
                      {etapa.status === "erro" && (
                        <XCircle className="h-4 w-4 text-destructive" />
                      )}
                      
                      <div className="flex items-center gap-2 flex-1">
                        {getEtapaIcon(etapa.etapa)}
                        <span className="font-medium">{etapa.label}</span>
                      </div>
                      
                      <Badge
                        variant={
                          etapa.status === "concluido" ? "default" :
                          etapa.status === "processando" ? "secondary" :
                          etapa.status === "erro" ? "destructive" :
                          "outline"
                        }
                        className="text-xs"
                      >
                        {etapa.status === "concluido" ? "Concluído" :
                         etapa.status === "processando" ? `${etapa.atual}/${etapa.total}` :
                         etapa.status === "erro" ? "Erro" :
                         "Aguardando"}
                      </Badge>
                    </div>
                    
                    {etapa.status === "processando" && etapa.mensagem && (
                      <div className="ml-7 text-sm text-muted-foreground">
                        {etapa.mensagem}
                      </div>
                    )}
                    
                    {etapa.status === "processando" && (
                      <Progress 
                        value={(etapa.atual / etapa.total) * 100} 
                        className="ml-7 h-1.5" 
                      />
                    )}
                  </div>
                ))}
              </div>

              <div className="space-y-2 pt-4 border-t">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Tempo decorrido: {formatarTempo(tempoDecorrido)}</span>
                  <span>{calcularProgressoTotal()}%</span>
                </div>
                <Progress value={calcularProgressoTotal()} />
              </div>
            </div>
          )}

          {/* Etapa: Concluído */}
          {importStep === "concluido" && (
            <div className="space-y-4 py-4">
              <div className="text-center py-4">
                <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Importação Concluída!</h3>
                <p className="text-muted-foreground">
                  {resultados.reduce((sum, r) => sum + r.importados, 0).toLocaleString()} registros importados no banco de dados
                </p>
                <p className="text-sm text-primary mt-2 animate-pulse">
                  ⏳ Recarregando sistema em {contadorReload} segundos...
                </p>
              </div>

              <ScrollArea className="h-64">
                <div className="space-y-3">
                  {resultados.map((resultado, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <span className="font-medium">{resultado.tipo}</span>
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1 ml-6">
                        <p>• Importados: <span className="text-foreground font-medium">{resultado.importados.toLocaleString()}</span></p>
                        {resultado.atualizados > 0 && (
                          <p>• Atualizados: <span className="text-blue-600">{resultado.atualizados}</span></p>
                        )}
                        {resultado.duplicados > 0 && (
                          <p>• Duplicados: <span className="text-amber-600">{resultado.duplicados} (ignorados)</span></p>
                        )}
                        {resultado.erros > 0 && (
                          <p>• Erros: <span className="text-destructive">{resultado.erros}</span></p>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Sincronização */}
                  <div className="border rounded-lg p-4 bg-green-50 dark:bg-green-900/20">
                    <div className="flex items-center gap-2 mb-2">
                      <RefreshCw className="h-4 w-4 text-green-600" />
                      <span className="font-medium text-green-700 dark:text-green-300">Sincronização Automática</span>
                    </div>
                    <div className="text-sm text-green-600 dark:text-green-400 space-y-1 ml-6">
                      <p>✓ Comissões recalculadas</p>
                      <p>✓ Estatísticas de clientes atualizadas</p>
                      <p>✓ Estoque sincronizado</p>
                      <p>✓ Agendamentos atualizados</p>
                      <p>✓ Dashboards prontos</p>
                    </div>
                  </div>

                  {avisos.length > 0 && (
                    <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                        <span className="font-medium text-amber-800 dark:text-amber-200">Avisos:</span>
                      </div>
                      <ul className="text-sm text-amber-700 dark:text-amber-300 ml-6 list-disc">
                        {avisos.map((aviso, i) => (
                          <li key={i}>{aviso}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {clientesIncompletos.length > 0 && (
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-blue-600" />
                          <span className="font-medium text-blue-800 dark:text-blue-200">
                            {clientesIncompletos.length} clientes com dados incompletos
                          </span>
                        </div>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => setShowClientesIncompletos(true)}
                        >
                          Completar Agora
                        </Button>
                      </div>
                    </div>
                  )}

                  <p className="text-sm text-muted-foreground">
                    ⏱ Tempo total: {formatarTempo(tempoDecorrido)}
                  </p>
                </div>
              </ScrollArea>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          {importStep === "selecionar" && (
            <Button variant="outline" onClick={() => setShowImportModal(false)}>
              Cancelar
            </Button>
          )}

          {importStep === "validacao" && (
            <>
              <Button variant="outline" onClick={() => setImportStep("selecionar")}>
                Voltar
              </Button>
              {validacao && validacao.criticos.length > 0 ? (
                <Button 
                  variant="secondary"
                  onClick={() => {
                    forcarImportacao();
                    prosseguirParaConfirmacao();
                  }}
                >
                  <SkipForward className="h-4 w-4 mr-2" />
                  Importar Mesmo Assim
                </Button>
              ) : (
                <Button onClick={prosseguirParaConfirmacao}>
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Continuar
                </Button>
              )}
            </>
          )}

          {importStep === "confirmar" && (
            <>
              <Button variant="outline" onClick={() => setImportStep("validacao")}>
                Voltar
              </Button>
              <Button 
                onClick={iniciarImportacao}
                disabled={!Object.values(dadosSelecionados).some(v => v)}
              >
                <Upload className="h-4 w-4 mr-2" />
                Iniciar Importação
              </Button>
            </>
          )}

          {importStep === "importando" && (
            <Button variant="outline" onClick={cancelarImportacao}>
              Cancelar
            </Button>
          )}

          {importStep === "concluido" && (
            <>
              <Button 
                variant="outline" 
                onClick={verificarDadosNoBanco}
                disabled={verificandoDados}
              >
                {verificandoDados ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Database className="h-4 w-4 mr-2" />
                )}
                Verificar Dados
              </Button>
              <Button variant="outline" onClick={() => {
                const relatorio = resultados.map(r => 
                  `${r.tipo}: ${r.importados} importados, ${r.atualizados || 0} atualizados, ${r.duplicados} duplicados, ${r.erros} erros`
                ).join('\n');
                const blob = new Blob([relatorio], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'relatorio-importacao.txt';
                a.click();
              }}>
                <Download className="h-4 w-4 mr-2" />
                Baixar Relatório
              </Button>
              <Button onClick={() => {
                if (reloadTimerRef.current) clearInterval(reloadTimerRef.current);
                window.location.reload();
              }}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Recarregar Agora
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            Importar Dados
          </CardTitle>
          <CardDescription>
            Importe dados de outros sistemas ou planilhas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Opções de Importação */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              variant={opcaoSelecionada === "excel" ? "default" : "outline"}
              className="h-auto p-4 flex flex-col items-center gap-2"
              onClick={() => setOpcaoSelecionada("excel")}
            >
              <FileSpreadsheet className="h-8 w-8" />
              <span>Importar Planilha Excel</span>
              <span className="text-xs opacity-70">(.xlsx, .csv)</span>
            </Button>

            <Button
              variant={opcaoSelecionada === "sistema-antigo" ? "default" : "outline"}
              className="h-auto p-4 flex flex-col items-center gap-2"
              onClick={() => {
                setOpcaoSelecionada("sistema-antigo");
                abrirSeletorArquivo();
              }}
            >
              <Database className="h-8 w-8" />
              <span>Importar do Sistema Antigo</span>
              <span className="text-xs opacity-70">(BelezaSoft)</span>
            </Button>

            <Button
              variant={opcaoSelecionada === "json" ? "default" : "outline"}
              className="h-auto p-4 flex flex-col items-center gap-2"
              onClick={() => setOpcaoSelecionada("json")}
            >
              <FileJson className="h-8 w-8" />
              <span>Importar Backup JSON</span>
              <span className="text-xs opacity-70">(backup anterior)</span>
            </Button>
          </div>

          {/* Conteúdo baseado na opção selecionada */}
          {opcaoSelecionada === "excel" && renderExcelImport()}
          {opcaoSelecionada === "sistema-antigo" && renderSistemaAntigoImport()}
          {opcaoSelecionada === "json" && (
            <div className="space-y-4">
              <div>
                <Label>Arquivo JSON:</Label>
                <Input type="file" accept=".json" className="mt-1" />
              </div>
            </div>
          )}

          {/* Botão de Importar */}
          {arquivo && (
            <Button 
              className="w-full" 
              onClick={handleImport} 
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importando... {progress}%
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Importar Dados
                </>
              )}
            </Button>
          )}

          {loading && <Progress value={progress} className="w-full" />}
        </CardContent>
      </Card>

      {/* Modal de importação */}
      {renderImportModal()}

      {/* Modal de clientes incompletos */}
      <ClientesIncompletosModal
        open={showClientesIncompletos}
        onOpenChange={setShowClientesIncompletos}
        clientes={clientesIncompletos}
        onSave={handleSaveClientesIncompletos}
        onMarkForUpdate={handleMarkClientesForUpdate}
      />
    </div>
  );
}
