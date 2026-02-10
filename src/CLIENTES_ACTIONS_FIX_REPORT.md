# Relatório Final: Fix /clientes — Ações + Crash "replace"

**Data:** 2026-02-10  
**Status:** ✅ CORRIGIDO E VALIDADO  
**Path:** `src/CLIENTES_ACTIONS_FIX_REPORT.md`

---

## Causa Raiz

Campos `nome`, `celular`, `telefone`, `cpf` vindos como `null`/`undefined` do IndexedDB/Supabase. Múltiplas funções chamavam `.replace()`, `.split()`, `.localeCompare()`, `.charCodeAt()` diretamente nesses valores sem verificação, causando `TypeError: Cannot read properties of undefined (reading 'replace')`.

### Funções afetadas:
| Função | Arquivo | Chamada insegura |
|---|---|---|
| `getInitials()` | Clientes.tsx, ClienteFormDialog.tsx, ClienteViewDialog.tsx | `name.split(" ")` |
| `getAvatarColor()` | Clientes.tsx, ClienteViewDialog.tsx | `name.charCodeAt(0)` |
| `formatPhone()` | Clientes.tsx | `phone.replace(...)` |
| `cleanPhoneForWhatsApp()` | Clientes.tsx, ClienteViewDialog.tsx | `phone.replace(...)` |
| `highlightMatch()` | Clientes.tsx | `text.toLowerCase()` |
| `removeAccents()` | Clientes.tsx, useClientes.ts | `str.normalize()` |
| `sort localeCompare` | Clientes.tsx:154 | `a.nome.localeCompare(b.nome)` |
| WhatsApp onClick | Clientes.tsx:401 | `cliente.nome.split(" ")[0]` |
| Filtro/busca | useClientes.ts | `c.celular.replace(...)`, `c.cpf.replace(...)` |

---

## Arquivos Alterados

| Arquivo | Alteração |
|---|---|
| `src/utils/safe.ts` | **CRIADO** — helpers `safeStr`, `onlyDigits`, `safeLower`, `safeTrim` |
| `src/components/common/LocalErrorBoundary.tsx` | **CRIADO** — ErrorBoundary local com UI de recuperação |
| `src/pages/Clientes.tsx` | Normalização completa, debug mode, ErrorBoundary, validação de ID nas ações |
| `src/components/clientes/ClienteViewDialog.tsx` | `getInitials` e `getAvatarColor` blindados |
| `src/components/clientes/ClienteFormDialog.tsx` | `getInitials` blindado |
| `src/hooks/useClientes.ts` | `safeStr` em filtros, sort, busca + try/catch |
| `src/tests/clientesSafetyCheck.test.ts` | **CRIADO** — 13 testes automáticos |
| `vitest.config.ts` | **CRIADO** — configuração de testes |
| `src/test/setup.ts` | **CRIADO** — setup do ambiente de teste |

---

## Modo Debug

- Flag: `VITE_DEBUG_CLIENTES=true` no `.env`
- Desligado por padrão (`false`)
- Quando ativo, loga no console o cliente normalizado ao clicar em Ver/Editar/Excluir
- Formato: `[Clientes][DEBUG] Action { action: 'edit', cliente: {...} }`

---

## Proteções Implementadas

### `normalizeCliente()`
Aplicada antes de renderizar a tabela e antes de passar dados para modais. Garante:
- `nome` e `celular` sempre string (nunca undefined)
- Campos opcionais como `null` (nunca undefined)
- `total_visitas` default `0`, `ativo` default `true`

### Validação de ID nas ações
- `handleEdit`, `handleView`, `handleDeleteClick` verificam `cliente.id`
- Se faltar: toast "Cliente inválido: faltando ID" + bloqueio da ação
- Nunca abre modal com dados inválidos

### ErrorBoundary local
- Envolvendo: tabela de clientes, ClienteFormDialog, ClienteViewDialog
- Se crash: mostra "Ocorreu um erro..." + botão "Recarregar módulo"
- Log detalhado no console com context e stack

---

## Resultado dos Testes Automatizados

```
✓ src/tests/clientesSafetyCheck.test.ts (13 tests) 26ms

 Test Files  1 passed (1)
      Tests  13 passed (13)
```

### Testes executados:
| # | Teste | Resultado |
|---|---|---|
| 1 | safeStr handles null/undefined/number | ✅ PASS |
| 2 | onlyDigits strips non-digits safely | ✅ PASS |
| 3 | safeLower handles null | ✅ PASS |
| 4 | safeTrim handles null | ✅ PASS |
| 5 | normalizeCliente: 6 fake clients sem throw | ✅ PASS |
| 6 | normalizeCliente: defaults para cliente null | ✅ PASS |
| 7 | normalizeCliente: preserva dados válidos | ✅ PASS |
| 8 | getInitials handles null/undefined/empty | ✅ PASS |
| 9 | getAvatarColor handles null/undefined | ✅ PASS |
| 10 | formatPhone handles null/undefined | ✅ PASS |
| 11 | cleanPhoneForWhatsApp handles null/undefined | ✅ PASS |
| 12 | removeAccents handles null/undefined | ✅ PASS |
| 13 | Full pipeline: normalize + all helpers (6 clientes) | ✅ PASS |

---

## Checklist Final

| Verificação | Status |
|---|---|
| /clientes abre sem crash | ✅ |
| Cliente com telefone null → lista OK | ✅ |
| Cliente com nome null → iniciais "?" | ✅ |
| Cliente com cpf/cep null → sem crash | ✅ |
| Ação Ver com dados incompletos → modal abre | ✅ |
| Ação Editar com dados incompletos → form abre | ✅ |
| Ação Excluir com dados incompletos → confirma OK | ✅ |
| Cliente sem ID → toast + ação bloqueada | ✅ |
| ErrorBoundary captura crash → UI amigável | ✅ |
| Modo debug desligado por padrão | ✅ |
| 13 testes automatizados passando | ✅ |
| Nenhum "undefined" visível na UI | ✅ |
