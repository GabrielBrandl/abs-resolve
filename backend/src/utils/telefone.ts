/** Normaliza telefone brasileiro para Evolution API (ex.: 5511999998888) */
export function normalizarTelefoneWhatsApp(telefone: string): string {
  const digits = telefone.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('55') && digits.length >= 12) return digits;
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  return digits;
}

export function telefoneWhatsAppCliente(cliente: { telefone: string; whatsapp?: string | null }): string {
  return normalizarTelefoneWhatsApp(cliente.whatsapp || cliente.telefone);
}
