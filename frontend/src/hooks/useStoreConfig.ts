import { useEffect, useState } from 'react';
import { solicitacaoApi } from '../services/modules.service';
import { REFERRAL_BONUS } from '../storefront/constants';

export type StoreConfig = {
  bonusIndicacao: number;
  garantiaPadraoDias: number;
  expressValor: number;
  descontoNovoClientePercent: number;
};

const DEFAULT: StoreConfig = {
  bonusIndicacao: REFERRAL_BONUS,
  garantiaPadraoDias: 90,
  expressValor: 29,
  descontoNovoClientePercent: 0.1,
};

let cached: StoreConfig | null = null;

export function percentLabel(pct: number) {
  const n = Math.round(pct * 1000) / 10;
  return Number.isInteger(n) ? String(n) : n.toLocaleString('pt-BR');
}

export function useStoreConfig() {
  const [config, setConfig] = useState<StoreConfig>(cached || DEFAULT);

  useEffect(() => {
    if (cached) {
      setConfig(cached);
      return;
    }
    solicitacaoApi
      .config()
      .then((d) => {
        const next: StoreConfig = {
          bonusIndicacao: Number(d.bonusIndicacao) > 0 ? Number(d.bonusIndicacao) : REFERRAL_BONUS,
          garantiaPadraoDias: Number(d.garantiaPadraoDias) > 0 ? Number(d.garantiaPadraoDias) : 90,
          expressValor: Number(d.expressValor) > 0 ? Number(d.expressValor) : 29,
          descontoNovoClientePercent:
            Number(d.descontoNovoClientePercent) > 0 ? Number(d.descontoNovoClientePercent) : 0.1,
        };
        cached = next;
        setConfig(next);
      })
      .catch(() => undefined);
  }, []);

  return config;
}
