import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ProgressBar } from "./ProgressBar";
import { MoreHorizontal, Pencil, ShoppingCart, Trash2 } from "lucide-react";

interface Profissional {
  id: string;
  nome: string;
  telefone: string | null;
  cor_agenda: string;
  foto_url: string | null;
  pode_vender_produtos: boolean;
  meta_servicos_mes: number;
  meta_produtos_mes: number;
  ativo: boolean;
  realizado_servicos?: number;
  realizado_produtos?: number;
}

interface ProfissionalTableProps {
  profissionais: Profissional[];
  onEdit: (profissional: Profissional) => void;
  onVendas: (id: string) => void;
  onDelete: (id: string) => void;
}

export function ProfissionalTable({ 
  profissionais, 
  onEdit, 
  onVendas, 
  onDelete 
}: ProfissionalTableProps) {
  const getInitials = (nome: string) => {
    return nome
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const formatCurrency = (val: number) => {
    if (val >= 1000) return `R$ ${(val / 1000).toFixed(1)}k`;
    return `R$ ${val.toFixed(0)}`;
  };

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[60px]">Foto</TableHead>
            <TableHead>Nome</TableHead>
            <TableHead className="w-[100px]">Status</TableHead>
            <TableHead className="w-[220px]">Meta Serviços</TableHead>
            <TableHead className="w-[220px]">Meta Produtos</TableHead>
            <TableHead className="w-[80px]">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {profissionais.map((prof, index) => {
            const realizadoServicos = prof.realizado_servicos || 0;
            const realizadoProdutos = prof.realizado_produtos || 0;
            
            return (
              <TableRow 
                key={prof.id} 
                className="animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <TableCell>
                  <Avatar className="h-10 w-10 border-2" style={{ borderColor: prof.cor_agenda }}>
                    {prof.foto_url ? (
                      <AvatarImage src={prof.foto_url} alt={prof.nome} />
                    ) : null}
                    <AvatarFallback 
                      className="text-sm font-medium"
                      style={{ backgroundColor: prof.cor_agenda, color: 'white' }}
                    >
                      {getInitials(prof.nome)}
                    </AvatarFallback>
                  </Avatar>
                </TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium">{prof.nome}</p>
                    <p className="text-xs text-muted-foreground">{prof.telefone || '-'}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={prof.ativo ? "success" : "destructive"} className="text-xs">
                    {prof.ativo ? "Ativo" : "Inativo"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <ProgressBar 
                      value={realizadoServicos} 
                      max={prof.meta_servicos_mes} 
                      showRemaining={false}
                      size="sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(realizadoServicos)}/{formatCurrency(prof.meta_servicos_mes)}
                    </p>
                  </div>
                </TableCell>
                <TableCell>
                  {prof.meta_produtos_mes > 0 ? (
                    <div className="space-y-1">
                      <ProgressBar 
                        value={realizadoProdutos} 
                        max={prof.meta_produtos_mes} 
                        showRemaining={false}
                        size="sm"
                      />
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(realizadoProdutos)}/{formatCurrency(prof.meta_produtos_mes)}
                      </p>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground italic">Sem meta</span>
                  )}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit(prof as any)}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      {prof.pode_vender_produtos && (
                        <DropdownMenuItem onClick={() => onVendas(prof.id)}>
                          <ShoppingCart className="h-4 w-4 mr-2" />
                          Vendas
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem 
                        onClick={() => onDelete(prof.id)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}