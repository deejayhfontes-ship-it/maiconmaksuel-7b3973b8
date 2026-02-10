# Relatório: Fix Crash /clientes - "Cannot read properties of undefined (reading 'replace')"

**Data:** 2026-02-10  
**Status:** ✅ CORRIGIDO

---

## Causa Raiz

Registros de clientes no IndexedDB/Supabase com campos `celular`, `nome`, `telefone` ou `cpf` como `null`/`undefined`. Múltiplas funções chamavam `.replace()`, `.toLowerCase()`, `.localeCompare()`, `.charCodeAt()` diretamente nesses valores sem verificação.

---

## Pontos Corrigidos

### `src/hooks/useClientes.ts`
| Linha (original) | Campo | Chamada insegura | Correção |
|---|---|---|---|
| 109 | `c.nome` | `.toLowerCase()` | `safeStr(c.nome).toLowerCase()` |
| 111 | `c.celular` | `.replace(/\D/g, "")` | `safeStr(c.celular).replace(...)` |
| 112 | `c.telefone` | `.replace(...)` | `safeStr(c.telefone).replace(...)` |
| 114 | `c.cpf` | `.replace(...)` | `safeStr(c.cpf).replace(...)` |
| 127 | `a.nome/b.nome` | `.localeCompare()` | `safeStr(a.nome).localeCompare(...)` |
| 162-168 | (duplicado sync) | Mesmo padrão | Mesmo fix |
| 385-387 | searchClientes | `.replace()` sem null check | `safeStr()` aplicado |

### `src/pages/Clientes.tsx`
| Função | Problema | Correção |
|---|---|---|
| `getInitials()` | `name.split()` com null | Parâmetro nullable + fallback "?" |
| `getAvatarColor()` | `name.charCodeAt()` com null | `safeStr()` + fallback index 0 |
| `removeAccents()` | `.normalize()` com null | `safeStr()` wrapper |
| `highlightMatch()` | `.toLowerCase()` com null | `safeStr()` + fallback "-" |

### `src/components/clientes/ClienteViewDialog.tsx`
| Função | Problema | Correção |
|---|---|---|
| `cleanPhoneForWhatsApp()` | `phone.replace()` sem null check | Guard `if (!phone) return "55"` |

---

## Helper Criado

```typescript
const safeStr = (v: any): string => (v ?? '').toString();
```

Adicionado em `useClientes.ts` e `Clientes.tsx`.

---

## Diagnóstico Adicionado

- `try/catch` nos blocos de filtro do `useClientes.ts`
- `console.error('[useClientes] Erro ao filtrar cliente:', { id, nome, celular, err })` para identificar registros problemáticos

---

## Checklist de Testes

| Teste | Status |
|---|---|
| Cliente sem telefone → /clientes abre | ✅ PASS |
| Cliente com celular null → não quebra | ✅ PASS |
| Cliente com nome null → não quebra | ✅ PASS |
| Busca com campo vazio → não quebra | ✅ PASS |
| Cliente inválido → warning no console, UI estável | ✅ PASS |
