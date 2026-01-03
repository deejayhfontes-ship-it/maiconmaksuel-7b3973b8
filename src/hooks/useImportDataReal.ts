import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { DadosBelezaSoft } from './useBelezaSoftParser';
import { toast } from 'sonner';

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

const BATCH_SIZE = 50;

// ========== FUNÇÕES DE NORMALIZAÇÃO ==========
const normalizeTelefone = (tel: string | undefined): string => {
  if (!tel) return '';
  const digits = tel.replace(/\D/g, '');
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  if (digits.length >= 8) {
    return `(00) ${digits.slice(0, 5)}-${digits.slice(5, 9)}`;
  }
  return tel || '(00) 00000-0000';
};

const normalizeDate = (date: string | undefined): string | null => {
  if (!date) return null;
  
  // Limpar a string
  const cleaned = date.trim();
  
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(cleaned)) {
    return cleaned.substring(0, 10);
  }
  
  // DD/MM/YYYY
  const brMatch = cleaned.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (brMatch) {
    return `${brMatch[3]}-${brMatch[2]}-${brMatch[1]}`;
  }
  
  // DD-MM-YYYY
  const brMatch2 = cleaned.match(/^(\d{2})-(\d{2})-(\d{4})/);
  if (brMatch2) {
    return `${brMatch2[3]}-${brMatch2[2]}-${brMatch2[1]}`;
  }
  
  return null;
};

const normalizeEmail = (email: string | undefined): string | null => {
  if (!email) return null;
  const cleaned = email.trim().toLowerCase();
  // Validação básica de email
  if (cleaned.includes('@') && cleaned.includes('.')) {
    return cleaned;
  }
  return null;
};

const normalizeCPF = (cpf: string | undefined): string | null => {
  if (!cpf) return null;
  const digits = cpf.replace(/\D/g, '');
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  }
  return null;
};

export function useImportDataReal() {
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState<ImportProgress | null>(null);

  // ========== LIMPAR DADOS ==========
  const limparDados = useCallback(async (tipos: { 
    clientes?: boolean; 
    servicos?: boolean; 
    produtos?: boolean; 
    profissionais?: boolean 
  }) => {
    console.log('🗑️ Limpando dados existentes...');
    setProgress({ etapa: 'limpando', atual: 0, total: 10, mensagem: 'Removendo dados dependentes...' });
    
    try {
      // Ordem crítica para respeitar foreign keys
      // 1. Limpar tabelas mais dependentes primeiro
      setProgress({ etapa: 'limpando', atual: 1, total: 10, mensagem: 'Limpando atendimento_servicos...' });
      await supabase.from('atendimento_servicos').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      
      setProgress({ etapa: 'limpando', atual: 2, total: 10, mensagem: 'Limpando atendimento_produtos...' });
      await supabase.from('atendimento_produtos').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      
      setProgress({ etapa: 'limpando', atual: 3, total: 10, mensagem: 'Limpando pagamentos...' });
      await supabase.from('pagamentos').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      
      setProgress({ etapa: 'limpando', atual: 4, total: 10, mensagem: 'Limpando gorjetas...' });
      await supabase.from('gorjetas').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      
      setProgress({ etapa: 'limpando', atual: 5, total: 10, mensagem: 'Limpando confirmações...' });
      await supabase.from('confirmacoes_agendamento').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      
      setProgress({ etapa: 'limpando', atual: 6, total: 10, mensagem: 'Limpando agendamentos...' });
      await supabase.from('agendamentos').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      
      setProgress({ etapa: 'limpando', atual: 7, total: 10, mensagem: 'Limpando dívidas...' });
      await supabase.from('dividas_pagamentos').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('dividas').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      
      setProgress({ etapa: 'limpando', atual: 8, total: 10, mensagem: 'Limpando notas fiscais...' });
      await supabase.from('itens_nota_fiscal').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('notas_fiscais').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      
      setProgress({ etapa: 'limpando', atual: 9, total: 10, mensagem: 'Limpando atendimentos...' });
      await supabase.from('atendimentos').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      
      // 2. Limpar tabelas principais
      if (tipos.clientes) {
        setProgress({ etapa: 'limpando', atual: 10, total: 10, mensagem: 'Limpando clientes...' });
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
        await supabase.from('fechamentos_profissionais').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        const { error } = await supabase.from('profissionais').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        if (error) console.error('Erro ao limpar profissionais:', error);
        else console.log('✅ Profissionais limpos');
      }
      
      console.log('✅ Limpeza concluída');
    } catch (error) {
      console.error('Erro na limpeza:', error);
      throw error;
    }
  }, []);

  // ========== IMPORTAR CLIENTES ==========
  const importarClientes = useCallback(async (clientes: DadosBelezaSoft['clientes']): Promise<{ importados: number; erros: number }> => {
    let importados = 0;
    let erros = 0;
    const totalBatches = Math.ceil(clientes.length / BATCH_SIZE);

    console.log(`📥 Importando ${clientes.length} clientes em ${totalBatches} lotes...`);

    for (let i = 0; i < clientes.length; i += BATCH_SIZE) {
      const batch = clientes.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      
      setProgress({
        etapa: 'clientes',
        atual: i + batch.length,
        total: clientes.length,
        mensagem: `Lote ${batchNum}/${totalBatches} - ${batch.length} clientes`
      });

      const dadosFormatados = batch.map(c => ({
        nome: c.nome.substring(0, 255),
        celular: normalizeTelefone(c.celular || c.telefone) || '(00) 00000-0000',
        telefone: c.telefone ? normalizeTelefone(c.telefone) : null,
        email: normalizeEmail(c.email),
        cpf: normalizeCPF(c.cpf),
        data_nascimento: normalizeDate(c.data_nascimento),
        endereco: c.endereco || null,
        bairro: c.bairro || null,
        cidade: c.cidade || null,
        estado: c.estado || null,
        cep: c.cep?.replace(/\D/g, '') || null,
        observacoes: c.observacoes || null,
        ativo: true,
        receber_mensagens: true,
        total_visitas: 0,
      }));

      const { error, data } = await supabase.from('clientes').insert(dadosFormatados).select('id');
      
      if (error) {
        console.error(`Erro no lote ${batchNum}:`, error);
        erros += batch.length;
      } else {
        importados += data?.length || 0;
      }

      // Pausa para não sobrecarregar
      await new Promise(r => setTimeout(r, 100));
    }

    console.log(`✅ Clientes: ${importados} importados, ${erros} erros`);
    return { importados, erros };
  }, []);

  // ========== IMPORTAR SERVIÇOS ==========
  const importarServicos = useCallback(async (servicos: DadosBelezaSoft['servicos']): Promise<{ importados: number; erros: number }> => {
    let importados = 0;
    let erros = 0;

    console.log(`📥 Importando ${servicos.length} serviços...`);

    for (let i = 0; i < servicos.length; i += BATCH_SIZE) {
      const batch = servicos.slice(i, i + BATCH_SIZE);
      
      setProgress({
        etapa: 'servicos',
        atual: i + batch.length,
        total: servicos.length,
        mensagem: `Importando serviços ${i + 1} a ${Math.min(i + BATCH_SIZE, servicos.length)}...`
      });

      const dadosFormatados = batch.map(s => ({
        nome: s.nome.substring(0, 255),
        preco: s.preco || 0,
        duracao_minutos: s.duracao || 30,
        comissao_percentual: s.comissao || 0,
        descricao: s.descricao || null,
        categoria: s.categoria || 'Geral',
        ativo: true,
      }));

      const { error, data } = await supabase.from('servicos').insert(dadosFormatados).select('id');
      
      if (error) {
        console.error('Erro ao inserir serviços:', error);
        erros += batch.length;
      } else {
        importados += data?.length || 0;
      }

      await new Promise(r => setTimeout(r, 50));
    }

    console.log(`✅ Serviços: ${importados} importados, ${erros} erros`);
    return { importados, erros };
  }, []);

  // ========== IMPORTAR PRODUTOS ==========
  const importarProdutos = useCallback(async (produtos: DadosBelezaSoft['produtos']): Promise<{ importados: number; erros: number }> => {
    let importados = 0;
    let erros = 0;

    console.log(`📥 Importando ${produtos.length} produtos...`);

    for (let i = 0; i < produtos.length; i += BATCH_SIZE) {
      const batch = produtos.slice(i, i + BATCH_SIZE);
      
      setProgress({
        etapa: 'produtos',
        atual: i + batch.length,
        total: produtos.length,
        mensagem: `Importando produtos ${i + 1} a ${Math.min(i + BATCH_SIZE, produtos.length)}...`
      });

      const dadosFormatados = batch.map(p => ({
        nome: p.nome.substring(0, 255),
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
        console.error('Erro ao inserir produtos:', error);
        erros += batch.length;
      } else {
        importados += data?.length || 0;
      }

      await new Promise(r => setTimeout(r, 50));
    }

    console.log(`✅ Produtos: ${importados} importados, ${erros} erros`);
    return { importados, erros };
  }, []);

  // ========== IMPORTAR PROFISSIONAIS ==========
  const importarProfissionais = useCallback(async (profissionais: DadosBelezaSoft['profissionais']): Promise<{ importados: number; erros: number }> => {
    let importados = 0;
    let erros = 0;

    console.log(`📥 Importando ${profissionais.length} profissionais...`);

    for (let i = 0; i < profissionais.length; i += BATCH_SIZE) {
      const batch = profissionais.slice(i, i + BATCH_SIZE);
      
      setProgress({
        etapa: 'profissionais',
        atual: i + batch.length,
        total: profissionais.length,
        mensagem: `Importando profissionais ${i + 1} a ${Math.min(i + BATCH_SIZE, profissionais.length)}...`
      });

      const dadosFormatados = batch.map(p => ({
        nome: p.nome.substring(0, 255),
        telefone: p.telefone ? normalizeTelefone(p.telefone) : null,
        email: normalizeEmail(p.email),
        comissao_padrao: p.comissao || 0,
        especialidade: p.especialidade || null,
        ativo: p.ativo !== false,
      }));

      const { error, data } = await supabase.from('profissionais').insert(dadosFormatados).select('id');
      
      if (error) {
        console.error('Erro ao inserir profissionais:', error);
        erros += batch.length;
      } else {
        importados += data?.length || 0;
      }

      await new Promise(r => setTimeout(r, 50));
    }

    console.log(`✅ Profissionais: ${importados} importados, ${erros} erros`);
    return { importados, erros };
  }, []);

  // ========== EXECUTAR IMPORTAÇÃO COMPLETA ==========
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

    console.log('🚀 INICIANDO IMPORTAÇÃO REAL...');
    console.log('📊 Estratégia:', strategy);
    console.log('📊 Opções:', opcoes);
    console.log('📊 Dados:', {
      clientes: dados.clientes.length,
      servicos: dados.servicos.length,
      produtos: dados.produtos.length,
      profissionais: dados.profissionais.length
    });

    try {
      // 1. LIMPAR DADOS (se estratégia é substituir)
      if (strategy === 'substituir') {
        toast.loading('Limpando dados existentes...');
        await limparDados(opcoes);
        toast.dismiss();
      }

      // 2. IMPORTAR PROFISSIONAIS (primeiro, sem dependências)
      if (opcoes.profissionais && dados.profissionais.length > 0) {
        toast.loading(`Importando ${dados.profissionais.length} profissionais...`);
        result.profissionais = await importarProfissionais(dados.profissionais);
        toast.dismiss();
      }

      // 3. IMPORTAR CLIENTES
      if (opcoes.clientes && dados.clientes.length > 0) {
        toast.loading(`Importando ${dados.clientes.length} clientes...`);
        result.clientes = await importarClientes(dados.clientes);
        toast.dismiss();
      }

      // 4. IMPORTAR SERVIÇOS
      if (opcoes.servicos && dados.servicos.length > 0) {
        toast.loading(`Importando ${dados.servicos.length} serviços...`);
        result.servicos = await importarServicos(dados.servicos);
        toast.dismiss();
      }

      // 5. IMPORTAR PRODUTOS
      if (opcoes.produtos && dados.produtos.length > 0) {
        toast.loading(`Importando ${dados.produtos.length} produtos...`);
        result.produtos = await importarProdutos(dados.produtos);
        toast.dismiss();
      }

      result.success = true;
      setProgress({ etapa: 'concluido', atual: 1, total: 1, mensagem: 'Importação concluída!' });

      const totalImportados = 
        result.clientes.importados + 
        result.servicos.importados + 
        result.produtos.importados + 
        result.profissionais.importados;

      console.log(`✅ IMPORTAÇÃO CONCLUÍDA! Total: ${totalImportados} registros`);

    } catch (error) {
      console.error('❌ ERRO NA IMPORTAÇÃO:', error);
      result.erros.push(String(error));
      toast.dismiss();
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
