/**
 * Garante imagens distintas entre opções da mesma pergunta.
 * Substitui WebPs com hash repetido por cards ilustrativos únicos (SVG → WebP).
 * Execute: node scripts/dedupe-opcoes-imagens.mjs
 */
import { createHash } from 'crypto';
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const opcoesDir = join(root, 'public', 'opcoes');

const PALETTE = [
  ['#0033B5', '#E8EEFF'],
  ['#0F766E', '#CCFBF1'],
  ['#B45309', '#FEF3C7'],
  ['#BE123C', '#FFE4E6'],
  ['#6D28D9', '#EDE9FE'],
  ['#0369A1', '#E0F2FE'],
  ['#166534', '#DCFCE7'],
  ['#9A3412', '#FFEDD5'],
  ['#1E3A8A', '#DBEAFE'],
  ['#854D0E', '#FEF9C3'],
];

function hashFile(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function hashStr(s) {
  return createHash('sha256').update(s).digest('hex');
}

function esc(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function labelFromId(opcaoId) {
  return opcaoId
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .slice(0, 28);
}

function buildSvg(opcaoId, accent, bg) {
  const label = esc(labelFromId(opcaoId));
  const isNum = /^\d+$/.test(opcaoId) || /^(mais|3-ou|4-ou)/.test(opcaoId);
  const big = isNum
    ? esc(opcaoId.replace('mais-4', '5+').replace('3-ou-mais', '3+').replace('4-ou-mais', '4+'))
    : label.slice(0, 2).toUpperCase();

  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${bg}"/>
      <stop offset="100%" stop-color="#ffffff"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" fill="url(#g)"/>
  <circle cx="420" cy="90" r="70" fill="${accent}" opacity="0.12"/>
  <circle cx="70" cy="430" r="90" fill="${accent}" opacity="0.1"/>
  <rect x="56" y="56" width="400" height="400" rx="36" fill="#ffffff" stroke="${accent}" stroke-width="8"/>
  <text x="256" y="${isNum ? 280 : 250}" text-anchor="middle" font-family="Arial,sans-serif"
        font-size="${isNum ? 120 : 72}" font-weight="700" fill="${accent}">${big}</text>
  <text x="256" y="360" text-anchor="middle" font-family="Arial,sans-serif"
        font-size="28" font-weight="600" fill="#334155">${label}</text>
</svg>`;
}

async function writeUniqueWebp(filePath, opcaoId, salt) {
  const idx = parseInt(hashStr(`${opcaoId}:${salt}`).slice(0, 8), 16) % PALETTE.length;
  const [accent, bg] = PALETTE[idx];
  const svg = Buffer.from(buildSvg(opcaoId, accent, bg));
  await sharp(svg).webp({ quality: 86 }).toFile(filePath);
}

async function main() {
  if (!existsSync(opcoesDir)) {
    console.error('Pasta public/opcoes não encontrada');
    process.exit(1);
  }

  let replaced = 0;
  const slugs = readdirSync(opcoesDir, { withFileTypes: true }).filter((d) => d.isDirectory());

  for (const slugDir of slugs) {
    const slugPath = join(opcoesDir, slugDir.name);
    const perguntas = readdirSync(slugPath, { withFileTypes: true }).filter((d) => d.isDirectory());

    for (const pergDir of perguntas) {
      const pergPath = join(slugPath, pergDir.name);
      const files = readdirSync(pergPath).filter((f) => f.endsWith('.webp'));
      if (files.length < 2) continue;

      /** @type {Map<string, string[]>} */
      const byHash = new Map();
      for (const file of files) {
        const full = join(pergPath, file);
        const h = hashFile(full);
        if (!byHash.has(h)) byHash.set(h, []);
        byHash.get(h).push(file);
      }

      for (const [, group] of byHash) {
        if (group.length < 2) continue;
        // Mantém o primeiro; regenera os demais com visual único
        for (let i = 1; i < group.length; i++) {
          const file = group[i];
          const opcaoId = file.replace(/\.webp$/i, '');
          const full = join(pergPath, file);
          await writeUniqueWebp(full, opcaoId, `${slugDir.name}/${pergDir.name}/${i}`);
          replaced += 1;
          console.log(`✓ ${slugDir.name}/${pergDir.name}/${file}`);
        }
      }
    }
  }

  // Segunda passagem: se ainda houver colisão (improvável), força todos menos 1
  let still = 0;
  for (const slugDir of slugs) {
    const slugPath = join(opcoesDir, slugDir.name);
    for (const pergDir of readdirSync(slugPath, { withFileTypes: true }).filter((d) => d.isDirectory())) {
      const pergPath = join(slugPath, pergDir.name);
      const files = readdirSync(pergPath).filter((f) => f.endsWith('.webp'));
      const byHash = new Map();
      for (const file of files) {
        const h = hashFile(join(pergPath, file));
        if (!byHash.has(h)) byHash.set(h, []);
        byHash.get(h).push(file);
      }
      for (const [, group] of byHash) {
        if (group.length > 1) still += group.length - 1;
      }
    }
  }

  console.log(`\nSubstituídas: ${replaced}. Colisões restantes na mesma pergunta: ${still}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
