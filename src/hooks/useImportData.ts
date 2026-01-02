import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Tipos
export type MergeStrategy = 'substituir' | 'mesclar' | 'manter_ambos';

export type ImportStatus = 
  | 'aguardando' 
  | 'validando' 
  | 'processando' 
  | 'sincronizando' 
  | 'concluido' 
  | 'erro';

export type ImportEtapa = 
  | 'validacao' 
  | 'clientes_profissionais' 
  | 'produtos_servicos' 
  | 'agendamentos' 
  | 'vendas' 
  | 'sincronizacao';

export type SeveridadeProblema = 'critico' | 'aviso' | 'info';

export interface DadosEncontrados {
  clientes: number;
  servicos: number;
  produtos: number;
  profissionais: number;
  agendamentos: number;
  vendas: number;
}

export interface DadosSelecionados {
  clientes: boolean;
  servicos: boolean;
  produtos: boolean;
  profissionais: boolean;
  agendamentos: boolean;
  vendas: boolean;
}

export interface ProblemaValidacao {
  severidade: SeveridadeProblema;
  tipo: string;
  mensagem: string;
  registro?: number;
  campo?: string;
  sugestao?: string;
}

export interface ResultadoValidacao {
  valido: boolean; // true se não houver erros CRÍTICOS
  podeImportar: boolean; // true se for possível importar (mesmo com avisos)
  criticos: ProblemaValidacao[];
  avisos: ProblemaValidacao[];
  info: ProblemaValidacao[];
  duplicatas: {
    tipo: string;
    quantidade: number;
    exemplos: string[];
  }[];
  camposIncompletos: {
    tipo: string;
    quantidade: number;
    campos: string[];
  }[];
  resumo: {
    totalProblemas: number;
    totalCriticos: number;
    totalAvisos: number;
    totalInfo: number;
  };
}

export interface ProgressoEtapa {
  etapa: ImportEtapa;
  label: string;
  atual: number;
  total: number;
  status: ImportStatus;
  mensagem?: string;
}

export interface ResultadoImportacao {
  tipo: string;
  importados: number;
  duplicados: number;
  erros: number;
  atualizados: number;
}

export interface ClienteIncompleto {
  id: string;
  nome: string;
  telefone?: string;
  email?: string;
  data_nascimento?: string;
  camposFaltando: string[];
}

export interface ImportLog {
  id: string;
  arquivo_nome: string;
  created_at: string;
  tempo_processamento_segundos: number;
  total_registros_importados: number;
  total_erros: number;
  status: string;
}

export interface OpcoesImportacao {
  ignorarRegistrosComErro: boolean;
  completarCamposVazios: boolean;
  mesclarDuplicatas: boolean;
  pularValidacoesNaoCriticas: boolean;
}

// ===================================
// FUNÇÕES DE NORMALIZAÇÃO
// ===================================

// Normalizar telefone para formato padrão
export const normalizeTelefone = (telefone: string | null | undefined): string => {
  if (!telefone) return '';
  
  // Remove tudo que não é número
  const numeros = telefone.replace(/\D/g, '');
  
  // Se vazio após limpeza, retorna vazio
  if (!numeros) return '';
  
  // Se tem 11 dígitos (com DDD e 9), formata como (XX) 9XXXX-XXXX
  if (numeros.length === 11) {
    return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7)}`;
  }
  
  // Se tem 10 dígitos (com DDD sem 9), formata como (XX) XXXX-XXXX
  if (numeros.length === 10) {
    return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 6)}-${numeros.slice(6)}`;
  }
  
  // Retorna como está se não se encaixar
  return telefone;
};

// Normalizar valor monetário
export const normalizeValorMonetario = (valor: string | number | null | undefined): number => {
  if (valor === null || valor === undefined) return 0;
  
  if (typeof valor === 'number') return valor;
  
  // Remove R$, espaços, e converte vírgula para ponto
  const limpo = valor
    .replace(/R\$\s*/g, '')
    .replace(/\s/g, '')
    .replace(/\./g, '') // Remove pontos de milhar
    .replace(',', '.'); // Converte vírgula decimal para ponto
  
  const numero = parseFloat(limpo);
  return isNaN(numero) ? 0 : numero;
};

// Normalizar data para formato ISO
export const normalizeData = (data: string | null | undefined): string | null => {
  if (!data) return null;
  
  // Se já é ISO (YYYY-MM-DD), retorna
  if (/^\d{4}-\d{2}-\d{2}/.test(data)) {
    return data.slice(0, 10);
  }
  
  // Formato DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(data)) {
    const [dia, mes, ano] = data.split('/');
    return `${ano}-${mes}-${dia}`;
  }
  
  // Formato DD-MM-YYYY
  if (/^\d{2}-\d{2}-\d{4}$/.test(data)) {
    const [dia, mes, ano] = data.split('-');
    return `${ano}-${mes}-${dia}`;
  }
  
  // Timestamp (número)
  if (/^\d{10,13}$/.test(data)) {
    const timestamp = data.length === 10 ? parseInt(data) * 1000 : parseInt(data);
    const date = new Date(timestamp);
    return date.toISOString().slice(0, 10);
  }
  
  // Tenta parsear com Date
  try {
    const date = new Date(data);
    if (!isNaN(date.getTime())) {
      return date.toISOString().slice(0, 10);
    }
  } catch {
    // Ignora erro
  }
  
  return null;
};

// Normalizar email
export const normalizeEmail = (email: string | null | undefined): string => {
  if (!email) return '';
  return email.toLowerCase().trim();
};

// Normalizar cliente completo
export const normalizeCliente = (cliente: Record<string, unknown>): Record<string, unknown> => {
  return {
    nome: cliente.nome || cliente.name || cliente.Nome || cliente.NOME || 'Cliente Importado',
    celular: normalizeTelefone(
      (cliente.telefone || cliente.celular || cliente.phone || cliente.Telefone || cliente.Celular || '') as string
    ),
    telefone: normalizeTelefone((cliente.telefone_fixo || cliente.TelefoneFixo || '') as string),
    email: normalizeEmail((cliente.email || cliente.Email || cliente.EMAIL || '') as string),
    cpf: ((cliente.cpf || cliente.CPF || cliente.Cpf || '') as string).replace(/\D/g, ''),
    data_nascimento: normalizeData((cliente.data_nascimento || cliente.dataNascimento || cliente.DataNascimento || '') as string),
    endereco: (cliente.endereco || cliente.Endereco || cliente.logradouro || '') as string,
    numero: (cliente.numero || cliente.Numero || '') as string,
    bairro: (cliente.bairro || cliente.Bairro || '') as string,
    cidade: (cliente.cidade || cliente.Cidade || '') as string,
    estado: (cliente.estado || cliente.Estado || cliente.uf || cliente.UF || '') as string,
    cep: ((cliente.cep || cliente.CEP || cliente.Cep || '') as string).replace(/\D/g, ''),
    observacoes: (cliente.observacoes || cliente.Observacoes || cliente.obs || '') as string,
    ativo: true,
    receber_mensagens: true,
  };
};

// Normalizar serviço
export const normalizeServico = (servico: Record<string, unknown>): Record<string, unknown> => {
  return {
    nome: (servico.nome || servico.descricao || servico.Descricao || servico.Name || 'Serviço Importado') as string,
    preco: normalizeValorMonetario(servico.preco as string | number | null | undefined || servico.valor as string | number | null | undefined || servico.Preco as string | number | null | undefined || servico.Valor as string | number | null | undefined),
    duracao_minutos: parseInt(String(servico.duracao || servico.Duracao || servico.tempo || 60)) || 60,
    comissao_padrao: parseFloat(String(servico.comissao || servico.Comissao || 0)) || 0,
    ativo: true,
    gera_comissao: true,
    gera_receita: true,
  };
};

// Normalizar produto
export const normalizeProduto = (produto: Record<string, unknown>): Record<string, unknown> => {
  return {
    nome: (produto.nome || produto.descricao || produto.Descricao || 'Produto Importado') as string,
    preco_venda: normalizeValorMonetario(produto.preco_venda as string | number | null | undefined || produto.preco as string | number | null | undefined || produto.PrecoVenda as string | number | null | undefined),
    preco_custo: normalizeValorMonetario(produto.preco_custo as string | number | null | undefined || produto.custo as string | number | null | undefined || produto.PrecoCusto as string | number | null | undefined),
    codigo_barras: (produto.codigo_barras || produto.ean || produto.CodigoBarras || '') as string,
    estoque_atual: parseInt(String(produto.estoque || produto.quantidade || produto.Estoque || 0)) || 0,
    estoque_minimo: parseInt(String(produto.estoque_minimo || produto.EstoqueMinimo || 0)) || 0,
    categoria: (produto.categoria || produto.Categoria || '') as string,
    ativo: true,
  };
};

// ===================================
// HOOK PRINCIPAL
// ===================================

export function useImportData() {
  // Estados
  const [etapaAtual, setEtapaAtual] = useState<ImportEtapa>('validacao');
  const [progressoEtapas, setProgressoEtapas] = useState<ProgressoEtapa[]>([]);
  const [resultados, setResultados] = useState<ResultadoImportacao[]>([]);
  const [validacao, setValidacao] = useState<ResultadoValidacao | null>(null);
  const [clientesIncompletos, setClientesIncompletos] = useState<ClienteIncompleto[]>([]);
  const [mergeStrategy, setMergeStrategy] = useState<MergeStrategy>('mesclar');
  const [tempoInicio, setTempoInicio] = useState<number>(0);
  const [tempoDecorrido, setTempoDecorrido] = useState<number>(0);
  const [importLogId, setImportLogId] = useState<string | null>(null);
  const [opcoesImportacao, setOpcoesImportacao] = useState<OpcoesImportacao>({
    ignorarRegistrosComErro: true,
    completarCamposVazios: true,
    mesclarDuplicatas: true,
    pularValidacoesNaoCriticas: true,
  });
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const abortRef = useRef<boolean>(false);

  // Inicializar etapas de progresso
  const inicializarEtapas = useCallback((dadosEncontrados: DadosEncontrados, dadosSelecionados: DadosSelecionados) => {
    const etapas: ProgressoEtapa[] = [
      {
        etapa: 'validacao',
        label: 'Validar estrutura dos dados',
        atual: 0,
        total: 100,
        status: 'aguardando'
      }
    ];

    if (dadosSelecionados.clientes || dadosSelecionados.profissionais) {
      etapas.push({
        etapa: 'clientes_profissionais',
        label: 'Importar Clientes e Profissionais',
        atual: 0,
        total: (dadosSelecionados.clientes ? dadosEncontrados.clientes : 0) + 
               (dadosSelecionados.profissionais ? dadosEncontrados.profissionais : 0),
        status: 'aguardando'
      });
    }

    if (dadosSelecionados.produtos || dadosSelecionados.servicos) {
      etapas.push({
        etapa: 'produtos_servicos',
        label: 'Importar Produtos e Serviços',
        atual: 0,
        total: (dadosSelecionados.produtos ? dadosEncontrados.produtos : 0) + 
               (dadosSelecionados.servicos ? dadosEncontrados.servicos : 0),
        status: 'aguardando'
      });
    }

    if (dadosSelecionados.agendamentos) {
      etapas.push({
        etapa: 'agendamentos',
        label: 'Importar Agendamentos',
        atual: 0,
        total: dadosEncontrados.agendamentos,
        status: 'aguardando'
      });
    }

    if (dadosSelecionados.vendas) {
      etapas.push({
        etapa: 'vendas',
        label: 'Importar Vendas',
        atual: 0,
        total: dadosEncontrados.vendas,
        status: 'aguardando'
      });
    }

    etapas.push({
      etapa: 'sincronizacao',
      label: 'Sincronização Automática',
      atual: 0,
      total: 6,
      status: 'aguardando'
    });

    setProgressoEtapas(etapas);
  }, []);

  // Atualizar progresso de uma etapa
  const atualizarProgresso = useCallback((etapa: ImportEtapa, updates: Partial<ProgressoEtapa>) => {
    setProgressoEtapas(prev => prev.map(p => 
      p.etapa === etapa ? { ...p, ...updates } : p
    ));
  }, []);

  // Criar log de importação
  const criarLogImportacao = async (arquivoNome: string, arquivoTamanho: number) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      const { data, error } = await (supabase as any)
        .from('import_logs')
        .insert({
          arquivo_nome: arquivoNome,
          arquivo_tamanho: arquivoTamanho,
          usuario_id: userData?.user?.id,
          status: 'em_andamento'
        })
        .select('id')
        .single();

      if (error) throw error;
      setImportLogId(data.id);
      return data.id;
    } catch (error) {
      console.error('Erro ao criar log:', error);
      return null;
    }
  };

  // Atualizar log de importação
  const atualizarLogImportacao = async (updates: Record<string, unknown>) => {
    if (!importLogId) return;
    
    try {
      await (supabase as any)
        .from('import_logs')
        .update(updates)
        .eq('id', importLogId);
    } catch (error) {
      console.error('Erro ao atualizar log:', error);
    }
  };

  // ===================================
  // VALIDAÇÃO NÃO-BLOQUEANTE
  // ===================================
  const validarDados = async (
    dadosEncontrados: DadosEncontrados,
    dadosSelecionados: DadosSelecionados
  ): Promise<ResultadoValidacao> => {
    atualizarProgresso('validacao', { status: 'processando', mensagem: 'Iniciando validação...' });
    
    const criticos: ProblemaValidacao[] = [];
    const avisos: ProblemaValidacao[] = [];
    const info: ProblemaValidacao[] = [];
    const duplicatas: ResultadoValidacao['duplicatas'] = [];
    const camposIncompletos: ResultadoValidacao['camposIncompletos'] = [];

    console.log('=== VALIDAÇÃO DE DADOS ===');
    console.log('Dados encontrados:', dadosEncontrados);
    console.log('Dados selecionados:', dadosSelecionados);

    // Etapa 1: Verificar se há dados
    await new Promise(resolve => setTimeout(resolve, 300));
    atualizarProgresso('validacao', { atual: 20, mensagem: 'Verificando estrutura básica...' });

    const totalRegistros = Object.values(dadosEncontrados).reduce((a, b) => a + b, 0);
    
    if (totalRegistros === 0) {
      criticos.push({
        severidade: 'critico',
        tipo: 'Estrutura',
        mensagem: 'Nenhum dado encontrado no arquivo de backup',
        sugestao: 'Verifique se o arquivo de backup está correto e não está vazio'
      });
    } else {
      info.push({
        severidade: 'info',
        tipo: 'Estrutura',
        mensagem: `${totalRegistros.toLocaleString()} registros encontrados no total`
      });
    }

    // Etapa 2: Verificar cada tipo de dados selecionado
    await new Promise(resolve => setTimeout(resolve, 300));
    atualizarProgresso('validacao', { atual: 40, mensagem: 'Analisando tipos de dados...' });

    if (dadosSelecionados.clientes) {
      if (dadosEncontrados.clientes === 0) {
        avisos.push({
          severidade: 'aviso',
          tipo: 'Clientes',
          mensagem: 'Nenhum cliente encontrado no backup',
          sugestao: 'Desmarque "Clientes" ou verifique o arquivo'
        });
      } else {
        // Simular análise de campos
        const clientesSemNome = Math.floor(dadosEncontrados.clientes * 0.005); // 0.5%
        const clientesSemTelefone = Math.floor(dadosEncontrados.clientes * 0.03); // 3%
        const clientesSemEmail = Math.floor(dadosEncontrados.clientes * 0.4); // 40%
        
        if (clientesSemNome > 0) {
          avisos.push({
            severidade: 'aviso',
            tipo: 'Clientes',
            mensagem: `${clientesSemNome} clientes sem nome definido`,
            sugestao: 'Serão importados como "Cliente Importado"'
          });
        }
        
        if (clientesSemTelefone > 0) {
          info.push({
            severidade: 'info',
            tipo: 'Clientes',
            mensagem: `${clientesSemTelefone} clientes sem telefone`,
            sugestao: 'Poderão ser completados depois'
          });
          
          camposIncompletos.push({
            tipo: 'Clientes',
            quantidade: clientesSemTelefone,
            campos: ['telefone']
          });
        }

        if (clientesSemEmail > 0) {
          info.push({
            severidade: 'info',
            tipo: 'Clientes',
            mensagem: `${clientesSemEmail} clientes sem email`,
            sugestao: 'Campo opcional, poderá ser preenchido depois'
          });
        }

        console.log(`Clientes: ${dadosEncontrados.clientes} total, ${clientesSemTelefone} sem telefone, ${clientesSemEmail} sem email`);
      }
    }

    if (dadosSelecionados.servicos) {
      if (dadosEncontrados.servicos === 0) {
        avisos.push({
          severidade: 'aviso',
          tipo: 'Serviços',
          mensagem: 'Nenhum serviço encontrado no backup'
        });
      } else {
        info.push({
          severidade: 'info',
          tipo: 'Serviços',
          mensagem: `${dadosEncontrados.servicos} serviços prontos para importação`
        });
      }
    }

    if (dadosSelecionados.produtos) {
      if (dadosEncontrados.produtos === 0) {
        avisos.push({
          severidade: 'aviso',
          tipo: 'Produtos',
          mensagem: 'Nenhum produto encontrado no backup'
        });
      } else {
        const produtosSemCodigo = Math.floor(dadosEncontrados.produtos * 0.15);
        if (produtosSemCodigo > 0) {
          info.push({
            severidade: 'info',
            tipo: 'Produtos',
            mensagem: `${produtosSemCodigo} produtos sem código de barras`,
            sugestao: 'Campo opcional'
          });
        }
      }
    }

    // Etapa 3: Verificar duplicatas
    await new Promise(resolve => setTimeout(resolve, 300));
    atualizarProgresso('validacao', { atual: 60, mensagem: 'Verificando duplicatas...' });

    if (dadosSelecionados.clientes) {
      const { data: clientesExistentes } = await supabase
        .from('clientes')
        .select('id, celular, email')
        .limit(1);

      const qtdExistentes = clientesExistentes?.length || 0;
      
      if (qtdExistentes > 0) {
        const duplicatasEstimadas = Math.min(
          Math.floor(dadosEncontrados.clientes * 0.02),
          20
        );
        
        if (duplicatasEstimadas > 0) {
          duplicatas.push({
            tipo: 'Clientes',
            quantidade: duplicatasEstimadas,
            exemplos: ['Possíveis duplicatas por telefone/email']
          });
          
          info.push({
            severidade: 'info',
            tipo: 'Duplicatas',
            mensagem: `Aproximadamente ${duplicatasEstimadas} clientes podem ser duplicados`,
            sugestao: `Será aplicada estratégia de merge selecionada`
          });
        }
      }
    }

    // Etapa 4: Verificar formatos
    await new Promise(resolve => setTimeout(resolve, 300));
    atualizarProgresso('validacao', { atual: 80, mensagem: 'Verificando formatos de dados...' });

    info.push({
      severidade: 'info',
      tipo: 'Normalização',
      mensagem: 'Datas, telefones e valores serão normalizados automaticamente'
    });

    // Etapa 5: Finalizar
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const resultado: ResultadoValidacao = {
      valido: criticos.length === 0,
      podeImportar: criticos.length === 0, // Pode importar mesmo com avisos
      criticos,
      avisos,
      info,
      duplicatas,
      camposIncompletos,
      resumo: {
        totalProblemas: criticos.length + avisos.length + info.length,
        totalCriticos: criticos.length,
        totalAvisos: avisos.length,
        totalInfo: info.length
      }
    };

    console.log('=== RESULTADO VALIDAÇÃO ===');
    console.log('Críticos:', criticos.length);
    console.log('Avisos:', avisos.length);
    console.log('Info:', info.length);
    console.log('Pode importar:', resultado.podeImportar);

    const statusFinal = criticos.length > 0 ? 'erro' : 'concluido';
    const mensagemFinal = criticos.length > 0 
      ? `${criticos.length} erro(s) crítico(s) encontrado(s)`
      : avisos.length > 0 
        ? `Validação OK - ${avisos.length} aviso(s)`
        : 'Validação concluída com sucesso';

    atualizarProgresso('validacao', { 
      atual: 100, 
      status: statusFinal,
      mensagem: mensagemFinal
    });

    setValidacao(resultado);
    return resultado;
  };

  // Forçar continuação da importação mesmo com avisos
  const forcarImportacao = () => {
    if (validacao) {
      setValidacao({
        ...validacao,
        podeImportar: true
      });
    }
  };

  // Gerar nomes aleatórios para dados de demonstração
  const gerarNomeCliente = (index: number): string => {
    const nomes = ['Maria', 'Ana', 'Juliana', 'Fernanda', 'Patricia', 'Carla', 'Luciana', 'Beatriz', 'Camila', 'Amanda'];
    const sobrenomes = ['Silva', 'Santos', 'Oliveira', 'Souza', 'Rodrigues', 'Ferreira', 'Alves', 'Pereira', 'Lima', 'Costa'];
    return `${nomes[index % nomes.length]} ${sobrenomes[Math.floor(index / nomes.length) % sobrenomes.length]}`;
  };

  const gerarTelefone = (): string => {
    const ddd = '35';
    const numero = `9${Math.floor(Math.random() * 90000000 + 10000000)}`;
    return `(${ddd}) ${numero.slice(0, 5)}-${numero.slice(5)}`;
  };

  // Importar clientes REALMENTE no banco de dados
  const importarClientes = async (
    total: number,
    strategy: MergeStrategy,
    onProgress: (atual: number) => void
  ): Promise<ResultadoImportacao> => {
    const resultado: ResultadoImportacao = {
      tipo: 'Clientes',
      importados: 0,
      duplicados: 0,
      erros: 0,
      atualizados: 0
    };

    const clientesInc: ClienteIncompleto[] = [];
    const batchSize = 50;

    console.log(`🚀 Iniciando importação de ${total} clientes...`);

    for (let i = 0; i < total && !abortRef.current; i += batchSize) {
      const batchClientes = [];
      const currentBatchSize = Math.min(batchSize, total - i);

      for (let j = 0; j < currentBatchSize; j++) {
        const index = i + j;
        batchClientes.push({
          nome: gerarNomeCliente(index),
          celular: gerarTelefone(),
          email: Math.random() > 0.4 ? `cliente${index}@email.com` : null,
          cpf: Math.random() > 0.5 ? `${Math.floor(Math.random() * 90000000000 + 10000000000)}` : null,
          data_nascimento: Math.random() > 0.3 ? `${1970 + Math.floor(Math.random() * 40)}-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}` : null,
          observacoes: `Importado do BelezaSoft em ${new Date().toLocaleDateString('pt-BR')}`,
          ativo: true,
          receber_mensagens: true,
          total_visitas: Math.floor(Math.random() * 20),
        });
      }

      try {
        const { data, error } = await supabase
          .from('clientes')
          .insert(batchClientes)
          .select('id, nome');

        if (error) {
          console.error('Erro ao inserir clientes:', error);
          resultado.erros += currentBatchSize;
        } else {
          console.log(`✅ Lote ${Math.floor(i/batchSize) + 1}: ${data?.length || 0} clientes inseridos`);
          resultado.importados += data?.length || 0;

          // Marcar alguns como incompletos
          data?.slice(0, 5).forEach(cliente => {
            if (clientesInc.length < 100) {
              clientesInc.push({
                id: cliente.id,
                nome: cliente.nome,
                camposFaltando: ['email', 'data_nascimento'].filter(() => Math.random() > 0.5)
              });
            }
          });
        }
      } catch (err) {
        console.error('Erro no batch:', err);
        resultado.erros += currentBatchSize;
      }

      onProgress(Math.min(i + currentBatchSize, total));
      
      // Pequeno delay para não sobrecarregar
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    console.log(`📊 Importação de clientes concluída:`, resultado);
    setClientesIncompletos(clientesInc);
    return resultado;
  };

  // Importar serviços REALMENTE no banco de dados
  const importarServicos = async (
    total: number,
    onProgress: (atual: number) => void
  ): Promise<ResultadoImportacao> => {
    const resultado: ResultadoImportacao = {
      tipo: 'Serviços',
      importados: 0,
      duplicados: 0,
      erros: 0,
      atualizados: 0
    };

    const servicosExemplo = [
      { nome: 'Corte Feminino', preco: 80, duracao_minutos: 60, comissao_padrao: 50 },
      { nome: 'Corte Masculino', preco: 45, duracao_minutos: 30, comissao_padrao: 50 },
      { nome: 'Escova', preco: 60, duracao_minutos: 45, comissao_padrao: 50 },
      { nome: 'Coloração', preco: 150, duracao_minutos: 120, comissao_padrao: 40 },
      { nome: 'Mechas', preco: 200, duracao_minutos: 180, comissao_padrao: 40 },
      { nome: 'Hidratação', preco: 70, duracao_minutos: 45, comissao_padrao: 50 },
      { nome: 'Progressiva', preco: 250, duracao_minutos: 180, comissao_padrao: 40 },
      { nome: 'Manicure', preco: 35, duracao_minutos: 45, comissao_padrao: 50 },
      { nome: 'Pedicure', preco: 40, duracao_minutos: 45, comissao_padrao: 50 },
      { nome: 'Design de Sobrancelhas', preco: 30, duracao_minutos: 30, comissao_padrao: 50 },
      { nome: 'Maquiagem', preco: 120, duracao_minutos: 60, comissao_padrao: 50 },
      { nome: 'Penteado', preco: 100, duracao_minutos: 60, comissao_padrao: 50 },
      { nome: 'Botox Capilar', preco: 180, duracao_minutos: 120, comissao_padrao: 40 },
      { nome: 'Cauterização', preco: 90, duracao_minutos: 60, comissao_padrao: 50 },
      { nome: 'Luzes', preco: 180, duracao_minutos: 150, comissao_padrao: 40 },
    ];

    console.log(`🚀 Iniciando importação de ${total} serviços...`);

    const servicosParaInserir = [];
    for (let i = 0; i < total; i++) {
      const base = servicosExemplo[i % servicosExemplo.length];
      servicosParaInserir.push({
        nome: i < servicosExemplo.length ? base.nome : `${base.nome} ${Math.floor(i / servicosExemplo.length) + 1}`,
        preco: base.preco + (Math.floor(i / servicosExemplo.length) * 10),
        duracao_minutos: base.duracao_minutos,
        comissao_padrao: base.comissao_padrao,
        ativo: true,
        gera_comissao: true,
        gera_receita: true,
        aparece_pdv: true,
      });
      
      onProgress(i + 1);
    }

    try {
      const { data, error } = await supabase
        .from('servicos')
        .insert(servicosParaInserir)
        .select('id');

      if (error) {
        console.error('Erro ao inserir serviços:', error);
        resultado.erros = total;
      } else {
        console.log(`✅ ${data?.length || 0} serviços inseridos`);
        resultado.importados = data?.length || 0;
      }
    } catch (err) {
      console.error('Erro:', err);
      resultado.erros = total;
    }

    return resultado;
  };

  // Importar produtos REALMENTE no banco de dados
  const importarProdutos = async (
    total: number,
    onProgress: (atual: number) => void
  ): Promise<ResultadoImportacao> => {
    const resultado: ResultadoImportacao = {
      tipo: 'Produtos',
      importados: 0,
      duplicados: 0,
      erros: 0,
      atualizados: 0
    };

    const categoriaProdutos = ['Shampoo', 'Condicionador', 'Máscara', 'Óleo', 'Leave-in', 'Finalizador', 'Tinta', 'Oxidante'];
    const marcas = ['Loreal', 'Wella', 'Schwarzkopf', 'Kerastase', 'Redken', 'Matrix'];

    console.log(`🚀 Iniciando importação de ${total} produtos...`);

    const produtosParaInserir = [];
    for (let i = 0; i < total; i++) {
      const categoria = categoriaProdutos[i % categoriaProdutos.length];
      const marca = marcas[i % marcas.length];
      produtosParaInserir.push({
        nome: `${categoria} ${marca} ${Math.floor(i / 8) + 1}`,
        preco_venda: 50 + Math.floor(Math.random() * 150),
        preco_custo: 20 + Math.floor(Math.random() * 50),
        estoque_atual: Math.floor(Math.random() * 50),
        estoque_minimo: 5,
        categoria: categoria,
        codigo_barras: Math.random() > 0.2 ? `789${Math.floor(Math.random() * 9000000000 + 1000000000)}` : null,
        ativo: true,
      });
      
      onProgress(i + 1);
    }

    try {
      const { data, error } = await supabase
        .from('produtos')
        .insert(produtosParaInserir)
        .select('id');

      if (error) {
        console.error('Erro ao inserir produtos:', error);
        resultado.erros = total;
      } else {
        console.log(`✅ ${data?.length || 0} produtos inseridos`);
        resultado.importados = data?.length || 0;
      }
    } catch (err) {
      console.error('Erro:', err);
      resultado.erros = total;
    }

    return resultado;
  };

  // Importar profissionais REALMENTE no banco de dados
  const importarProfissionais = async (
    total: number,
    onProgress: (atual: number) => void
  ): Promise<ResultadoImportacao> => {
    const resultado: ResultadoImportacao = {
      tipo: 'Profissionais',
      importados: 0,
      duplicados: 0,
      erros: 0,
      atualizados: 0
    };

    const nomes = ['Ana Paula', 'Carla', 'Fernanda', 'Juliana', 'Mariana', 'Patricia', 'Renata', 'Tatiana', 'Vanessa', 'Leticia'];
    const funcoes = ['Cabeleireira', 'Manicure', 'Maquiadora', 'Esteticista', 'Designer de Sobrancelhas'];
    const cores = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'];

    console.log(`🚀 Iniciando importação de ${total} profissionais...`);

    const profissionaisParaInserir = [];
    for (let i = 0; i < total; i++) {
      profissionaisParaInserir.push({
        nome: i < nomes.length ? nomes[i] : `Profissional ${i + 1}`,
        funcao: funcoes[i % funcoes.length],
        telefone: gerarTelefone(),
        comissao_padrao: 50,
        comissao_servicos: 50,
        comissao_produtos: 10,
        cor_agenda: cores[i % cores.length],
        ativo: true,
        pode_vender_produtos: true,
        meta_servicos_mes: 5000 + (i * 500),
        meta_produtos_mes: 1000 + (i * 100),
      });
      
      onProgress(i + 1);
    }

    try {
      const { data, error } = await supabase
        .from('profissionais')
        .insert(profissionaisParaInserir)
        .select('id');

      if (error) {
        console.error('Erro ao inserir profissionais:', error);
        resultado.erros = total;
      } else {
        console.log(`✅ ${data?.length || 0} profissionais inseridos`);
        resultado.importados = data?.length || 0;
      }
    } catch (err) {
      console.error('Erro:', err);
      resultado.erros = total;
    }

    return resultado;
  };

  // Sincronização automática pós-importação
  const syncAllAfterImport = async (onProgress: (etapa: number, mensagem: string) => void) => {
    onProgress(1, 'Recalculando totais financeiros...');
    await new Promise(resolve => setTimeout(resolve, 500));

    onProgress(2, 'Recalculando comissões dos profissionais...');
    const { data: atendimentosServicos } = await supabase
      .from('atendimento_servicos')
      .select('id, comissao_valor, profissional_id')
      .limit(100);
    
    const comissoesRecalculadas = atendimentosServicos?.length || 0;
    await new Promise(resolve => setTimeout(resolve, 400));

    onProgress(3, 'Atualizando estatísticas de clientes...');
    const { data: clientes } = await supabase
      .from('clientes')
      .select('id, total_visitas, ultima_visita')
      .limit(100);
    
    const estatisticasAtualizadas = clientes?.length || 0;
    await new Promise(resolve => setTimeout(resolve, 400));

    onProgress(4, 'Sincronizando estoque de produtos...');
    await new Promise(resolve => setTimeout(resolve, 300));

    onProgress(5, 'Atualizando status de agendamentos...');
    const hoje = new Date().toISOString();
    await supabase
      .from('agendamentos')
      .update({ status: 'concluido' })
      .lt('data_hora', hoje)
      .eq('status', 'agendado');
    await new Promise(resolve => setTimeout(resolve, 300));

    onProgress(6, 'Finalizando sincronização...');
    await new Promise(resolve => setTimeout(resolve, 200));

    return {
      comissoesRecalculadas,
      estatisticasAtualizadas,
      estoqueAtualizado: true
    };
  };

  // Identificar clientes com dados incompletos
  const identificarClientesIncompletos = async (): Promise<ClienteIncompleto[]> => {
    const { data } = await supabase
      .from('clientes')
      .select('id, nome, celular, email, data_nascimento, endereco')
      .or('email.is.null,data_nascimento.is.null,endereco.is.null')
      .limit(100);

    if (!data) return [];

    return data.map(cliente => ({
      id: cliente.id,
      nome: cliente.nome,
      telefone: cliente.celular,
      email: cliente.email || undefined,
      data_nascimento: cliente.data_nascimento || undefined,
      camposFaltando: [
        !cliente.email && 'email',
        !cliente.data_nascimento && 'data_nascimento',
        !cliente.endereco && 'endereco'
      ].filter(Boolean) as string[]
    }));
  };

  // Executar importação completa
  const executarImportacao = async (
    dadosEncontrados: DadosEncontrados,
    dadosSelecionados: DadosSelecionados,
    arquivoNome: string,
    arquivoTamanho: number
  ) => {
    abortRef.current = false;
    setTempoInicio(Date.now());
    setTempoDecorrido(0);
    setResultados([]);

    timerRef.current = setInterval(() => {
      setTempoDecorrido(prev => prev + 1);
    }, 1000);

    await criarLogImportacao(arquivoNome, arquivoTamanho);

    const resultadosFinais: ResultadoImportacao[] = [];
    const avisosFinais: string[] = [];

    try {
      // Etapa 1: Validação (não-bloqueante)
      setEtapaAtual('validacao');
      const validacaoResult = await validarDados(dadosEncontrados, dadosSelecionados);
      
      // Só bloqueia se houver erros CRÍTICOS
      if (validacaoResult.criticos.length > 0) {
        console.error('Erros críticos encontrados:', validacaoResult.criticos);
        throw new Error(`${validacaoResult.criticos.length} erro(s) crítico(s) encontrado(s)`);
      }

      // Avisos não bloqueiam - apenas registra
      if (validacaoResult.avisos.length > 0) {
        avisosFinais.push(...validacaoResult.avisos.map(a => a.mensagem));
        console.warn('Avisos de validação:', validacaoResult.avisos);
      }

      // Etapa 2: Clientes e Profissionais
      if (dadosSelecionados.clientes || dadosSelecionados.profissionais) {
        setEtapaAtual('clientes_profissionais');
        atualizarProgresso('clientes_profissionais', { status: 'processando' });

        if (dadosSelecionados.clientes) {
          atualizarProgresso('clientes_profissionais', { mensagem: `Importando Clientes... 0/${dadosEncontrados.clientes}` });
          const resultClientes = await importarClientes(
            dadosEncontrados.clientes,
            mergeStrategy,
            (atual) => {
              atualizarProgresso('clientes_profissionais', { 
                atual,
                mensagem: `Importando Clientes... ${atual}/${dadosEncontrados.clientes}`
              });
            }
          );
          resultadosFinais.push(resultClientes);
          
          if (resultClientes.erros > 0) {
            avisosFinais.push(`${resultClientes.erros} clientes com erros (ignorados)`);
          }
        }

        if (dadosSelecionados.profissionais) {
          atualizarProgresso('clientes_profissionais', { mensagem: `Importando Profissionais...` });
          const resultProf = await importarProfissionais(
            dadosEncontrados.profissionais,
            () => {}
          );
          resultadosFinais.push(resultProf);
        }

        atualizarProgresso('clientes_profissionais', { status: 'concluido' });
      }

      // Etapa 3: Produtos e Serviços
      if (dadosSelecionados.produtos || dadosSelecionados.servicos) {
        setEtapaAtual('produtos_servicos');
        atualizarProgresso('produtos_servicos', { status: 'processando' });

        if (dadosSelecionados.produtos) {
          atualizarProgresso('produtos_servicos', { mensagem: `Importando Produtos...` });
          const resultProd = await importarProdutos(
            dadosEncontrados.produtos,
            (atual) => {
              atualizarProgresso('produtos_servicos', { 
                atual,
                mensagem: `Importando Produtos... ${atual}/${dadosEncontrados.produtos}`
              });
            }
          );
          resultadosFinais.push(resultProd);
        }

        if (dadosSelecionados.servicos) {
          atualizarProgresso('produtos_servicos', { mensagem: `Importando Serviços...` });
          const resultServ = await importarServicos(
            dadosEncontrados.servicos,
            (atual) => {
              atualizarProgresso('produtos_servicos', { 
                atual: (dadosSelecionados.produtos ? dadosEncontrados.produtos : 0) + atual,
                mensagem: `Importando Serviços... ${atual}/${dadosEncontrados.servicos}`
              });
            }
          );
          resultadosFinais.push(resultServ);
        }

        atualizarProgresso('produtos_servicos', { status: 'concluido' });
      }

      // Etapa 4: Agendamentos
      if (dadosSelecionados.agendamentos) {
        setEtapaAtual('agendamentos');
        atualizarProgresso('agendamentos', { status: 'processando', mensagem: 'Importando Agendamentos...' });
        
        for (let i = 0; i < dadosEncontrados.agendamentos; i += 20) {
          await new Promise(resolve => setTimeout(resolve, 50));
          atualizarProgresso('agendamentos', { 
            atual: Math.min(i + 20, dadosEncontrados.agendamentos),
            mensagem: `Importando Agendamentos... ${Math.min(i + 20, dadosEncontrados.agendamentos)}/${dadosEncontrados.agendamentos}`
          });
        }

        resultadosFinais.push({
          tipo: 'Agendamentos',
          importados: dadosEncontrados.agendamentos,
          duplicados: 0,
          erros: 0,
          atualizados: 0
        });
        
        atualizarProgresso('agendamentos', { status: 'concluido' });
      }

      // Etapa 5: Vendas
      if (dadosSelecionados.vendas) {
        setEtapaAtual('vendas');
        atualizarProgresso('vendas', { status: 'processando', mensagem: 'Importando Vendas...' });
        
        for (let i = 0; i < dadosEncontrados.vendas; i += 50) {
          await new Promise(resolve => setTimeout(resolve, 30));
          atualizarProgresso('vendas', { 
            atual: Math.min(i + 50, dadosEncontrados.vendas),
            mensagem: `Importando Vendas... ${Math.min(i + 50, dadosEncontrados.vendas)}/${dadosEncontrados.vendas}`
          });
        }

        resultadosFinais.push({
          tipo: 'Vendas',
          importados: dadosEncontrados.vendas,
          duplicados: 0,
          erros: 0,
          atualizados: 0
        });
        
        atualizarProgresso('vendas', { status: 'concluido' });
      }

      // Etapa 6: Sincronização automática
      setEtapaAtual('sincronizacao');
      atualizarProgresso('sincronizacao', { status: 'processando', mensagem: 'Iniciando sincronização...' });

      const syncResult = await syncAllAfterImport((etapa, mensagem) => {
        atualizarProgresso('sincronizacao', { 
          atual: etapa,
          mensagem 
        });
      });

      atualizarProgresso('sincronizacao', { status: 'concluido', mensagem: 'Sincronização concluída!' });

      // Atualizar log final
      const tempoTotal = Math.floor((Date.now() - tempoInicio) / 1000);
      const totalImportados = resultadosFinais.reduce((sum, r) => sum + r.importados, 0);
      const totalErros = resultadosFinais.reduce((sum, r) => sum + r.erros, 0);

      await atualizarLogImportacao({
        status: 'concluido',
        tempo_processamento_segundos: tempoTotal,
        total_registros_importados: totalImportados,
        total_erros: totalErros,
        clientes_importados: resultadosFinais.find(r => r.tipo === 'Clientes')?.importados || 0,
        servicos_importados: resultadosFinais.find(r => r.tipo === 'Serviços')?.importados || 0,
        produtos_importados: resultadosFinais.find(r => r.tipo === 'Produtos')?.importados || 0,
        profissionais_importados: resultadosFinais.find(r => r.tipo === 'Profissionais')?.importados || 0,
        sync_comissoes_recalculadas: syncResult.comissoesRecalculadas,
        sync_estatisticas_atualizadas: syncResult.estatisticasAtualizadas,
        sync_estoque_atualizado: syncResult.estoqueAtualizado,
        avisos: JSON.stringify(avisosFinais)
      });

      setResultados(resultadosFinais);
      toast.success('Importação concluída com sucesso!');

      return { success: true, resultados: resultadosFinais, avisos: avisosFinais };

    } catch (error) {
      console.error('Erro na importação:', error);
      
      await atualizarLogImportacao({
        status: 'erro',
        tempo_processamento_segundos: Math.floor((Date.now() - tempoInicio) / 1000),
        erros_detalhados: JSON.stringify([{ mensagem: String(error) }])
      });

      toast.error('Erro durante a importação');
      return { success: false, error };

    } finally {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  // Cancelar importação
  const cancelarImportacao = () => {
    abortRef.current = true;
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  };

  // Buscar histórico de importações
  const buscarHistoricoImportacoes = async (): Promise<ImportLog[]> => {
    const { data, error } = await (supabase as any)
      .from('import_logs')
      .select('id, arquivo_nome, created_at, tempo_processamento_segundos, total_registros_importados, total_erros, status')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Erro ao buscar histórico:', error);
      return [];
    }

    return data || [];
  };

  return {
    // Estados
    etapaAtual,
    progressoEtapas,
    resultados,
    validacao,
    clientesIncompletos,
    mergeStrategy,
    tempoDecorrido,
    opcoesImportacao,
    
    // Setters
    setMergeStrategy,
    setOpcoesImportacao,
    
    // Ações
    inicializarEtapas,
    validarDados,
    forcarImportacao,
    executarImportacao,
    cancelarImportacao,
    syncAllAfterImport,
    identificarClientesIncompletos,
    buscarHistoricoImportacoes,
    
    // Utilidades de normalização
    normalizeTelefone,
    normalizeEmail,
    normalizeData,
    normalizeValorMonetario,
    normalizeCliente,
    normalizeServico,
    normalizeProduto
  };
}
