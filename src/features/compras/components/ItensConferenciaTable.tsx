import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, Search, Plus } from "lucide-react";
import { NfeItem } from "../types/nfe.types";
import { Produto } from "@/hooks/useProdutos";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export interface VinculoItem {
  xmlCodigo: string;
  produtoId: string | null;
  fatorConversao: number; // ex: 1 caixa no XML = 12 unidades no estoque
  criarNovo: boolean; // se true, não vincula a um existente, cria um novo
}

interface ItensConferenciaTableProps {
  itensXml: NfeItem[];
  produtosLocais: Produto[];
  onChange: (vinculos: Record<string, VinculoItem>) => void;
}

export function ItensConferenciaTable({ itensXml, produtosLocais, onChange }: ItensConferenciaTableProps) {
  const [vinculos, setVinculos] = useState<Record<string, VinculoItem>>({});

  // Tenta auto-vincular no carregamento inicial
  useEffect(() => {
    const iniciais: Record<string, VinculoItem> = {};
    
    itensXml.forEach(item => {
      // 1. Tenta achar por EAN/Código de Barras se o XML trouxer (geralmente cEAN)
      // Como nosso parse atual pega "codigo", podemos testar.
      // Aqui podemos usar similaridade de nome também.
      
      const exato = produtosLocais.find(p => p.codigo_barras === item.codigo || p.nome.toLowerCase() === item.descricao.toLowerCase());
      
      iniciais[item.codigo] = {
        xmlCodigo: item.codigo,
        produtoId: exato ? exato.id : null,
        fatorConversao: 1,
        criarNovo: false
      };
    });
    
    setVinculos(iniciais);
    onChange(iniciais);
  }, [itensXml, produtosLocais]); // eslint-disable-line react-hooks/exhaustive-deps

  const atualizarVinculo = (codigoXml: string, campo: keyof VinculoItem, valor: any) => {
    const novo = { ...vinculos };
    if (!novo[codigoXml]) {
      novo[codigoXml] = { xmlCodigo: codigoXml, produtoId: null, fatorConversao: 1, criarNovo: false };
    }
    
    novo[codigoXml] = { ...novo[codigoXml], [campo]: valor };
    
    // Regras de negócio da UI
    if (campo === 'produtoId' && valor !== null) {
      novo[codigoXml].criarNovo = false; // Se escolheu produto, não vai criar novo
    }
    if (campo === 'criarNovo' && valor === true) {
      novo[codigoXml].produtoId = null; // Se vai criar novo, reseta a escolha
    }

    setVinculos(novo);
    onChange(novo);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-lg">Itens da Nota ({itensXml.length})</h3>
        <Badge variant="outline" className="gap-1">
          <CheckCircle2 className="w-3 h-3 text-success" />
          {Object.values(vinculos).filter(v => v.produtoId || v.criarNovo).length} de {itensXml.length} vinculados
        </Badge>
      </div>

      <div className="border rounded-md overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40%]">Item na Nota Fiscal (XML)</TableHead>
              <TableHead>Qtd. XML</TableHead>
              <TableHead className="w-[40%]">Produto no Estoque (Sistema)</TableHead>
              <TableHead>Conversão</TableHead>
              <TableHead>Entrada Real</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {itensXml.map((item) => {
              const vinculo = vinculos[item.codigo] || { produtoId: null, fatorConversao: 1, criarNovo: false };
              const isVinculado = vinculo.produtoId !== null || vinculo.criarNovo;
              
              return (
                <TableRow key={item.codigo} className={isVinculado ? "bg-card" : "bg-warning/5"}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium text-sm">{item.descricao}</span>
                      <span className="text-xs text-muted-foreground">
                        Cód: {item.codigo} | CFOP: {item.cfop} | R$ {item.valorTotal.toFixed(2)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="font-mono">
                      {item.quantidade} {item.unidade}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {vinculo.criarNovo ? (
                      <div className="flex items-center gap-2 text-primary font-medium text-sm">
                        <Plus className="w-4 h-4" />
                        Será cadastrado como novo produto
                        <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => atualizarVinculo(item.codigo, 'criarNovo', false)}>
                          Desfazer
                        </Button>
                      </div>
                    ) : (
                      <Select
                        value={vinculo.produtoId || "new_or_empty"}
                        onValueChange={(val) => {
                          if (val === "new_or_empty") return;
                          if (val === "CREATE_NEW") {
                            atualizarVinculo(item.codigo, 'criarNovo', true);
                          } else {
                            atualizarVinculo(item.codigo, 'produtoId', val);
                          }
                        }}
                      >
                        <SelectTrigger className={vinculo.produtoId ? "border-success/50" : "border-warning"}>
                          <SelectValue placeholder="Selecione um produto..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="new_or_empty" disabled className="hidden">Selecione...</SelectItem>
                          <SelectItem value="CREATE_NEW" className="text-primary font-medium">
                            <span className="flex items-center gap-2"><Plus className="w-4 h-4" /> Cadastrar como novo produto</span>
                          </SelectItem>
                          
                          {/* Sugestões ou Todos (Ideal seria um Combobox pesquisável para muitos produtos, mas Select serve para MVP) */}
                          {produtosLocais.map(p => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.nome} (Estoque: {p.estoque_atual})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">x</span>
                      <Input 
                        type="number" 
                        min="1" 
                        className="w-16 h-8 text-center" 
                        value={vinculo.fatorConversao}
                        onChange={(e) => atualizarVinculo(item.codigo, 'fatorConversao', parseFloat(e.target.value) || 1)}
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="default" className="font-mono bg-primary">
                      {Math.round(item.quantidade * vinculo.fatorConversao)} unid.
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
