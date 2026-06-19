import { useState, useEffect } from "react";
import { ArrowLeft, Save, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NfeParseResult } from "../types/nfe.types";
import { useProdutos } from "@/hooks/useProdutos";
import { ItensConferenciaTable, VinculoItem } from "./ItensConferenciaTable";

interface ConferenciaPageProps {
  data: NfeParseResult;
  onCancel: () => void;
  onSuccess: () => void;
}

export function ConferenciaPage({ data, onCancel, onSuccess }: ConferenciaPageProps) {
  const { produtos, loading: loadingProdutos } = useProdutos();
  const [vinculos, setVinculos] = useState<Record<string, VinculoItem>>({});
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header da Conferência */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card p-4 rounded-xl border border-border">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onCancel} className="h-10 w-10 shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="text-xl font-bold tracking-tight">Conferência de Entrada</h2>
            <p className="text-sm text-muted-foreground">
              Verifique os itens da nota fiscal e associe ao seu estoque
            </p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button className="bg-primary text-primary-foreground">
            <Save className="w-4 h-4 mr-2" />
            Confirmar Entrada
          </Button>
        </div>
      </div>

      {/* Grid Superior: Fornecedor e Info da Nota */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card do Fornecedor */}
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

        {/* Card da Nota */}
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
            <div className="col-span-2">
              <p className="text-muted-foreground">Chave de Acesso</p>
              <p className="font-medium text-xs break-all">{data.notaInfo.chave}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabela de Itens e Duplicatas */}
      <div className="bg-card p-6 rounded-xl border border-border">
        {loadingProdutos ? (
          <div className="flex items-center justify-center p-10">
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
