import { useEffect, useState } from 'react';
import { solicitacaoApi } from '../services/modules.service';
import type { CategoriaLoja } from '../storefront/catalog';
import { mergeCatalog } from '../storefront/catalog';

export function useCatalog() {
  const [categorias, setCategorias] = useState<CategoriaLoja[]>(() =>
    mergeCatalog([], { pecasAvulsasAtivas: false })
  );
  const [pecasAvulsasAtivas, setPecasAvulsasAtivas] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (cancelled) return;
      setCategorias((current) => (current.length ? current : mergeCatalog([], { pecasAvulsasAtivas: false })));
      setLoading(false);
    }, 8000);

    solicitacaoApi
      .catalogo()
      .then((d) => {
        if (cancelled) return;
        const ativas = d.pecasAvulsasAtivas === true;
        setPecasAvulsasAtivas(ativas);
        setCategorias(mergeCatalog((d.categorias || []) as CategoriaLoja[], { pecasAvulsasAtivas: ativas }));
      })
      .catch(() => {
        if (!cancelled) {
          setPecasAvulsasAtivas(false);
          setCategorias(mergeCatalog([], { pecasAvulsasAtivas: false }));
        }
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

  return { categorias, loading, pecasAvulsasAtivas };
}
