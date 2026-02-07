import { useState, useEffect } from 'react';
import { Clock, Check, ArrowRight, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

interface Pessoa {
  id: string;
  nome: string;
  cargo_especialidade: string;
  tipo: 'profissional' | 'funcionario';
}

interface PontoRegistro {
  entrada_manha: string | null;
  saida_almoco: string | null;
  entrada_tarde: string | null;
  saida: string | null;
}

const PontoEletronico = () => {
  const navigate = useNavigate();
  const [horaAtual, setHoraAtual] = useState(new Date());
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [pessoaSelecionada, setPessoaSelecionada] = useState<string>('');
  const [pontoHoje, setPontoHoje] = useState<PontoRegistro | null>(null);
  const [loading, setLoading] = useState(false);

  // Atualiza relógio a cada segundo
  useEffect(() => {
    const timer = setInterval(() => setHoraAtual(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Carrega funcionários e profissionais
  useEffect(() => {
    carregarPessoas();
  }, []);

  // Carrega ponto quando seleciona pessoa
  useEffect(() => {
    if (pessoaSelecionada) {
      carregarPontoHoje();
    } else {
      setPontoHoje(null);
    }
  }, [pessoaSelecionada]);

  const carregarPessoas = async () => {
    try {
      const [funcRes, profRes] = await Promise.all([
        supabase.from('funcionarios').select('id, nome, cargo').eq('ativo', true),
        supabase.from('profissionais').select('id, nome, especialidade').eq('ativo', true)
      ]);

      const funcionarios: Pessoa[] = (funcRes.data || []).map(f => ({
        id: f.id,
        nome: f.nome,
        cargo_especialidade: f.cargo || 'Funcionário',
        tipo: 'funcionario'
      }));

      const profissionais: Pessoa[] = (profRes.data || []).map(p => ({
        id: p.id,
        nome: p.nome,
        cargo_especialidade: p.especialidade || 'Profissional',
        tipo: 'profissional'
      }));

      setPessoas([...funcionarios, ...profissionais]);
    } catch (error) {
      console.error('Erro ao carregar pessoas:', error);
    }
  };

  const carregarPontoHoje = async () => {
    if (!pessoaSelecionada) return;

    const [tipo, id] = pessoaSelecionada.split('-');
    const hoje = format(new Date(), 'yyyy-MM-dd');

    const { data } = await supabase
      .from('ponto_registros')
      .select('entrada_manha, saida_almoco, entrada_tarde, saida')
      .eq('tipo_pessoa', tipo)
      .eq('pessoa_id', id)
      .eq('data', hoje)
      .single();

    setPontoHoje(data || null);
  };

  const getProximoPonto = () => {
    if (!pontoHoje || !pontoHoje.entrada_manha) return { tipo: 'entrada_manha', label: 'Entrada' };
    if (!pontoHoje.saida_almoco) return { tipo: 'saida_almoco', label: 'Almoço' };
    if (!pontoHoje.entrada_tarde) return { tipo: 'entrada_tarde', label: 'Retorno' };
    if (!pontoHoje.saida) return { tipo: 'saida', label: 'Saída' };
    return { tipo: 'completo', label: 'Completo' };
  };

  const calcularHorasTrabalhadas = (ponto: PontoRegistro) => {
    if (!ponto.entrada_manha || !ponto.saida) return 0;

    const entrada = new Date(`2000-01-01T${ponto.entrada_manha}`);
    const saida = new Date(`2000-01-01T${ponto.saida}`);

    let totalMinutos = (saida.getTime() - entrada.getTime()) / 1000 / 60;

    if (ponto.saida_almoco && ponto.entrada_tarde) {
      const saidaAlmoco = new Date(`2000-01-01T${ponto.saida_almoco}`);
      const entradaTarde = new Date(`2000-01-01T${ponto.entrada_tarde}`);
      const minutosAlmoco = (entradaTarde.getTime() - saidaAlmoco.getTime()) / 1000 / 60;
      totalMinutos -= minutosAlmoco;
    }

    return Number((totalMinutos / 60).toFixed(2));
  };

  const baterPonto = async () => {
    if (!pessoaSelecionada) {
      toast.error('Selecione uma pessoa primeiro');
      return;
    }

    const proximoPonto = getProximoPonto();
    if (proximoPonto.tipo === 'completo') {
      toast.info('Todos os pontos do dia já foram registrados');
      return;
    }

    setLoading(true);
    const [tipo, id] = pessoaSelecionada.split('-');
    const agora = horaAtual.toTimeString().slice(0, 5);
    const hoje = format(new Date(), 'yyyy-MM-dd');

    try {
      const { data: registroExistente } = await supabase
        .from('ponto_registros')
        .select('id')
        .eq('tipo_pessoa', tipo)
        .eq('pessoa_id', id)
        .eq('data', hoje)
        .single();

      if (registroExistente) {
        const updateData: Record<string, unknown> = { [proximoPonto.tipo]: agora };
        
        // Calcular horas se for saída
        if (proximoPonto.tipo === 'saida') {
          const newPonto = { ...pontoHoje, saida: agora } as PontoRegistro;
          updateData.horas_trabalhadas = calcularHorasTrabalhadas(newPonto);
        }

        await supabase
          .from('ponto_registros')
          .update(updateData)
          .eq('id', registroExistente.id);
      } else {
        await supabase
          .from('ponto_registros')
          .insert({
            tipo_pessoa: tipo,
            pessoa_id: id,
            data: hoje,
            [proximoPonto.tipo]: agora
          });
      }

      toast.success(`✅ ${proximoPonto.label} registrada às ${agora}`);
      await carregarPontoHoje();
    } catch (error) {
      console.error('Erro ao bater ponto:', error);
      toast.error('Erro ao registrar ponto');
    } finally {
      setLoading(false);
    }
  };

  const pessoaAtual = pessoas.find(p => `${p.tipo}-${p.id}` === pessoaSelecionada);
  const proximoPonto = getProximoPonto();
  const funcionarios = pessoas.filter(p => p.tipo === 'funcionario');
  const profissionais = pessoas.filter(p => p.tipo === 'profissional');

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-5"
      style={{
        background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary)/0.8) 100%)'
      }}
    >
      <div 
        className="bg-background rounded-3xl p-8 sm:p-10 max-w-lg w-full text-center relative"
        style={{ boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)' }}
      >
        {/* Back Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/login')}
          className="absolute top-4 left-4 gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Button>

        {/* Header */}
        <div className="flex items-center justify-center gap-3 mb-2 mt-6">
          <Clock className="w-8 h-8 text-primary" />
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            Ponto Eletrônico
          </h1>
        </div>

        <p className="text-muted-foreground mb-8">
          {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
        </p>

        {/* Relógio grande */}
        <div 
          className="text-6xl sm:text-7xl font-bold font-mono mb-8 text-foreground"
          style={{ letterSpacing: '-2px' }}
        >
          {horaAtual.toTimeString().slice(0, 5)}
        </div>

        {/* Select Pessoa */}
        <select
          value={pessoaSelecionada}
          onChange={(e) => setPessoaSelecionada(e.target.value)}
          className="w-full h-14 text-lg px-5 border-2 border-border rounded-2xl mb-6 bg-background text-foreground focus:border-primary focus:outline-none transition-colors"
        >
          <option value="">Selecione seu nome...</option>
          
          {funcionarios.length > 0 && (
            <optgroup label="👔 Funcionários RH">
              {funcionarios.map(f => (
                <option key={`funcionario-${f.id}`} value={`funcionario-${f.id}`}>
                  {f.nome} - {f.cargo_especialidade}
                </option>
              ))}
            </optgroup>
          )}
          
          {profissionais.length > 0 && (
            <optgroup label="💇 Profissionais">
              {profissionais.map(p => (
                <option key={`profissional-${p.id}`} value={`profissional-${p.id}`}>
                  {p.nome} - {p.cargo_especialidade}
                </option>
              ))}
            </optgroup>
          )}
        </select>

        {/* Status do ponto */}
        {pessoaSelecionada && pontoHoje && (
          <div className="grid grid-cols-4 gap-2 mb-6 text-sm">
            <div className={`p-3 rounded-xl ${pontoHoje.entrada_manha ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-muted text-muted-foreground'}`}>
              <div className="font-semibold">{pontoHoje.entrada_manha?.slice(0, 5) || '--:--'}</div>
              <div className="text-xs">Entrada</div>
            </div>
            <div className={`p-3 rounded-xl ${pontoHoje.saida_almoco ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400' : 'bg-muted text-muted-foreground'}`}>
              <div className="font-semibold">{pontoHoje.saida_almoco?.slice(0, 5) || '--:--'}</div>
              <div className="text-xs">Almoço</div>
            </div>
            <div className={`p-3 rounded-xl ${pontoHoje.entrada_tarde ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : 'bg-muted text-muted-foreground'}`}>
              <div className="font-semibold">{pontoHoje.entrada_tarde?.slice(0, 5) || '--:--'}</div>
              <div className="text-xs">Retorno</div>
            </div>
            <div className={`p-3 rounded-xl ${pontoHoje.saida ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400' : 'bg-muted text-muted-foreground'}`}>
              <div className="font-semibold">{pontoHoje.saida?.slice(0, 5) || '--:--'}</div>
              <div className="text-xs">Saída</div>
            </div>
          </div>
        )}

        {/* Botão Bater Ponto */}
        <button
          onClick={baterPonto}
          disabled={loading || !pessoaSelecionada || proximoPonto.tipo === 'completo'}
          className="w-full h-20 text-xl font-bold border-none rounded-2xl text-primary-foreground cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3"
          style={{
            background: proximoPonto.tipo === 'completo' 
              ? 'hsl(var(--muted))' 
              : 'linear-gradient(135deg, hsl(142.1, 76.2%, 36.3%) 0%, hsl(142.1, 76.2%, 30%) 100%)',
            boxShadow: proximoPonto.tipo !== 'completo' ? '0 4px 20px rgba(52, 199, 89, 0.4)' : 'none',
            color: proximoPonto.tipo === 'completo' ? 'hsl(var(--muted-foreground))' : 'white'
          }}
        >
          {loading ? (
            'Registrando...'
          ) : proximoPonto.tipo === 'completo' ? (
            <>
              <Check className="w-6 h-6" />
              DIA COMPLETO
            </>
          ) : (
            <>
              <ArrowRight className="w-6 h-6" />
              REGISTRAR {proximoPonto.label.toUpperCase()}
            </>
          )}
        </button>

        {pessoaAtual && (
          <p className="text-sm text-muted-foreground mt-4">
            {pessoaAtual.tipo === 'profissional' ? '💇' : '👔'} {pessoaAtual.nome}
          </p>
        )}

        <p className="text-xs text-muted-foreground mt-6">
          Seu ponto será registrado automaticamente
        </p>
      </div>
    </div>
  );
};

export default PontoEletronico;
