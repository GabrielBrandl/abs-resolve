import { SERVICOS_CATALOGO } from './catalogo-servicos.js';
import { getFluxo, type RespostasFluxo, type SlugFluxoServico } from './fluxo-servicos.js';

export interface PrecoFluxoBreakdownItem {
  label: string;
  valor: number;
}

export interface ResultadoPrecoFluxo {
  preco: number;
  breakdown: PrecoFluxoBreakdownItem[];
  requerValidacaoTecnica: boolean;
  mensagemValidacao?: string;
}

const PRECO_MINIMO_POR_SLUG = Object.fromEntries(
  SERVICOS_CATALOGO.map((servico) => [servico.slug, servico.precoMinimo ?? 0])
) as Record<string, number>;

function roundCurrency(valor: number): number {
  return Math.round(valor * 100) / 100;
}

function selecao(respostas: RespostasFluxo, chave: string): string[] {
  const valor = respostas[chave];
  if (valor === null || valor === undefined) return [];
  if (Array.isArray(valor)) return valor.map((item) => String(item));
  if (typeof valor === 'boolean') return [valor ? 'sim' : 'nao'];
  return [String(valor)];
}

function resposta(respostas: RespostasFluxo, chave: string): string | undefined {
  return selecao(respostas, chave)[0];
}

function tem(respostas: RespostasFluxo, chave: string, opcoes: string[]): boolean {
  const valores = selecao(respostas, chave);
  return valores.some((valor) => opcoes.includes(valor));
}

function numero(respostas: RespostasFluxo, chave: string): number | undefined {
  const valor = respostas[chave];
  if (typeof valor === 'number' && Number.isFinite(valor)) return valor;
  if (typeof valor === 'string') {
    const normalizado = valor.replace(/\./g, '').replace(',', '.').trim();
    const parsed = Number(normalizado);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function parseQuantidadeOpcao(valor?: string): number | undefined {
  if (!valor) return undefined;
  const mapa: Record<string, number> = {
    '0': 0,
    '1': 1,
    '2': 2,
    '3': 3,
    '4': 4,
    '5': 5,
    '6': 6,
    'ate-3': 3,
    '4-6': 6,
    '7-10': 10,
    'mais-10': 11,
    'mais-4': 5,
    '4-ou-mais': 4,
    '3-ou-mais': 3,
    '5-ou-mais': 5,
    'ate-5': 5,
    'mais-5': 6,
  };
  if (mapa[valor] !== undefined) return mapa[valor];
  const match = valor.match(/^\d+/);
  return match ? Number(match[0]) : undefined;
}

function resolverQuantidade(quantidade: number | undefined, ...fallbacks: Array<string | undefined>): number {
  if (typeof quantidade === 'number' && Number.isFinite(quantidade) && quantidade > 0) {
    return Math.max(1, Math.floor(quantidade));
  }
  for (const fallback of fallbacks) {
    const parsed = parseQuantidadeOpcao(fallback);
    if (parsed && parsed > 0) return parsed;
  }
  return 1;
}

function deltaPorQuantidade(
  quantidade: number,
  tiers: Record<number, number>,
  extra?: { threshold: number; perUnit: number }
): number {
  if (quantidade <= 1) return 0;
  if (tiers[quantidade] !== undefined) return tiers[quantidade];
  if (extra && quantidade > extra.threshold) {
    const baseDelta = tiers[extra.threshold] ?? 0;
    return baseDelta + (quantidade - extra.threshold) * extra.perUnit;
  }
  const maiorTier = Math.max(...Object.keys(tiers).map(Number));
  return tiers[maiorTier] ?? 0;
}

function adicionarItem(breakdown: PrecoFluxoBreakdownItem[], label: string, valor: number): void {
  const valorFinal = roundCurrency(valor);
  if (!valorFinal) return;
  breakdown.push({ label, valor: valorFinal });
}

function adicionarValidacao(mensagens: Set<string>, condicao: boolean, mensagem: string): void {
  if (condicao) mensagens.add(mensagem);
}

function avaliarRegrasFluxo(slug: SlugFluxoServico, respostas: RespostasFluxo): string[] {
  const fluxo = getFluxo(slug);
  if (!fluxo) return [];

  return fluxo.regrasValidacao
    .filter((regra) =>
      Object.entries(regra.when).every(([perguntaId, opcaoIds]) => {
        const valores = selecao(respostas, perguntaId);
        return valores.some((valor) => opcaoIds.includes(valor));
      })
    )
    .map((regra) => regra.mensagem);
}

function minimoCatalogo(slug: SlugFluxoServico): number {
  return PRECO_MINIMO_POR_SLUG[slug] ?? 0;
}

function finalizarResultado(
  breakdown: PrecoFluxoBreakdownItem[],
  mensagens: Set<string>
): ResultadoPrecoFluxo {
  const preco = roundCurrency(breakdown.reduce((acc, item) => acc + item.valor, 0));
  const mensagemValidacao = [...mensagens].join(' ');
  return {
    preco,
    breakdown,
    requerValidacaoTecnica: mensagens.size > 0,
    ...(mensagemValidacao ? { mensagemValidacao } : {}),
  };
}

function assertSlug(slug: string): SlugFluxoServico {
  if (!getFluxo(slug)) {
    throw new Error(`Slug de fluxo não suportado: ${slug}`);
  }
  return slug as SlugFluxoServico;
}

export function calcularPrecoFluxo(
  slugInput: string,
  respostas: RespostasFluxo = {},
  quantidade?: number
): ResultadoPrecoFluxo {
  const slug = assertSlug(slugInput);
  const breakdown: PrecoFluxoBreakdownItem[] = [];
  const mensagens = new Set<string>(avaliarRegrasFluxo(slug, respostas));

  switch (slug) {
    case 'troca-tomada': {
      const tipo = resposta(respostas, 'tipoTomada') ?? 'simples';
      const qtd = resolverQuantidade(quantidade, resposta(respostas, 'quantidade'));
      let base = tipo === 'dupla' ? 169 : tipo === 'tomada-20a' ? 189 : 149;
      const deltaQtd = deltaPorQuantidade(qtd, { 2: 70, 3: 140, 4: 210 }, { threshold: 4, perUnit: 60 });

      adicionarItem(breakdown, `Base ${qtd} tomada(s)`, base + deltaQtd);
      adicionarItem(
        breakdown,
        'Tomada fornecida pela ABS',
        resposta(respostas, 'fornecimentoTomada') === 'abs-padrao'
          ? 25
          : resposta(respostas, 'fornecimentoTomada') === 'abs-premium'
            ? 45
            : 0
      );
      adicionarItem(breakdown, 'Tomada não funciona', tem(respostas, 'estadoAtual', ['nao-funciona']) ? 40 : 0);
      adicionarItem(
        breakdown,
        'Sinais de aquecimento ou queima',
        tem(respostas, 'estadoAtual', ['queimada', 'aquecendo']) ? 50 : 0
      );
      adicionarItem(breakdown, 'Instalação em cozinha', tem(respostas, 'localInstalacao', ['cozinha']) ? 10 : 0);
      adicionarItem(breakdown, 'Instalação em banheiro', tem(respostas, 'localInstalacao', ['banheiro']) ? 20 : 0);
      adicionarItem(
        breakdown,
        'Instalação em área externa',
        tem(respostas, 'localInstalacao', ['area-externa']) ? 30 : 0
      );
      adicionarItem(
        breakdown,
        'Altura acima de 2,5m',
        tem(respostas, 'alturaInstalacao', ['acima-2-5m']) ? 50 : 0
      );
      adicionarItem(breakdown, 'Parede em gesso', tem(respostas, 'acabamentoParede', ['gesso']) ? 10 : 0);
      adicionarItem(breakdown, 'Parede em cerâmica', tem(respostas, 'acabamentoParede', ['ceramica']) ? 20 : 0);
      adicionarItem(
        breakdown,
        'Parede em porcelanato',
        tem(respostas, 'acabamentoParede', ['porcelanato']) ? 40 : 0
      );
      adicionarItem(breakdown, 'Reparo de conexão', tem(respostas, 'reparoConexao', ['sim']) ? 30 : 0);
      adicionarItem(breakdown, 'Conectores', tem(respostas, 'conectores', ['sim']) ? 20 : 0);
      adicionarItem(breakdown, 'Espelho', tem(respostas, 'espelho', ['sim']) ? 15 : 0);
      adicionarItem(breakdown, 'Refixação da caixa', tem(respostas, 'refixacaoCaixa', ['sim']) ? 35 : 0);
      adicionarItem(breakdown, 'Ajuste de fiação', tem(respostas, 'ajusteFiacao', ['sim']) ? 40 : 0);
      if (tipo === 'dupla') {
        adicionarItem(breakdown, 'Caixa não é dupla', tem(respostas, 'caixaNaoDupla', ['sim']) ? 40 : 0);
        adicionarItem(
          breakdown,
          'Transformar simples em dupla',
          tem(respostas, 'transformarSimplesEmDupla', ['sim']) ? 50 : 0
        );
      }
      if (tipo === 'tomada-20a') {
        adicionarItem(
          breakdown,
          'Tomada atual não é 20A',
          tem(respostas, 'tomadaAtualNao20A', ['sim']) ? 30 : 0
        );
        adicionarItem(
          breakdown,
          'Disjuntor não exclusivo',
          tem(respostas, 'disjuntorExclusivo', ['nao']) ? 50 : 0
        );
      }
      return finalizarResultado(breakdown, mensagens);
    }

    case 'troca-interruptor': {
      const tipo = resposta(respostas, 'tipoInterruptor') ?? 'simples';
      const qtd = resolverQuantidade(quantidade, resposta(respostas, 'quantidade'));
      const baseTipo: Record<string, number> = {
        simples: 149,
        duplo: 169,
        triplo: 189,
        paralelo: 199,
        intermediario: 219,
      };
      const base = baseTipo[tipo] ?? 149;
      const deltaQtd = deltaPorQuantidade(qtd, { 2: 70, 3: 140, 4: 210 }, { threshold: 4, perUnit: 60 });

      adicionarItem(breakdown, `Base ${qtd} interruptor(es)`, base + deltaQtd);
      adicionarItem(
        breakdown,
        'Interruptor fornecido pela ABS',
        resposta(respostas, 'fornecimentoInterruptor') === 'abs-padrao'
          ? 25
          : resposta(respostas, 'fornecimentoInterruptor') === 'abs-premium'
            ? 45
            : 0
      );
      adicionarItem(
        breakdown,
        'Funciona parcialmente',
        tem(respostas, 'estadoInterruptor', ['funciona-parcialmente']) ? 20 : 0
      );
      adicionarItem(
        breakdown,
        'Interruptor não funciona',
        tem(respostas, 'estadoInterruptor', ['nao-funciona']) ? 40 : 0
      );
      adicionarItem(breakdown, 'Aquecimento', tem(respostas, 'estadoInterruptor', ['aquece']) ? 50 : 0);
      adicionarItem(
        breakdown,
        'Faísca ou cheiro de queimado',
        tem(respostas, 'estadoInterruptor', ['faisca-cheiro-queimado']) ? 50 : 0
      );
      adicionarItem(breakdown, 'Instalação em cozinha', tem(respostas, 'localInstalacao', ['cozinha']) ? 10 : 0);
      adicionarItem(breakdown, 'Instalação em banheiro', tem(respostas, 'localInstalacao', ['banheiro']) ? 20 : 0);
      adicionarItem(
        breakdown,
        'Instalação em área externa',
        tem(respostas, 'localInstalacao', ['area-externa']) ? 30 : 0
      );
      adicionarItem(
        breakdown,
        'Altura acima de 2,5m',
        tem(respostas, 'alturaInstalacao', ['acima-2-5m']) ? 50 : 0
      );
      adicionarItem(breakdown, 'Parede em gesso', tem(respostas, 'acabamentoParede', ['gesso']) ? 10 : 0);
      adicionarItem(breakdown, 'Parede em cerâmica', tem(respostas, 'acabamentoParede', ['ceramica']) ? 20 : 0);
      adicionarItem(
        breakdown,
        'Parede em porcelanato',
        tem(respostas, 'acabamentoParede', ['porcelanato']) ? 40 : 0
      );
      adicionarItem(breakdown, 'Espelho', tem(respostas, 'espelho', ['sim']) ? 15 : 0);
      adicionarItem(breakdown, 'Refixação de caixa', tem(respostas, 'refixacaoCaixa', ['sim']) ? 35 : 0);
      adicionarItem(breakdown, 'Ajuste de fiação', tem(respostas, 'ajusteFiacao', ['sim']) ? 40 : 0);
      adicionarItem(breakdown, 'Conectores', tem(respostas, 'conectores', ['sim']) ? 20 : 0);
      adicionarItem(breakdown, 'Organização da caixa', tem(respostas, 'organizacaoCaixa', ['sim']) ? 25 : 0);
      return finalizarResultado(breakdown, mensagens);
    }

    case 'instalacao-chuveiro': {
      const tipoServico = resposta(respostas, 'tipoServicoChuveiro') ?? 'instalar-comum';
      const potencia = resposta(respostas, 'potenciaChuveiro');
      let base = 199;
      let baseLabel = 'Base instalação de chuveiro comum';

      if (tipoServico === 'instalar-eletronico') {
        base = 249;
        baseLabel = 'Base chuveiro eletrônico';
      } else if (tipoServico === 'trocar-resistencia') {
        base = 99;
        baseLabel = 'Base troca de resistência';
      } else if (tipoServico === 'instalar-com-revisao-eletrica') {
        base = 299;
        baseLabel = 'Base instalação com revisão elétrica';
      } else if (potencia === '6801-7500w') {
        base = 249;
        baseLabel = 'Migrado para chuveiro eletrônico';
      }

      adicionarItem(breakdown, baseLabel, base);
      adicionarItem(
        breakdown,
        'Altura acima de 3m',
        tem(respostas, 'alturaInstalacao', ['acima-3m']) ? 50 : 0
      );

      if (tipoServico === 'trocar-resistencia' && tem(respostas, 'resistenciaFornecidaPor', ['abs'])) {
        adicionarItem(
          breakdown,
          'Resistência fornecida pela ABS',
          numero(respostas, 'valorPecaResistencia') ?? 0
        );
      }

      if (tipoServico === 'instalar-com-revisao-eletrica') {
        adicionarItem(breakdown, 'Troca de disjuntor', tem(respostas, 'trocaDisjuntor', ['sim']) ? 89 : 0);
        adicionarItem(breakdown, 'Conectores', tem(respostas, 'conectores', ['sim']) ? 20 : 0);
        adicionarItem(breakdown, 'Ajuste de fiação', tem(respostas, 'ajusteFiacao', ['sim']) ? 40 : 0);
        adicionarItem(breakdown, 'Reaperto no quadro', tem(respostas, 'reapertoQuadro', ['sim']) ? 50 : 0);
        adicionarItem(breakdown, 'Instalação de DR', tem(respostas, 'instalacaoDr', ['sim']) ? 249 : 0);
      }

      return finalizarResultado(breakdown, mensagens);
    }

    case 'troca-disjuntor': {
      const tipo = resposta(respostas, 'tipoDisjuntor');
      const amperagem = resposta(respostas, 'amperagemDisjuntor');
      const tabela: Record<string, number> = {
        'monopolar:10a': 149,
        'monopolar:16a': 149,
        'monopolar:20a': 159,
        'monopolar:25a': 169,
        'monopolar:32a': 179,
        'monopolar:40a': 199,
        'bipolar:20a': 189,
        'bipolar:25a': 199,
        'bipolar:32a': 219,
        'bipolar:40a': 239,
        'bipolar:50a': 269,
        'bipolar:63a': 299,
        'tripolar:20a': 249,
        'tripolar:25a': 269,
        'tripolar:32a': 289,
        'tripolar:40a': 329,
        'tripolar:50a': 369,
        'tripolar:63a': 399,
      };

      let base = tabela[`${tipo}:${amperagem}`] ?? minimoCatalogo(slug);
      adicionarValidacao(
        mensagens,
        !tipo || tipo === 'nao-sei' || !amperagem || amperagem === 'nao-sei',
        'Tipo ou amperagem do disjuntor precisa de confirmação técnica ABS.'
      );
      adicionarValidacao(
        mensagens,
        tipo === 'monopolar' && ['50a', '63a'].includes(amperagem ?? ''),
        'Disjuntor monopolar acima de 40A exige análise humana.'
      );

      adicionarItem(breakdown, 'Base troca de disjuntor', base);
      adicionarItem(breakdown, 'Não arma', tem(respostas, 'motivoTrocaDisjuntor', ['nao-arma']) ? 20 : 0);
      adicionarItem(breakdown, 'Desarmando', tem(respostas, 'motivoTrocaDisjuntor', ['desarmando']) ? 30 : 0);
      adicionarItem(
        breakdown,
        'Cheiro de queimado',
        tem(respostas, 'motivoTrocaDisjuntor', ['cheiro-queimado']) ? 50 : 0
      );
      adicionarItem(breakdown, 'Disjuntor derretido', tem(respostas, 'motivoTrocaDisjuntor', ['derreteu']) ? 80 : 0);
      adicionarItem(breakdown, 'Terminal', tem(respostas, 'terminal', ['sim']) ? 20 : 0);
      adicionarItem(breakdown, 'Conector', tem(respostas, 'conector', ['sim']) ? 20 : 0);
      adicionarItem(breakdown, 'Reaperto geral', tem(respostas, 'reapertoGeral', ['sim']) ? 30 : 0);
      adicionarItem(
        breakdown,
        'Organização do quadro',
        tem(respostas, 'organizacaoQuadro', ['sim']) ? 50 : 0
      );
      adicionarItem(
        breakdown,
        'Identificação de circuitos',
        tem(respostas, 'identificacaoCircuitos', ['sim']) ? 30 : 0
      );
      return finalizarResultado(breakdown, mensagens);
    }

    case 'instalacao-luminaria': {
      const tipo = resposta(respostas, 'tipoLuminaria') ?? 'plafon-led';
      const qtd = resolverQuantidade(quantidade, resposta(respostas, 'quantidade'));
      const baseTipo: Record<string, number> = {
        'plafon-led': 149,
        sobrepor: 149,
        'painel-led': 149,
        'spot-individual': 149,
        'spot-trilho': 189,
        pendente: 199,
        'lustre-pequeno': 249,
        'lustre-medio': 299,
        'lustre-grande': 299,
      };
      adicionarValidacao(mensagens, tipo === 'lustre-grande', 'Lustre grande exige análise humana.');
      adicionarItem(
        breakdown,
        `Base instalação de luminária (${qtd} unidade${qtd > 1 ? 's' : ''})`,
        (baseTipo[tipo] ?? minimoCatalogo(slug)) + deltaPorQuantidade(qtd, { 2: 90, 3: 180 }, { threshold: 3, perUnit: 80 })
      );
      adicionarItem(breakdown, 'Altura de 3m a 4m', tem(respostas, 'alturaInstalacao', ['3m-4m']) ? 50 : 0);
      adicionarItem(breakdown, 'Altura acima de 4m', tem(respostas, 'alturaInstalacao', ['acima-4m']) ? 100 : 0);
      adicionarItem(breakdown, 'Teto em gesso', tem(respostas, 'tipoTeto', ['gesso']) ? 20 : 0);
      adicionarItem(breakdown, 'Teto em PVC', tem(respostas, 'tipoTeto', ['pvc']) ? 30 : 0);
      adicionarItem(breakdown, 'Teto em madeira', tem(respostas, 'tipoTeto', ['madeira']) ? 20 : 0);
      adicionarItem(
        breakdown,
        'Estrutura metálica',
        tem(respostas, 'tipoTeto', ['estrutura-metalica']) ? 50 : 0
      );
      adicionarItem(breakdown, 'Peso de 3kg a 10kg', tem(respostas, 'pesoLuminaria', ['3kg-10kg']) ? 50 : 0);
      adicionarItem(breakdown, 'Conectores', tem(respostas, 'conectores', ['sim']) ? 20 : 0);
      adicionarItem(breakdown, 'Refixação de suporte', tem(respostas, 'refixacaoSuporte', ['sim']) ? 30 : 0);
      adicionarItem(breakdown, 'Ajuste de fiação', tem(respostas, 'ajusteFiacao', ['sim']) ? 40 : 0);
      adicionarItem(breakdown, 'Gancho', tem(respostas, 'gancho', ['sim']) ? 35 : 0);
      adicionarItem(breakdown, 'Canopla', tem(respostas, 'canopla', ['sim']) ? 20 : 0);
      return finalizarResultado(breakdown, mensagens);
    }

    case 'instalacao-ventilador-teto': {
      const qtd = resolverQuantidade(quantidade, resposta(respostas, 'quantidade'));
      adicionarItem(
        breakdown,
        `Base instalação de ventilador (${qtd} unidade${qtd > 1 ? 's' : ''})`,
        299 + deltaPorQuantidade(qtd, { 2: 90, 3: 180 }, { threshold: 3, perUnit: 80 })
      );
      adicionarItem(
        breakdown,
        'Ventilador com luminária',
        tem(respostas, 'tipoVentilador', ['com-luminaria']) ? 40 : 0
      );
      adicionarItem(breakdown, 'Altura de 3m a 4m', tem(respostas, 'alturaInstalacao', ['3m-4m']) ? 50 : 0);
      adicionarItem(breakdown, 'Altura acima de 4m', tem(respostas, 'alturaInstalacao', ['acima-4m']) ? 100 : 0);
      adicionarItem(breakdown, 'Teto em gesso', tem(respostas, 'tipoTeto', ['gesso']) ? 20 : 0);
      adicionarItem(breakdown, 'Teto em PVC', tem(respostas, 'tipoTeto', ['pvc']) ? 30 : 0);
      adicionarItem(breakdown, 'Teto em madeira', tem(respostas, 'tipoTeto', ['madeira']) ? 20 : 0);
      adicionarItem(
        breakdown,
        'Estrutura metálica',
        tem(respostas, 'tipoTeto', ['estrutura-metalica']) ? 50 : 0
      );
      adicionarItem(
        breakdown,
        'Controle remoto',
        tem(respostas, 'acionamentoVentilador', ['controle-remoto']) ? 30 : 0
      );
      adicionarItem(breakdown, 'Gancho ou suporte novo', tem(respostas, 'ganchoExistente', ['nao']) ? 35 : 0);
      adicionarItem(breakdown, 'Conectores', tem(respostas, 'conectores', ['sim']) ? 20 : 0);
      adicionarItem(breakdown, 'Ajuste de fiação', tem(respostas, 'ajusteFiacao', ['sim']) ? 40 : 0);
      return finalizarResultado(breakdown, mensagens);
    }

    case 'troca-torneira': {
      const tipo = resposta(respostas, 'tipoTorneira') ?? 'convencional';
      const qtd = resolverQuantidade(quantidade, resposta(respostas, 'quantidade'));
      let base = 149;
      let baseLabel = 'Base troca de torneira';

      if (tipo === 'convencional') {
        const porLocal: Record<string, number> = {
          banheiro: 129,
          'area-servico': 139,
          cozinha: 149,
          jardim: 159,
        };
        base = porLocal[resposta(respostas, 'localInstalacao') ?? 'cozinha'] ?? 149;
        baseLabel = 'Base torneira convencional';
      } else if (tipo === 'gourmet') {
        base = 179;
        baseLabel = 'Base torneira gourmet';
      } else if (tipo === 'monocomando-misturador') {
        base = 199;
        baseLabel = 'Base monocomando/misturador';
      } else if (tipo === 'eletrica') {
        base = 249;
        baseLabel = 'Base torneira elétrica';
      }

      adicionarItem(breakdown, baseLabel, base + deltaPorQuantidade(qtd, { 2: 90, 3: 180 }, { threshold: 3, perUnit: 80 }));
      adicionarItem(breakdown, 'Registro não fecha', tem(respostas, 'registroFuncionando', ['nao']) ? 30 : 0);
      adicionarItem(breakdown, 'Troca de engate', tipo === 'gourmet' && tem(respostas, 'trocaEngate', ['sim']) ? 20 : 0);
      adicionarItem(breakdown, 'Troca de sifão', tipo === 'gourmet' && tem(respostas, 'trocaSifao', ['sim']) ? 30 : 0);

      if (tipo === 'monocomando-misturador') {
        adicionarValidacao(mensagens, tem(respostas, 'temAguaQuente', ['nao']), 'Monocomando sem água quente exige análise humana.');
        adicionarValidacao(
          mensagens,
          tem(respostas, 'quantidadeEntradasAgua', ['1-entrada']),
          'Monocomando com apenas uma entrada exige análise humana.'
        );
      }

      if (tipo === 'eletrica') {
        adicionarValidacao(
          mensagens,
          tem(respostas, 'eletricaInstalada', ['nao']),
          'Torneira elétrica sem infraestrutura elétrica precisa de validação técnica.'
        );
        adicionarValidacao(
          mensagens,
          tem(respostas, 'tomadaProxima', ['nao']),
          'Torneira elétrica sem tomada próxima precisa de encaminhamento técnico.'
        );
      }

      return finalizarResultado(breakdown, mensagens);
    }

    case 'troca-registro': {
      const tipo = resposta(respostas, 'tipoRegistro') ?? 'registro-chuveiro';
      const problema = resposta(respostas, 'problemaRegistro') ?? 'troca-preventiva';
      const bases: Record<string, number> = {
        'registro-chuveiro': 149,
        'registro-gaveta': 179,
        'registro-geral': 249,
      };
      adicionarItem(breakdown, 'Base troca de registro', bases[tipo] ?? minimoCatalogo(slug));
      adicionarItem(breakdown, 'Vazamento', problema === 'vazamento' ? 20 : 0);
      adicionarItem(breakdown, 'Não abre', problema === 'nao-abre' ? 30 : 0);
      adicionarItem(breakdown, 'Não fecha', problema === 'nao-fecha' ? 30 : 0);
      adicionarItem(
        breakdown,
        'Registro de chuveiro quebrado',
        tipo === 'registro-chuveiro' && problema === 'quebrado' ? 50 : 0
      );
      adicionarItem(
        breakdown,
        'Registro geral indisponível',
        tem(respostas, 'registroGeralFuncionando', ['nao']) ? 50 : 0
      );
      adicionarItem(
        breakdown,
        'Registro de gaveta travado',
        tipo === 'registro-gaveta' && problema === 'travado' ? 40 : 0
      );
      adicionarItem(
        breakdown,
        'Registro de gaveta quebrado',
        tipo === 'registro-gaveta' && problema === 'quebrado' ? 50 : 0
      );
      adicionarItem(
        breakdown,
        'Registro geral travado',
        tipo === 'registro-geral' && problema === 'travado' ? 50 : 0
      );
      adicionarItem(
        breakdown,
        'Registro geral quebrado',
        tipo === 'registro-geral' && problema === 'quebrado' ? 70 : 0
      );
      adicionarItem(breakdown, 'Bitola 1"', tem(respostas, 'bitolaRegistro', ['1']) ? 30 : 0);
      adicionarItem(breakdown, 'Bitola 1 1/4"', tem(respostas, 'bitolaRegistro', ['1-1-4']) ? 60 : 0);
      adicionarItem(breakdown, 'Acabamento', tem(respostas, 'acabamento', ['sim']) ? 30 : 0);
      adicionarItem(breakdown, 'Canopla', tem(respostas, 'canopla', ['sim']) ? 20 : 0);
      adicionarItem(
        breakdown,
        'Vedação complementar',
        tem(respostas, 'vedacaoComplementar', ['sim']) ? 15 : 0
      );
      adicionarItem(breakdown, 'Adaptador', tem(respostas, 'adaptador', ['sim']) ? 20 : 0);
      adicionarItem(breakdown, 'Ajuste hidráulico', tem(respostas, 'ajusteHidraulico', ['sim']) ? 40 : 0);
      adicionarItem(breakdown, 'Flexível', tem(respostas, 'flexivel', ['sim']) ? 20 : 0);
      return finalizarResultado(breakdown, mensagens);
    }

    case 'reparo-vazamento': {
      const origem = resposta(respostas, 'origemVazamento') ?? 'torneira';
      const qtd = resolverQuantidade(quantidade, resposta(respostas, 'quantidade'));
      const bases: Record<string, number> = {
        torneira: 129,
        registro: 149,
        sifao: 129,
        'caixa-acoplada': 149,
        'parede-tubulacao': 249,
      };

      adicionarItem(breakdown, 'Base reparo de vazamento', bases[origem] ?? minimoCatalogo(slug));
      if (origem === 'torneira') {
        adicionarItem(breakdown, '2 torneiras vazando', qtd === 2 ? 80 : 0);
        adicionarItem(breakdown, '3 ou mais torneiras', qtd >= 3 ? 160 : 0);
        adicionarItem(breakdown, 'Torneira não funciona', tem(respostas, 'torneiraNaoFunciona', ['sim']) ? 20 : 0);
      }
      if (origem === 'registro') {
        adicionarItem(breakdown, 'Sem registro geral', tem(respostas, 'aguaPodeSerFechada', ['nao']) ? 50 : 0);
        adicionarItem(
          breakdown,
          'Acabamento não reaproveita',
          tem(respostas, 'acabamentoNaoReaproveita', ['sim']) ? 20 : 0
        );
      }
      if (origem === 'sifao') {
        adicionarItem(breakdown, '2 sifões', qtd === 2 ? 70 : 0);
        adicionarItem(breakdown, '3 ou mais sifões', qtd >= 3 ? 140 : 0);
      }
      if (origem === 'caixa-acoplada') {
        adicionarItem(
          breakdown,
          'Descarga não funciona',
          tem(respostas, 'caixaDescargaNaoFunciona', ['sim']) ? 30 : 0
        );
        adicionarItem(
          breakdown,
          'Enchimento contínuo',
          tem(respostas, 'caixaEnchendoContinuo', ['sim']) ? 20 : 0
        );
      }
      return finalizarResultado(breakdown, mensagens);
    }

    case 'desentupimento-pia': {
      const qtd = resolverQuantidade(quantidade, resposta(respostas, 'quantidade'));
      adicionarItem(
        breakdown,
        `Base desentupimento de pia (${qtd} unidade${qtd > 1 ? 's' : ''})`,
        249 + deltaPorQuantidade(qtd, { 2: 100, 3: 180 }, { threshold: 3, perUnit: 80 })
      );
      adicionarItem(breakdown, 'Sem acesso ao sifão', tem(respostas, 'acessoSifao', ['nao']) ? 30 : 0);
      return finalizarResultado(breakdown, mensagens);
    }

    case 'desentupimento-vaso': {
      const qtd = resolverQuantidade(quantidade, resposta(respostas, 'quantidade'));
      adicionarItem(
        breakdown,
        `Base desentupimento de vaso (${qtd} unidade${qtd > 1 ? 's' : ''})`,
        299 + deltaPorQuantidade(qtd, { 2: 120, 3: 220 }, { threshold: 3, perUnit: 100 })
      );
      adicionarItem(
        breakdown,
        'Descarga não funciona',
        tem(respostas, 'descargaNaoFunciona', ['sim']) ? 30 : 0
      );
      adicionarItem(breakdown, 'Objeto caiu no vaso', tem(respostas, 'objetoCaiu', ['sim']) ? 50 : 0);
      return finalizarResultado(breakdown, mensagens);
    }

    case 'instalacao-suporte-tv': {
      const tipo = resposta(respostas, 'tipoSuporteTv') ?? 'fixo';
      const baseTipo: Record<string, number> = { fixo: 149, inclinavel: 179, articulado: 249 };
      const tamanho = resposta(respostas, 'tamanhoTv') ?? 'ate-32';
      adicionarItem(breakdown, 'Base instalação de suporte de TV', baseTipo[tipo] ?? minimoCatalogo(slug));

      if (tamanho === '51-65') {
        adicionarItem(breakdown, 'TV de 51" a 65"', tipo === 'articulado' ? 30 : 20);
      } else if (tamanho === '66-75') {
        adicionarItem(breakdown, 'TV de 66" a 75"', tipo === 'articulado' ? 70 : 50);
      }

      adicionarItem(
        breakdown,
        'Parede em drywall',
        tem(respostas, 'tipoParede', ['drywall']) ? (tipo === 'articulado' ? 70 : 50) : 0
      );
      adicionarItem(
        breakdown,
        'Parede em madeira',
        tem(respostas, 'tipoParede', ['madeira']) ? (tipo === 'articulado' ? 0 : 20) : 0
      );
      adicionarItem(
        breakdown,
        'Altura de 2,5m a 3,5m',
        tem(respostas, 'alturaInstalacao', ['2-5m-3-5m']) ? 50 : 0
      );
      adicionarItem(
        breakdown,
        'Altura acima de 3,5m',
        tem(respostas, 'alturaInstalacao', ['acima-3-5m']) ? 100 : 0
      );
      adicionarItem(
        breakdown,
        'Braço duplo',
        tipo === 'articulado' && tem(respostas, 'bracoDuplo', ['sim']) ? 50 : 0
      );
      adicionarItem(breakdown, 'Canaleta', tem(respostas, 'upsellsTv', ['canaleta']) ? 49 : 0);
      adicionarItem(
        breakdown,
        'Organização de cabos',
        tem(respostas, 'upsellsTv', ['organizacao-cabos']) ? 39 : 0
      );
      adicionarItem(breakdown, 'Soundbar', tem(respostas, 'upsellsTv', ['soundbar']) ? 79 : 0);
      adicionarItem(
        breakdown,
        'Prateleira para receptor',
        tem(respostas, 'upsellsTv', ['prateleira-receptor']) ? 59 : 0
      );
      adicionarItem(breakdown, 'TV adicional', tem(respostas, 'tvAdicional', ['sim']) ? 119 : 0);
      return finalizarResultado(breakdown, mensagens);
    }

    case 'instalacao-prateleira': {
      const qtd = resolverQuantidade(quantidade, resposta(respostas, 'quantidade'));
      adicionarItem(
        breakdown,
        `Base instalação de prateleira (${qtd} unidade${qtd > 1 ? 's' : ''})`,
        129 + deltaPorQuantidade(qtd, { 2: 60, 3: 120 }, { threshold: 3, perUnit: 50 })
      );
      adicionarItem(
        breakdown,
        'Comprimento de 1m a 2m',
        tem(respostas, 'comprimentoMaiorPrateleira', ['1m-2m']) ? 40 : 0
      );
      adicionarItem(
        breakdown,
        'Comprimento acima de 2m',
        tem(respostas, 'comprimentoMaiorPrateleira', ['acima-2m']) ? 80 : 0
      );
      adicionarItem(breakdown, 'Parede em madeira', tem(respostas, 'tipoParede', ['madeira']) ? 20 : 0);
      adicionarItem(breakdown, 'Parede em drywall', tem(respostas, 'tipoParede', ['drywall']) ? 70 : 0);
      adicionarItem(
        breakdown,
        'Altura de 2,5m a 3,5m',
        tem(respostas, 'alturaInstalacao', ['2-5m-3-5m']) ? 50 : 0
      );
      adicionarItem(
        breakdown,
        'Altura acima de 3,5m',
        tem(respostas, 'alturaInstalacao', ['acima-3-5m']) ? 100 : 0
      );
      adicionarItem(breakdown, 'Carga de livros', tem(respostas, 'usoPrateleira', ['livros']) ? 20 : 0);
      adicionarItem(breakdown, 'Carga de utensílios', tem(respostas, 'usoPrateleira', ['utensilios']) ? 20 : 0);
      adicionarItem(breakdown, 'Carga de ferramentas', tem(respostas, 'usoPrateleira', ['ferramentas']) ? 50 : 0);
      adicionarItem(breakdown, 'Uso para estoque', tem(respostas, 'usoPrateleira', ['estoque']) ? 80 : 0);
      adicionarItem(breakdown, 'Kit de fixação ABS', tem(respostas, 'temFerragens', ['nao']) ? 39 : 0);
      adicionarItem(breakdown, 'Área comercial', tem(respostas, 'areaComercial', ['sim']) ? 30 : 0);
      adicionarItem(breakdown, 'Buchas especiais', tem(respostas, 'buchasEspeciais', ['sim']) ? 20 : 0);
      adicionarItem(breakdown, 'Parafusos especiais', tem(respostas, 'parafusosEspeciais', ['sim']) ? 20 : 0);
      adicionarItem(breakdown, 'Suporte reforçado', tem(respostas, 'suporteReforcado', ['sim']) ? 40 : 0);
      adicionarItem(breakdown, 'Reforço simples', tem(respostas, 'reforcoSimples', ['sim']) ? 50 : 0);
      return finalizarResultado(breakdown, mensagens);
    }

    case 'montagem-moveis-simples': {
      const tipo = resposta(respostas, 'tipoMovelSimples') ?? 'outro-movel-simples';
      const bases: Record<string, number> = {
        'criado-mudo': 129,
        sapateira: 129,
        mesa: 149,
        escrivaninha: 169,
        rack: 189,
        comoda: 199,
        'outro-movel-simples': minimoCatalogo(slug),
      };
      adicionarItem(breakdown, 'Base montagem de móvel simples', bases[tipo] ?? minimoCatalogo(slug));
      adicionarItem(
        breakdown,
        '2 volumes',
        tem(respostas, 'quantidadeVolumes', ['2']) ? 30 : 0
      );
      adicionarItem(
        breakdown,
        '3 volumes',
        tem(respostas, 'quantidadeVolumes', ['3']) ? 60 : 0
      );
      adicionarItem(
        breakdown,
        '4 ou mais volumes',
        tem(respostas, 'quantidadeVolumes', ['4-ou-mais']) ? 100 : 0
      );
      adicionarItem(breakdown, '1 a 2 gavetas', tem(respostas, 'quantidadeGavetas', ['1-2']) ? 20 : 0);
      adicionarItem(breakdown, '3 a 4 gavetas', tem(respostas, 'quantidadeGavetas', ['3-4']) ? 40 : 0);
      adicionarItem(breakdown, 'Mais de 4 gavetas', tem(respostas, 'quantidadeGavetas', ['mais-4']) ? 60 : 0);
      adicionarItem(breakdown, '1 porta', tem(respostas, 'quantidadePortas', ['1']) ? 20 : 0);
      adicionarItem(breakdown, '2 portas', tem(respostas, 'quantidadePortas', ['2']) ? 40 : 0);
      adicionarItem(breakdown, '3 ou mais portas', tem(respostas, 'quantidadePortas', ['3-ou-mais']) ? 60 : 0);
      adicionarItem(breakdown, 'Fixação na parede', tem(respostas, 'fixacaoParede', ['sim']) ? 50 : 0);
      adicionarItem(
        breakdown,
        '4º andar sem elevador',
        tem(respostas, 'andarMontagem', ['4-ou-mais']) && tem(respostas, 'temElevador', ['nao']) ? 50 : 0
      );
      adicionarItem(
        breakdown,
        'Nivelamento especial',
        tem(respostas, 'nivelamentoEspecial', ['sim']) ? 30 : 0
      );
      adicionarItem(
        breakdown,
        'Reforço estrutural',
        tem(respostas, 'reforcoEstrutural', ['sim']) ? 40 : 0
      );
      return finalizarResultado(breakdown, mensagens);
    }

    case 'montagem-guarda-roupa': {
      const portas = resposta(respostas, 'quantidadePortas') ?? '2';
      let base = 399;
      const incrementoPortas: Record<string, number> = {
        '2': 0,
        '3': 50,
        '4': 100,
        '5': 150,
        '6': 200,
        'mais-6': 250,
      };
      adicionarItem(breakdown, 'Base montagem de guarda-roupa', base + (incrementoPortas[portas] ?? 0));
      adicionarItem(breakdown, 'Porta de correr', tem(respostas, 'tipoPorta', ['correr']) ? 100 : 0);
      adicionarItem(breakdown, 'Porta mista', tem(respostas, 'tipoPorta', ['misto']) ? 150 : 0);
      adicionarItem(breakdown, '1 a 2 gavetas', tem(respostas, 'quantidadeGavetas', ['1-2']) ? 20 : 0);
      adicionarItem(breakdown, '3 a 4 gavetas', tem(respostas, 'quantidadeGavetas', ['3-4']) ? 50 : 0);
      adicionarItem(breakdown, '5 ou mais gavetas', tem(respostas, 'quantidadeGavetas', ['5-ou-mais']) ? 80 : 0);
      adicionarItem(breakdown, 'Espelho pequeno', tem(respostas, 'espelhoGuardaRoupa', ['pequeno']) ? 30 : 0);
      adicionarItem(breakdown, 'Espelho grande', tem(respostas, 'espelhoGuardaRoupa', ['grande']) ? 80 : 0);
      adicionarItem(breakdown, '3 volumes', tem(respostas, 'quantidadeVolumes', ['3']) ? 30 : 0);
      adicionarItem(breakdown, '4 volumes', tem(respostas, 'quantidadeVolumes', ['4']) ? 60 : 0);
      adicionarItem(
        breakdown,
        '5 ou mais volumes',
        tem(respostas, 'quantidadeVolumes', ['5-ou-mais']) ? 100 : 0
      );
      adicionarItem(breakdown, 'Fixação na parede', tem(respostas, 'fixacaoParede', ['sim']) ? 50 : 0);
      adicionarItem(
        breakdown,
        '4º andar sem elevador',
        tem(respostas, 'andarMontagem', ['4-ou-mais']) && tem(respostas, 'temElevador', ['nao']) ? 50 : 0
      );
      adicionarItem(
        breakdown,
        'Regulagem avançada de portas',
        tem(respostas, 'regulagemAvancadaPortas', ['sim']) ? 50 : 0
      );
      adicionarItem(
        breakdown,
        'Regulagem de trilhos',
        tem(respostas, 'regulagemTrilhos', ['sim']) ? 50 : 0
      );
      adicionarItem(
        breakdown,
        'Instalação de espelho',
        tem(respostas, 'instalacaoEspelho', ['sim']) ? 50 : 0
      );
      adicionarItem(
        breakdown,
        'Reforço estrutural',
        tem(respostas, 'reforcoEstrutural', ['sim']) ? 40 : 0
      );
      adicionarItem(
        breakdown,
        'Desmontagem do guarda-roupa antigo',
        tem(respostas, 'desmontagemAntigo', ['sim']) ? 149 : 0
      );
      adicionarItem(breakdown, 'Remanejamento do móvel', tem(respostas, 'remanejamentoMovel', ['sim']) ? 99 : 0);
      adicionarItem(
        breakdown,
        'Prateleiras internas',
        tem(respostas, 'prateleirasInternas', ['sim']) ? 79 : 0
      );
      adicionarItem(
        breakdown,
        'Organização interna',
        tem(respostas, 'organizacaoInterna', ['sim']) ? 49 : 0
      );
      return finalizarResultado(breakdown, mensagens);
    }

    case 'instalacao-persiana': {
      const qtd = resolverQuantidade(quantidade, resposta(respostas, 'quantidade'));
      adicionarItem(
        breakdown,
        `Base instalação de persiana (${qtd} unidade${qtd > 1 ? 's' : ''})`,
        149 + deltaPorQuantidade(qtd, { 2: 80, 3: 160 }, { threshold: 3, perUnit: 70 })
      );
      adicionarItem(breakdown, 'Persiana vertical', tem(respostas, 'tipoPersiana', ['vertical']) ? 20 : 0);
      adicionarItem(
        breakdown,
        'Persiana Double Vision',
        tem(respostas, 'tipoPersiana', ['double-vision']) ? 30 : 0
      );
      adicionarItem(breakdown, 'Persiana romana', tem(respostas, 'tipoPersiana', ['romana']) ? 40 : 0);
      adicionarItem(breakdown, 'Persiana painel', tem(respostas, 'tipoPersiana', ['painel']) ? 60 : 0);
      adicionarItem(
        breakdown,
        'Largura de 1m a 2m',
        tem(respostas, 'larguraMaiorPersiana', ['1m-2m']) ? 20 : 0
      );
      adicionarItem(
        breakdown,
        'Largura de 2m a 3m',
        tem(respostas, 'larguraMaiorPersiana', ['2m-3m']) ? 50 : 0
      );
      adicionarItem(
        breakdown,
        'Largura acima de 3m',
        tem(respostas, 'larguraMaiorPersiana', ['acima-3m']) ? 100 : 0
      );
      adicionarItem(
        breakdown,
        'Altura de 2,5m a 3,5m',
        tem(respostas, 'alturaInstalacao', ['2-5m-3-5m']) ? 50 : 0
      );
      adicionarItem(
        breakdown,
        'Altura acima de 3,5m',
        tem(respostas, 'alturaInstalacao', ['acima-3-5m']) ? 100 : 0
      );
      adicionarItem(breakdown, 'Parede em madeira', tem(respostas, 'tipoParede', ['madeira']) ? 20 : 0);
      adicionarItem(breakdown, 'Parede em drywall', tem(respostas, 'tipoParede', ['drywall']) ? 50 : 0);
      adicionarItem(breakdown, 'Buchas especiais', tem(respostas, 'buchasEspeciais', ['sim']) ? 20 : 0);
      adicionarItem(
        breakdown,
        'Fixação reforçada',
        tem(respostas, 'fixacaoReforcada', ['sim']) ? 40 : 0
      );
      adicionarItem(
        breakdown,
        'Ajuste de alinhamento',
        tem(respostas, 'ajusteAlinhamento', ['sim']) ? 20 : 0
      );
      adicionarItem(
        breakdown,
        'Segunda corrente',
        tem(respostas, 'segundaCorrente', ['sim']) ? 20 : 0
      );
      return finalizarResultado(breakdown, mensagens);
    }

    case 'limpeza-ar-split': {
      const qtd = resolverQuantidade(quantidade, resposta(respostas, 'quantidade'));
      const baseQuantidade =
        qtd === 1 ? 149 : qtd === 2 ? 278 : qtd === 3 ? 399 : qtd * 129;
      adicionarItem(breakdown, `Base limpeza de ${qtd} aparelho(s)`, baseQuantidade);
      adicionarItem(
        breakdown,
        'Capacidade de 12.001 a 18.000 BTUs',
        tem(respostas, 'capacidadeBtu', ['12001-18000']) ? 20 : 0
      );
      adicionarItem(
        breakdown,
        'Capacidade de 18.001 a 24.000 BTUs',
        tem(respostas, 'capacidadeBtu', ['18001-24000']) ? 40 : 0
      );
      adicionarItem(
        breakdown,
        'Capacidade acima de 24.000 BTUs',
        tem(respostas, 'capacidadeBtu', ['acima-24000']) ? 80 : 0
      );
      adicionarItem(breakdown, 'Ambiente comercial', tem(respostas, 'ambienteAr', ['loja']) ? 20 : 0);
      adicionarItem(
        breakdown,
        'Ambiente restaurante',
        tem(respostas, 'ambienteAr', ['restaurante']) ? 50 : 0
      );
      adicionarItem(
        breakdown,
        'Mais de 12 meses sem limpeza',
        tem(respostas, 'ultimaLimpezaAr', ['mais-12-meses']) ? 20 : 0
      );
      adicionarItem(breakdown, 'Nunca limpou', tem(respostas, 'ultimaLimpezaAr', ['nunca']) ? 40 : 0);
      adicionarItem(breakdown, 'Mau cheiro', tem(respostas, 'sintomaAr', ['mau-cheiro']) ? 20 : 0);
      adicionarItem(breakdown, 'Pingando água', tem(respostas, 'sintomaAr', ['pingando-agua']) ? 30 : 0);
      adicionarItem(
        breakdown,
        'Altura de 2,5m a 3,5m',
        tem(respostas, 'alturaInstalacao', ['2-5m-3-5m']) ? 50 : 0
      );
      adicionarItem(
        breakdown,
        'Altura acima de 3,5m',
        tem(respostas, 'alturaInstalacao', ['acima-3-5m']) ? 100 : 0
      );
      adicionarItem(
        breakdown,
        'Higienização premium',
        tem(respostas, 'upsellsLimpezaAr', ['higienizacao-premium']) ? 29 : 0
      );
      adicionarItem(
        breakdown,
        'Revisão preventiva',
        tem(respostas, 'upsellsLimpezaAr', ['revisao-preventiva']) ? 60 : 0
      );
      adicionarItem(
        breakdown,
        'Limpeza da condensadora',
        tem(respostas, 'upsellsLimpezaAr', ['limpeza-condensadora']) ? 50 : 0
      );
      return finalizarResultado(breakdown, mensagens);
    }

    case 'instalacao-ar-split': {
      adicionarItem(breakdown, 'Base instalação de ar-condicionado split', 699);
      adicionarItem(
        breakdown,
        'Capacidade de 12.001 a 18.000 BTUs',
        tem(respostas, 'capacidadeBtu', ['12001-18000']) ? 100 : 0
      );
      adicionarItem(
        breakdown,
        'Capacidade de 18.001 a 24.000 BTUs',
        tem(respostas, 'capacidadeBtu', ['18001-24000']) ? 200 : 0
      );
      adicionarItem(
        breakdown,
        'Distância de 3m a 5m',
        tem(respostas, 'distanciaEvapCond', ['3m-5m']) ? 150 : 0
      );
      adicionarItem(
        breakdown,
        'Distância de 5m a 7m',
        tem(respostas, 'distanciaEvapCond', ['5m-7m']) ? 300 : 0
      );
      adicionarItem(
        breakdown,
        'Sem ponto elétrico exclusivo',
        tem(respostas, 'pontoEletricoExclusivo', ['nao']) ? 250 : 0
      );
      adicionarItem(
        breakdown,
        'Suporte de parede para condensadora',
        tem(respostas, 'localCondensadora', ['suporte-parede']) ? 80 : 0
      );
      adicionarItem(
        breakdown,
        'Tubulação adicional',
        (numero(respostas, 'metrosTubulacaoAdicional') ?? 0) * 50
      );
      adicionarItem(
        breakdown,
        'Cabo adicional',
        (numero(respostas, 'metrosCaboAdicional') ?? 0) * 15
      );
      adicionarItem(
        breakdown,
        'Canaleta adicional',
        (numero(respostas, 'metrosCanaleta') ?? 0) * 35
      );
      adicionarItem(
        breakdown,
        'Suporte metálico',
        tem(respostas, 'suporteMetalico', ['sim']) ? 80 : 0
      );
      adicionarItem(
        breakdown,
        'Disjuntor exclusivo',
        tem(respostas, 'instalarDisjuntorExclusivo', ['sim']) ? 89 : 0
      );
      adicionarItem(
        breakdown,
        'Tomada dedicada',
        tem(respostas, 'instalarTomadaDedicada', ['sim']) ? 149 : 0
      );
      return finalizarResultado(breakdown, mensagens);
    }

    case 'poda-jardim': {
      const servico = resposta(respostas, 'servicoJardim') ?? 'poda-plantas-arbustos';

      if (servico === 'poda-plantas-arbustos') {
        adicionarItem(breakdown, 'Base poda de plantas e arbustos', 149);
        adicionarItem(breakdown, '4 a 6 plantas', tem(respostas, 'quantidadePlantas', ['4-6']) ? 80 : 0);
        adicionarItem(breakdown, '7 a 10 plantas', tem(respostas, 'quantidadePlantas', ['7-10']) ? 150 : 0);
        adicionarItem(breakdown, 'Mais de 10 plantas', tem(respostas, 'quantidadePlantas', ['mais-10']) ? 250 : 0);
        adicionarItem(breakdown, 'Altura de 2m a 3m', tem(respostas, 'alturaPlantas', ['2m-3m']) ? 50 : 0);
        adicionarItem(breakdown, 'Altura acima de 3m', tem(respostas, 'alturaPlantas', ['acima-3m']) ? 100 : 0);
        adicionarItem(
          breakdown,
          'Retirada de resíduos',
          tem(respostas, 'retiradaResiduosPlantas', ['sim']) ? 50 : 0
        );
        adicionarItem(
          breakdown,
          'Acesso difícil',
          tem(respostas, 'acessoFacilJardim', ['nao']) ? 50 : 0
        );
      } else if (servico === 'corte-grama') {
        adicionarItem(breakdown, 'Base corte de grama', 179);
        adicionarItem(breakdown, 'Área de 51 a 100m²', tem(respostas, 'areaGrama', ['51-100m2']) ? 80 : 0);
        adicionarItem(
          breakdown,
          'Área de 101 a 200m²',
          tem(respostas, 'areaGrama', ['101-200m2']) ? 180 : 0
        );
        adicionarItem(
          breakdown,
          'Área acima de 200m²',
          tem(respostas, 'areaGrama', ['acima-200m2']) ? 300 : 0
        );
        adicionarItem(
          breakdown,
          'Grama muito alta',
          tem(respostas, 'alturaGrama', ['muito-alta']) ? 50 : 0
        );
        adicionarItem(
          breakdown,
          'Recolhimento de resíduos',
          tem(respostas, 'recolherResiduosGrama', ['sim']) ? 50 : 0
        );
        adicionarItem(
          breakdown,
          'Terreno inclinado',
          tem(respostas, 'terrenoPlano', ['nao']) ? 50 : 0
        );
      } else if (servico === 'limpeza-jardim') {
        adicionarItem(breakdown, 'Base limpeza de jardim', 199);
        adicionarItem(
          breakdown,
          'Área de 51 a 100m²',
          tem(respostas, 'areaLimpezaJardim', ['51-100m2']) ? 80 : 0
        );
        adicionarItem(
          breakdown,
          'Área de 101 a 200m²',
          tem(respostas, 'areaLimpezaJardim', ['101-200m2']) ? 180 : 0
        );
        adicionarItem(
          breakdown,
          'Área acima de 200m²',
          tem(respostas, 'areaLimpezaJardim', ['acima-200m2']) ? 300 : 0
        );
        adicionarItem(
          breakdown,
          'Sujeira média',
          tem(respostas, 'nivelSujeiraJardim', ['medio']) ? 50 : 0
        );
        adicionarItem(
          breakdown,
          'Sujeira alta',
          tem(respostas, 'nivelSujeiraJardim', ['alto']) ? 100 : 0
        );
        adicionarItem(
          breakdown,
          'Volume médio de galhos',
          tem(respostas, 'volumeGalhos', ['medio']) ? 50 : 0
        );
        adicionarItem(
          breakdown,
          'Muito volume de galhos',
          tem(respostas, 'volumeGalhos', ['alto']) ? 100 : 0
        );
        adicionarItem(
          breakdown,
          'Retirada de resíduos',
          tem(respostas, 'retiradaResiduosJardim', ['sim']) ? 80 : 0
        );
      } else {
        adicionarItem(breakdown, 'Base poda de árvore pequena', 299);
        adicionarItem(breakdown, 'Altura de 2m a 4m', tem(respostas, 'alturaArvore', ['2m-4m']) ? 100 : 0);
        adicionarItem(
          breakdown,
          'Retirada de galhos',
          tem(respostas, 'retirarGalhosArvore', ['sim']) ? 100 : 0
        );
        adicionarItem(breakdown, 'Uso de escada', tem(respostas, 'precisaEscadaArvore', ['sim']) ? 50 : 0);
      }

      return finalizarResultado(breakdown, mensagens);
    }

    case 'limpeza-pos-obra': {
      adicionarItem(breakdown, 'Base limpeza pós-obra até 50m²', 399);
      adicionarItem(
        breakdown,
        'Imóvel comercial',
        tem(respostas, 'tipoImovelPosObra', ['loja', 'escritorio']) ? 100 : 0
      );
      adicionarItem(
        breakdown,
        'Área de 51 a 100m²',
        tem(respostas, 'areaImovelPosObra', ['51-100m2']) ? 250 : 0
      );
      adicionarItem(
        breakdown,
        'Área de 101 a 150m²',
        tem(respostas, 'areaImovelPosObra', ['101-150m2']) ? 500 : 0
      );
      adicionarItem(
        breakdown,
        'Área de 151 a 200m²',
        tem(respostas, 'areaImovelPosObra', ['151-200m2']) ? 800 : 0
      );
      adicionarItem(
        breakdown,
        'Parcialmente mobiliado',
        tem(respostas, 'ocupacaoImovelPosObra', ['parcialmente-mobiliado']) ? 100 : 0
      );
      adicionarItem(
        breakdown,
        'Totalmente mobiliado',
        tem(respostas, 'ocupacaoImovelPosObra', ['totalmente-mobiliado']) ? 200 : 0
      );
      adicionarItem(
        breakdown,
        'Sujeira média',
        tem(respostas, 'nivelSujeiraPosObra', ['medio']) ? 100 : 0
      );
      adicionarItem(
        breakdown,
        'Sujeira alta',
        tem(respostas, 'nivelSujeiraPosObra', ['alto']) ? 250 : 0
      );
      adicionarItem(
        breakdown,
        'Respingos de tinta',
        tem(respostas, 'residuosVisiveisPosObra', ['respingo-tinta']) ? 50 : 0
      );
      adicionarItem(
        breakdown,
        'Rejunte',
        tem(respostas, 'residuosVisiveisPosObra', ['rejunte']) ? 80 : 0
      );
      adicionarItem(
        breakdown,
        'Cimento',
        tem(respostas, 'residuosVisiveisPosObra', ['cimento']) ? 150 : 0
      );
      adicionarItem(
        breakdown,
        'Tinta + rejunte + cimento',
        tem(respostas, 'residuosVisiveisPosObra', ['tinta-rejunte-cimento']) ? 250 : 0
      );
      adicionarItem(
        breakdown,
        '2 banheiros',
        tem(respostas, 'quantidadeBanheirosPosObra', ['2']) ? 50 : 0
      );
      adicionarItem(
        breakdown,
        '3 banheiros',
        tem(respostas, 'quantidadeBanheirosPosObra', ['3']) ? 100 : 0
      );
      adicionarItem(
        breakdown,
        '4 ou mais banheiros',
        tem(respostas, 'quantidadeBanheirosPosObra', ['4-ou-mais']) ? 150 : 0
      );
      adicionarItem(
        breakdown,
        'Até 5 vidros/janelas',
        tem(respostas, 'vidrosJanelasPosObra', ['ate-5']) ? 50 : 0
      );
      adicionarItem(
        breakdown,
        'Mais de 5 vidros/janelas',
        tem(respostas, 'vidrosJanelasPosObra', ['mais-5']) ? 100 : 0
      );
      adicionarItem(
        breakdown,
        'Retirada de resíduos ensacados',
        tem(respostas, 'retiradaResiduosPosObra', ['sim']) ? 150 : 0
      );
      adicionarItem(breakdown, 'Varanda', tem(respostas, 'areasExtrasPosObra', ['varanda']) ? 50 : 0);
      adicionarItem(breakdown, 'Sacada', tem(respostas, 'areasExtrasPosObra', ['sacada']) ? 50 : 0);
      adicionarItem(
        breakdown,
        'Área gourmet',
        tem(respostas, 'areasExtrasPosObra', ['area-gourmet']) ? 100 : 0
      );
      adicionarItem(breakdown, 'Quintal', tem(respostas, 'areasExtrasPosObra', ['quintal']) ? 100 : 0);
      adicionarItem(
        breakdown,
        'Armários internos',
        tem(respostas, 'armariosInternos', ['sim']) ? 100 : 0
      );
      adicionarItem(
        breakdown,
        'Geladeira interna',
        tem(respostas, 'geladeiraInterna', ['sim']) ? 50 : 0
      );
      adicionarItem(breakdown, 'Forno interno', tem(respostas, 'fornoInterno', ['sim']) ? 50 : 0);
      return finalizarResultado(breakdown, mensagens);
    }
  }
}
