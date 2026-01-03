import { useState, useCallback } from 'react';
import initSqlJs, { Database } from 'sql.js';
import pako from 'pako';

export interface BelezaSoftCliente {
  id?: number;
  nome: string;
  celular?: string;
  telefone?: string;
  email?: string;
  cpf?: string;
  data_nascimento?: string;
  endereco?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  observacoes?: string;
}

export interface BelezaSoftServico {
  id?: number;
  nome: string;
  preco?: number;
  duracao?: number;
  comissao?: number;
  descricao?: string;
  categoria?: string;
}

export interface BelezaSoftProduto {
  id?: number;
  nome: string;
  preco_venda?: number;
  preco_custo?: number;
  estoque?: number;
  estoque_minimo?: number;
  codigo_barras?: string;
  categoria?: string;
  descricao?: string;
}

export interface BelezaSoftProfissional {
  id?: number;
  nome: string;
  telefone?: string;
  email?: string;
  comissao?: number;
  especialidade?: string;
  ativo?: boolean;
}

export interface DadosBelezaSoft {
  clientes: BelezaSoftCliente[];
  servicos: BelezaSoftServico[];
  produtos: BelezaSoftProduto[];
  profissionais: BelezaSoftProfissional[];
}

export interface ParseResult {
  success: boolean;
  dados: DadosBelezaSoft;
  tabelas: string[];
  erros: string[];
}

// Mapeamento de nomes de colunas possíveis
const COLUMN_MAPPINGS = {
  clientes: {
    nome: ['nome', 'name', 'cliente', 'nomecliente', 'nome_cliente'],
    celular: ['celular', 'cel', 'mobile', 'telefone_celular', 'fone_celular'],
    telefone: ['telefone', 'tel', 'phone', 'fone', 'telefone_fixo'],
    email: ['email', 'e_mail', 'e-mail', 'mail'],
    cpf: ['cpf', 'cpf_cnpj', 'documento'],
    data_nascimento: ['data_nascimento', 'nascimento', 'datanascimento', 'dt_nascimento', 'aniversario'],
    endereco: ['endereco', 'rua', 'logradouro', 'address'],
    bairro: ['bairro', 'neighborhood'],
    cidade: ['cidade', 'city', 'municipio'],
    estado: ['estado', 'uf', 'state'],
    cep: ['cep', 'zipcode', 'codigo_postal'],
    observacoes: ['observacoes', 'obs', 'notes', 'observacao']
  },
  servicos: {
    nome: ['nome', 'name', 'servico', 'descricao', 'titulo'],
    preco: ['preco', 'valor', 'price', 'preco_venda'],
    duracao: ['duracao', 'tempo', 'duration', 'minutos'],
    comissao: ['comissao', 'commission', 'percentual_comissao'],
    descricao: ['descricao', 'description', 'obs'],
    categoria: ['categoria', 'category', 'grupo']
  },
  produtos: {
    nome: ['nome', 'name', 'produto', 'descricao', 'titulo'],
    preco_venda: ['preco_venda', 'preco', 'valor', 'price'],
    preco_custo: ['preco_custo', 'custo', 'cost'],
    estoque: ['estoque', 'quantidade', 'qtd', 'stock'],
    estoque_minimo: ['estoque_minimo', 'qtd_minima', 'min_stock'],
    codigo_barras: ['codigo_barras', 'barcode', 'ean', 'codigo'],
    categoria: ['categoria', 'category', 'grupo'],
    descricao: ['descricao', 'description', 'obs']
  },
  profissionais: {
    nome: ['nome', 'name', 'profissional', 'funcionario'],
    telefone: ['telefone', 'tel', 'celular', 'phone'],
    email: ['email', 'e_mail', 'e-mail'],
    comissao: ['comissao', 'commission', 'percentual'],
    especialidade: ['especialidade', 'funcao', 'cargo', 'specialty'],
    ativo: ['ativo', 'active', 'status']
  }
};

// Nomes de tabelas possíveis
const TABLE_NAMES = {
  clientes: ['clientes', 'cliente', 'customers', 'customer', 'tb_clientes', 'tbl_clientes', 'cadastro_clientes'],
  servicos: ['servicos', 'servico', 'services', 'service', 'tb_servicos', 'tbl_servicos'],
  produtos: ['produtos', 'produto', 'products', 'product', 'tb_produtos', 'tbl_produtos', 'estoque'],
  profissionais: ['profissionais', 'profissional', 'funcionarios', 'funcionario', 'employees', 'tb_profissionais', 'tbl_funcionarios']
};

export function useBelezaSoftParser() {
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const findColumn = (columns: string[], mappings: string[]): string | null => {
    const lowerColumns = columns.map(c => c.toLowerCase().trim());
    for (const mapping of mappings) {
      const index = lowerColumns.indexOf(mapping.toLowerCase());
      if (index !== -1) {
        return columns[index];
      }
    }
    return null;
  };

  const findTable = (tables: string[], possibleNames: string[]): string | null => {
    const lowerTables = tables.map(t => t.toLowerCase().trim());
    for (const name of possibleNames) {
      const index = lowerTables.indexOf(name.toLowerCase());
      if (index !== -1) {
        return tables[index];
      }
    }
    return null;
  };

  const parseClientes = (db: Database, tableName: string): BelezaSoftCliente[] => {
    try {
      const result = db.exec(`SELECT * FROM "${tableName}" LIMIT 1`);
      if (result.length === 0) return [];

      const columns = result[0].columns;
      const mapping = COLUMN_MAPPINGS.clientes;

      const nomeCol = findColumn(columns, mapping.nome);
      if (!nomeCol) return [];

      const celularCol = findColumn(columns, mapping.celular);
      const telefoneCol = findColumn(columns, mapping.telefone);
      const emailCol = findColumn(columns, mapping.email);
      const cpfCol = findColumn(columns, mapping.cpf);
      const nascimentoCol = findColumn(columns, mapping.data_nascimento);
      const enderecoCol = findColumn(columns, mapping.endereco);
      const bairroCol = findColumn(columns, mapping.bairro);
      const cidadeCol = findColumn(columns, mapping.cidade);
      const estadoCol = findColumn(columns, mapping.estado);
      const cepCol = findColumn(columns, mapping.cep);
      const obsCol = findColumn(columns, mapping.observacoes);

      const allResults = db.exec(`SELECT * FROM "${tableName}"`);
      if (allResults.length === 0) return [];

      return allResults[0].values.map((row, idx) => {
        const getVal = (col: string | null) => {
          if (!col) return undefined;
          const colIndex = columns.indexOf(col);
          return colIndex !== -1 ? row[colIndex] : undefined;
        };

        return {
          id: idx + 1,
          nome: String(getVal(nomeCol) || '').trim(),
          celular: getVal(celularCol) ? String(getVal(celularCol)).trim() : undefined,
          telefone: getVal(telefoneCol) ? String(getVal(telefoneCol)).trim() : undefined,
          email: getVal(emailCol) ? String(getVal(emailCol)).trim() : undefined,
          cpf: getVal(cpfCol) ? String(getVal(cpfCol)).trim() : undefined,
          data_nascimento: getVal(nascimentoCol) ? String(getVal(nascimentoCol)).trim() : undefined,
          endereco: getVal(enderecoCol) ? String(getVal(enderecoCol)).trim() : undefined,
          bairro: getVal(bairroCol) ? String(getVal(bairroCol)).trim() : undefined,
          cidade: getVal(cidadeCol) ? String(getVal(cidadeCol)).trim() : undefined,
          estado: getVal(estadoCol) ? String(getVal(estadoCol)).trim() : undefined,
          cep: getVal(cepCol) ? String(getVal(cepCol)).trim() : undefined,
          observacoes: getVal(obsCol) ? String(getVal(obsCol)).trim() : undefined,
        };
      }).filter(c => c.nome && c.nome.length > 0);
    } catch (e) {
      console.error('Erro ao parsear clientes:', e);
      return [];
    }
  };

  const parseServicos = (db: Database, tableName: string): BelezaSoftServico[] => {
    try {
      const result = db.exec(`SELECT * FROM "${tableName}" LIMIT 1`);
      if (result.length === 0) return [];

      const columns = result[0].columns;
      const mapping = COLUMN_MAPPINGS.servicos;

      const nomeCol = findColumn(columns, mapping.nome);
      if (!nomeCol) return [];

      const precoCol = findColumn(columns, mapping.preco);
      const duracaoCol = findColumn(columns, mapping.duracao);
      const comissaoCol = findColumn(columns, mapping.comissao);
      const descricaoCol = findColumn(columns, mapping.descricao);
      const categoriaCol = findColumn(columns, mapping.categoria);

      const allResults = db.exec(`SELECT * FROM "${tableName}"`);
      if (allResults.length === 0) return [];

      return allResults[0].values.map((row, idx) => {
        const getVal = (col: string | null) => {
          if (!col) return undefined;
          const colIndex = columns.indexOf(col);
          return colIndex !== -1 ? row[colIndex] : undefined;
        };

        return {
          id: idx + 1,
          nome: String(getVal(nomeCol) || '').trim(),
          preco: precoCol ? Number(getVal(precoCol)) || 0 : undefined,
          duracao: duracaoCol ? Number(getVal(duracaoCol)) || 30 : undefined,
          comissao: comissaoCol ? Number(getVal(comissaoCol)) || 0 : undefined,
          descricao: descricaoCol ? String(getVal(descricaoCol)).trim() : undefined,
          categoria: categoriaCol ? String(getVal(categoriaCol)).trim() : undefined,
        };
      }).filter(s => s.nome && s.nome.length > 0);
    } catch (e) {
      console.error('Erro ao parsear serviços:', e);
      return [];
    }
  };

  const parseProdutos = (db: Database, tableName: string): BelezaSoftProduto[] => {
    try {
      const result = db.exec(`SELECT * FROM "${tableName}" LIMIT 1`);
      if (result.length === 0) return [];

      const columns = result[0].columns;
      const mapping = COLUMN_MAPPINGS.produtos;

      const nomeCol = findColumn(columns, mapping.nome);
      if (!nomeCol) return [];

      const precoVendaCol = findColumn(columns, mapping.preco_venda);
      const precoCustoCol = findColumn(columns, mapping.preco_custo);
      const estoqueCol = findColumn(columns, mapping.estoque);
      const estoqueMinCol = findColumn(columns, mapping.estoque_minimo);
      const codigoCol = findColumn(columns, mapping.codigo_barras);
      const categoriaCol = findColumn(columns, mapping.categoria);
      const descricaoCol = findColumn(columns, mapping.descricao);

      const allResults = db.exec(`SELECT * FROM "${tableName}"`);
      if (allResults.length === 0) return [];

      return allResults[0].values.map((row, idx) => {
        const getVal = (col: string | null) => {
          if (!col) return undefined;
          const colIndex = columns.indexOf(col);
          return colIndex !== -1 ? row[colIndex] : undefined;
        };

        return {
          id: idx + 1,
          nome: String(getVal(nomeCol) || '').trim(),
          preco_venda: precoVendaCol ? Number(getVal(precoVendaCol)) || 0 : undefined,
          preco_custo: precoCustoCol ? Number(getVal(precoCustoCol)) || 0 : undefined,
          estoque: estoqueCol ? Number(getVal(estoqueCol)) || 0 : undefined,
          estoque_minimo: estoqueMinCol ? Number(getVal(estoqueMinCol)) || 0 : undefined,
          codigo_barras: codigoCol ? String(getVal(codigoCol)).trim() : undefined,
          categoria: categoriaCol ? String(getVal(categoriaCol)).trim() : undefined,
          descricao: descricaoCol ? String(getVal(descricaoCol)).trim() : undefined,
        };
      }).filter(p => p.nome && p.nome.length > 0);
    } catch (e) {
      console.error('Erro ao parsear produtos:', e);
      return [];
    }
  };

  const parseProfissionais = (db: Database, tableName: string): BelezaSoftProfissional[] => {
    try {
      const result = db.exec(`SELECT * FROM "${tableName}" LIMIT 1`);
      if (result.length === 0) return [];

      const columns = result[0].columns;
      const mapping = COLUMN_MAPPINGS.profissionais;

      const nomeCol = findColumn(columns, mapping.nome);
      if (!nomeCol) return [];

      const telefoneCol = findColumn(columns, mapping.telefone);
      const emailCol = findColumn(columns, mapping.email);
      const comissaoCol = findColumn(columns, mapping.comissao);
      const especialidadeCol = findColumn(columns, mapping.especialidade);
      const ativoCol = findColumn(columns, mapping.ativo);

      const allResults = db.exec(`SELECT * FROM "${tableName}"`);
      if (allResults.length === 0) return [];

      return allResults[0].values.map((row, idx) => {
        const getVal = (col: string | null) => {
          if (!col) return undefined;
          const colIndex = columns.indexOf(col);
          return colIndex !== -1 ? row[colIndex] : undefined;
        };

        return {
          id: idx + 1,
          nome: String(getVal(nomeCol) || '').trim(),
          telefone: telefoneCol ? String(getVal(telefoneCol)).trim() : undefined,
          email: emailCol ? String(getVal(emailCol)).trim() : undefined,
          comissao: comissaoCol ? Number(getVal(comissaoCol)) || 0 : undefined,
          especialidade: especialidadeCol ? String(getVal(especialidadeCol)).trim() : undefined,
          ativo: ativoCol ? Boolean(getVal(ativoCol)) : true,
        };
      }).filter(p => p.nome && p.nome.length > 0);
    } catch (e) {
      console.error('Erro ao parsear profissionais:', e);
      return [];
    }
  };

  const parseFile = useCallback(async (file: File): Promise<ParseResult> => {
    setParsing(true);
    setError(null);

    const result: ParseResult = {
      success: false,
      dados: {
        clientes: [],
        servicos: [],
        produtos: [],
        profissionais: []
      },
      tabelas: [],
      erros: []
    };

    try {
      // Inicializar sql.js
      const SQL = await initSqlJs({
        locateFile: (file: string) => `https://sql.js.org/dist/${file}`
      });

      // Ler arquivo
      const arrayBuffer = await file.arrayBuffer();
      let data = new Uint8Array(arrayBuffer);
      let db: Database;

      // Verificar se começa com assinatura SQLite (SQLite format 3\0)
      const sqliteSignature = [0x53, 0x51, 0x4c, 0x69, 0x74, 0x65, 0x20, 0x66, 0x6f, 0x72, 0x6d, 0x61, 0x74, 0x20, 0x33, 0x00];
      const isSqlite = sqliteSignature.every((byte, i) => data[i] === byte);

      if (!isSqlite) {
        console.log('📦 Arquivo não é SQLite puro, tentando descomprimir...');
        
        // Tentar GZIP
        try {
          data = pako.ungzip(data);
          console.log('✅ Descomprimido com GZIP');
        } catch {
          // Tentar DEFLATE
          try {
            data = pako.inflate(data);
            console.log('✅ Descomprimido com DEFLATE');
          } catch {
            // Tentar ZLIB  
            try {
              data = pako.inflate(data, { raw: false });
              console.log('✅ Descomprimido com ZLIB');
            } catch {
              console.log('⚠️ Não conseguiu descomprimir, tentando como está...');
            }
          }
        }
      }

      try {
        // Tentar abrir como SQLite
        db = new SQL.Database(data);
      } catch (dbError) {
        console.error('❌ Erro ao abrir SQLite:', dbError);
        result.erros.push('Arquivo pode estar em formato não reconhecido. Certifique-se de que é um backup SQLite válido do BelezaSoft.');
        setParsing(false);
        return result;
      }

      // Listar tabelas
      const tablesResult = db.exec("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
      if (tablesResult.length > 0) {
        result.tabelas = tablesResult[0].values.map(v => String(v[0]));
      }

      console.log('📋 Tabelas encontradas:', result.tabelas);

      // Encontrar e parsear cada tipo de dados
      const clientesTable = findTable(result.tabelas, TABLE_NAMES.clientes);
      if (clientesTable) {
        result.dados.clientes = parseClientes(db, clientesTable);
        console.log(`✅ Clientes parseados: ${result.dados.clientes.length}`);
      }

      const servicosTable = findTable(result.tabelas, TABLE_NAMES.servicos);
      if (servicosTable) {
        result.dados.servicos = parseServicos(db, servicosTable);
        console.log(`✅ Serviços parseados: ${result.dados.servicos.length}`);
      }

      const produtosTable = findTable(result.tabelas, TABLE_NAMES.produtos);
      if (produtosTable) {
        result.dados.produtos = parseProdutos(db, produtosTable);
        console.log(`✅ Produtos parseados: ${result.dados.produtos.length}`);
      }

      const profissionaisTable = findTable(result.tabelas, TABLE_NAMES.profissionais);
      if (profissionaisTable) {
        result.dados.profissionais = parseProfissionais(db, profissionaisTable);
        console.log(`✅ Profissionais parseados: ${result.dados.profissionais.length}`);
      }

      db.close();
      result.success = true;
    } catch (e) {
      console.error('Erro ao parsear arquivo:', e);
      result.erros.push(String(e));
      setError(String(e));
    }

    setParsing(false);
    return result;
  }, []);

  return {
    parseFile,
    parsing,
    error
  };
}
