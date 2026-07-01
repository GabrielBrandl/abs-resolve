import { useState } from 'react';
import { Modal } from './ui';

export function GaleriaFotos({
  fotos,
  titulo = 'Fotos enviadas',
  aberto,
  onFechar,
}: {
  fotos: string[];
  titulo?: string;
  aberto: boolean;
  onFechar: () => void;
}) {
  if (!fotos.length) return null;
  return (
    <Modal open={aberto} onClose={onFechar} title={titulo}>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {fotos.map((url, i) => (
          <a key={i} href={url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-lg border">
            <img src={url} alt={`Foto ${i + 1}`} className="h-32 w-full object-cover" />
          </a>
        ))}
      </div>
    </Modal>
  );
}

export function BotaoVerFotos({
  fotos,
  label = 'Ver fotos',
  titulo = 'Fotos enviadas',
  className = '',
}: {
  fotos: string[];
  label?: string;
  titulo?: string;
  className?: string;
}) {
  const [aberto, setAberto] = useState(false);
  if (!fotos.length) return null;
  return (
    <>
      <button
        type="button"
        className={`text-sm text-primary-600 underline ${className}`}
        onClick={(e) => {
          e.stopPropagation();
          setAberto(true);
        }}
      >
        {label} ({fotos.length})
      </button>
      <GaleriaFotos fotos={fotos} titulo={titulo} aberto={aberto} onFechar={() => setAberto(false)} />
    </>
  );
}
