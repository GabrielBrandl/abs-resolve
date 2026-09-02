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
  'limpeza-ar-split',
  'instalacao-ar-split',
] as const;

export type SlugFluxoServico = (typeof SLUGS_FLUXO_SERVICO)[number];
export type RespostaFluxoValor = string | string[] | number | boolean | null | undefined;
export type RespostasFluxo = Record<string, RespostaFluxoValor>;

export type ModoCobrancaOpcao = 'fixo' | 'por_unidade';

export interface FluxoPerguntaOpcao {
  id: string;
  label: string;
  precoAdicional?: number;
  /** fixo = soma o valor uma vez; por_unidade = valor × quantidade */
  modoCobranca?: ModoCobrancaOpcao;
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
  papel?: 'quantidade' | 'normal';
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
      pergunta('chuveiroComprado', 'Você já possui o chuveiro?', [
        opcao('sim', 'Sim, já tenho'),
        opcao('nao-abs', 'Não, quero comprar com a ABS'),
      ]),
      pergunta('tipoServicoChuveiro', 'O que deseja?', [
        opcao('instalar-comum', 'Instalar chuveiro comum'),
        opcao('instalar-eletronico', 'Instalar chuveiro eletrônico'),
        opcao('trocar-resistencia', 'Trocar resistência'),
        opcao('instalar-com-revisao-eletrica', 'Instalar chuveiro + revisão elétrica'),
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
      pergunta('torneiraComprada', 'Você já possui a torneira?', [
        opcao('sim', 'Sim, já tenho'),
        opcao('nao', 'Não, quero comprar com a ABS'),
      ]),
      pergunta('tipoTorneira', 'Tipo de torneira', [
        opcao('convencional', 'Convencional'),
        opcao('gourmet', 'Gourmet'),
        opcao('monocomando-misturador', 'Monocomando/Misturador'),
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
};

export function getFluxo(slug: string): FluxoServico | undefined {
  return FLUXOS_SERVICO[slug as SlugFluxoServico];
}
