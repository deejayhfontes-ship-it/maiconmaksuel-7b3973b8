import { useState, useCallback } from 'react';

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
  formato: 'json' | 'csv' | 'texto' | 'desconhecido';
}

export function useBelezaSoftParser() {
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ========== PARSE CSV ==========
  const parseCSV = (content: string): Record<string, unknown>[] => {
    const lines = content.split(/\r?\n/).filter(line => line.trim());
    if (lines.length < 2) return [];

    // Detectar separador (vírgula, ponto-e-vírgula ou tab)
    const firstLine = lines[0];
    let separator = ',';
    if (firstLine.includes(';') && !firstLine.includes(',')) separator = ';';
    if (firstLine.includes('\t')) separator = '\t';

    // Parse header
    const headers = parseCSVLine(lines[0], separator).map(h => 
      h.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Remove acentos
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, '')
    );

    console.log('📊 CSV Headers:', headers);

    // Parse rows
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

  // Parse uma linha CSV considerando aspas
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

  // Detectar tipo de dados pelo nome do arquivo ou conteúdo
  const detectarTipoDados = (filename: string, headers: string[]): 'clientes' | 'servicos' | 'produtos' | 'profissionais' | null => {
    const lowerFilename = filename.toLowerCase();
    
    // Por nome do arquivo
    if (lowerFilename.includes('cliente') || lowerFilename.includes('customer')) return 'clientes';
    if (lowerFilename.includes('servico') || lowerFilename.includes('service')) return 'servicos';
    if (lowerFilename.includes('produto') || lowerFilename.includes('product')) return 'produtos';
    if (lowerFilename.includes('profissional') || lowerFilename.includes('funcionario') || lowerFilename.includes('employee')) return 'profissionais';

    // Por colunas
    const headerStr = headers.join(',');
    if (headerStr.includes('cpf') || headerStr.includes('data_nascimento') || headerStr.includes('celular')) return 'clientes';
    if (headerStr.includes('duracao') || headerStr.includes('tempo')) return 'servicos';
    if (headerStr.includes('estoque') || headerStr.includes('codigo_barras') || headerStr.includes('preco_custo')) return 'produtos';
    if (headerStr.includes('comissao') || headerStr.includes('especialidade')) return 'profissionais';

    return null;
  };

  // ========== PARSE JSON ==========
  const parseJsonBackup = (jsonData: Record<string, unknown>): DadosBelezaSoft => {
    console.log('📄 Parseando backup JSON...');
    
    const dados: DadosBelezaSoft = {
      clientes: [],
      servicos: [],
      produtos: [],
      profissionais: []
    };

    // Mapear clientes
    const clientesData = jsonData.clientes || jsonData.clients || jsonData.customers || [];
    if (Array.isArray(clientesData)) {
      dados.clientes = clientesData.map((c: Record<string, unknown>, idx: number) => ({
        id: idx + 1,
        nome: String(c.nome || c.name || c.cliente || '').trim(),
        celular: String(c.celular || c.cel || c.mobile || c.telefone_celular || '').trim() || undefined,
        telefone: String(c.telefone || c.tel || c.phone || c.fone || '').trim() || undefined,
        email: String(c.email || c.e_mail || '').trim().toLowerCase() || undefined,
        cpf: String(c.cpf || c.cpf_cnpj || c.documento || '').trim() || undefined,
        data_nascimento: String(c.data_nascimento || c.nascimento || c.birthday || '').trim() || undefined,
        endereco: String(c.endereco || c.address || c.rua || '').trim() || undefined,
        bairro: String(c.bairro || '').trim() || undefined,
        cidade: String(c.cidade || c.city || '').trim() || undefined,
        estado: String(c.estado || c.uf || '').trim() || undefined,
        cep: String(c.cep || '').trim() || undefined,
        observacoes: String(c.observacoes || c.obs || c.notes || '').trim() || undefined,
      })).filter(c => c.nome && c.nome.length > 0);
      console.log(`✅ ${dados.clientes.length} clientes parseados do JSON`);
    }

    // Mapear serviços
    const servicosData = jsonData.servicos || jsonData.services || [];
    if (Array.isArray(servicosData)) {
      dados.servicos = servicosData.map((s: Record<string, unknown>, idx: number) => ({
        id: idx + 1,
        nome: String(s.nome || s.name || s.servico || '').trim(),
        preco: Number(s.preco || s.valor || s.price || 0),
        duracao: Number(s.duracao || s.tempo || s.duration || 30),
        comissao: Number(s.comissao || s.commission || 0),
        descricao: String(s.descricao || s.description || '').trim() || undefined,
        categoria: String(s.categoria || s.category || '').trim() || undefined,
      })).filter(s => s.nome && s.nome.length > 0);
      console.log(`✅ ${dados.servicos.length} serviços parseados do JSON`);
    }

    // Mapear produtos
    const produtosData = jsonData.produtos || jsonData.products || [];
    if (Array.isArray(produtosData)) {
      dados.produtos = produtosData.map((p: Record<string, unknown>, idx: number) => ({
        id: idx + 1,
        nome: String(p.nome || p.name || p.produto || '').trim(),
        preco_venda: Number(p.preco_venda || p.preco || p.price || 0),
        preco_custo: Number(p.preco_custo || p.custo || p.cost || 0),
        estoque: Number(p.estoque || p.quantidade || p.stock || 0),
        estoque_minimo: Number(p.estoque_minimo || p.min_stock || 0),
        codigo_barras: String(p.codigo_barras || p.barcode || p.ean || '').trim() || undefined,
        categoria: String(p.categoria || p.category || '').trim() || undefined,
        descricao: String(p.descricao || p.description || '').trim() || undefined,
      })).filter(p => p.nome && p.nome.length > 0);
      console.log(`✅ ${dados.produtos.length} produtos parseados do JSON`);
    }

    // Mapear profissionais
    const profissionaisData = jsonData.profissionais || jsonData.professionals || jsonData.funcionarios || [];
    if (Array.isArray(profissionaisData)) {
      dados.profissionais = profissionaisData.map((p: Record<string, unknown>, idx: number) => ({
        id: idx + 1,
        nome: String(p.nome || p.name || p.profissional || '').trim(),
        telefone: String(p.telefone || p.tel || p.celular || p.phone || '').trim() || undefined,
        email: String(p.email || '').trim().toLowerCase() || undefined,
        comissao: Number(p.comissao || p.commission || 0),
        especialidade: String(p.especialidade || p.funcao || p.cargo || '').trim() || undefined,
        ativo: p.ativo !== false && p.active !== false,
      })).filter(p => p.nome && p.nome.length > 0);
      console.log(`✅ ${dados.profissionais.length} profissionais parseados do JSON`);
    }

    return dados;
  };

  // ========== CONVERTER CSV ROWS PARA DADOS ==========
  const convertCSVToDados = (rows: Record<string, unknown>[], tipo: 'clientes' | 'servicos' | 'produtos' | 'profissionais'): DadosBelezaSoft => {
    const dados: DadosBelezaSoft = {
      clientes: [],
      servicos: [],
      produtos: [],
      profissionais: []
    };

    if (tipo === 'clientes') {
      dados.clientes = rows.map((c, idx) => ({
        id: idx + 1,
        nome: String(c.nome || c.name || c.cliente || '').trim(),
        celular: String(c.celular || c.cel || c.mobile || '').trim() || undefined,
        telefone: String(c.telefone || c.tel || c.phone || c.fone || '').trim() || undefined,
        email: String(c.email || c.e_mail || '').trim().toLowerCase() || undefined,
        cpf: String(c.cpf || c.cpf_cnpj || c.documento || '').trim() || undefined,
        data_nascimento: String(c.data_nascimento || c.nascimento || '').trim() || undefined,
        endereco: String(c.endereco || c.address || c.rua || '').trim() || undefined,
        bairro: String(c.bairro || '').trim() || undefined,
        cidade: String(c.cidade || c.city || '').trim() || undefined,
        estado: String(c.estado || c.uf || '').trim() || undefined,
        cep: String(c.cep || '').trim() || undefined,
        observacoes: String(c.observacoes || c.obs || '').trim() || undefined,
      })).filter(c => c.nome && c.nome.length > 0);
    } else if (tipo === 'servicos') {
      dados.servicos = rows.map((s, idx) => ({
        id: idx + 1,
        nome: String(s.nome || s.name || s.servico || s.descricao || '').trim(),
        preco: Number(s.preco || s.valor || s.price || 0),
        duracao: Number(s.duracao || s.tempo || s.duration || 30),
        comissao: Number(s.comissao || s.commission || 0),
        descricao: String(s.descricao || s.description || '').trim() || undefined,
        categoria: String(s.categoria || s.category || '').trim() || undefined,
      })).filter(s => s.nome && s.nome.length > 0);
    } else if (tipo === 'produtos') {
      dados.produtos = rows.map((p, idx) => ({
        id: idx + 1,
        nome: String(p.nome || p.name || p.produto || p.descricao || '').trim(),
        preco_venda: Number(p.preco_venda || p.preco || p.valor || p.price || 0),
        preco_custo: Number(p.preco_custo || p.custo || p.cost || 0),
        estoque: Number(p.estoque || p.quantidade || p.stock || p.qtd || 0),
        estoque_minimo: Number(p.estoque_minimo || p.min_stock || 0),
        codigo_barras: String(p.codigo_barras || p.barcode || p.ean || p.codigo || '').trim() || undefined,
        categoria: String(p.categoria || p.category || '').trim() || undefined,
        descricao: String(p.descricao || p.description || '').trim() || undefined,
      })).filter(p => p.nome && p.nome.length > 0);
    } else if (tipo === 'profissionais') {
      dados.profissionais = rows.map((p, idx) => ({
        id: idx + 1,
        nome: String(p.nome || p.name || p.profissional || p.funcionario || '').trim(),
        telefone: String(p.telefone || p.tel || p.celular || p.phone || '').trim() || undefined,
        email: String(p.email || '').trim().toLowerCase() || undefined,
        comissao: Number(p.comissao || p.commission || 0),
        especialidade: String(p.especialidade || p.funcao || p.cargo || '').trim() || undefined,
        ativo: true,
      })).filter(p => p.nome && p.nome.length > 0);
    }

    return dados;
  };

  // ========== PARSE TEXTO (SQL) ==========
  const parseTextoBackup = (content: string): DadosBelezaSoft => {
    console.log('📄 Tentando parsear como texto estruturado...');
    
    const dados: DadosBelezaSoft = {
      clientes: [],
      servicos: [],
      produtos: [],
      profissionais: []
    };

    // Tentar extrair dados de formato SQL INSERT
    const insertPattern = /INSERT INTO\s+[`"']?(\w+)[`"']?\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/gi;
    let match;
    
    while ((match = insertPattern.exec(content)) !== null) {
      const tableName = match[1].toLowerCase();
      const columns = match[2].split(',').map(c => c.trim().replace(/[`"']/g, '').toLowerCase());
      const valuesStr = match[3];
      
      // Parse values (considerando strings com aspas)
      const values: string[] = [];
      let current = '';
      let inQuotes = false;
      let quoteChar = '';
      
      for (let i = 0; i < valuesStr.length; i++) {
        const char = valuesStr[i];
        
        if ((char === '"' || char === "'") && !inQuotes) {
          inQuotes = true;
          quoteChar = char;
        } else if (char === quoteChar && inQuotes) {
          inQuotes = false;
          quoteChar = '';
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      if (current.trim()) values.push(current.trim());

      // Criar objeto a partir das colunas e valores
      const obj: Record<string, unknown> = {};
      columns.forEach((col, idx) => {
        let val = values[idx] || '';
        // Remover aspas
        val = val.replace(/^['"]|['"]$/g, '');
        obj[col] = val === 'NULL' ? null : val;
      });

      // Identificar tabela
      if (tableName.includes('cliente') || tableName.includes('customer')) {
        dados.clientes.push({
          id: dados.clientes.length + 1,
          nome: String(obj.nome || obj.name || ''),
          celular: String(obj.celular || obj.telefone || '').trim() || undefined,
          telefone: String(obj.telefone || obj.tel || '').trim() || undefined,
          email: String(obj.email || '').trim() || undefined,
          cpf: String(obj.cpf || '').trim() || undefined,
        });
      } else if (tableName.includes('servico') || tableName.includes('service')) {
        dados.servicos.push({
          id: dados.servicos.length + 1,
          nome: String(obj.nome || obj.name || obj.descricao || ''),
          preco: Number(obj.preco || obj.valor || 0),
          duracao: Number(obj.duracao || obj.tempo || 30),
        });
      } else if (tableName.includes('produto') || tableName.includes('product')) {
        dados.produtos.push({
          id: dados.produtos.length + 1,
          nome: String(obj.nome || obj.name || obj.descricao || ''),
          preco_venda: Number(obj.preco_venda || obj.preco || obj.valor || 0),
          estoque: Number(obj.estoque || obj.quantidade || 0),
        });
      } else if (tableName.includes('profissional') || tableName.includes('funcionario')) {
        dados.profissionais.push({
          id: dados.profissionais.length + 1,
          nome: String(obj.nome || obj.name || ''),
          telefone: String(obj.telefone || '').trim() || undefined,
        });
      }
    }

    console.log('📊 Dados extraídos de SQL:', {
      clientes: dados.clientes.length,
      servicos: dados.servicos.length,
      produtos: dados.produtos.length,
      profissionais: dados.profissionais.length
    });

    return dados;
  };

  // ========== PARSE ARQUIVO ÚNICO ==========
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
      erros: [],
      formato: 'desconhecido'
    };

    console.log('📁 Processando arquivo:', file.name, file.type, file.size);

    try {
      const textContent = await file.text();
      console.log('📄 Arquivo lido, tamanho:', textContent.length, 'caracteres');
      console.log('📄 Primeiros 200 caracteres:', textContent.substring(0, 200));

      const trimmedContent = textContent.trim();
      const firstChar = trimmedContent[0];
      
      // Tentar JSON
      if (firstChar === '{' || firstChar === '[') {
        try {
          console.log('📄 Tentando parsear como JSON...');
          const jsonData = JSON.parse(trimmedContent);
          
          result.dados = parseJsonBackup(jsonData);
          result.formato = 'json';
          result.tabelas = Object.keys(jsonData);
          result.success = true;
          
          console.log('✅ Arquivo JSON parseado com sucesso!');
          setParsing(false);
          return result;
        } catch (jsonError) {
          console.log('⚠️ Falha ao parsear JSON:', jsonError);
        }
      }

      // Tentar CSV
      const lines = trimmedContent.split(/\r?\n/);
      if (lines.length >= 2 && (lines[0].includes(',') || lines[0].includes(';') || lines[0].includes('\t'))) {
        console.log('📄 Tentando parsear como CSV...');
        
        const rows = parseCSV(trimmedContent);
        if (rows.length > 0) {
          const headers = Object.keys(rows[0]);
          const tipo = detectarTipoDados(file.name, headers);
          
          if (tipo) {
            result.dados = convertCSVToDados(rows, tipo);
            result.formato = 'csv';
            result.tabelas = [tipo];
            result.success = true;
            
            console.log(`✅ CSV parseado como ${tipo}: ${rows.length} registros`);
            setParsing(false);
            return result;
          } else {
            result.erros.push('Não foi possível identificar o tipo de dados do CSV. Renomeie o arquivo para conter: clientes, servicos, produtos ou profissionais');
          }
        }
      }

      // Tentar SQL/texto
      console.log('📄 Tentando parsear como texto/SQL...');
      result.dados = parseTextoBackup(textContent);
      result.formato = 'texto';
      
      const totalRegistros = 
        result.dados.clientes.length + 
        result.dados.servicos.length + 
        result.dados.produtos.length + 
        result.dados.profissionais.length;

      if (totalRegistros > 0) {
        result.success = true;
        result.tabelas = ['clientes', 'servicos', 'produtos', 'profissionais'].filter(
          t => result.dados[t as keyof DadosBelezaSoft].length > 0
        );
        console.log('✅ Arquivo texto/SQL parseado com sucesso!');
      } else {
        result.erros.push('Não foi possível extrair dados do arquivo. Formatos suportados: JSON, CSV');
      }

    } catch (error) {
      console.error('❌ Erro ao processar arquivo:', error);
      result.erros.push(String(error));
      setError(String(error));
    }

    setParsing(false);
    return result;
  }, []);

  // ========== PARSE MÚLTIPLOS ARQUIVOS CSV ==========
  const parseMultipleFiles = useCallback(async (files: FileList): Promise<ParseResult> => {
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
      erros: [],
      formato: 'csv'
    };

    console.log('📁 Processando', files.length, 'arquivos...');

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      console.log(`📄 Processando arquivo ${i + 1}/${files.length}: ${file.name}`);

      try {
        const textContent = await file.text();
        const rows = parseCSV(textContent);
        
        if (rows.length > 0) {
          const headers = Object.keys(rows[0]);
          const tipo = detectarTipoDados(file.name, headers);
          
          if (tipo) {
            const dadosArquivo = convertCSVToDados(rows, tipo);
            
            // Mesclar com dados existentes
            result.dados.clientes.push(...dadosArquivo.clientes);
            result.dados.servicos.push(...dadosArquivo.servicos);
            result.dados.produtos.push(...dadosArquivo.produtos);
            result.dados.profissionais.push(...dadosArquivo.profissionais);
            
            if (!result.tabelas.includes(tipo)) {
              result.tabelas.push(tipo);
            }
            
            console.log(`✅ ${file.name}: ${rows.length} ${tipo}`);
          } else {
            result.erros.push(`${file.name}: tipo não identificado`);
          }
        } else {
          result.erros.push(`${file.name}: arquivo vazio ou inválido`);
        }
      } catch (error) {
        console.error(`❌ Erro em ${file.name}:`, error);
        result.erros.push(`${file.name}: ${String(error)}`);
      }
    }

    const totalRegistros = 
      result.dados.clientes.length + 
      result.dados.servicos.length + 
      result.dados.produtos.length + 
      result.dados.profissionais.length;

    if (totalRegistros > 0) {
      result.success = true;
      console.log('✅ Múltiplos arquivos parseados:', {
        clientes: result.dados.clientes.length,
        servicos: result.dados.servicos.length,
        produtos: result.dados.produtos.length,
        profissionais: result.dados.profissionais.length
      });
    }

    setParsing(false);
    return result;
  }, []);

  // ========== PARSE TEXTO DIRETO ==========
  const parseText = useCallback((textContent: string): ParseResult => {
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
      erros: [],
      formato: 'desconhecido'
    };

    try {
      const trimmedContent = textContent.trim();
      if (!trimmedContent) {
        result.erros.push('Conteúdo vazio');
        setParsing(false);
        return result;
      }

      const firstChar = trimmedContent[0];
      
      if (firstChar === '{' || firstChar === '[') {
        try {
          const jsonData = JSON.parse(trimmedContent);
          result.dados = parseJsonBackup(jsonData);
          result.formato = 'json';
          result.tabelas = Object.keys(jsonData);
          result.success = true;
        } catch (jsonError) {
          result.erros.push('JSON inválido: ' + String(jsonError));
        }
      } else {
        result.dados = parseTextoBackup(textContent);
        result.formato = 'texto';
        
        const totalRegistros = 
          result.dados.clientes.length + 
          result.dados.servicos.length + 
          result.dados.produtos.length + 
          result.dados.profissionais.length;

        if (totalRegistros > 0) {
          result.success = true;
          result.tabelas = ['clientes', 'servicos', 'produtos', 'profissionais'].filter(
            t => result.dados[t as keyof DadosBelezaSoft].length > 0
          );
        } else {
          result.erros.push('Não foi possível extrair dados do texto');
        }
      }
    } catch (error) {
      result.erros.push(String(error));
      setError(String(error));
    }

    setParsing(false);
    return result;
  }, []);

  return {
    parseFile,
    parseMultipleFiles,
    parseText,
    parsing,
    error
  };
}
