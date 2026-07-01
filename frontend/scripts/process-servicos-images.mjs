/**
 * Processa fotos de serviços: redimensiona, nitidez e exporta WebP.
 * Fonte: assets do Cursor (uploads do chat) ou frontend/public/servicos-sources/
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const OUT_DIR = path.resolve(__dirname, '../public/servicos');
const SOURCES_DIR = path.resolve(__dirname, '../public/servicos-sources');

const ASSETS_CANDIDATES = [
  path.join(process.env.USERPROFILE || '', '.cursor/projects/c-Users-Gabriel-Desktop-SISTEMA-LOVABLE/assets'),
  SOURCES_DIR,
];

/** Nome no arquivo de origem → slug(s) no catálogo */
const ASSET_KEY_TO_SLUGS = {
  'troca-tomada': ['troca-tomada'],
  'troca-interruptor': ['troca-interruptor'],
  'troca-disjuntor': ['troca-disjuntor'],
  'instalacao-lustre': ['instalacao-luminaria', 'instalacao-ventilador-teto'],
  'troca-registro': ['troca-registro', 'troca-torneira'],
  'reparo-vazamento': ['reparo-vazamento'],
  'desentupimento-pia': ['desentupimento-pia'],
  'desentupimento-vaso': ['desentupimento-vaso'],
  'suporte-tv': ['instalacao-suporte-tv'],
  'montagem-movel': ['montagem-moveis-simples', 'montagem-guarda-roupa', 'instalacao-prateleira'],
  'instalacao-persiana': ['instalacao-persiana'],
  'manutencao-ar': ['limpeza-ar-split'],
  'instalacao-ar': ['instalacao-ar-split'],
  'poda-jardim': ['poda-jardim'],
  'instalacao-chuveiro': ['instalacao-chuveiro'],
  'limpeza-pos-obra': ['limpeza-pos-obra'],
  'limpeza-obra': ['limpeza-pos-obra'],
  image: ['instalacao-chuveiro'],
};

const ALL_SLUGS = [
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
];

const FALLBACK_SLUG = {
  'instalacao-chuveiro': 'instalacao-luminaria',
  'instalacao-ventilador-teto': 'instalacao-luminaria',
  'troca-torneira': 'troca-registro',
  'instalacao-prateleira': 'montagem-moveis-simples',
  'montagem-guarda-roupa': 'montagem-moveis-simples',
};

function extractAssetKey(filename) {
  const m = filename.match(/images_([a-z0-9-]+?)(?:-[a-f0-9]{8})?\.(png|jpe?g|webp)$/i);
  if (m) return m[1];
  const base = path.basename(filename, path.extname(filename));
  if (Object.prototype.hasOwnProperty.call(ASSET_KEY_TO_SLUGS, base)) return base;
  if (ALL_SLUGS.includes(base)) return base;
  return null;
}

function findAssetsDir() {
  for (const dir of ASSETS_CANDIDATES) {
    if (fs.existsSync(dir)) return dir;
  }
  return null;
}

function collectSources(assetsDir) {
  const byKey = new Map();

  const scan = (dir) => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scan(full);
        continue;
      }
      if (!/\.(png|jpe?g|webp)$/i.test(entry.name)) continue;

      const key = extractAssetKey(entry.name);
      if (!key) continue;

      const stat = fs.statSync(full);
      const prev = byKey.get(key);
      if (!prev || stat.size > prev.size) {
        byKey.set(key, { path: full, size: stat.size });
      }
    }
  };

  scan(assetsDir);
  scan(SOURCES_DIR);
  return byKey;
}

async function processImage(inputPath, outputPath) {
  await sharp(inputPath)
    .rotate()
    .resize(960, 640, {
      fit: 'cover',
      position: 'centre',
      withoutEnlargement: false,
    })
    .sharpen({ sigma: 1.2, m1: 0.5, m2: 0.5 })
    .webp({ quality: 88, effort: 4 })
    .toFile(outputPath);
}

async function main() {
  const assetsDir = findAssetsDir();
  if (!assetsDir) {
    console.error('Pasta de assets não encontrada.');
    process.exit(1);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const sources = collectSources(assetsDir);
  const slugToSource = new Map();

  for (const [key, info] of sources) {
    const slugs = ASSET_KEY_TO_SLUGS[key];
    if (!slugs) continue;
    for (const slug of slugs) {
      const prev = slugToSource.get(slug);
      if (!prev || info.size > prev.size) slugToSource.set(slug, info.path);
    }
  }

  for (const slug of ALL_SLUGS) {
    if (slugToSource.has(slug)) continue;
    const fallback = FALLBACK_SLUG[slug];
    if (fallback && slugToSource.has(fallback)) {
      slugToSource.set(slug, slugToSource.get(fallback));
    }
  }

  let ok = 0;
  for (const slug of ALL_SLUGS) {
    const src = slugToSource.get(slug);
    const out = path.join(OUT_DIR, `${slug}.webp`);
    if (!src) {
      console.warn(`⚠ Sem imagem: ${slug}`);
      continue;
    }
    await processImage(src, out);
    console.log(`✓ ${slug}.webp ← ${path.basename(src)}`);
    ok++;
  }

  console.log(`\n${ok}/${ALL_SLUGS.length} imagens processadas em ${OUT_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
