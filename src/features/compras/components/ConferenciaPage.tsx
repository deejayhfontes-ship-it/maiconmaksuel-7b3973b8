import { useState, useEffect } from "react";
import { ArrowLeft, Save, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NfeParseResult, FornecedorParse, NotaParse, ItemParse, ProcessarEntradaPayload } from "../types/nfe.types";
import { useProdutos } from "@/hooks/useProdutos";
import { ItensConferenciaTable, VinculoItem } from "./ItensConferenciaTable";
import { comprasApi } from "../services/comprasApi";
import { SALAO_ID } from "../constants";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface ConferenciaPageProps {
  data: NfeParseResult;
  onCancel: () => void;
  onSuccess: () => void;
}

export function ConferenciaPage({ data, onCancel, onSuccess }: ConferenciaPageProps) {
  const { produtos, loading: loadingProdutos } = useProdutos();
  const [vinculos, setVinculos] = useState<Record<string, VinculoItem>>({});
  const [salvando, setSalvando] = useState(false);
  const queryClient = useQueryClient();

  const totalVinculados = Object.values(vinculos).filter(v => v.produtoId || v.criarNovo).length;
  const totalItens = data.itens.length;
  const todosVinculados = totalVinculados === totalItens && totalItens > 0;

  const handleConfirmarEntrada = async () => {
    if (!todosVinculados) {
      toast.error("Vincule todos os itens a um produto antes de confirmar.");
      return;
    }

    setSalvando(true);
    try {
      // App single-tenant sem login Supabase (roda na chave anon). Não há
      // auth.getUser(), então usamos o SALAO_ID fixo como identificador do
      // tenant para as tabelas de compras.
      const userId = SALAO_ID;

      const fornecedor: FornecedorParse = {
        tipo_pessoa: data.fornecedor.cnpj.length > 11 ? "PJ" : "PF",
        documento: data.fornecedor.cnpj,
        razao_social: data.fornecedor.nome,
        nome_fantasia: data.fornecedor.nome,
        inscricao_estadual: data.fornecedor.inscricaoEstadual || "",
        endereco_logradouro: "",
        endereco_numero: "",
        endereco_bairro: "",
        endereco_municipio: "",
        endereco_uf: "",
        endereco_cep: "",
      };

      const nota: NotaParse = {
        chave_acesso: data.notaInfo.chave,
        numero: parseInt(data.notaInfo.numero) || 0,
        serie: parseInt(data.notaInfo.serie) || 1,
        modelo: "55",
        natureza_operacao: "COMPRA",
        data_emissao: data.notaInfo.dataEmissao,
        valor_produtos: data.notaInfo.valorTotal || data.itens.reduce((s, i) => s + i.valorTotal, 0),
        valor_desconto: 0,
        valor_frete: 0,
        valor_outros: 0,
        valor_total: data.notaInfo.valorTotal || data.itens.reduce((s, i) => s + i.valorTotal, 0),
        protocolo: "",
        dados_brutos: {},
      };

      const itens: ItemParse[] = data.itens.map((item, idx) => {
        const vinculo = vinculos[item.codigo];
        const custoUnit = item.valorTotal / (item.quantidade || 1);
        return {
          numero_item: idx + 1,
          codigo_fornecedor: item.codigo,
          ean: item.ean || "",
          descricao: item.descricao,
          ncm: item.ncm || "",
          cfop: item.cfop || "1102",
          unidade_comercial: item.unidade,
          quantidade_comercial: item.quantidade,
          valor_unitario_comercial: item.valorUnitario,
          valor_total_item: item.valorTotal,
          desconto_item: 0,
          custo_unitario_calculado: custoUnit,
          fator_conversao: vinculo?.fatorConversao || 1,
          produto_id: vinculo?.produtoId || undefined,
        };
      });

      const payload: ProcessarEntradaPayload = {
        salao_id: userId,
        fornecedor,
        nota,
        itens,
        duplicatas: data.duplicatas || [],
      };

      await comprasApi.processarEntrada(payload);

      // Log movimentações de estoque para cada item vinculado
      try {
        const movDb = supabase as any;
        for (const item of itens) {
          if (!item.produto_id) continue;
          const { data: prodAtual } = await supabase
            .from("produtos")
            .select("estoque_atual")
            .eq("id", item.produto_id)
            .single();
          if (prodAtual) {
            const qtdEntrada = item.quantidade_comercial * (item.fator_conversao || 1);
            await movDb.from("estoque_movimentacoes").insert([{
              produto_id: item.produto_id,
              tipo: "entrada",
              quantidade: qtdEntrada,
              quantidade_anterior: Number(prodAtual.estoque_atual) - qtdEntrada,
              quantidade_posterior: Number(prodAtual.estoque_atual),
              motivo: `Entrada NF ${nota.numero} - ${item.descricao}`,
              usuario_nome: "Sistema",
            }]);
          }
        }
      } catch (e) {
        console.warn("[ConferenciaPage] Falha ao registrar movimentações de estoque:", e);
      }

      queryClient.invalidateQueries({ queryKey: ['historico-entradas'] });
      queryClient.invalidateQueries({ queryKey: ['produtos'] });

      toast.success("Entrada confirmada! Estoque atualizado.");
      onSuccess();
    } catch (err: any) {
      console.error("Erro ao confirmar entrada:", err);
      const msg = err.message || "Erro ao processar entrada";
      if (msg.includes("duplicate") || msg.includes("unique") || msg.includes("chave")) {
        toast.error("Esta nota já foi registrada no sistema.");
      } else {
        toast.error(msg);
      }
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card p-4 rounded-xl border border-border">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onCancel} className="h-10 w-10 shrink-0" disabled={salvando}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="text-xl font-bold tracking-tight">Conferência de Entrada</h2>
            <p className="text-sm text-muted-foreground">
              Vincule cada item da nota a um produto do estoque e confirme
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Badge variant={todosVinculados ? "default" : "outline"} className="gap-1.5">
            {todosVinculados ? (
              <CheckCircle2 className="w-3.5 h-3.5" />
            ) : (
              <AlertTriangle className="w-3.5 h-3.5" />
            )}
            {totalVinculados}/{totalItens} vinculados
          </Badge>

          <Button variant="outline" onClick={onCancel} disabled={salvando}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirmarEntrada}
            disabled={!todosVinculados || salvando}
          >
            {salvando ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            {salvando ? "Processando..." : "Confirmar Entrada"}
          </Button>
        </div>
      </div>

      {/* Fornecedor + Nota */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card p-5 rounded-xl border border-border space-y-3">
          <h3 className="font-semibold text-primary">Dados do Fornecedor</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Razão Social</p>
              <p className="font-medium">{data.fornecedor.nome}</p>
            </div>
            <div>
              <p className="text-muted-foreground">CNPJ</p>
              <p className="font-medium">{data.fornecedor.cnpj}</p>
            </div>
            {data.fornecedor.inscricaoEstadual && (
              <div>
                <p className="text-muted-foreground">Inscrição Estadual</p>
                <p className="font-medium">{data.fornecedor.inscricaoEstadual}</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-card p-5 rounded-xl border border-border space-y-3">
          <h3 className="font-semibold text-primary">Dados da Nota Fiscal</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Número / Série</p>
              <p className="font-medium">{data.notaInfo.numero} / {data.notaInfo.serie}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Data de Emissão</p>
              <p className="font-medium">
                {new Date(data.notaInfo.dataEmissao).toLocaleDateString('pt-BR')}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Valor Total</p>
              <p className="font-medium text-primary">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                  data.notaInfo.valorTotal || data.itens.reduce((s, i) => s + i.valorTotal, 0)
                )}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Chave de Acesso</p>
              <p className="font-medium text-xs break-all">{data.notaInfo.chave}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabela de Itens */}
      <div className="bg-card p-6 rounded-xl border border-border">
        {loadingProdutos ? (
          <div className="flex items-center justify-center p-10">
            <Loader2 className="w-5 h-5 animate-spin mr-2 text-muted-foreground" />
            <span className="text-muted-foreground">Carregando produtos do estoque...</span>
          </div>
        ) : (
          <ItensConferenciaTable
            itensXml={data.itens}
            produtosLocais={produtos}
            onChange={(v) => setVinculos(v)}
          />
        )}
      </div>
    </div>
  );
}
