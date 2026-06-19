# ABS Resolve — Plataforma de Gestão

Plataforma web integrada para gestão de clientes, CRM, operações, pagamentos, marketplace e controle administrativo.

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 19 + Vite + Tailwind CSS 4 + TypeScript |
| Backend | Node.js + Express 5 + TypeScript |
| Banco | PostgreSQL 16 + Prisma ORM |
| Auth | JWT (access + refresh token) |
| Pagamentos | Asaas API (modo mock disponível) |
| Gráficos | Recharts |
| CRM | Kanban drag-and-drop (@hello-pangea/dnd) |

## Módulos

- **Clientes** — PF/PJ com validação CPF/CNPJ, LGPD, portal de acesso
- **CRM** — Pipeline Kanban, interações, conversão lead → cliente
- **Pedidos** — Numeração automática, fluxo visual de status
- **Ordens de Serviço** — Etapas operacionais com parceiros
- **Financeiro** — Cobranças Asaas (PIX, boleto, cartão), dashboard
- **Marketplace** — Catálogo de serviços
- **Clube de Benefícios** — Cupons, cashback, descontos
- **Portal do Cliente** — Pedidos, financeiro, documentos, solicitar serviço
- **Admin** — Usuários, parceiros, auditoria, notificações
- **Dashboard** — KPIs comerciais, operacionais e financeiros

## Início rápido

```bash
# 1. PostgreSQL
docker compose up -d

# 2. Backend
cd backend
cp .env.example .env
npm install
npx prisma migrate dev --name init
npm run db:seed
npm run dev

# 3. Frontend (outro terminal)
cd frontend
npm install
npm run dev
```

Acesse: **http://localhost:5173**

## Credenciais demo

| Perfil | Login | Senha |
|--------|-------|-------|
| Admin | admin@absresolve.com.br | admin123 |
| Comercial | comercial@absresolve.com.br | comercial123 |
| Cliente | CPF 529.982.247-25 | cliente123 |

## Estrutura

```
SISTEMA_LOVABLE/
├── frontend/          # React SPA
├── backend/           # API REST
├── docker-compose.yml # PostgreSQL
├── nginx/             # Config produção
└── scripts/           # Backup do banco
```

## API

Todas as respostas seguem: `{ success: true, data }` ou `{ success: false, error }`

Documentação completa das rotas em `backend/.env.example`.

## Produção

- Configure SSL via `nginx/nginx.conf`
- Defina `JWT_SECRET`, `JWT_REFRESH_SECRET` fortes
- Configure `ASAAS_API_KEY` para pagamentos reais
- Agende backup: `scripts/backup.ps1` ou `scripts/backup.sh`

## Segurança

- Helmet + rate limiting
- bcrypt para senhas
- Auditoria de ações (LGPD)
- Cookies httpOnly para refresh token
- Validação CPF/CNPJ antes de persistir
