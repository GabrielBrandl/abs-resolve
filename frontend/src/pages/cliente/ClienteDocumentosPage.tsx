import { useEffect, useState, useRef } from 'react';
import { clientePortalApi } from '../../services/modules.service';
import { formatDate } from '../../types';
import { PageHeader, Loading, Card, Button } from '../../components/ui';
import { useToast } from '../../components/Toast';

interface Documento {
  id: string;
  nome: string;
  mimetype?: string;
  tamanho: number;
  url: string;
  createdAt: string;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ClienteDocumentosPage() {
  const [docs, setDocs] = useState<Documento[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const carregar = () => {
    clientePortalApi.documentos().then(setDocs).finally(() => setLoading(false));
  };

  useEffect(() => { carregar(); }, []);

  const upload = async (file: File) => {
    setUploading(true);
    try {
      await clientePortalApi.uploadDocumento(file);
      toast('Documento enviado!', 'success');
      carregar();
    } catch {
      toast('Erro ao enviar documento', 'error');
    } finally {
      setUploading(false);
    }
  };

  if (loading) return <Loading />;

  return (
    <div>
      <PageHeader
        title="Documentos"
        subtitle="Envie e baixe seus arquivos"
        action={
          <>
            <input ref={inputRef} type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
            <Button onClick={() => inputRef.current?.click()} disabled={uploading}>
              {uploading ? 'Enviando...' : 'Upload'}
            </Button>
          </>
        }
      />

      {docs.length === 0 ? (
        <Card><p className="text-slate-400">Nenhum documento enviado</p></Card>
      ) : (
        docs.map((d) => (
          <Card key={d.id} className="mb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{d.nome}</p>
                <p className="text-sm text-slate-500">{formatSize(d.tamanho)} · {formatDate(d.createdAt)}</p>
              </div>
              <a href={d.url} target="_blank" rel="noreferrer">
                <Button variant="secondary">Download</Button>
              </a>
            </div>
          </Card>
        ))
      )}
    </div>
  );
}
