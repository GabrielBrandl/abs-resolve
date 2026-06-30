import fs from 'fs';
import path from 'path';
import {
  CUSTO_OPERACIONAL_BASE,
  CUSTO_PRODUTO_NIVEL,
} from '../config/catalogo.js';

export interface EspecificacaoDisjuntor {
  marca: string | null;
  modelo: string | null;
  nomeComercial: string | null;
  amperagem: string | null;
  tipo: string | null;
  curva: string | null;
  tensao: string | null;
  polos: number | null;
  estadoAparente: string | null;
  observacoes: string | null;
  compativelSubstituto: string | null;
}

export interface AnaliseIaResult {
  confianca: number;
  produtoIdentificado: string;
  nivelComplexidade: 1 | 2 | 3;
  descricao: string;
  acao: 'aprovacao_automatica' | 'solicitar_nova_foto' | 'nao_gerar_orcamento';
  validacaoOk: boolean;
  fonte: 'openai' | 'simulacao';
  especificacao?: EspecificacaoDisjuntor;
}

export type TipoDiagnostico = 'geral' | 'disjuntor' | 'chuveiro' | 'quadro';

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

function isDisjuntorContext(servicoSlug: string, opcoes?: Record<string, string>): boolean {
  const tipo = opcoes?.tipoDiagnostico?.toLowerCase();
  if (tipo === 'disjuntor') return true;
  return ['disjuntor', 'troca-disjuntor', 'diagnostico-disjuntor'].includes(servicoSlug);
}

function buildPrompt(servicoSlug: string, opcoes?: Record<string, string>): string {
  const contexto = opcoes?.descricao || opcoes?.contexto || '';
  const modeloInformado = opcoes?.modelo;

  if (isDisjuntorContext(servicoSlug, opcoes)) {
    return `Você é especialista elétrico da ABS Resolve Já. Analise as fotos de DISJUNTORES (quadro elétrico, etiqueta, frente do disjuntor).
${modeloInformado ? `Cliente informou: ${modeloInformado}. Valide se confere com a foto.` : ''}
${contexto ? `Contexto adicional: ${contexto}` : ''}

Identifique o máximo possível: marca (Schneider, Siemens, Steck, WEG, ABB etc.), modelo/código, nome comercial, amperagem (A), tipo (monopolar/bipolar/tripolar/DR/DPS), curva (B/C/D), tensão, número de polos, estado (ok/queimado/desgastado/antigo) e um substituto compatível sugerido.

Responda APENAS JSON válido:
{
  "confianca": number (0-100),
  "produtoIdentificado": string (nome resumido ex: "Disjuntor monopolar 20A curva C Steck"),
  "nivelComplexidade": 1|2|3,
  "descricao": string (diagnóstico em linguagem simples para o cliente),
  "especificacao": {
    "marca": string|null,
    "modelo": string|null,
    "nomeComercial": string|null,
    "amperagem": string|null,
    "tipo": string|null,
    "curva": string|null,
    "tensao": string|null,
    "polos": number|null,
    "estadoAparente": string|null,
    "observacoes": string|null,
    "compativelSubstituto": string|null
  }
}

Nível 1=troca simples mesmo modelo; 2=ajuste/conector ou modelo próximo; 3=quadro antigo/fiação/material extra.
Confiança >=90 se amperagem e tipo legíveis; 70-89 se parcial; <70 se foto ilegível.`;
  }

  return `Você é especialista elétrico/residencial da ABS Resolve Já. Analise as fotos do serviço "${servicoSlug}".
${modeloInformado ? `Cliente informou modelo: ${modeloInformado}. Valide se confere com a foto.` : ''}
${contexto ? `Contexto: ${contexto}` : ''}

Responda APENAS JSON válido:
{
  "confianca": number (0-100),
  "produtoIdentificado": string,
  "nivelComplexidade": 1|2|3,
  "descricao": string
}

Nível 1=troca simples, 2=ajustes/conector, 3=fiação/material extra.
Confiança >=90 se produto e complexidade claros; 70-89 se incerto; <70 se foto inadequada.`;
}

function parseEspecificacaoDisjuntor(raw: unknown): EspecificacaoDisjuntor | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const e = raw as Record<string, unknown>;
  return {
    marca: e.marca != null ? String(e.marca) : null,
    modelo: e.modelo != null ? String(e.modelo) : null,
    nomeComercial: e.nomeComercial != null ? String(e.nomeComercial) : null,
    amperagem: e.amperagem != null ? String(e.amperagem) : null,
    tipo: e.tipo != null ? String(e.tipo) : null,
    curva: e.curva != null ? String(e.curva) : null,
    tensao: e.tensao != null ? String(e.tensao) : null,
    polos: e.polos != null ? Number(e.polos) || null : null,
    estadoAparente: e.estadoAparente != null ? String(e.estadoAparente) : null,
    observacoes: e.observacoes != null ? String(e.observacoes) : null,
    compativelSubstituto: e.compativelSubstituto != null ? String(e.compativelSubstituto) : null,
  };
}

function parseIaResponse(raw: string, servicoSlug: string, opcoes?: Record<string, string>): Omit<AnaliseIaResult, 'fonte'> {
  try {
    const json = JSON.parse(raw.replace(/```json\n?|\n?```/g, '').trim());
    const confianca = Math.min(100, Math.max(0, Number(json.confianca) || 0));
    const nivel = Math.min(3, Math.max(1, Number(json.nivelComplexidade) || 1)) as 1 | 2 | 3;
    const especificacao = parseEspecificacaoDisjuntor(json.especificacao);
    return {
      confianca,
      produtoIdentificado: String(json.produtoIdentificado || servicoSlug),
      nivelComplexidade: nivel,
      descricao: String(json.descricao || DESCRICOES[nivel]),
      acao: acaoFromConfianca(confianca),
      validacaoOk: confianca >= 70,
      especificacao,
    };
  } catch {
    return analisarFotosSimulado(servicoSlug, ['fallback'], opcoes);
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

  const prompt = buildPrompt(servicoSlug, opcoesInformadas);

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: 800,
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
  return { ...parseIaResponse(content, servicoSlug, opcoesInformadas), fonte: 'openai' };
}

function simularDisjuntor(seed: number): EspecificacaoDisjuntor {
  const marcas = ['Steck', 'Schneider', 'Siemens', 'WEG'];
  const amps = ['16A', '20A', '25A', '32A', '40A'];
  const curvas = ['B', 'C', 'D'];
  const tipos = ['Monopolar', 'Bipolar', 'Tripolar'];
  const marca = marcas[seed % marcas.length];
  const amperagem = amps[seed % amps.length];
  const curva = curvas[seed % curvas.length];
  const tipo = tipos[seed % tipos.length];
  return {
    marca,
    modelo: `DW${100 + (seed % 50)}`,
    nomeComercial: `Disjuntor ${tipo} ${amperagem} curva ${curva}`,
    amperagem,
    tipo,
    curva,
    tensao: '127/220V',
    polos: tipo === 'Monopolar' ? 1 : tipo === 'Bipolar' ? 2 : 3,
    estadoAparente: seed % 4 === 0 ? 'Desgaste visível — recomendada troca' : 'Aparentemente operacional',
    observacoes: 'Identificação simulada — configure OPENAI_API_KEY para análise real por foto.',
    compativelSubstituto: `${marca} ${tipo} ${amperagem} curva ${curva} (padrão DIN)`,
  };
}

function analisarFotosSimulado(
  servicoSlug: string,
  fotos: string[],
  opcoesInformadas?: Record<string, string>
): Omit<AnaliseIaResult, 'fonte'> {
  const seed = fotos.join('').length + servicoSlug.length + (opcoesInformadas?.modelo?.length || 0);
  const confianca = Math.min(95, 55 + (seed % 45) + fotos.length * 5);
  const nivelComplexidade = ((seed % 3) + 1) as 1 | 2 | 3;

  if (isDisjuntorContext(servicoSlug, opcoesInformadas)) {
    const especificacao = simularDisjuntor(seed);
    return {
      confianca,
      produtoIdentificado: `${especificacao.marca} — ${especificacao.nomeComercial}`,
      nivelComplexidade,
      descricao: `Disjuntor identificado como ${especificacao.tipo} ${especificacao.amperagem}, curva ${especificacao.curva}. ${especificacao.estadoAparente}.`,
      acao: acaoFromConfianca(confianca),
      validacaoOk: confianca >= 70,
      especificacao,
    };
  }

  const produtos: Record<string, string> = {
    disjuntor: 'Disjuntor monopolar 20A',
    'troca-disjuntor': 'Disjuntor monopolar 20A',
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
