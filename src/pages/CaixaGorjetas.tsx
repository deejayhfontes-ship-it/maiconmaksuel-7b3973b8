import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Gift,
  User,
  Check,
  Calendar,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface GorjetaProfissional {
  profissional_id: string;
  profissional_nome: string;
  profissional_foto: string | null;
  profissional_cor: string;
  total: number;
  repassado: number;
  pendente: number;
  gorjetas: any[];
}

const formatPrice = (price: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(price);
};

export default function CaixaGorjetas() {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [gorjetasPorProfissional, setGorjetasPorProfissional] = useState<GorjetaProfissional[]>([]);
  const [periodo, setPeriodo] = useState("hoje");
  const [expandedProfissional, setExpandedProfissional] = useState<string | null>(null);
  
  // Modal
  const [selectedProfissional, setSelectedProfissional] = useState<GorjetaProfissional | null>(null);
  const [isRepassarOpen, setIsRepassarOpen] = useState(false);
  const [valorRepasse, setValorRepasse] = useState(0);
  const [tipoRepasse, setTipoRepasse] = useState<"total" | "parcial">("total");
  const [formaRepasse, setFormaRepasse] = useState("dinheiro");
  const [obsRepasse, setObsRepasse] = useState("");

  const getDateRange = useCallback(() => {
    const hoje = new Date();
    switch (periodo) {
      case "hoje":
        return {
          inicio: format(hoje, "yyyy-MM-dd"),
          fim: format(hoje, "yyyy-MM-dd"),
        };
      case "semana":
        return {
          inicio: format(startOfWeek(hoje, { weekStartsOn: 1 }), "yyyy-MM-dd"),
          fim: format(endOfWeek(hoje, { weekStartsOn: 1 }), "yyyy-MM-dd"),
        };
      case "mes":
        return {
          inicio: format(startOfMonth(hoje), "yyyy-MM-dd"),
          fim: format(endOfMonth(hoje), "yyyy-MM-dd"),
        };
      default:
        return {
          inicio: format(hoje, "yyyy-MM-dd"),
          fim: format(hoje, "yyyy-MM-dd"),
        };
    }
  }, [periodo]);

  const fetchGorjetas = useCallback(async () => {
    setLoading(true);
    const { inicio, fim } = getDateRange();

    const { data: gorjetas, error } = await supabase
      .from("gorjetas")
      .select(`
        *,
        profissional:profissional_id (id, nome, foto_url, cor_agenda)
      `)
      .gte("data", inicio)
      .lte("data", fim)
      .order("data", { ascending: false });

    if (error) {
      toast({ title: "Erro ao carregar gorjetas", variant: "destructive" });
      setLoading(false);
      return;
    }

    // Agrupar por profissional
    const agrupado = new Map<string, GorjetaProfissional>();
    
    (gorjetas || []).forEach((g) => {
      const prof = g.profissional;
      if (!prof) return;

      if (!agrupado.has(prof.id)) {
        agrupado.set(prof.id, {
          profissional_id: prof.id,
          profissional_nome: prof.nome,
          profissional_foto: prof.foto_url,
          profissional_cor: prof.cor_agenda,
          total: 0,
          repassado: 0,
          pendente: 0,
          gorjetas: [],
        });
      }

      const entry = agrupado.get(prof.id)!;
      const valor = Number(g.valor);
      entry.total += valor;
      
      if (g.repassada) {
        entry.repassado += valor;
      } else {
        entry.pendente += valor;
      }
      
      entry.gorjetas.push(g);
    });

    setGorjetasPorProfissional(Array.from(agrupado.values()));
    setLoading(false);
  }, [getDateRange, toast]);

  useEffect(() => {
    fetchGorjetas();
  }, [fetchGorjetas]);

  const handleRepassar = (prof: GorjetaProfissional) => {
    setSelectedProfissional(prof);
    setValorRepasse(prof.pendente);
    setTipoRepasse("total");
    setFormaRepasse("dinheiro");
    setObsRepasse("");
    setIsRepassarOpen(true);
  };

  const confirmarRepasse = async () => {
    if (!selectedProfissional) return;

    const valor = tipoRepasse === "total" ? selectedProfissional.pendente : valorRepasse;
    
    // Atualizar gorjetas como repassadas
    const gorjetasPendentes = selectedProfissional.gorjetas.filter((g) => !g.repassada);
    let valorAcumulado = 0;

    for (const gorjeta of gorjetasPendentes) {
      if (tipoRepasse === "total" || valorAcumulado < valor) {
        const valorGorjeta = Number(gorjeta.valor);
        if (tipoRepasse === "parcial" && valorAcumulado + valorGorjeta > valor) {
          // Repasse parcial - não atualizar esta gorjeta
          break;
        }

        await supabase
          .from("gorjetas")
          .update({
            repassada: true,
            data_repasse: new Date().toISOString().split("T")[0],
            forma_repasse: formaRepasse,
            observacoes: obsRepasse || null,
          })
          .eq("id", gorjeta.id);

        valorAcumulado += valorGorjeta;
      }
    }

    // Registrar movimentação no caixa se for dinheiro
    if (formaRepasse === "dinheiro") {
      const { data: caixa } = await supabase
        .from("caixa")
        .select("id")
        .eq("status", "aberto")
        .limit(1)
        .maybeSingle();

      if (caixa) {
        await supabase.from("caixa_movimentacoes").insert([{
          caixa_id: caixa.id,
          tipo: "saida",
          descricao: `Repasse gorjeta - ${selectedProfissional.profissional_nome}`,
          valor: tipoRepasse === "total" ? selectedProfissional.pendente : valorRepasse,
          forma_pagamento: "dinheiro",
        }]);
      }
    }

    toast({
      title: "Gorjeta repassada!",
      description: `${formatPrice(valor)} para ${selectedProfissional.profissional_nome}`,
    });

    setIsRepassarOpen(false);
    setSelectedProfissional(null);
    fetchGorjetas();
  };

  const totalColetado = gorjetasPorProfissional.reduce((acc, p) => acc + p.total, 0);
  const totalRepassado = gorjetasPorProfissional.reduce((acc, p) => acc + p.repassado, 0);
  const totalPendente = gorjetasPorProfissional.reduce((acc, p) => acc + p.pendente, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/caixa")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Repasse de Gorjetas</h1>
          <p className="text-muted-foreground">Gerenciar gorjetas dos profissionais</p>
        </div>
        <Select value={periodo} onValueChange={setPeriodo}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="hoje">Hoje</SelectItem>
            <SelectItem value="semana">Esta Semana</SelectItem>
            <SelectItem value="mes">Este Mês</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Resumo */}
      <Card className="bg-pink-500/5 border-pink-500/30">
        <CardContent className="p-6">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-sm text-muted-foreground">Total Coletado</p>
              <p className="text-2xl font-bold">{formatPrice(totalColetado)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Já Repassado</p>
              <p className="text-2xl font-bold text-success">{formatPrice(totalRepassado)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pendente</p>
              <p className="text-2xl font-bold text-pink-500">{formatPrice(totalPendente)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista por Profissional */}
      {gorjetasPorProfissional.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Gift className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Nenhuma gorjeta registrada no período</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {gorjetasPorProfissional.map((prof) => (
            <Collapsible
              key={prof.profissional_id}
              open={expandedProfissional === prof.profissional_id}
              onOpenChange={(open) => setExpandedProfissional(open ? prof.profissional_id : null)}
            >
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={prof.profissional_foto || undefined} />
                        <AvatarFallback 
                          className="text-white font-medium"
                          style={{ backgroundColor: prof.profissional_cor }}
                        >
                          {prof.profissional_nome.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-lg">{prof.profissional_nome}</CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary">{formatPrice(prof.total)}</Badge>
                          {prof.pendente > 0 && (
                            <Badge className="bg-pink-500">{formatPrice(prof.pendente)} pendente</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {prof.pendente > 0 && (
                        <Button 
                          size="sm"
                          className="bg-pink-500 hover:bg-pink-600"
                          onClick={() => handleRepassar(prof)}
                        >
                          <Gift className="h-4 w-4 mr-1" />
                          Repassar
                        </Button>
                      )}
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="icon">
                          {expandedProfissional === prof.profissional_id ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </CollapsibleTrigger>
                    </div>
                  </div>
                </CardHeader>
                <CollapsibleContent>
                  <CardContent className="pt-0">
                    <div className="border-t pt-4 space-y-2">
                      {prof.gorjetas.map((g) => (
                        <div 
                          key={g.id}
                          className={cn(
                            "flex items-center justify-between p-3 rounded-lg",
                            g.repassada ? "bg-success/10" : "bg-pink-500/10"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span>{format(parseISO(g.data), "dd/MM/yyyy")}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-medium">{formatPrice(g.valor)}</span>
                            {g.repassada ? (
                              <Badge variant="outline" className="bg-success/10 text-success">
                                <Check className="h-3 w-3 mr-1" />
                                Repassada
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-pink-500/10 text-pink-500">
                                Pendente
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          ))}
        </div>
      )}

      {/* Modal Repassar */}
      <Dialog open={isRepassarOpen} onOpenChange={setIsRepassarOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-pink-500" />
              Repassar Gorjeta
            </DialogTitle>
            <DialogDescription>
              {selectedProfissional?.profissional_nome} - Pendente: {formatPrice(selectedProfissional?.pendente || 0)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Tipo */}
            <div>
              <Label>Valor a Repassar</Label>
              <RadioGroup 
                value={tipoRepasse} 
                onValueChange={(v: any) => {
                  setTipoRepasse(v);
                  if (v === "total") setValorRepasse(selectedProfissional?.pendente || 0);
                }}
                className="grid grid-cols-2 gap-2 mt-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="total" id="total" />
                  <Label htmlFor="total" className="cursor-pointer">
                    Total ({formatPrice(selectedProfissional?.pendente || 0)})
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="parcial" id="parcial" />
                  <Label htmlFor="parcial" className="cursor-pointer">Parcial</Label>
                </div>
              </RadioGroup>
            </div>

            {tipoRepasse === "parcial" && (
              <div>
                <Label>Valor</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">R$</span>
                  <Input
                    type="number"
                    className="pl-10"
                    value={valorRepasse || ""}
                    onChange={(e) => setValorRepasse(Number(e.target.value))}
                    max={selectedProfissional?.pendente}
                  />
                </div>
              </div>
            )}

            {/* Forma */}
            <div>
              <Label>Forma de Repasse</Label>
              <Select value={formaRepasse} onValueChange={setFormaRepasse}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="comissao">Adicionar à Comissão</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Observações */}
            <div>
              <Label>Observações</Label>
              <Textarea
                placeholder="Observações sobre o repasse..."
                value={obsRepasse}
                onChange={(e) => setObsRepasse(e.target.value)}
                rows={2}
              />
            </div>

            {/* Botões */}
            <div className="flex gap-3 pt-4">
              <Button variant="outline" className="flex-1" onClick={() => setIsRepassarOpen(false)}>
                Cancelar
              </Button>
              <Button 
                className="flex-1 bg-pink-500 hover:bg-pink-600"
                onClick={confirmarRepasse}
              >
                <Gift className="h-4 w-4 mr-2" />
                Confirmar Repasse
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
