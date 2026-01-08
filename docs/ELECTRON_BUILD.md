# Guia: Converter para Aplicativo Desktop Windows

Este guia explica como buildar o MAICON MAKSUEL GESTÃO como aplicativo desktop Windows (.exe).

## Pré-requisitos

1. **Node.js 18+** instalado
2. **Git** instalado
3. **Conta GitHub** configurada

## Passo 1: Exportar projeto do Lovable

1. No Lovable, vá em **Settings → GitHub → Connect**
2. Autorize o Lovable no GitHub
3. Clique em **Create Repository**
4. Aguarde o repositório ser criado

## Passo 2: Clonar o projeto localmente

```bash
git clone https://github.com/SEU-USUARIO/NOME-DO-REPO.git
cd NOME-DO-REPO
```

## Passo 3: Instalar dependências do Electron

Adicione estas dependências ao `package.json`:

```json
{
  "main": "electron/main.js",
  "scripts": {
    "electron:dev": "concurrently \"npm run dev\" \"wait-on http://localhost:5173 && electron .\"",
    "electron:build": "npm run build && electron-builder",
    "electron:build:win": "npm run build && electron-builder --win --x64",
    "electron:build:portable": "npm run build && electron-builder --win portable"
  },
  "build": {
    "appId": "com.maiconmaksuel.gestao",
    "productName": "MAICON MAKSUEL GESTÃO",
    "copyright": "Copyright © 2025 Maicon Maksuel",
    "compression": "maximum",
    "directories": {
      "buildResources": "build",
      "output": "release"
    },
    "files": [
      "dist/**/*",
      "electron/**/*",
      "package.json"
    ],
    "win": {
      "target": [
        { "target": "nsis", "arch": ["x64"] },
        { "target": "portable", "arch": ["x64"] }
      ],
      "icon": "build/icon.ico"
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true,
      "createDesktopShortcut": true,
      "createStartMenuShortcut": true,
      "shortcutName": "Maicon Maksuel Gestão"
    },
    "portable": {
      "artifactName": "MaiconMaksuelGestao-Portable.exe"
    }
  },
  "devDependencies": {
    "electron": "^28.0.0",
    "electron-builder": "^24.9.1",
    "concurrently": "^8.2.2",
    "wait-on": "^7.2.0"
  },
  "dependencies": {
    "electron-updater": "^6.1.7"
  }
}
```

Depois, execute:

```bash
npm install
```

## Passo 4: Configurar Vite para Electron

Edite `vite.config.ts` e adicione `base: './'`:

```typescript
export default defineConfig({
  base: './',  // <-- IMPORTANTE: path relativo para Electron
  // ... resto da config
})
```

## Passo 5: Criar ícone da aplicação

1. Crie a pasta `build/` na raiz do projeto
2. Adicione:
   - `build/icon.png` (1024x1024 pixels)
   - `build/icon.ico` (256x256 pixels - formato ICO para Windows)

Use ferramentas como:
- https://icon.kitchen/
- https://convertico.com/

## Passo 6: Testar em modo desenvolvimento

```bash
npm run electron:dev
```

Isso abre o app no Electron conectado ao servidor de desenvolvimento.

## Passo 7: Buildar o executável

### Instalador Windows (.exe com setup):
```bash
npm run electron:build:win
```

### Versão Portátil (sem instalação):
```bash
npm run electron:build:portable
```

## Arquivos Gerados

Após o build, os arquivos estarão em `release/`:

```
release/
├── MaiconMaksuelGestao-Setup-1.0.0.exe  (Instalador)
├── MaiconMaksuelGestao-Portable.exe      (Portátil)
└── ...
```

## Atualizações Automáticas

O app já está configurado com `electron-updater`. Para ativar:

1. Crie releases no GitHub com os arquivos do build
2. O app verificará automaticamente por atualizações

## Solução de Problemas

### Erro: "electron is not defined"
- Verifique se o `preload.js` está no caminho correto

### Tela branca ao abrir
- Verifique se `base: './'` está no `vite.config.ts`
- Certifique-se de ter rodado `npm run build` antes

### Ícone não aparece
- Verifique se `build/icon.ico` existe e está no formato correto

## Suporte

Para dúvidas, entre em contato pelo sistema ou WhatsApp.
