# EEL — Deploy Automation

## Como Funciona

```
Push na main → GitHub Actions (lint + typecheck + build) → SSH no Contabo → deploy.sh → PM2 restart
```

```
Developer                GitHub Actions                         Contabo (193.187.129.114)
   │                          │                                           │
   ├── git push main ────────►│                                           │
   │                          ├── npm ci + lint + typecheck + build        │
   │                          ├── SSH connect ────────────────────────────►│
   │                          │                                           ├── git fetch + reset
   │                          │                                           ├── npm ci
   │                          │                                           ├── npm run build
   │                          │                                           ├── pm2 restart zap-eel
   │                          │◄── exit code ─────────────────────────────┤
   │                          │                                           │
   │  ✅ ou ❌ no Actions tab │                                           │
```

**Segurança:** Se `lint`, `typecheck` ou `build` falharem no GitHub Actions, o SSH nem começa. Se o build falhar no servidor, o PM2 **NÃO é reiniciado** e a app continua rodando na versão anterior.

---

## Setup (primeira vez)

### 1. Pegar a chave SSH

- Abrir **Bitwarden** → buscar **"Contabo Pessoal"**
- Copiar o conteúdo da chave privada SSH (inclui `-----BEGIN ... -----END`)

### 2. Adicionar GitHub Secrets

Ir para: https://github.com/iqui27/eel-whatsapp-manager/settings/secrets/actions

Adicionar 3 secrets:

| Secret | Valor |
|--------|-------|
| `CONTABO_HOST` | `193.187.129.114` |
| `CONTABO_USER` | `root` |
| `CONTABO_SSH_KEY` | Conteúdo completo da chave privada SSH |

### 3. Sincronizar scripts no servidor

```bash
# Do seu Mac, na raiz do projeto:
scp scripts/deploy.sh scripts/rollback.sh root@193.187.129.114:/opt/zap-app/scripts/
ssh root@193.187.129.114 "chmod +x /opt/zap-app/scripts/deploy.sh /opt/zap-app/scripts/rollback.sh"
```

### 4. Testar

```bash
# Merge na main e push:
git checkout main && git merge deploy-automation && git push origin main

# Acompanhar: https://github.com/iqui27/eel-whatsapp-manager/actions
```

---

## Deploy Manual (via GitHub UI)

1. Ir para https://github.com/iqui27/eel-whatsapp-manager/actions
2. Clicar em **"Deploy to Production"** (sidebar esquerda)
3. Clicar **"Run workflow"** → **"Run workflow"**

---

## Rollback

Se algo der errado após o deploy:

```bash
ssh root@193.187.129.114 "/opt/zap-app/scripts/rollback.sh"
```

Isso restaura o build anterior (`.next.bak`) e reinicia o PM2. Instantâneo, sem rebuild.

---

## Troubleshooting

### "Permission denied (publickey)"
- A chave SSH no secret `CONTABO_SSH_KEY` precisa incluir as linhas `-----BEGIN` e `-----END`
- Verificar se é a chave **privada** (não a pública)

### "pm2: command not found"
O `deploy.sh` já tenta carregar o nvm automaticamente. Se ainda falhar:
```bash
ssh root@193.187.129.114 "which pm2 && pm2 -v"
```
Se pm2 não existir: `npm install -g pm2`

### Build falha com "JavaScript heap out of memory"
O servidor tem 8GB RAM. Se necessário:
```bash
ssh root@193.187.129.114 "echo 'export NODE_OPTIONS=--max-old-space-size=4096' >> /root/.bashrc"
```

### Workflow falha no step "Deploy via SSH" sem mensagem clara
- Verificar se a porta 22 está aberta: `ssh -v root@193.187.129.114`
- Verificar se o firewall do Contabo não bloqueou o IP do GitHub Actions

### App não responde após deploy
```bash
ssh root@193.187.129.114 "pm2 logs zap-eel --lines 50"
```

---

## Referências

| Item | Valor |
|------|-------|
| Servidor | `root@193.187.129.114` (Ubuntu 24.04, 8GB RAM) |
| App dir | `/opt/zap-app` |
| PM2 app | `zap-eel` |
| Porta | `3002` |
| URL | https://zap.iqui27.app |
| Repo | https://github.com/iqui27/eel-whatsapp-manager |
| Nginx | Reverse proxy → localhost:3002 + Let's Encrypt |
| DB | Supabase PostgreSQL (externo) |
