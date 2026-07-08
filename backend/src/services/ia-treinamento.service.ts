import { prisma } from '../utils/prisma.js';

export class IaTreinamentoService {
  async listar() {
    return prisma.iaConhecimento.findMany({
      orderBy: { createdAt: 'desc' },
      include: { admin: { select: { nome: true } } },
    });
  }

  async adicionar(
    adminId: string,
    data: { conteudo: string; categoria?: string; servicoSlug?: string }
  ) {
    const conteudo = data.conteudo.trim();
    if (!conteudo) throw new Error('Conteúdo obrigatório');

    return prisma.iaConhecimento.create({
      data: {
        conteudo,
        categoria: data.categoria || (data.servicoSlug ? 'servico' : 'geral'),
        servicoSlug: data.servicoSlug || null,
        adminId,
      },
      include: { admin: { select: { nome: true } } },
    });
  }

  async atualizar(id: string, data: { ativo?: boolean; conteudo?: string }) {
    return prisma.iaConhecimento.update({
      where: { id },
      data: {
        ...(data.ativo !== undefined && { ativo: data.ativo }),
        ...(data.conteudo !== undefined && { conteudo: data.conteudo.trim() }),
      },
    });
  }

  async excluir(id: string) {
    await prisma.iaConhecimento.delete({ where: { id } });
    return { id, deleted: true };
  }

  async buscarConhecimentoAtivo(servicoSlug?: string | null, limite = 30) {
    return prisma.iaConhecimento.findMany({
      where: {
        ativo: true,
        OR: servicoSlug
          ? [{ categoria: 'geral' }, { servicoSlug }]
          : [{ categoria: 'geral' }],
      },
      orderBy: { createdAt: 'desc' },
      take: limite,
    });
  }

  async chat(
    adminId: string,
    mensagem: string,
    opts?: { servicoSlug?: string; salvar?: boolean }
  ) {
    const texto = mensagem.trim();
    if (!texto) throw new Error('Mensagem obrigatória');

    const salvar = opts?.salvar !== false;
    let conhecimento = null;

    if (salvar) {
      conhecimento = await this.adicionar(adminId, {
        conteudo: texto,
        servicoSlug: opts?.servicoSlug,
      });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    let resposta =
      'Conhecimento registrado com sucesso. A IA usará esta informação nos próximos diagnósticos.';

    if (apiKey) {
      try {
        const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
        const contextoServico = opts?.servicoSlug
          ? `Este conhecimento é específico para o serviço "${opts.servicoSlug}".`
          : 'Este conhecimento é geral para todos os serviços.';

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            max_tokens: 400,
            messages: [
              {
                role: 'system',
                content:
                  'Você é assistente de treinamento da IA de diagnóstico técnico da ABS Resolve. ' +
                  'Confirme o registro do conhecimento de forma breve e profissional em português. ' +
                  'Resuma em 1-2 frases o que foi aprendido e como a IA pode usar isso.',
              },
              {
                role: 'user',
                content: `${contextoServico}\n\nConhecimento registrado pelo admin:\n${texto}`,
              },
            ],
          }),
        });

        if (response.ok) {
          const data = (await response.json()) as {
            choices?: Array<{ message?: { content?: string } }>;
          };
          const content = data.choices?.[0]?.message?.content?.trim();
          if (content) resposta = content;
        }
      } catch (err) {
        console.warn('IA treinamento — confirmação OpenAI falhou:', err);
      }
    }

    return { resposta, conhecimento };
  }
}

export const iaTreinamentoService = new IaTreinamentoService();
