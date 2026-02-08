/**
 * Commissions Management Component
 * Lists, filters, and manages professional commissions
 */

import { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DollarSign, Check, Download, Filter, Calendar, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { gerarPDFComissoes, downloadPDF, salvarPDFNoHistorico } from '@/lib/rhPdfService';
import { usePinAuth } from '@/contexts/PinAuthContext';

interface Comissao {
  id: string;
  profissional_id: string;
  profissional_nome?: string;
  tipo: string;
  descricao: string | null;
  valor_base: number;
  percentual_comissao: number;
  valor_comissao: number;
  status: string;
  data_referencia: string;
  data_pagamento: string | null;
}

interface Profissional {
  id: string;
  nome: string;
}

export function ComissoesPanel() {
  const { session } = usePinAuth();
  const [comissoes, setComissoes] = useState<Comissao[]>([]);
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProfissional, setSelectedProfissional] = useState<string>('all');
  const [mesReferencia, setMesReferencia] = useState(new Date());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [processing, setProcessing] = useState(false);

  const isAdmin = session?.role === 'admin';

  useEffect(() => {
    loadProfissionais();
  }, []);

  useEffect(() => {
    loadComissoes();
  }, [mesReferencia, selectedProfissional]);

  const loadProfissionais = async () => {
    const { data } = await supabase
      .from('profissionais')
      .select('id, nome')
      .eq('ativo', true)
      .order('nome');
    if (data) setProfissionais(data);
  };

  const loadComissoes = async () => {
    setLoading(true);
    try {
      const inicio = startOfMonth(mesReferencia);
      const fim = endOfMonth(mesReferencia);

      let query = supabase
        .from('comissoes')
        .select('*')
        .gte('data_referencia', format(inicio, 'yyyy-MM-dd'))
        .lte('data_referencia', format(fim, 'yyyy-MM-dd'))
        .order('data_referencia', { ascending: false });

      if (selectedProfissional !== 'all') {
        query = query.eq('profissional_id', selectedProfissional);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Map profissional names
      const comissoesComNomes = (data || []).map(c => ({
        ...c,
        profissional_nome: profissionais.find(p => p.id === c.profissional_id)?.nome || 'Desconhecido',
      }));

      setComissoes(comissoesComNomes);
    } catch (error) {
      console.error('Error loading commissions:', error);
      toast.error('Erro ao carregar comissões');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(comissoes.filter(c => c.status === 'pendente').map(c => c.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    const newSet = new Set(selectedIds);
    if (checked) {
      newSet.add(id);
    } else {
      newSet.delete(id);
    }
    setSelectedIds(newSet);
  };

  const handlePaySelected = async () => {
    if (selectedIds.size === 0) {
      toast.error('Selecione comissões para pagar');
      return;
    }

    setProcessing(true);
    try {
      const { error } = await supabase
        .from('comissoes')
        .update({
          status: 'paga',
          data_pagamento: new Date().toISOString(),
        })
        .in('id', Array.from(selectedIds));

      if (error) throw error;

      toast.success(`${selectedIds.size} comissão(ões) marcadas como pagas!`);
      setSelectedIds(new Set());
      loadComissoes();
    } catch (error) {
      console.error('Error paying commissions:', error);
      toast.error('Erro ao processar pagamentos');
    } finally {
      setProcessing(false);
    }
  };

  const handleExportPDF = async () => {
    setProcessing(true);
    try {
      const inicio = startOfMonth(mesReferencia);
      const fim = endOfMonth(mesReferencia);

      const profNome = selectedProfissional === 'all' 
        ? null 
        : profissionais.find(p => p.id === selectedProfissional)?.nome || null;

      const comissoesFormatadas = comissoes.map(c => ({
        profissionalNome: c.profissional_nome || 'Desconhecido',
        data: c.data_referencia,
        tipo: c.tipo,
        descricao: c.descricao || '',
        valorBase: Number(c.valor_base),
        percentual: Number(c.percentual_comissao),
        valorComissao: Number(c.valor_comissao),
        status: c.status,
      }));

      const pendentes = comissoes.filter(c => c.status === 'pendente');
      const pagas = comissoes.filter(c => c.status === 'paga');

      const totais = {
        pendente: pendentes.reduce((sum, c) => sum + Number(c.valor_comissao), 0),
        pago: pagas.reduce((sum, c) => sum + Number(c.valor_comissao), 0),
        total: comissoes.reduce((sum, c) => sum + Number(c.valor_comissao), 0),
      };

      const blob = await gerarPDFComissoes(profNome, { inicio, fim }, comissoesFormatadas, totais);
      
      // Save to history
      await salvarPDFNoHistorico(
        blob,
        'comissoes',
        null,
        { inicio, fim },
        selectedProfissional === 'all' ? null : selectedProfissional,
        selectedProfissional === 'all' ? null : 'profissional',
        totais,
        session?.nome || 'Sistema'
      );

      const fileName = `comissoes_${format(mesReferencia, 'yyyy-MM')}.pdf`;
      downloadPDF(blob, fileName);
      toast.success('PDF gerado com sucesso!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Erro ao gerar PDF');
    } finally {
      setProcessing(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const totalPendente = comissoes
    .filter(c => c.status === 'pendente')
    .reduce((sum, c) => sum + Number(c.valor_comissao), 0);

  const totalPago = comissoes
    .filter(c => c.status === 'paga')
    .reduce((sum, c) => sum + Number(c.valor_comissao), 0);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Comissões
        </CardTitle>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportPDF} disabled={processing}>
            <Download className="h-4 w-4 mr-1" />
            PDF
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Select
              value={format(mesReferencia, 'yyyy-MM')}
              onValueChange={(value) => setMesReferencia(new Date(value + '-01'))}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[0, 1, 2, 3, 4, 5].map(i => {
                  const date = subMonths(new Date(), i);
                  return (
                    <SelectItem key={i} value={format(date, 'yyyy-MM')}>
                      {format(date, "MMMM 'de' yyyy", { locale: ptBR })}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <Select value={selectedProfissional} onValueChange={setSelectedProfissional}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Profissional" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {profissionais.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isAdmin && selectedIds.size > 0 && (
            <Button onClick={handlePaySelected} disabled={processing} className="gap-1">
              <Check className="h-4 w-4" />
              Pagar Selecionadas ({selectedIds.size})
            </Button>
          )}
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="p-4 bg-orange-500/10 rounded-lg">
            <p className="text-sm text-muted-foreground">Pendente</p>
            <p className="text-xl font-bold text-orange-600">{formatCurrency(totalPendente)}</p>
          </div>
          <div className="p-4 bg-green-500/10 rounded-lg">
            <p className="text-sm text-muted-foreground">Pago</p>
            <p className="text-xl font-bold text-green-600">{formatCurrency(totalPago)}</p>
          </div>
          <div className="p-4 bg-primary/10 rounded-lg">
            <p className="text-sm text-muted-foreground">Total</p>
            <p className="text-xl font-bold text-primary">{formatCurrency(totalPendente + totalPago)}</p>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {isAdmin && (
                  <TableHead className="w-10">
                    <Checkbox
                      checked={selectedIds.size === comissoes.filter(c => c.status === 'pendente').length && selectedIds.size > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                )}
                <TableHead>Data</TableHead>
                <TableHead>Profissional</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Base</TableHead>
                <TableHead className="text-center">%</TableHead>
                <TableHead className="text-right">Comissão</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 8 : 7} className="text-center py-8 text-muted-foreground">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : comissoes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 8 : 7} className="text-center py-8 text-muted-foreground">
                    Nenhuma comissão no período
                  </TableCell>
                </TableRow>
              ) : (
                comissoes.map(c => (
                  <TableRow key={c.id}>
                    {isAdmin && (
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(c.id)}
                          onCheckedChange={(checked) => handleSelectOne(c.id, !!checked)}
                          disabled={c.status === 'paga'}
                        />
                      </TableCell>
                    )}
                    <TableCell>{format(new Date(c.data_referencia), 'dd/MM')}</TableCell>
                    <TableCell className="font-medium">{c.profissional_nome}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {c.tipo}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(Number(c.valor_base))}</TableCell>
                    <TableCell className="text-center">{c.percentual_comissao}%</TableCell>
                    <TableCell className="text-right font-semibold">{formatCurrency(Number(c.valor_comissao))}</TableCell>
                    <TableCell>
                      <Badge variant={c.status === 'paga' ? 'default' : 'secondary'} className={c.status === 'paga' ? 'bg-green-600' : ''}>
                        {c.status === 'paga' ? '✓ Pago' : '○ Pendente'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
