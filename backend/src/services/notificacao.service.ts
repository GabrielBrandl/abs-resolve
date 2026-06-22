import nodemailer from 'nodemailer';
import { prisma } from '../utils/prisma.js';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: false,
  auth: process.env.SMTP_USER
    ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    : undefined,
});

export class NotificacaoService {
  async enviarEmail(destino: string, assunto: string, html: string) {
    try {
      if (process.env.SMTP_HOST) {
        await transporter.sendMail({
          from: process.env.SMTP_FROM || 'noreply@absresolve.com.br',
          to: destino,
          subject: assunto,
          html,
        });
      }
      await this.registrar('email', 'email', destino, assunto, html, 'enviada');
    } catch {
      await this.registrar('email', 'email', destino, assunto, html, 'falha');
    }
  }

  async enviarWhatsApp(telefone: string, mensagem: string) {
    try {
      if (process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_API_URL) {
        await fetch(`${process.env.WHATSAPP_API_URL}/message/sendText`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: process.env.WHATSAPP_TOKEN,
          },
          body: JSON.stringify({ number: telefone, text: mensagem }),
        });
      }
      await this.registrar('whatsapp', 'whatsapp', telefone, null, mensagem, 'enviada');
    } catch {
      await this.registrar('whatsapp', 'whatsapp', telefone, null, mensagem, 'falha');
    }
  }

  async notificarNovoPedido(clienteNome: string, numero: string, email: string, telefone: string) {
    const msg = `Seu pedido foi recebido. Número: ${numero}.`;
    await this.enviarEmail(email, 'Pedido recebido — ABS Resolve', `<p>${msg}</p>`);
    await this.enviarWhatsApp(telefone, msg);
  }

  async notificarPedidoCriado(clienteNome: string, numero: string, email: string, telefone: string) {
    await this.notificarNovoPedido(clienteNome, numero, email, telefone);
  }

  async notificarPagamentoConfirmado(clienteNome: string, email: string, telefone: string) {
    const msg = 'Pagamento aprovado. Seu atendimento será confirmado em breve.';
    await this.enviarEmail(email, 'Pagamento confirmado — ABS Resolve', `<p>${msg}</p>`);
    await this.enviarWhatsApp(telefone, msg);
  }

  async notificarTecnicoAgendado(clienteNome: string, email: string, telefone: string, horario: string) {
    const msg = `Seu atendimento foi agendado para ${horario}.`;
    await this.enviarEmail(email, 'Técnico agendado — ABS Resolve', `<p>${msg}</p>`);
    await this.enviarWhatsApp(telefone, msg);
  }

  async notificarTecnicoACaminho(email: string, telefone: string) {
    const msg = 'Seu técnico está a caminho.';
    await this.enviarEmail(email, 'Técnico a caminho — ABS Resolve', `<p>${msg}</p>`);
    await this.enviarWhatsApp(telefone, msg);
  }

  async notificarServicoFinalizado(email: string, telefone: string) {
    const msg = 'Seu serviço foi concluído. Obrigado por confiar na ABS Resolve!';
    await this.enviarEmail(email, 'Serviço finalizado — ABS Resolve', `<p>${msg}</p>`);
    await this.enviarWhatsApp(telefone, msg);
  }

  async notificarGarantiaEmitida(numero: string, email: string, telefone: string) {
    const msg = `Sua garantia ${numero} está disponível no portal do cliente.`;
    await this.enviarEmail(email, 'Garantia emitida — ABS Resolve', `<p>${msg}</p>`);
    await this.enviarWhatsApp(telefone, msg);
  }

  async notificarMudancaStatus(tipo: string, identificador: string, novoStatus: string, email: string) {
    const msg = `Status do ${tipo} ${identificador} alterado para: ${novoStatus}.`;
    await this.enviarEmail(email, `Atualização de status — ${identificador}`, `<p>${msg}</p>`);
  }

  async notificarPagamento(clienteNome: string, valor: number, status: string, email: string) {
    const msg = `Pagamento de R$ ${valor.toFixed(2)} — ${clienteNome}: ${status}.`;
    await this.enviarEmail(email, 'Atualização de pagamento', `<p>${msg}</p>`);
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
