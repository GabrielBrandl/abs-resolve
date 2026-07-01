import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const assets = 'C:/Users/Gabriel/.cursor/projects/c-Users-Gabriel-Desktop-SISTEMA-LOVABLE/assets';
const out = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public/servicos-sources');
fs.mkdirSync(out, { recursive: true });

const byKey = new Map();
for (const f of fs.readdirSync(assets)) {
  const m = f.match(/images_([a-z0-9-]+?)-[a-f0-9]{8}/i);
  if (!m) continue;
  const key = m[1];
  const full = path.join(assets, f);
  const size = fs.statSync(full).size;
  const prev = byKey.get(key);
  if (!prev || size > prev.size) byKey.set(key, { full, size });
}

// Maior foto genérica (upload sem slug no nome)
let bestGeneric = null;
for (const f of fs.readdirSync(assets)) {
  if (!/^c__.*images_image-[a-f0-9-]+\.png$/i.test(f)) continue;
  const full = path.join(assets, f);
  const size = fs.statSync(full).size;
  if (!bestGeneric || size > bestGeneric.size) bestGeneric = { full, size };
}
if (bestGeneric) byKey.set('image', bestGeneric);

// Limpeza pós-obra (WhatsApp)
for (const f of fs.readdirSync(assets)) {
  if (!/WhatsApp.*\.(png|jpe?g)$/i.test(f)) continue;
  const full = path.join(assets, f);
  const size = fs.statSync(full).size;
  const prev = byKey.get('limpeza-pos-obra');
  if (!prev || size > prev.size) byKey.set('limpeza-pos-obra', { full, size });
}

for (const [key, { full, size }] of byKey) {
  const dest = path.join(out, `${key}.png`);
  fs.copyFileSync(full, dest);
  console.log(`${key}.png (${size} bytes)`);
}
