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
    const msg = `Novo pedido ${numero} criado para ${clienteNome}.`;
    await this.enviarEmail(email, `Pedido ${numero} recebido`, `<p>${msg}</p>`);
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
