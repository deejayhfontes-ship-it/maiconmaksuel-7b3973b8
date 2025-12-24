import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DualProgressCard } from "./ProgressBar";
import { Eye, Pencil, ShoppingCart, Trash2, Target } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

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
      <CardContent className="p-6 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-14 w-14 border-2" style={{ borderColor: profissional.cor_agenda }}>
              {profissional.foto_url ? (
                <AvatarImage src={profissional.foto_url} alt={profissional.nome} />
              ) : null}
              <AvatarFallback 
                className="text-lg font-semibold"
                style={{ backgroundColor: profissional.cor_agenda, color: 'white' }}
              >
                {getInitials(profissional.nome)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold text-lg">{profissional.nome}</h3>
              <p className="text-sm text-muted-foreground">
                {profissional.telefone || 'Sem telefone'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={profissional.ativo ? "success" : "destructive"}>
              {profissional.ativo ? "Ativo" : "Inativo"}
            </Badge>
            <div 
              className="h-4 w-4 rounded-full border-2 border-border"
              style={{ backgroundColor: profissional.cor_agenda }}
              title="Cor da agenda"
            />
          </div>
        </div>

        {/* Comissões */}
        <div className="text-sm text-muted-foreground border-t border-b border-border py-2">
          Comissões: Serviços {profissional.comissao_servicos}% | Produtos {profissional.comissao_produtos}%
        </div>

        {/* Toggle Metas */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-muted-foreground" />
            <Label htmlFor={`metas-${profissional.id}`} className="text-sm font-medium cursor-pointer">
              Metas do Mês
            </Label>
          </div>
          <Switch
            id={`metas-${profissional.id}`}
            checked={showMetas}
            onCheckedChange={setShowMetas}
          />
        </div>

        {/* Metas */}
        {showMetas && (
          <div className="animate-fade-in">
            <DualProgressCard
              metaServicos={profissional.meta_servicos_mes}
              realizadoServicos={profissional.realizado_servicos || 0}
              metaProdutos={profissional.meta_produtos_mes}
              realizadoProdutos={profissional.realizado_produtos || 0}
              mesReferencia={mesReferencia}
            />
          </div>
        )}

        {/* Ações */}
        <div className="flex items-center gap-2 pt-2 border-t border-border">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1"
            onClick={() => onView(profissional.id)}
          >
            <Eye className="h-4 w-4 mr-1" />
            Ver Detalhes
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => onEdit(profissional)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          {profissional.pode_vender_produtos && (
            <Button 
              variant="outline" 
              size="sm"
              className="text-success hover:text-success"
              onClick={() => onVendas(profissional.id)}
            >
              <ShoppingCart className="h-4 w-4" />
            </Button>
          )}
          <Button 
            variant="ghost" 
            size="sm"
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => onDelete(profissional.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}