import fs from 'fs';
import path from 'path';
import {
  CUSTO_OPERACIONAL_BASE,
  CUSTO_PRODUTO_NIVEL,
} from '../config/catalogo.js';
import { CATEGORIAS, SERVICOS_CATALOGO } from '../config/catalogo-servicos.js';

export interface AtributoProduto {
  label: string;
  valor: string;
}

export interface EspecificacaoProduto {
  categoriaProduto: string | null;
  servicoCatalogoSlug: string | null;
  servicoCatalogoNome: string | null;
  modelo: string | null;
  nomeComercial: string | null;
  tipo: string | null;
  atributos: AtributoProduto[];
  estadoAparente: string | null;
  compativelSubstituto: string | null;
  observacoes: string | null;
}

/** @deprecated use EspecificacaoProduto */
export type EspecificacaoDisjuntor = EspecificacaoProduto;

export interface AnaliseIaResult {
  confianca: number;
  produtoIdentificado: string;
  nivelComplexidade: 1 | 2 | 3;
  descricao: string;
  acao: 'aprovacao_automatica' | 'solicitar_nova_foto' | 'nao_gerar_orcamento';
  validacaoOk: boolean;
  fonte: 'openai' | 'simulacao';
  especificacao?: EspecificacaoProduto;
}

const SLUG_ALIASES: Record<string, string> = {
  disjuntor: 'troca-disjuntor',
  chuveiro: 'instalacao-chuveiro',
  tomada: 'troca-tomada',
  interruptor: 'troca-interruptor',
  luminaria: 'instalacao-luminaria',
  ventilador: 'instalacao-ventilador-teto',
  registro: 'troca-registro',
  'ar-condicionado': 'instalacao-ar-split',
};

const DICAS_FOTO: Record<string, string> = {
  'troca-disjuntor': 'Frente do disjuntor, etiqueta/código e visão do quadro',
  'instalacao-chuveiro': 'Chuveiro completo, resistência/etiqueta de potência e registro',
  'troca-tomada': 'Tomada de frente, lateral (pinos) e caixa de luz se possível',
  'troca-interruptor': 'Interruptor, modelo e quantidade de teclas',
  'instalacao-luminaria': 'Luminária, soquete/lâmpada e ponto no teto',
  'instalacao-ventilador-teto': 'Ventilador, hélices, controle e fixação',
  'troca-torneira': 'Torneira, bica e tipo de encaixe',
  'troca-registro': 'Registro, volante e tubulação visível',
  'instalacao-ar-split': 'Unidade interna/externa, etiqueta BTU e modelo',
};

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

function resolverSlugCatalogo(servicoSlug: string, opcoes?: Record<string, string>): string | null {
  const hint = opcoes?.servicoCatalogoSlug || opcoes?.tipoDiagnostico;
  if (hint && hint !== 'geral' && hint !== 'auto') {
    return SLUG_ALIASES[hint] || hint;
  }
  const mapped = SLUG_ALIASES[servicoSlug] || servicoSlug;
  if (SERVICOS_CATALOGO.some((s) => s.slug === mapped)) return mapped;
  if (servicoSlug.startsWith('diagnostico-')) return null;
  return null;
}

function catalogoResumo(): string {
  return CATEGORIAS.map((cat) => {
    const servicos = SERVICOS_CATALOGO.filter((s) => s.categoria === cat.slug)
      .map((s) => `  - ${s.slug}: ${s.nome}`)
      .join('\n');
    return `${cat.nome}:\n${servicos}`;
  }).join('\n\n');
}

function camposPorServico(slug: string | null): string {
  const guias: Record<string, string> = {
    'troca-disjuntor': 'amperagem, curva (B/C/D), polos, tensão, tipo (DR/monopolar/bipolar/tripolar)',
    'instalacao-chuveiro': 'potência (W), tensão (127/220V), tipo (duo/turbo/eletrônico), material',
    'troca-tomada': 'amperagem (10A/20A), padrão (2P/2P+T), tipo (simples/dupla/USB), cor',
    'troca-interruptor': 'teclas (simples/duplo/triplo), linha, tensão',
    'instalacao-luminaria': 'tipo (plafon/pendente/spot), soquete, potência',
    'instalacao-ventilador-teto': 'pás, controle (parede/remoto), lâmpada integrada',
    'troca-torneira': 'tipo (parede/bancada/cozinha), bica, acabamento',
    'troca-registro': 'tipo (gaveta/pressão/esfera), diâmetro, material',
    'instalacao-ar-split': 'BTUs, modelo split, gas refrigerante, inverter',
  };
  if (slug && guias[slug]) {
    return `Priorize identificar: ${guias[slug]}.`;
  }
  return 'Identifique atributos técnicos relevantes ao produto (amperagem, potência, dimensão, material, etc.).';
}

function buildPrompt(servicoSlug: string, opcoes?: Record<string, string>): string {
  const contexto = opcoes?.descricao || opcoes?.contexto || '';
  const modeloInformado = opcoes?.modelo;
  const slugCatalogo = resolverSlugCatalogo(servicoSlug, opcoes);
  const servicoNome = slugCatalogo
    ? SERVICOS_CATALOGO.find((s) => s.slug === slugCatalogo)?.nome
    : null;

  return `Você é especialista técnico da ABS Resolve Já (elétrica, hidráulica, montagem, ar-condicionado).
Analise as fotos e IDENTIFIQUE O PRODUTO/EQUIPAMENTO com o máximo de detalhes possível.
${servicoNome ? `O cliente indica que a foto é de: "${servicoNome}" (${slugCatalogo}). Confirme ou corrija.` : 'Determine automaticamente qual produto das categorias abaixo melhor corresponde à foto.'}
${modeloInformado ? `Cliente informou modelo: ${modeloInformado}. Valide com a foto.` : ''}
${contexto ? `Contexto: ${contexto}` : ''}

${camposPorServico(slugCatalogo)}

Catálogo de serviços ABS Resolve (associe o produto ao slug mais próximo):
${catalogoResumo()}

Responda APENAS JSON válido:
{
  "confianca": number (0-100),
  "produtoIdentificado": string (nome resumido legível),
  "nivelComplexidade": 1|2|3,
  "descricao": string (diagnóstico simples para o cliente),
  "especificacao": {
    "categoriaProduto": string|null (ex: disjuntor, chuveiro, tomada, torneira),
    "servicoCatalogoSlug": string|null (slug do catálogo acima),
    "servicoCatalogoNome": string|null,
    "modelo": string|null,
    "nomeComercial": string|null,
    "tipo": string|null (tipo/subtipo do produto),
    "atributos": [{"label": string, "valor": string}] (amperagem, potência, BTU, etc.),
    "estadoAparente": string|null,
    "compativelSubstituto": string|null,
    "observacoes": string|null
  }
}

Nível 1=troca/instalação simples; 2=ajustes ou peça próxima; 3=material extra/fiação/reparo maior.
Confiança >=90 identificação clara; 70-89 parcial; <70 foto inadequada.`;
}

function parseAtributos(raw: unknown): AtributoProduto[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((a) => a && typeof a === 'object')
    .map((a) => {
      const item = a as Record<string, unknown>;
      const label = item.label != null ? String(item.label) : '';
      const valor = item.valor != null ? String(item.valor) : '';
      return { label, valor };
    })
    .filter((a) => a.label && a.valor);
}

function legadoDisjuntorParaAtributos(e: Record<string, unknown>): AtributoProduto[] {
  const map: Array<[string, string]> = [
    ['Amperagem', 'amperagem'],
    ['Curva', 'curva'],
    ['Tensão', 'tensao'],
    ['Polos', 'polos'],
  ];
  const attrs: AtributoProduto[] = [];
  for (const [label, key] of map) {
    const val = e[key];
    if (val != null && val !== '') attrs.push({ label, valor: String(val) });
  }
  return attrs;
}

function parseEspecificacaoProduto(raw: unknown): EspecificacaoProduto | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const e = raw as Record<string, unknown>;
  let atributos = parseAtributos(e.atributos);
  if (!atributos.length && e.amperagem) {
    atributos = legadoDisjuntorParaAtributos(e);
  }
  return {
    categoriaProduto: e.categoriaProduto != null ? String(e.categoriaProduto) : null,
    servicoCatalogoSlug: e.servicoCatalogoSlug != null ? String(e.servicoCatalogoSlug) : null,
    servicoCatalogoNome: e.servicoCatalogoNome != null ? String(e.servicoCatalogoNome) : null,
    modelo: e.modelo != null ? String(e.modelo) : null,
    nomeComercial: e.nomeComercial != null ? String(e.nomeComercial) : null,
    tipo: e.tipo != null ? String(e.tipo) : null,
    atributos,
    estadoAparente: e.estadoAparente != null ? String(e.estadoAparente) : null,
    compativelSubstituto: e.compativelSubstituto != null ? String(e.compativelSubstituto) : null,
    observacoes: e.observacoes != null ? String(e.observacoes) : null,
  };
}

function parseIaResponse(raw: string, servicoSlug: string, opcoes?: Record<string, string>): Omit<AnaliseIaResult, 'fonte'> {
  try {
    const json = JSON.parse(raw.replace(/```json\n?|\n?```/g, '').trim());
    const confianca = Math.min(100, Math.max(0, Number(json.confianca) || 0));
    const nivel = Math.min(3, Math.max(1, Number(json.nivelComplexidade) || 1)) as 1 | 2 | 3;
    const especificacao = parseEspecificacaoProduto(json.especificacao);
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
      max_tokens: 1000,
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

const SIMULACOES: Record<string, Omit<EspecificacaoProduto, 'observacoes'>> = {
  'troca-disjuntor': {
    categoriaProduto: 'disjuntor',
    servicoCatalogoSlug: 'troca-disjuntor',
    servicoCatalogoNome: 'Troca de disjuntor',
    modelo: 'DW120',
    nomeComercial: 'Disjuntor monopolar 20A curva C',
    tipo: 'Monopolar',
    atributos: [
      { label: 'Amperagem', valor: '20A' },
      { label: 'Curva', valor: 'C' },
      { label: 'Tensão', valor: '127/220V' },
      { label: 'Polos', valor: '1' },
    ],
    estadoAparente: 'Aparentemente operacional',
    compativelSubstituto: 'Steck monopolar 20A curva C (padrão DIN)',
  },
  'instalacao-chuveiro': {
    categoriaProduto: 'chuveiro',
    servicoCatalogoSlug: 'instalacao-chuveiro',
    servicoCatalogoNome: 'Instalação de chuveiro',
    modelo: 'Advanced Turbo',
    nomeComercial: 'Chuveiro eletrônico 7500W',
    tipo: 'Eletrônico',
    atributos: [
      { label: 'Potência', valor: '7500W' },
      { label: 'Tensão', valor: '220V' },
      { label: 'Pressurização', valor: 'Turbo' },
    ],
    estadoAparente: 'Resistência pode precisar de verificação',
    compativelSubstituto: 'Chuveiro 7500W 220V com disjuntor 32A dedicado',
  },
  'troca-tomada': {
    categoriaProduto: 'tomada',
    servicoCatalogoSlug: 'troca-tomada',
    servicoCatalogoNome: 'Troca de tomada',
    modelo: 'Linha Norma',
    nomeComercial: 'Tomada 2P+T 20A',
    tipo: 'Simples',
    atributos: [
      { label: 'Amperagem', valor: '20A' },
      { label: 'Padrão', valor: '2P+T' },
      { label: 'Cor', valor: 'Branco' },
    ],
    estadoAparente: 'Contatos com sinais de aquecimento',
    compativelSubstituto: 'Tomada 20A 2P+T padrão NBR',
  },
  'troca-interruptor': {
    categoriaProduto: 'interruptor',
    servicoCatalogoSlug: 'troca-interruptor',
    servicoCatalogoNome: 'Troca de interruptor',
    modelo: 'Merten',
    nomeComercial: 'Interruptor simples 10A',
    tipo: 'Simples',
    atributos: [{ label: 'Teclas', valor: '1' }, { label: 'Tensão', valor: '127/220V' }],
    estadoAparente: 'Funcional',
    compativelSubstituto: 'Interruptor simples 10A compatível com caixa 4x2',
  },
};

function simularProduto(slugCatalogo: string | null, seed: number): EspecificacaoProduto {
  const slug =
    slugCatalogo && SIMULACOES[slugCatalogo]
      ? slugCatalogo
      : slugCatalogo && SERVICOS_CATALOGO.some((s) => s.slug === slugCatalogo)
        ? slugCatalogo
        : Object.keys(SIMULACOES)[seed % Object.keys(SIMULACOES).length];

  if (SIMULACOES[slug]) {
    return {
      ...SIMULACOES[slug],
      observacoes: 'Identificação simulada — configure OPENAI_API_KEY para análise real por foto.',
    };
  }

  const cat = SERVICOS_CATALOGO.find((s) => s.slug === slug) ?? SERVICOS_CATALOGO[seed % SERVICOS_CATALOGO.length];
  return {
    categoriaProduto: cat.categoria,
    servicoCatalogoSlug: cat.slug,
    servicoCatalogoNome: cat.nome,
    modelo: `MOD-${100 + (seed % 99)}`,
    nomeComercial: cat.nome,
    tipo: cat.categoria,
    atributos: [{ label: 'Serviço', valor: cat.nome }],
    estadoAparente: 'Necessita avaliação presencial',
    compativelSubstituto: 'Consulte técnico ABS Resolve',
    observacoes: 'Identificação simulada — configure OPENAI_API_KEY para análise real por foto.',
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
  const slugCatalogo = resolverSlugCatalogo(servicoSlug, opcoesInformadas);
  const especificacao = simularProduto(slugCatalogo, seed);

  return {
    confianca,
    produtoIdentificado: especificacao.nomeComercial || especificacao.tipo || 'Produto identificado',
    nivelComplexidade,
    descricao: `${especificacao.servicoCatalogoNome}: ${especificacao.estadoAparente}.`,
    acao: acaoFromConfianca(confianca),
    validacaoOk: confianca >= 70,
    especificacao,
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
  const slug = SLUG_ALIASES[servicoSlug] || servicoSlug;
  const operacional = CUSTO_OPERACIONAL_BASE[servicoSlug] || CUSTO_OPERACIONAL_BASE[slug] || 50;
  const produto = CUSTO_PRODUTO_NIVEL[nivel] || 30;
  return { custoOperacional: operacional, custoProduto: produto };
}

export function dicaFotoDiagnostico(servicoSlug: string): string {
  const slug = SLUG_ALIASES[servicoSlug] || servicoSlug;
  return DICAS_FOTO[slug] || 'Fotos nítidas do produto, etiqueta/modelo e local de instalação';
}

export function listarServicosDiagnostico() {
  return CATEGORIAS.map((cat) => ({
    ...cat,
    servicos: SERVICOS_CATALOGO.filter((s) => s.categoria === cat.slug).map((s) => ({
      slug: s.slug,
      nome: s.nome,
      dicaFoto: DICAS_FOTO[s.slug] || 'Foto nítida do produto e etiqueta se houver',
    })),
  }));
}
