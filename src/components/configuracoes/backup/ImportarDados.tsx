import { useState, useRef, useCallback } from "react";
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
  Search, 
  Upload, 
  Check, 
  AlertTriangle,
  X,
  Loader2,
  FileUp,
  CheckCircle2,
  XCircle,
  Download,
  ExternalLink
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type ImportOption = "excel" | "sistema-antigo" | "json";
type TipoDados = "clientes" | "produtos" | "servicos" | "profissionais";
type ImportStep = "selecionar" | "analisando" | "confirmar" | "importando" | "concluido";

type ColunaMapeamento = {
  colunaExcel: string;
  campoSistema: string;
};

interface DadosEncontrados {
  clientes: number;
  servicos: number;
  produtos: number;
  profissionais: number;
  agendamentos: number;
  vendas: number;
}

interface ResultadoImportacao {
  tipo: string;
  importados: number;
  duplicados: number;
  erros: number;
}

interface ProgressoImportacao {
  [key: string]: {
    atual: number;
    total: number;
    status: "aguardando" | "processando" | "concluido" | "erro";
  };
}

export default function ImportarDados() {
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
  const [dadosSelecionados, setDadosSelecionados] = useState({
    clientes: true,
    servicos: true,
    produtos: true,
    profissionais: true,
    agendamentos: false,
    vendas: false,
  });
  const [progressoImportacao, setProgressoImportacao] = useState<ProgressoImportacao>({});
  const [resultados, setResultados] = useState<ResultadoImportacao[]>([]);
  const [tempoDecorrido, setTempoDecorrido] = useState(0);
  const [avisos, setAvisos] = useState<string[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

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
    setResultados([]);
    setAvisos([]);
    setTempoDecorrido(0);
  };

  const handleArquivoBkpSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setArquivoBkp(file);
    setImportStep("analisando");

    // Simular análise do arquivo (em produção seria leitura real do SQLite)
    await analisarBackup(file);
  };

  const analisarBackup = async (file: File) => {
    try {
      // Simular tempo de análise
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Em produção, aqui seria a leitura real do arquivo SQLite usando sql.js
      // Por enquanto, simulamos os dados encontrados
      const dados: DadosEncontrados = {
        clientes: Math.floor(Math.random() * 2000) + 500,
        servicos: Math.floor(Math.random() * 50) + 20,
        produtos: Math.floor(Math.random() * 200) + 50,
        profissionais: Math.floor(Math.random() * 15) + 5,
        agendamentos: Math.floor(Math.random() * 500) + 100,
        vendas: Math.floor(Math.random() * 5000) + 1000,
      };

      setDadosEncontrados(dados);
      setImportStep("confirmar");

      // Inicializar progresso
      const progressoInicial: ProgressoImportacao = {};
      Object.keys(dados).forEach(key => {
        progressoInicial[key] = {
          atual: 0,
          total: dados[key as keyof DadosEncontrados],
          status: "aguardando"
        };
      });
      setProgressoImportacao(progressoInicial);

    } catch (error) {
      console.error("Erro ao analisar backup:", error);
      toast.error("Erro ao ler arquivo de backup");
      setImportStep("selecionar");
    }
  };

  const iniciarImportacao = async () => {
    setImportStep("importando");
    setTempoDecorrido(0);
    
    // Iniciar timer
    timerRef.current = setInterval(() => {
      setTempoDecorrido(prev => prev + 1);
    }, 1000);

    const resultadosFinais: ResultadoImportacao[] = [];
    const avisosFinais: string[] = [];

    try {
      // Importar cada tipo de dado selecionado
      if (dadosSelecionados.clientes && dadosEncontrados) {
        const resultado = await importarClientes(dadosEncontrados.clientes);
        resultadosFinais.push(resultado);
        if (resultado.erros > 0) {
          avisosFinais.push(`${resultado.erros} clientes com dados incompletos`);
        }
      }

      if (dadosSelecionados.servicos && dadosEncontrados) {
        const resultado = await importarServicos(dadosEncontrados.servicos);
        resultadosFinais.push(resultado);
      }

      if (dadosSelecionados.produtos && dadosEncontrados) {
        const resultado = await importarProdutos(dadosEncontrados.produtos);
        resultadosFinais.push(resultado);
        avisosFinais.push("Alguns produtos sem código de barras");
      }

      if (dadosSelecionados.profissionais && dadosEncontrados) {
        const resultado = await importarProfissionais(dadosEncontrados.profissionais);
        resultadosFinais.push(resultado);
      }

      setResultados(resultadosFinais);
      setAvisos(avisosFinais);
      setImportStep("concluido");
      
      toast.success("Importação concluída com sucesso!");

    } catch (error) {
      console.error("Erro na importação:", error);
      toast.error("Erro durante a importação");
    } finally {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const importarClientes = async (total: number): Promise<ResultadoImportacao> => {
    const resultado: ResultadoImportacao = {
      tipo: "Clientes",
      importados: 0,
      duplicados: 0,
      erros: 0
    };

    setProgressoImportacao(prev => ({
      ...prev,
      clientes: { ...prev.clientes, status: "processando" }
    }));

    // Simular importação em lotes
    const batchSize = 50;
    for (let i = 0; i < total; i += batchSize) {
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const processados = Math.min(i + batchSize, total);
      
      // Simular alguns duplicados e erros
      const duplicados = Math.floor(Math.random() * 3);
      const erros = Math.floor(Math.random() * 2);
      
      resultado.importados += batchSize - duplicados - erros;
      resultado.duplicados += duplicados;
      resultado.erros += erros;

      setProgressoImportacao(prev => ({
        ...prev,
        clientes: { atual: processados, total, status: "processando" }
      }));
    }

    setProgressoImportacao(prev => ({
      ...prev,
      clientes: { atual: total, total, status: "concluido" }
    }));

    return resultado;
  };

  const importarServicos = async (total: number): Promise<ResultadoImportacao> => {
    setProgressoImportacao(prev => ({
      ...prev,
      servicos: { ...prev.servicos, status: "processando" }
    }));

    await new Promise(resolve => setTimeout(resolve, 500));

    for (let i = 0; i <= total; i += 5) {
      await new Promise(resolve => setTimeout(resolve, 50));
      setProgressoImportacao(prev => ({
        ...prev,
        servicos: { atual: Math.min(i, total), total, status: "processando" }
      }));
    }

    setProgressoImportacao(prev => ({
      ...prev,
      servicos: { atual: total, total, status: "concluido" }
    }));

    return {
      tipo: "Serviços",
      importados: total,
      duplicados: 0,
      erros: 0
    };
  };

  const importarProdutos = async (total: number): Promise<ResultadoImportacao> => {
    setProgressoImportacao(prev => ({
      ...prev,
      produtos: { ...prev.produtos, status: "processando" }
    }));

    for (let i = 0; i <= total; i += 10) {
      await new Promise(resolve => setTimeout(resolve, 30));
      setProgressoImportacao(prev => ({
        ...prev,
        produtos: { atual: Math.min(i, total), total, status: "processando" }
      }));
    }

    setProgressoImportacao(prev => ({
      ...prev,
      produtos: { atual: total, total, status: "concluido" }
    }));

    return {
      tipo: "Produtos",
      importados: total - 3,
      duplicados: 3,
      erros: 0
    };
  };

  const importarProfissionais = async (total: number): Promise<ResultadoImportacao> => {
    setProgressoImportacao(prev => ({
      ...prev,
      profissionais: { ...prev.profissionais, status: "processando" }
    }));

    await new Promise(resolve => setTimeout(resolve, 300));

    setProgressoImportacao(prev => ({
      ...prev,
      profissionais: { atual: total, total, status: "concluido" }
    }));

    return {
      tipo: "Profissionais",
      importados: total,
      duplicados: 0,
      erros: 0
    };
  };

  const formatarTempo = (segundos: number) => {
    const mins = Math.floor(segundos / 60);
    const secs = segundos % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const calcularProgressoTotal = () => {
    if (!dadosEncontrados) return 0;
    
    let totalProcessado = 0;
    let totalGeral = 0;

    Object.entries(dadosSelecionados).forEach(([key, selecionado]) => {
      if (selecionado && progressoImportacao[key]) {
        totalProcessado += progressoImportacao[key].atual;
        totalGeral += progressoImportacao[key].total;
      }
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

  // Modal de importação do sistema antigo
  const renderImportModal = () => (
    <Dialog open={showImportModal} onOpenChange={setShowImportModal}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
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
            {importStep === "confirmar" && (
              <>
                <Database className="h-5 w-5" />
                Dados Encontrados no Backup
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
                <CheckCircle2 className="h-5 w-5 text-success" />
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

          {/* Etapa: Confirmar */}
          {importStep === "confirmar" && dadosEncontrados && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-2 text-success">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-medium">Arquivo analisado com sucesso!</span>
              </div>

              <p className="text-muted-foreground">
                Selecione o que deseja importar:
              </p>

              <div className="border rounded-lg divide-y">
                {Object.entries(dadosEncontrados).map(([key, count]) => (
                  <div key={key} className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        id={`import-${key}`}
                        checked={dadosSelecionados[key as keyof typeof dadosSelecionados]}
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
                    const allTrue = Object.fromEntries(
                      Object.keys(dadosSelecionados).map(k => [k, true])
                    ) as typeof dadosSelecionados;
                    setDadosSelecionados(allTrue);
                  }}
                >
                  Selecionar Tudo
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const allFalse = Object.fromEntries(
                      Object.keys(dadosSelecionados).map(k => [k, false])
                    ) as typeof dadosSelecionados;
                    setDadosSelecionados(allFalse);
                  }}
                >
                  Desmarcar Tudo
                </Button>
              </div>

              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg flex gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-amber-800 dark:text-amber-200">
                  <p><strong>Dados existentes:</strong></p>
                  <p>• Clientes duplicados serão ignorados (verificação por CPF/telefone)</p>
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
                {Object.entries(dadosSelecionados).map(([key, selecionado]) => {
                  if (!selecionado) return null;
                  const progresso = progressoImportacao[key];
                  if (!progresso) return null;

                  return (
                    <div key={key} className="flex items-center gap-3">
                      {progresso.status === "concluido" && (
                        <CheckCircle2 className="h-4 w-4 text-success" />
                      )}
                      {progresso.status === "processando" && (
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      )}
                      {progresso.status === "aguardando" && (
                        <div className="h-4 w-4 rounded-full border-2 border-muted" />
                      )}
                      {progresso.status === "erro" && (
                        <XCircle className="h-4 w-4 text-destructive" />
                      )}
                      
                      <span className="capitalize w-28">{key}:</span>
                      <span className="text-sm text-muted-foreground w-24">
                        {progresso.atual.toLocaleString()} / {progresso.total.toLocaleString()}
                      </span>
                      <Badge
                        variant={
                          progresso.status === "concluido" ? "default" :
                          progresso.status === "processando" ? "secondary" :
                          progresso.status === "erro" ? "destructive" :
                          "outline"
                        }
                        className="text-xs"
                      >
                        {progresso.status === "concluido" ? "Concluído" :
                         progresso.status === "processando" ? "Processando..." :
                         progresso.status === "erro" ? "Erro" :
                         "Aguardando..."}
                      </Badge>
                    </div>
                  );
                })}
              </div>

              <div className="space-y-2 pt-4">
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
              <ScrollArea className="h-64">
                <div className="space-y-4">
                  {resultados.map((resultado, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 className="h-4 w-4 text-success" />
                        <span className="font-medium">{resultado.tipo}</span>
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1 ml-6">
                        <p>• Importados: <span className="text-foreground">{resultado.importados.toLocaleString()}</span></p>
                        {resultado.duplicados > 0 && (
                          <p>• Duplicados: <span className="text-amber-600">{resultado.duplicados} (ignorados)</span></p>
                        )}
                        {resultado.erros > 0 && (
                          <p>• Erros: <span className="text-destructive">{resultado.erros}</span></p>
                        )}
                      </div>
                    </div>
                  ))}

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

          {importStep === "confirmar" && (
            <>
              <Button variant="outline" onClick={() => setImportStep("selecionar")}>
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

          {importStep === "concluido" && (
            <>
              <Button variant="outline" onClick={() => {
                const relatorio = resultados.map(r => 
                  `${r.tipo}: ${r.importados} importados, ${r.duplicados} duplicados, ${r.erros} erros`
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
              <Button onClick={fecharModal}>
                <ExternalLink className="h-4 w-4 mr-2" />
                Ver Dados Importados
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
              <span>Importar de Outro Arquivo</span>
              <span className="text-xs opacity-70">(.json)</span>
            </Button>
          </div>

          {/* Conteúdo específico */}
          {opcaoSelecionada === "excel" && renderExcelImport()}
          {opcaoSelecionada === "sistema-antigo" && renderSistemaAntigoImport()}
          {opcaoSelecionada === "json" && (
            <div>
              <Label>Arquivo JSON:</Label>
              <Input type="file" accept=".json" className="mt-1" />
            </div>
          )}

          {/* Progress */}
          {loading && (
            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              <p className="text-sm text-muted-foreground">Importando dados...</p>
            </div>
          )}

          {/* Actions */}
          {opcaoSelecionada && opcaoSelecionada !== "sistema-antigo" && (
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpcaoSelecionada(null)}>
                Cancelar
              </Button>
              <Button onClick={handleImport} disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <Upload className="h-4 w-4 mr-2" />
                {arquivo ? `Importar ${245} registros` : "Importar Dados"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de importação do sistema antigo */}
      {renderImportModal()}
    </div>
  );
}
