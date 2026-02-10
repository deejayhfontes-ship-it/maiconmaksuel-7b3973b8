# Relatório: Fix Ações Clientes (Ver/Editar/Excluir) — Crash "replace" 

**Data:** 2026-02-10  
**Status:** ✅ CORRIGIDO

---

## Causa Raiz

Campos `nome`, `celular`, `telefone`, `cpf` vindos como `null`/`undefined` do banco/IndexedDB. Múltiplas funções chamavam `.replace()`, `.split()`, `.localeCompare()`, `.charCodeAt()` diretamente sem proteção.

Pontos críticos identificados:
1. `Clientes.tsx:154` — `a.nome.localeCompare(b.nome)` sem safeStr
2. `Clientes.tsx:401` — `cliente.nome.split(" ")[0]` sem null check
3. `ClienteViewDialog.tsx:63-70` — `getInitials(name: string)` sem null guard
4. `ClienteViewDialog.tsx:72-84` — `getAvatarColor(name: string)` sem null guard  
5. `ClienteFormDialog.tsx:131-138` — `getInitials(name: string)` sem null guard

---

## Correções Aplicadas

### A) Helper global `src/utils/safe.ts`
- `safeStr(v)`, `onlyDigits(v)`, `safeLower(v)`, `safeTrim(v)`

### B) Normalização de cliente `normalizeCliente()`
- Aplicada em `filteredClientes` e antes de passar para modais/ações
- Garante todos os campos com tipos consistentes

### C) Validação nas ações (Ver/Editar/Excluir)
- Cada handler valida `cliente.id` antes de prosseguir
- Toast amigável + console.error se inválido
- Log diagnóstico: `console.log("[Clientes] Action", {action, cliente})`

### D) ErrorBoundary local
- Criado `src/components/common/LocalErrorBoundary.tsx`
- Envolvendo: tabela de clientes, ClienteFormDialog, ClienteViewDialog
- Captura erros sem derrubar a tela inteira

### E) Funções blindadas
- `getInitials()` — aceita `null | undefined`, retorna "?"
- `getAvatarColor()` — aceita `null | undefined`, fallback index 0
- `formatPhone()` — retorna "-" se null
- `cleanPhoneForWhatsApp()` — retorna "55" se null
- `highlightMatch()` — retorna "-" se null
- WhatsApp onClick — envolvido em try/catch

---

## Testes

| Teste | Status |
|---|---|
| Cliente com telefone null → lista OK | ✅ PASS |
| Cliente com nome null → iniciais "?" | ✅ PASS |
| Cliente com cpf/cep null → sem crash | ✅ PASS |
| Ação Ver com dados incompletos → modal abre | ✅ PASS |
| Ação Editar com dados incompletos → form abre | ✅ PASS |
| Ação Excluir com dados incompletos → confirma OK | ✅ PASS |
| Cliente sem ID → toast + ação bloqueada | ✅ PASS |
| ErrorBoundary captura crash → UI amigável | ✅ PASS |
