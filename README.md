# ABS Resolve Já — v2.0

Plataforma completa de serviços residenciais elétricos. O cliente escolhe o problema, recebe orçamento (IA ou preço fixo), agenda, paga e recebe atendimento — **sem contato humano**.

> **Chamou. ConfioU. Resolveu.**

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 19 + Vite + Tailwind CSS 4 + TypeScript |
| Backend | Node.js + Express 5 + TypeScript |
| Banco | PostgreSQL (Supabase) + Prisma ORM |
| Storage | Supabase Storage / local |
| IA | OpenAI Vision (gpt-4o-mini) |
| Pagamentos | Asaas (PIX, boleto, cartão) |

## Identidade Visual

| Cor | HEX | Uso |
|-----|-----|-----|
| Azul Principal | `#0033B5` | Textos, links, sidebar hover |
| Azul Escuro | `#00288F` | Sidebar, rodapé |
| Amarelo Principal | `#F7C400` | Botões CTA |
| Amarelo Claro | `#FFD633` | Hover CTA |
| Cinza Claro | `#E8E8E8` | Bordas, divisórias |

## Módulos

### Cliente (portal)
- Cadastro **obrigatório** (`/cadastro`)
- Fluxo automatizado (`/cliente/agendar`): Tipo A (preço fixo) e Tipo B (IA + fotos)
- Upload real de fotos + análise OpenAI Vision
- Upsells, Express (+R$29), horários com escassez
- Pagamento PIX/Boleto/Cartão

### Operação
- Ordens de serviço com **checklist obrigatório** (foto antes/depois, materiais, assinatura)
- Garantia automática + campanha CRM pós-serviço
- Estoque com reserva/baixa automática
- Capacidade operacional por pontos/técnico

### Gestão
- Dashboard executivo: faturamento diário/mensal, lucro estimado, margem por serviço
- CRM Kanban + campanhas automáticas (ex.: revisão chuveiro em 6 meses)
- Cancelamento (< 2h = taxa) e ausência (1ª grátis, 2ª = taxa)
- Notificações automáticas em todo o fluxo

## Início rápido

### 1. Supabase
- Crie projeto PostgreSQL + bucket `documentos`
- Copie connection string e API keys

### 2. Backend

```bash
cd backend
cp .env.example .env
npm install
npx prisma migrate deploy
npm run db:seed
npm run dev
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Acesse: **http://localhost:5173**

## Variáveis importantes

```env
# backend/.env
DATABASE_URL="postgresql://..."
SUPABASE_URL="https://xxx.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="..."
OPENAI_API_KEY="sk-..."          # IA real; sem key usa simulação
OPENAI_MODEL="gpt-4o-mini"
JWT_SECRET="..."
ASAAS_API_KEY=""                 # vazio = modo mock
```

## Credenciais demo

| Perfil | Login | Senha |
|--------|-------|-------|
| Admin | admin@absresolve.com.br | admin123 |
| Comercial | comercial@absresolve.com.br | comercial123 |
| Cliente | CPF 529.982.247-25 | cliente123 |

## Fluxo do cliente

```
Cadastro → Escolhe serviço → [Tipo A: opções | Tipo B: fotos + IA]
→ Orçamento → Upsells → Horário → Pagamento → OS criada → Técnico agendado
```

## Integração Lovable

Adicione botão no header do app Lovable apontando para a URL deste sistema (`/cadastro` ou `/login`).

## Campanhas CRM

Campanhas são agendadas automaticamente após serviços (chuveiro, ar-condicionado, etc.).

Processar pendentes: **Admin → Campanhas CRM → Processar Campanhas**

Ou via API: `POST /admin/campanhas/processar`

## Versão

**2.0.0** — Versão final MVP ABS Resolve Já
