import { PERGUNTA_TIPO_POR_SLUG } from '../config/imagens-opcoes';

interface Atributo {
  label: string;
  valor: string;
}

interface Espec {
  tipo?: string | null;
  atributos?: Atributo[];
  estadoAparente?: string | null;
}

function norm(s?: string | null): string {
  return (s || '').toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

function pick(map: Array<[RegExp, string]>, text: string): string | undefined {
  for (const [re, id] of map) {
    if (re.test(text)) return id;
  }
  return undefined;
}

const MAPAS_TIPO: Record<string, Array<[RegExp, string]>> = {
  'troca-tomada': [
    [/20\s*a|20a/, 'tomada-20a'],
    [/dupla/, 'dupla'],
    [/simples/, 'simples'],
  ],
  'troca-interruptor': [
    [/intermedi/, 'intermediario'],
    [/paralel/, 'paralelo'],
    [/tripl/, 'triplo'],
    [/dupl/, 'duplo'],
    [/simples/, 'simples'],
  ],
  'troca-disjuntor': [
    [/\bdr\b|diferencial/, 'dr'],
    [/tripolar|3\s*polo/, 'tripolar'],
    [/bipolar|2\s*polo/, 'bipolar'],
    [/monopolar|1\s*polo/, 'monopolar'],
  ],
  'instalacao-chuveiro': [
    [/manut/, 'manutencao'],
    [/instal|novo/, 'instalacao-nova'],
    [/troca/, 'troca-chuveiro'],
  ],
  'instalacao-luminaria': [
    [/pendente/, 'pendente'],
    [/spot/, 'spot'],
    [/arandela/, 'arandela'],
    [/plafon/, 'plafon'],
  ],
};

export function mapearDiagnosticoParaRespostas(
  slug: string,
  spec: Espec
): Record<string, string> {
  const out: Record<string, string> = {};
  const texto = norm([spec.tipo, ...(spec.atributos || []).map((a) => `${a.label} ${a.valor}`)].join(' '));
  const perguntaTipo = PERGUNTA_TIPO_POR_SLUG[slug];

  if (perguntaTipo && MAPAS_TIPO[slug]) {
    const opcao = pick(MAPAS_TIPO[slug], texto);
    if (opcao) out[perguntaTipo] = opcao;
  }

  if (spec.estadoAparente) {
    const est = norm(spec.estadoAparente);
    if (slug === 'troca-tomada') {
      if (/queim|derret/.test(est)) out.estadoAtual = 'queimada';
      else if (/aquec/.test(est)) out.estadoAtual = 'aquecendo';
      else if (/nao|defeito/.test(est)) out.estadoAtual = 'nao-funciona';
      else out.estadoAtual = 'funcionando';
    }
    if (slug === 'troca-interruptor') {
      if (/nao|defeito/.test(est)) out.estadoInterruptor = 'nao-funciona';
      else if (/parcial/.test(est)) out.estadoInterruptor = 'funciona-parcialmente';
      else out.estadoInterruptor = 'funciona';
    }
  }

  return out;
}
