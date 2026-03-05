import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePinAuth } from '@/contexts/PinAuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, Delete, Lock, Shield, Monitor, Tablet } from 'lucide-react';
import logoMaicon from '@/assets/logo.svg';
import { cn } from '@/lib/utils';

export default function Login() {
  const [pin, setPin] = useState<string[]>(['', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { login, isAuthenticated, loading: authLoading, getDefaultRoute, session } = usePinAuth();
  const navigate = useNavigate();
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      const route = getDefaultRoute() || '/dashboard';
      navigate(route, { replace: true });
    }
  }, [isAuthenticated, authLoading, navigate, getDefaultRoute]);

  // Focus first input on mount
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      inputRefs.current[0]?.focus();
    }
  }, [authLoading, isAuthenticated]);

  // Show loading state while auth is being checked
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Don't render login form if user is already logged in
  if (isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleDigitInput = (index: number, value: string) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return;

    const newPin = [...pin];
    newPin[index] = value;
    setPin(newPin);
    setError(null);

    // Auto-focus next input
    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 4 digits entered
    if (value && index === 3 && newPin.every(d => d !== '')) {
      handleSubmit(newPin.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleNumpadClick = (digit: string) => {
    const emptyIndex = pin.findIndex(d => d === '');
    if (emptyIndex !== -1) {
      handleDigitInput(emptyIndex, digit);
    }
  };

  const handleDelete = () => {
    const lastFilledIndex = pin.map((d, i) => d !== '' ? i : -1).filter(i => i !== -1).pop();
    if (lastFilledIndex !== undefined) {
      const newPin = [...pin];
      newPin[lastFilledIndex] = '';
      setPin(newPin);
      inputRefs.current[lastFilledIndex]?.focus();
    }
  };

  const handleClear = () => {
    setPin(['', '', '', '']);
    setError(null);
    inputRefs.current[0]?.focus();
  };

  const handleSubmit = async (pinCode?: string) => {
    const code = pinCode || pin.join('');
    
    if (code.length !== 4) {
      setError('Digite os 4 dígitos do PIN');
      return;
    }

    setLoading(true);
    const result = await login(code);
    setLoading(false);

    if (result.success) {
      toast.success('Acesso autorizado!');
      
      // Admin login on Electron: auto-open kiosk in 2nd window if enabled
      if (pin.join('') === '0000' || code === '0000') {
        try {
          const kioskBoot = await window.electron?.getKioskEnabled();
          if (kioskBoot && window.electron?.openKioskWindow) {
            await window.electron.openKioskWindow();
          }
        } catch {
          // not Electron or not enabled — ignore
        }
      }
      
      navigate(getDefaultRoute() || '/dashboard', { replace: true });
    } else {
      setError(result.error || 'PIN inválido');
      setPin(['', '', '', '']);
      inputRefs.current[0]?.focus();
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <Shield className="w-4 h-4" />;
      case 'notebook': return <Monitor className="w-4 h-4" />;
      case 'kiosk': return <Tablet className="w-4 h-4" />;
      default: return <Lock className="w-4 h-4" />;
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin': return 'default';
      case 'notebook': return 'secondary';
      case 'kiosk': return 'outline';
      default: return 'outline';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Logo */}
        <div className="flex justify-center">
          <img 
            src={logoMaicon} 
            alt="Maicon Concept" 
            className="h-14 object-contain dark:brightness-0 dark:invert"
          />
        </div>

        {/* Card */}
        <Card className="border-border/50 shadow-lg">
          <CardContent className="pt-6 pb-4">
            {/* Header */}
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <Lock className="w-6 h-6 text-primary" />
              </div>
              <h1 className="text-xl font-semibold text-foreground">Acesso ao Sistema</h1>
              <p className="text-sm text-muted-foreground mt-1">Digite seu PIN de 4 dígitos</p>
            </div>

            {/* PIN Input Display */}
            <div className="flex justify-center gap-3 mb-6">
              {pin.map((digit, index) => (
                <input
                  key={index}
                  ref={el => inputRefs.current[index] = el}
                  type="password"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={e => handleDigitInput(index, e.target.value)}
                  onKeyDown={e => handleKeyDown(index, e)}
                  className={cn(
                    'w-14 h-14 text-center text-2xl font-bold rounded-xl border-2 transition-all',
                    'bg-background focus:outline-none focus:ring-2 focus:ring-primary/50',
                    digit ? 'border-primary bg-primary/5' : 'border-border',
                    error ? 'border-destructive animate-shake' : ''
                  )}
                />
              ))}
            </div>

            {/* Error Message */}
            {error && (
              <p className="text-sm text-destructive text-center mb-4 animate-in fade-in">
                {error}
              </p>
            )}

            {/* Numpad */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(digit => (
                <Button
                  key={digit}
                  variant="outline"
                  size="lg"
                  className="h-14 text-xl font-semibold hover:bg-primary/10"
                  onClick={() => handleNumpadClick(digit)}
                  disabled={loading}
                >
                  {digit}
                </Button>
              ))}
              <Button
                variant="outline"
                size="lg"
                className="h-14 text-muted-foreground"
                onClick={handleClear}
                disabled={loading}
              >
                Limpar
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="h-14 text-xl font-semibold hover:bg-primary/10"
                onClick={() => handleNumpadClick('0')}
                disabled={loading}
              >
                0
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="h-14"
                onClick={handleDelete}
                disabled={loading}
              >
                <Delete className="w-5 h-5" />
              </Button>
            </div>

            {/* Submit Button */}
            <Button 
              className="w-full h-12" 
              onClick={() => handleSubmit()}
              disabled={loading || pin.some(d => d === '')}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verificando...
                </>
              ) : (
                <>
                  <Lock className="mr-2 h-4 w-4" />
                  Entrar
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Role Legend */}
        <div className="flex justify-center gap-2 flex-wrap">
          {(['admin', 'notebook', 'kiosk'] as const).map(role => (
            <Badge 
              key={role} 
              variant={getRoleBadgeVariant(role)} 
              className="gap-1 text-xs"
            >
              {getRoleIcon(role)}
              {role === 'admin' ? 'Admin' : role === 'notebook' ? 'Notebook' : 'Kiosk'}
            </Badge>
          ))}
        </div>

        {/* Help text */}
        <p className="text-xs text-center text-muted-foreground">
          Entre em contato com o administrador para obter seu PIN de acesso
        </p>
      </div>
    </div>
  );
}
