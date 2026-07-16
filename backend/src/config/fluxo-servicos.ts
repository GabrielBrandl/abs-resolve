import { SERVICOS_CATALOGO } from './catalogo-servicos.js';

export const SLUGS_FLUXO_SERVICO = [
  'troca-tomada',
  'troca-interruptor',
  'instalacao-chuveiro',
  'troca-disjuntor',
  'instalacao-luminaria',
  'instalacao-ventilador-teto',
  'troca-torneira',
  'troca-registro',
  'reparo-vazamento',
  'desentupimento-pia',
  'desentupimento-vaso',
  'instalacao-suporte-tv',
  'instalacao-prateleira',
  'montagem-moveis-simples',
  'montagem-guarda-roupa',
  'instalacao-persiana',
  'limpeza-ar-split',
  'instalacao-ar-split',
  'poda-jardim',
  'limpeza-pos-obra',
] as const;

export type SlugFluxoServico = (typeof SLUGS_FLUXO_SERVICO)[number];
export type RespostaFluxoValor = string | string[] | number | boolean | null | undefined;
export type RespostasFluxo = Record<string, RespostaFluxoValor>;

export interface FluxoPerguntaOpcao {
  id: string;
  label: string;
  precoAdicional?: number;
}

export interface FluxoPerguntaShowIf {
  perguntaId: string;
  opcaoIds: string[];
}

export interface FluxoPergunta {
  id: string;
  titulo: string;
  opcoes: FluxoPerguntaOpcao[];
  showIf?: FluxoPerguntaShowIf;
}

export interface RegraValidacaoFluxo {
  when: Record<string, string[]>;
  mensagem: string;
}

export interface FluxoServico {
  slug: SlugFluxoServico;
  nome: string;
  perguntas: FluxoPergunta[];
  fotosObrigatorias: string[];
  regrasValidacao: RegraValidacaoFluxo[];
}

const slugsCatalogo = new Set(SERVICOS_CATALOGO.map((servico) => servico.slug));
for (const slug of SLUGS_FLUXO_SERVICO) {
  if (!slugsCatalogo.has(slug)) {
    throw new Error(`Slug de fluxo sem correspondencia no catalogo: ${slug}`);
  }
}

const NOME_SERVICO_POR_SLUG = Object.fromEntries(
  SERVICOS_CATALOGO.map((servico) => [servico.slug, servico.nome])
) as Record<string, string>;

const opcao = (id: string, label: string): FluxoPerguntaOpcao => ({ id, label });

const pergunta = (
  id: string,
  titulo: string,
  opcoes: FluxoPerguntaOpcao[],
  showIf?: FluxoPerguntaShowIf
): FluxoPergunta => ({
  id,
  titulo,
  opcoes,
  ...(showIf ? { showIf } : {}),
});

const nomeServico = (slug: SlugFluxoServico) => NOME_SERVICO_POR_SLUG[slug] ?? slug;

const OPCOES_SIM_NAO = [opcao('sim', 'Sim'), opcao('nao', 'Não')];
const OPCOES_SIM_NAO_NAO_SEI = [...OPCOES_SIM_NAO, opcao('nao-sei', 'Não sei')];
const OPCOES_QTD_1_A_4 = [opcao('1', '1'), opcao('2', '2'), opcao('3', '3'), opcao('4', '4')];
const OPCOES_QTD_1_A_4_MAIS = [...OPCOES_QTD_1_A_4, opcao('mais-4', 'Mais de 4')];
const OPCOES_QTD_1_A_4_OU_MAIS = [...OPCOES_QTD_1_A_4, opcao('4-ou-mais', '4 ou mais')];
const OPCOES_QTD_1_A_3 = [opcao('1', '1'), opcao('2', '2'), opcao('3', '3')];
const OPCOES_QTD_1_A_3_OU_MAIS = [...OPCOES_QTD_1_A_3, opcao('3-ou-mais', '3 ou mais')];
const OPCOES_LOCAL_INTERNO = [
  opcao('sala', 'Sala'),
  opcao('quarto', 'Quarto'),
  opcao('cozinha', 'Cozinha'),
  opcao('banheiro', 'Banheiro'),
];
const OPCOES_LOCAL_COM_EXTERNA = [
  ...OPCOES_LOCAL_INTERNO,
  opcao('area-externa', 'Área externa'),
  opcao('comercial', 'Comercial'),
];

export const FLUXOS_SERVICO: Record<SlugFluxoServico, FluxoServico> = {
  'troca-tomada': {
    slug: 'troca-tomada',
    nome: nomeServico('troca-tomada'),
    perguntas: [
      pergunta('tipoTomada', 'Qual tomada deseja trocar?', [
        opcao('simples', 'Tomada simples'),
        opcao('dupla', 'Tomada dupla'),
        opcao('tomada-20a', 'Tomada 20A'),
      ]),
      pergunta('quantidade', 'Quantidade', OPCOES_QTD_1_A_4_MAIS),
      pergunta('fornecimentoTomada', 'Quem fornece a tomada?', [
        opcao('cliente', 'Eu já tenho'),
        opcao('abs-padrao', 'Quero tomada padrão ABS'),
        opcao('abs-premium', 'Quero tomada premium ABS'),
      ]),
      pergunta('estadoAtual', 'Estado atual', [
        opcao('funcionando', 'Está funcionando'),
        opcao('nao-funciona', 'Não funciona'),
        opcao('queimada', 'Está queimada'),
        opcao('aquecendo', 'Está aquecendo'),
      ]),
      pergunta('localInstalacao', 'Local', OPCOES_LOCAL_COM_EXTERNA),
      pergunta('alturaInstalacao', 'Altura', [
        opcao('ate-2-5m', 'Até 2,5m'),
        opcao('acima-2-5m', 'Acima de 2,5m'),
      ]),
      pergunta('acabamentoParede', 'Acabamento da parede', [
        opcao('pintura', 'Pintura'),
        opcao('gesso', 'Gesso'),
        opcao('ceramica', 'Cerâmica'),
        opcao('porcelanato', 'Porcelanato'),
      ]),
    ],
    fotosObrigatorias: ['Foto frontal', 'Foto lateral', 'Foto afastada', 'Foto do quadro elétrico'],
    regrasValidacao: [
      { when: { estadoAtual: ['queimada'] }, mensagem: 'Tomada queimada requer validação técnica ABS.' },
      { when: { derretimentoTomada: ['sim'] }, mensagem: 'Derretimento na tomada requer validação técnica ABS.' },
      { when: { fioExposto: ['sim'] }, mensagem: 'Fiação exposta requer validação técnica ABS.' },
      { when: { instalacaoAntiga: ['sim'] }, mensagem: 'Instalação antiga requer validação técnica ABS.' },
      { when: { semAterramento: ['sim'] }, mensagem: 'Ausência de aterramento requer validação técnica ABS.' },
      { when: { caixaQuebrada: ['sim'] }, mensagem: 'Caixa quebrada requer validação técnica ABS.' },
    ],
  },
  'troca-interruptor': {
    slug: 'troca-interruptor',
    nome: nomeServico('troca-interruptor'),
    perguntas: [
      pergunta('tipoInterruptor', 'Tipo de interruptor', [
        opcao('simples', 'Simples'),
        opcao('duplo', 'Duplo'),
        opcao('triplo', 'Triplo'),
        opcao('paralelo', 'Paralelo'),
        opcao('intermediario', 'Intermediário'),
      ]),
      pergunta('quantidade', 'Quantidade', OPCOES_QTD_1_A_4_MAIS),
      pergunta('fornecimentoInterruptor', 'Quem fornece?', [
        opcao('cliente', 'Cliente'),
        opcao('abs-padrao', 'ABS padrão'),
        opcao('abs-premium', 'ABS premium'),
      ]),
      pergunta('estadoInterruptor', 'Estado', [
        opcao('funciona', 'Funciona'),
        opcao('funciona-parcialmente', 'Funciona parcialmente'),
        opcao('nao-funciona', 'Não funciona'),
        opcao('aquece', 'Aquece'),
        opcao('faisca-cheiro-queimado', 'Estala/faísca/cheiro queimado'),
      ]),
      pergunta('localInstalacao', 'Local', [
        opcao('quarto', 'Quarto'),
        opcao('sala', 'Sala'),
        opcao('corredor', 'Corredor'),
        opcao('cozinha', 'Cozinha'),
        opcao('banheiro', 'Banheiro'),
        opcao('area-externa', 'Área externa'),
        opcao('comercial', 'Comercial'),
      ]),
      pergunta('alturaInstalacao', 'Altura', [
        opcao('ate-2-5m', 'Até 2,5m'),
        opcao('acima-2-5m', 'Acima de 2,5m'),
      ]),
      pergunta('acabamentoParede', 'Acabamento', [
        opcao('pintura', 'Pintura'),
        opcao('gesso', 'Gesso'),
        opcao('ceramica', 'Cerâmica'),
        opcao('porcelanato', 'Porcelanato'),
      ]),
    ],
    fotosObrigatorias: ['Frontal', 'Parede afastada', 'Ligado/desligado', 'Quadro elétrico'],
    regrasValidacao: [
      { when: { interruptorEspecial: ['inteligente'] }, mensagem: 'Interruptor inteligente requer validação técnica ABS.' },
      { when: { interruptorEspecial: ['rele'] }, mensagem: 'Relé requer validação técnica ABS.' },
      { when: { interruptorEspecial: ['minuteria'] }, mensagem: 'Minuteria requer validação técnica ABS.' },
      { when: { interruptorEspecial: ['automacao'] }, mensagem: 'Automação requer validação técnica ABS.' },
    ],
  },
  'instalacao-chuveiro': {
    slug: 'instalacao-chuveiro',
    nome: nomeServico('instalacao-chuveiro'),
    perguntas: [
      pergunta('tipoServicoChuveiro', 'O que deseja?', [
        opcao('instalar-comum', 'Instalar chuveiro comum'),
        opcao('instalar-eletronico', 'Instalar chuveiro eletrônico'),
        opcao('trocar-resistencia', 'Trocar resistência'),
        opcao('instalar-com-revisao-eletrica', 'Instalar chuveiro + revisão elétrica'),
      ]),
      pergunta('chuveiroComprado', 'O chuveiro novo já foi comprado?', [
        opcao('sim', 'Sim'),
        opcao('nao-abs', 'Não, quero comprar pela ABS'),
      ]),
      pergunta('potenciaChuveiro', 'Potência', [
        opcao('ate-5500w', 'Até 5.500W'),
        opcao('5501-6800w', '5.501W a 6.800W'),
        opcao('6801-7500w', '6.801W a 7.500W'),
        opcao('acima-7500w', 'Acima de 7.500W'),
        opcao('nao-sei', 'Não sei'),
      ]),
      pergunta('jaExisteChuveiro', 'Já existe chuveiro instalado?', OPCOES_SIM_NAO_NAO_SEI),
      pergunta('tensaoChuveiro', 'Tensão', [
        opcao('127v', '127V'),
        opcao('220v', '220V'),
        opcao('nao-sei', 'Não sei'),
      ]),
      pergunta('disjuntorExclusivo', 'Disjuntor exclusivo?', OPCOES_SIM_NAO_NAO_SEI),
      pergunta('alturaInstalacao', 'Altura', [
        opcao('ate-3m', 'Até 3m'),
        opcao('acima-3m', 'Acima de 3m'),
      ]),
    ],
    fotosObrigatorias: ['Chuveiro atual', 'Saída de água', 'Fiação', 'Quadro elétrico aberto', 'Etiqueta do novo chuveiro'],
    regrasValidacao: [
      { when: { jaExisteChuveiro: ['nao'] }, mensagem: 'Sem chuveiro existente no local, a ABS precisa validar tecnicamente.' },
      { when: { potenciaChuveiro: ['acima-7500w'] }, mensagem: 'Potência acima de 7.500W requer validação técnica ABS.' },
      { when: { fiacaoRuim: ['sim'] }, mensagem: 'Fiação em mau estado requer validação técnica ABS.' },
      { when: { tipoServicoChuveiro: ['trocar-resistencia'], chuveiroNaoLiga: ['sim'] }, mensagem: 'Chuveiro que não liga requer validação técnica ABS.' },
    ],
  },
  'troca-disjuntor': {
    slug: 'troca-disjuntor',
    nome: nomeServico('troca-disjuntor'),
    perguntas: [
      pergunta('sabeDisjuntor', 'Você sabe qual disjuntor deseja trocar?', [
        opcao('sim', 'Sim'),
        opcao('nao-sei', 'Não sei'),
      ]),
      pergunta('tipoDisjuntor', 'Tipo', [
        opcao('monopolar', 'Monopolar'),
        opcao('bipolar', 'Bipolar'),
        opcao('tripolar', 'Tripolar'),
        opcao('nao-sei', 'Não sei'),
      ]),
      pergunta('amperagemDisjuntor', 'Amperagem', [
        opcao('10a', '10A'),
        opcao('16a', '16A'),
        opcao('20a', '20A'),
        opcao('25a', '25A'),
        opcao('32a', '32A'),
        opcao('40a', '40A'),
        opcao('50a', '50A'),
        opcao('63a', '63A'),
        opcao('nao-sei', 'Não sei'),
      ]),
      pergunta('motivoTrocaDisjuntor', 'Motivo da troca', [
        opcao('preventiva', 'Preventiva'),
        opcao('quebrou', 'Quebrou'),
        opcao('nao-arma', 'Não arma'),
        opcao('desarmando', 'Está desarmando'),
        opcao('cheiro-queimado', 'Cheiro de queimado'),
        opcao('derreteu', 'Derreteu'),
      ]),
    ],
    fotosObrigatorias: ['Foto aproximada do disjuntor', 'Foto do quadro completo', 'Foto da tampa do quadro', 'Foto dos fios'],
    regrasValidacao: [
      { when: { quadroQueimado: ['sim'] }, mensagem: 'Quadro queimado requer validação técnica ABS.' },
      { when: { quadroSuperlotado: ['sim'] }, mensagem: 'Quadro superlotado requer validação técnica ABS.' },
      { when: { quadroOxidado: ['sim'] }, mensagem: 'Quadro oxidado requer validação técnica ABS.' },
      { when: { motivoTrocaDisjuntor: ['derreteu'] }, mensagem: 'Disjuntor derretido requer validação técnica ABS.' },
      { when: { amperagemDisjuntor: ['50a'], tipoDisjuntor: ['monopolar'] }, mensagem: 'Disjuntor monopolar de 50A exige análise humana.' },
      { when: { amperagemDisjuntor: ['63a'], tipoDisjuntor: ['monopolar'] }, mensagem: 'Disjuntor monopolar de 63A exige análise humana.' },
    ],
  },
  'instalacao-luminaria': {
    slug: 'instalacao-luminaria',
    nome: nomeServico('instalacao-luminaria'),
    perguntas: [
      pergunta('tipoLuminaria', 'Tipo de luminária', [
        opcao('plafon-led', 'Plafon LED'),
        opcao('sobrepor', 'Sobrepor'),
        opcao('painel-led', 'Painel LED'),
        opcao('spot-individual', 'Spot individual'),
        opcao('spot-trilho', 'Spot trilho'),
        opcao('pendente', 'Pendente'),
        opcao('lustre-pequeno', 'Lustre pequeno'),
        opcao('lustre-medio', 'Lustre médio'),
        opcao('lustre-grande', 'Lustre grande'),
      ]),
      pergunta('quantidade', 'Quantidade', [
        opcao('1', '1'),
        opcao('2', '2'),
        opcao('3', '3'),
        opcao('4-ou-mais', '4 ou mais'),
      ]),
      pergunta('alturaInstalacao', 'Altura', [
        opcao('ate-3m', 'Até 3m'),
        opcao('3m-4m', '3m a 4m'),
        opcao('acima-4m', 'Acima de 4m'),
      ]),
      pergunta('tipoTeto', 'Tipo de teto', [
        opcao('laje', 'Laje'),
        opcao('gesso', 'Gesso'),
        opcao('pvc', 'PVC'),
        opcao('madeira', 'Madeira'),
        opcao('estrutura-metalica', 'Estrutura metálica'),
      ]),
      pergunta('pesoLuminaria', 'Peso aproximado', [
        opcao('ate-3kg', 'Até 3kg'),
        opcao('3kg-10kg', '3kg a 10kg'),
        opcao('acima-10kg', 'Acima de 10kg'),
        opcao('nao-sei', 'Não sei'),
      ]),
      pergunta('pontoEletricoExistente', 'Já existe ponto elétrico?', OPCOES_SIM_NAO_NAO_SEI),
    ],
    fotosObrigatorias: ['Local da instalação', 'Teto completo', 'Ponto elétrico', 'Luminária'],
    regrasValidacao: [
      { when: { pontoEletricoExistente: ['nao'] }, mensagem: 'Sem ponto elétrico existente, a ABS precisa validar tecnicamente.' },
      { when: { tipoLuminaria: ['lustre-grande'] }, mensagem: 'Lustre grande requer validação técnica ABS.' },
      { when: { pesoLuminaria: ['acima-10kg'] }, mensagem: 'Luminária acima de 10kg requer validação técnica ABS.' },
      { when: { alturaInstalacao: ['acima-4m'] }, mensagem: 'Instalação acima de 4m requer validação técnica ABS.' },
    ],
  },
  'instalacao-ventilador-teto': {
    slug: 'instalacao-ventilador-teto',
    nome: nomeServico('instalacao-ventilador-teto'),
    perguntas: [
      pergunta('tipoVentilador', 'Tipo de ventilador', [
        opcao('sem-luminaria', 'Ventilador sem luminária'),
        opcao('com-luminaria', 'Ventilador com luminária'),
      ]),
      pergunta('quantidade', 'Quantidade', [
        opcao('1', '1'),
        opcao('2', '2'),
        opcao('3', '3'),
        opcao('4-ou-mais', '4 ou mais'),
      ]),
      pergunta('alturaInstalacao', 'Altura', [
        opcao('ate-3m', 'Até 3m'),
        opcao('3m-4m', '3m a 4m'),
        opcao('acima-4m', 'Acima de 4m'),
      ]),
      pergunta('tipoTeto', 'Tipo de teto', [
        opcao('laje', 'Laje'),
        opcao('gesso', 'Gesso'),
        opcao('pvc', 'PVC'),
        opcao('madeira', 'Madeira'),
        opcao('estrutura-metalica', 'Estrutura metálica'),
      ]),
      pergunta('pontoEletricoExistente', 'Já existe ponto elétrico?', OPCOES_SIM_NAO_NAO_SEI),
      pergunta('ganchoExistente', 'Já existe suporte ou gancho no teto?', OPCOES_SIM_NAO_NAO_SEI),
      pergunta('acionamentoVentilador', 'Acionamento', [
        opcao('parede', 'Chave comum'),
        opcao('controle-parede', 'Controle de parede'),
        opcao('controle-remoto', 'Controle remoto'),
      ]),
    ],
    fotosObrigatorias: ['Local da instalação', 'Teto completo', 'Ponto elétrico', 'Ventilador'],
    regrasValidacao: [
      { when: { pontoEletricoExistente: ['nao'] }, mensagem: 'Sem ponto elétrico, a instalação do ventilador requer validação técnica ABS.' },
      { when: { alturaInstalacao: ['acima-4m'] }, mensagem: 'Ventilador acima de 4m requer validação técnica ABS.' },
      { when: { tipoTeto: ['estrutura-metalica'] }, mensagem: 'Estrutura metálica requer validação técnica ABS.' },
    ],
  },
  'troca-torneira': {
    slug: 'troca-torneira',
    nome: nomeServico('troca-torneira'),
    perguntas: [
      pergunta('tipoTorneira', 'Tipo de torneira', [
        opcao('convencional', 'Convencional'),
        opcao('gourmet', 'Gourmet'),
        opcao('monocomando-misturador', 'Monocomando/misturador'),
        opcao('eletrica', 'Elétrica'),
      ]),
      pergunta('localInstalacao', 'Local', [
        opcao('banheiro', 'Banheiro'),
        opcao('cozinha', 'Cozinha'),
        opcao('area-servico', 'Área de serviço'),
        opcao('jardim', 'Jardim'),
      ]),
      pergunta('quantidade', 'Quantidade', [
        opcao('1', '1'),
        opcao('2', '2'),
        opcao('3', '3'),
        opcao('4-ou-mais', '4 ou mais'),
      ]),
      pergunta('torneiraComprada', 'Já comprou a torneira?', OPCOES_SIM_NAO),
      pergunta('registroFuncionando', 'Existe registro funcionando?', OPCOES_SIM_NAO_NAO_SEI),
      pergunta('temAguaQuente', 'Tem água quente?', OPCOES_SIM_NAO_NAO_SEI, {
        perguntaId: 'tipoTorneira',
        opcaoIds: ['monocomando-misturador'],
      }),
      pergunta('quantidadeEntradasAgua', 'Quantas entradas existem?', [
        opcao('1-entrada', '1 entrada'),
        opcao('2-entradas', '2 entradas'),
        opcao('nao-sei', 'Não sei'),
      ], {
        perguntaId: 'tipoTorneira',
        opcaoIds: ['monocomando-misturador'],
      }),
      pergunta('eletricaInstalada', 'Já existe elétrica instalada?', OPCOES_SIM_NAO_NAO_SEI, {
        perguntaId: 'tipoTorneira',
        opcaoIds: ['eletrica'],
      }),
      pergunta('tomadaProxima', 'Existe tomada próxima?', OPCOES_SIM_NAO_NAO_SEI, {
        perguntaId: 'tipoTorneira',
        opcaoIds: ['eletrica'],
      }),
      pergunta('tensaoTorneiraEletrica', 'Qual tensão?', [
        opcao('127v', '127V'),
        opcao('220v', '220V'),
        opcao('nao-sei', 'Não sei'),
      ], {
        perguntaId: 'tipoTorneira',
        opcaoIds: ['eletrica'],
      }),
    ],
    fotosObrigatorias: ['Torneira atual', 'Parte inferior da pia', 'Nova torneira', 'Tomada, se for elétrica'],
    regrasValidacao: [
      {
        when: { tipoTorneira: ['monocomando-misturador'], temAguaQuente: ['nao'] },
        mensagem: 'Monocomando sem água quente requer análise humana.',
      },
      {
        when: { tipoTorneira: ['monocomando-misturador'], quantidadeEntradasAgua: ['1-entrada'] },
        mensagem: 'Monocomando com apenas uma entrada requer análise humana.',
      },
      {
        when: { tipoTorneira: ['eletrica'], eletricaInstalada: ['nao'] },
        mensagem: 'Sem elétrica instalada, o atendimento deve ser validado pela ABS.',
      },
      {
        when: { tipoTorneira: ['eletrica'], tomadaProxima: ['nao'] },
        mensagem: 'Sem tomada próxima, a ABS precisa validar tecnicamente a instalação.',
      },
      {
        when: { registroFuncionando: ['nao'] },
        mensagem: 'Registro sem fechamento adequado requer validação técnica ABS.',
      },
    ],
  },
  'troca-registro': {
    slug: 'troca-registro',
    nome: nomeServico('troca-registro'),
    perguntas: [
      pergunta('tipoRegistro', 'Tipo de registro', [
        opcao('registro-chuveiro', 'Registro de chuveiro'),
        opcao('registro-gaveta', 'Registro de gaveta'),
        opcao('registro-geral', 'Registro geral'),
      ]),
      pergunta('problemaRegistro', 'Problema', [
        opcao('vazamento', 'Vazamento'),
        opcao('nao-abre', 'Não abre'),
        opcao('nao-fecha', 'Não fecha'),
        opcao('travado', 'Travado'),
        opcao('quebrado', 'Quebrado'),
        opcao('troca-preventiva', 'Troca preventiva'),
      ]),
      pergunta('bitolaRegistro', 'Bitola', [
        opcao('1-2', '1/2"'),
        opcao('3-4', '3/4"'),
        opcao('1', '1"'),
        opcao('1-1-4', '1 1/4"'),
        opcao('nao-sei', 'Não sei'),
      ]),
      pergunta('registroComprado', 'Já comprou o registro?', OPCOES_SIM_NAO),
      pergunta('registroGeralFuncionando', 'Existe registro geral funcionando?', OPCOES_SIM_NAO_NAO_SEI),
    ],
    fotosObrigatorias: ['Registro completo', 'Registro aberto', 'Registro fechado', 'Novo registro', 'Visão geral do local'],
    regrasValidacao: [
      { when: { registroEmbutido: ['sim'] }, mensagem: 'Registro embutido requer validação técnica ABS.' },
      { when: { paredeMolhada: ['sim'] }, mensagem: 'Parede molhada requer validação técnica ABS.' },
      { when: { materialGalvanizado: ['sim'] }, mensagem: 'Tubulação galvanizada requer validação técnica ABS.' },
      { when: { precisaQuebra: ['sim'] }, mensagem: 'Necessidade de quebra requer validação técnica ABS.' },
    ],
  },
  'reparo-vazamento': {
    slug: 'reparo-vazamento',
    nome: nomeServico('reparo-vazamento'),
    perguntas: [
      pergunta('origemVazamento', 'Onde está o vazamento?', [
        opcao('torneira', 'Torneira'),
        opcao('registro', 'Registro'),
        opcao('sifao', 'Sifão'),
        opcao('caixa-acoplada', 'Caixa acoplada'),
        opcao('parede-tubulacao', 'Parede/tubulação'),
      ]),
      pergunta('localExatoVazamento', 'Local exato', [
        opcao('na-ponta', 'Na ponta'),
        opcao('na-base', 'Na base'),
        opcao('embaixo-pia', 'Embaixo da pia'),
        opcao('dentro-vaso', 'Dentro do vaso'),
        opcao('na-parede', 'Na parede'),
        opcao('no-teto', 'No teto'),
        opcao('nao-sei', 'Não sei'),
      ]),
      pergunta('quantidade', 'Quantidade', OPCOES_QTD_1_A_3_OU_MAIS),
      pergunta('aguaPodeSerFechada', 'A água pode ser fechada?', OPCOES_SIM_NAO_NAO_SEI),
      pergunta('absFornecePecas', 'Quer que a ABS forneça peças?', OPCOES_SIM_NAO),
    ],
    fotosObrigatorias: ['Local do vazamento', 'Visão geral', 'Parte inferior, se for pia', 'Parede/teto afetado, se houver'],
    regrasValidacao: [
      { when: { origemVazamento: ['parede-tubulacao'], localExatoVazamento: ['nao-sei'] }, mensagem: 'Origem desconhecida requer validação técnica ABS.' },
      { when: { localExatoVazamento: ['no-teto'] }, mensagem: 'Vazamento no teto requer validação técnica ABS.' },
      { when: { origemDesconhecida: ['sim'] }, mensagem: 'Origem desconhecida requer validação técnica ABS.' },
      { when: { entreApartamentos: ['sim'] }, mensagem: 'Vazamento entre apartamentos requer validação técnica ABS.' },
      { when: { vazamentoOculto: ['sim'] }, mensagem: 'Vazamento oculto requer validação técnica ABS.' },
    ],
  },
  'desentupimento-pia': {
    slug: 'desentupimento-pia',
    nome: nomeServico('desentupimento-pia'),
    perguntas: [
      pergunta('problemaDesentupimento', 'Problema', [
        opcao('agua-escoa-lentamente', 'Água escoa lentamente'),
        opcao('agua-nao-escoa', 'Água não escoa'),
        opcao('agua-retorna', 'Água retorna'),
        opcao('mau-cheiro', 'Mau cheiro'),
        opcao('retorno-esgoto', 'Retorno de esgoto'),
      ]),
      pergunta('tempoProblema', 'Tempo do problema', [
        opcao('menos-24h', 'Menos de 24h'),
        opcao('menos-7-dias', 'Menos de 7 dias'),
        opcao('mais-7-dias', 'Mais de 7 dias'),
      ]),
      pergunta('quantidade', 'Quantidade afetada', OPCOES_QTD_1_A_3_OU_MAIS),
      pergunta('acessoSifao', 'Acesso ao sifão', OPCOES_SIM_NAO_NAO_SEI),
      pergunta('objetoCaiu', 'Caiu algum objeto?', OPCOES_SIM_NAO_NAO_SEI),
    ],
    fotosObrigatorias: ['Pia', 'Ralo', 'Sifão', 'Cozinha geral'],
    regrasValidacao: [
      { when: { problemaDesentupimento: ['retorno-esgoto'] }, mensagem: 'Retorno de esgoto requer validação técnica ABS.' },
      { when: { retornoOutrosPontos: ['sim'] }, mensagem: 'Retorno por outros pontos requer validação técnica ABS.' },
      { when: { multiplosAmbientes: ['sim'] }, mensagem: 'Múltiplos ambientes afetados requerem validação técnica ABS.' },
    ],
  },
  'desentupimento-vaso': {
    slug: 'desentupimento-vaso',
    nome: nomeServico('desentupimento-vaso'),
    perguntas: [
      pergunta('problemaDesentupimento', 'Problema', [
        opcao('agua-nao-escoa', 'Água não escoa'),
        opcao('agua-retorna', 'Água retorna'),
        opcao('vaso-transborda', 'Vaso transborda'),
        opcao('retorno-esgoto', 'Retorno de esgoto'),
      ]),
      pergunta('tempoProblema', 'Tempo do problema', [
        opcao('menos-24h', 'Menos de 24h'),
        opcao('menos-7-dias', 'Menos de 7 dias'),
        opcao('mais-7-dias', 'Mais de 7 dias'),
      ]),
      pergunta('quantidade', 'Quantidade afetada', OPCOES_QTD_1_A_3_OU_MAIS),
      pergunta('acessoVaso', 'Acesso ao vaso', OPCOES_SIM_NAO_NAO_SEI),
      pergunta('objetoCaiu', 'Caiu algum objeto?', OPCOES_SIM_NAO_NAO_SEI),
    ],
    fotosObrigatorias: ['Vaso sanitário', 'Ralo', 'Banheiro geral'],
    regrasValidacao: [
      { when: { problemaDesentupimento: ['retorno-esgoto'] }, mensagem: 'Retorno de esgoto requer validação técnica ABS.' },
      { when: { retornoOutrosPontos: ['sim'] }, mensagem: 'Retorno por outros pontos requer validação técnica ABS.' },
      { when: { multiplosAmbientes: ['sim'] }, mensagem: 'Múltiplos ambientes afetados requerem validação técnica ABS.' },
    ],
  },
  'instalacao-suporte-tv': {
    slug: 'instalacao-suporte-tv',
    nome: nomeServico('instalacao-suporte-tv'),
    perguntas: [
      pergunta('tipoSuporteTv', 'Tipo de suporte', [
        opcao('fixo', 'Fixo'),
        opcao('inclinavel', 'Inclinável'),
        opcao('articulado', 'Articulado'),
      ]),
      pergunta('tamanhoTv', 'Tamanho da TV', [
        opcao('ate-32', 'Até 32"'),
        opcao('33-50', '33" a 50"'),
        opcao('51-65', '51" a 65"'),
        opcao('66-75', '66" a 75"'),
        opcao('acima-75', 'Acima de 75"'),
      ]),
      pergunta('jaPossuiSuporte', 'Já possui suporte?', OPCOES_SIM_NAO),
      pergunta('tipoParede', 'Tipo da parede', [
        opcao('alvenaria', 'Alvenaria'),
        opcao('drywall', 'Drywall'),
        opcao('madeira', 'Madeira'),
        opcao('nao-sei', 'Não sei'),
      ]),
      pergunta('alturaInstalacao', 'Altura', [
        opcao('ate-2-5m', 'Até 2,5m'),
        opcao('2-5m-3-5m', '2,5m a 3,5m'),
        opcao('acima-3-5m', 'Acima de 3,5m'),
      ]),
      pergunta('upsellsTv', 'Upsells', [
        opcao('canaleta', 'Canaleta'),
        opcao('organizacao-cabos', 'Organização de cabos'),
        opcao('soundbar', 'Soundbar'),
        opcao('prateleira-receptor', 'Prateleira para receptor'),
      ]),
    ],
    fotosObrigatorias: ['Parede', 'TV', 'Suporte', 'Ambiente completo'],
    regrasValidacao: [
      { when: { tipoParede: ['drywall'] }, mensagem: 'Drywall requer validação técnica ABS.' },
      { when: { tamanhoTv: ['acima-75'] }, mensagem: 'TV acima de 75" requer validação técnica ABS.' },
      { when: { acabamentoParede: ['porcelanato'] }, mensagem: 'Porcelanato requer validação técnica ABS.' },
      { when: { alturaInstalacao: ['acima-3-5m'] }, mensagem: 'Instalação acima de 3,5m requer validação técnica ABS.' },
    ],
  },
  'instalacao-prateleira': {
    slug: 'instalacao-prateleira',
    nome: nomeServico('instalacao-prateleira'),
    perguntas: [
      pergunta('quantidade', 'Quantas prateleiras?', [
        opcao('1', '1'),
        opcao('2', '2'),
        opcao('3', '3'),
        opcao('4-ou-mais', '4 ou mais'),
      ]),
      pergunta('comprimentoMaiorPrateleira', 'Comprimento da maior', [
        opcao('ate-60cm', 'Até 60cm'),
        opcao('61cm-1m', '61cm a 1m'),
        opcao('1m-2m', '1m a 2m'),
        opcao('acima-2m', 'Acima de 2m'),
      ]),
      pergunta('tipoParede', 'Tipo de parede', [
        opcao('alvenaria', 'Alvenaria'),
        opcao('drywall', 'Drywall'),
        opcao('madeira', 'Madeira'),
        opcao('nao-sei', 'Não sei'),
      ]),
      pergunta('alturaInstalacao', 'Altura', [
        opcao('ate-2-5m', 'Até 2,5m'),
        opcao('2-5m-3-5m', '2,5m a 3,5m'),
        opcao('acima-3-5m', 'Acima de 3,5m'),
      ]),
      pergunta('usoPrateleira', 'O que ficará sobre ela?', [
        opcao('decoracao', 'Decoração'),
        opcao('livros', 'Livros'),
        opcao('utensilios', 'Utensílios'),
        opcao('ferramentas', 'Ferramentas'),
        opcao('estoque', 'Estoque'),
      ]),
      pergunta('temFerragens', 'Tem suportes e ferragens?', OPCOES_SIM_NAO),
    ],
    fotosObrigatorias: ['Parede', 'Ambiente', 'Prateleira', 'Ferragens'],
    regrasValidacao: [
      { when: { usoPrateleira: ['estoque'] }, mensagem: 'Carga alta na prateleira requer validação técnica ABS.' },
      { when: { tipoParede: ['drywall'], drywallComReforco: ['nao'] }, mensagem: 'Drywall sem reforço requer validação técnica ABS.' },
      { when: { acabamentoParede: ['porcelanato'] }, mensagem: 'Porcelanato requer validação técnica ABS.' },
      { when: { alturaInstalacao: ['2-5m-3-5m'] }, mensagem: 'Instalação acima de 2m requer validação técnica ABS.' },
      { when: { alturaInstalacao: ['acima-3-5m'] }, mensagem: 'Instalação acima de 2m requer validação técnica ABS.' },
    ],
  },
  'montagem-moveis-simples': {
    slug: 'montagem-moveis-simples',
    nome: nomeServico('montagem-moveis-simples'),
    perguntas: [
      pergunta('tipoMovelSimples', 'Qual móvel?', [
        opcao('criado-mudo', 'Criado-mudo'),
        opcao('sapateira', 'Sapateira'),
        opcao('mesa', 'Mesa'),
        opcao('escrivaninha', 'Escrivaninha'),
        opcao('rack', 'Rack'),
        opcao('comoda', 'Cômoda'),
        opcao('outro-movel-simples', 'Outro móvel simples'),
      ]),
      pergunta('quantidadeVolumes', 'Quantas caixas?', [
        opcao('1', '1'),
        opcao('2', '2'),
        opcao('3', '3'),
        opcao('4-ou-mais', '4 ou mais'),
      ]),
      pergunta('quantidadeGavetas', 'Possui gavetas?', [
        opcao('nenhuma', 'Nenhuma'),
        opcao('1-2', '1 a 2'),
        opcao('3-4', '3 a 4'),
        opcao('mais-4', 'Mais de 4'),
      ]),
      pergunta('quantidadePortas', 'Possui portas?', [
        opcao('0', 'Não'),
        opcao('1', '1'),
        opcao('2', '2'),
        opcao('3-ou-mais', '3 ou mais'),
      ]),
      pergunta('fixacaoParede', 'Precisa fixar na parede?', OPCOES_SIM_NAO),
      pergunta('andarMontagem', 'Andar e elevador', [
        opcao('terreo', 'Térreo'),
        opcao('1-3-andar', '1º ao 3º'),
        opcao('4-ou-mais', '4º ou mais'),
      ]),
      pergunta('temElevador', 'Tem elevador?', OPCOES_SIM_NAO),
      pergunta('produtoNoLocal', 'Produto já está no local?', OPCOES_SIM_NAO),
    ],
    fotosObrigatorias: ['Caixas', 'Manual', 'Local da montagem', 'Produto aberto, se possível'],
    regrasValidacao: [
      { when: { tipoMovelEspecial: ['guarda-roupa'] }, mensagem: 'Guarda-roupa deve ser redirecionado ou validado pela ABS.' },
      { when: { tipoMovelEspecial: ['painel'] }, mensagem: 'Painel requer validação técnica ABS.' },
      { when: { tipoMovelEspecial: ['planejado'] }, mensagem: 'Móvel planejado requer validação técnica ABS.' },
      { when: { produtoDanificado: ['sim'] }, mensagem: 'Produto danificado requer validação técnica ABS.' },
    ],
  },
  'montagem-guarda-roupa': {
    slug: 'montagem-guarda-roupa',
    nome: nomeServico('montagem-guarda-roupa'),
    perguntas: [
      pergunta('tipoGuardaRoupa', 'Tipo', [
        opcao('solteiro', 'Solteiro'),
        opcao('casal', 'Casal'),
        opcao('infantil', 'Infantil'),
        opcao('nao-sei', 'Não sei'),
      ]),
      pergunta('quantidadePortas', 'Quantas portas?', [
        opcao('2', '2'),
        opcao('3', '3'),
        opcao('4', '4'),
        opcao('5', '5'),
        opcao('6', '6'),
        opcao('mais-6', 'Mais de 6'),
      ]),
      pergunta('tipoPorta', 'Tipo de porta', [
        opcao('abrir', 'Abrir'),
        opcao('correr', 'Correr'),
        opcao('misto', 'Misto'),
        opcao('nao-sei', 'Não sei'),
      ]),
      pergunta('quantidadeGavetas', 'Gavetas', [
        opcao('nenhuma', 'Nenhuma'),
        opcao('1-2', '1 a 2'),
        opcao('3-4', '3 a 4'),
        opcao('5-ou-mais', '5 ou mais'),
      ]),
      pergunta('espelhoGuardaRoupa', 'Espelho', [
        opcao('nao', 'Não'),
        opcao('pequeno', 'Pequeno'),
        opcao('grande', 'Grande'),
      ]),
      pergunta('quantidadeVolumes', 'Volumes', [
        opcao('1', '1'),
        opcao('2', '2'),
        opcao('3', '3'),
        opcao('4', '4'),
        opcao('5-ou-mais', '5 ou mais'),
      ]),
      pergunta('fixacaoParede', 'Fixação na parede', OPCOES_SIM_NAO_NAO_SEI),
      pergunta('andarMontagem', 'Andar/elevador', [
        opcao('terreo', 'Térreo'),
        opcao('1-3-andar', '1º ao 3º'),
        opcao('4-ou-mais', '4º ou mais'),
      ]),
      pergunta('temElevador', 'Tem elevador?', OPCOES_SIM_NAO),
    ],
    fotosObrigatorias: ['Caixas', 'Manual', 'Local da montagem', 'Etiqueta/modelo'],
    regrasValidacao: [
      { when: { guardaRoupaPlanejado: ['sim'] }, mensagem: 'Guarda-roupa planejado requer validação técnica ABS.' },
      { when: { guardaRoupaUsado: ['sim'] }, mensagem: 'Guarda-roupa usado requer validação técnica ABS.' },
      { when: { temManualMontagem: ['nao'] }, mensagem: 'Guarda-roupa sem manual requer validação técnica ABS.' },
      { when: { alturaGuardaRoupaMaior240: ['sim'] }, mensagem: 'Guarda-roupa acima de 2,40m requer validação técnica ABS.' },
      { when: { espacoReduzido: ['sim'] }, mensagem: 'Espaço reduzido requer validação técnica ABS.' },
    ],
  },
  'instalacao-persiana': {
    slug: 'instalacao-persiana',
    nome: nomeServico('instalacao-persiana'),
    perguntas: [
      pergunta('quantidade', 'Quantas persianas?', [
        opcao('1', '1'),
        opcao('2', '2'),
        opcao('3', '3'),
        opcao('4-ou-mais', '4 ou mais'),
      ]),
      pergunta('tipoPersiana', 'Tipo', [
        opcao('rolo', 'Rolô'),
        opcao('romana', 'Romana'),
        opcao('horizontal', 'Horizontal'),
        opcao('vertical', 'Vertical'),
        opcao('double-vision', 'Double Vision'),
        opcao('painel', 'Painel'),
        opcao('nao-sei', 'Não sei'),
      ]),
      pergunta('larguraMaiorPersiana', 'Largura da maior', [
        opcao('ate-1m', 'Até 1m'),
        opcao('1m-2m', '1m a 2m'),
        opcao('2m-3m', '2m a 3m'),
        opcao('acima-3m', 'Acima de 3m'),
      ]),
      pergunta('alturaInstalacao', 'Altura', [
        opcao('ate-2-5m', 'Até 2,5m'),
        opcao('2-5m-3-5m', '2,5m a 3,5m'),
        opcao('acima-3-5m', 'Acima de 3,5m'),
      ]),
      pergunta('tipoParede', 'Tipo de parede', [
        opcao('alvenaria', 'Alvenaria'),
        opcao('drywall', 'Drywall'),
        opcao('madeira', 'Madeira'),
        opcao('nao-sei', 'Não sei'),
      ]),
      pergunta('persianaComprada', 'Já comprou?', OPCOES_SIM_NAO),
      pergunta('localPersiana', 'Local de instalação', [
        opcao('dentro-vao', 'Dentro do vão'),
        opcao('fora-vao', 'Fora do vão'),
        opcao('nao-sei', 'Não sei'),
      ]),
    ],
    fotosObrigatorias: ['Janela completa', 'Parede', 'Persiana', 'Ambiente'],
    regrasValidacao: [
      { when: { persianaMotorizada: ['sim'] }, mensagem: 'Persiana motorizada requer validação técnica ABS.' },
      { when: { larguraMaiorPersiana: ['acima-3m'] }, mensagem: 'Persiana acima de 3m requer validação técnica ABS.' },
      { when: { tipoParede: ['drywall'] }, mensagem: 'Instalação em drywall requer validação técnica ABS.' },
      { when: { alturaInstalacao: ['acima-3-5m'] }, mensagem: 'Instalação em altura requer validação técnica ABS.' },
    ],
  },
  'limpeza-ar-split': {
    slug: 'limpeza-ar-split',
    nome: nomeServico('limpeza-ar-split'),
    perguntas: [
      pergunta('quantidade', 'Quantos aparelhos?', [
        opcao('1', '1'),
        opcao('2', '2'),
        opcao('3', '3'),
        opcao('4-ou-mais', '4 ou mais'),
      ]),
      pergunta('capacidadeBtu', 'Capacidade', [
        opcao('ate-12000', 'Até 12.000 BTUs'),
        opcao('12001-18000', '12.001 a 18.000'),
        opcao('18001-24000', '18.001 a 24.000'),
        opcao('acima-24000', 'Acima de 24.000'),
        opcao('nao-sei', 'Não sei'),
      ]),
      pergunta('ambienteAr', 'Ambiente', [
        opcao('quarto', 'Quarto'),
        opcao('sala', 'Sala'),
        opcao('escritorio', 'Escritório'),
        opcao('loja', 'Loja'),
        opcao('restaurante', 'Restaurante'),
      ]),
      pergunta('ultimaLimpezaAr', 'Última limpeza', [
        opcao('menos-6-meses', 'Menos de 6 meses'),
        opcao('6-12-meses', '6 a 12 meses'),
        opcao('mais-12-meses', 'Mais de 12 meses'),
        opcao('nunca', 'Nunca'),
      ]),
      pergunta('sintomaAr', 'Sintomas', [
        opcao('apenas-sujo', 'Apenas sujo'),
        opcao('mau-cheiro', 'Mau cheiro'),
        opcao('pingando-agua', 'Pingando água'),
        opcao('baixa-refrigeracao', 'Baixa refrigeração'),
        opcao('barulho', 'Barulho'),
      ]),
      pergunta('alturaInstalacao', 'Altura', [
        opcao('ate-2-5m', 'Até 2,5m'),
        opcao('2-5m-3-5m', '2,5m a 3,5m'),
        opcao('acima-3-5m', 'Acima de 3,5m'),
      ]),
      pergunta('upsellsLimpezaAr', 'Upsells', [
        opcao('higienizacao-premium', 'Higienização premium'),
        opcao('revisao-preventiva', 'Revisão preventiva'),
        opcao('limpeza-condensadora', 'Limpeza condensadora'),
      ]),
    ],
    fotosObrigatorias: ['Evaporadora', 'Etiqueta', 'Ambiente', 'Condensadora, se acessível'],
    regrasValidacao: [
      { when: { sintomaAr: ['baixa-refrigeracao'] }, mensagem: 'Baixa refrigeração requer validação técnica ABS.' },
      { when: { sintomaAr: ['barulho'] }, mensagem: 'Barulho forte requer validação técnica ABS.' },
      { when: { disjuntorDesarma: ['sim'] }, mensagem: 'Disjuntor desarmando requer validação técnica ABS.' },
      { when: { condensadoraDificilAcesso: ['sim'] }, mensagem: 'Condensadora de difícil acesso requer validação técnica ABS.' },
    ],
  },
  'instalacao-ar-split': {
    slug: 'instalacao-ar-split',
    nome: nomeServico('instalacao-ar-split'),
    perguntas: [
      pergunta('aparelhoComprado', 'Aparelho já comprado?', OPCOES_SIM_NAO),
      pergunta('capacidadeBtu', 'Capacidade', [
        opcao('ate-12000', 'Até 12.000 BTUs'),
        opcao('12001-18000', '12.001 a 18.000'),
        opcao('18001-24000', '18.001 a 24.000'),
        opcao('acima-24000', 'Acima de 24.000'),
        opcao('nao-sei', 'Não sei'),
      ]),
      pergunta('tipoImovelAr', 'Tipo de imóvel', [
        opcao('casa', 'Casa'),
        opcao('apartamento', 'Apartamento'),
        opcao('loja', 'Loja'),
        opcao('escritorio', 'Escritório'),
      ]),
      pergunta('distanciaEvapCond', 'Distância evaporadora/condensadora', [
        opcao('ate-3m', 'Até 3m'),
        opcao('3m-5m', '3m a 5m'),
        opcao('5m-7m', '5m a 7m'),
        opcao('acima-7m', 'Acima de 7m'),
        opcao('nao-sei', 'Não sei'),
      ]),
      pergunta('pontoEletricoExclusivo', 'Ponto elétrico exclusivo?', OPCOES_SIM_NAO_NAO_SEI),
      pergunta('localCondensadora', 'Local da condensadora', [
        opcao('chao', 'Chão'),
        opcao('suporte-parede', 'Suporte de parede'),
        opcao('sacada', 'Sacada'),
        opcao('fachada-externa', 'Fachada externa'),
      ]),
      pergunta('alturaInstalacao', 'Altura', [
        opcao('terreo', 'Térreo'),
        opcao('primeiro-andar', '1º andar'),
        opcao('segundo-andar', '2º andar'),
        opcao('acima-segundo-andar', 'Acima do 2º andar'),
      ]),
      pergunta('tipoEquipamentoAr', 'Tipo do equipamento', [
        opcao('convencional', 'Convencional'),
        opcao('inverter', 'Inverter'),
        opcao('nao-sei', 'Não sei'),
      ]),
      pergunta('materiaisInstalacaoAr', 'Materiais', [
        opcao('cliente-fornece', 'Cliente fornece'),
        opcao('abs-fornece-kit', 'ABS fornece kit'),
      ]),
    ],
    fotosObrigatorias: ['Local evaporadora', 'Local condensadora', 'Parede externa', 'Quadro elétrico', 'Etiqueta do aparelho', 'Ambiente completo'],
    regrasValidacao: [
      { when: { capacidadeBtu: ['acima-24000'] }, mensagem: 'Capacidade acima de 24.000 BTUs requer validação técnica ABS.' },
      { when: { distanciaEvapCond: ['acima-7m'] }, mensagem: 'Distância acima de 7m requer validação técnica ABS.' },
      { when: { localCondensadora: ['fachada-externa'] }, mensagem: 'Fachada externa requer validação técnica ABS.' },
      { when: { alturaInstalacao: ['acima-segundo-andar'] }, mensagem: 'Instalação acima do 2º andar requer validação técnica ABS.' },
      { when: { semInfraestrutura: ['sim'] }, mensagem: 'Ausência de infraestrutura exige validação técnica ABS.' },
    ],
  },
  'poda-jardim': {
    slug: 'poda-jardim',
    nome: nomeServico('poda-jardim'),
    perguntas: [
      pergunta('servicoJardim', 'Serviço desejado', [
        opcao('poda-plantas-arbustos', 'Poda de plantas e arbustos'),
        opcao('corte-grama', 'Corte de grama'),
        opcao('limpeza-jardim', 'Limpeza de jardim'),
        opcao('poda-arvore-pequena', 'Poda de árvore pequena'),
      ]),
      pergunta('quantidadePlantas', 'Quantidade de plantas', [
        opcao('ate-3', 'Até 3'),
        opcao('4-6', '4 a 6'),
        opcao('7-10', '7 a 10'),
        opcao('mais-10', 'Mais de 10'),
      ], { perguntaId: 'servicoJardim', opcaoIds: ['poda-plantas-arbustos'] }),
      pergunta('alturaPlantas', 'Altura média', [
        opcao('ate-2m', 'Até 2m'),
        opcao('2m-3m', '2m a 3m'),
        opcao('acima-3m', 'Acima de 3m'),
      ], { perguntaId: 'servicoJardim', opcaoIds: ['poda-plantas-arbustos'] }),
      pergunta('retiradaResiduosPlantas', 'Retirada de resíduos?', OPCOES_SIM_NAO, {
        perguntaId: 'servicoJardim',
        opcaoIds: ['poda-plantas-arbustos'],
      }),
      pergunta('acessoFacilJardim', 'Acesso fácil?', OPCOES_SIM_NAO, {
        perguntaId: 'servicoJardim',
        opcaoIds: ['poda-plantas-arbustos'],
      }),
      pergunta('areaGrama', 'Área em m²', [
        opcao('ate-50m2', 'Até 50m²'),
        opcao('51-100m2', '51 a 100m²'),
        opcao('101-200m2', '101 a 200m²'),
        opcao('acima-200m2', 'Acima de 200m²'),
      ], { perguntaId: 'servicoJardim', opcaoIds: ['corte-grama'] }),
      pergunta('alturaGrama', 'Altura da grama', [
        opcao('baixa', 'Baixa'),
        opcao('media', 'Média'),
        opcao('muito-alta', 'Muito alta'),
      ], { perguntaId: 'servicoJardim', opcaoIds: ['corte-grama'] }),
      pergunta('recolherResiduosGrama', 'Recolher resíduos?', OPCOES_SIM_NAO, {
        perguntaId: 'servicoJardim',
        opcaoIds: ['corte-grama'],
      }),
      pergunta('terrenoPlano', 'Terreno plano?', OPCOES_SIM_NAO, {
        perguntaId: 'servicoJardim',
        opcaoIds: ['corte-grama'],
      }),
      pergunta('areaLimpezaJardim', 'Área em m²', [
        opcao('ate-50m2', 'Até 50m²'),
        opcao('51-100m2', '51 a 100m²'),
        opcao('101-200m2', '101 a 200m²'),
        opcao('acima-200m2', 'Acima de 200m²'),
      ], { perguntaId: 'servicoJardim', opcaoIds: ['limpeza-jardim'] }),
      pergunta('nivelSujeiraJardim', 'Nível de sujeira', [
        opcao('leve', 'Leve'),
        opcao('medio', 'Médio'),
        opcao('alto', 'Alto'),
      ], { perguntaId: 'servicoJardim', opcaoIds: ['limpeza-jardim'] }),
      pergunta('volumeGalhos', 'Volume de folhas/galhos', [
        opcao('baixo', 'Baixo'),
        opcao('medio', 'Médio'),
        opcao('alto', 'Alto'),
      ], { perguntaId: 'servicoJardim', opcaoIds: ['limpeza-jardim'] }),
      pergunta('retiradaResiduosJardim', 'Retirada de resíduos?', OPCOES_SIM_NAO, {
        perguntaId: 'servicoJardim',
        opcaoIds: ['limpeza-jardim'],
      }),
      pergunta('alturaArvore', 'Altura da árvore', [
        opcao('ate-2m', 'Até 2m'),
        opcao('2m-4m', '2m a 4m'),
        opcao('acima-4m', 'Acima de 4m'),
      ], { perguntaId: 'servicoJardim', opcaoIds: ['poda-arvore-pequena'] }),
      pergunta('fiacaoProxima', 'Fiação próxima?', OPCOES_SIM_NAO, {
        perguntaId: 'servicoJardim',
        opcaoIds: ['poda-arvore-pequena'],
      }),
      pergunta('retirarGalhosArvore', 'Retirar galhos?', OPCOES_SIM_NAO, {
        perguntaId: 'servicoJardim',
        opcaoIds: ['poda-arvore-pequena'],
      }),
      pergunta('precisaEscadaArvore', 'Precisa escada?', OPCOES_SIM_NAO, {
        perguntaId: 'servicoJardim',
        opcaoIds: ['poda-arvore-pequena'],
      }),
    ],
    fotosObrigatorias: ['Área completa', 'Detalhe da vegetação', 'Acesso', 'Foto lateral'],
    regrasValidacao: [
      { when: { alturaArvore: ['acima-4m'] }, mensagem: 'Árvore acima de 4m requer validação técnica ABS.' },
      { when: { fiacaoProxima: ['sim'] }, mensagem: 'Rede elétrica próxima requer validação técnica ABS.' },
      { when: { precisaMotosserra: ['sim'] }, mensagem: 'Uso de motosserra requer validação técnica ABS.' },
      { when: { terrenoPerigoso: ['sim'] }, mensagem: 'Terreno perigoso requer validação técnica ABS.' },
    ],
  },
  'limpeza-pos-obra': {
    slug: 'limpeza-pos-obra',
    nome: nomeServico('limpeza-pos-obra'),
    perguntas: [
      pergunta('tipoImovelPosObra', 'Tipo de imóvel', [
        opcao('apartamento', 'Apartamento'),
        opcao('casa', 'Casa'),
        opcao('loja', 'Loja'),
        opcao('escritorio', 'Escritório'),
      ]),
      pergunta('areaImovelPosObra', 'Área aproximada', [
        opcao('ate-50m2', 'Até 50m²'),
        opcao('51-100m2', '51 a 100m²'),
        opcao('101-150m2', '101 a 150m²'),
        opcao('151-200m2', '151 a 200m²'),
        opcao('acima-200m2', 'Acima de 200m²'),
      ]),
      pergunta('ocupacaoImovelPosObra', 'Ocupação', [
        opcao('vazio', 'Vazio'),
        opcao('parcialmente-mobiliado', 'Parcialmente mobiliado'),
        opcao('totalmente-mobiliado', 'Totalmente mobiliado'),
      ]),
      pergunta('nivelSujeiraPosObra', 'Nível de sujeira', [
        opcao('leve', 'Leve'),
        opcao('medio', 'Médio'),
        opcao('alto', 'Alto'),
      ]),
      pergunta('residuosVisiveisPosObra', 'Resíduos visíveis', [
        opcao('poeira', 'Poeira'),
        opcao('respingo-tinta', 'Respingo de tinta'),
        opcao('rejunte', 'Rejunte'),
        opcao('cimento', 'Cimento'),
        opcao('tinta-rejunte-cimento', 'Tinta + rejunte + cimento'),
      ]),
      pergunta('quantidadeBanheirosPosObra', 'Banheiros', [
        opcao('1', '1'),
        opcao('2', '2'),
        opcao('3', '3'),
        opcao('4-ou-mais', '4 ou mais'),
      ]),
      pergunta('vidrosJanelasPosObra', 'Vidros/janelas', [
        opcao('nao', 'Não'),
        opcao('ate-5', 'Até 5'),
        opcao('mais-5', 'Mais de 5'),
      ]),
      pergunta('retiradaResiduosPosObra', 'Retirada de resíduos?', OPCOES_SIM_NAO),
      pergunta('areasExtrasPosObra', 'Áreas extras', [
        opcao('varanda', 'Varanda'),
        opcao('sacada', 'Sacada'),
        opcao('area-gourmet', 'Área gourmet'),
        opcao('quintal', 'Quintal'),
        opcao('nenhuma', 'Nenhuma'),
      ]),
    ],
    fotosObrigatorias: ['Sala', 'Cozinha', 'Banheiro', 'Área mais suja', 'Visão geral'],
    regrasValidacao: [
      { when: { areaImovelPosObra: ['acima-200m2'] }, mensagem: 'Área acima de 200m² requer validação técnica ABS.' },
      { when: { limpezaFachada: ['sim'] }, mensagem: 'Limpeza de fachada requer validação técnica ABS.' },
      { when: { trabalhoEmAltura: ['sim'] }, mensagem: 'Trabalho em altura requer validação técnica ABS.' },
      { when: { cimentoPesado: ['sim'] }, mensagem: 'Cimento pesado requer validação técnica ABS.' },
      { when: { obraEmAndamento: ['sim'] }, mensagem: 'Obra em andamento requer validação técnica ABS.' },
    ],
  },
};

export function getFluxo(slug: string): FluxoServico | undefined {
  return FLUXOS_SERVICO[slug as SlugFluxoServico];
}
