import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  Send,
  Settings,
  Plus,
  Edit,
  Target
} from "lucide-react";
import { ComunicacaoCampanha } from "@/hooks/useComunicacao";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle,
  SheetTrigger 
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CampanhaConfiguracao } from "./CampanhaConfiguracao";

interface Props {
  campanhas: ComunicacaoCampanha[];
  onUpdateCampanha: (id: string, updates: Partial<ComunicacaoCampanha>) => Promise<void>;
  saving: boolean;
}

const iconesPorTipo: Record<string, React.ReactNode> = {
  inativos: <Users className="h-4 w-4" />,
  reativacao: <Users className="h-4 w-4" />,
  aniversariantes: <Gift className="h-4 w-4" />,
  vip: <TrendingUp className="h-4 w-4" />,
  cancelados: <Calendar className="h-4 w-4" />,
  reconquista: <Target className="h-4 w-4" />,
  personalizada: <Megaphone className="h-4 w-4" />,
};

const coresPorTipo: Record<string, string> = {
  inativos: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  reativacao: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  aniversariantes: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
  vip: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  cancelados: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  reconquista: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  personalizada: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
};

export function ComunicacaoCampanhas({ campanhas, onUpdateCampanha, saving }: Props) {
  const [selectedCampanha, setSelectedCampanha] = useState<ComunicacaoCampanha | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [isNewCampanha, setIsNewCampanha] = useState(false);

  const getPreviewMessage = (template: string) => {
    return template
      .replace(/{nome_cliente}/g, "Maria Silva")
      .replace(/{{nome}}/g, "Maria Silva")
      .replace(/{{primeiro_nome}}/g, "Maria")
      .replace(/{link_agendamento}/g, "https://salao.app/agendar")
      .replace(/{nome_salao}/g, "Maicon Maksuel")
      .replace(/{{empresa}}/g, "Maicon Maksuel");
  };

  const handleOpenConfig = (campanha?: ComunicacaoCampanha) => {
    if (campanha) {
      setSelectedCampanha(campanha);
      setIsNewCampanha(false);
    } else {
      setSelectedCampanha(null);
      setIsNewCampanha(true);
    }
    setShowConfig(true);
  };

  const handleCloseConfig = () => {
    setShowConfig(false);
    setSelectedCampanha(null);
    setIsNewCampanha(false);
  };

  const handleSaveCampanha = async (data: any) => {
    if (selectedCampanha) {
      await onUpdateCampanha(selectedCampanha.id, {
        nome: data.nome,
        descricao: data.descricao,
        tipo_segmentacao: data.tipo_segmentacao,
        template_mensagem: data.template_mensagem,
        desconto_oferecido: data.desconto_oferecido,
        ativo: data.ativo,
        criterio_dias_inativo: data.dias_inativo,
      });
    }
    handleCloseConfig();
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
        
        <div className="flex gap-2">
          <Sheet open={showConfig} onOpenChange={setShowConfig}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" onClick={() => handleOpenConfig()}>
                <Settings className="h-4 w-4 mr-2" />
                Configurações
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:max-w-2xl lg:max-w-4xl p-0">
              <ScrollArea className="h-full">
                <div className="p-6">
                  <CampanhaConfiguracao
                    campanha={selectedCampanha}
                    onSave={handleSaveCampanha}
                    onClose={handleCloseConfig}
                    saving={saving}
                  />
                </div>
              </ScrollArea>
            </SheetContent>
          </Sheet>
          
          <Button size="sm" onClick={() => handleOpenConfig()}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Campanha
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {campanhas.map((campanha) => (
          <Card 
            key={campanha.id} 
            className={`relative group cursor-pointer transition-all hover:shadow-md ${!campanha.ativo ? "opacity-70" : ""}`}
            onClick={() => handleOpenConfig(campanha)}
          >
            {/* Status Indicator */}
            <div className={`absolute top-3 right-3 w-2.5 h-2.5 rounded-full ${
              campanha.ativo ? 'bg-green-500' : 'bg-muted-foreground/30'
            }`} />
            
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between pr-6">
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
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                {campanha.ativo ? (
                  <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5" />
                    Ativa
                  </Badge>
                ) : (
                  <Badge variant="secondary">
                    Inativa
                  </Badge>
                )}
                
                {campanha.desconto_oferecido && (
                  <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-0">
                    🎁 {campanha.desconto_oferecido}% OFF
                  </Badge>
                )}
              </div>

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

              <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
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
                    <div className="bg-[#e5ddd5] dark:bg-[#0b141a] rounded-lg p-4">
                      <div className="max-w-[280px] ml-auto">
                        <div className="bg-[#dcf8c6] dark:bg-[#005c4b] rounded-lg rounded-tr-none p-3 shadow-sm">
                          <p className="whitespace-pre-wrap text-sm text-[#111b21] dark:text-[#e9edef]">
                            {getPreviewMessage(campanha.template_mensagem)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

                <Button 
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleOpenConfig(campanha)}
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Editar
                </Button>

                <Button 
                  variant={campanha.ativo ? "default" : "secondary"} 
                  size="sm" 
                  className="flex-1"
                  disabled={saving || !campanha.ativo}
                  onClick={() => {/* Enviar campanha */}}
                >
                  {campanha.ativo ? (
                    <>
                      <Send className="h-4 w-4 mr-1" />
                      Enviar
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
                <li>• <strong>Reativação:</strong> Dispara automaticamente quando cliente atinge X dias sem agendar</li>
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
