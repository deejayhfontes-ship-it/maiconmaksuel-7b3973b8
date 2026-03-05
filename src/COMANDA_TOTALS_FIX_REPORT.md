# Relatório: Correção do Bug de Recálculo de Totais da Comanda

**Data:** 2026-02-08  
**Status:** ✅ CORRIGIDO  
**Modelo Escolhido:** A - Cálculo no banco (fonte da verdade)

---

## Causa Raiz

O bug ocorria porque:

1. **Página `Atendimentos.tsx`** fazia INSERT/DELETE diretamente no Supabase sem chamar recálculo
2. **Função `updateAtendimentoTotals`** apenas fazia refetch após timeout - não atualizava o banco
3. **Hook `useAtendimentos`** tinha `recalcularTotais` mas não era usado em todos os fluxos
4. **Inconsistência de fluxos**: alguns lugares usavam o hook, outros acessavam Supabase diretamente

---

## Solução Implementada

### 1. Triggers no Banco de Dados (Modelo A)

Criados 3 triggers para garantir recálculo automático:

| Trigger | Tabela | Evento | Função |
|---------|--------|--------|--------|
| `trg_recalcular_totais_servicos` | `atendimento_servicos` | INSERT/UPDATE/DELETE | `recalcular_atendimento_totais()` |
| `trg_recalcular_totais_produtos` | `atendimento_produtos` | INSERT/UPDATE/DELETE | `recalcular_atendimento_totais()` |
| `trg_recalcular_desconto` | `atendimentos` | UPDATE (desconto) | `recalcular_atendimento_ao_mudar_desconto()` |

**Lógica da função `recalcular_atendimento_totais()`:**
```sql
subtotal = SUM(atendimento_servicos.subtotal) + SUM(atendimento_produtos.subtotal)
valor_final = MAX(0, subtotal - desconto)
```

### 2. Atualização do Frontend

Arquivo `src/pages/Atendimentos.tsx` atualizado:
- Substituído `updateAtendimentoTotals()` por `refetchAtendimentoTotals()`
- Após INSERT/DELETE, apenas refetch dos dados (trigger já atualizou)
- Removido setTimeout e lógica redundante

---

## Resultados dos Testes

| Teste | Operação | Antes | Depois | Esperado | Status |
|-------|----------|-------|--------|----------|--------|
| ADD | +100 serviço | 280 | 380 | 380 | ✅ |
| REMOVE | -100 serviço | 380 | 280 | 280 | ✅ |
| DESCONTO | +30 desconto | 280 / 280 | 280 / 250 | 280 / 250 | ✅ |
| PERSISTÊNCIA | Hard reload | N/A | Valores persistidos | Persistidos | ✅ |

**Comanda de Teste:** #22 (ID: fa26cc3d-85b1-4c28-be4f-9980fc37f256)

---

## Arquivos Alterados

1. **Migração SQL** - Criação de triggers e funções
2. `src/pages/Atendimentos.tsx` - Refatoração dos handlers de ADD/REMOVE

---

## Eventos que Disparam Recálculo

- ✅ Adicionar item (serviço ou produto)
- ✅ Remover item
- ✅ Alterar quantidade/preço de item (via UPDATE no item)
- ✅ Alterar desconto da comanda
- ✅ Cancelar/soft delete de item (DELETE dispara trigger)

---

## Benefícios da Solução

1. **Única Fonte da Verdade**: Banco de dados sempre tem valores corretos
2. **Consistência**: Qualquer cliente (web, mobile, API) terá valores sincronizados
3. **Sem Race Conditions**: Trigger executa dentro da mesma transação
4. **Offline-first compatível**: Ao sincronizar, trigger recalcula automaticamente
5. **Manutenção simplificada**: Lógica centralizada no banco

---

## Notas de Segurança

Os 188 warnings de RLS são **pré-existentes** e não relacionados a esta correção.
Recomenda-se revisão futura das políticas de segurança.
