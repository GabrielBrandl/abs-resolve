/**
 * Gera WebP nítidos para opções do questionário a partir de fotos locais.
 * Fontes: public/opcoes-sources/wiki/ + public/servicos/*.webp
 * Execute: node scripts/fetch-opcoes-fotos.mjs
 */
import { mkdirSync, readFileSync, existsSync, readdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'public', 'opcoes');
const wikiDir = join(root, 'public', 'opcoes-sources', 'wiki');
const servicosDir = join(root, 'public', 'servicos');
const manifestPath = join(root, 'src', 'config', 'opcoes-imagens-manifest.json');

const W = (name) => join(wikiDir, name);
const S = (slug) => join(servicosDir, `${slug}.webp`);

/** Fotos reais de produtos (Wikimedia, salvas localmente) + fotos de serviço */
let POOL = {};

function buildPool() {
  const tomadaSimples = existsSync(W('tomada-simples-2.jpg'))
    ? W('tomada-simples-2.jpg')
    : existsSync(W('tomada-simples.jpg'))
      ? W('tomada-simples.jpg')
      : S('troca-tomada');
  const tomada20a = existsSync(W('tomada-20a.jpg'))
    ? W('tomada-20a.jpg')
    : existsSync(W('tomada-20a-2.jpg'))
      ? W('tomada-20a-2.jpg')
      : S('troca-tomada');
  const tomadaDupla = existsSync(W('tomada-dupla.jpg'))
    ? W('tomada-dupla.jpg')
    : existsSync(join(root, 'public/opcoes-sources/tomada-cliente.png'))
      ? join(root, 'public/opcoes-sources/tomada-cliente.png')
      : tomadaSimples;

  POOL = {
    tomadaSimples,
    tomadaDupla,
    tomada20a,
    interruptorSimples: existsSync(W('interruptor-simples.jpg')) ? W('interruptor-simples.jpg') : S('troca-interruptor'),
    interruptorDuplo: existsSync(W('interruptor-duplo.jpg')) ? W('interruptor-duplo.jpg') : S('troca-interruptor'),
    interruptorTriplo: existsSync(W('interruptor-triplo.jpg')) ? W('interruptor-triplo.jpg') : S('troca-interruptor'),
    interruptorParalelo: existsSync(W('interruptor-paralelo.jpg')) ? W('interruptor-paralelo.jpg') : S('troca-interruptor'),
    disjuntor: existsSync(W('disjuntor.jpg')) ? W('disjuntor.jpg') : S('troca-disjuntor'),
    disjuntorMono: existsSync(W('disjuntor.jpg')) ? W('disjuntor.jpg') : S('troca-disjuntor'),
    disjuntorBi: existsSync(W('disjuntor-bipolar.jpg')) ? W('disjuntor-bipolar.jpg') : S('troca-disjuntor'),
    disjuntorTri: existsSync(W('disjuntor.jpg')) ? W('disjuntor.jpg') : S('troca-disjuntor'),
    chuveiroComum: existsSync(W('chuveiro.jpg')) ? W('chuveiro.jpg') : S('instalacao-chuveiro'),
    chuveiroEletronico: existsSync(W('chuveiro.jpg')) ? W('chuveiro.jpg') : S('instalacao-chuveiro'),
    resistenciaChuveiro: existsSync(W('chuveiro.jpg')) ? W('chuveiro.jpg') : S('instalacao-chuveiro'),
    torneiraConvencional: existsSync(W('torneira-convencional.jpg')) ? W('torneira-convencional.jpg') : S('troca-torneira'),
    torneiraGourmet: existsSync(W('torneira-gourmet.jpg')) ? W('torneira-gourmet.jpg') : S('troca-torneira'),
    torneiraMonocomando: existsSync(W('torneira-gourmet.jpg')) ? W('torneira-gourmet.jpg') : S('troca-torneira'),
    torneiraEletrica: existsSync(W('chuveiro.jpg')) ? W('chuveiro.jpg') : S('instalacao-chuveiro'),
    registroChuveiro: existsSync(W('registro.jpg')) ? W('registro.jpg') : S('troca-registro'),
    registroGaveta: existsSync(W('registro.jpg')) ? W('registro.jpg') : S('troca-registro'),
    registroGeral: existsSync(W('registro.jpg')) ? W('registro.jpg') : S('troca-registro'),
    sifao: existsSync(W('sifao.jpg')) ? W('sifao.jpg') : S('desentupimento-pia'),
    vasoSanitario: existsSync(W('vaso-sanitario.jpg')) ? W('vaso-sanitario.jpg') : S('desentupimento-vaso'),
    piaCozinha: S('desentupimento-pia'),
    vazamentoTorneira: existsSync(W('torneira-convencional.jpg')) ? W('torneira-convencional.jpg') : S('reparo-vazamento'),
    vazamentoParede: S('reparo-vazamento'),
    plafonLed: existsSync(W('luminaria-plafon.jpg')) ? W('luminaria-plafon.jpg') : S('instalacao-luminaria'),
    luminariaSobrepor: existsSync(W('luminaria-plafon.jpg')) ? W('luminaria-plafon.jpg') : S('instalacao-luminaria'),
    painelLed: existsSync(W('luminaria-plafon.jpg')) ? W('luminaria-plafon.jpg') : S('instalacao-luminaria'),
    spot: existsSync(W('luminaria-plafon.jpg')) ? W('luminaria-plafon.jpg') : S('instalacao-luminaria'),
    spotTrilho: existsSync(W('luminaria-plafon.jpg')) ? W('luminaria-plafon.jpg') : S('instalacao-luminaria'),
    pendente: existsSync(W('luminaria-plafon.jpg')) ? W('luminaria-plafon.jpg') : S('instalacao-luminaria'),
    lustre: existsSync(W('luminaria-plafon.jpg')) ? W('luminaria-plafon.jpg') : S('instalacao-luminaria'),
    ventiladorTeto: existsSync(W('ventilador-sem-luz.jpg')) ? W('ventilador-sem-luz.jpg') : S('instalacao-ventilador-teto'),
    ventiladorComLuz: existsSync(W('ventilador-teto.jpg')) ? W('ventilador-teto.jpg') : S('instalacao-ventilador-teto'),
    suporteTvFixo: existsSync(W('suporte-tv.jpg')) ? W('suporte-tv.jpg') : S('instalacao-suporte-tv'),
    suporteTvInclinavel: existsSync(W('suporte-tv.jpg')) ? W('suporte-tv.jpg') : S('instalacao-suporte-tv'),
    suporteTvArticulado: existsSync(W('suporte-tv.jpg')) ? W('suporte-tv.jpg') : S('instalacao-suporte-tv'),
    prateleira: existsSync(W('prateleira.jpg')) ? W('prateleira.jpg') : S('instalacao-prateleira'),
    criadoMudo: S('montagem-moveis-simples'),
    sapateira: S('montagem-moveis-simples'),
    mesa: S('montagem-moveis-simples'),
    escrivaninha: S('montagem-moveis-simples'),
    rack: S('montagem-moveis-simples'),
    comoda: S('montagem-moveis-simples'),
    guardaRoupa: S('montagem-guarda-roupa'),
    guardaRoupaCasal: S('montagem-guarda-roupa'),
    guardaRoupaInfantil: S('montagem-guarda-roupa'),
    persianaRolo: existsSync(W('persiana-rolo.jpg')) ? W('persiana-rolo.jpg') : S('instalacao-persiana'),
    persianaRomana: existsSync(W('persiana-rolo.jpg')) ? W('persiana-rolo.jpg') : S('instalacao-persiana'),
    persianaHorizontal: existsSync(W('persiana-rolo.jpg')) ? W('persiana-rolo.jpg') : S('instalacao-persiana'),
    persianaVertical: existsSync(W('persiana-rolo.jpg')) ? W('persiana-rolo.jpg') : S('instalacao-persiana'),
    arSplit: existsSync(W('ar-split.jpg')) ? W('ar-split.jpg') : S('instalacao-ar-split'),
    arSplitSujo: existsSync(W('ar-split.jpg')) ? W('ar-split.jpg') : S('limpeza-ar-split'),
    arInverter: existsSync(W('ar-split.jpg')) ? W('ar-split.jpg') : S('instalacao-ar-split'),
    poda: existsSync(W('poda.jpg')) ? W('poda.jpg') : S('poda-jardim'),
    grama: existsSync(W('poda.jpg')) ? W('poda.jpg') : S('poda-jardim'),
    jardim: existsSync(W('poda.jpg')) ? W('poda.jpg') : S('poda-jardim'),
    arvore: existsSync(W('poda.jpg')) ? W('poda.jpg') : S('poda-jardim'),
    limpezaObra: S('limpeza-pos-obra'),
    limpezaLeve: S('limpeza-pos-obra'),
    limpezaMedia: S('limpeza-pos-obra'),
    limpezaAlta: S('limpeza-pos-obra'),
    sala: S('montagem-moveis-simples'),
    quarto: S('montagem-guarda-roupa'),
    cozinha: S('desentupimento-pia'),
    banheiro: S('desentupimento-vaso'),
    areaExterna: S('poda-jardim'),
    corredor: S('instalacao-persiana'),
    areaServico: S('limpeza-pos-obra'),
    jardimAmbiente: S('poda-jardim'),
    apartamento: S('montagem-moveis-simples'),
    casa: S('limpeza-pos-obra'),
    loja: S('instalacao-prateleira'),
    escritorio: S('montagem-moveis-simples'),
    alvenaria: S('instalacao-prateleira'),
    drywall: S('instalacao-persiana'),
    madeira: S('montagem-moveis-simples'),
    laje: S('instalacao-luminaria'),
    gesso: S('instalacao-luminaria'),
    pvc: S('instalacao-persiana'),
    estruturaMetalica: S('instalacao-suporte-tv'),
    sim: tomadaSimples,
    nao: tomada20a,
    naoSei: tomadaSimples,
    ok: tomadaSimples,
    erro: tomada20a,
    queimado: tomada20a,
    aquecendo: tomada20a,
    clienteFornece: tomadaSimples,
    absPadrao: tomadaSimples,
    absPremium: tomada20a,
    desentupimentoLento: S('desentupimento-pia'),
    desentupimentoParado: S('desentupimento-pia'),
    desentupimentoRetorno: S('desentupimento-pia'),
    mauCheiro: S('desentupimento-pia'),
    esgoto: S('desentupimento-vaso'),
    transbordo: S('desentupimento-vaso'),
    pkg: tomadaSimples,
  };
}

function resolveUrl(slug, perguntaId, opcaoId) {
  const k = `${slug}/${perguntaId}/${opcaoId}`;

  if (perguntaId === 'localInstalacao') {
    const map = {
      sala: POOL.sala,
      quarto: POOL.quarto,
      cozinha: POOL.cozinha,
      banheiro: POOL.banheiro,
      'area-externa': POOL.areaExterna,
      corredor: POOL.corredor,
      'area-servico': POOL.areaServico,
      jardim: POOL.jardimAmbiente,
    };
    if (map[opcaoId]) return map[opcaoId];
  }

  if (perguntaId === 'tipoParede') {
    return { alvenaria: POOL.alvenaria, drywall: POOL.drywall, madeira: POOL.madeira, 'nao-sei': POOL.naoSei }[opcaoId];
  }
  if (perguntaId === 'tipoTeto') {
    return {
      laje: POOL.laje,
      gesso: POOL.gesso,
      pvc: POOL.pvc,
      madeira: POOL.madeira,
      'estrutura-metalica': POOL.estruturaMetalica,
    }[opcaoId];
  }
  if (
    perguntaId === 'pontoEletricoExistente' ||
    perguntaId === 'ganchoExistente' ||
    perguntaId === 'jaExisteChuveiro' ||
    perguntaId === 'disjuntorExclusivo'
  ) {
    return { sim: POOL.sim, nao: POOL.nao, 'nao-sei': POOL.naoSei }[opcaoId];
  }
  if (perguntaId === 'quantidade') return POOL.tomadaSimples;

  const R = {
    'troca-tomada/tipoTomada/simples': POOL.tomadaSimples,
    'troca-tomada/tipoTomada/dupla': POOL.tomadaDupla,
    'troca-tomada/tipoTomada/tomada-20a': POOL.tomada20a,
    'troca-tomada/fornecimentoTomada/cliente': POOL.clienteFornece,
    'troca-tomada/fornecimentoTomada/abs-padrao': POOL.absPadrao,
    'troca-tomada/fornecimentoTomada/abs-premium': POOL.absPremium,
    'troca-tomada/estadoAtual/funcionando': POOL.ok,
    'troca-tomada/estadoAtual/nao-funciona': POOL.erro,
    'troca-tomada/estadoAtual/queimada': POOL.queimado,
    'troca-tomada/estadoAtual/aquecendo': POOL.aquecendo,
    'troca-interruptor/tipoInterruptor/simples': POOL.interruptorSimples,
    'troca-interruptor/tipoInterruptor/duplo': POOL.interruptorDuplo,
    'troca-interruptor/tipoInterruptor/triplo': POOL.interruptorTriplo,
    'troca-interruptor/tipoInterruptor/paralelo': POOL.interruptorParalelo,
    'troca-interruptor/tipoInterruptor/intermediario': POOL.interruptorParalelo,
    'instalacao-chuveiro/tipoServicoChuveiro/instalar-comum': POOL.chuveiroComum,
    'instalacao-chuveiro/tipoServicoChuveiro/instalar-eletronico': POOL.chuveiroEletronico,
    'instalacao-chuveiro/tipoServicoChuveiro/trocar-resistencia': POOL.resistenciaChuveiro,
    'instalacao-chuveiro/tipoServicoChuveiro/instalar-com-revisao-eletrica': POOL.chuveiroEletronico,
    'instalacao-chuveiro/chuveiroComprado/sim': POOL.sim,
    'instalacao-chuveiro/chuveiroComprado/nao-abs': POOL.pkg,
    'instalacao-chuveiro/potenciaChuveiro/ate-5500w': POOL.chuveiroComum,
    'instalacao-chuveiro/potenciaChuveiro/5501-6800w': POOL.chuveiroEletronico,
    'instalacao-chuveiro/potenciaChuveiro/6801-7500w': POOL.chuveiroEletronico,
    'instalacao-chuveiro/potenciaChuveiro/acima-7500w': POOL.chuveiroEletronico,
    'instalacao-chuveiro/potenciaChuveiro/nao-sei': POOL.naoSei,
    'instalacao-chuveiro/tensaoChuveiro/127v': POOL.chuveiroEletronico,
    'instalacao-chuveiro/tensaoChuveiro/220v': POOL.chuveiroEletronico,
    'instalacao-chuveiro/tensaoChuveiro/nao-sei': POOL.naoSei,
    'troca-disjuntor/tipoDisjuntor/monopolar': POOL.disjuntorMono,
    'troca-disjuntor/tipoDisjuntor/bipolar': POOL.disjuntorBi,
    'troca-disjuntor/tipoDisjuntor/tripolar': POOL.disjuntorTri,
    'troca-disjuntor/amperagemDisjuntor/10a': POOL.disjuntor,
    'troca-disjuntor/amperagemDisjuntor/16a': POOL.disjuntor,
    'troca-disjuntor/amperagemDisjuntor/20a': POOL.disjuntor,
    'troca-disjuntor/amperagemDisjuntor/25a': POOL.disjuntor,
    'troca-disjuntor/amperagemDisjuntor/32a': POOL.disjuntor,
    'troca-disjuntor/motivoTrocaDisjuntor/preventiva': POOL.disjuntor,
    'troca-disjuntor/motivoTrocaDisjuntor/quebrou': POOL.queimado,
    'troca-disjuntor/motivoTrocaDisjuntor/nao-arma': POOL.erro,
    'troca-disjuntor/motivoTrocaDisjuntor/desarmando': POOL.erro,
    'troca-disjuntor/motivoTrocaDisjuntor/cheiro-queimado': POOL.queimado,
    'troca-disjuntor/motivoTrocaDisjuntor/derreteu': POOL.queimado,
    'instalacao-luminaria/tipoLuminaria/plafon-led': POOL.plafonLed,
    'instalacao-luminaria/tipoLuminaria/sobrepor': POOL.luminariaSobrepor,
    'instalacao-luminaria/tipoLuminaria/painel-led': POOL.painelLed,
    'instalacao-luminaria/tipoLuminaria/spot-individual': POOL.spot,
    'instalacao-luminaria/tipoLuminaria/spot-trilho': POOL.spotTrilho,
    'instalacao-luminaria/tipoLuminaria/pendente': POOL.pendente,
    'instalacao-luminaria/tipoLuminaria/lustre-pequeno': POOL.lustre,
    'instalacao-luminaria/tipoLuminaria/lustre-medio': POOL.lustre,
    'instalacao-luminaria/tipoLuminaria/lustre-grande': POOL.lustre,
    'instalacao-ventilador-teto/tipoVentilador/sem-luminaria': POOL.ventiladorTeto,
    'instalacao-ventilador-teto/tipoVentilador/com-luminaria': POOL.ventiladorComLuz,
    'troca-torneira/tipoTorneira/convencional': POOL.torneiraConvencional,
    'troca-torneira/tipoTorneira/gourmet': POOL.torneiraGourmet,
    'troca-torneira/tipoTorneira/monocomando-misturador': POOL.torneiraMonocomando,
    'troca-torneira/tipoTorneira/eletrica': POOL.torneiraEletrica,
    'troca-registro/tipoRegistro/registro-chuveiro': POOL.registroChuveiro,
    'troca-registro/tipoRegistro/registro-gaveta': POOL.registroGaveta,
    'troca-registro/tipoRegistro/registro-geral': POOL.registroGeral,
    'reparo-vazamento/origemVazamento/torneira': POOL.vazamentoTorneira,
    'reparo-vazamento/origemVazamento/registro': POOL.registroGaveta,
    'reparo-vazamento/origemVazamento/sifao': POOL.sifao,
    'reparo-vazamento/origemVazamento/caixa-acoplada': POOL.vasoSanitario,
    'reparo-vazamento/origemVazamento/parede-tubulacao': POOL.vazamentoParede,
    'desentupimento-pia/problemaDesentupimento/agua-escoa-lentamente': POOL.desentupimentoLento,
    'desentupimento-pia/problemaDesentupimento/agua-nao-escoa': POOL.desentupimentoParado,
    'desentupimento-pia/problemaDesentupimento/agua-retorna': POOL.desentupimentoRetorno,
    'desentupimento-pia/problemaDesentupimento/mau-cheiro': POOL.mauCheiro,
    'desentupimento-pia/problemaDesentupimento/retorno-esgoto': POOL.esgoto,
    'desentupimento-vaso/problemaDesentupimento/agua-nao-escoa': POOL.desentupimentoParado,
    'desentupimento-vaso/problemaDesentupimento/agua-retorna': POOL.desentupimentoRetorno,
    'desentupimento-vaso/problemaDesentupimento/vaso-transborda': POOL.transbordo,
    'desentupimento-vaso/problemaDesentupimento/retorno-esgoto': POOL.esgoto,
    'instalacao-suporte-tv/tipoSuporteTv/fixo': POOL.suporteTvFixo,
    'instalacao-suporte-tv/tipoSuporteTv/inclinavel': POOL.suporteTvInclinavel,
    'instalacao-suporte-tv/tipoSuporteTv/articulado': POOL.suporteTvArticulado,
    'instalacao-suporte-tv/tamanhoTv/ate-32': POOL.suporteTvFixo,
    'instalacao-suporte-tv/tamanhoTv/33-50': POOL.suporteTvFixo,
    'instalacao-suporte-tv/tamanhoTv/51-65': POOL.suporteTvInclinavel,
    'instalacao-suporte-tv/tamanhoTv/66-75': POOL.suporteTvArticulado,
    'instalacao-suporte-tv/tamanhoTv/acima-75': POOL.suporteTvArticulado,
    'instalacao-prateleira/usoPrateleira/decoracao': POOL.prateleira,
    'instalacao-prateleira/usoPrateleira/livros': POOL.prateleira,
    'instalacao-prateleira/usoPrateleira/utensilios': POOL.cozinha,
    'instalacao-prateleira/usoPrateleira/ferramentas': POOL.prateleira,
    'instalacao-prateleira/usoPrateleira/estoque': POOL.pkg,
    'montagem-moveis-simples/tipoMovelSimples/criado-mudo': POOL.criadoMudo,
    'montagem-moveis-simples/tipoMovelSimples/sapateira': POOL.sapateira,
    'montagem-moveis-simples/tipoMovelSimples/mesa': POOL.mesa,
    'montagem-moveis-simples/tipoMovelSimples/escrivaninha': POOL.escrivaninha,
    'montagem-moveis-simples/tipoMovelSimples/rack': POOL.rack,
    'montagem-moveis-simples/tipoMovelSimples/comoda': POOL.comoda,
    'montagem-moveis-simples/tipoMovelSimples/outro-movel-simples': POOL.pkg,
    'montagem-guarda-roupa/tipoGuardaRoupa/solteiro': POOL.guardaRoupa,
    'montagem-guarda-roupa/tipoGuardaRoupa/casal': POOL.guardaRoupaCasal,
    'montagem-guarda-roupa/tipoGuardaRoupa/infantil': POOL.guardaRoupaInfantil,
    'instalacao-persiana/tipoPersiana/rolo': POOL.persianaRolo,
    'instalacao-persiana/tipoPersiana/romana': POOL.persianaRomana,
    'instalacao-persiana/tipoPersiana/horizontal': POOL.persianaHorizontal,
    'instalacao-persiana/tipoPersiana/vertical': POOL.persianaVertical,
    'instalacao-persiana/tipoPersiana/double-vision': POOL.persianaHorizontal,
    'instalacao-persiana/tipoPersiana/painel': POOL.persianaVertical,
    'limpeza-ar-split/sintomaAr/apenas-sujo': POOL.arSplitSujo,
    'limpeza-ar-split/sintomaAr/mau-cheiro': POOL.mauCheiro,
    'limpeza-ar-split/sintomaAr/pingando-agua': POOL.desentupimentoRetorno,
    'limpeza-ar-split/sintomaAr/baixa-refrigeracao': POOL.arSplit,
    'limpeza-ar-split/sintomaAr/barulho': POOL.arSplit,
    'limpeza-ar-split/capacidadeBtu/ate-12000': POOL.arSplit,
    'limpeza-ar-split/capacidadeBtu/12001-18000': POOL.arSplit,
    'limpeza-ar-split/capacidadeBtu/18001-24000': POOL.arSplit,
    'limpeza-ar-split/capacidadeBtu/acima-24000': POOL.arSplit,
    'limpeza-ar-split/capacidadeBtu/nao-sei': POOL.naoSei,
    'instalacao-ar-split/tipoEquipamentoAr/convencional': POOL.arSplit,
    'instalacao-ar-split/tipoEquipamentoAr/inverter': POOL.arInverter,
    'instalacao-ar-split/capacidadeBtu/ate-12000': POOL.arSplit,
    'instalacao-ar-split/capacidadeBtu/12001-18000': POOL.arSplit,
    'instalacao-ar-split/capacidadeBtu/18001-24000': POOL.arSplit,
    'instalacao-ar-split/capacidadeBtu/acima-24000': POOL.arSplit,
    'instalacao-ar-split/capacidadeBtu/nao-sei': POOL.naoSei,
    'poda-jardim/servicoJardim/poda-plantas-arbustos': POOL.poda,
    'poda-jardim/servicoJardim/corte-grama': POOL.grama,
    'poda-jardim/servicoJardim/limpeza-jardim': POOL.jardim,
    'poda-jardim/servicoJardim/poda-arvore-pequena': POOL.arvore,
    'limpeza-pos-obra/tipoImovelPosObra/apartamento': POOL.apartamento,
    'limpeza-pos-obra/tipoImovelPosObra/casa': POOL.casa,
    'limpeza-pos-obra/tipoImovelPosObra/loja': POOL.loja,
    'limpeza-pos-obra/tipoImovelPosObra/escritorio': POOL.escritorio,
    'limpeza-pos-obra/nivelSujeiraPosObra/leve': POOL.limpezaLeve,
    'limpeza-pos-obra/nivelSujeiraPosObra/medio': POOL.limpezaMedia,
    'limpeza-pos-obra/nivelSujeiraPosObra/alto': POOL.limpezaAlta,
  };

  if (R[k]) return R[k];
  return S(slug);
}

async function saveWebp(slug, perguntaId, opcaoId, sourcePath) {
  const dir = join(outDir, slug, perguntaId);
  mkdirSync(dir, { recursive: true });
  const dest = join(dir, `${opcaoId}.webp`);
  const buffer = readFileSync(sourcePath);

  await sharp(buffer)
    .rotate()
    .resize(520, 390, { fit: 'contain', background: { r: 255, g: 255, b: 255 } })
    .sharpen({ sigma: 0.8, m1: 0.5, m2: 0.3 })
    .webp({ quality: 92, effort: 4 })
    .toFile(dest);
}

buildPool();
mkdirSync(wikiDir, { recursive: true });

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
let ok = 0;
let fail = 0;

for (const { slug, perguntaId, opcaoId } of manifest) {
  const source = resolveUrl(slug, perguntaId, opcaoId);
  try {
    if (!existsSync(source)) throw new Error(`missing ${source}`);
    await saveWebp(slug, perguntaId, opcaoId, source);
    ok++;
  } catch (err) {
    fail++;
    console.warn(`✗ ${slug}/${perguntaId}/${opcaoId}: ${err.message}`);
  }
}

console.log(`\n✓ ${ok} fotos WebP | ✗ ${fail} falhas`);
