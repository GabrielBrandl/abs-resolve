/**
 * Gera imagens do catálogo: baixa fotos da planilha + SVGs profissionais ABS Resolve
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, '../frontend/public/servicos');

const DOWNLOADS = {
  'troca-tomada.png':
    'https://docs.google.com/sheets-images-rt/ADAzV4TjoW8wh-28LbLUCYhqLQMZz0l9bSC83MNGQfFw8_b229X8smCJXAgTZv38n-w0yf6A5SinvY3csZzNjUg-EhKr9tvC7pJYMDH9_PfxzsPse2akr2vjjZRjiCzxsK0vwtkLOW-91LEqL5WMsRNsW6u1UOdRB_D4vw=w480-h400',
  'instalacao-luminaria.png':
    'https://docs.google.com/sheets-images-rt/ADAzV4Qy2jKK7Xp5LzK_op69GbiJGBgN-XT7JNrhMiPtluCZYoMff-B5tTmDsMCXUJwQ0KKJT3PcVca5ZiIMtJekTxhSM_GVhjqG4rdiMgj8VV5XIFddPq9UZHprddhkDYdK-m7WEYPXKdoSYTLPGCP5qJV730cb2Upm93d7=w480-h400',
  'instalacao-ventilador.png':
    'https://docs.google.com/sheets-images-rt/ADAzV4TXoBSO4Z9ScZ5V-PTPYKyMjNtnITjxJll2yH0Ne5nRnMg8iiFopp0iWKrH2f8z6P0873RtR1F-ZTRunCgbtDiM3oPU_cp-LofGGTXk2oJ8x6dPYOeTT692Vh0ftGQCivQsyx5a9spXrmD86BG38SZvnzmtX8TMsw=w480-h400',
  'troca-torneira.png':
    'https://docs.google.com/sheets-images-rt/ADAzV4Rp6wg1mEAGOVNaVR0Ulhm85Y-zlRy9kMHPwkFZ5VdCaU9zOFF2FhgutG053Ivo0SW8i9BMgOW7pjlBctA4axGW5vGqiKDdi7gkAFRELLEr6pZ7h98koLR5p0FORCw5i4moEZweoVG0kJQ64H0D_jrfcWfXhksKi7af=w480-h400',
  'persiana.png':
    'https://docs.google.com/sheets-images-rt/ADAzV4QTX7jXyvF3bTSJ_fgnzSrxfN_IIGDZZSZHjSrndWBhAE2hHot1OByOQidUj-kw0f2aLH7YhhOoRBeSQBXwya9P6ri4u59Pf4a2D1WcYYrjT7pMzYU8pEpUxCnM4bsb6kIEeHgsekJKx8Du75tMZ2gCNptNwQR8LJw_=w480-h400',
};

const CAT = {
  eletricista: { from: '#0033B5', to: '#001a5c', accent: '#FFD100' },
  hidraulica: { from: '#0ea5e9', to: '#0369a1', accent: '#e0f2fe' },
  montador: { from: '#6366f1', to: '#4338ca', accent: '#e0e7ff' },
  'ar-condicionado': { from: '#06b6d4', to: '#0e7490', accent: '#cffafe' },
  jardinagem: { from: '#22c55e', to: '#15803d', accent: '#dcfce7' },
  'limpeza-pos-obra': { from: '#64748b', to: '#334155', accent: '#f1f5f9' },
};

/** Ícones simplificados por slug (path SVG interno) */
const ICONS = {
  'troca-interruptor': '<rect x="88" y="48" width="64" height="64" rx="8" fill="none" stroke="ACCENT" stroke-width="3"/><circle cx="120" cy="72" r="6" fill="ACCENT"/><circle cx="120" cy="88" r="6" fill="ACCENT" opacity="0.5"/>',
  'instalacao-chuveiro': '<path d="M120 40v24M108 64h24" stroke="ACCENT" stroke-width="4" stroke-linecap="round"/><path d="M96 88c0-13 11-24 24-24s24 11 24 24v8H96v-8z" fill="none" stroke="ACCENT" stroke-width="3"/><path d="M108 96h24M114 104h12" stroke="ACCENT" stroke-width="2" stroke-linecap="round"/>',
  'troca-disjuntor': '<rect x="92" y="44" width="56" height="72" rx="4" fill="none" stroke="ACCENT" stroke-width="3"/><line x1="100" y1="60" x2="140" y2="60" stroke="ACCENT" stroke-width="3"/><line x1="100" y1="76" x2="140" y2="76" stroke="ACCENT" stroke-width="3" opacity="0.6"/><line x1="100" y1="92" x2="140" y2="92" stroke="ACCENT" stroke-width="3" opacity="0.3"/>',
  'troca-registro': '<circle cx="120" cy="80" r="28" fill="none" stroke="ACCENT" stroke-width="3"/><path d="M120 52v56M104 80h32" stroke="ACCENT" stroke-width="3" stroke-linecap="round"/>',
  'reparo-vazamento': '<path d="M120 44c-16 20-32 32-32 48a32 32 0 0 0 64 0c0-16-16-28-32-48z" fill="none" stroke="ACCENT" stroke-width="3"/><circle cx="120" cy="88" r="4" fill="ACCENT"/>',
  'desentupimento-pia': '<ellipse cx="120" cy="88" rx="36" ry="20" fill="none" stroke="ACCENT" stroke-width="3"/><path d="M84 88h72M120 68v-16" stroke="ACCENT" stroke-width="3" stroke-linecap="round"/>',
  'desentupimento-vaso': '<path d="M96 52h48v20a24 24 0 0 1-48 0V52z" fill="none" stroke="ACCENT" stroke-width="3"/><rect x="108" y="92" width="24" height="16" rx="2" fill="none" stroke="ACCENT" stroke-width="3"/>',
  'suporte-tv': '<rect x="72" y="56" width="96" height="56" rx="4" fill="none" stroke="ACCENT" stroke-width="3"/><line x1="120" y1="112" x2="120" y2="128" stroke="ACCENT" stroke-width="3"/><line x1="96" y1="128" x2="144" y2="128" stroke="ACCENT" stroke-width="3" stroke-linecap="round"/>',
  prateleira: '<line x1="64" y1="72" x2="176" y2="72" stroke="ACCENT" stroke-width="4" stroke-linecap="round"/><line x1="80" y1="72" x2="80" y2="104" stroke="ACCENT" stroke-width="3"/><line x1="160" y1="72" x2="160" y2="104" stroke="ACCENT" stroke-width="3"/>',
  'montagem-moveis': '<rect x="80" y="64" width="80" height="48" rx="2" fill="none" stroke="ACCENT" stroke-width="3"/><path d="M88 112v16M152 112v16" stroke="ACCENT" stroke-width="3" stroke-linecap="round"/>',
  'guarda-roupa': '<rect x="76" y="48" width="88" height="80" rx="2" fill="none" stroke="ACCENT" stroke-width="3"/><line x1="120" y1="48" x2="120" y2="128" stroke="ACCENT" stroke-width="2"/><circle cx="112" cy="88" r="3" fill="ACCENT"/><circle cx="128" cy="88" r="3" fill="ACCENT"/>',
  'limpeza-ar': '<rect x="72" y="56" width="96" height="48" rx="6" fill="none" stroke="ACCENT" stroke-width="3"/><path d="M88 80h64M88 72h48M88 88h40" stroke="ACCENT" stroke-width="2" opacity="0.7"/><circle cx="168" cy="80" r="8" fill="none" stroke="ACCENT" stroke-width="2"/>',
  'instalacao-ar': '<rect x="68" y="52" width="104" height="40" rx="4" fill="none" stroke="ACCENT" stroke-width="3"/><path d="M172 72h28M184 60v24" stroke="ACCENT" stroke-width="2"/><path d="M88 92v20M136 92v20" stroke="ACCENT" stroke-width="2"/>',
  jardim: '<path d="M120 108V72M96 88c8-16 16-24 24-24s16 8 24 24" fill="none" stroke="ACCENT" stroke-width="3" stroke-linecap="round"/><ellipse cx="88" cy="96" rx="12" ry="8" fill="ACCENT" opacity="0.5"/><ellipse cx="152" cy="96" rx="12" ry="8" fill="ACCENT" opacity="0.5"/>',
  'limpeza-obra': '<rect x="72" y="64" width="24" height="48" rx="2" fill="ACCENT" opacity="0.8"/><path d="M96 80l48-16v56l-48 16V80z" fill="none" stroke="ACCENT" stroke-width="3"/><line x1="108" y1="72" x2="132" y2="96" stroke="ACCENT" stroke-width="2"/>',
};

const SVG_SERVICES = [
  { file: 'troca-interruptor.svg', cat: 'eletricista', icon: 'troca-interruptor' },
  { file: 'instalacao-chuveiro.svg', cat: 'eletricista', icon: 'instalacao-chuveiro' },
  { file: 'troca-disjuntor.svg', cat: 'eletricista', icon: 'troca-disjuntor' },
  { file: 'troca-registro.svg', cat: 'hidraulica', icon: 'troca-registro' },
  { file: 'reparo-vazamento.svg', cat: 'hidraulica', icon: 'reparo-vazamento' },
  { file: 'desentupimento-pia.svg', cat: 'hidraulica', icon: 'desentupimento-pia' },
  { file: 'desentupimento-vaso.svg', cat: 'hidraulica', icon: 'desentupimento-vaso' },
  { file: 'suporte-tv.svg', cat: 'montador', icon: 'suporte-tv' },
  { file: 'prateleira.svg', cat: 'montador', icon: 'prateleira' },
  { file: 'montagem-moveis.svg', cat: 'montador', icon: 'montagem-moveis' },
  { file: 'guarda-roupa.svg', cat: 'montador', icon: 'guarda-roupa' },
  { file: 'limpeza-ar.svg', cat: 'ar-condicionado', icon: 'limpeza-ar' },
  { file: 'instalacao-ar.svg', cat: 'ar-condicionado', icon: 'instalacao-ar' },
  { file: 'jardim.svg', cat: 'jardinagem', icon: 'jardim' },
  { file: 'limpeza-obra.svg', cat: 'limpeza-pos-obra', icon: 'limpeza-obra' },
];

function svgFor(cat, iconKey, title) {
  const c = CAT[cat];
  const icon = (ICONS[iconKey] || '').replace(/ACCENT/g, c.accent);
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 140" role="img" aria-label="${title}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${c.from}"/>
      <stop offset="100%" stop-color="${c.to}"/>
    </linearGradient>
    <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
      <path d="M 20 0 L 0 0 0 20" fill="none" stroke="white" stroke-width="0.5" opacity="0.06"/>
    </pattern>
  </defs>
  <rect width="240" height="140" fill="url(#bg)"/>
  <rect width="240" height="140" fill="url(#grid)"/>
  <circle cx="200" cy="28" r="40" fill="white" opacity="0.06"/>
  <circle cx="40" cy="120" r="50" fill="white" opacity="0.04"/>
  ${icon}
</svg>`;
}

async function download(name, url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Falha ao baixar ${name}: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(path.join(OUT, name), buf);
  console.log(`  ✓ ${name} (foto planilha)`);
}

fs.mkdirSync(OUT, { recursive: true });

console.log('Baixando imagens da planilha...');
for (const [name, url] of Object.entries(DOWNLOADS)) {
  await download(name, url);
}

console.log('Gerando SVGs profissionais...');
for (const s of SVG_SERVICES) {
  const title = s.file.replace(/\.svg$/, '').replace(/-/g, ' ');
  fs.writeFileSync(path.join(OUT, s.file), svgFor(s.cat, s.icon, title));
  console.log(`  ✓ ${s.file}`);
}

console.log(`\nConcluído: ${Object.keys(DOWNLOADS).length + SVG_SERVICES.length} imagens em frontend/public/servicos/`);
