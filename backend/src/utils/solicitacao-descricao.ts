export function descricaoServicosDaSolicitacao(sol: {
  servico?: { nome: string } | null;
  opcoes?: unknown;
}): string {
  const opcoes = sol.opcoes as { itens?: Array<{ nome: string; quantidade?: number }> } | undefined;
  if (opcoes?.itens?.length) {
    return opcoes.itens
      .map((i) => {
        const qtd = i.quantidade && i.quantidade > 1 ? `${i.quantidade}x ` : '';
        return `${qtd}${i.nome}`;
      })
      .join(', ');
  }
  return sol.servico?.nome || 'Serviço ABS Resolve';
}
