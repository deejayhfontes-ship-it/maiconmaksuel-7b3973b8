import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { DadosBelezaSoft } from './useBelezaSoftParser';

export type MergeStrategy = 'substituir' | 'mesclar';

export interface ImportProgress {
  etapa: string;
  atual: number;
  total: number;
  mensagem: string;
}

export interface ImportResult {
  success: boolean;
  clientes: { importados: number; erros: number };
  servicos: { importados: number; erros: number };
  produtos: { importados: number; erros: number };
  profissionais: { importados: number; erros: number };
  erros: string[];
}

const BATCH_SIZE = 100;

const normalizeTelefone = (tel: string | undefined): string => {
  if (!tel) return '';
  const digits = tel.replace(/\D/g, '');
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return tel;
};

const normalizeDate = (date: string | undefined): string | null => {
  if (!date) return null;
  
  // Tentar vários formatos
  const formats = [
    /^(\d{4})-(\d{2})-(\d{2})/, // YYYY-MM-DD
    /^(\d{2})\/(\d{2})\/(\d{4})/, // DD/MM/YYYY
    /^(\d{2})-(\d{2})-(\d{4})/, // DD-MM-YYYY
  ];

  for (const format of formats) {
    const match = date.match(format);
    if (match) {
      if (format === formats[0]) {
        return `${match[1]}-${match[2]}-${match[3]}`;
      } else {
        return `${match[3]}-${match[2]}-${match[1]}`;
      }
    }
  }
  
  return null;
};

export function useImportDataReal() {
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState<ImportProgress | null>(null);

  const limparDados = useCallback(async (tipos: { clientes?: boolean; servicos?: boolean; produtos?: boolean; profissionais?: boolean }) => {
    console.log('🗑️ Limpando dados existentes...');
    
    // Ordem crítica para respeitar foreign keys
    if (tipos.clientes || tipos.servicos || tipos.produtos || tipos.profissionais) {
      // Primeiro limpar tabelas dependentes
      await supabase.from('atendimento_servicos').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('atendimento_produtos').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('pagamentos').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('gorjetas').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('confirmacoes_agendamento').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('agendamentos').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('dividas_pagamentos').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('dividas').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('cheques').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('contas_receber').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('mensagens_enviadas').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('fechamentos_profissionais').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('itens_nota_fiscal').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('notas_fiscais').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('atendimentos').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    }
    
    if (tipos.clientes) {
      const { error } = await supabase.from('clientes').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (error) console.error('Erro ao limpar clientes:', error);
      else console.log('✅ Clientes limpos');
    }
    
    if (tipos.servicos) {
      const { error } = await supabase.from('servicos').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (error) console.error('Erro ao limpar serviços:', error);
      else console.log('✅ Serviços limpos');
    }
    
    if (tipos.produtos) {
      const { error } = await supabase.from('produtos').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (error) console.error('Erro ao limpar produtos:', error);
      else console.log('✅ Produtos limpos');
    }
    
    if (tipos.profissionais) {
      const { error } = await supabase.from('profissionais').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (error) console.error('Erro ao limpar profissionais:', error);
      else console.log('✅ Profissionais limpos');
    }
  }, []);

  const importarClientes = useCallback(async (clientes: DadosBelezaSoft['clientes']): Promise<{ importados: number; erros: number }> => {
    let importados = 0;
    let erros = 0;

    for (let i = 0; i < clientes.length; i += BATCH_SIZE) {
      const batch = clientes.slice(i, i + BATCH_SIZE);
      
      setProgress({
        etapa: 'clientes',
        atual: i + batch.length,
        total: clientes.length,
        mensagem: `Importando clientes ${i + 1} a ${Math.min(i + BATCH_SIZE, clientes.length)}...`
      });

      const dadosFormatados = batch.map(c => ({
        nome: c.nome,
        celular: normalizeTelefone(c.celular || c.telefone) || '(00) 00000-0000',
        telefone: normalizeTelefone(c.telefone),
        email: c.email?.toLowerCase().trim() || null,
        cpf: c.cpf?.replace(/\D/g, '') || null,
        data_nascimento: normalizeDate(c.data_nascimento),
        endereco: c.endereco || null,
        bairro: c.bairro || null,
        cidade: c.cidade || null,
        estado: c.estado || null,
        cep: c.cep?.replace(/\D/g, '') || null,
        observacoes: c.observacoes || null,
        ativo: true,
        receber_mensagens: true,
      }));

      const { error, data } = await supabase.from('clientes').insert(dadosFormatados).select('id');
      
      if (error) {
        console.error('Erro ao inserir batch de clientes:', error);
        erros += batch.length;
      } else {
        importados += data?.length || 0;
      }

      // Pequena pausa para não sobrecarregar
      await new Promise(r => setTimeout(r, 50));
    }

    return { importados, erros };
  }, []);

  const importarServicos = useCallback(async (servicos: DadosBelezaSoft['servicos']): Promise<{ importados: number; erros: number }> => {
    let importados = 0;
    let erros = 0;

    for (let i = 0; i < servicos.length; i += BATCH_SIZE) {
      const batch = servicos.slice(i, i + BATCH_SIZE);
      
      setProgress({
        etapa: 'servicos',
        atual: i + batch.length,
        total: servicos.length,
        mensagem: `Importando serviços ${i + 1} a ${Math.min(i + BATCH_SIZE, servicos.length)}...`
      });

      const dadosFormatados = batch.map(s => ({
        nome: s.nome,
        preco: s.preco || 0,
        duracao_minutos: s.duracao || 30,
        comissao_percentual: s.comissao || 0,
        descricao: s.descricao || null,
        categoria: s.categoria || 'Geral',
        ativo: true,
      }));

      const { error, data } = await supabase.from('servicos').insert(dadosFormatados).select('id');
      
      if (error) {
        console.error('Erro ao inserir batch de serviços:', error);
        erros += batch.length;
      } else {
        importados += data?.length || 0;
      }

      await new Promise(r => setTimeout(r, 50));
    }

    return { importados, erros };
  }, []);

  const importarProdutos = useCallback(async (produtos: DadosBelezaSoft['produtos']): Promise<{ importados: number; erros: number }> => {
    let importados = 0;
    let erros = 0;

    for (let i = 0; i < produtos.length; i += BATCH_SIZE) {
      const batch = produtos.slice(i, i + BATCH_SIZE);
      
      setProgress({
        etapa: 'produtos',
        atual: i + batch.length,
        total: produtos.length,
        mensagem: `Importando produtos ${i + 1} a ${Math.min(i + BATCH_SIZE, produtos.length)}...`
      });

      const dadosFormatados = batch.map(p => ({
        nome: p.nome,
        preco_venda: p.preco_venda || 0,
        preco_custo: p.preco_custo || 0,
        estoque_atual: p.estoque || 0,
        estoque_minimo: p.estoque_minimo || 0,
        codigo_barras: p.codigo_barras || null,
        categoria: p.categoria || 'Geral',
        descricao: p.descricao || null,
        ativo: true,
      }));

      const { error, data } = await supabase.from('produtos').insert(dadosFormatados).select('id');
      
      if (error) {
        console.error('Erro ao inserir batch de produtos:', error);
        erros += batch.length;
      } else {
        importados += data?.length || 0;
      }

      await new Promise(r => setTimeout(r, 50));
    }

    return { importados, erros };
  }, []);

  const importarProfissionais = useCallback(async (profissionais: DadosBelezaSoft['profissionais']): Promise<{ importados: number; erros: number }> => {
    let importados = 0;
    let erros = 0;

    for (let i = 0; i < profissionais.length; i += BATCH_SIZE) {
      const batch = profissionais.slice(i, i + BATCH_SIZE);
      
      setProgress({
        etapa: 'profissionais',
        atual: i + batch.length,
        total: profissionais.length,
        mensagem: `Importando profissionais ${i + 1} a ${Math.min(i + BATCH_SIZE, profissionais.length)}...`
      });

      const dadosFormatados = batch.map(p => ({
        nome: p.nome,
        telefone: normalizeTelefone(p.telefone) || null,
        email: p.email?.toLowerCase().trim() || null,
        comissao_padrao: p.comissao || 0,
        especialidade: p.especialidade || null,
        ativo: p.ativo !== false,
      }));

      const { error, data } = await supabase.from('profissionais').insert(dadosFormatados).select('id');
      
      if (error) {
        console.error('Erro ao inserir batch de profissionais:', error);
        erros += batch.length;
      } else {
        importados += data?.length || 0;
      }

      await new Promise(r => setTimeout(r, 50));
    }

    return { importados, erros };
  }, []);

  const executarImportacao = useCallback(async (
    dados: DadosBelezaSoft,
    opcoes: {
      clientes?: boolean;
      servicos?: boolean;
      produtos?: boolean;
      profissionais?: boolean;
    },
    strategy: MergeStrategy
  ): Promise<ImportResult> => {
    setImporting(true);
    
    const result: ImportResult = {
      success: false,
      clientes: { importados: 0, erros: 0 },
      servicos: { importados: 0, erros: 0 },
      produtos: { importados: 0, erros: 0 },
      profissionais: { importados: 0, erros: 0 },
      erros: []
    };

    try {
      // Se estratégia é substituir, limpar dados primeiro
      if (strategy === 'substituir') {
        setProgress({ etapa: 'limpando', atual: 0, total: 1, mensagem: 'Limpando dados existentes...' });
        await limparDados(opcoes);
      }

      // Importar profissionais primeiro (sem dependências)
      if (opcoes.profissionais && dados.profissionais.length > 0) {
        result.profissionais = await importarProfissionais(dados.profissionais);
      }

      // Importar clientes
      if (opcoes.clientes && dados.clientes.length > 0) {
        result.clientes = await importarClientes(dados.clientes);
      }

      // Importar serviços
      if (opcoes.servicos && dados.servicos.length > 0) {
        result.servicos = await importarServicos(dados.servicos);
      }

      // Importar produtos
      if (opcoes.produtos && dados.produtos.length > 0) {
        result.produtos = await importarProdutos(dados.produtos);
      }

      result.success = true;
      setProgress({ etapa: 'concluido', atual: 1, total: 1, mensagem: 'Importação concluída!' });

    } catch (error) {
      console.error('Erro na importação:', error);
      result.erros.push(String(error));
    }

    setImporting(false);
    return result;
  }, [limparDados, importarClientes, importarServicos, importarProdutos, importarProfissionais]);

  return {
    executarImportacao,
    importing,
    progress
  };
}
