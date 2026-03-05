import { useState, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Upload,
  FileSpreadsheet,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Trash2,
  Eye,
  Play,
  RefreshCw,
  Download,
  Users,
  Scissors,
  Package,
  UserCheck,
  Calendar,
  DollarSign,
  CreditCard,
  Building2,
  Boxes,
  Tags,
  Settings,
  FileCheck,
} from "lucide-react";
import { toast } from "sonner";

// Mapeamento de arquivos para tabelas
const FILE_MAPPINGS: Record<string, { tabela: string; icon: React.ReactNode; ordem: number; label: string }> = {
  'dados_salao': { tabela: 'configuracoes', icon: <Settings className="h-4 w-4" />, ordem: 1, label: 'Configurações do Salão' },
  'categorias_servicos': { tabela: 'categorias', icon: <Tags className="h-4 w-4" />, ordem: 2, label: 'Categorias de Serviços' },
  'clientes': { tabela: 'clientes', icon: <Users className="h-4 w-4" />, ordem: 3, label: 'Clientes' },
  'clientes_temp': { tabela: 'clientes', icon: <Users className="h-4 w-4" />, ordem: 3, label: 'Clientes' },
  'profissionais': { tabela: 'profissionais', icon: <UserCheck className="h-4 w-4" />, ordem: 4, label: 'Profissionais' },
  'servicos': { tabela: 'servicos', icon: <Scissors className="h-4 w-4" />, ordem: 5, label: 'Serviços' },
  'produtos': { tabela: 'produtos', icon: <Package className="h-4 w-4" />, ordem: 6, label: 'Produtos' },
  'fornecedores': { tabela: 'fornecedores', icon: <Building2 className="h-4 w-4" />, ordem: 7, label: 'Fornecedores' },
  'agenda': { tabela: 'agendamentos', icon: <Calendar className="h-4 w-4" />, ordem: 8, label: 'Agenda' },
  'agendamentos': { tabela: 'agendamentos', icon: <Calendar className="h-4 w-4" />, ordem: 8, label: 'Agendamentos' },
  'vendas': { tabela: 'atendimentos', icon: <DollarSign className="h-4 w-4" />, ordem: 9, label: 'Vendas' },
  'vendas_produtos': { tabela: 'atendimento_produtos', icon: <Package className="h-4 w-4" />, ordem: 10, label: 'Produtos Vendidos' },
  'vendas_servicos': { tabela: 'atendimento_servicos', icon: <Scissors className="h-4 w-4" />, ordem: 11, label: 'Serviços Vendidos' },
  'pagamentos': { tabela: 'pagamentos', icon: <CreditCard className="h-4 w-4" />, ordem: 12, label: 'Pagamentos' },
  'caixa': { tabela: 'caixa', icon: <DollarSign className="h-4 w-4" />, ordem: 13, label: 'Caixa' },
  'comissoes_servicos': { tabela: 'comissoes', icon: <DollarSign className="h-4 w-4" />, ordem: 14, label: 'Comissões' },
  'movimento_estoque': { tabela: 'estoque_movimentos', icon: <Boxes className="h-4 w-4" />, ordem: 15, label: 'Movimentação de Estoque' },
  'cheques': { tabela: 'cheques', icon: <CreditCard className="h-4 w-4" />, ordem: 16, label: 'Cheques' },
};

interface ArquivoMapeado {
  file: File;
  nomeOriginal: string;
  tipoDetectado: string | null;
  tabelaDestino: string | null;
  registros: number;
  preview: Record<string, unknown>[];
  status: 'pendente' | 'processando' | 'sucesso' | 'erro' | 'ignorado';
  mensagem?: string;
  selecionado: boolean;
  ordem: number;
}

interface ResultadoImportacao {
  arquivo: string;
  tabela: string;
  importados: number;
  atualizados: number;
  erros: number;
  status: 'sucesso' | 'parcial' | 'erro';
  mensagens: string[];
}

interface ImportacaoMassaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ImportacaoMassaModal({ open, onOpenChange }: ImportacaoMassaModalProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [step, setStep] = useState<'selecionar' | 'revisar' | 'importando' | 'concluido'>('selecionar');
  const [arquivos, setArquivos] = useState<ArquivoMapeado[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [arquivoPreview, setArquivoPreview] = useState<ArquivoMapeado | null>(null);
  const [resultados, setResultados] = useState<ResultadoImportacao[]>([]);
  const [progressoGeral, setProgressoGeral] = useState(0);
  const [arquivoAtual, setArquivoAtual] = useState(0);
  const [contadorReload, setContadorReload] = useState(5);

  // Detectar tipo de arquivo pelo nome
  const detectarTipoArquivo = (filename: string): { tipo: string | null; tabela: string | null; ordem: number } => {
    const baseName = filename.toLowerCase()
      .replace(/\.(csv|txt|json)$/i, '')
      .replace(/[-_\s]+/g, '_')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    for (const [key, mapping] of Object.entries(FILE_MAPPINGS)) {
      if (baseName.includes(key) || baseName === key) {
        return { tipo: key, tabela: mapping.tabela, ordem: mapping.ordem };
      }
    }
    
    return { tipo: null, tabela: null, ordem: 999 };
  };

  // Parse CSV
  const parseCSV = (content: string): Record<string, unknown>[] => {
    const lines = content.split(/\r?\n/).filter(line => line.trim());
    if (lines.length < 2) return [];

    let separator = ',';
    if (lines[0].includes(';') && !lines[0].includes(',')) separator = ';';
    if (lines[0].includes('\t')) separator = '\t';

    const headers = parseCSVLine(lines[0], separator).map(h =>
      h.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, '')
    );

    const rows: Record<string, unknown>[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i], separator);
      if (values.length === 0 || values.every(v => !v.trim())) continue;

      const row: Record<string, unknown> = {};
      headers.forEach((header, idx) => {
        row[header] = values[idx]?.trim() || '';
      });
      rows.push(row);
    }

    return rows;
  };

  const parseCSVLine = (line: string, separator: string): string[] => {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === separator && !inQuotes) {
        values.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current);
    return values.map(v => v.replace(/^"|"$/g, '').trim());
  };

  // Processar arquivos selecionados
  const processarArquivos = async (files: FileList | File[]) => {
    console.log('📁 Processando', Array.from(files).length, 'arquivos...');
    const novosArquivos: ArquivoMapeado[] = [];

    for (const file of Array.from(files)) {
      try {
        console.log(`📄 Lendo arquivo: ${file.name} (${file.size} bytes)`);
        const content = await file.text();
        console.log(`📄 Conteúdo lido: ${content.length} caracteres`);
        console.log(`📄 Primeiros 200 chars:`, content.substring(0, 200));
        
        const dados = parseCSV(content);
        console.log(`📊 Dados parseados: ${dados.length} registros`);
        if (dados.length > 0) {
          console.log(`📊 Colunas:`, Object.keys(dados[0]));
          console.log(`📊 Primeiro registro:`, dados[0]);
        }
        
        const { tipo, tabela, ordem } = detectarTipoArquivo(file.name);
        console.log(`📋 Tipo detectado: ${tipo}, Tabela: ${tabela}`);

        novosArquivos.push({
          file,
          nomeOriginal: file.name,
          tipoDetectado: tipo,
          tabelaDestino: tabela,
          registros: dados.length,
          preview: dados.slice(0, 5),
          status: 'pendente',
          selecionado: !!tabela,
          ordem: ordem,
        });
        
        toast.success(`Arquivo "${file.name}" processado: ${dados.length} registros`);
      } catch (error) {
        console.error(`❌ Erro ao processar ${file.name}:`, error);
        novosArquivos.push({
          file,
          nomeOriginal: file.name,
          tipoDetectado: null,
          tabelaDestino: null,
          registros: 0,
          preview: [],
          status: 'erro',
          mensagem: 'Erro ao ler arquivo',
          selecionado: false,
          ordem: 999,
        });
        toast.error(`Erro ao processar "${file.name}"`);
      }
    }

    // Ordenar por ordem de importação
    novosArquivos.sort((a, b) => a.ordem - b.ordem);
    
    console.log('📊 Total de arquivos processados:', novosArquivos.length);
    setArquivos(prev => [...prev, ...novosArquivos].sort((a, b) => a.ordem - b.ordem));
    setStep('revisar');
  };

  // Handlers de drag & drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processarArquivos(files);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processarArquivos(files);
    }
  };

  // Toggle seleção de arquivo
  const toggleArquivo = (index: number) => {
    setArquivos(prev => prev.map((arq, i) => 
      i === index ? { ...arq, selecionado: !arq.selecionado } : arq
    ));
  };

  // Remover arquivo
  const removerArquivo = (index: number) => {
    setArquivos(prev => prev.filter((_, i) => i !== index));
  };

  // Mapear dados para formato do Supabase
  const mapearParaSupabase = (dados: Record<string, unknown>[], tabela: string): Record<string, unknown>[] => {
    return dados.map(row => {
      const mapped: Record<string, unknown> = {};
      
      switch (tabela) {
        case 'clientes':
          mapped.nome = String(row.nome || row.name || row.cliente || '').trim();
          mapped.celular = String(row.celular || row.cel || row.telefone || row.fone || '').trim() || '00000000000';
          mapped.telefone = String(row.telefone || row.tel || row.fone || '').trim() || null;
          mapped.email = String(row.email || row.e_mail || '').trim().toLowerCase() || null;
          mapped.cpf = String(row.cpf || row.cpf_cnpj || '').trim() || null;
          mapped.data_nascimento = row.data_nascimento || row.nascimento || null;
          mapped.endereco = String(row.endereco || row.rua || '').trim() || null;
          mapped.bairro = String(row.bairro || '').trim() || null;
          mapped.cidade = String(row.cidade || '').trim() || null;
          mapped.estado = String(row.estado || row.uf || '').trim() || null;
          mapped.cep = String(row.cep || '').trim() || null;
          mapped.observacoes = String(row.observacoes || row.obs || '').trim() || null;
          break;
          
        case 'profissionais':
          mapped.nome = String(row.nome || row.name || row.profissional || '').trim();
          mapped.telefone = String(row.telefone || row.tel || row.celular || '').trim() || null;
          mapped.comissao_padrao = Number(row.comissao || row.comissao_padrao || 50);
          mapped.comissao_servicos = Number(row.comissao_servicos || row.comissao || 50);
          mapped.comissao_produtos = Number(row.comissao_produtos || 10);
          mapped.especialidade = String(row.especialidade || row.funcao || row.cargo || '').trim() || null;
          mapped.ativo = row.ativo !== false && row.ativo !== 'false' && row.ativo !== '0';
          mapped.cor_agenda = row.cor_agenda || '#3B82F6';
          break;
          
        case 'servicos':
          mapped.nome = String(row.nome || row.name || row.servico || row.descricao || '').trim();
          mapped.preco = Number(row.preco || row.valor || row.price || 0);
          mapped.duracao_minutos = Number(row.duracao || row.duracao_minutos || row.tempo || 30);
          mapped.comissao = Number(row.comissao || 50);
          mapped.descricao = String(row.descricao || row.description || '').trim() || null;
          mapped.categoria = String(row.categoria || row.category || '').trim() || null;
          mapped.ativo = true;
          break;
          
        case 'produtos':
          mapped.nome = String(row.nome || row.name || row.produto || row.descricao || '').trim();
          mapped.preco_venda = Number(row.preco_venda || row.preco || row.valor || 0);
          mapped.preco_custo = Number(row.preco_custo || row.custo || 0);
          mapped.estoque_atual = Number(row.estoque || row.estoque_atual || row.quantidade || 0);
          mapped.estoque_minimo = Number(row.estoque_minimo || 0);
          mapped.codigo_barras = String(row.codigo_barras || row.barcode || row.ean || '').trim() || null;
          mapped.categoria = String(row.categoria || '').trim() || null;
          mapped.descricao = String(row.descricao || '').trim() || null;
          mapped.ativo = true;
          break;
          
        default:
          Object.assign(mapped, row);
      }
      
      return mapped;
    }).filter(item => {
      // Validar que tem nome (campo obrigatório na maioria das tabelas)
      const nome = item.nome as string;
      return nome && nome.length > 0;
    });
  };

  // Executar importação em massa
  const executarImportacao = async () => {
    const arquivosSelecionados = arquivos.filter(a => a.selecionado && a.tabelaDestino);
    if (arquivosSelecionados.length === 0) {
      toast.error("Selecione pelo menos um arquivo para importar");
      return;
    }

    setStep('importando');
    setResultados([]);
    setProgressoGeral(0);
    setArquivoAtual(0);

    const novosResultados: ResultadoImportacao[] = [];
    const tabelasSuportadas = ['clientes', 'profissionais', 'servicos', 'produtos'];

    for (let i = 0; i < arquivosSelecionados.length; i++) {
      const arquivo = arquivosSelecionados[i];
      setArquivoAtual(i + 1);
      setArquivos(prev => prev.map(a => 
        a.nomeOriginal === arquivo.nomeOriginal ? { ...a, status: 'processando' } : a
      ));

      try {
        // Verificar se a tabela é suportada
        if (!arquivo.tabelaDestino || !tabelasSuportadas.includes(arquivo.tabelaDestino)) {
          setArquivos(prev => prev.map(a => 
            a.nomeOriginal === arquivo.nomeOriginal 
              ? { ...a, status: 'ignorado', mensagem: 'Tabela não suportada ainda' } 
              : a
          ));
          novosResultados.push({
            arquivo: arquivo.nomeOriginal,
            tabela: arquivo.tabelaDestino || 'desconhecida',
            importados: 0,
            atualizados: 0,
            erros: 0,
            status: 'erro',
            mensagens: ['Tabela não suportada ainda'],
          });
          continue;
        }

        const content = await arquivo.file.text();
        const dados = parseCSV(content);
        const dadosMapeados = mapearParaSupabase(dados, arquivo.tabelaDestino);

        if (dadosMapeados.length === 0) {
          throw new Error('Nenhum registro válido encontrado');
        }

        // Importar em batches de 100
        let importados = 0;
        let erros = 0;
        const batchSize = 100;
        const mensagens: string[] = [];

        console.log(`📥 Importando ${dadosMapeados.length} registros para ${arquivo.tabelaDestino}...`);
        console.log('📋 Amostra dos dados:', dadosMapeados.slice(0, 2));

        for (let j = 0; j < dadosMapeados.length; j += batchSize) {
          const batch = dadosMapeados.slice(j, j + batchSize);
          
          // Usar insert ao invés de upsert para evitar problemas de constraint
          const { data, error } = await supabase
            .from(arquivo.tabelaDestino as 'clientes' | 'profissionais' | 'servicos' | 'produtos')
            .insert(batch as never[])
            .select('id');

          if (error) {
            console.error(`❌ Erro ao importar batch ${j / batchSize + 1}:`, error);
            erros += batch.length;
            mensagens.push(`Lote ${j / batchSize + 1}: ${error.message}`);
          } else {
            console.log(`✅ Lote ${j / batchSize + 1} importado: ${data?.length || batch.length} registros`);
            importados += data?.length || batch.length;
          }

          // Atualizar progresso
          const progressoArquivo = ((j + batch.length) / dadosMapeados.length) * 100;
          const progressoTotal = ((i + progressoArquivo / 100) / arquivosSelecionados.length) * 100;
          setProgressoGeral(Math.round(progressoTotal));
          
          // Pequena pausa para não sobrecarregar
          await new Promise(r => setTimeout(r, 50));
        }

        console.log(`✅ ${arquivo.nomeOriginal}: ${importados} importados, ${erros} erros`);

        setArquivos(prev => prev.map(a => 
          a.nomeOriginal === arquivo.nomeOriginal 
            ? { ...a, status: erros === 0 ? 'sucesso' : 'erro', mensagem: `${importados} importados, ${erros} erros` } 
            : a
        ));

        novosResultados.push({
          arquivo: arquivo.nomeOriginal,
          tabela: arquivo.tabelaDestino,
          importados,
          atualizados: 0,
          erros,
          status: erros === 0 ? 'sucesso' : erros < importados ? 'parcial' : 'erro',
          mensagens,
        });

      } catch (error) {
        console.error(`Erro ao processar ${arquivo.nomeOriginal}:`, error);
        setArquivos(prev => prev.map(a => 
          a.nomeOriginal === arquivo.nomeOriginal 
            ? { ...a, status: 'erro', mensagem: String(error) } 
            : a
        ));
        novosResultados.push({
          arquivo: arquivo.nomeOriginal,
          tabela: arquivo.tabelaDestino || 'desconhecida',
          importados: 0,
          atualizados: 0,
          erros: arquivo.registros,
          status: 'erro',
          mensagens: [String(error)],
        });
      }

      setProgressoGeral(Math.round(((i + 1) / arquivosSelecionados.length) * 100));
    }

    setResultados(novosResultados);
    setStep('concluido');
    
    // Invalidar cache
    queryClient.invalidateQueries();
    window.dispatchEvent(new Event('data-updated'));

    // Iniciar contador de reload
    const timer = setInterval(() => {
      setContadorReload(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          window.location.reload();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    toast.success("Importação em massa concluída!");
  };

  const getStatusIcon = (status: ArquivoMapeado['status']) => {
    switch (status) {
      case 'sucesso':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'erro':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'processando':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case 'ignorado':
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      default:
        return <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: ArquivoMapeado['status']) => {
    switch (status) {
      case 'sucesso': return 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800';
      case 'erro': return 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800';
      case 'processando': return 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800';
      case 'ignorado': return 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800';
      default: return 'bg-muted/50';
    }
  };

  const resetModal = () => {
    setStep('selecionar');
    setArquivos([]);
    setResultados([]);
    setProgressoGeral(0);
    setArquivoAtual(0);
    setContadorReload(5);
  };

  const totalRegistros = arquivos.filter(a => a.selecionado).reduce((sum, a) => sum + a.registros, 0);
  const arquivosSelecionados = arquivos.filter(a => a.selecionado).length;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) resetModal();
      onOpenChange(isOpen);
    }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {step === 'selecionar' && (
              <>
                <Upload className="h-5 w-5 text-[#007AFF]" />
                Importação em Massa - BelezaSoft
              </>
            )}
            {step === 'revisar' && (
              <>
                <FileCheck className="h-5 w-5 text-[#007AFF]" />
                Revisar Arquivos ({arquivos.length})
              </>
            )}
            {step === 'importando' && (
              <>
                <Loader2 className="h-5 w-5 animate-spin text-[#007AFF]" />
                Importando... ({arquivoAtual}/{arquivosSelecionados})
              </>
            )}
            {step === 'concluido' && (
              <>
                <CheckCircle2 className="h-5 w-5 text-[#34C759]" />
                Importação Concluída!
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4">
          {/* Etapa: Selecionar arquivos */}
          {step === 'selecionar' && (
            <div className="space-y-4">
              {/* Área de drop */}
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
                  isDragging 
                    ? 'border-[#007AFF] bg-[#007AFF]/5' 
                    : 'border-muted-foreground/25 hover:border-[#007AFF]/50'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="font-semibold mb-2">Arraste os arquivos CSV aqui</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  ou clique para selecionar múltiplos arquivos
                </p>
                <Button type="button" className="bg-[#007AFF] hover:bg-[#0056b3]">
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Selecionar Arquivos CSV
                </Button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />

              {/* Instruções de mapeamento */}
              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Mapeamento Automático de Arquivos
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                  {Object.entries(FILE_MAPPINGS).slice(0, 12).map(([key, mapping]) => (
                    <div key={key} className="flex items-center gap-2 p-2 bg-background rounded">
                      {mapping.icon}
                      <span className="text-muted-foreground">{key}.csv</span>
                      <span className="text-xs">→</span>
                      <span className="font-medium">{mapping.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Etapa: Revisar arquivos */}
          {step === 'revisar' && (
            <div className="space-y-4">
              {/* Resumo */}
              <div className="flex items-center justify-between p-3 bg-[#007AFF]/10 rounded-lg">
                <div className="flex items-center gap-4">
                  <Badge className="bg-[#007AFF]">
                    {arquivosSelecionados} arquivos selecionados
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {totalRegistros.toLocaleString()} registros no total
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setArquivos(prev => prev.map(a => ({ ...a, selecionado: true })))}
                  >
                    Selecionar Todos
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    + Adicionar Mais
                  </Button>
                </div>
              </div>

              {/* Lista de arquivos */}
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {arquivos.map((arquivo, index) => (
                    <div 
                      key={index} 
                      className={`border rounded-lg p-3 transition-all ${getStatusColor(arquivo.status)}`}
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={arquivo.selecionado}
                          onCheckedChange={() => toggleArquivo(index)}
                          disabled={!arquivo.tabelaDestino}
                        />
                        
                        {getStatusIcon(arquivo.status)}
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium truncate">{arquivo.nomeOriginal}</span>
                            {arquivo.tipoDetectado && (
                              <Badge variant="secondary" className="text-xs">
                                {FILE_MAPPINGS[arquivo.tipoDetectado]?.label || arquivo.tipoDetectado}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <span>{arquivo.registros.toLocaleString()} registros</span>
                            {arquivo.tabelaDestino && (
                              <span>→ tabela: <code className="bg-muted px-1 rounded">{arquivo.tabelaDestino}</code></span>
                            )}
                            {arquivo.mensagem && (
                              <span className={arquivo.status === 'erro' ? 'text-red-600' : ''}>
                                {arquivo.mensagem}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          {arquivo.preview.length > 0 && step === 'revisar' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setArquivoPreview(arquivo)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removerArquivo(index)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {/* Aviso sobre ordem */}
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <div className="flex gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-amber-800 dark:text-amber-200">
                      Ordem de importação
                    </p>
                    <p className="text-amber-700 dark:text-amber-300">
                      Os arquivos serão importados na ordem correta para respeitar dependências 
                      (clientes antes de vendas, etc.)
                    </p>
                  </div>
                </div>
              </div>

              {/* Input file hidden */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          )}

          {/* Etapa: Importando */}
          {step === 'importando' && (
            <div className="space-y-6 py-4">
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg flex gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
                <span className="text-sm text-amber-800 dark:text-amber-200">
                  Não feche esta janela durante a importação!
                </span>
              </div>

              {/* Progresso geral */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progresso Geral</span>
                  <span className="font-medium">{progressoGeral}%</span>
                </div>
                <Progress value={progressoGeral} className="h-3" />
                <p className="text-sm text-muted-foreground text-center">
                  Importando arquivo {arquivoAtual} de {arquivosSelecionados}...
                </p>
              </div>

              {/* Lista de arquivos com status */}
              <ScrollArea className="h-[300px]">
                <div className="space-y-2">
                  {arquivos.filter(a => a.selecionado).map((arquivo, index) => (
                    <div 
                      key={index} 
                      className={`border rounded-lg p-3 ${getStatusColor(arquivo.status)}`}
                    >
                      <div className="flex items-center gap-3">
                        {getStatusIcon(arquivo.status)}
                        <div className="flex-1">
                          <span className="font-medium">{arquivo.nomeOriginal}</span>
                          {arquivo.mensagem && (
                            <p className="text-sm text-muted-foreground">{arquivo.mensagem}</p>
                          )}
                        </div>
                        <Badge variant="secondary">
                          {arquivo.registros} registros
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Etapa: Concluído */}
          {step === 'concluido' && (
            <div className="space-y-4">
              <div className="text-center py-4">
                <div className="w-16 h-16 rounded-full bg-[#34C759]/20 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="h-8 w-8 text-[#34C759]" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Importação Concluída!</h3>
                <p className="text-muted-foreground">
                  {resultados.reduce((sum, r) => sum + r.importados, 0).toLocaleString()} registros importados
                </p>
                <p className="text-sm text-[#007AFF] mt-2 animate-pulse">
                  ⏳ Recarregando sistema em {contadorReload} segundos...
                </p>
              </div>

              {/* Resultados por arquivo */}
              <ScrollArea className="h-[250px]">
                <div className="space-y-2">
                  {resultados.map((resultado, index) => (
                    <div 
                      key={index} 
                      className={`border rounded-lg p-3 ${
                        resultado.status === 'sucesso' 
                          ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' 
                          : resultado.status === 'parcial'
                          ? 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800'
                          : 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {resultado.status === 'sucesso' ? (
                          <CheckCircle2 className="h-4 w-4 text-[#34C759]" />
                        ) : resultado.status === 'parcial' ? (
                          <AlertTriangle className="h-4 w-4 text-amber-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-[#FF3B30]" />
                        )}
                        <div className="flex-1">
                          <span className="font-medium">{resultado.arquivo}</span>
                          <div className="text-sm text-muted-foreground">
                            {resultado.importados > 0 && (
                              <span className="text-[#34C759]">✓ {resultado.importados} importados </span>
                            )}
                            {resultado.erros > 0 && (
                              <span className="text-[#FF3B30]">✗ {resultado.erros} erros</span>
                            )}
                          </div>
                        </div>
                        <Badge variant="secondary">{resultado.tabela}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>

        {/* Preview Modal */}
        {arquivoPreview && (
          <Dialog open={!!arquivoPreview} onOpenChange={() => setArquivoPreview(null)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Preview: {arquivoPreview.nomeOriginal}</DialogTitle>
              </DialogHeader>
              <ScrollArea className="h-[300px]">
                <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
                  {JSON.stringify(arquivoPreview.preview, null, 2)}
                </pre>
              </ScrollArea>
            </DialogContent>
          </Dialog>
        )}

        <DialogFooter className="gap-2">
          {step === 'selecionar' && (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
          )}

          {step === 'revisar' && (
            <>
              <Button variant="outline" onClick={() => setStep('selecionar')}>
                Voltar
              </Button>
              <Button
                onClick={executarImportacao}
                disabled={arquivosSelecionados === 0}
                className="bg-[#007AFF] hover:bg-[#0056b3]"
              >
                <Play className="h-4 w-4 mr-2" />
                Processar {arquivosSelecionados} Arquivo(s)
              </Button>
            </>
          )}

          {step === 'concluido' && (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  const relatorio = resultados.map(r =>
                    `${r.arquivo}: ${r.importados} importados, ${r.erros} erros - ${r.tabela}`
                  ).join('\n');
                  const blob = new Blob([relatorio], { type: 'text/plain' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'relatorio-importacao-massa.txt';
                  a.click();
                }}
              >
                <Download className="h-4 w-4 mr-2" />
                Baixar Relatório
              </Button>
              <Button onClick={() => window.location.reload()} className="bg-[#34C759] hover:bg-[#2da94e]">
                <RefreshCw className="h-4 w-4 mr-2" />
                Recarregar Agora
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
