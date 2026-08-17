export const ROLE_LABEL: Record<string, string> = {
  admin: 'Administrador',
  comercial: 'Comercial',
  operacional: 'Operação',
  cliente: 'Cliente',
  parceiro: 'Parceiro',
};

export const ESTOQUE_STATUS: Record<string, string> = {
  ok: 'Normal',
  baixo: 'Baixo',
  critico: 'Crítico',
};

export function labelOf(map: Record<string, string>, key: unknown) {
  const k = String(key || '');
  return map[k] || k;
}
