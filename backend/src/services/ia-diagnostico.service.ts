import fs from 'fs';
import path from 'path';
import {
  CUSTO_OPERACIONAL_BASE,
  CUSTO_PRODUTO_NIVEL,
} from '../config/catalogo.js';

export interface AnaliseIaResult {
  confianca: number;
  produtoIdentificado: string;
  nivelComplexidade: 1 | 2 | 3;
  descricao: string;
  acao: 'aprovacao_automatica' | 'solicitar_nova_foto' | 'nao_gerar_orcamento';
  validacaoOk: boolean;
  fonte: 'openai' | 'simulacao';
}

const DESCRICOES: Record<number, string> = {
  1: 'Troca simples',
  2: 'Troca com pequenos ajustes / conector',
  3: 'Necessita material complementar e possível troca de fiação',
};

function acaoFromConfianca(confianca: number): AnaliseIaResult['acao'] {
  if (confianca >= 90) return 'aprovacao_automatica';
  if (confianca >= 70) return 'solicitar_nova_foto';
  return 'nao_gerar_orcamento';
}

function parseIaResponse(raw: string, servicoSlug: string): Omit<AnaliseIaResult, 'fonte'> {
  try {
    const json = JSON.parse(raw.replace(/```json\n?|\n?```/g, '').trim());
    const confianca = Math.min(100, Math.max(0, Number(json.confianca) || 0));
    const nivel = Math.min(3, Math.max(1, Number(json.nivelComplexidade) || 1)) as 1 | 2 | 3;
    return {
      confianca,
      produtoIdentificado: String(json.produtoIdentificado || servicoSlug),
      nivelComplexidade: nivel,
      descricao: String(json.descricao || DESCRICOES[nivel]),
      acao: acaoFromConfianca(confianca),
      validacaoOk: confianca >= 70,
    };
  } catch {
    return analisarFotosSimulado(servicoSlug, ['fallback']);
  }
}

async function fotoParaOpenAI(url: string): Promise<{ type: 'image_url'; image_url: { url: string } }> {
  if (url.startsWith('data:')) {
    return { type: 'image_url', image_url: { url } };
  }

  const apiPublic = process.env.API_PUBLIC_URL || 'http://localhost:3001';
  if (url.includes('/uploads/') || url.startsWith(apiPublic)) {
    const filename = url.split('/uploads/').pop()?.split('?')[0];
    if (filename) {
      const filepath = path.join(process.env.UPLOAD_DIR || 'uploads', filename);
      if (fs.existsSync(filepath)) {
        const buffer = fs.readFileSync(filepath);
        const ext = path.extname(filename).slice(1) || 'jpeg';
        const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
        const b64 = `data:${mime};base64,${buffer.toString('base64')}`;
        return { type: 'image_url', image_url: { url: b64 } };
      }
    }
  }

  return { type: 'image_url', image_url: { url } };
}

async function analisarComOpenAI(
  servicoSlug: string,
  fotos: string[],
  opcoesInformadas?: Record<string, string>
): Promise<AnaliseIaResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return { ...analisarFotosSimulado(servicoSlug, fotos, opcoesInformadas), fonte: 'simulacao' };
  }

  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const imageParts = await Promise.all(fotos.map(fotoParaOpenAI));

  const prompt = `Você é especialista elétrico da ABS Resolve Já. Analise as fotos do serviço "${servicoSlug}".
${opcoesInformadas?.modelo ? `Cliente informou modelo: ${opcoesInformadas.modelo}. Valide se confere com a foto.` : ''}

Responda APENAS JSON válido:
{
  "confianca": number (0-100),
  "produtoIdentificado": string,
  "nivelComplexidade": 1|2|3,
  "descricao": string
}

Nível 1=troca simples, 2=ajustes/conector, 3=fiação/material extra.
Confiança >=90 se produto e complexidade claros; 70-89 se incerto; <70 se foto inadequada.`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: [{ type: 'text', text: prompt }, ...imageParts],
      }],
    }),
  });

  if (!response.ok) {
    console.warn('OpenAI falhou, usando simulação:', await response.text());
    return { ...analisarFotosSimulado(servicoSlug, fotos, opcoesInformadas), fonte: 'simulacao' };
  }

  const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  const content = data.choices?.[0]?.message?.content || '{}';
  return { ...parseIaResponse(content, servicoSlug), fonte: 'openai' };
}

function analisarFotosSimulado(
  servicoSlug: string,
  fotos: string[],
  opcoesInformadas?: Record<string, string>
): Omit<AnaliseIaResult, 'fonte'> {
  const seed = fotos.join('').length + servicoSlug.length + (opcoesInformadas?.modelo?.length || 0);
  const confianca = Math.min(95, 55 + (seed % 45) + fotos.length * 5);
  const nivelComplexidade = ((seed % 3) + 1) as 1 | 2 | 3;
  const produtos: Record<string, string> = {
    disjuntor: 'Disjuntor monopolar 20A',
    chuveiro: 'Chuveiro elétrico 5500W',
    luminaria: 'Luminária de teto LED',
    ventilador: 'Ventilador de teto',
    registro: 'Registro de gaveta 3/4"',
    'ar-condicionado': 'Split inverter 12000 BTUs',
  };
  return {
    confianca,
    produtoIdentificado: produtos[servicoSlug] || servicoSlug,
    nivelComplexidade,
    descricao: DESCRICOES[nivelComplexidade],
    acao: acaoFromConfianca(confianca),
    validacaoOk: confianca >= 70,
  };
}

export async function analisarFotos(
  servicoSlug: string,
  fotos: string[],
  opcoesInformadas?: Record<string, string>
): Promise<AnaliseIaResult> {
  if (!fotos.length) {
    return {
      confianca: 0,
      produtoIdentificado: 'Desconhecido',
      nivelComplexidade: 1,
      descricao: 'Nenhuma foto enviada',
      acao: 'nao_gerar_orcamento',
      validacaoOk: false,
      fonte: 'simulacao',
    };
  }

  return analisarComOpenAI(servicoSlug, fotos, opcoesInformadas);
}

export function custosParaServico(servicoSlug: string, nivel: number) {
  const operacional = CUSTO_OPERACIONAL_BASE[servicoSlug] || 50;
  const produto = CUSTO_PRODUTO_NIVEL[nivel] || 30;
  return { custoOperacional: operacional, custoProduto: produto };
}
