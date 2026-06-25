// Shape usada pela ConferenciaPage / ItensConferenciaTable (frontend)
export interface NfeItem {
  codigo: string;
  descricao: string;
  ncm: string;
  cfop: string;
  unidade: string;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
  ean?: string;
}

export interface NfeParseResult {
  fornecedor: {
    nome: string;
    cnpj: string;
    inscricaoEstadual?: string;
  };
  notaInfo: {
    numero: string;
    serie: string;
    dataEmissao: string;
    chave: string;
    valorTotal?: number;
  };
  itens: NfeItem[];
  duplicatas?: DuplicataParse[];
}

// Shape usada pela Edge Function / RPC (backend)
export interface FornecedorParse {
  tipo_pessoa: "PJ" | "PF";
  documento: string;
  razao_social: string;
  nome_fantasia: string;
  inscricao_estadual: string;
  endereco_logradouro: string;
  endereco_numero: string;
  endereco_bairro: string;
  endereco_municipio: string;
  endereco_uf: string;
  endereco_cep: string;
}

export interface NotaParse {
  chave_acesso: string;
  numero: number;
  serie: number;
  modelo: string;
  natureza_operacao: string;
  data_emissao: string;
  valor_produtos: number;
  valor_desconto: number;
  valor_frete: number;
  valor_outros: number;
  valor_total: number;
  protocolo: string;
  dados_brutos: any;
  xml_storage_path?: string;
}

export interface ItemParse {
  numero_item: number;
  codigo_fornecedor: string;
  ean: string;
  descricao: string;
  ncm: string;
  cfop: string;
  unidade_comercial: string;
  quantidade_comercial: number;
  valor_unitario_comercial: number;
  valor_total_item: number;
  desconto_item: number;
  custo_unitario_calculado: number;
  fator_conversao: number;
  produto_id?: string; // Preenchido no client após o match manual ou automático
}

export interface DuplicataParse {
  numero_dup: string;
  vencimento: string;
  valor: number;
}

export interface ImportNfeResponse {
  success: boolean;
  destinatario_documento: string;
  fornecedor: FornecedorParse;
  nota: NotaParse;
  itens: ItemParse[];
  duplicatas: DuplicataParse[];
  error?: string;
  codigo_erro?: string;
}

// O payload exato esperado pela RPC `processar_entrada_nfe`
export interface ProcessarEntradaPayload {
  salao_id: string;
  fornecedor: FornecedorParse;
  nota: NotaParse;
  itens: ItemParse[];
  duplicatas: DuplicataParse[];
}
