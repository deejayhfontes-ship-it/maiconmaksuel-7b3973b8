// Identidade do salão para o módulo de compras (entrada de NF).
//
// Este app é single-tenant e roda com a chave anônima do Supabase — NÃO há
// login de usuário (auth.getUser() sempre retorna null). As tabelas de compras
// (fornecedores, notas_fiscais_entrada, etc) exigem uma coluna salao_id NOT NULL,
// mas ela não tem FK: qualquer UUID estável serve como identificador do tenant.
//
// Usamos um valor fixo (sobrescrevível por env em deploys futuros multi-tenant).
export const SALAO_ID: string =
  (import.meta.env.VITE_SALAO_ID as string | undefined) ||
  "11111111-1111-1111-1111-111111111111";
