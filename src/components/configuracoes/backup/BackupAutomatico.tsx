import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw, Check, AlertTriangle, Play, Clock } from "lucide-react";
import { toast } from "sonner";
import { format, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";

type BackupHistoryItem = {
  id: string;
  data: Date;
  tipo: "automatico" | "manual";
  status: "sucesso" | "falha";
  tamanho: string;
  erro?: string;
};

export default function BackupAutomatico() {
  const [ativo, setAtivo] = useState(true);
  const [frequencia, setFrequencia] = useState("mensal");
  const [horario, setHorario] = useState("02:00");
  const [retencao, setRetencao] = useState("6");
  const [email, setEmail] = useState("admin@maiconmaksuel.com");
  const [destinos, setDestinos] = useState({
    local: true,
    googleDrive: true,
    dropbox: false,
  });
  const [notificacoes, setNotificacoes] = useState({
    sucesso: true,
    falha: true,
  });
  const [loading, setLoading] = useState(false);

  const [historico] = useState<BackupHistoryItem[]>([
    { id: "1", data: new Date(2024, 11, 1, 2, 0), tipo: "automatico", status: "sucesso", tamanho: "142 MB" },
    { id: "2", data: new Date(2024, 10, 1, 2, 0), tipo: "automatico", status: "sucesso", tamanho: "138 MB" },
    { id: "3", data: new Date(2024, 9, 1, 2, 0), tipo: "automatico", status: "sucesso", tamanho: "135 MB" },
    { id: "4", data: new Date(2024, 8, 1, 2, 0), tipo: "automatico", status: "falha", tamanho: "-", erro: "Erro de conexão" },
    { id: "5", data: new Date(2024, 7, 1, 2, 0), tipo: "automatico", status: "sucesso", tamanho: "130 MB" },
  ]);

  const getProximoBackup = () => {
    const hoje = new Date();
    switch (frequencia) {
      case "diario":
        return addDays(hoje, 1);
      case "semanal":
        return addDays(hoje, 7 - hoje.getDay() + 1);
      case "mensal":
        return new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1);
      default:
        return addDays(hoje, 1);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    // Simulate save
    await new Promise(resolve => setTimeout(resolve, 1000));
    setLoading(false);
    toast.success("Configurações salvas com sucesso!");
  };

  const handleExecutarAgora = async () => {
    toast.info("Backup iniciado em segundo plano...");
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-primary" />
            Backup Automático
          </CardTitle>
          <CardDescription>
            Configure backups automáticos periódicos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Status */}
          <div className="p-4 bg-muted/50 rounded-lg border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`h-3 w-3 rounded-full ${ativo ? "bg-success" : "bg-muted-foreground"}`} />
                <span className="font-medium">
                  Backup automático: {ativo ? "ATIVO" : "INATIVO"}
                </span>
              </div>
              <Switch checked={ativo} onCheckedChange={setAtivo} />
            </div>
            
            {ativo && (
              <div className="mt-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>Próximo backup agendado:</span>
                </div>
                <p className="font-medium text-foreground mt-1">
                  {format(getProximoBackup(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
              </div>
            )}
          </div>

          {/* Configurações */}
          <div className="space-y-4">
            <h3 className="font-semibold">Configurações</h3>

            <div className="space-y-3">
              <div>
                <Label className="mb-2 block">Frequência:</Label>
                <RadioGroup value={frequencia} onValueChange={setFrequencia} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="diario" id="diario" />
                    <Label htmlFor="diario">Diário</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="semanal" id="semanal" />
                    <Label htmlFor="semanal">Semanal (toda segunda-feira)</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="mensal" id="mensal" />
                    <Label htmlFor="mensal">Mensal (dia 1 de cada mês)</Label>
                  </div>
                </RadioGroup>
              </div>

              <div>
                <Label htmlFor="horario">Horário:</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    id="horario"
                    type="time"
                    value={horario}
                    onChange={(e) => setHorario(e.target.value)}
                    className="w-32"
                  />
                  <span className="text-sm text-muted-foreground">(madrugada - sistema ocioso)</span>
                </div>
              </div>

              <div>
                <Label className="mb-2 block">Incluir no backup automático:</Label>
                <div className="flex items-center gap-2">
                  <Checkbox id="tudo" checked disabled />
                  <Label htmlFor="tudo">Tudo (backup completo)</Label>
                </div>
              </div>

              <div>
                <Label className="mb-2 block">Destinos:</Label>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="local"
                      checked={destinos.local}
                      onCheckedChange={(checked) =>
                        setDestinos(prev => ({ ...prev, local: checked === true }))
                      }
                    />
                    <Label htmlFor="local">Local (Armazenamento do Sistema)</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="googleDrive"
                      checked={destinos.googleDrive}
                      onCheckedChange={(checked) =>
                        setDestinos(prev => ({ ...prev, googleDrive: checked === true }))
                      }
                    />
                    <Label htmlFor="googleDrive">Google Drive (/Backups)</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="dropbox"
                      checked={destinos.dropbox}
                      onCheckedChange={(checked) =>
                        setDestinos(prev => ({ ...prev, dropbox: checked === true }))
                      }
                    />
                    <Label htmlFor="dropbox">Dropbox</Label>
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="retencao">Retenção:</Label>
                <div className="flex items-center gap-2 mt-1">
                  <span>Manter</span>
                  <Select value={retencao} onValueChange={setRetencao}>
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3</SelectItem>
                      <SelectItem value="6">6</SelectItem>
                      <SelectItem value="12">12</SelectItem>
                      <SelectItem value="24">24</SelectItem>
                    </SelectContent>
                  </Select>
                  <span>últimos backups</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  (Deleta automaticamente os mais antigos)
                </p>
              </div>

              <div>
                <Label className="mb-2 block">Notificações:</Label>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="notifSucesso"
                      checked={notificacoes.sucesso}
                      onCheckedChange={(checked) =>
                        setNotificacoes(prev => ({ ...prev, sucesso: checked === true }))
                      }
                    />
                    <Label htmlFor="notifSucesso">Email após backup bem-sucedido</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="notifFalha"
                      checked={notificacoes.falha}
                      onCheckedChange={(checked) =>
                        setNotificacoes(prev => ({ ...prev, falha: checked === true }))
                      }
                    />
                    <Label htmlFor="notifFalha">Alerta se backup falhar</Label>
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="email">Email:</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          {/* Histórico */}
          <div>
            <h3 className="font-semibold mb-3">Histórico de Backups Automáticos</h3>
            <div className="border rounded-lg divide-y">
              {historico.map((item) => (
                <div key={item.id} className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {item.status === "sucesso" ? (
                      <Check className="h-4 w-4 text-success" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-warning" />
                    )}
                    <span>
                      {format(item.data, "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </span>
                    <Badge variant={item.tipo === "automatico" ? "secondary" : "outline"}>
                      {item.tipo === "automatico" ? "Auto" : "Manual"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3">
                    {item.status === "sucesso" ? (
                      <span className="text-sm text-muted-foreground">{item.tamanho}</span>
                    ) : (
                      <span className="text-sm text-warning">{item.erro}</span>
                    )}
                    <Badge variant={item.status === "sucesso" ? "default" : "destructive"}>
                      {item.status === "sucesso" ? "Sucesso" : "Falhou"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
            <Button variant="link" className="mt-2 px-0">
              Ver Todos
            </Button>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleExecutarAgora}>
              <Play className="h-4 w-4 mr-2" />
              Executar Agora
            </Button>
            <Button onClick={handleSave} isLoading={loading}>
              Salvar Configurações
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
