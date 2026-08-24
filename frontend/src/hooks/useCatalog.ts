import { useEffect, useState } from 'react';
import { solicitacaoApi } from '../services/modules.service';
import type { CategoriaLoja } from '../storefront/catalog';
import { CATALOGO_FALLBACK } from '../storefront/static-catalog';

export function useCatalog() {
  const [categorias, setCategorias] = useState<CategoriaLoja[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (cancelled) return;
      setCategorias((current) => (current.length ? current : CATALOGO_FALLBACK));
      setLoading(false);
    }, 8000);

    solicitacaoApi
      .catalogo()
      .then((d) => {
        const cats = (d.categorias || []) as CategoriaLoja[];
        if (!cancelled) setCategorias(cats.length ? cats : CATALOGO_FALLBACK);
      })
      .catch(() => {
        if (!cancelled) setCategorias(CATALOGO_FALLBACK);
      })
      .finally(() => {
        window.clearTimeout(timer);
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  return { categorias, loading };
}
