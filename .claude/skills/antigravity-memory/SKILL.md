---
name: antigravity-memory
description: >
  Use esta skill SEMPRE que o usuário pedir qualquer alteração, edição, correção,
  melhoria ou decisão técnica relacionada ao projeto do sistema de salão (antigravity).
  Isso inclui: modificar código, mudar configurações, adicionar funcionalidades,
  corrigir bugs, alterar banco de dados, modificar rotas, estilos, ou qualquer
  outra mudança no sistema. A skill garante que todas as alterações sejam registradas
  no memory.md do projeto para manter o contexto entre conversas.
---

# Skill: Antigravity Memory

## PASSO 1 — Ler o memory.md antes de qualquer coisa
Sempre leia `.claude/skills/antigravity-memory/memory.md` antes de fazer qualquer alteração.

## PASSO 2 — Fazer a alteração solicitada
Execute normalmente o que o usuário pediu.

## PASSO 3 — Registrar no memory.md
Após cada alteração, adicione uma entrada no topo do histórico:
```markdown
## [DATA] — [TÍTULO CURTO]

**O que foi feito:** Descrição clara do que mudou.
**Por quê:** Motivo da alteração.
**Arquivos afetados:**
- `caminho/arquivo.tsx` — o que mudou

**Decisões técnicas:** (se houver)
**Pendências:** (se houver)

---
```

## Regras
1. Sempre leia o memory.md PRIMEIRO
2. **OBRIGATÓRIO: Registre no memory.md APÓS CADA alteração, sem exceção**
3. Entradas mais recentes ficam no TOPO
4. Seja específico nos registros
5. **NÃO EXISTE alteração pequena demais para registrar — tudo vai no memory.md**
6. Se esqueceu de registrar algo, registre assim que perceber
