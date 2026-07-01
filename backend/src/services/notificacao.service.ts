import nodemailer from 'nodemailer';
import { prisma } from '../utils/prisma.js';
import { normalizarTelefoneWhatsApp, telefoneWhatsAppCliente } from '../utils/telefone.js';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: false,
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
  private template(titulo: string, paragrafos: string[], extraHtml = '') {
    const corpo = paragrafos.map((p) => `<p style="margin:0 0 12px;line-height:1.5">${p}</p>`).join('');
    return `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#1e293b">
        <div style="background:#0f2744;color:#fff;padding:16px 20px;border-radius:8px 8px 0 0">
          <strong>ABS Resolve Já</strong>
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

  async enviarEmail(destino: string, assunto: string, html: string) {
    try {
      if (process.env.SMTP_HOST) {
        await transporter.sendMail({
          from: process.env.SMTP_FROM || 'noreply@absresolve.com.br',
          to: destino,
          subject: assunto,
          html,
        });
      } else if (process.env.NODE_ENV !== 'production') {
        console.info(`[email] ${destino} — ${assunto}`);
      }
      await this.registrar('email', 'email', destino, assunto, html, 'enviada');
    } catch {
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
      if (process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_API_URL) {
        const res = await fetch(`${process.env.WHATSAPP_API_URL}/message/sendText`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: process.env.WHATSAPP_TOKEN,
          },
          body: JSON.stringify({ number: numero, text: mensagem }),
        });
        if (!res.ok) {
          const body = await res.text().catch(() => '');
          throw new Error(body || `HTTP ${res.status}`);
        }
      } else if (process.env.NODE_ENV !== 'production') {
        console.info(`[whatsapp] ${numero} — ${mensagem.slice(0, 120)}...`);
      }
      await this.registrar('whatsapp', 'whatsapp', numero, null, mensagem, 'enviada');
      return true;
    } catch (err) {
      console.warn('[whatsapp] falha ao enviar:', err instanceof Error ? err.message : err);
      await this.registrar('whatsapp', 'whatsapp', numero, null, mensagem, 'falha');
      return false;
    }
  }

  private whatsappCliente(cliente: { telefone: string; whatsapp?: string | null }) {
    return telefoneWhatsAppCliente(cliente);
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
      'Pedido recebido — ABS Resolve',
      this.template('Pedido recebido', [msg])
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
  }) {
    const metodo = METODO_PAGAMENTO_LABEL[data.metodo] || data.metodo;
    const valor = formatarMoeda(data.valor);
    const venc = formatarData(data.vencimento);
    const ref = data.pedidoNumero ? ` referente ao pedido <strong>${data.pedidoNumero}</strong>` : '';
    const msg = `Olá, ${data.clienteNome}! Foi gerada uma cobrança de ${valor} via ${metodo}, com vencimento em ${venc}${data.pedidoNumero ? ` (pedido ${data.pedidoNumero})` : ''}.`;
    const linkHtml = data.linkPagamento
      ? `<p><a href="${data.linkPagamento}" style="display:inline-block;background:#f59e0b;color:#1e293b;padding:10px 16px;border-radius:6px;text-decoration:none;font-weight:bold">Pagar agora</a></p>`
      : '';
    await this.enviarEmail(
      data.email,
      'Nova cobrança — ABS Resolve',
      this.template('Nova cobrança disponível', [
        `Olá, ${data.clienteNome}!`,
        `Geramos uma cobrança de <strong>${valor}</strong> via ${metodo}${ref}, com vencimento em <strong>${venc}</strong>.`,
        'Assim que o pagamento for confirmado, daremos continuidade ao seu atendimento.',
      ], linkHtml)
    );
    await this.enviarWhatsApp(
      data.telefone,
      msg + (data.linkPagamento ? ` Link: ${data.linkPagamento}` : '')
    );
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
