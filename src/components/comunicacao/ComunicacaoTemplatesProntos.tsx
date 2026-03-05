import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  Copy,
  Check
} from "lucide-react";
import { ComunicacaoTemplatePronto } from "@/hooks/useComunicacao";
import { useState } from "react";
import { toast } from "sonner";

interface Props {
  templates: ComunicacaoTemplatePronto[];
  onSelectTemplate: (template: ComunicacaoTemplatePronto) => void;
}

const estilosCores: Record<string, string> = {
  formal: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  informal: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
  elegante: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
};

const estilosLabels: Record<string, string> = {
  formal: "Clássico",
  informal: "Descontraído",
  elegante: "Luxo",
};

export function ComunicacaoTemplatesProntos({ templates, onSelectTemplate }: Props) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (template: ComunicacaoTemplatePronto) => {
    navigator.clipboard.writeText(template.mensagem);
    setCopiedId(template.id);
    toast.success("Template copiado!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Agrupar templates por tipo
  const templatesPorTipo = templates.reduce((acc, template) => {
    if (!acc[template.tipo]) {
      acc[template.tipo] = [];
    }
    acc[template.tipo].push(template);
    return acc;
  }, {} as Record<string, ComunicacaoTemplatePronto[]>);

  const tiposLabels: Record<string, string> = {
    confirmacao: "Confirmação de Agendamento",
    lembrete: "Lembrete",
    pos_atendimento: "Pós-Atendimento",
    avaliacao: "Solicitação de Avaliação",
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Templates Prontos
        </h3>
        <p className="text-sm text-muted-foreground">
          Escolha um estilo de comunicação e personalize suas mensagens
        </p>
      </div>

      {Object.entries(templatesPorTipo).map(([tipo, templatesDoTipo]) => (
        <div key={tipo} className="space-y-3">
          <h4 className="font-medium text-sm text-muted-foreground">
            {tiposLabels[tipo] || tipo}
          </h4>
          
          <div className="grid gap-3 md:grid-cols-3">
            {templatesDoTipo.map((template) => (
              <Card 
                key={template.id} 
                className="cursor-pointer hover:border-primary transition-colors"
                onClick={() => onSelectTemplate(template)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">{template.nome}</CardTitle>
                    <Badge className={estilosCores[template.estilo] || "bg-muted"}>
                      {estilosLabels[template.estilo] || template.estilo}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-xs text-muted-foreground line-clamp-4 whitespace-pre-wrap mb-3">
                    {template.mensagem}
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopy(template);
                      }}
                    >
                      {copiedId === template.id ? (
                        <Check className="h-3 w-3 mr-1" />
                      ) : (
                        <Copy className="h-3 w-3 mr-1" />
                      )}
                      Copiar
                    </Button>
                    <Button 
                      size="sm" 
                      className="flex-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectTemplate(template);
                      }}
                    >
                      Usar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}

      {templates.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>Nenhum template disponível</p>
        </div>
      )}
    </div>
  );
}
