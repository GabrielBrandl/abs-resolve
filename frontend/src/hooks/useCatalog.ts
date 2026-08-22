import { useEffect, useState } from 'react';
import { solicitacaoApi } from '../services/modules.service';
import type { CategoriaLoja } from '../storefront/catalog';

export function useCatalog() {
  const [categorias, setCategorias] = useState<CategoriaLoja[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    solicitacaoApi
      .catalogo()
      .then((d) => setCategorias((d.categorias || []) as CategoriaLoja[]))
      .catch(() => setCategorias([]))
      .finally(() => setLoading(false));
  }, []);

  return { categorias, loading };
}
