import { useEffect, useState } from 'react';
import { leadsApi } from '../services/modules.service';
import { Input, Select } from './ui';

export type CompetenciaFiltro = {
  /** geral | mes | mes_passado | ym (YYYY-MM) | personalizado */
  modo: string;
  de: string;
  ate: string;
};

const MESES_FIXOS = [
  { key: 'geral', label: 'Geral / Todo o período' },
  { key: 'mes', label: 'Este mês' },
  { key: 'mes_passado', label: 'Mês anterior' },
];

function rangeMesAtual() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const de = `${y}-${String(m + 1).padStart(2, '0')}-01`;
  const ate = new Date(y, m + 1, 0).toISOString().slice(0, 10);
  return { de, ate };
}

function rangeMesPassado() {
  const now = new Date();
  const y = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const m = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
  const de = `${y}-${String(m + 1).padStart(2, '0')}-01`;
  const ate = new Date(y, m + 1, 0).toISOString().slice(0, 10);
  return { de, ate };
}

export function resolverCompetencia(modo: string, de: string, ate: string, meses: Array<{ key: string; de: string; ate: string }>): { de?: string; ate?: string } {
  if (modo === 'geral' || !modo) return {};
  if (modo === 'mes') return rangeMesAtual();
  if (modo === 'mes_passado') return rangeMesPassado();
  if (modo === 'personalizado') return { ...(de ? { de } : {}), ...(ate ? { ate } : {}) };
  const found = meses.find((m) => m.key === modo);
  if (found) return { de: found.de, ate: found.ate };
  // YYYY-MM fallback
  if (/^\d{4}-\d{2}$/.test(modo)) {
    const [y, m] = modo.split('-').map(Number);
    return {
      de: `${modo}-01`,
      ate: new Date(y, m, 0).toISOString().slice(0, 10),
    };
  }
  return {};
}

type Props = {
  value: CompetenciaFiltro;
  onChange: (next: CompetenciaFiltro) => void;
  className?: string;
};

export function CompetenciaPeriodoSelect({ value, onChange, className }: Props) {
  const [meses, setMeses] = useState<Array<{ key: string; label: string; de: string; ate: string }>>([]);

  useEffect(() => {
    leadsApi.meses().then((r) => setMeses(r.meses || [])).catch(() => setMeses([]));
  }, []);

  return (
    <div className={`flex flex-wrap items-end gap-2 ${className || ''}`}>
      <Select
        label="Competência (entrada do lead)"
        value={value.modo}
        onChange={(e) => {
          const modo = e.target.value;
          onChange({
            ...value,
            modo,
            ...(modo === 'personalizado' ? {} : { de: '', ate: '' }),
          });
        }}
      >
        {MESES_FIXOS.map((o) => (
          <option key={o.key} value={o.key}>
            {o.label}
          </option>
        ))}
        {meses.map((m) => (
          <option key={m.key} value={m.key}>
            {m.label}
          </option>
        ))}
        <option value="personalizado">Período personalizado</option>
      </Select>
      {value.modo === 'personalizado' && (
        <>
          <Input
            label="De"
            type="date"
            value={value.de}
            onChange={(e) => onChange({ ...value, de: e.target.value })}
          />
          <Input
            label="Até"
            type="date"
            value={value.ate}
            onChange={(e) => onChange({ ...value, ate: e.target.value })}
          />
        </>
      )}
    </div>
  );
}

export function competenciaToParams(filtro: CompetenciaFiltro, meses: Array<{ key: string; de: string; ate: string }> = []) {
  return resolverCompetencia(filtro.modo, filtro.de, filtro.ate, meses);
}
