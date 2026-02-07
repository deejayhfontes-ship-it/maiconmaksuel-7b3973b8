/**
 * Kiosk Agenda Configuration Settings
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useKioskSettings } from "@/hooks/useKioskSettings";
import { useProfissionais } from "@/hooks/useProfissionais";
import { Calendar, Eye, EyeOff, Clock, User, List } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

export default function KioskAgendaSettings() {
  const { settings, updateSettings, isSaving } = useKioskSettings();
  const { profissionais } = useProfissionais();

  const handleProfissionalToggle = (profissionalId: string, checked: boolean) => {
    const current = settings.agenda_profissionais_visiveis || [];
    const updated = checked
      ? [...current, profissionalId]
      : current.filter(id => id !== profissionalId);
    
    updateSettings({ agenda_profissionais_visiveis: updated });
  };

  const isProfissionalVisible = (profissionalId: string): boolean => {
    const visible = settings.agenda_profissionais_visiveis || [];
    // If empty, all are visible
    if (visible.length === 0) return true;
    return visible.includes(profissionalId);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Configurações da Agenda
        </CardTitle>
        <CardDescription>
          Configure como a agenda é exibida no modo kiosk
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Visibility toggles */}
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <Eye className="h-4 w-4 text-primary" />
              <div>
                <Label htmlFor="agenda-visivel" className="font-medium">
                  Agenda visível
                </Label>
                <p className="text-sm text-muted-foreground">
                  Exibir módulo de agenda no kiosk
                </p>
              </div>
            </div>
            <Switch
              id="agenda-visivel"
              checked={settings.agenda_visivel}
              onCheckedChange={(checked) => updateSettings({ agenda_visivel: checked })}
              disabled={isSaving}
            />
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <EyeOff className="h-4 w-4 text-primary" />
              <div>
                <Label htmlFor="agenda-readonly" className="font-medium">
                  Apenas visualização
                </Label>
                <p className="text-sm text-muted-foreground">
                  Impede edições na agenda pelo kiosk
                </p>
              </div>
            </div>
            <Switch
              id="agenda-readonly"
              checked={settings.agenda_somente_leitura}
              onCheckedChange={(checked) => updateSettings({ agenda_somente_leitura: checked })}
              disabled={isSaving}
            />
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <List className="h-4 w-4 text-primary" />
              <div>
                <Label htmlFor="mostrar-servicos" className="font-medium">
                  Mostrar nomes dos serviços
                </Label>
                <p className="text-sm text-muted-foreground">
                  Exibe o nome do serviço nos agendamentos
                </p>
              </div>
            </div>
            <Switch
              id="mostrar-servicos"
              checked={settings.agenda_mostrar_nomes_servicos}
              onCheckedChange={(checked) => updateSettings({ agenda_mostrar_nomes_servicos: checked })}
              disabled={isSaving}
            />
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <User className="h-4 w-4 text-primary" />
              <div>
                <Label htmlFor="modo-privacidade" className="font-medium">
                  Modo privacidade
                </Label>
                <p className="text-sm text-muted-foreground">
                  Mascara nomes de clientes (ex: "Maria S.")
                </p>
              </div>
            </div>
            <Switch
              id="modo-privacidade"
              checked={settings.agenda_modo_privacidade}
              onCheckedChange={(checked) => updateSettings({ agenda_modo_privacidade: checked })}
              disabled={isSaving}
            />
          </div>
        </div>

        {/* Time range selector */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Intervalo de tempo exibido
          </Label>
          <Select
            value={settings.agenda_intervalo_tempo}
            onValueChange={(value) => updateSettings({ 
              agenda_intervalo_tempo: value as 'proximas_2h' | 'hoje' | 'dia_completo' 
            })}
            disabled={isSaving}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione o intervalo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="proximas_2h">Próximas 2 horas</SelectItem>
              <SelectItem value="hoje">Hoje (horário comercial)</SelectItem>
              <SelectItem value="dia_completo">Dia completo</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Professional visibility */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Profissionais visíveis no kiosk
          </Label>
          <p className="text-sm text-muted-foreground">
            Deixe todos desmarcados para exibir todos os profissionais
          </p>
          <div className="grid grid-cols-2 gap-3 max-h-48 overflow-y-auto p-2 border rounded-lg">
            {profissionais.map((prof) => (
              <div key={prof.id} className="flex items-center gap-2">
                <Checkbox
                  id={`prof-${prof.id}`}
                  checked={settings.agenda_profissionais_visiveis?.includes(prof.id) || false}
                  onCheckedChange={(checked) => 
                    handleProfissionalToggle(prof.id, checked as boolean)
                  }
                  disabled={isSaving}
                />
                <Label 
                  htmlFor={`prof-${prof.id}`} 
                  className="text-sm font-normal cursor-pointer"
                >
                  {prof.nome}
                </Label>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
