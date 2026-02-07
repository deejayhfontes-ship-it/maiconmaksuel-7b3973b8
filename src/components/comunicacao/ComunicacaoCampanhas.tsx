import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Megaphone, 
  Users, 
  Gift, 
  Calendar, 
  TrendingUp,
  Play,
  Pause,
  Eye,
  Send
} from "lucide-react";
import { ComunicacaoCampanha } from "@/hooks/useComunicacao";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";

interface Props {
  campanhas: ComunicacaoCampanha[];
  onUpdateCampanha: (id: string, updates: Partial<ComunicacaoCampanha>) => Promise<void>;
  saving: boolean;
}

const iconesPorTipo: Record<string, React.ReactNode> = {
  inativos: <Users className="h-4 w-4" />,
  aniversariantes: <Gift className="h-4 w-4" />,
  vip: <TrendingUp className="h-4 w-4" />,
  cancelados: <Calendar className="h-4 w-4" />,
};

const coresPorTipo: Record<string, string> = {
  inativos: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  aniversariantes: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
  vip: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  cancelados: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

export function ComunicacaoCampanhas({ campanhas, onUpdateCampanha, saving }: Props) {
  const getPreviewMessage = (template: string) => {
    return template
      .replace(/{nome_cliente}/g, "Maria Silva")
      .replace(/{link_agendamento}/g, "https://salao.app/agendar")
      .replace(/{nome_salao}/g, "Maicon Maksuel");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Megaphone className="h-5 w-5" />
            Campanhas Segmentadas
          </h3>
          <p className="text-sm text-muted-foreground">
            Envie mensagens personalizadas para grupos específicos de clientes
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {campanhas.map((campanha) => (
          <Card key={campanha.id} className={!campanha.ativo ? "opacity-70" : ""}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${coresPorTipo[campanha.tipo_segmentacao] || 'bg-muted'}`}>
                    {iconesPorTipo[campanha.tipo_segmentacao] || <Megaphone className="h-4 w-4" />}
                  </div>
                  <div>
                    <CardTitle className="text-base">{campanha.nome}</CardTitle>
                    <CardDescription className="text-xs">
                      {campanha.descricao}
                    </CardDescription>
                  </div>
                </div>
                <Switch
                  checked={campanha.ativo}
                  onCheckedChange={(checked) => onUpdateCampanha(campanha.id, { ativo: checked })}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {campanha.desconto_oferecido && (
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                    🎁 {campanha.desconto_oferecido}% OFF
                  </Badge>
                </div>
              )}

              {campanha.criterio_dias_inativo && (
                <p className="text-sm text-muted-foreground">
                  Clientes inativos há {campanha.criterio_dias_inativo}+ dias
                </p>
              )}

              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Enviados: {campanha.total_enviados}</span>
                  <span>Responderam: {campanha.total_respondidos}</span>
                </div>
                <Progress 
                  value={campanha.total_enviados > 0 
                    ? (campanha.total_respondidos / campanha.total_enviados) * 100 
                    : 0
                  } 
                  className="h-1.5"
                />
              </div>

              <div className="flex gap-2">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="flex-1">
                      <Eye className="h-4 w-4 mr-1" />
                      Preview
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Preview: {campanha.nome}</DialogTitle>
                    </DialogHeader>
                    <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-4 border border-green-200 dark:border-green-900">
                      <div className="whitespace-pre-wrap text-sm">
                        {getPreviewMessage(campanha.template_mensagem)}
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

                <Button 
                  variant={campanha.ativo ? "default" : "secondary"} 
                  size="sm" 
                  className="flex-1"
                  disabled={saving || !campanha.ativo}
                >
                  {campanha.ativo ? (
                    <>
                      <Send className="h-4 w-4 mr-1" />
                      Enviar Agora
                    </>
                  ) : (
                    <>
                      <Pause className="h-4 w-4 mr-1" />
                      Inativa
                    </>
                  )}
                </Button>
              </div>

              {campanha.ativo && campanha.tipo_segmentacao === 'inativos' && (
                <p className="text-xs text-muted-foreground text-center">
                  Enviará automaticamente para novos clientes que atingirem {campanha.criterio_dias_inativo} dias
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Info box */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="pt-4">
          <div className="flex gap-3">
            <div className="shrink-0">
              <div className="p-2 rounded-lg bg-primary/10">
                <Megaphone className="h-5 w-5 text-primary" />
              </div>
            </div>
            <div>
              <h4 className="font-medium text-sm">Como funcionam as campanhas</h4>
              <ul className="text-xs text-muted-foreground mt-1 space-y-1">
                <li>• <strong>Inativos:</strong> Dispara automaticamente quando cliente atinge X dias sem agendar</li>
                <li>• <strong>Aniversariantes:</strong> Envia no início do mês para todos os aniversariantes</li>
                <li>• <strong>VIP:</strong> Clientes com 5+ agendamentos recebem benefícios exclusivos</li>
                <li>• <strong>Reconquista:</strong> Clientes que cancelaram nos últimos X dias</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
