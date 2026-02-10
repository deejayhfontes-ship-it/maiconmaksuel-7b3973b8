import { useState, useEffect } from 'react';
import { Clock, LogIn, LogOut, ArrowLeft, Wifi, WifiOff, RefreshCw, User, AlertTriangle, Coffee, UtensilsCrossed } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { usePinAuth } from '@/contexts/PinAuthContext';
import { usePonto, Pessoa, TipoEvento, TIPO_EVENTO_LABELS } from '@/hooks/usePonto';
import { cn } from '@/lib/utils';
import logoMaiconMaksuel from '@/assets/logo-maicon-maksuel.png';

type Step = 'select-employee' | 'select-action' | 'confirm' | 'success';

const ACTION_CONFIG: Record<TipoEvento, { icon: typeof LogIn; color: string; bgColor: string; borderColor: string }> = {
  entrada: { icon: LogIn, color: 'text-green-600', bgColor: 'bg-green-500/10', borderColor: 'border-green-500/30' },
  inicio_almoco: { icon: UtensilsCrossed, color: 'text-orange-600', bgColor: 'bg-orange-500/10', borderColor: 'border-orange-500/30' },
  volta_almoco: { icon: Coffee, color: 'text-blue-600', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/30' },
  saida: { icon: LogOut, color: 'text-red-600', bgColor: 'bg-red-500/10', borderColor: 'border-red-500/30' },
};

const PontoEletronico = () => {
  const navigate = useNavigate();
  const [horaAtual, setHoraAtual] = useState(new Date());
  const [step, setStep] = useState<Step>('select-employee');
  const [pessoaSelecionada, setPessoaSelecionada] = useState<Pessoa | null>(null);
  const [tipoRegistro, setTipoRegistro] = useState<TipoEvento | null>(null);
  const [observacao, setObservacao] = useState('');
  const [registering, setRegistering] = useState(false);
  const [lastResult, setLastResult] = useState<{ offline: boolean } | null>(null);

  const { session } = usePinAuth();
  const {
    pessoas, loading, isOnline, lastSync, syncing, pendingCount, deviceId,
    registrarPonto, getProximaAcao, getRegistrosPessoa, isAcaoValida,
  } = usePonto();

  const isKioskRole = session?.role === 'kiosk' || session?.role === 'admin';

  useEffect(() => {
    const timer = setInterval(() => setHoraAtual(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (step === 'success') {
      const timer = setTimeout(() => resetFlow(), 4000);
      return () => clearTimeout(timer);
    }
  }, [step]);

  const resetFlow = () => {
    setStep('select-employee');
    setPessoaSelecionada(null);
    setTipoRegistro(null);
    setObservacao('');
    setLastResult(null);
  };

  const handleSelectEmployee = (pessoa: Pessoa) => {
    setPessoaSelecionada(pessoa);
    const nextAction = getProximaAcao(pessoa.id);
    setTipoRegistro(nextAction);
    setStep('select-action');
  };

  const handleSelectAction = (tipo: TipoEvento) => {
    setTipoRegistro(tipo);
    setStep('confirm');
  };

  const handleConfirm = async () => {
    if (!pessoaSelecionada || !tipoRegistro) return;
    setRegistering(true);
    const result = await registrarPonto(
      pessoaSelecionada.id,
      pessoaSelecionada.tipo,
      tipoRegistro,
      observacao || undefined
    );
    setRegistering(false);
    if (result.success) {
      setLastResult({ offline: result.offline });
      setStep('success');
    }
  };

  const getInitials = (nome: string) =>
    nome.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();

  if (!isKioskRole) {
    return (
      <div className="min-h-screen flex items-center justify-center p-5 bg-gradient-to-br from-destructive/20 to-background">
        <div className="bg-card rounded-3xl p-8 max-w-md w-full text-center shadow-xl">
          <AlertTriangle className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">Acesso Restrito</h1>
          <p className="text-muted-foreground mb-6">O Ponto Eletrônico está disponível apenas para perfil Kiosk.</p>
          <Button onClick={() => navigate('/login')} className="w-full">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar ao Login
          </Button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 to-background">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-4 md:p-6">
      {/* Header */}
      <div className="max-w-4xl mx-auto mb-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate('/kiosk')} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Button>
          <div className="flex items-center gap-3">
            {syncing && <RefreshCw className="w-4 h-4 animate-spin text-primary" />}
            {pendingCount > 0 && (
              <Badge variant="outline" className="gap-1 bg-orange-500/10 text-orange-700 border-orange-500/30">
                {pendingCount} pendente(s)
              </Badge>
            )}
            {isOnline ? (
              <Badge variant="outline" className="gap-1 bg-green-500/10 text-green-700 border-green-500/30">
                <Wifi className="w-3 h-3" /> Online
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-1 bg-orange-500/10 text-orange-700 border-orange-500/30">
                <WifiOff className="w-3 h-3" /> Offline
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Logo & Clock */}
      <div className="text-center mb-8">
        <div className="flex justify-center mb-6">
          <img src={logoMaiconMaksuel} alt="Logo" className="h-20 w-auto object-contain" />
        </div>
        <div className="flex items-center justify-center gap-3 mb-2">
          <Clock className="w-8 h-8 text-primary" />
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Ponto Eletrônico</h1>
        </div>
        <p className="text-muted-foreground capitalize mb-4">
          {format(new Date(), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </p>
        <div className="text-6xl md:text-7xl font-bold font-mono text-foreground tracking-tight">
          {format(horaAtual, 'HH:mm:ss')}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto">

        {/* Step 1: Select Employee */}
        {step === 'select-employee' && (
          <div className="bg-card rounded-2xl p-6 shadow-lg">
            <h2 className="text-xl font-semibold text-foreground mb-4 text-center">Selecione seu nome</h2>
            {pessoas.length === 0 ? (
              <div className="text-center py-8">
                <User className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">Nenhum colaborador encontrado</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {pessoas.map((pessoa) => {
                  const regs = getRegistrosPessoa(pessoa.id);
                  const lastEvent = regs[regs.length - 1];
                  const statusLabel = lastEvent ? TIPO_EVENTO_LABELS[lastEvent.tipo_evento] : null;

                  return (
                    <button
                      key={`${pessoa.tipo}-${pessoa.id}`}
                      onClick={() => handleSelectEmployee(pessoa)}
                      className={cn(
                        'flex flex-col items-center p-4 rounded-xl border-2 transition-all',
                        'hover:scale-105 hover:shadow-md active:scale-95',
                        lastEvent
                          ? 'border-primary/30 bg-primary/5'
                          : 'border-border bg-background hover:border-primary/50'
                      )}
                    >
                      <Avatar className="w-16 h-16 mb-2">
                        {pessoa.foto_url && <AvatarImage src={pessoa.foto_url} alt={pessoa.nome} />}
                        <AvatarFallback className="text-lg bg-primary/10 text-primary">
                          {getInitials(pessoa.nome)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium text-foreground text-center line-clamp-2">{pessoa.nome}</span>
                      <span className="text-xs text-muted-foreground mt-1">{pessoa.cargo_especialidade}</span>
                      {statusLabel && (
                        <Badge variant="outline" className="mt-2 text-xs">
                          Último: {statusLabel} {lastEvent.hora.substring(0, 5)}
                        </Badge>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Select Action (4 buttons) */}
        {step === 'select-action' && pessoaSelecionada && (
          <div className="bg-card rounded-2xl p-6 shadow-lg">
            <button onClick={resetFlow} className="text-muted-foreground hover:text-foreground mb-4 flex items-center gap-1">
              <ArrowLeft className="w-4 h-4" /> Voltar
            </button>

            <div className="text-center mb-8">
              <Avatar className="w-24 h-24 mx-auto mb-3">
                {pessoaSelecionada.foto_url && <AvatarImage src={pessoaSelecionada.foto_url} alt={pessoaSelecionada.nome} />}
                <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                  {getInitials(pessoaSelecionada.nome)}
                </AvatarFallback>
              </Avatar>
              <h2 className="text-2xl font-bold text-foreground">{pessoaSelecionada.nome}</h2>
              <p className="text-muted-foreground">{pessoaSelecionada.cargo_especialidade}</p>
            </div>

            {/* Today's timeline */}
            {(() => {
              const regs = getRegistrosPessoa(pessoaSelecionada.id);
              if (regs.length > 0) {
                return (
                  <div className="mb-6 p-4 bg-muted/50 rounded-xl">
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">Registros de hoje:</h3>
                    <div className="flex flex-wrap gap-2">
                      {regs.map((reg) => {
                        const cfg = ACTION_CONFIG[reg.tipo_evento];
                        return (
                          <Badge key={reg.id} variant="outline" className={cn(cfg.bgColor, cfg.color, cfg.borderColor)}>
                            {TIPO_EVENTO_LABELS[reg.tipo_evento]} {reg.hora.substring(0, 5)}
                            {!reg._synced && ' ⏳'}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                );
              }
              return null;
            })()}

            <h3 className="text-lg font-medium text-foreground text-center mb-4">O que deseja registrar?</h3>

            {/* Recommended action */}
            {(() => {
              const recommended = getProximaAcao(pessoaSelecionada.id);
              return (
                <p className="text-center text-sm text-primary mb-4">
                  Ação recomendada: <strong>{TIPO_EVENTO_LABELS[recommended]}</strong>
                </p>
              );
            })()}

            <div className="grid grid-cols-2 gap-4">
              {(['entrada', 'inicio_almoco', 'volta_almoco', 'saida'] as TipoEvento[]).map((tipo) => {
                const cfg = ACTION_CONFIG[tipo];
                const Icon = cfg.icon;
                const validation = isAcaoValida(pessoaSelecionada.id, tipo);
                const isRecommended = getProximaAcao(pessoaSelecionada.id) === tipo;

                return (
                  <button
                    key={tipo}
                    onClick={() => validation.valid && handleSelectAction(tipo)}
                    disabled={!validation.valid}
                    className={cn(
                      'flex flex-col items-center justify-center p-6 rounded-2xl border-2 transition-all',
                      validation.valid
                        ? cn('hover:scale-105 active:scale-95', cfg.bgColor, cfg.borderColor,
                          isRecommended && 'ring-2 ring-primary ring-offset-2')
                        : 'opacity-40 cursor-not-allowed border-border bg-muted/30'
                    )}
                  >
                    <Icon className={cn('w-12 h-12 mb-2', validation.valid ? cfg.color : 'text-muted-foreground')} />
                    <span className={cn('text-lg font-bold', validation.valid ? cfg.color : 'text-muted-foreground')}>
                      {TIPO_EVENTO_LABELS[tipo].toUpperCase()}
                    </span>
                    {!validation.valid && (
                      <span className="text-xs text-muted-foreground mt-1">{validation.reason}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 3: Confirm */}
        {step === 'confirm' && pessoaSelecionada && tipoRegistro && (
          <div className="bg-card rounded-2xl p-6 shadow-lg">
            <button onClick={() => setStep('select-action')} className="text-muted-foreground hover:text-foreground mb-4 flex items-center gap-1">
              <ArrowLeft className="w-4 h-4" /> Voltar
            </button>

            <div className="text-center mb-6">
              {(() => {
                const cfg = ACTION_CONFIG[tipoRegistro];
                const Icon = cfg.icon;
                return (
                  <>
                    <div className={cn('w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4', cfg.bgColor)}>
                      <Icon className={cn('w-10 h-10', cfg.color)} />
                    </div>
                    <h2 className="text-xl font-bold text-foreground mb-1">
                      Confirmar {TIPO_EVENTO_LABELS[tipoRegistro]}
                    </h2>
                  </>
                );
              })()}
              <p className="text-muted-foreground">{pessoaSelecionada.nome}</p>
              <p className="text-3xl font-bold font-mono text-foreground mt-2">{format(horaAtual, 'HH:mm')}</p>
            </div>

            <div className="mb-6">
              <label className="text-sm font-medium text-foreground mb-2 block">Observação (opcional)</label>
              <Textarea
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                placeholder="Ex: Reunião externa..."
                className="resize-none"
                rows={3}
              />
            </div>

            {(() => {
              const cfg = ACTION_CONFIG[tipoRegistro];
              return (
                <Button
                  onClick={handleConfirm}
                  disabled={registering}
                  className={cn('w-full h-16 text-xl font-bold', cfg.bgColor, cfg.color, 'hover:opacity-90 border-2', cfg.borderColor)}
                  variant="outline"
                >
                  {registering ? (
                    <><RefreshCw className="w-5 h-5 mr-2 animate-spin" /> Registrando...</>
                  ) : (
                    <>CONFIRMAR {TIPO_EVENTO_LABELS[tipoRegistro].toUpperCase()}</>
                  )}
                </Button>
              );
            })()}
          </div>
        )}

        {/* Step 4: Success */}
        {step === 'success' && pessoaSelecionada && tipoRegistro && (
          <div className="bg-card rounded-2xl p-8 shadow-lg text-center">
            {(() => {
              const cfg = ACTION_CONFIG[tipoRegistro];
              const Icon = cfg.icon;
              return (
                <>
                  <div className={cn('w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6', cfg.bgColor)}>
                    <Icon className={cn('w-12 h-12', cfg.color)} />
                  </div>
                  <h2 className="text-2xl font-bold text-foreground mb-2">
                    {TIPO_EVENTO_LABELS[tipoRegistro]} Registrada!
                  </h2>
                </>
              );
            })()}
            <p className="text-muted-foreground mb-4">{pessoaSelecionada.nome}</p>
            <p className="text-4xl font-bold font-mono text-foreground mb-6">{format(new Date(), 'HH:mm')}</p>

            {lastResult?.offline && (
              <Badge variant="outline" className="bg-orange-500/10 text-orange-700 border-orange-500/30">
                <WifiOff className="w-3 h-3 mr-1" />
                Salvo offline — será sincronizado quando online
              </Badge>
            )}

            <p className="text-sm text-muted-foreground mt-6">
              Retornando à tela inicial em 4 segundos...
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="max-w-4xl mx-auto mt-6 text-center">
        <p className="text-xs text-muted-foreground">
          {lastSync ? `Última sincronização: ${format(lastSync, 'HH:mm:ss')}` : 'Sem sincronização'}
          {' · '}ID: {deviceId?.slice(-8)}
        </p>
      </div>
    </div>
  );
};

export default PontoEletronico;
