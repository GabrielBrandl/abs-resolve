/**
 * Baixa fotos de produto (Wikimedia) para public/opcoes-sources/wiki/
 * Execute: node scripts/download-opcoes-sources.mjs
 */
import { mkdirSync, writeFileSync, existsSync, unlinkSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const wikiDir = join(root, 'public', 'opcoes-sources', 'wiki');
mkdirSync(wikiDir, { recursive: true });

const UA = 'ABSResolve/1.0 (questionario-fotos; contato@absresolve.com.br)';

const FILES = [
  { name: 'tomada-simples-2.jpg', file: 'Brazilian 3-pins socket.jpg' },
  { name: 'tomada-20a.jpg', file: 'Tomada Brasileira - NBR 14136, 20A, 250V.jpg' },
  { name: 'tomada-20a-2.jpg', file: 'Brazilian 3-pin socket 20A.jpg' },
  { name: 'interruptor-simples.jpg', file: 'White light switch.jpg' },
  { name: 'interruptor-duplo.jpg', file: 'Double Light Switch.jpg' },
  { name: 'interruptor-triplo.jpg', file: 'Light Switch 1.jpg' },
  { name: 'interruptor-paralelo.jpg', file: 'Rocker light switch.jpg' },
  { name: 'disjuntor.jpg', file: 'Circuit breaker 2 pole on DIN rail.JPG' },
  { name: 'disjuntor-bipolar.jpg', file: 'Circuit breaker 2 pole on DIN rail.JPG' },
  { name: 'ventilador-teto.jpg', file: 'Ceiling fan with lamp.jpg' },
  { name: 'ventilador-sem-luz.jpg', file: 'Ceiling Fan Mid-Spin.jpg' },
  { name: 'torneira-convencional.jpg', file: 'Kitchen Faucet in Sunlight.jpg' },
  { name: 'torneira-gourmet.jpg', file: 'Grohe kitchen faucet veris 1.jpg' },
  { name: 'ar-split.jpg', file: 'Panasonic AIR CONDITIONER INDOOR UNIT CS-C10KJ2 (2).jpg' },
  { name: 'suporte-tv.jpg', file: 'Wall Mount 1.jpg' },
  { name: 'registro.jpg', file: 'Water valves with spigots.jpg' },
  { name: 'luminaria-plafon.jpg', file: 'A Ceiling lamp.jpg' },
  { name: 'chuveiro.jpg', file: 'Shower Borth.JPG' },
  { name: 'vaso-sanitario.jpg', file: 'Clean Toilet Bowl.jpg' },
  { name: 'sifao.jpg', file: 'Brass P trap.jpg' },
  { name: 'persiana-rolo.jpg', file: 'Roller blind.jpg' },
  { name: 'prateleira.jpg', file: 'EFTA00001190 - White shelf holds black binders against a beige wall with a chrome rod below.jpg' },
  { name: 'poda.jpg', file: 'Pruning shears.jpg' },
];

async function wikiThumb(fileTitle, width = 960) {
  const q = new URLSearchParams({
    action: 'query',
    titles: `File:${fileTitle}`,
    prop: 'imageinfo',
    iiprop: 'url',
    iiurlwidth: String(width),
    format: 'json',
  });
  const res = await fetch(`https://commons.wikimedia.org/w/api.php?${q}`, {
    headers: { 'User-Agent': UA },
  });
  const data = await res.json();
  const page = Object.values(data.query?.pages ?? {})[0];
  const info = page?.imageinfo?.[0];
  if (!info?.thumburl) throw new Error(`sem thumb: ${fileTitle}`);
  return info.thumburl;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

for (const { name, file } of FILES) {
  const dest = join(wikiDir, name);
  if (existsSync(dest)) {
    console.log(`✓ ${name} (já existe)`);
    continue;
  }
  try {
    const url = await wikiThumb(file);
    await sleep(3000);
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    writeFileSync(dest, buf);
    console.log(`✓ ${name} (${(buf.length / 1024).toFixed(1)} KB)`);
  } catch (err) {
    console.warn(`✗ ${name}: ${err.message}`);
  }
  await sleep(3000);
}

/** Tomada dupla — foto Tramontina enviada pelo cliente, com upscale nítido */
const clienteSrc = join(root, 'public', 'opcoes-sources', 'tomada-cliente.png');
const duplaDest = join(wikiDir, 'tomada-dupla.jpg');
if (existsSync(clienteSrc)) {
  if (existsSync(duplaDest)) unlinkSync(duplaDest);
  await sharp(clienteSrc)
    .resize(1040, 1560, { fit: 'inside', kernel: sharp.kernel.lanczos3 })
    .sharpen({ sigma: 1.4, m1: 0.8, m2: 0.4 })
    .jpeg({ quality: 95, mozjpeg: true })
    .toFile(duplaDest);
  console.log('✓ tomada-dupla.jpg (foto cliente, upscale)');
}
