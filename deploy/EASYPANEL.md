# Deploy ABS Resolve no EasyPanel

Repositório **pronto para deploy** — sem alterar código.

## Pré-requisitos

- VPS com [EasyPanel](https://easypanel.io) instalado
- Repositório GitHub conectado
- Supabase e Asaas já configurados (variáveis em `deploy/easypanel.env`)

---

## Passo a passo (5 minutos)

### 1. Criar projeto Compose

1. EasyPanel → **Create** → **Compose**
2. Nome: `abs-resolve`
3. **Source:** GitHub → `GabrielBrandl/abs-resolve` → branch `main`
4. O EasyPanel detecta o `docker-compose.yml` na raiz

### 2. Variáveis de ambiente

1. Abra **`deploy/easypanel.env.local`** na sua máquina (credenciais reais, não vai pro GitHub)
2. Copie **todo o conteúdo**
3. EasyPanel → projeto → **Environment** → cole
4. Salve

> Se não tiver o `.local`, use `backend/.env` + ajuste `FRONTEND_URL` e `API_PUBLIC_URL` para `https://$(PRIMARY_DOMAIN)`.

> `$(PRIMARY_DOMAIN)` é preenchido automaticamente pelo EasyPanel com o domínio do serviço **web**.

### 3. Domínio e porta

1. Serviço **web** → **Domains**
2. Adicione domínio (ex.: `app.absresolve.com.br` ou o subdomínio `.easypanel.host`)
3. **Proxy port:** `80`
4. SSL: ativar (Let's Encrypt automático)

### 4. Deploy

1. Clique em **Deploy**
2. Aguarde build de `backend` e `web` (5–10 min na primeira vez)
3. Acesse o domínio

### 5. Após o primeiro deploy

1. Em **Environment**, altere `RUN_SEED=false` (usuários demo já criados)
2. **Redeploy**

---

## Webhook Asaas

No painel Asaas → **Integrações → Webhooks**:

```
https://SEU-DOMINIO/api/webhooks/asaas
```

Eventos: `PAYMENT_RECEIVED`, `PAYMENT_CONFIRMED`, `PAYMENT_OVERDUE`

---

## Verificar se está ok

| URL | Esperado |
|-----|----------|
| `https://SEU-DOMINIO/` | Tela de login |
| `https://SEU-DOMINIO/api/health` | `"database": "connected"` |
| `https://SEU-DOMINIO/cadastro` | Cadastro cliente |

---

## Credenciais demo (após seed)

| Perfil | Login | Senha |
|--------|-------|-------|
| Admin | admin@absresolve.com.br | admin123 |
| Cliente | CPF 529.982.247-25 | cliente123 |

---

## Arquitetura

```
Internet → web (nginx:80)
              ├── /        → React (frontend)
              ├── /api/*   → backend:3001
              └── /uploads → backend:3001
           backend → Supabase + Asaas
```

---

## Troubleshooting

| Problema | Solução |
|----------|---------|
| 502 na API | Ver logs do serviço `backend` |
| CORS / login falha | Confirme `FRONTEND_URL=https://$(PRIMARY_DOMAIN)` |
| Banco offline | Verifique `DATABASE_URL` no Environment |
| PIX não gera | Verifique `ASAAS_API_KEY` e logs do backend |
