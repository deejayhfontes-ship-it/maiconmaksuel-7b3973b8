# KIOSK 404 FIX REPORT

**Data:** 2026-02-10  
**Versão:** 1.0.0  
**Status Final:** ✅ CORRIGIDO

---

## 📋 CAUSAS RAIZ IDENTIFICADAS

### 1. DEFAULT_ROUTES.kiosk apontava para `/caixa` ❌
- **Arquivo:** `src/contexts/PinAuthContext.tsx` (linha 124)
- **Problema:** Ao logar com PIN de kiosk, o sistema redirecionava para `/caixa`, que não é uma rota do KioskLayout. O resultado era um 404 ou "Acesso Negado".
- **Correção:** Alterado `DEFAULT_ROUTES.kiosk` de `'/caixa'` para `'/kiosk'`.

### 2. Rotas fantasma em ROUTE_PERMISSIONS (admin) ❌
- **Arquivo:** `src/contexts/PinAuthContext.tsx` (linhas 85-88)
- **Problema:** As permissões do admin incluíam rotas inexistentes no Router: `/kiosk/caixa`, `/kiosk/caixa/comandas`, `/kiosk/agenda`, `/kiosk/espelho-cliente`. Isso poluía o RouteHealthCheck e causava confusão.
- **Correção:** Removidas as rotas inexistentes. Admin mantém acesso a `/kiosk` e `/kiosk/ponto` (que existem no Router).

### 3. Falta de SPA rewrite para deploys web ❌
- **Problema:** Sem `vercel.json`, acessar `/kiosk` diretamente no navegador (deep link) retornava 404 do servidor, pois o servidor não sabia redirecionar para `index.html`.
- **Correção:** Criado `vercel.json` com rewrite `"/(.*)" → "/"`.

### 4. BrowserRouter quebra em executável desktop (file://) ❌
- **Arquivo:** `src/App.tsx`
- **Problema:** O `BrowserRouter` depende do History API que não funciona em `file://` protocol (Electron/webview sem server). Rotas como `/kiosk` resultam em 404.
- **Correção:** Implementado router híbrido:
  - Web: `BrowserRouter` (padrão)
  - Desktop wrapper (`file://`, Electron): `HashRouter` (rotas via `/#/kiosk`)
  - Detecção automática via `src/lib/desktopDetection.ts`

### 5. Label do botão "Voltar" no ProtectedRoute ❌
- **Arquivo:** `src/components/auth/ProtectedRoute.tsx` (linha 58)
- **Problema:** Para perfil kiosk, o botão dizia "Voltar para Caixa" em vez de "Kiosk".
- **Correção:** Atualizado para "Voltar para Kiosk".

---

## 📁 ARQUIVOS ALTERADOS

| Arquivo | Alteração |
|---------|-----------|
| `src/contexts/PinAuthContext.tsx` | DEFAULT_ROUTES.kiosk → `/kiosk`; removidas rotas fantasma |
| `src/App.tsx` | Router híbrido (BrowserRouter/HashRouter) |
| `src/lib/desktopDetection.ts` | **Novo** — detecção de desktop wrapper |
| `src/components/auth/ProtectedRoute.tsx` | Label do botão corrigido |
| `vercel.json` | **Novo** — SPA rewrite |

---

## 🧪 COMO TESTAR

### Web (Lovable / Vercel)
1. Acessar `/kiosk` diretamente no navegador → deve abrir o KioskHome
2. Logar com PIN kiosk (9999) → deve redirecionar para `/kiosk`
3. Acessar `/kiosk/ponto` → deve abrir Ponto Eletrônico

### Desktop (Electron / .exe)
1. Abrir o executável → rotas usam HashRouter automaticamente
2. `/#/kiosk` → deve abrir KioskHome
3. `/#/kiosk/ponto` → deve abrir Ponto Eletrônico
4. `/#/login` → deve abrir tela de login

---

## ✅ CHECKLIST FINAL

| Item | Status |
|------|--------|
| Rota `/kiosk` existe no Router | ✅ OK |
| Rota `/kiosk/ponto` existe no Router | ✅ OK |
| DEFAULT_ROUTES.kiosk aponta para `/kiosk` | ✅ OK |
| ROUTE_PERMISSIONS sem rotas fantasma | ✅ OK |
| vercel.json com SPA rewrite | ✅ OK |
| Router híbrido para desktop | ✅ OK |
| Detecção automática file:///Electron | ✅ OK |
| Label ProtectedRoute corrigido | ✅ OK |
| Kiosk NÃO tem acesso a caixa completo | ✅ OK |
| Sem loops de requests | ✅ OK |

---

**Status:** ✅ APROVADO — Kiosk deve funcionar tanto na web quanto no executável.
