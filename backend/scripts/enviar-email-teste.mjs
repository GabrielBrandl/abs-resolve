import 'dotenv/config';
import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';

const TO = process.argv[2] || 'gabrielpaivabarbosa@gmail.com';
const logo =
  (process.env.FRONTEND_URL || process.env.API_PUBLIC_URL || 'https://app.absresolve.com.br').replace(/\/$/, '') +
  '/logo.png';
const portal = (process.env.FRONTEND_URL || 'https://app.absresolve.com.br').replace(/\/$/, '') + '/conta/servicos';

function emailPedidoAmazon(opts) {
  const primeiroNome = opts.clienteNome.split(' ')[0] || opts.clienteNome;
  const itemHtml = `
            <table style="width:100%;border-collapse:collapse;margin:12px 0 4px">
              <tr>
                <td style="padding:10px 8px 10px 0;width:72px;vertical-align:top">
                  <img src="cid:item-0" alt="Troca de tomada" width="64" height="64" style="display:block;width:64px;height:64px;border-radius:8px;object-fit:cover;border:1px solid #e3e6e6" />
                </td>
                <td style="padding:10px 0;vertical-align:top;font-size:14px;color:#0f1111">
                  <div style="font-weight:700">Troca de tomada</div>
                  <div style="color:#565959;font-size:12px">Qtd. 1</div>
                </td>
                <td style="padding:10px 0;text-align:right;vertical-align:top;font-weight:700">R$ 149,00</td>
              </tr>
            </table>`;
  return `
      <div style="font-family:Arial,Helvetica,sans-serif;background:#eaeded;padding:16px 8px">
        <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #d5d9d9">
          <div style="background:#002d62;padding:14px 20px;text-align:center">
            <img src="cid:logo-abs" alt="ABS Resolve" width="180" style="max-width:180px;height:auto" />
          </div>
          <div style="padding:22px 24px 8px">
            <p style="margin:0 0 6px;font-size:22px;font-weight:700;color:${opts.statusCor}">${opts.statusTitulo}</p>
            <p style="margin:0 0 16px;font-size:14px;color:#0f1111">Olá, ${primeiroNome}. ${opts.intro}</p>
            <p style="margin:0 0 8px;font-size:12px;color:#565959">Pedido <strong>${opts.pedidoNumero}</strong></p>
            ${itemHtml}
            <table style="width:100%;border-collapse:collapse;font-size:14px">
              <tr>
                <td style="padding:10px 0;border-top:1px solid #e3e6e6;font-weight:700">Total</td>
                <td style="padding:10px 0;border-top:1px solid #e3e6e6;text-align:right;font-size:18px;font-weight:800;color:#002d62">${opts.total}</td>
              </tr>
            </table>
            ${opts.extraHtml || ''}
            <p style="margin:20px 0 8px;text-align:center">
              <a href="${portal}" style="display:inline-block;background:#ffb800;color:#002d62;text-decoration:none;font-weight:800;padding:12px 22px;border-radius:8px">${opts.ctaLabel}</a>
            </p>
          </div>
          <div style="padding:12px 24px 20px;font-size:12px;color:#565959">ABS Resolve · Chamou. Confiou. Resolveu.</div>
        </div>
      </div>
    `;
}

const comprovante = `
      <div style="margin:16px 0;padding:14px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px">
        <p style="margin:0 0 10px;font-weight:bold;color:#0f2744">Comprovante de pagamento</p>
        <table style="width:100%;font-size:13px;border-collapse:collapse">
          <tr><td style="padding:4px 0;color:#64748b">Pedido</td><td style="padding:4px 0;text-align:right"><strong>ABS-TESTE01</strong></td></tr>
          <tr><td style="padding:4px 0;color:#64748b">Serviço(s)</td><td style="padding:4px 0;text-align:right">Troca de tomada</td></tr>
          <tr><td style="padding:4px 0;color:#64748b">Valor pago</td><td style="padding:4px 0;text-align:right"><strong>R$&nbsp;149,00</strong></td></tr>
          <tr><td style="padding:4px 0;color:#64748b">Forma de pagamento</td><td style="padding:4px 0;text-align:right">PIX</td></tr>
          <tr><td style="padding:4px 0;color:#64748b">Data</td><td style="padding:4px 0;text-align:right">${new Date().toLocaleDateString('pt-BR')}</td></tr>
        </table>
      </div>`;

const emails = [
  {
    file: 'pedido-solicitado.html',
    subject: '[TESTE] Pedido solicitado ABS-TESTE01 — ABS Resolve',
    html: emailPedidoAmazon({
      statusTitulo: 'Pedido solicitado',
      statusCor: '#067d62',
      clienteNome: 'Gabriel',
      intro:
        'Recebemos o seu pedido. Enviamos esta confirmação agora; quando o pagamento for aprovado no Asaas, você recebe outro e-mail.',
      pedidoNumero: 'ABS-TESTE01',
      servicos: 'Troca de tomada',
      total: 'R$ 149,00',
      extraHtml:
        '<p style="margin:12px 0 0;font-size:13px;color:#565959">Este é um e-mail de teste do visual da loja.</p>',
      ctaLabel: 'Acompanhar pedido',
    }),
  },
  {
    file: 'pagamento-confirmado.html',
    subject: '[TESTE] Pagamento confirmado ABS-TESTE01 — ABS Resolve',
    html: emailPedidoAmazon({
      statusTitulo: 'Pagamento confirmado',
      statusCor: '#067d62',
      clienteNome: 'Gabriel',
      intro: 'O Asaas confirmou o seu pagamento. Seu pedido está confirmado.',
      pedidoNumero: 'ABS-TESTE01',
      servicos: 'Troca de tomada',
      total: 'R$ 149,00',
      extraHtml: comprovante,
      ctaLabel: 'Agendar atendimento',
    }),
  },
];

const outDir = path.join(process.cwd(), 'tmp-emails');
fs.mkdirSync(outDir, { recursive: true });
for (const item of emails) {
  fs.writeFileSync(path.join(outDir, item.file), item.html);
}

let transporter;
let preview = false;
if (process.env.SMTP_HOST) {
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
} else {
  const test = await nodemailer.createTestAccount();
  transporter = nodemailer.createTransport({
    host: test.smtp.host,
    port: test.smtp.port,
    secure: test.smtp.secure,
    auth: { user: test.user, pass: test.pass },
  });
  preview = true;
}

const logoPath = path.resolve(process.cwd(), '..', 'frontend', 'public', 'logo.png');
const itemPath = path.resolve(process.cwd(), '..', 'frontend', 'public', 'servicos', 'troca-tomada.webp');
const attachments = [];
if (fs.existsSync(logoPath)) {
  attachments.push({ filename: 'logo.png', path: logoPath, cid: 'logo-abs' });
}
if (fs.existsSync(itemPath)) {
  attachments.push({ filename: 'troca-tomada.webp', path: itemPath, cid: 'item-0' });
}

for (const item of emails) {
  const info = await transporter.sendMail({
    from: process.env.SMTP_FROM || 'ABS Resolve <noreply@absresolve.com.br>',
    to: TO,
    subject: item.subject,
    html: item.html,
    attachments,
  });
  console.log('sent', item.file, info.messageId);
  if (preview) console.log('preview', nodemailer.getTestMessageUrl(info));
}

console.log('html_dir', outDir);
console.log('mode', process.env.SMTP_HOST ? 'smtp' : 'ethereal');
