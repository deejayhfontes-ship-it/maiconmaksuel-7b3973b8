/**
 * Agenda Settings Component
 */

import { useSystemSettings } from '@/hooks/useSystemSettings';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Calendar, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function AgendaSettings() {
  const { settings, updateSettings, isSaving, isLoading } = useSystemSettings();
  
  const [formData, setFormData] = useState({
    agenda_duracao_padrao_minutos: settings.agenda_duracao_padrao_minutos,
    agenda_permitir_encaixe: settings.agenda_permitir_encaixe,
    agenda_horario_inicio: settings.agenda_horario_inicio,
    agenda_horario_fim: settings.agenda_horario_fim,
    agenda_intervalo_minutos: settings.agenda_intervalo_minutos,
    agenda_dias_antecedencia_max: settings.agenda_dias_antecedencia_max,
  });

  useEffect(() => {
    setFormData({
      agenda_duracao_padrao_minutos: settings.agenda_duracao_padrao_minutos,
      agenda_permitir_encaixe: settings.agenda_permitir_encaixe,
      agenda_horario_inicio: settings.agenda_horario_inicio,
      agenda_horario_fim: settings.agenda_horario_fim,
      agenda_intervalo_minutos: settings.agenda_intervalo_minutos,
      agenda_dias_antecedencia_max: settings.agenda_dias_antecedencia_max,
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
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Configurações da Agenda</CardTitle>
              <CardDescription>
                Defina os horários de funcionamento e comportamento da agenda
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="horario-inicio">Horário de Início</Label>
              <Input
                id="horario-inicio"
                type="time"
                value={formData.agenda_horario_inicio}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  agenda_horario_inicio: e.target.value,
                }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="horario-fim">Horário de Término</Label>
              <Input
                id="horario-fim"
                type="time"
                value={formData.agenda_horario_fim}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  agenda_horario_fim: e.target.value,
                }))}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="duracao-padrao">Duração Padrão (minutos)</Label>
              <Input
                id="duracao-padrao"
                type="number"
                min="5"
                max="480"
                value={formData.agenda_duracao_padrao_minutos}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  agenda_duracao_padrao_minutos: parseInt(e.target.value) || 30,
                }))}
              />
              <p className="text-xs text-muted-foreground">
                Duração padrão para novos agendamentos
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="intervalo">Intervalo (minutos)</Label>
              <Input
                id="intervalo"
                type="number"
                min="5"
                max="60"
                step="5"
                value={formData.agenda_intervalo_minutos}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  agenda_intervalo_minutos: parseInt(e.target.value) || 15,
                }))}
              />
              <p className="text-xs text-muted-foreground">
                Intervalos de tempo na grade da agenda
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dias-antecedencia">Dias de Antecedência Máxima</Label>
            <Input
              id="dias-antecedencia"
              type="number"
              min="1"
              max="365"
              value={formData.agenda_dias_antecedencia_max}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                agenda_dias_antecedencia_max: parseInt(e.target.value) || 60,
              }))}
            />
            <p className="text-xs text-muted-foreground">
              Máximo de dias no futuro para agendamentos
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Permitir Encaixes</Label>
              <p className="text-sm text-muted-foreground">
                Habilitar agendamentos de encaixe fora dos horários padrão
              </p>
            </div>
            <Switch
              checked={formData.agenda_permitir_encaixe}
              onCheckedChange={(checked) => setFormData(prev => ({
                ...prev,
                agenda_permitir_encaixe: checked,
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
