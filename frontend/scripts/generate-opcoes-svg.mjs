/**
 * Gera SVGs ilustrativos em public/opcoes/{slug}/{perguntaId}/{opcaoId}.svg
 * Execute: node scripts/generate-opcoes-svg.mjs
 */
import { mkdirSync, writeFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'public', 'opcoes');

function save(slug, perguntaId, opcaoId, svg) {
  const dir = join(outDir, slug, perguntaId);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, `${opcaoId}.svg`), svg.trim());
}

function wrap(title, body, w = 320, h = 240) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" role="img" aria-label="${title}">
  <rect width="100%" height="100%" fill="#f1f5f9"/>
  <text x="50%" y="28" text-anchor="middle" font-family="Arial,sans-serif" font-size="14" fill="#334155" font-weight="600">${title}</text>
  ${body}
</svg>`;
}

const tomada = (variant, label, accent = '#0033B5') => {
  if (variant === 'dupla') {
    return wrap(
      label,
      `<g transform="translate(100,70)">
        <rect x="0" y="0" width="120" height="100" rx="8" fill="#fff" stroke="#cbd5e1" stroke-width="3"/>
        <circle cx="28" cy="42" r="7" fill="${accent}"/>
        <circle cx="48" cy="42" r="7" fill="${accent}"/>
        <circle cx="72" cy="42" r="7" fill="${accent}"/>
        <circle cx="92" cy="42" r="7" fill="${accent}"/>
        <rect x="54" y="62" width="12" height="22" rx="3" fill="#94a3b8"/>
      </g>`
    );
  }
  const bodies = `<g transform="translate(120,70)">
        <rect x="0" y="0" width="80" height="100" rx="8" fill="#fff" stroke="#cbd5e1" stroke-width="3"/>
        <circle cx="26" cy="42" r="8" fill="${accent}"/>
        <circle cx="54" cy="42" r="8" fill="${accent}"/>
        <rect x="34" y="62" width="12" height="22" rx="3" fill="#94a3b8"/>
      </g>`;
  return wrap(label, bodies);
};

const interruptor = (keys, label) => {
  const bodies = keys
    .map((k, i) => {
      const ox = 80 + i * 70;
      return `<rect x="${ox}" y="80" width="44" height="72" rx="6" fill="#fff" stroke="#cbd5e1" stroke-width="3"/>
        <rect x="${ox + 8}" y="92" width="28" height="36" rx="4" fill="#0033B5"/>`;
    })
    .join('');
  return wrap(label, bodies);
};

const produto = (label, emoji, color = '#dbeafe') =>
  wrap(
    label,
    `<rect x="60" y="55" width="200" height="130" rx="16" fill="${color}" stroke="#93c5fd"/>
     <text x="160" y="135" text-anchor="middle" font-size="56">${emoji}</text>`
  );

const ambiente = (label, emoji) => produto(label, emoji, '#ecfccb');
const hidraulica = (label, emoji) => produto(label, emoji, '#e0f2fe');
const eletrica = (label, emoji) => produto(label, emoji, '#fef3c7');

/** slug → perguntaId → opcaoId → gerador SVG */
const MAP = {
  'troca-tomada': {
    tipoTomada: {
      simples: () => tomada('simples', 'Tomada simples'),
      dupla: () => tomada('dupla', 'Tomada dupla'),
      'tomada-20a': () => tomada('20a', 'Tomada 20A', '#dc2626'),
    },
    fornecimentoTomada: {
      cliente: () => eletrica('Eu já tenho', '📦'),
      'abs-padrao': () => eletrica('Tomada padrão ABS', '🔌'),
      'abs-premium': () => eletrica('Tomada premium ABS', '✨'),
    },
    estadoAtual: {
      funcionando: () => eletrica('Funcionando', '✅'),
      'nao-funciona': () => eletrica('Não funciona', '❌'),
      queimada: () => eletrica('Queimada', '🔥'),
      aquecendo: () => eletrica('Aquecendo', '🌡️'),
    },
    localInstalacao: {
      sala: () => ambiente('Sala', '🛋️'),
      quarto: () => ambiente('Quarto', '🛏️'),
      cozinha: () => ambiente('Cozinha', '🍳'),
      banheiro: () => ambiente('Banheiro', '🚿'),
      'area-externa': () => ambiente('Área externa', '🌳'),
    },
  },
  'troca-interruptor': {
    tipoInterruptor: {
      simples: () => interruptor([1], 'Interruptor simples'),
      duplo: () => interruptor([1, 2], 'Interruptor duplo'),
      triplo: () => interruptor([1, 2, 3], 'Interruptor triplo'),
      paralelo: () => interruptor([2], 'Paralelo'),
      intermediario: () => interruptor([3], 'Intermediário'),
    },
  },
  'instalacao-chuveiro': {
    tipoServicoChuveiro: {
      'instalar-comum': () => hidraulica('Chuveiro comum', '🚿'),
      'instalar-eletronico': () => hidraulica('Chuveiro eletrônico', '💡'),
      'trocar-resistencia': () => hidraulica('Trocar resistência', '🔧'),
      'instalar-com-revisao-eletrica': () => hidraulica('Instalar + revisão', '⚡'),
    },
  },
  'troca-disjuntor': {
    tipoDisjuntor: {
      monopolar: () => eletrica('Monopolar', '1️⃣'),
      bipolar: () => eletrica('Bipolar', '2️⃣'),
      tripolar: () => eletrica('Tripolar', '3️⃣'),
    },
    amperagemDisjuntor: {
      '10a': () => eletrica('10A', '🔟'),
      '16a': () => eletrica('16A', '1️⃣6️⃣'),
      '20a': () => eletrica('20A', '2️⃣0️⃣'),
      '25a': () => eletrica('25A', '2️⃣5️⃣'),
      '32a': () => eletrica('32A', '3️⃣2️⃣'),
    },
  },
  'instalacao-luminaria': {
    tipoLuminaria: {
      'plafon-led': () => eletrica('Plafon LED', '💡'),
      sobrepor: () => eletrica('Sobrepor', '🔆'),
      'painel-led': () => eletrica('Painel LED', '⬜'),
      'spot-individual': () => eletrica('Spot', '🔦'),
      'spot-trilho': () => eletrica('Spot trilho', '🛤️'),
      pendente: () => eletrica('Pendente', '🏮'),
      'lustre-pequeno': () => eletrica('Lustre pequeno', '✨'),
      'lustre-medio': () => eletrica('Lustre médio', '💎'),
      'lustre-grande': () => eletrica('Lustre grande', '👑'),
    },
  },
  'instalacao-ventilador-teto': {
    tipoVentilador: {
      'sem-luminaria': () => eletrica('Sem luminária', '🌀'),
      'com-luminaria': () => eletrica('Com luminária', '🌀💡'),
    },
  },
  'troca-torneira': {
    tipoTorneira: {
      convencional: () => hidraulica('Convencional', '🚰'),
      gourmet: () => hidraulica('Gourmet', '🍽️'),
      'monocomando-misturador': () => hidraulica('Monocomando', '🔄'),
      eletrica: () => hidraulica('Elétrica', '⚡'),
    },
  },
  'troca-registro': {
    tipoRegistro: {
      'registro-chuveiro': () => hidraulica('Registro chuveiro', '🚿'),
      'registro-gaveta': () => hidraulica('Registro gaveta', '🔧'),
      'registro-geral': () => hidraulica('Registro geral', '🏠'),
    },
  },
  'reparo-vazamento': {
    origemVazamento: {
      torneira: () => hidraulica('Torneira', '🚰'),
      registro: () => hidraulica('Registro', '🔧'),
      sifao: () => hidraulica('Sifão', '🔄'),
      'caixa-acoplada': () => hidraulica('Caixa acoplada', '🚽'),
      'parede-tubulacao': () => hidraulica('Parede/tubulação', '🧱'),
    },
  },
  'desentupimento-pia': {
    problemaDesentupimento: {
      'agua-escoa-lentamente': () => hidraulica('Escoa lentamente', '💧'),
      'agua-nao-escoa': () => hidraulica('Não escoa', '🛑'),
      'agua-retorna': () => hidraulica('Água retorna', '↩️'),
      'mau-cheiro': () => hidraulica('Mau cheiro', '😷'),
      'retorno-esgoto': () => hidraulica('Retorno esgoto', '⚠️'),
    },
  },
  'desentupimento-vaso': {
    problemaDesentupimento: {
      'agua-nao-escoa': () => hidraulica('Não escoa', '🛑'),
      'agua-retorna': () => hidraulica('Água retorna', '↩️'),
      'vaso-transborda': () => hidraulica('Transborda', '🌊'),
      'retorno-esgoto': () => hidraulica('Retorno esgoto', '⚠️'),
    },
  },
  'instalacao-suporte-tv': {
    tipoSuporteTv: {
      fixo: () => produto('Suporte fixo', '📺'),
      inclinavel: () => produto('Inclinável', '📐'),
      articulado: () => produto('Articulado', '🔀'),
    },
  },
  'instalacao-prateleira': {
    usoPrateleira: {
      decoracao: () => produto('Decoração', '🖼️'),
      livros: () => produto('Livros', '📚'),
      utensilios: () => produto('Utensílios', '🍴'),
      ferramentas: () => produto('Ferramentas', '🔨'),
      estoque: () => produto('Estoque', '📦'),
    },
  },
  'montagem-moveis-simples': {
    tipoMovelSimples: {
      'criado-mudo': () => produto('Criado-mudo', '🛏️'),
      sapateira: () => produto('Sapateira', '👟'),
      mesa: () => produto('Mesa', '🪑'),
      escrivaninha: () => produto('Escrivaninha', '💻'),
      rack: () => produto('Rack', '📺'),
      comoda: () => produto('Cômoda', '🗄️'),
      'outro-movel-simples': () => produto('Outro móvel', '📦'),
    },
  },
  'montagem-guarda-roupa': {
    tipoGuardaRoupa: {
      solteiro: () => produto('Solteiro', '🚪'),
      casal: () => produto('Casal', '🚪🚪'),
      infantil: () => produto('Infantil', '🧸'),
    },
  },
  'instalacao-persiana': {
    tipoPersiana: {
      rolo: () => produto('Rolô', '🪟'),
      romana: () => produto('Romana', '🪟'),
      horizontal: () => produto('Horizontal', '▦'),
      vertical: () => produto('Vertical', '▥'),
      'double-vision': () => produto('Double Vision', '👁️'),
      painel: () => produto('Painel', '▣'),
    },
  },
  'limpeza-ar-split': {
    sintomaAr: {
      'apenas-sujo': () => produto('Apenas sujo', '🧽'),
      'mau-cheiro': () => produto('Mau cheiro', '😷'),
      'pingando-agua': () => produto('Pingando', '💧'),
      'baixa-refrigeracao': () => produto('Baixa refrigeração', '❄️'),
      barulho: () => produto('Barulho', '🔊'),
    },
  },
  'instalacao-ar-split': {
    tipoEquipamentoAr: {
      convencional: () => produto('Convencional', '❄️'),
      inverter: () => produto('Inverter', '⚡'),
    },
  },
  'poda-jardim': {
    servicoJardim: {
      'poda-plantas-arbustos': () => ambiente('Poda plantas', '🌿'),
      'corte-grama': () => ambiente('Corte grama', '🌱'),
      'limpeza-jardim': () => ambiente('Limpeza jardim', '🧹'),
      'poda-arvore-pequena': () => ambiente('Poda árvore', '🌳'),
    },
  },
  'limpeza-pos-obra': {
    tipoImovelPosObra: {
      apartamento: () => ambiente('Apartamento', '🏢'),
      casa: () => ambiente('Casa', '🏠'),
      loja: () => ambiente('Loja', '🏪'),
      escritorio: () => ambiente('Escritório', '🏢'),
    },
  },
};

const LOCAL_AMBIENTE = {
  sala: () => ambiente('Sala', '🛋️'),
  quarto: () => ambiente('Quarto', '🛏️'),
  cozinha: () => ambiente('Cozinha', '🍳'),
  banheiro: () => ambiente('Banheiro', '🚿'),
  'area-externa': () => ambiente('Área externa', '🌳'),
  corredor: () => ambiente('Corredor', '🚪'),
  'area-servico': () => ambiente('Área de serviço', '🧺'),
  jardim: () => ambiente('Jardim', '🌳'),
};

const TIPO_PAREDE = {
  alvenaria: () => produto('Alvenaria', '🧱', '#fef3c7'),
  drywall: () => produto('Drywall', '⬜', '#f1f5f9'),
  madeira: () => produto('Madeira', '🪵', '#fde68a'),
  'nao-sei': () => produto('Não sei', '❓', '#f1f5f9'),
};

const TIPO_TETO = {
  laje: () => produto('Laje', '🏗️'),
  gesso: () => produto('Gesso', '⬜'),
  pvc: () => produto('PVC', '📐'),
  madeira: () => produto('Madeira', '🪵'),
  'estrutura-metalica': () => produto('Estrutura metálica', '🔩'),
};

const SIM_NAO = {
  sim: () => produto('Sim', '✅', '#dcfce7'),
  nao: () => produto('Não', '❌', '#fee2e2'),
  'nao-sei': () => produto('Não sei', '❓', '#f1f5f9'),
};

const QTD = {
  '1': () => produto('1', '1️⃣'),
  '2': () => produto('2', '2️⃣'),
  '3': () => produto('3', '3️⃣'),
  '4': () => produto('4', '4️⃣'),
  'mais-4': () => produto('Mais de 4', '➕'),
  '4-ou-mais': () => produto('4 ou mais', '➕'),
  '3-ou-mais': () => produto('3 ou mais', '➕'),
};

function aplicar(slug, perguntaId, opcoes) {
  MAP[slug] = MAP[slug] || {};
  MAP[slug][perguntaId] = { ...(MAP[slug][perguntaId] || {}), ...opcoes };
}

for (const slug of [
  'troca-tomada',
  'troca-interruptor',
  'instalacao-luminaria',
  'instalacao-ventilador-teto',
  'troca-torneira',
]) {
  aplicar(slug, 'localInstalacao', LOCAL_AMBIENTE);
}

for (const slug of ['instalacao-luminaria', 'instalacao-ventilador-teto', 'instalacao-suporte-tv', 'instalacao-prateleira', 'instalacao-persiana']) {
  aplicar(slug, 'tipoParede', TIPO_PAREDE);
}

for (const slug of ['instalacao-luminaria', 'instalacao-ventilador-teto']) {
  aplicar(slug, 'tipoTeto', TIPO_TETO);
  aplicar(slug, 'pontoEletricoExistente', SIM_NAO);
}

aplicar('instalacao-ventilador-teto', 'ganchoExistente', SIM_NAO);
aplicar('instalacao-chuveiro', 'jaExisteChuveiro', SIM_NAO);
aplicar('instalacao-chuveiro', 'disjuntorExclusivo', SIM_NAO);
aplicar('instalacao-chuveiro', 'chuveiroComprado', { sim: SIM_NAO.sim, 'nao-abs': () => produto('Comprar pela ABS', '🛒') });
aplicar('instalacao-chuveiro', 'potenciaChuveiro', {
  'ate-5500w': () => eletrica('Até 5.500W', '⚡'),
  '5501-6800w': () => eletrica('5.501–6.800W', '⚡'),
  '6801-7500w': () => eletrica('6.801–7.500W', '⚡'),
  'acima-7500w': () => eletrica('Acima 7.500W', '🔥'),
  'nao-sei': SIM_NAO['nao-sei'],
});
aplicar('instalacao-chuveiro', 'tensaoChuveiro', {
  '127v': () => eletrica('127V', '🔌'),
  '220v': () => eletrica('220V', '🔌'),
  'nao-sei': SIM_NAO['nao-sei'],
});

for (const slug of ['troca-tomada', 'troca-interruptor']) {
  aplicar(slug, 'quantidade', QTD);
}

aplicar('troca-disjuntor', 'motivoTrocaDisjuntor', {
  preventiva: () => eletrica('Preventiva', '🛡️'),
  quebrou: () => eletrica('Quebrou', '💥'),
  'nao-arma': () => eletrica('Não arma', '⛔'),
  desarmando: () => eletrica('Desarmando', '⚠️'),
  'cheiro-queimado': () => eletrica('Cheiro queimado', '🔥'),
  derreteu: () => eletrica('Derreteu', '🔥'),
});

aplicar('instalacao-suporte-tv', 'tamanhoTv', {
  'ate-32': () => produto('Até 32"', '📺'),
  '33-50': () => produto('33–50"', '📺'),
  '51-65': () => produto('51–65"', '📺'),
  '66-75': () => produto('66–75"', '📺'),
  'acima-75': () => produto('Acima 75"', '📺'),
});

aplicar('instalacao-ar-split', 'capacidadeBtu', {
  'ate-12000': () => produto('Até 12k BTU', '❄️'),
  '12001-18000': () => produto('12–18k BTU', '❄️'),
  '18001-24000': () => produto('18–24k BTU', '❄️'),
  'acima-24000': () => produto('Acima 24k', '❄️'),
  'nao-sei': SIM_NAO['nao-sei'],
});

aplicar('limpeza-ar-split', 'capacidadeBtu', {
  'ate-12000': () => produto('Até 12k BTU', '❄️'),
  '12001-18000': () => produto('12–18k BTU', '❄️'),
  '18001-24000': () => produto('18–24k BTU', '❄️'),
  'acima-24000': () => produto('Acima 24k', '❄️'),
  'nao-sei': SIM_NAO['nao-sei'],
});

aplicar('limpeza-pos-obra', 'nivelSujeiraPosObra', {
  leve: () => produto('Leve', '🧹'),
  medio: () => produto('Médio', '🧽'),
  alto: () => produto('Alto', '🪣'),
});

const manifest = [];

for (const [slug, perguntas] of Object.entries(MAP)) {
  for (const [perguntaId, opcoes] of Object.entries(perguntas)) {
    for (const [opcaoId, fn] of Object.entries(opcoes)) {
      save(slug, perguntaId, opcaoId, fn());
      manifest.push({ slug, perguntaId, opcaoId });
    }
  }
}

const manifestPath = join(root, 'src', 'config', 'opcoes-imagens-manifest.json');
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
console.log(`Gerados ${manifest.length} SVGs em public/opcoes/`);
