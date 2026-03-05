/**
 * Services & Products Settings Component
 */

import { useSystemSettings } from '@/hooks/useSystemSettings';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Package, Scissors, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function ServicosProdutosSettings() {
  const { settings, updateSettings, isSaving, isLoading } = useSystemSettings();
  
  const [formData, setFormData] = useState({
    servicos_comissao_padrao: settings.servicos_comissao_padrao,
    produtos_comissao_padrao: settings.produtos_comissao_padrao,
    produtos_alerta_estoque_minimo: settings.produtos_alerta_estoque_minimo,
    produtos_vendas_habilitadas: settings.produtos_vendas_habilitadas,
  });

  useEffect(() => {
    setFormData({
      servicos_comissao_padrao: settings.servicos_comissao_padrao,
      produtos_comissao_padrao: settings.produtos_comissao_padrao,
      produtos_alerta_estoque_minimo: settings.produtos_alerta_estoque_minimo,
      produtos_vendas_habilitadas: settings.produtos_vendas_habilitadas,
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
      {/* Serviços */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Scissors className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Configurações de Serviços</CardTitle>
              <CardDescription>
                Valores padrão para comissões de serviços
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="comissao-servicos">Comissão Padrão (%)</Label>
            <Input
              id="comissao-servicos"
              type="number"
              min="0"
              max="100"
              value={formData.servicos_comissao_padrao}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                servicos_comissao_padrao: parseFloat(e.target.value) || 0,
              }))}
            />
            <p className="text-xs text-muted-foreground">
              Percentual aplicado a novos serviços por padrão
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Produtos */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
              <Package className="h-5 w-5 text-success" />
            </div>
            <div>
              <CardTitle>Configurações de Produtos</CardTitle>
              <CardDescription>
                Comissões, estoque e vendas de produtos
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="comissao-produtos">Comissão Padrão (%)</Label>
            <Input
              id="comissao-produtos"
              type="number"
              min="0"
              max="100"
              value={formData.produtos_comissao_padrao}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                produtos_comissao_padrao: parseFloat(e.target.value) || 0,
              }))}
            />
            <p className="text-xs text-muted-foreground">
              Percentual de comissão para venda de produtos
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="estoque-minimo">Alerta de Estoque Mínimo</Label>
            <Input
              id="estoque-minimo"
              type="number"
              min="0"
              value={formData.produtos_alerta_estoque_minimo}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                produtos_alerta_estoque_minimo: parseInt(e.target.value) || 0,
              }))}
            />
            <p className="text-xs text-muted-foreground">
              Quantidade que dispara alerta de estoque baixo
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Venda de Produtos</Label>
              <p className="text-sm text-muted-foreground">
                Habilitar venda de produtos no PDV
              </p>
            </div>
            <Switch
              checked={formData.produtos_vendas_habilitadas}
              onCheckedChange={(checked) => setFormData(prev => ({
                ...prev,
                produtos_vendas_habilitadas: checked,
              }))}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Salvar Configurações
        </Button>
      </div>
    </div>
  );
}
