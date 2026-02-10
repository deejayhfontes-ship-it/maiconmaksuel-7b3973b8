# DESKTOP EXE WHITE SCREEN FIX REPORT
**Versão:** 1.0.0  
**Data:** 2026-02-10  

---

## 1. Causa Raiz

### Problema Principal
O executável (.exe) carrega o app via `file://` protocol. Sem `HashRouter`, as rotas baseadas em path (ex: `/clientes`) não funcionam — o browser tenta abrir um arquivo local inexistente, resultando em tela branca.

### Agravantes
- Sem ErrorBoundary global: qualquer erro de renderização crashava o app inteiro (tela branca sem feedback).
- Erros assíncronos (promises rejeitadas) não eram capturados, causando crashes silenciosos.

---

## 2. Correções Aplicadas

### 2.1 Build (já estava correto)
| Config | Valor | Status |
|---|---|---|
| `vite.config.ts` → `base` | `"./"` | ✅ Já configurado |

### 2.2 Router (já estava correto)
| Componente | Descrição | Status |
|---|---|---|
| `desktopDetection.ts` | Detecta `file://`, `origin === null`, Electron | ✅ Já existia |
| `App.tsx` | Usa `HashRouter` quando `isDesktopWrapper()` retorna `true` | ✅ Já existia |

### 2.3 ErrorBoundary Global (NOVO)
| Arquivo | Descrição |
|---|---|
| `src/components/ErrorBoundary.tsx` | Captura erros de renderização, exibe tela de recuperação com "Voltar ao início", "Recarregar", "Copiar relatório" |
| `src/lib/globalErrorHandler.ts` | Captura `window.onerror` e `unhandledrejection`, salva em localStorage |
| `src/main.tsx` | Instala handlers globais na inicialização |
| `src/App.tsx` | Envolve toda a árvore com `<ErrorBoundary>` |

### 2.4 Diagnóstico de Erros (NOVO)
| Arquivo | Descrição |
|---|---|
| `src/components/configuracoes/AppErrorsDiagnostic.tsx` | Painel em Configurações > Sistema > Erros do App |

Funcionalidades:
- Lista últimos 50 erros (tipo, data, rota, mensagem)
- Copiar relatório completo
- Limpar logs
- Testar navegação para `/clientes`
- Informações do ambiente (protocol, origin, router type)

---

## 3. Fluxo de Proteção

```
App inicia
  → installGlobalErrorHandlers() captura window.onerror + unhandledrejection
  → <ErrorBoundary> envolve toda a árvore React
    → Erro de render → Tela de recuperação (não branca)
    → Erro async → Logado em localStorage
    → Tudo OK → App funciona normalmente
```

---

## 4. Checklist

| # | Critério | Status |
|---|---|---|
| 1 | `base: "./"` no vite.config.ts | ✅ |
| 2 | HashRouter para `file://` protocol | ✅ |
| 3 | ErrorBoundary global | ✅ |
| 4 | Captura window.onerror | ✅ |
| 5 | Captura unhandledrejection | ✅ |
| 6 | Tela de erro com "Voltar/Recarregar/Copiar" | ✅ |
| 7 | Logs em localStorage (últimos 50) | ✅ |
| 8 | Diagnóstico em Configurações | ✅ |
| 9 | Teste de navegação /clientes | ✅ |
| 10 | Rota /clientes acessível para Admin e Notebook | ✅ |

---

## 5. Status Final

### **RESULTADO: ✅ APROVADO**
