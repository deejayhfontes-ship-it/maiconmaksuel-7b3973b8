import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DualProgressCard } from "./ProgressBar";
import { Eye, Pencil, ShoppingCart, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface Profissional {
  id: string;
  nome: string;
  telefone: string | null;
  cpf: string | null;
  data_admissao: string | null;
  comissao_servicos: number;
  comissao_produtos: number;
  cor_agenda: string;
  foto_url: string | null;
  pode_vender_produtos: boolean;
  meta_servicos_mes: number;
  meta_produtos_mes: number;
  ativo: boolean;
  // Calculados
  realizado_servicos?: number;
  realizado_produtos?: number;
}

interface ProfissionalCardProps {
  profissional: Profissional;
  mesReferencia: string;
  onView: (id: string) => void;
  onEdit: (profissional: Profissional) => void;
  onVendas: (id: string) => void;
  onDelete: (id: string) => void;
}

export function ProfissionalCard({ 
  profissional, 
  mesReferencia,
  onView, 
  onEdit, 
  onVendas, 
  onDelete 
}: ProfissionalCardProps) {
  const [showMetas, setShowMetas] = useState(false);

  const getInitials = (nome: string) => {
    return nome
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  return (
    <Card className="overflow-hidden animate-fade-in">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <Avatar className="h-12 w-12 border-2 shrink-0" style={{ borderColor: profissional.cor_agenda }}>
            {profissional.foto_url ? (
              <AvatarImage src={profissional.foto_url} alt={profissional.nome} />
            ) : null}
            <AvatarFallback 
              className="text-sm font-semibold"
              style={{ backgroundColor: profissional.cor_agenda, color: 'white' }}
            >
              {getInitials(profissional.nome)}
            </AvatarFallback>
          </Avatar>

          {/* Info Principal */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold truncate">{profissional.nome}</h3>
              <Badge variant={profissional.ativo ? "success" : "destructive"} className="shrink-0">
                {profissional.ativo ? "Ativo" : "Inativo"}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground truncate">
              {profissional.telefone || 'Sem telefone'} • Serv. {profissional.comissao_servicos}% | Prod. {profissional.comissao_produtos}%
            </p>
          </div>

          {/* Toggle Metas */}
          <Collapsible open={showMetas} onOpenChange={setShowMetas}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="shrink-0 text-muted-foreground">
                {showMetas ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                <span className="ml-1 text-xs">Metas</span>
              </Button>
            </CollapsibleTrigger>
          </Collapsible>

          {/* Cor Agenda */}
          <div 
            className="h-4 w-4 rounded-full border-2 border-border shrink-0"
            style={{ backgroundColor: profissional.cor_agenda }}
            title="Cor da agenda"
          />

          {/* Ações */}
          <div className="flex items-center gap-1 shrink-0">
            <Button 
              variant="ghost" 
              size="icon"
              className="h-8 w-8"
              onClick={() => onView(profissional.id)}
              title="Ver detalhes"
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon"
              className="h-8 w-8"
              onClick={() => onEdit(profissional)}
              title="Editar"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            {profissional.pode_vender_produtos && (
              <Button 
                variant="ghost" 
                size="icon"
                className="h-8 w-8 text-success hover:text-success"
                onClick={() => onVendas(profissional.id)}
                title="Vendas"
              >
                <ShoppingCart className="h-4 w-4" />
              </Button>
            )}
            <Button 
              variant="ghost" 
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => onDelete(profissional.id)}
              title="Excluir"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Metas Collapsible */}
        <Collapsible open={showMetas} onOpenChange={setShowMetas}>
          <CollapsibleContent className="pt-3 mt-3 border-t border-border">
            <DualProgressCard
              metaServicos={profissional.meta_servicos_mes}
              realizadoServicos={profissional.realizado_servicos || 0}
              metaProdutos={profissional.meta_produtos_mes}
              realizadoProdutos={profissional.realizado_produtos || 0}
              mesReferencia={mesReferencia}
            />
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}