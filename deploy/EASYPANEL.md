# Deploy ABS Resolve no EasyPanel

Guia completo para subir o sistema em produção. O repositório já inclui `docker-compose.yml`, Dockerfiles e variáveis prontas.

## Pré-requisitos

| Item | Status |
|------|--------|
| VPS com [EasyPanel](https://easypanel.io) | Obrigatório |
| Repositório GitHub `GabrielBrandl/abs-resolve` | Conectado ao EasyPanel |
| Supabase (Postgres + Storage bucket `documentos`) | Já configurado |
| Asaas (produção) | API key configurada |
| Domínio (ex.: `app.absresolve.com.br`) | Apontando para o IP da VPS |

### Antes do deploy — checklist local

Na sua máquina (já verificado no projeto):

```bash
cd backend && npm test && npm run build
cd ../frontend && npm run build
npx prisma migrate deploy   # no backend — migrations aplicadas
```

---

## Passo a passo no EasyPanel

### 1. Criar o projeto Compose

1. Acesse o painel EasyPanel na sua VPS
2. **Create** → **Compose**
3. Nome do projeto: `abs-resolve`
4. **Source:** GitHub → repositório `GabrielBrandl/abs-resolve` → branch `main`
5. O EasyPanel detecta automaticamente o `docker-compose.yml` na raiz
6. Salve o projeto (ainda **não** faça deploy)

### 2. Configurar variáveis de ambiente

1. Na sua máquina, abra o arquivo **`deploy/easypanel.env.local`** (credenciais reais — **não** vai para o GitHub)
2. Copie **todo** o conteúdo
3. No EasyPanel → projeto `abs-resolve` → aba **Environment**
4. Cole o conteúdo e **salve**

> Se não tiver o `.local`, use o template `deploy/easypanel.env` e preencha com os valores do `backend/.env`, trocando:
> - `JWT_SECRET` e `JWT_REFRESH_SECRET` por strings longas e únicas (produção)
> - `FRONTEND_URL` e `API_PUBLIC_URL` para `https://$(PRIMARY_DOMAIN)`
> - `ASAAS_MOCK=false`

**Variável mágica:** `$(PRIMARY_DOMAIN)` é substituída automaticamente pelo domínio que você configurar no serviço **web**.

### 3. Configurar domínio e SSL

1. No projeto, abra o serviço **`web`** (nginx + frontend)
2. Aba **Domains** → **Add domain**
3. Informe seu domínio (ex.: `app.absresolve.com.br`)
4. **Proxy port:** `80`
5. Ative **SSL** (Let's Encrypt — automático)
6. No DNS do seu provedor, crie um registro **A** apontando o domínio para o **IP da VPS**

> O serviço `backend` **não** precisa de domínio público — o nginx do `web` encaminha `/api/*` internamente.

### 4. Primeiro deploy

1. Clique em **Deploy** (ou **Rebuild**)
2. Aguarde o build dos dois serviços (`backend` e `web`) — primeira vez pode levar **5–15 minutos**
3. Nos logs do `backend`, confira:
   - `Prisma migrate deploy` — sem erros
   - `Seed (RUN_SEED=true)` — se for o primeiro deploy
   - `ABS Resolve API v2.0 rodando`

### 5. Verificar se está funcionando

Substitua `SEU-DOMINIO` pelo domínio configurado:

| URL | Resultado esperado |
|-----|-------------------|
| `https://SEU-DOMINIO/` | Tela de login ABS Resolve |
| `https://SEU-DOMINIO/api/health` | JSON com `"database": "connected"` |
| `https://SEU-DOMINIO/cadastro` | Página de cadastro de cliente |

Teste login admin (após seed):

- E-mail: `admin@absresolve.com.br`
- Senha: `admin123`

### 6. Após o primeiro deploy (importante)

1. No **Environment**, altere `RUN_SEED=false` (usuários demo já foram criados)
2. Clique em **Redeploy**
3. **Troque as senhas** dos usuários demo no painel Admin → Equipe

### 7. Webhook Asaas (pagamentos automáticos)

No painel Asaas → **Integrações → Webhooks**:

```
https://SEU-DOMINIO/api/webhooks/asaas
```

**Eventos recomendados:** `PAYMENT_RECEIVED`, `PAYMENT_CONFIRMED`, `PAYMENT_OVERDUE`

**Opcional — segurança:** defina um token em `ASAAS_WEBHOOK_TOKEN` no Environment e configure o mesmo token no Asaas (header `asaas-access-token`).

### 8. E-mails automáticos (opcional)

Para enviar e-mails reais (técnico a caminho, cobrança, pagamento confirmado), preencha no Environment:

```
SMTP_HOST=smtp.seuprovedor.com
SMTP_PORT=587
SMTP_USER=seu@email.com
SMTP_PASS=sua-senha-ou-app-password
SMTP_FROM=noreply@absresolve.com.br
```

Sem SMTP, as notificações ficam registradas no painel Admin → Notificações.

---

## Credenciais demo (após `RUN_SEED=true`)

| Perfil | Login | Senha |
|--------|-------|-------|
| Admin | admin@absresolve.com.br | admin123 |
| Comercial | comercial@absresolve.com.br | comercial123 |
| Técnico | tecnico@absresolve.com.br | tecnico123 |
| Cliente (portal) | CPF `529.982.247-25` | cliente123 |

---

## Arquitetura em produção

```
Internet → web (nginx :80)
              ├── /           → React (frontend estático)
              ├── /api/*      → backend:3001 (proxy interno)
              └── /uploads/*  → backend:3001
           backend → Supabase Postgres + Storage
                   → Asaas (PIX, boleto, cartão)
```

---

## Atualizações futuras

1. Faça `git push` na branch `main`
2. No EasyPanel → projeto → **Deploy** (ou ative auto-deploy no GitHub)
3. O `backend` roda `prisma migrate deploy` automaticamente a cada start

---

## Troubleshooting

| Problema | Solução |
|----------|---------|
| Build falha | Veja logs do serviço que falhou (`backend` ou `web`) |
| 502 Bad Gateway na API | Aguarde o healthcheck do `backend` (até 90s no primeiro start). Veja logs |
| `/api/health` retorna 503 | Verifique `DATABASE_URL` e `DIRECT_URL` no Environment |
| Login não funciona / cookies | Confirme SSL ativo no domínio. API e frontend estão no mesmo domínio via nginx |
| CORS (raro em produção) | `FRONTEND_URL=https://$(PRIMARY_DOMAIN)` no Environment |
| PIX não gera | `ASAAS_MOCK=false` e `ASAAS_API_KEY` correta. Veja logs do backend |
| Upload de fotos falha | Bucket `documentos` criado no Supabase + `SUPABASE_SERVICE_ROLE_KEY` |
| Seed não rodou | Confirme `RUN_SEED=true` antes do primeiro deploy |

---

## Segurança

- Repositório **privado** no GitHub (recomendado)
- Nunca commite `backend/.env` nem `deploy/easypanel.env.local`
- Use JWT secrets fortes em produção (já configurados no `.local`)
- Após go-live: altere senhas demo e defina `RUN_SEED=false`
