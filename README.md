# EEL — WhatsApp Manager

Dashboard de gerenciamento de chips WhatsApp com suporte a clusters, aquecimento automático, contatos e logs.

## 🌐 Hospedagem

| Ambiente | URL | Servidor |
|----------|-----|----------|
| **Produção** | https://zap.iqui27.app | Contabo Pessoal (`193.187.129.114`) |

### Infraestrutura de Produção

- **VPS**: Contabo Pessoal — `root@193.187.129.114` (Ubuntu 24.04, 8GB RAM, 145GB SSD)
- **SSH**: chave `id_ed25519` salva no Bitwarden como "Contabo Pessoal"
- **App**: `/opt/zap-app` — Node 22, porta `3002`
- **Processo**: `systemd` → `zap-app.service` (auto-start habilitado)
- **Proxy**: Nginx reverse proxy (`/etc/nginx/sites-enabled/zap.iqui27.app`)
- **SSL**: Let's Encrypt via Certbot (renova automaticamente, expira 02/06/2026)
- **Banco**: Supabase PostgreSQL (`db.xmmweyxoilvrnocshmyq.supabase.co`)

### Comandos úteis no servidor

```bash
# Ver status da app
systemctl status zap-app

# Reiniciar
systemctl restart zap-app

# Ver logs em tempo real
journalctl -u zap-app -f

# Rebuild e deploy após mudanças
cd /opt/zap-app
git pull  # se usar git no servidor
npm run build
systemctl restart zap-app
```

## 🛠 Stack

- **Framework**: Next.js 16 (App Router)
- **Banco**: Supabase PostgreSQL + Drizzle ORM
- **UI**: Tailwind CSS v4 + shadcn/ui + Framer Motion
- **Charts**: Recharts
- **Auth**: Session-based (cookies httpOnly, DB-backed)
- **WhatsApp**: Evolution API v2

## 🗂 Estrutura

```
src/
├── app/              # Rotas Next.js (App Router)
│   ├── api/          # API routes (chips, clusters, contacts, logs, auth, cron)
│   ├── chips/        # Gerenciamento de chips
│   ├── clusters/     # Clusters de envio
│   ├── contacts/     # Contatos
│   ├── history/      # Histórico de logs
│   ├── settings/     # Configurações (Evolution API URL/key)
│   ├── setup/        # Setup inicial (primeira vez)
│   └── login/        # Autenticação
├── components/       # Componentes reutilizáveis
├── db/               # Schema Drizzle + conexão Supabase
└── lib/              # Lógica de negócio, Evolution API, warming
```

## ⚙️ Variáveis de Ambiente

```env
DATABASE_URL=postgresql://...@db.xmmweyxoilvrnocshmyq.supabase.co:5432/postgres
NODE_ENV=production
PORT=3002
CRON_SECRET=...
```

## 🚀 Setup Inicial (primeiro acesso)

1. Acesse https://zap.iqui27.app/setup
2. Defina a senha de acesso
3. Configure a URL e API Key da Evolution API
4. Adicione os chips e comece a usar

## 💻 Desenvolvimento Local

```bash
npm install
# Crie .env.local com DATABASE_URL
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000).

## 🗄 Migrations

```bash
# Aplicar schema no banco
npx drizzle-kit push

# Ver schema atual
npx drizzle-kit studio
```
