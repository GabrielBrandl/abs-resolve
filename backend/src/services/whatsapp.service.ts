import { normalizarTelefoneWhatsApp } from '../utils/telefone.js';

/**
 * WhatsApp Cloud API (Meta / Facebook Graph).
 * Docs: https://developers.facebook.com/docs/whatsapp/cloud-api
 */
function graphBase() {
  const version = (process.env.WHATSAPP_API_VERSION || 'v25.0').replace(/^\//, '');
  const base = (process.env.WHATSAPP_API_URL || 'https://graph.facebook.com').replace(/\/$/, '');
  if (base.includes('graph.facebook.com')) {
    return base.includes(`/v`) ? base : `${base}/${version}`;
  }
  // se alguém apontar só a versão errada, força Graph
  return `https://graph.facebook.com/${version}`;
}

function phoneNumberId() {
  return (process.env.WHATSAPP_PHONE_NUMBER_ID || '').trim();
}

function accessToken() {
  return (process.env.WHATSAPP_TOKEN || process.env.WHATSAPP_ACCESS_TOKEN || '').trim();
}

export function whatsappMetaConfigured() {
  return Boolean(phoneNumberId() && accessToken());
}

export async function enviarWhatsAppMetaTexto(telefone: string, texto: string): Promise<void> {
  const to = normalizarTelefoneWhatsApp(telefone);
  const id = phoneNumberId();
  const token = accessToken();
  if (!to || !id || !token) throw new Error('WhatsApp Meta não configurado');

  const url = `${graphBase()}/${id}/messages`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { preview_url: false, body: texto.slice(0, 4096) },
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(body || `WhatsApp Meta HTTP ${res.status}`);
  }
}

export async function enviarWhatsAppMetaTemplate(opts: {
  telefone: string;
  templateName: string;
  languageCode?: string;
  bodyParams?: string[];
}): Promise<void> {
  const to = normalizarTelefoneWhatsApp(opts.telefone);
  const id = phoneNumberId();
  const token = accessToken();
  if (!to || !id || !token) throw new Error('WhatsApp Meta não configurado');

  const language = opts.languageCode || process.env.WHATSAPP_TEMPLATE_LANG || 'en_US';
  const components =
    opts.bodyParams && opts.bodyParams.length
      ? [
          {
            type: 'body',
            parameters: opts.bodyParams.map((text) => ({ type: 'text', text: String(text).slice(0, 1024) })),
          },
        ]
      : undefined;

  const url = `${graphBase()}/${id}/messages`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: {
        name: opts.templateName,
        language: { code: language },
        ...(components ? { components } : {}),
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(body || `WhatsApp Meta template HTTP ${res.status}`);
  }
}

/** Evolution API (legado) */
export async function enviarWhatsAppEvolution(telefone: string, texto: string): Promise<void> {
  const to = normalizarTelefoneWhatsApp(telefone);
  const apiUrl = (process.env.WHATSAPP_API_URL || '').replace(/\/$/, '');
  const token = accessToken();
  if (!to || !apiUrl || !token || apiUrl.includes('graph.facebook.com')) {
    throw new Error('Evolution WhatsApp não configurado');
  }

  const res = await fetch(`${apiUrl}/message/sendText`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: token,
    },
    body: JSON.stringify({ number: to, text: texto }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(body || `Evolution HTTP ${res.status}`);
  }
}
