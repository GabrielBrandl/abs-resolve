import fs from 'fs';
import path from 'path';
import { SERVICOS_CATALOGO } from '../config/catalogo-servicos.js';

export type ItemEmailPedido = {
  nome: string;
  quantidade: number;
  valor: string;
  slug?: string;
  imagemUrl?: string | null;
};

export type AnexoEmail = {
  filename: string;
  content: Buffer;
  contentType?: string;
  cid?: string;
};

function formatarMoeda(valor: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
}

export function urlPublicaSite() {
  return (process.env.FRONTEND_URL || process.env.API_PUBLIC_URL || 'https://app.absresolve.com.br').replace(/\/$/, '');
}

export function urlImagemServico(slug?: string, imagemUrl?: string | null) {
  const base = urlPublicaSite();
  if (imagemUrl?.startsWith('http')) return imagemUrl;
  if (imagemUrl?.startsWith('/')) return `${base}${imagemUrl}`;
  if (slug) {
    const cat = SERVICOS_CATALOGO.find((s) => s.slug === slug);
    if (cat?.imagemUrl) return `${base}${cat.imagemUrl}`;
    return `${base}/servicos/${slug}.webp`;
  }
  return `${base}/logo.png`;
}

function caminhoLocalDeUrl(url: string) {
  const rel = url.replace(/^https?:\/\/[^/]+/, '').replace(/^\//, '').split('?')[0];
  const candidatos = [
    path.resolve(process.cwd(), '..', 'frontend', 'public', rel),
    path.resolve(process.cwd(), 'public', rel),
    path.resolve(process.cwd(), 'frontend', 'public', rel),
    path.join('/app', 'public', rel),
  ];
  return candidatos.find((p) => fs.existsSync(p)) || null;
}

export function montarItensEmail(sol: {
  servico?: { nome: string; slug?: string; imagemUrl?: string | null } | null;
  opcoes?: unknown;
  precoFinal?: unknown;
} | null): ItemEmailPedido[] {
  if (!sol) return [];
  const opcoes = sol.opcoes as {
    itens?: Array<{
      slug?: string;
      nome?: string;
      quantidade?: number;
      subtotal?: number;
      precoUnitario?: number;
      imagemUrl?: string | null;
    }>;
  };
  if (opcoes?.itens?.length) {
    return opcoes.itens.map((i) => ({
      nome: i.nome || 'Serviço',
      quantidade: i.quantidade || 1,
      valor: formatarMoeda(Number(i.subtotal ?? Number(i.precoUnitario || 0) * (i.quantidade || 1))),
      slug: i.slug,
      imagemUrl:
        i.imagemUrl ||
        SERVICOS_CATALOGO.find((s) => s.slug === i.slug)?.imagemUrl ||
        (i.slug?.startsWith('peca-') ? i.imagemUrl : null) ||
        `/servicos/${i.slug || 'logo'}.webp`,
    }));
  }
  return [
    {
      nome: sol.servico?.nome || 'Serviço ABS Resolve',
      quantidade: 1,
      valor: formatarMoeda(Number(sol.precoFinal || 0)),
      slug: sol.servico?.slug,
      imagemUrl: sol.servico?.imagemUrl || SERVICOS_CATALOGO.find((s) => s.slug === sol.servico?.slug)?.imagemUrl,
    },
  ];
}

export function htmlItensPedido(itens: ItemEmailPedido[], anexos: AnexoEmail[] = []) {
  if (!itens.length) return '';
  const cids = new Set(anexos.map((a) => a.cid).filter(Boolean));
  const linhas = itens
    .map((item, i) => {
      const src = cids.has(`item-${i}`) ? `cid:item-${i}` : urlImagemServico(item.slug, item.imagemUrl);
      return `
        <tr>
          <td style="padding:10px 8px 10px 0;width:72px;vertical-align:top">
            <img src="${src}" alt="${item.nome}" width="64" height="64" style="display:block;width:64px;height:64px;border-radius:8px;object-fit:cover;border:1px solid #e3e6e6" />
          </td>
          <td style="padding:10px 0;vertical-align:top;font-size:14px;color:#0f1111">
            <div style="font-weight:700">${item.nome}</div>
            <div style="color:#565959;font-size:12px">Qtd. ${item.quantidade}</div>
          </td>
          <td style="padding:10px 0;text-align:right;vertical-align:top;font-weight:700;white-space:nowrap">${item.valor}</td>
        </tr>`;
    })
    .join('');
  return `
    <table style="width:100%;border-collapse:collapse;margin:12px 0 4px">
      ${linhas}
    </table>`;
}

export function anexosImagensPedido(itens: ItemEmailPedido[]): AnexoEmail[] {
  const anexos: AnexoEmail[] = [];
  const logoLocal = caminhoLocalDeUrl('/logo.png');
  if (logoLocal) {
    anexos.push({
      filename: 'logo.png',
      content: fs.readFileSync(logoLocal),
      contentType: 'image/png',
      cid: 'logo-abs',
    });
  }
  itens.forEach((item, i) => {
    const url = urlImagemServico(item.slug, item.imagemUrl);
    const local = caminhoLocalDeUrl(url) || (item.slug ? caminhoLocalDeUrl(`/servicos/${item.slug}.webp`) : null);
    if (local) {
      anexos.push({
        filename: path.basename(local),
        content: fs.readFileSync(local),
        contentType: local.endsWith('.png') ? 'image/png' : 'image/webp',
        cid: `item-${i}`,
      });
    }
  });
  return anexos;
}
