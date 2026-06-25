import { useState } from "react";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NfeParseResult, NfeItem } from "../types/nfe.types";
import { toast } from "sonner";

interface EntradaManualFormProps {
  onSubmit: (data: NfeParseResult) => void;
  onCancel: () => void;
}

const emptyItem = (): NfeItem => ({
  codigo: "",
  descricao: "",
  ncm: "",
  cfop: "1102",
  unidade: "UN",
  quantidade: 1,
  valorUnitario: 0,
  valorTotal: 0,
});

export function EntradaManualForm({ onSubmit, onCancel }: EntradaManualFormProps) {
  const [fornecedor, setFornecedor] = useState({
    nome: "",
    cnpj: "",
    inscricaoEstadual: "",
  });

  const [nota, setNota] = useState({
    numero: "",
    serie: "1",
    dataEmissao: new Date().toISOString().split("T")[0],
    chave: "",
  });

  const [itens, setItens] = useState<NfeItem[]>([emptyItem()]);
  const [submitting, setSubmitting] = useState(false);

  const addItem = () => setItens([...itens, emptyItem()]);

  const removeItem = (index: number) => {
    if (itens.length <= 1) return;
    setItens(itens.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof NfeItem, value: string | number) => {
    const updated = [...itens];
    updated[index] = { ...updated[index], [field]: value };

    if (field === "quantidade" || field === "valorUnitario") {
      const qty = field === "quantidade" ? Number(value) : updated[index].quantidade;
      const price = field === "valorUnitario" ? Number(value) : updated[index].valorUnitario;
      updated[index].valorTotal = Math.round(qty * price * 100) / 100;
    }

    setItens(updated);
  };

  const valorTotal = itens.reduce((sum, item) => sum + item.valorTotal, 0);

  const handleSubmit = () => {
    if (!fornecedor.nome.trim()) {
      toast.error("Informe o nome/razão social do fornecedor.");
      return;
    }
    if (!fornecedor.cnpj.trim()) {
      toast.error("Informe o CNPJ/CPF do fornecedor.");
      return;
    }
    if (!nota.numero.trim()) {
      toast.error("Informe o número da nota fiscal.");
      return;
    }
    if (itens.length === 0 || itens.every(i => !i.descricao.trim())) {
      toast.error("Adicione pelo menos um item com descrição.");
      return;
    }

    const validItens = itens
      .filter(i => i.descricao.trim())
      .map((item, idx) => ({
        ...item,
        codigo: item.codigo || `MANUAL-${idx + 1}`,
      }));

    const result: NfeParseResult = {
      fornecedor: {
        nome: fornecedor.nome.trim(),
        cnpj: fornecedor.cnpj.replace(/\D/g, ""),
        inscricaoEstadual: fornecedor.inscricaoEstadual.trim() || undefined,
      },
      notaInfo: {
        numero: nota.numero.trim(),
        serie: nota.serie.trim() || "1",
        dataEmissao: nota.dataEmissao,
        chave: nota.chave.trim() || `MANUAL-${Date.now()}`,
        valorTotal,
      },
      itens: validItens,
    };

    onSubmit(result);
  };

  return (
    <div className="space-y-6">
      {/* Fornecedor */}
      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold text-primary">Dados do Fornecedor</legend>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2">
            <Label htmlFor="forn-nome">Razão Social / Nome *</Label>
            <Input
              id="forn-nome"
              placeholder="Ex: Distribuidora XYZ Ltda"
              value={fornecedor.nome}
              onChange={(e) => setFornecedor({ ...fornecedor, nome: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="forn-cnpj">CNPJ / CPF *</Label>
            <Input
              id="forn-cnpj"
              placeholder="00.000.000/0000-00"
              value={fornecedor.cnpj}
              onChange={(e) => setFornecedor({ ...fornecedor, cnpj: e.target.value })}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <Label htmlFor="forn-ie">Inscrição Estadual</Label>
            <Input
              id="forn-ie"
              placeholder="Opcional"
              value={fornecedor.inscricaoEstadual}
              onChange={(e) => setFornecedor({ ...fornecedor, inscricaoEstadual: e.target.value })}
            />
          </div>
        </div>
      </fieldset>

      {/* Nota */}
      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold text-primary">Dados da Nota Fiscal</legend>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <Label htmlFor="nota-num">Número *</Label>
            <Input
              id="nota-num"
              placeholder="12345"
              value={nota.numero}
              onChange={(e) => setNota({ ...nota, numero: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="nota-serie">Série</Label>
            <Input
              id="nota-serie"
              placeholder="1"
              value={nota.serie}
              onChange={(e) => setNota({ ...nota, serie: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="nota-data">Data Emissão *</Label>
            <Input
              id="nota-data"
              type="date"
              value={nota.dataEmissao}
              onChange={(e) => setNota({ ...nota, dataEmissao: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="nota-chave">Chave de Acesso</Label>
            <Input
              id="nota-chave"
              placeholder="Opcional — 44 dígitos"
              value={nota.chave}
              onChange={(e) => setNota({ ...nota, chave: e.target.value })}
            />
          </div>
        </div>
      </fieldset>

      {/* Itens */}
      <fieldset className="space-y-3">
        <div className="flex items-center justify-between">
          <legend className="text-sm font-semibold text-primary">
            Itens ({itens.length})
          </legend>
          <Button type="button" variant="outline" size="sm" onClick={addItem}>
            <Plus className="w-3 h-3 mr-1" />
            Adicionar Item
          </Button>
        </div>

        <div className="space-y-2">
          {itens.map((item, idx) => (
            <div
              key={idx}
              className="grid grid-cols-12 gap-2 items-end bg-card/50 p-3 rounded-lg border border-border"
            >
              <div className="col-span-12 md:col-span-4">
                <Label className="text-xs">Descrição *</Label>
                <Input
                  placeholder="Nome do produto"
                  value={item.descricao}
                  onChange={(e) => updateItem(idx, "descricao", e.target.value)}
                />
              </div>
              <div className="col-span-4 md:col-span-1">
                <Label className="text-xs">Unid.</Label>
                <Input
                  placeholder="UN"
                  value={item.unidade}
                  onChange={(e) => updateItem(idx, "unidade", e.target.value)}
                />
              </div>
              <div className="col-span-4 md:col-span-2">
                <Label className="text-xs">Quantidade</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={item.quantidade}
                  onChange={(e) => updateItem(idx, "quantidade", parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="col-span-4 md:col-span-2">
                <Label className="text-xs">Valor Unit. (R$)</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={item.valorUnitario}
                  onChange={(e) => updateItem(idx, "valorUnitario", parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="col-span-8 md:col-span-2">
                <Label className="text-xs">Total</Label>
                <Input
                  readOnly
                  value={`R$ ${item.valorTotal.toFixed(2)}`}
                  className="bg-muted"
                />
              </div>
              <div className="col-span-4 md:col-span-1 flex justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-destructive hover:text-destructive"
                  disabled={itens.length <= 1}
                  onClick={() => removeItem(idx)}
                  aria-label="Remover item"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </fieldset>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-border pt-4">
        <div className="text-sm font-semibold">
          Total: <span className="text-primary text-lg">R$ {valorTotal.toFixed(2)}</span>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Avançar para Conferência
          </Button>
        </div>
      </div>
    </div>
  );
}
