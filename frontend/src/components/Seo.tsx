import { useEffect } from 'react';

const SITE = 'https://absresolve.com.br';
const DEFAULT_TITLE = 'ABS Resolve | Serviços técnicos em Manaus';
const DEFAULT_DESC =
  'Elétrica, hidráulica, montagem e ar-condicionado em Manaus. Preço visível, pagamento online e garantia de até 90 dias.';

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.content = content;
}

function upsertLink(rel: string, href: string) {
  let el = document.head.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement('link');
    el.rel = rel;
    document.head.appendChild(el);
  }
  el.href = href;
}

function upsertJsonLd(id: string, data: Record<string, unknown> | null) {
  const existing = document.getElementById(id);
  if (!data) {
    existing?.remove();
    return;
  }
  let el = existing as HTMLScriptElement | null;
  if (!el) {
    el = document.createElement('script');
    el.type = 'application/ld+json';
    el.id = id;
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

export type SeoProps = {
  title?: string;
  description?: string;
  path?: string;
  image?: string;
  type?: 'website' | 'product';
  jsonLd?: Record<string, unknown> | null;
};

/** Atualiza title/meta/OG/canonical no SPA (sem react-helmet). */
export function Seo({
  title = DEFAULT_TITLE,
  description = DEFAULT_DESC,
  path = '/',
  image = `${SITE}/logo.png`,
  type = 'website',
  jsonLd = null,
}: SeoProps) {
  const jsonLdKey = jsonLd ? JSON.stringify(jsonLd) : '';

  useEffect(() => {
    const fullTitle = title.includes('ABS Resolve') ? title : `${title} | ABS Resolve`;
    const url = path.startsWith('http') ? path : `${SITE}${path.startsWith('/') ? path : `/${path}`}`;
    const img = image.startsWith('http') ? image : `${SITE}${image.startsWith('/') ? image : `/${image}`}`;
    const parsedLd = jsonLdKey ? (JSON.parse(jsonLdKey) as Record<string, unknown>) : null;

    document.title = fullTitle;
    upsertMeta('name', 'description', description);
    upsertMeta('property', 'og:title', fullTitle);
    upsertMeta('property', 'og:description', description);
    upsertMeta('property', 'og:type', type);
    upsertMeta('property', 'og:url', url);
    upsertMeta('property', 'og:image', img);
    upsertMeta('property', 'og:locale', 'pt_BR');
    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:title', fullTitle);
    upsertMeta('name', 'twitter:description', description);
    upsertLink('canonical', url);
    upsertJsonLd('abs-seo-jsonld', parsedLd);

    return () => {
      document.title = DEFAULT_TITLE;
      upsertMeta('name', 'description', DEFAULT_DESC);
      upsertJsonLd('abs-seo-jsonld', null);
    };
  }, [title, description, path, image, type, jsonLdKey]);

  return null;
}
