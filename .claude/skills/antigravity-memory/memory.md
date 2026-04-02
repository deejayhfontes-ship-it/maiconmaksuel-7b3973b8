# 🧠 Memory — Sistema de Salão (Antigravity)

**Stack:** TypeScript + Vite + Tailwind CSS + Electron
**Deploy:** Vercel
**Banco:** SQL (tabelas/ + sql_criar_api_keys.sql)
**WhatsApp:** workflow-whatsapp-confirmacao.json
**Status:** ✅ Ativo em produção

---

## Módulos conhecidos
- [ ] Agendamentos
- [ ] Clientes (`ClienteViewDialog.tsx` — aba Histórico implementada)
- [ ] Financeiro / Caixa
- [ ] Funcionários / Comissões
- [ ] API Keys / Autenticação
- [ ] Integração WhatsApp

---

## Histórico de alterações

## 2026-04-01 — Ajuste de Horário da Agenda (07h às 20h)

**O que foi feito:** Ajustado o range de horários da agenda visual de `08:00–20:00` para `07:00–20:00`.
**Arquivos alterados:**
- `src/pages/Agenda.tsx` — `timeSlots[]` agora começa em `07:00`
- `src/components/agenda/AgendamentoFormDialog.tsx` — `horarios[]` começa em `07:00`, inclui `20:00`, e validação atualizada para `h < 7 || h > 20`

---

## 2026-04-02 — Correção: Nome da cliente não aparecia no histórico do caixa

**O que foi feito:** Ao fechar uma comanda, a `descricao` gravada na tabela `caixa_movimentacoes` não incluía o nome da cliente — mostrava apenas o número da comanda e a forma de pagamento. Corrigido nos dois pontos onde o registro é feito.
**Por quê:** O usuário via apenas o nome da funcionária (via outra coluna) e não o da cliente na movimentação.
**Arquivos alterados:**
- `src/hooks/useAtendimentos.ts` linha 746 — `clientes.find(c => c.id === current.cliente_id)?.nome || 'Cliente avulso'`
- `src/pages/Atendimentos.tsx` linha 478 — `selectedAtendimento.cliente?.nome || 'Cliente avulso'`

**Formato da descrição agora:** `Comanda #001 - Amanda Silva - pix`

---

## 2026-04-02 — Correção: Botão "+" Cadastrar Cliente na Agenda

**O que foi feito:** Botão `+` no `AgendamentoFormDialog.tsx` estava sem `onClick` (desativado). Implementado modal de cadastro rápido: abre direto no form, pede nome+telefone, salva no Supabase e seleciona automaticamente.
**Arquivo:** `src/components/agenda/AgendamentoFormDialog.tsx`
- Estados: `isNovoClienteOpen`, `novoClienteNome`, `novoClienteCelular`, `savingCliente`
- Função `handleNovoClienteSubmit` + modal `<Dialog>` em fragmento `<>`

---

## 2026-04-02 — Correção: Comanda não localizava cliente ao trocar

**O que foi feito:** `ClienteSelector.tsx` — ao trocar cliente na comanda, não localizava se o cliente não estava nas listas locais. Corrigido com `useEffect` que faz fetch direto no Supabase pelo `id`.
**Arquivo:** `src/components/atendimentos/ClienteSelector.tsx`
- Estado `clienteAtualFromServer` + fetch automático quando não achado localmente

---


## 2026-03-30 — Correção dos Workflows N8N (data_hora)

**O que foi feito:** Corrigidos 2 dos 3 workflows no n8n do Hostgator que usavam campos `data` e `hora` separados — a tabela `agendamentos` usa `data_hora` (datetime único).
**Por quê:** Os workflows pararam de funcionar após migração do banco. O campo antigo `data` não existe mais na tabela atual.
**Workflows corrigidos:**
- `RZLEew5BlAhhFmlg` — Lembretes Automaticos: select, filtros e código JS atualizados
- `lFY3NsyE1dWzmvq6` — Avaliacao Pos-Atendimento: select e filtros atualizados
- `tcb575OhvvXqagsQ` — Chatbot Confirmação: já estava correto (usa `data_hora`)

**N8N:** `https://n8n.srv1479281.hstgr.cloud` (Hostgator)
**Scripts gerados:** `corrigir_n8n_data_hora.py`, `inspecionar_n8n.py`, `corrigir_n8n_supabase.py`
**Status:** Todos os 3 workflows ativos e apontando para Supabase correto (`hhzvjsrsoyhjzeiuxpep`)

---

## 2026-03-30 — Setup inicial do memory.md

**O que foi feito:** Criado sistema de memória para rastrear alterações.
**Por quê:** Manter contexto entre sessões do Claude Code.
**Pendências:**
- Confirmar stack completa
- Mapear todos os módulos existentes

---
