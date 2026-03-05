# KIOSK LAUNCHER AND DEEP LINK REPORT
**Versão:** 1.0.0  
**Data:** 2026-02-10  

---

## 1. Funcionalidades Implementadas

### 1.1 Deep Link / Start Mode
O app agora suporta inicialização direta por parâmetro de URL:

| Parâmetro | Resultado |
|---|---|
| `?mode=kiosk` | Abre direto em `/kiosk` |
| `?mode=admin` | Abre direto em `/dashboard` |
| `#/kiosk` (HashRouter) | Abre Kiosk no EXE |

**Arquivo:** `src/lib/startMode.ts`

### 1.2 Kiosk Launcher
Painel em **Configurações > Modo Kiosk > Abrir Kiosk** com:

- **Abrir Kiosk nesta tela** → `navigate("/kiosk")`
- **Abrir Kiosk em nova janela** → `window.open` (ou API desktop se disponível)
- **Abrir Kiosk em tela cheia** → navega + `requestFullscreen()`
- **Links copiáveis:**
  - Link público web
  - Deep link `?mode=kiosk`
  - Hash link para EXE: `index.html#/kiosk`
- Exibe informações do ambiente atual (protocol, router type)

**Arquivo:** `src/components/configuracoes/kiosk/KioskLauncher.tsx`

### 1.3 Lembrar Última Tela
Configurável em **Configurações > Geral > Preferências**:

- Checkbox "Lembrar última tela ao reiniciar"
- Salva separadamente para Admin e Kiosk
- Ao reabrir, restaura a última rota visitada
- Não salva rotas de autenticação (/login, /cadastro)

**Arquivos:**
- `src/lib/startMode.ts` — lógica de persistência
- `src/hooks/useLastRoute.ts` — hook que salva a rota atual
- `src/components/layout/MainLayout.tsx` — usa o hook
- `src/components/layout/KioskLayout.tsx` — usa o hook

### 1.4 Router Compatível
Já existente e confirmado funcional:

| Ambiente | Router | Detecção |
|---|---|---|
| Web (https) | BrowserRouter | Padrão |
| Desktop (file://) | HashRouter | `isDesktopWrapper()` |
| Electron | HashRouter | `window.electron?.isElectron` |

---

## 2. Arquivos Criados/Alterados

| Arquivo | Ação |
|---|---|
| `src/lib/startMode.ts` | **Criado** — deep link + last route |
| `src/hooks/useLastRoute.ts` | **Criado** — persiste rota atual |
| `src/components/configuracoes/kiosk/KioskLauncher.tsx` | **Criado** — painel de lançamento |
| `src/components/configuracoes/kiosk/KioskModeSettings.tsx` | **Alterado** — nova aba "Abrir Kiosk" |
| `src/components/layout/MainLayout.tsx` | **Alterado** — `useLastRoute()` |
| `src/components/layout/KioskLayout.tsx` | **Alterado** — `useLastRoute()` |
| `src/App.tsx` | **Alterado** — rota `/` usa `getStartRoute()` |
| `src/pages/Configuracoes.tsx` | **Alterado** — toggle "Lembrar última tela" |

---

## 3. Como Usar no EXE

### Abrir Kiosk direto
Configure o atalho do EXE com argumento:
```
MeuApp.exe -- --url="index.html#/kiosk"
```
Ou configure o Electron `main.js` para carregar:
```js
mainWindow.loadFile('dist/index.html', { hash: '/kiosk' });
```

### Abrir Admin direto
```
index.html?mode=admin
```

---

## 4. Checklist

| # | Critério | Status |
|---|---|---|
| 1 | Deep link `?mode=kiosk` funciona | ✅ |
| 2 | Hash `#/kiosk` funciona | ✅ |
| 3 | Launcher com 3 modos de abertura | ✅ |
| 4 | Links copiáveis (web, deep, hash) | ✅ |
| 5 | "Lembrar última tela" toggle funcional | ✅ |
| 6 | Última rota salva separadamente (admin/kiosk) | ✅ |
| 7 | Rotas de auth não são salvas | ✅ |
| 8 | HashRouter ativo para file:// | ✅ |
| 9 | Não quebra funcionalidades existentes | ✅ |

---

## 5. Status Final

### **RESULTADO: ✅ APROVADO**
