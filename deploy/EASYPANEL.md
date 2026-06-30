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

### 2. Configurar variáveis de ambiente (obrigatório)

Se aparecer erro *"variable is not set"*, *"datasource.url property is required"* ou *"DATABASE_URL não está definida"*, siga **exatamente**:

1. Abra **`deploy/easypanel.env.local`** na sua máquina (credenciais reais)
2. Copie **todo** o conteúdo (Ctrl+A → Ctrl+C)
3. EasyPanel → projeto (ex.: `crm-app`) → serviço **`backend`** → aba **Ambiente**
4. **Apague** o conteúdo antigo, **cole** o novo
5. **Salvar**
6. **Deploy** / **Rebuild** (aguarde 5–15 min)

> **Onde colar:** sempre no serviço **`backend`**, aba **Ambiente**. Não basta colar só no projeto pai.

> **Chave Asaas:** use **`$$`** no início: `ASAAS_API_KEY=$$aact_prod_...`

> **URLs:** use o domínio real no backend: `FRONTEND_URL=https://app.absresolve.com.br`  
> `$(PRIMARY_DOMAIN)` **não funciona** no serviço backend (só no web).

> **Seed:** `RUN_SEED=true` só no 1º deploy. Depois mude para `false` e redeploy.

**Alternativa (se Ambiente não aplicar):** backend → **Mounts** → **File** → mountPath `/app/.env.production` → cole o mesmo conteúdo (com `$` simples na Asaas, entre aspas se necessário).

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
| `aact_prod_... variable is not set` | `ASAAS_API_KEY` com **`$$`** no início (ex.: `$$aact_prod_...`), não `$` único |
| `/api/health` retorna 503 | `DATABASE_URL` e `DIRECT_URL` na aba **Ambiente do serviço backend** → Salvar → Deploy |
| `datasource.url property is required` (Prisma) | Mesmo: variáveis no serviço **backend**, não só no projeto. Redeploy após Salvar |
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
