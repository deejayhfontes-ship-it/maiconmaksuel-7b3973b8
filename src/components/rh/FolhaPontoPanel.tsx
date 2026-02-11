/**
 * Monthly Time Sheet Component
 * Displays and manages monthly time tracking for employees and professionals
 */

import { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, subMonths, eachDayOfInterval, isWeekend } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Clock, Download, Lock, Unlock, RefreshCw, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { gerarPDFFolhaPonto, downloadPDF, salvarPDFNoHistorico } from '@/lib/rhPdfService';
import { usePinAuth } from '@/contexts/PinAuthContext';

interface Pessoa {
  id: string;
  nome: string;
  tipo: 'funcionario' | 'profissional';
  cargo?: string;
}

interface PontoRegistro {
  data: string;
  entrada_manha: string | null;
  saida_almoco: string | null;
  entrada_tarde: string | null;
  saida: string | null;
  horas_trabalhadas: number | null;
  observacoes: string | null;
}

interface FolhaPonto {
  id: string;
  tipo_pessoa: string;
  pessoa_id: string;
  mes_referencia: string;
  total_horas_trabalhadas: number;
  total_horas_extras: number;
  total_atrasos_minutos: number;
  total_faltas: number;
  dias_trabalhados: number;
  banco_horas_saldo: number;
  status: string;
  fechada_em: string | null;
  fechada_por: string | null;
}

export function FolhaPontoPanel() {
  const { session } = usePinAuth();
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [selectedPessoa, setSelectedPessoa] = useState<string>('');
  const [mesReferencia, setMesReferencia] = useState(new Date());
  const [pontos, setPontos] = useState<PontoRegistro[]>([]);
  const [folha, setFolha] = useState<FolhaPonto | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [showReopenDialog, setShowReopenDialog] = useState(false);
  const [reopenMotivo, setReopenMotivo] = useState('');

  const isAdmin = session?.role === 'admin';

  useEffect(() => {
    loadPessoas();
  }, []);

  useEffect(() => {
    if (selectedPessoa) {
      loadPontos();
      loadFolha();
    }
  }, [selectedPessoa, mesReferencia]);

  const loadPessoas = async () => {
    try {
      const [funcRes, profRes] = await Promise.all([
        supabase.from('funcionarios').select('id, nome, cargo').eq('ativo', true).order('nome'),
        supabase.from('profissionais').select('id, nome, especialidade').eq('ativo', true).order('nome'),
      ]);

      const funcionarios: Pessoa[] = (funcRes.data || []).map(f => ({
        id: f.id,
        nome: f.nome,
        tipo: 'funcionario' as const,
        cargo: f.cargo,
      }));

      const profissionais: Pessoa[] = (profRes.data || []).map(p => ({
        id: p.id,
        nome: p.nome,
        tipo: 'profissional' as const,
        cargo: p.especialidade || 'Profissional',
      }));

      setPessoas([...funcionarios, ...profissionais]);
      
      if (funcionarios.length > 0) {
        setSelectedPessoa(`funcionario-${funcionarios[0].id}`);
      } else if (profissionais.length > 0) {
        setSelectedPessoa(`profissional-${profissionais[0].id}`);
      }
    } catch (error) {
      console.error('Error loading pessoas:', error);
    }
  };

  const loadPontos = async (showToast = false) => {
    if (!selectedPessoa) return;

    setLoading(true);
    try {
      const [tipo, id] = selectedPessoa.split('-');
      const inicio = startOfMonth(mesReferencia);
      const fim = endOfMonth(mesReferencia);

      console.log('[FOLHA_PONTO] fetch_supabase', { tipo, id, inicio: format(inicio, 'yyyy-MM-dd'), fim: format(fim, 'yyyy-MM-dd') });

      const { data, error } = await supabase
        .from('ponto_registros')
        .select('*')
        .eq('tipo_pessoa', tipo)
        .eq('pessoa_id', id)
        .gte('data', format(inicio, 'yyyy-MM-dd'))
        .lte('data', format(fim, 'yyyy-MM-dd'))
        .order('data', { ascending: true });

      if (error) throw error;

      // Create a map of all days in the month
      const diasDoMes = eachDayOfInterval({ start: inicio, end: fim });
      const pontosMap = new Map((data || []).map(p => [p.data, p]));

      const pontosCompletos: PontoRegistro[] = diasDoMes.map(dia => {
        const dataStr = format(dia, 'yyyy-MM-dd');
        const ponto = pontosMap.get(dataStr);
        
        return {
          data: dataStr,
          entrada_manha: ponto?.entrada_manha || null,
          saida_almoco: ponto?.saida_almoco || null,
          entrada_tarde: ponto?.entrada_tarde || null,
          saida: ponto?.saida || null,
          horas_trabalhadas: ponto?.horas_trabalhadas || null,
          observacoes: ponto?.observacoes || null,
        };
      });

      setPontos(pontosCompletos);
      if (showToast) toast.success('Dados atualizados do servidor');
    } catch (error) {
      console.error('[FOLHA_PONTO] fetch_error', error);
      if (showToast) toast.error('Erro ao atualizar dados');
    } finally {
      setLoading(false);
    }
  };

  const loadFolha = async () => {
    if (!selectedPessoa) return;

    try {
      const [tipo, id] = selectedPessoa.split('-');
      const mesStr = format(startOfMonth(mesReferencia), 'yyyy-MM-dd');

      const { data, error } = await supabase
        .from('folha_ponto_mensal')
        .select('*')
        .eq('tipo_pessoa', tipo)
        .eq('pessoa_id', id)
        .eq('mes_referencia', mesStr)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setFolha(data as FolhaPonto | null);
    } catch (error) {
      console.error('Error loading folha:', error);
    }
  };

  const calcularTotais = () => {
    let totalMinutos = 0;
    let diasTrabalhados = 0;
    let totalAtrasos = 0;

    pontos.forEach(p => {
      if (p.entrada_manha && p.saida) {
        diasTrabalhados++;
        totalMinutos += (p.horas_trabalhadas || 0) * 60;
      }
    });

    const totalHoras = totalMinutos / 60;
    const horasEsperadas = diasTrabalhados * 8;
    const horasExtras = Math.max(0, totalHoras - horasEsperadas);
    const bancoHoras = totalHoras - horasEsperadas;

    return {
      totalHoras: Number(totalHoras.toFixed(2)),
      horasExtras: Number(horasExtras.toFixed(2)),
      diasTrabalhados,
      bancoHoras: Number(bancoHoras.toFixed(2)),
      atrasos: totalAtrasos,
    };
  };

  const handleGerarFolha = async () => {
    if (!selectedPessoa) return;

    setProcessing(true);
    try {
      const [tipo, id] = selectedPessoa.split('-');
      const mesStr = format(startOfMonth(mesReferencia), 'yyyy-MM-dd');
      const totais = calcularTotais();

      const { data, error } = await supabase
        .from('folha_ponto_mensal')
        .upsert({
          tipo_pessoa: tipo,
          pessoa_id: id,
          mes_referencia: mesStr,
          total_horas_trabalhadas: totais.totalHoras,
          total_horas_extras: totais.horasExtras,
          total_atrasos_minutos: totais.atrasos,
          total_faltas: 0,
          dias_trabalhados: totais.diasTrabalhados,
          banco_horas_saldo: totais.bancoHoras,
          status: 'aberta',
        }, {
          onConflict: 'tipo_pessoa,pessoa_id,mes_referencia',
        })
        .select()
        .single();

      if (error) throw error;
      setFolha(data as FolhaPonto);
      toast.success('Folha de ponto atualizada!');
    } catch (error) {
      console.error('Error generating folha:', error);
      toast.error('Erro ao gerar folha de ponto');
    } finally {
      setProcessing(false);
    }
  };

  const handleFecharFolha = async () => {
    if (!folha) return;

    setProcessing(true);
    try {
      const { error } = await supabase
        .from('folha_ponto_mensal')
        .update({
          status: 'fechada',
          fechada_em: new Date().toISOString(),
          fechada_por: session?.nome || 'Sistema',
        })
        .eq('id', folha.id);

      if (error) throw error;
      setFolha({ ...folha, status: 'fechada' });
      toast.success('Folha de ponto fechada!');
    } catch (error) {
      console.error('Error closing folha:', error);
      toast.error('Erro ao fechar folha de ponto');
    } finally {
      setProcessing(false);
    }
  };

  const handleReabrirFolha = async () => {
    if (!folha || !reopenMotivo.trim()) {
      toast.error('Informe o motivo da reabertura');
      return;
    }

    setProcessing(true);
    try {
      const { error } = await supabase
        .from('folha_ponto_mensal')
        .update({
          status: 'reaberta',
          reaberta_em: new Date().toISOString(),
          reaberta_por: session?.nome || 'Sistema',
          motivo_reabertura: reopenMotivo,
        })
        .eq('id', folha.id);

      if (error) throw error;
      setFolha({ ...folha, status: 'reaberta' });
      setShowReopenDialog(false);
      setReopenMotivo('');
      toast.success('Folha de ponto reaberta!');
    } catch (error) {
      console.error('Error reopening folha:', error);
      toast.error('Erro ao reabrir folha de ponto');
    } finally {
      setProcessing(false);
    }
  };

  const handleExportPDF = async () => {
    if (!selectedPessoa) return;

    setProcessing(true);
    try {
      const pessoa = pessoas.find(p => `${p.tipo}-${p.id}` === selectedPessoa);
      if (!pessoa) return;

      const totais = calcularTotais();

      const diasFormatados = pontos.map(p => ({
        data: p.data,
        entrada: p.entrada_manha || '',
        saidaAlmoco: p.saida_almoco || '',
        entradaTarde: p.entrada_tarde || '',
        saida: p.saida || '',
        horasTrabalhadas: p.horas_trabalhadas || 0,
        observacao: p.observacoes || undefined,
      }));

      const blob = await gerarPDFFolhaPonto(pessoa.nome, mesReferencia, {
        dias: diasFormatados,
        totalHoras: totais.totalHoras,
        horasExtras: totais.horasExtras,
        atrasos: totais.atrasos,
        bancoHoras: totais.bancoHoras,
        diasTrabalhados: totais.diasTrabalhados,
      });

      // Save to history
      const [tipo, id] = selectedPessoa.split('-');
      await salvarPDFNoHistorico(
        blob,
        'folha_ponto',
        null,
        { inicio: startOfMonth(mesReferencia), fim: endOfMonth(mesReferencia) },
        id,
        tipo as 'funcionario' | 'profissional',
        totais,
        session?.nome || 'Sistema'
      );

      const fileName = `folha_ponto_${pessoa.nome.replace(/\s+/g, '_')}_${format(mesReferencia, 'yyyy-MM')}.pdf`;
      downloadPDF(blob, fileName);
      toast.success('PDF gerado com sucesso!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Erro ao gerar PDF');
    } finally {
      setProcessing(false);
    }
  };

  const formatTime = (time: string | null) => {
    if (!time) return '--:--';
    return time.substring(0, 5);
  };

  const formatHours = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h${m.toString().padStart(2, '0')}`;
  };

  const totais = calcularTotais();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Folha de Ponto Mensal
        </CardTitle>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportPDF} disabled={processing || !selectedPessoa}>
            <Download className="h-4 w-4 mr-1" />
            PDF
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <Select value={selectedPessoa} onValueChange={setSelectedPessoa}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {pessoas.map(p => (
                  <SelectItem key={`${p.tipo}-${p.id}`} value={`${p.tipo}-${p.id}`}>
                    {p.tipo === 'funcionario' ? '👔' : '💇'} {p.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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

          <Button variant="outline" onClick={() => loadPontos(true)} disabled={processing || loading || !selectedPessoa}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>

          <Button variant="outline" onClick={handleGerarFolha} disabled={processing || !selectedPessoa}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Gerar Folha
          </Button>

          {isAdmin && folha && (
            <>
              {folha.status === 'aberta' || folha.status === 'reaberta' ? (
                <Button onClick={handleFecharFolha} disabled={processing}>
                  <Lock className="h-4 w-4 mr-1" />
                  Fechar Folha
                </Button>
              ) : (
                <Button variant="outline" onClick={() => setShowReopenDialog(true)} disabled={processing}>
                  <Unlock className="h-4 w-4 mr-1" />
                  Reabrir
                </Button>
              )}
            </>
          )}
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="p-3 bg-primary/10 rounded-lg text-center">
            <p className="text-xs text-muted-foreground">Dias Trabalhados</p>
            <p className="text-xl font-bold text-primary">{totais.diasTrabalhados}</p>
          </div>
          <div className="p-3 bg-green-500/10 rounded-lg text-center">
            <p className="text-xs text-muted-foreground">Total Horas</p>
            <p className="text-xl font-bold text-green-600">{formatHours(totais.totalHoras)}</p>
          </div>
          <div className="p-3 bg-blue-500/10 rounded-lg text-center">
            <p className="text-xs text-muted-foreground">Horas Extras</p>
            <p className="text-xl font-bold text-blue-600">{formatHours(totais.horasExtras)}</p>
          </div>
          <div className="p-3 bg-orange-500/10 rounded-lg text-center">
            <p className="text-xs text-muted-foreground">Atrasos</p>
            <p className="text-xl font-bold text-orange-600">{totais.atrasos}min</p>
          </div>
          <div className={`p-3 rounded-lg text-center ${totais.bancoHoras >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
            <p className="text-xs text-muted-foreground">Banco de Horas</p>
            <p className={`text-xl font-bold ${totais.bancoHoras >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {totais.bancoHoras >= 0 ? '+' : ''}{formatHours(totais.bancoHoras)}
            </p>
          </div>
        </div>

        {/* Status */}
        {folha && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Status:</span>
            <Badge variant={folha.status === 'fechada' ? 'default' : 'secondary'} className={folha.status === 'fechada' ? 'bg-green-600' : ''}>
              {folha.status === 'fechada' ? '🔒 Fechada' : folha.status === 'reaberta' ? '🔓 Reaberta' : '📝 Aberta'}
            </Badge>
            {folha.fechada_em && (
              <span className="text-xs text-muted-foreground">
                em {format(new Date(folha.fechada_em), "dd/MM/yyyy 'às' HH:mm")} por {folha.fechada_por}
              </span>
            )}
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-background">
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead className="text-center">Entrada</TableHead>
                <TableHead className="text-center">Almoço</TableHead>
                <TableHead className="text-center">Retorno</TableHead>
                <TableHead className="text-center">Saída</TableHead>
                <TableHead className="text-center">Horas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : (
                pontos.map(p => {
                  const dia = new Date(p.data + 'T12:00:00');
                  const isWeekendDay = isWeekend(dia);
                  const hasWork = p.entrada_manha || p.saida;
                  
                  return (
                    <TableRow 
                      key={p.data} 
                      className={isWeekendDay && !hasWork ? 'bg-muted/30' : ''}
                    >
                      <TableCell className="font-medium">
                        {format(dia, 'dd/MM (EEE)', { locale: ptBR })}
                      </TableCell>
                      <TableCell className="text-center">{formatTime(p.entrada_manha)}</TableCell>
                      <TableCell className="text-center">{formatTime(p.saida_almoco)}</TableCell>
                      <TableCell className="text-center">{formatTime(p.entrada_tarde)}</TableCell>
                      <TableCell className="text-center">{formatTime(p.saida)}</TableCell>
                      <TableCell className="text-center font-semibold text-primary">
                        {p.horas_trabalhadas ? `${p.horas_trabalhadas}h` : '--'}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {/* Reopen Dialog */}
      <Dialog open={showReopenDialog} onOpenChange={setShowReopenDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reabrir Folha de Ponto</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Informe o motivo para reabrir esta folha de ponto. Esta ação será registrada no histórico.
            </p>
            <div className="space-y-2">
              <Label>Motivo da reabertura *</Label>
              <Input
                value={reopenMotivo}
                onChange={(e) => setReopenMotivo(e.target.value)}
                placeholder="Ex: Correção de registro incorreto"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReopenDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleReabrirFolha} disabled={processing || !reopenMotivo.trim()}>
              Reabrir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
