import { useState, useEffect } from 'react';
import { Clock, LogIn, LogOut, ArrowLeft, Wifi, WifiOff, RefreshCw, User, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { isKioskMode, getDeviceInfo } from '@/lib/deviceType';
import { usePonto, Pessoa } from '@/hooks/usePonto';
import { cn } from '@/lib/utils';

type Step = 'select-employee' | 'select-action' | 'confirm' | 'success';

const PontoEletronico = () => {
  const navigate = useNavigate();
  const [horaAtual, setHoraAtual] = useState(new Date());
  const [step, setStep] = useState<Step>('select-employee');
  const [pessoaSelecionada, setPessoaSelecionada] = useState<Pessoa | null>(null);
  const [tipoRegistro, setTipoRegistro] = useState<'entrada' | 'saida' | null>(null);
  const [observacao, setObservacao] = useState('');
  const [registering, setRegistering] = useState(false);
  const [showAccessDenied, setShowAccessDenied] = useState(false);

  const {
    pessoas,
    loading,
    isOnline,
    lastSync,
    syncing,
    deviceId,
    registrarPonto,
    getProximaAcao,
    getRegistrosPessoa,
  } = usePonto();

  // Check kiosk mode
  useEffect(() => {
    const deviceInfo = getDeviceInfo();
    if (deviceInfo.type !== 'kiosk') {
      setShowAccessDenied(true);
    }
  }, []);

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => setHoraAtual(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto-reset after success
  useEffect(() => {
    if (step === 'success') {
      const timer = setTimeout(() => {
        resetFlow();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [step]);

  const resetFlow = () => {
    setStep('select-employee');
    setPessoaSelecionada(null);
    setTipoRegistro(null);
    setObservacao('');
  };

  const handleSelectEmployee = (pessoa: Pessoa) => {
    setPessoaSelecionada(pessoa);
    const nextAction = getProximaAcao(pessoa.id, pessoa.tipo);
    setTipoRegistro(nextAction);
    setStep('select-action');
  };

  const handleSelectAction = (tipo: 'entrada' | 'saida') => {
    setTipoRegistro(tipo);
    setStep('confirm');
  };

  const handleConfirm = async () => {
    if (!pessoaSelecionada || !tipoRegistro) return;

    setRegistering(true);
    const success = await registrarPonto(
      pessoaSelecionada.id,
      pessoaSelecionada.tipo,
      tipoRegistro,
      observacao || undefined
    );

    setRegistering(false);
    if (success) {
      setStep('success');
    }
  };

  const getInitials = (nome: string) => {
    return nome
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  // Access denied screen for non-kiosk devices
  if (showAccessDenied) {
    return (
      <div className="min-h-screen flex items-center justify-center p-5 bg-gradient-to-br from-destructive/20 to-background">
        <div className="bg-card rounded-3xl p-8 max-w-md w-full text-center shadow-xl">
          <AlertTriangle className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">Acesso Restrito</h1>
          <p className="text-muted-foreground mb-6">
            O Ponto Eletrônico está disponível apenas no modo Kiosk (tablet/totem).
          </p>
          <p className="text-sm text-muted-foreground mb-6">
            Dispositivo detectado: <Badge variant="outline">{getDeviceInfo().type}</Badge>
          </p>
          <Button onClick={() => navigate('/login')} className="w-full">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar ao Login
          </Button>
        </div>
      </div>
    );
  }

  // Loading state
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
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/login')}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Button>

          <div className="flex items-center gap-3">
            {/* Sync status */}
            <div className="flex items-center gap-2">
              {syncing && <RefreshCw className="w-4 h-4 animate-spin text-primary" />}
              {isOnline ? (
                <Badge variant="outline" className="gap-1 bg-green-500/10 text-green-700 border-green-500/30">
                  <Wifi className="w-3 h-3" />
                  Online
                </Badge>
              ) : (
                <Badge variant="outline" className="gap-1 bg-orange-500/10 text-orange-700 border-orange-500/30">
                  <WifiOff className="w-3 h-3" />
                  Offline
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Clock and Date */}
      <div className="text-center mb-8">
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
            <h2 className="text-xl font-semibold text-foreground mb-4 text-center">
              Selecione seu nome
            </h2>

            {pessoas.length === 0 ? (
              <div className="text-center py-8">
                <User className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">Nenhum colaborador encontrado</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {pessoas.map((pessoa) => {
                  const registrosHoje = getRegistrosPessoa(pessoa.id, pessoa.tipo);
                  const ultimoRegistro = registrosHoje[registrosHoje.length - 1];
                  const isWorking = ultimoRegistro?.tipo === 'entrada';

                  return (
                    <button
                      key={`${pessoa.tipo}-${pessoa.id}`}
                      onClick={() => handleSelectEmployee(pessoa)}
                      className={cn(
                        'flex flex-col items-center p-4 rounded-xl border-2 transition-all',
                        'hover:scale-105 hover:shadow-md active:scale-95',
                        isWorking
                          ? 'border-green-500/50 bg-green-500/5'
                          : 'border-border bg-background hover:border-primary/50'
                      )}
                    >
                      <Avatar className="w-16 h-16 mb-2">
                        {pessoa.foto_url ? (
                          <AvatarImage src={pessoa.foto_url} alt={pessoa.nome} />
                        ) : null}
                        <AvatarFallback className="text-lg bg-primary/10 text-primary">
                          {getInitials(pessoa.nome)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium text-foreground text-center line-clamp-2">
                        {pessoa.nome}
                      </span>
                      <span className="text-xs text-muted-foreground mt-1">
                        {pessoa.cargo_especialidade}
                      </span>
                      {isWorking && (
                        <Badge className="mt-2 bg-green-500/20 text-green-700 border-green-500/30">
                          Trabalhando
                        </Badge>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Select Action */}
        {step === 'select-action' && pessoaSelecionada && (
          <div className="bg-card rounded-2xl p-6 shadow-lg">
            <button
              onClick={resetFlow}
              className="text-muted-foreground hover:text-foreground mb-4 flex items-center gap-1"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </button>

            <div className="text-center mb-8">
              <Avatar className="w-24 h-24 mx-auto mb-3">
                {pessoaSelecionada.foto_url ? (
                  <AvatarImage src={pessoaSelecionada.foto_url} alt={pessoaSelecionada.nome} />
                ) : null}
                <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                  {getInitials(pessoaSelecionada.nome)}
                </AvatarFallback>
              </Avatar>
              <h2 className="text-2xl font-bold text-foreground">{pessoaSelecionada.nome}</h2>
              <p className="text-muted-foreground">{pessoaSelecionada.cargo_especialidade}</p>
            </div>

            {/* Today's records */}
            {(() => {
              const registrosHoje = getRegistrosPessoa(pessoaSelecionada.id, pessoaSelecionada.tipo);
              if (registrosHoje.length > 0) {
                return (
                  <div className="mb-6 p-4 bg-muted/50 rounded-xl">
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">Registros de hoje:</h3>
                    <div className="flex flex-wrap gap-2">
                      {registrosHoje.map((reg) => (
                        <Badge
                          key={reg.id}
                          variant="outline"
                          className={cn(
                            reg.tipo === 'entrada'
                              ? 'bg-green-500/10 text-green-700 border-green-500/30'
                              : 'bg-red-500/10 text-red-700 border-red-500/30'
                          )}
                        >
                          {reg.tipo === 'entrada' ? '➡️' : '⬅️'}{' '}
                          {format(new Date(reg.timestamp), 'HH:mm')}
                        </Badge>
                      ))}
                    </div>
                  </div>
                );
              }
              return null;
            })()}

            <h3 className="text-lg font-medium text-foreground text-center mb-4">
              O que deseja registrar?
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => handleSelectAction('entrada')}
                className={cn(
                  'flex flex-col items-center justify-center p-8 rounded-2xl border-2 transition-all',
                  'hover:scale-105 active:scale-95',
                  tipoRegistro === 'entrada'
                    ? 'border-green-500 bg-green-500/10'
                    : 'border-green-500/30 bg-green-500/5 hover:border-green-500/60'
                )}
              >
                <LogIn className="w-16 h-16 text-green-600 mb-3" />
                <span className="text-xl font-bold text-green-700">ENTRADA</span>
              </button>

              <button
                onClick={() => handleSelectAction('saida')}
                className={cn(
                  'flex flex-col items-center justify-center p-8 rounded-2xl border-2 transition-all',
                  'hover:scale-105 active:scale-95',
                  tipoRegistro === 'saida'
                    ? 'border-red-500 bg-red-500/10'
                    : 'border-red-500/30 bg-red-500/5 hover:border-red-500/60'
                )}
              >
                <LogOut className="w-16 h-16 text-red-600 mb-3" />
                <span className="text-xl font-bold text-red-700">SAÍDA</span>
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Confirm */}
        {step === 'confirm' && pessoaSelecionada && tipoRegistro && (
          <div className="bg-card rounded-2xl p-6 shadow-lg">
            <button
              onClick={() => setStep('select-action')}
              className="text-muted-foreground hover:text-foreground mb-4 flex items-center gap-1"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </button>

            <div className="text-center mb-6">
              <div
                className={cn(
                  'w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4',
                  tipoRegistro === 'entrada' ? 'bg-green-500/20' : 'bg-red-500/20'
                )}
              >
                {tipoRegistro === 'entrada' ? (
                  <LogIn className="w-10 h-10 text-green-600" />
                ) : (
                  <LogOut className="w-10 h-10 text-red-600" />
                )}
              </div>
              <h2 className="text-xl font-bold text-foreground mb-1">
                Confirmar {tipoRegistro === 'entrada' ? 'Entrada' : 'Saída'}
              </h2>
              <p className="text-muted-foreground">{pessoaSelecionada.nome}</p>
              <p className="text-3xl font-bold font-mono text-foreground mt-2">
                {format(horaAtual, 'HH:mm')}
              </p>
            </div>

            <div className="mb-6">
              <label className="text-sm font-medium text-foreground mb-2 block">
                Observação (opcional)
              </label>
              <Textarea
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                placeholder="Ex: Chegando de reunião externa..."
                className="resize-none"
                rows={3}
              />
            </div>

            <Button
              onClick={handleConfirm}
              disabled={registering}
              className={cn(
                'w-full h-16 text-xl font-bold',
                tipoRegistro === 'entrada'
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-red-600 hover:bg-red-700'
              )}
            >
              {registering ? (
                <>
                  <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                  Registrando...
                </>
              ) : (
                <>
                  {tipoRegistro === 'entrada' ? (
                    <LogIn className="w-5 h-5 mr-2" />
                  ) : (
                    <LogOut className="w-5 h-5 mr-2" />
                  )}
                  CONFIRMAR {tipoRegistro.toUpperCase()}
                </>
              )}
            </Button>
          </div>
        )}

        {/* Step 4: Success */}
        {step === 'success' && pessoaSelecionada && tipoRegistro && (
          <div className="bg-card rounded-2xl p-8 shadow-lg text-center">
            <div
              className={cn(
                'w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6',
                tipoRegistro === 'entrada' ? 'bg-green-500' : 'bg-red-500'
              )}
            >
              {tipoRegistro === 'entrada' ? (
                <LogIn className="w-12 h-12 text-white" />
              ) : (
                <LogOut className="w-12 h-12 text-white" />
              )}
            </div>

            <h2 className="text-2xl font-bold text-foreground mb-2">
              {tipoRegistro === 'entrada' ? 'Entrada' : 'Saída'} Registrada!
            </h2>
            <p className="text-muted-foreground mb-4">{pessoaSelecionada.nome}</p>
            <p className="text-4xl font-bold font-mono text-foreground mb-6">
              {format(new Date(), 'HH:mm')}
            </p>

            {!isOnline && (
              <Badge variant="outline" className="bg-orange-500/10 text-orange-700 border-orange-500/30">
                <WifiOff className="w-3 h-3 mr-1" />
                Salvo localmente - será sincronizado quando online
              </Badge>
            )}

            <p className="text-sm text-muted-foreground mt-6">
              Retornando à tela inicial em 3 segundos...
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="max-w-4xl mx-auto mt-6 text-center">
        <p className="text-xs text-muted-foreground">
          {lastSync ? (
            <>Última sincronização: {format(lastSync, 'HH:mm:ss')}</>
          ) : (
            <>Dispositivo: {deviceId.slice(0, 12)}...</>
          )}
        </p>
      </div>
    </div>
  );
};

export default PontoEletronico;
