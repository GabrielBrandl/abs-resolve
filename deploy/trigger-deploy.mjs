#!/usr/bin/env node
/**
 * Dispara redeploy no EasyPanel via Deployment Trigger URL.
 * Configure: EASYPANEL_DEPLOY_URL=http://SEU_IP:3000/api/deploy/SEU_TOKEN
 * ou adicione como secret no GitHub Actions.
 */
const url = process.env.EASYPANEL_DEPLOY_URL;
if (!url) {
  console.error('Defina EASYPANEL_DEPLOY_URL (EasyPanel → projeto → Deployments → Deployment Trigger)');
  process.exit(1);
}

const res = await fetch(url, { method: 'POST' });
const text = await res.text();
console.log('Status:', res.status);
console.log(text || '(sem corpo)');
process.exit(res.ok ? 0 : 1);
