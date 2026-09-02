import nodemailer from 'nodemailer';
import { prisma } from '../utils/prisma.js';
import { normalizarTelefoneWhatsApp, telefoneWhatsAppCliente } from '../utils/telefone.js';
import {
  anexosImagensPedido,
  htmlItensPedido,
  type AnexoEmail,
  type ItemEmailPedido,
} from '../utils/email-pedido.js';
import {
  enviarWhatsAppEvolution,
  enviarWhatsAppMetaTemplate,
  enviarWhatsAppMetaTexto,
  whatsappMetaConfigured,
} from './whatsapp.service.js';

const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: smtpPort,
  secure: smtpPort === 465,
  auth: process.env.SMTP_USER
    ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    : undefined,
});

const ETAPAS_OS_LABEL: Record<string, string> = {
  solicitacao: 'Solicitação',
  analise: 'Análise',
  orcamento: 'Orçamento',
  aprovacao: 'Aprovação',
  execucao: 'Execução',
  conclusao: 'Conclusão',
  avaliacao: 'Avaliação',
};

const METODO_PAGAMENTO_LABEL: Record<string, string> = {
  PIX: 'PIX',
  BOLETO: 'Boleto',
  CARTAO: 'Cartão de crédito',
};

function formatarMoeda(valor: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
}

function formatarData(d: Date | string) {
  return new Date(d).toLocaleDateString('pt-BR');
}

function formatarHorario(data: string, inicio: string, fim: string) {
  return `${formatarData(data)} das ${inicio} às ${fim}`;
}

export class NotificacaoService {
  private logoUrl() {
    const base = (process.env.FRONTEND_URL || process.env.API_PUBLIC_URL || 'https://absresolve.com.br').replace(/\/$/, '');
    return `${base}/logo.png`;
  }

  private template(titulo: string, paragrafos: string[], extraHtml = '') {
    const corpo = paragrafos.map((p) => `<p style="margin:0 0 12px;line-height:1.5">${p}</p>`).join('');
    return `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#1e293b">
        <div style="background:#0a0a0a;padding:16px 20px;border-radius:8px 8px 0 0;text-align:center">
          <img src="${this.logoUrl()}" alt="ABS Resolve" width="200" style="max-width:200px;height:auto;display:inline-block" />
        </div>
        <div style="border:1px solid #e2e8f0;border-top:none;padding:20px;border-radius:0 0 8px 8px">
          <h2 style="margin:0 0 16px;font-size:18px;color:#0f2744">${titulo}</h2>
          ${corpo}
          ${extraHtml}
          <p style="margin:16px 0 0;font-size:12px;color:#64748b">Este é um e-mail automático. Não responda.</p>
        </div>
      </div>
    `;
  }

  private portalUrl() {
    return (process.env.FRONTEND_URL || process.env.API_PUBLIC_URL || 'https://absresolve.com.br').replace(/\/$/, '');
  }

  /** E-mail transacional no estilo Amazon: pedido solicitado / pagamento confirmado */
  private emailPedidoAmazon(opts: {
    statusTitulo: string;
    statusCor: string;
    clienteNome: string;
    intro: string;
    pedidoNumero: string;
    servicos: string;
    total: string;
    extraHtml?: string;
    ctaLabel: string;
    itens?: ItemEmailPedido[];
  }) {
    const primeiroNome = opts.clienteNome.split(' ')[0] || opts.clienteNome;
    const ctaUrl = `${this.portalUrl()}/conta/servicos`;
    const anexos = anexosImagensPedido(opts.itens || []);
    const logoSrc = anexos.some((a) => a.cid === 'logo-abs') ? 'cid:logo-abs' : this.logoUrl();
    const itensHtml = htmlItensPedido(opts.itens || [], anexos);
    return `
      <div style="font-family:Arial,Helvetica,sans-serif;background:#eaeded;padding:16px 8px">
        <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #d5d9d9">
          <div style="background:#002d62;padding:14px 20px;text-align:center">
            <img src="${logoSrc}" alt="ABS Resolve" width="180" style="max-width:180px;height:auto" />
          </div>
          <div style="padding:22px 24px 8px">
            <p style="margin:0 0 6px;font-size:22px;font-weight:700;color:${opts.statusCor}">${opts.statusTitulo}</p>
            <p style="margin:0 0 16px;font-size:14px;color:#0f1111">Olá, ${primeiroNome}. ${opts.intro}</p>
            <p style="margin:0 0 8px;font-size:12px;color:#565959">Pedido <strong>${opts.pedidoNumero}</strong></p>
            ${itensHtml || `<p style="margin:0 0 12px;font-size:14px">${opts.servicos}</p>`}
            <table style="width:100%;border-collapse:collapse;font-size:14px">
              <tr>
                <td style="padding:10px 0;border-top:1px solid #e3e6e6;font-weight:700">Total</td>
                <td style="padding:10px 0;border-top:1px solid #e3e6e6;text-align:right;font-size:18px;font-weight:800;color:#002d62">${opts.total}</td>
              </tr>
            </table>
            ${opts.extraHtml || ''}
            <p style="margin:20px 0 8px;text-align:center">
              <a href="${ctaUrl}" style="display:inline-block;background:#ffb800;color:#002d62;text-decoration:none;font-weight:800;padding:12px 22px;border-radius:8px">${opts.ctaLabel}</a>
            </p>
          </div>
          <div style="padding:12px 24px 20px;font-size:12px;color:#565959">ABS Resolve · Chamou. Confiou. Resolveu.</div>
        </div>
      </div>
    `;
  }

  async enviarEmail(
    destino: string,
    assunto: string,
    html: string,
    anexos?: AnexoEmail[]
  ) {
    try {
      if (process.env.SMTP_HOST) {
        await transporter.sendMail({
          from: process.env.SMTP_FROM || 'noreply@absresolve.com.br',
          to: destino,
          subject: assunto,
          html,
          attachments: anexos?.map((a) => ({
            filename: a.filename,
            content: a.content,
            contentType: a.contentType,
            cid: a.cid,
          })),
        });
      } else if (process.env.NODE_ENV !== 'production') {
        console.info(`[email] ${destino} — ${assunto}${anexos?.length ? ` (+${anexos.length} anexo(s))` : ''}`);
      }
      await this.registrar('email', 'email', destino, assunto, html, 'enviada');
    } catch (err) {
      console.warn('[email] falha:', destino, assunto, err instanceof Error ? err.message : err);
      await this.registrar('email', 'email', destino, assunto, html, 'falha');
    }
  }

  async enviarWhatsApp(telefone: string, mensagem: string): Promise<boolean> {
    const numero = normalizarTelefoneWhatsApp(telefone);
    if (!numero) {
      await this.registrar('whatsapp', 'whatsapp', telefone, null, mensagem, 'falha');
      return false;
    }

    try {
      if (whatsappMetaConfigured()) {
        await enviarWhatsAppMetaTexto(numero, mensagem);
      } else if (process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_API_URL) {
        await enviarWhatsAppEvolution(numero, mensagem);
      } else if (process.env.NODE_ENV !== 'production') {
        console.info(`[whatsapp] ${numero} — ${mensagem.slice(0, 120)}...`);
      } else {
        throw new Error('WhatsApp não configurado (WHATSAPP_PHONE_NUMBER_ID + WHATSAPP_TOKEN)');
      }
      await this.registrar('whatsapp', 'whatsapp', numero, null, mensagem, 'enviada');
      return true;
    } catch (err) {
      console.warn('[whatsapp] falha ao enviar:', err instanceof Error ? err.message : err);
      await this.registrar('whatsapp', 'whatsapp', numero, null, mensagem, 'falha');
      return false;
    }
  }

  async enviarWhatsAppTemplate(
    telefone: string,
    templateName: string,
    bodyParams: string[],
    languageCode?: string
  ): Promise<boolean> {
    const numero = normalizarTelefoneWhatsApp(telefone);
    if (!numero) {
      await this.registrar('whatsapp', 'whatsapp', telefone, templateName, bodyParams.join('|'), 'falha');
      return false;
    }
    try {
      if (!whatsappMetaConfigured()) {
        throw new Error('WhatsApp Meta não configurado para template');
      }
      await enviarWhatsAppMetaTemplate({
        telefone: numero,
        templateName,
        bodyParams,
        languageCode,
      });
      await this.registrar('whatsapp', 'whatsapp', numero, templateName, bodyParams.join(' | '), 'enviada');
      return true;
    } catch (err) {
      console.warn('[whatsapp-template] falha:', err instanceof Error ? err.message : err);
      await this.registrar('whatsapp', 'whatsapp', numero, templateName, bodyParams.join(' | '), 'falha');
      return false;
    }
  }

  private whatsappCliente(cliente: { telefone: string; whatsapp?: string | null }) {
    return telefoneWhatsAppCliente(cliente);
  }

  /** Números da equipe (WHATSAPP_EQUIPE separados por vírgula) */
  private telefonesEquipe(): string[] {
    const raw = process.env.WHATSAPP_EQUIPE || process.env.WHATSAPP_OPS || '5592984169936';
    return raw
      .split(/[,;]+/)
      .map((t) => normalizarTelefoneWhatsApp(t.trim()))
      .filter(Boolean);
  }

  async notificarEquipePagamentoConfirmado(data: {
    pedidoNumero: string;
    clienteNome: string;
    telefone: string;
    whatsapp?: string | null;
    email: string;
    endereco: string;
    servicos: string;
    material: string[];
    valor: number;
    metodo: string;
  }) {
    const destinos = this.telefonesEquipe();
    if (!destinos.length) {
      if (process.env.NODE_ENV !== 'production') {
        console.info('[whatsapp-equipe] WHATSAPP_EQUIPE não configurado — pulando aviso interno');
      }
      return;
    }

    const contato = telefoneWhatsAppCliente({ telefone: data.telefone, whatsapp: data.whatsapp }) || data.telefone;
    const metodo = METODO_PAGAMENTO_LABEL[data.metodo] || data.metodo;
    const materialTxt = data.material.length
      ? data.material.map((l) => `• ${l}`).join('\n')
      : '• (não informado no questionário)';
    const dataFmt = formatarData(new Date());

    const templateName =
      process.env.WHATSAPP_TEMPLATE_PAGAMENTO || 'jaspers_market_order_confirmation_v1';
    const templateLang = process.env.WHATSAPP_TEMPLATE_LANG || 'en_US';

    const msg =
      `💰 *Pagamento confirmado — ABS Resolve*\n\n` +
      `Pedido: *${data.pedidoNumero}*\n` +
      `Valor: *${formatarMoeda(data.valor)}* (${metodo})\n\n` +
      `👤 *Cliente / inquilino*\n` +
      `Nome: ${data.clienteNome}\n` +
      `Tel/WhatsApp: ${contato}\n` +
      `E-mail: ${data.email}\n` +
      `Endereço: ${data.endereco}\n\n` +
      `🔧 *Serviço(s)*\n${data.servicos}\n\n` +
      `📦 *Material*\n${materialTxt}`;

    for (const numero of destinos) {
      // Template aprovado na Cloud API (abre a conversa / notifica a equipe)
      await this.enviarWhatsAppTemplate(
        numero,
        templateName,
        [data.clienteNome, data.pedidoNumero, dataFmt],
        templateLang
      );
      // Detalhes completos (funciona se já houver janela de 24h; senão o template já avisou)
      await this.enviarWhatsApp(numero, msg);
    }
  }

  /** Solicitação recebida — aguardando pagamento */
  async notificarSolicitacaoRecebida(data: {
    clienteNome: string;
    email: string;
    telefone: string;
    whatsapp?: string | null;
    pedidoNumero: string;
    servicos: string;
    valor: number;
    metodo?: string;
  }) {
    const valorFmt = formatarMoeda(data.valor);
    const metodo = data.metodo ? METODO_PAGAMENTO_LABEL[data.metodo] || data.metodo : 'pagamento';
    const msg =
      `📋 *ABS Resolve — Solicitação recebida*\n\n` +
      `Olá, ${data.clienteNome}!\n\n` +
      `Recebemos seu pedido *${data.pedidoNumero}*.\n\n` +
      `🔧 Serviço(s): ${data.servicos}\n` +
      `💰 Valor: ${valorFmt}\n\n` +
      `Finalize o ${metodo} para confirmar o atendimento. Assim que o pagamento for aprovado, enviaremos a confirmação por aqui.\n\n` +
      `_Chamou. ConfioU. Resolveu._`;

    await this.enviarEmail(
      data.email,
      'Solicitação recebida — ABS Resolve',
      this.template('Solicitação recebida', [
        `Olá, ${data.clienteNome}!`,
        `Recebemos seu pedido <strong>${data.pedidoNumero}</strong>.`,
        `Serviço(s): ${data.servicos}`,
        `Valor: <strong>${valorFmt}</strong>`,
        'Finalize o pagamento para confirmar o atendimento.',
      ])
    );
    await this.enviarWhatsApp(this.whatsappCliente(data), msg);
  }

  /** Pagamento confirmado — serviço contratado */
  async notificarServicoConfirmado(data: {
    clienteNome: string;
    email: string;
    telefone: string;
    whatsapp?: string | null;
    pedidoNumero: string;
    servicos: string;
    valor: number;
  }) {
    const valorFmt = formatarMoeda(data.valor);
    const msg =
      `✅ *ABS Resolve — Serviço confirmado!*\n\n` +
      `Olá, ${data.clienteNome}!\n\n` +
      `Seu pagamento foi aprovado e o pedido *${data.pedidoNumero}* está confirmado.\n\n` +
      `🔧 Serviço(s): ${data.servicos}\n` +
      `💰 Valor pago: ${valorFmt}\n\n` +
      `Acesse o portal para agendar o horário do atendimento. Você receberá lembretes 1 dia antes e 2 horas antes do horário marcado.\n\n` +
      `_Chamou. ConfioU. Resolveu._`;

    await this.enviarEmail(
      data.email,
      'Serviço confirmado — ABS Resolve',
      this.template('Serviço confirmado', [
        `Olá, ${data.clienteNome}!`,
        `Pagamento aprovado — pedido <strong>${data.pedidoNumero}</strong>.`,
        `Serviço(s): ${data.servicos}`,
        `Valor: <strong>${valorFmt}</strong>`,
        'Agende o horário do atendimento pelo portal do cliente.',
      ])
    );
    await this.enviarWhatsApp(this.whatsappCliente(data), msg);
  }

  /** Horário de atendimento confirmado */
  async notificarAgendamentoConfirmado(data: {
    clienteNome: string;
    email: string;
    telefone: string;
    whatsapp?: string | null;
    pedidoNumero?: string;
    data: string;
    horarioInicio: string;
    horarioFim: string;
    servicoNome?: string;
  }) {
    const quando = formatarHorario(data.data, data.horarioInicio, data.horarioFim);
    const servico = data.servicoNome ? `\n🔧 ${data.servicoNome}` : '';
    const pedido = data.pedidoNumero ? `\n📦 Pedido: ${data.pedidoNumero}` : '';
    const msg =
      `📅 *ABS Resolve — Horário confirmado*\n\n` +
      `Olá, ${data.clienteNome}!\n\n` +
      `Seu atendimento está agendado:\n` +
      `🗓 ${quando}${servico}${pedido}\n\n` +
      `Enviaremos lembretes por WhatsApp *1 dia antes* e *2 horas antes* do horário.\n\n` +
      `_Chamou. ConfioU. Resolveu._`;

    await this.enviarEmail(
      data.email,
      'Horário confirmado — ABS Resolve',
      this.template('Horário confirmado', [msg.replace(/\*/g, '').replace(/_/g, '')])
    );
    await this.enviarWhatsApp(this.whatsappCliente(data), msg);
  }

  /** Lembrete automático (1 dia ou 2 horas antes) */
  async notificarLembreteAgendamento(data: {
    tipo: '1d' | '2h';
    clienteNome: string;
    email: string;
    telefone: string;
    whatsapp?: string | null;
    data: string;
    horarioInicio: string;
    horarioFim: string;
    pedidoNumero?: string;
    servicoNome?: string;
  }): Promise<boolean> {
    const quando = formatarHorario(data.data, data.horarioInicio, data.horarioFim);
    const pedido = data.pedidoNumero ? `\n📦 Pedido: ${data.pedidoNumero}` : '';
    const servico = data.servicoNome ? `\n🔧 ${data.servicoNome}` : '';

    const msg =
      data.tipo === '1d'
        ? `🔔 *Lembrete ABS Resolve*\n\nOlá, ${data.clienteNome}!\n\nSeu atendimento é *amanhã*:\n🗓 ${quando}${servico}${pedido}\n\nPrecisa reagendar? Acesse o portal do cliente.\n\n_Chamou. ConfioU. Resolveu._`
        : `🔔 *Lembrete ABS Resolve*\n\nOlá, ${data.clienteNome}!\n\nSeu técnico chega *hoje*:\n⏰ ${data.horarioInicio} às ${data.horarioFim}${servico}${pedido}\n\nDeixe o local preparado para o atendimento.\n\n_Chamou. ConfioU. Resolveu._`;

    const assunto = data.tipo === '1d' ? 'Lembrete: atendimento amanhã' : 'Lembrete: atendimento em 2 horas';
    await this.enviarEmail(data.email, `${assunto} — ABS Resolve`, this.template(assunto, [msg.replace(/\*/g, '')]));
    return this.enviarWhatsApp(this.whatsappCliente(data), msg);
  }

  async notificarNovoPedido(clienteNome: string, numero: string, email: string, telefone: string) {
    const msg = `Olá, ${clienteNome}! Seu pedido ${numero} foi recebido e está em processamento.`;
    await this.enviarEmail(
      email,
      `Pedido solicitado ${numero} — ABS Resolve`,
      this.emailPedidoAmazon({
        statusTitulo: 'Pedido solicitado',
        statusCor: '#067d62',
        clienteNome,
        intro: 'Recebemos o seu pedido. Quando o pagamento for confirmado, você recebe outro e-mail.',
        pedidoNumero: numero,
        servicos: 'Serviço ABS Resolve',
        total: '—',
        ctaLabel: 'Acompanhar pedido',
      })
    );
    await this.enviarWhatsApp(telefone, msg);
  }

  async notificarPedidoCriado(clienteNome: string, numero: string, email: string, telefone: string) {
    await this.notificarNovoPedido(clienteNome, numero, email, telefone);
  }

  async notificarCobrancaGerada(data: {
    clienteNome: string;
    valor: number;
    metodo: string;
    vencimento: Date | string;
    email: string;
    telefone: string;
    pedidoNumero?: string;
    linkPagamento?: string | null;
    pixCode?: string | null;
    itens?: ItemEmailPedido[];
  }) {
    const metodo = METODO_PAGAMENTO_LABEL[data.metodo] || data.metodo;
    const valor = formatarMoeda(data.valor);
    const venc = formatarData(data.vencimento);
    const ref = data.pedidoNumero ? ` referente ao pedido <strong>${data.pedidoNumero}</strong>` : '';
    const msg = `Olá, ${data.clienteNome}! Foi gerada uma cobrança de ${valor} via ${metodo}, com vencimento em ${venc}${data.pedidoNumero ? ` (pedido ${data.pedidoNumero})` : ''}.`;
    const linkHtml = data.linkPagamento
      ? `<p><a href="${data.linkPagamento}" style="display:inline-block;background:#f59e0b;color:#1e293b;padding:10px 16px;border-radius:6px;text-decoration:none;font-weight:bold">Pagar agora</a></p>`
      : '';
    const pixHtml =
      data.metodo === 'PIX' && data.pixCode
        ? `<div style="margin:12px 0;padding:12px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px">
            <p style="margin:0 0 8px;font-size:13px;font-weight:bold;color:#166534">PIX copia e cola</p>
            <p style="margin:0;font-size:11px;word-break:break-all;color:#334155">${data.pixCode}</p>
          </div>`
        : '';
    await this.enviarEmail(
      data.email,
      `Pedido solicitado ${data.pedidoNumero ? data.pedidoNumero + ' ' : ''}— ABS Resolve`,
      this.emailPedidoAmazon({
        statusTitulo: 'Pedido solicitado',
        statusCor: '#067d62',
        clienteNome: data.clienteNome,
        intro: 'Recebemos o seu pedido. Enviamos esta confirmação agora; quando o pagamento for aprovado no Asaas, você recebe outro e-mail.',
        pedidoNumero: data.pedidoNumero || '—',
        servicos: data.itens?.map((i) => i.nome).join(', ') || `Cobrança via ${metodo}${ref}`,
        total: valor,
        extraHtml: `${linkHtml}${pixHtml}<p style="margin:12px 0 0;font-size:13px;color:#565959">Vencimento: <strong>${venc}</strong>.</p>`,
        ctaLabel: 'Acompanhar pedido',
        itens: data.itens,
      }),
      anexosImagensPedido(data.itens || [])
    );
    await this.enviarWhatsApp(
      data.telefone,
      msg + (data.linkPagamento ? ` Link: ${data.linkPagamento}` : '')
    );
  }

  /** Pagamento confirmado + comprovante + NFS-e */
  async notificarPagamentoComNfse(data: {
    clienteNome: string;
    email: string;
    telefone: string;
    whatsapp?: string | null;
    pedidoNumero: string;
    servicos: string;
    itens?: ItemEmailPedido[];
    valor: number;
    metodo: string;
    dataPagamento?: Date | string | null;
    linkComprovante?: string | null;
    nfse?: {
      numero?: string | null;
      codigoVerificacao?: string | null;
      pdfUrl?: string | null;
      anexo?: { filename: string; content: Buffer; contentType?: string };
    } | null;
  }) {
    const valorFmt = formatarMoeda(data.valor);
    const metodo = METODO_PAGAMENTO_LABEL[data.metodo] || data.metodo;
    const quando = data.dataPagamento ? formatarData(data.dataPagamento) : formatarData(new Date());

    const comprovanteHtml = `
      <div style="margin:16px 0;padding:14px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px">
        <p style="margin:0 0 10px;font-weight:bold;color:#0f2744">Comprovante de pagamento</p>
        <table style="width:100%;font-size:13px;border-collapse:collapse">
          <tr><td style="padding:4px 0;color:#64748b">Pedido</td><td style="padding:4px 0;text-align:right"><strong>${data.pedidoNumero}</strong></td></tr>
          <tr><td style="padding:4px 0;color:#64748b">Serviço(s)</td><td style="padding:4px 0;text-align:right">${data.servicos}</td></tr>
          <tr><td style="padding:4px 0;color:#64748b">Valor pago</td><td style="padding:4px 0;text-align:right"><strong>${valorFmt}</strong></td></tr>
          <tr><td style="padding:4px 0;color:#64748b">Forma de pagamento</td><td style="padding:4px 0;text-align:right">${metodo}</td></tr>
          <tr><td style="padding:4px 0;color:#64748b">Data</td><td style="padding:4px 0;text-align:right">${quando}</td></tr>
        </table>
        ${data.linkComprovante ? `<p style="margin:12px 0 0"><a href="${data.linkComprovante}" style="color:#2563eb">Ver comprovante no Asaas</a></p>` : ''}
      </div>`;

    const nfseHtml = data.nfse?.numero
      ? `<div style="margin:16px 0;padding:14px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px">
          <p style="margin:0 0 10px;font-weight:bold;color:#0f2744">Nota Fiscal de Serviço (NFS-e)</p>
          <table style="width:100%;font-size:13px;border-collapse:collapse">
            <tr><td style="padding:4px 0;color:#64748b">Número</td><td style="padding:4px 0;text-align:right"><strong>${data.nfse.numero}</strong></td></tr>
            ${data.nfse.codigoVerificacao ? `<tr><td style="padding:4px 0;color:#64748b">Código de verificação</td><td style="padding:4px 0;text-align:right">${data.nfse.codigoVerificacao}</td></tr>` : ''}
          </table>
          ${data.nfse.pdfUrl ? `<p style="margin:12px 0 0"><a href="${data.nfse.pdfUrl}" style="color:#2563eb">Baixar NFS-e</a></p>` : ''}
          <p style="margin:8px 0 0;font-size:12px;color:#64748b">A nota também está disponível em Documentos no portal do cliente.</p>
        </div>`
      : `<p style="font-size:13px;color:#64748b">A NFS-e está sendo emitida e será disponibilizada em Documentos no portal do cliente.</p>`;

    const msg =
      `✅ *ABS Resolve — Pagamento confirmado!*\n\n` +
      `Olá, ${data.clienteNome}!\n\n` +
      `Pagamento de *${valorFmt}* aprovado — pedido *${data.pedidoNumero}*.\n` +
      `🔧 ${data.servicos}\n\n` +
      (data.nfse?.numero ? `📄 NFS-e nº ${data.nfse.numero} enviada por e-mail.\n\n` : '') +
      `Agende o horário do atendimento pelo portal do cliente.\n\n` +
      `_Chamou. ConfioU. Resolveu._`;

    const anexos = [
      ...anexosImagensPedido(data.itens || []),
      ...(data.nfse?.anexo ? [data.nfse.anexo] : []),
    ];

    await this.enviarEmail(
      data.email,
      `Pagamento confirmado ${data.pedidoNumero} — ABS Resolve`,
      this.emailPedidoAmazon({
        statusTitulo: 'Pagamento confirmado',
        statusCor: '#067d62',
        clienteNome: data.clienteNome,
        intro: 'O Asaas confirmou o seu pagamento. Seu pedido está confirmado.',
        pedidoNumero: data.pedidoNumero,
        servicos: data.servicos,
        total: valorFmt,
        extraHtml: comprovanteHtml + nfseHtml,
        ctaLabel: 'Agendar atendimento',
        itens: data.itens,
      }),
      anexos
    );
    await this.enviarWhatsApp(this.whatsappCliente(data), msg);
  }

  async notificarPagamentoRecebido(clienteNome: string, valor: number, email: string, telefone: string, pedidoNumero?: string) {
    const valorFmt = formatarMoeda(valor);
    const ref = pedidoNumero ? ` do pedido ${pedidoNumero}` : '';
    const msg = `Olá, ${clienteNome}! Seu pagamento de ${valorFmt}${ref} foi confirmado. Em breve entraremos em contato sobre o agendamento.`;
    await this.enviarEmail(
      email,
      'Pagamento confirmado — ABS Resolve',
      this.template('Pagamento confirmado', [msg])
    );
    await this.enviarWhatsApp(telefone, msg);
  }

  async notificarPagamentoConfirmado(clienteNome: string, email: string, telefone: string, valor?: number) {
    await this.notificarPagamentoRecebido(clienteNome, valor ?? 0, email, telefone);
  }

  async notificarTecnicoAgendado(
    clienteNome: string,
    email: string,
    telefone: string,
    horario: string,
    extra?: { whatsapp?: string | null; pedidoNumero?: string; servicoNome?: string; data?: string; horarioInicio?: string; horarioFim?: string }
  ) {
    if (extra?.data && extra.horarioInicio && extra.horarioFim) {
      await this.notificarAgendamentoConfirmado({
        clienteNome,
        email,
        telefone,
        whatsapp: extra.whatsapp,
        pedidoNumero: extra.pedidoNumero,
        data: extra.data,
        horarioInicio: extra.horarioInicio,
        horarioFim: extra.horarioFim,
        servicoNome: extra.servicoNome,
      });
      return;
    }
    const msg = `Olá, ${clienteNome}! Seu atendimento foi agendado para ${horario}.`;
    await this.enviarEmail(email, 'Atendimento agendado — ABS Resolve', this.template('Atendimento agendado', [msg]));
    await this.enviarWhatsApp(telefone, msg);
  }

  async notificarTecnicoACaminho(data: {
    email: string;
    telefone: string;
    clienteNome?: string;
    pedidoNumero?: string;
    tecnicoNome?: string;
  }) {
    const saudacao = data.clienteNome ? `Olá, ${data.clienteNome}!` : 'Olá!';
    const tecnico = data.tecnicoNome ? ` O técnico <strong>${data.tecnicoNome}</strong>` : ' Seu técnico';
    const pedido = data.pedidoNumero ? ` (pedido ${data.pedidoNumero})` : '';
    const msg = `${saudacao}${tecnico} está a caminho do seu endereço${pedido}.`;
    await this.enviarEmail(
      data.email,
      'Técnico a caminho — ABS Resolve',
      this.template('Técnico a caminho', [msg.replace(/<\/?strong>/g, '')])
    );
    await this.enviarWhatsApp(data.telefone, msg.replace(/<\/?strong>/g, ''));
  }

  async notificarTecnicoChegou(data: {
    email: string;
    telefone: string;
    clienteNome?: string;
    pedidoNumero?: string;
    tecnicoNome?: string;
  }) {
    const saudacao = data.clienteNome ? `Olá, ${data.clienteNome}!` : 'Olá!';
    const tecnico = data.tecnicoNome ? ` O técnico ${data.tecnicoNome}` : ' Seu técnico';
    const pedido = data.pedidoNumero ? ` (pedido ${data.pedidoNumero})` : '';
    const msg = `${saudacao}${tecnico} chegou ao local${pedido}. O serviço será iniciado em breve.`;
    await this.enviarEmail(
      data.email,
      'Técnico no local — ABS Resolve',
      this.template('Técnico chegou', [msg])
    );
    await this.enviarWhatsApp(data.telefone, msg);
  }

  async notificarServicoFinalizado(email: string, telefone: string) {
    const msg = 'Seu serviço foi concluído. Obrigado por confiar na ABS Resolve!';
    await this.enviarEmail(
      email,
      'Serviço finalizado — ABS Resolve',
      this.template('Serviço concluído', [msg])
    );
    await this.enviarWhatsApp(telefone, msg);
  }

  /** Link de redefinição de senha (esqueci minha senha) */
  async enviarResetSenha(data: {
    nome: string;
    email: string;
    telefone: string;
    whatsapp?: string | null;
    link: string;
  }) {
    const botao = `<p style="margin:16px 0"><a href="${data.link}" style="display:inline-block;background:#f59e0b;color:#1e293b;padding:12px 20px;border-radius:6px;text-decoration:none;font-weight:bold">Redefinir minha senha</a></p>`;
    await this.enviarEmail(
      data.email,
      'Redefinição de senha — ABS Resolve',
      this.template('Redefinição de senha', [
        `Olá, ${data.nome}!`,
        'Recebemos um pedido para redefinir a senha do seu acesso ao portal do cliente.',
        'Clique no botão abaixo para criar uma nova senha. O link expira em 1 hora.',
        'Se você não solicitou, ignore este e-mail — sua senha continua a mesma.',
      ], botao + `<p style="font-size:12px;color:#64748b;word-break:break-all">Ou copie o link: ${data.link}</p>`)
    );

    const msg =
      `🔐 *ABS Resolve — Redefinição de senha*\n\n` +
      `Olá, ${data.nome}!\n\n` +
      `Use o link abaixo para criar uma nova senha (válido por 1 hora):\n${data.link}\n\n` +
      `Se não foi você, ignore esta mensagem.`;
    await this.enviarWhatsApp(this.whatsappCliente(data), msg);
  }

  async notificarGarantiaEmitida(numero: string, email: string, telefone: string) {
    const msg = `Sua garantia ${numero} está disponível no portal do cliente.`;
    await this.enviarEmail(
      email,
      'Garantia emitida — ABS Resolve',
      this.template('Garantia emitida', [msg])
    );
    await this.enviarWhatsApp(telefone, msg);
  }

  async notificarMudancaStatus(
    tipo: string,
    identificador: string,
    novoStatus: string,
    email: string,
    telefone?: string
  ) {
    const label = ETAPAS_OS_LABEL[novoStatus] || novoStatus.replace(/_/g, ' ');
    const msg = `O status do ${tipo} ${identificador} foi atualizado para: ${label}.`;
    await this.enviarEmail(
      email,
      `Atualização do serviço — ${identificador}`,
      this.template('Atualização do serviço', [msg])
    );
    if (telefone) await this.enviarWhatsApp(telefone, msg);
  }

  async notificarPagamento(clienteNome: string, valor: number, status: string, email: string) {
    if (status === 'RECEIVED') {
      await this.notificarPagamentoRecebido(clienteNome, valor, email, '', undefined);
      return;
    }
    const msg = `Pagamento de ${formatarMoeda(valor)} — ${clienteNome}: status ${status}.`;
    await this.enviarEmail(
      email,
      'Atualização de pagamento — ABS Resolve',
      this.template('Atualização de pagamento', [msg])
    );
  }

  private async registrar(
    tipo: string,
    canal: string,
    destino: string,
    assunto: string | null,
    mensagem: string,
    status: string
  ) {
    await prisma.notificacao.create({
      data: { tipo, canal, destino, assunto: assunto ?? undefined, mensagem, status },
    });
  }
}

export const notificacaoService = new NotificacaoService();
