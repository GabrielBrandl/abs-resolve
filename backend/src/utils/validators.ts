import { cpf, cnpj } from 'cpf-cnpj-validator';

export function validarCpf(valor: string): boolean {
  const limpo = valor.replace(/\D/g, '');
  return cpf.isValid(limpo);
}

export function validarCnpj(valor: string): boolean {
  const limpo = valor.replace(/\D/g, '');
  return cnpj.isValid(limpo);
}

export function formatarDocumento(valor: string): string {
  return valor.replace(/\D/g, '');
}

export function validarCpfCnpj(valor: string): boolean {
  const limpo = formatarDocumento(valor);
  if (limpo.length === 11) return validarCpf(limpo);
  if (limpo.length === 14) return validarCnpj(limpo);
  return false;
}
