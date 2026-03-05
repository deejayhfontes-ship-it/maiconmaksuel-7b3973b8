/**
 * Caixa/PDV Settings Component
 */

import { useSystemSettings } from '@/hooks/useSystemSettings';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { CreditCard, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function CaixaSettings() {
  const { settings, updateSettings, isSaving, isLoading } = useSystemSettings();
  
  const [formData, setFormData] = useState({
    caixa_valor_abertura_padrao: settings.caixa_valor_abertura_padrao,
    caixa_requer_confirmacao_abertura: settings.caixa_requer_confirmacao_abertura,
    caixa_requer_confirmacao_fechamento: settings.caixa_requer_confirmacao_fechamento,
    caixa_permitir_multiplos_abertos: settings.caixa_permitir_multiplos_abertos,
  });

  useEffect(() => {
    setFormData({
      caixa_valor_abertura_padrao: settings.caixa_valor_abertura_padrao,
      caixa_requer_confirmacao_abertura: settings.caixa_requer_confirmacao_abertura,
      caixa_requer_confirmacao_fechamento: settings.caixa_requer_confirmacao_fechamento,
      caixa_permitir_multiplos_abertos: settings.caixa_permitir_multiplos_abertos,
    });
  }, [settings]);

  const handleSave = () => {
    updateSettings(formData);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <CreditCard className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Configurações do Caixa</CardTitle>
              <CardDescription>
                Defina o comportamento padrão para abertura e fechamento de caixa
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="valor-abertura">Valor Padrão de Abertura (R$)</Label>
            <Input
              id="valor-abertura"
              type="number"
              min="0"
              step="0.01"
              value={formData.caixa_valor_abertura_padrao}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                caixa_valor_abertura_padrao: parseFloat(e.target.value) || 0,
              }))}
            />
            <p className="text-xs text-muted-foreground">
              Valor sugerido ao abrir um novo caixa
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Confirmar Abertura</Label>
              <p className="text-sm text-muted-foreground">
                Exigir confirmação antes de abrir o caixa
              </p>
            </div>
            <Switch
              checked={formData.caixa_requer_confirmacao_abertura}
              onCheckedChange={(checked) => setFormData(prev => ({
                ...prev,
                caixa_requer_confirmacao_abertura: checked,
              }))}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Confirmar Fechamento</Label>
              <p className="text-sm text-muted-foreground">
                Exigir confirmação e conferência antes de fechar
              </p>
            </div>
            <Switch
              checked={formData.caixa_requer_confirmacao_fechamento}
              onCheckedChange={(checked) => setFormData(prev => ({
                ...prev,
                caixa_requer_confirmacao_fechamento: checked,
              }))}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Múltiplos Caixas</Label>
              <p className="text-sm text-muted-foreground">
                Permitir mais de um caixa aberto simultaneamente
              </p>
            </div>
            <Switch
              checked={formData.caixa_permitir_multiplos_abertos}
              onCheckedChange={(checked) => setFormData(prev => ({
                ...prev,
                caixa_permitir_multiplos_abertos: checked,
              }))}
            />
          </div>

          <div className="pt-4 border-t">
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar Configurações
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
