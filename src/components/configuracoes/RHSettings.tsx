import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Clock, DollarSign, Calculator, Save, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ConfiguracoesRH {
  id: string;
  jornada_padrao_horas: number;
  tolerancia_atraso_minutos: number;
  tolerancia_saida_minutos: number;
  intervalo_minimo_minutos: number;
  habilitar_banco_horas: boolean;
  habilitar_horas_extras: boolean;
  percentual_hora_extra: number;
  regra_comissao_base: string;
  arredondamento_comissao: string;
  fechamento_automatico: boolean;
  dia_fechamento: number;
  modo_kiosk_apenas_batida: boolean;
}

const defaultConfig: ConfiguracoesRH = {
  id: '',
  jornada_padrao_horas: 8,
  tolerancia_atraso_minutos: 15,
  tolerancia_saida_minutos: 10,
  intervalo_minimo_minutos: 60,
  habilitar_banco_horas: false,
  habilitar_horas_extras: true,
  percentual_hora_extra: 50,
  regra_comissao_base: 'valor_liquido',
  arredondamento_comissao: 'centavos',
  fechamento_automatico: false,
  dia_fechamento: 25,
  modo_kiosk_apenas_batida: true,
};

export default function RHSettings() {
  const [config, setConfig] = useState<ConfiguracoesRH>(defaultConfig);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('configuracoes_rh')
        .select('*')
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setConfig(data as ConfiguracoesRH);
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (config.id) {
        const { error } = await supabase
          .from('configuracoes_rh')
          .update({
            jornada_padrao_horas: config.jornada_padrao_horas,
            tolerancia_atraso_minutos: config.tolerancia_atraso_minutos,
            tolerancia_saida_minutos: config.tolerancia_saida_minutos,
            intervalo_minimo_minutos: config.intervalo_minimo_minutos,
            habilitar_banco_horas: config.habilitar_banco_horas,
            habilitar_horas_extras: config.habilitar_horas_extras,
            percentual_hora_extra: config.percentual_hora_extra,
            regra_comissao_base: config.regra_comissao_base,
            arredondamento_comissao: config.arredondamento_comissao,
            fechamento_automatico: config.fechamento_automatico,
            dia_fechamento: config.dia_fechamento,
            modo_kiosk_apenas_batida: config.modo_kiosk_apenas_batida,
          })
          .eq('id', config.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('configuracoes_rh')
          .insert({
            jornada_padrao_horas: config.jornada_padrao_horas,
            tolerancia_atraso_minutos: config.tolerancia_atraso_minutos,
            tolerancia_saida_minutos: config.tolerancia_saida_minutos,
            intervalo_minimo_minutos: config.intervalo_minimo_minutos,
            habilitar_banco_horas: config.habilitar_banco_horas,
            habilitar_horas_extras: config.habilitar_horas_extras,
            percentual_hora_extra: config.percentual_hora_extra,
            regra_comissao_base: config.regra_comissao_base,
            arredondamento_comissao: config.arredondamento_comissao,
            fechamento_automatico: config.fechamento_automatico,
            dia_fechamento: config.dia_fechamento,
            modo_kiosk_apenas_batida: config.modo_kiosk_apenas_batida,
          });

        if (error) throw error;
      }

      toast.success('Configurações salvas com sucesso!');
      loadConfig();
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast.error('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: keyof ConfiguracoesRH, value: any) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Configurações de RH</h2>
        <p className="text-muted-foreground">
          Configure as regras de ponto, jornada, comissões e fechamento
        </p>
      </div>

      {/* Jornada de Trabalho */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Jornada de Trabalho
          </CardTitle>
          <CardDescription>
            Configure a jornada padrão e tolerâncias
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Jornada Padrão (horas/dia)</Label>
              <Input
                type="number"
                min={1}
                max={12}
                value={config.jornada_padrao_horas}
                onChange={(e) => handleChange('jornada_padrao_horas', Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>Intervalo Mínimo (minutos)</Label>
              <Input
                type="number"
                min={30}
                max={120}
                value={config.intervalo_minimo_minutos}
                onChange={(e) => handleChange('intervalo_minimo_minutos', Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>Tolerância Atraso (minutos)</Label>
              <Input
                type="number"
                min={0}
                max={30}
                value={config.tolerancia_atraso_minutos}
                onChange={(e) => handleChange('tolerancia_atraso_minutos', Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>Tolerância Saída (minutos)</Label>
              <Input
                type="number"
                min={0}
                max={30}
                value={config.tolerancia_saida_minutos}
                onChange={(e) => handleChange('tolerancia_saida_minutos', Number(e.target.value))}
              />
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Habilitar Horas Extras</Label>
                <p className="text-sm text-muted-foreground">
                  Calcular horas extras automaticamente
                </p>
              </div>
              <Switch
                checked={config.habilitar_horas_extras}
                onCheckedChange={(checked) => handleChange('habilitar_horas_extras', checked)}
              />
            </div>

            {config.habilitar_horas_extras && (
              <div className="space-y-2 pl-4 border-l-2 border-primary/20">
                <Label>Adicional Hora Extra (%)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={config.percentual_hora_extra}
                  onChange={(e) => handleChange('percentual_hora_extra', Number(e.target.value))}
                />
              </div>
            )}

            <div className="flex items-center justify-between">
              <div>
                <Label>Habilitar Banco de Horas</Label>
                <p className="text-sm text-muted-foreground">
                  Acumular horas positivas/negativas
                </p>
              </div>
              <Switch
                checked={config.habilitar_banco_horas}
                onCheckedChange={(checked) => handleChange('habilitar_banco_horas', checked)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Comissões */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Regras de Comissão
          </CardTitle>
          <CardDescription>
            Configure como as comissões são calculadas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Base de Cálculo</Label>
              <Select
                value={config.regra_comissao_base}
                onValueChange={(value) => handleChange('regra_comissao_base', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="valor_bruto">Valor Bruto (antes desconto)</SelectItem>
                  <SelectItem value="valor_liquido">Valor Líquido (após desconto)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Arredondamento</Label>
              <Select
                value={config.arredondamento_comissao}
                onValueChange={(value) => handleChange('arredondamento_comissao', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="centavos">Centavos (2 casas)</SelectItem>
                  <SelectItem value="reais">Reais inteiros</SelectItem>
                  <SelectItem value="dezena">Dezena mais próxima</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fechamento */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            Fechamento de Período
          </CardTitle>
          <CardDescription>
            Configure o fechamento automático da folha
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Fechamento Automático</Label>
              <p className="text-sm text-muted-foreground">
                Fechar folha automaticamente no dia definido
              </p>
            </div>
            <Switch
              checked={config.fechamento_automatico}
              onCheckedChange={(checked) => handleChange('fechamento_automatico', checked)}
            />
          </div>

          {config.fechamento_automatico && (
            <div className="space-y-2 pl-4 border-l-2 border-primary/20">
              <Label>Dia do Fechamento</Label>
              <Input
                type="number"
                min={1}
                max={28}
                value={config.dia_fechamento}
                onChange={(e) => handleChange('dia_fechamento', Number(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">
                Todo dia {config.dia_fechamento} a folha será fechada automaticamente
              </p>
            </div>
          )}

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <Label>Modo Kiosk: Apenas Batida</Label>
              <p className="text-sm text-muted-foreground">
                No kiosk, permitir apenas registrar ponto (sem editar)
              </p>
            </div>
            <Switch
              checked={config.modo_kiosk_apenas_batida}
              onCheckedChange={(checked) => handleChange('modo_kiosk_apenas_batida', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Botão Salvar */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Salvar Configurações
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
