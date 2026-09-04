import { isPecaSlug } from '../storefront/pecas';
import { totalComDescontoAPartirDaSegunda, DESCONTO_SEGUNDA_UNIDADE_PERCENT } from './desconto-quantidade';

export const MINIMO_CARRINHO_SERVICO = 150;
export const MINIMO_PECAS_ISENTO_ENTREGA = 150;

export type ItemCarrinhoResumo = {
  slug: string;
  quantidade: number;
  tipo?: 'servico' | 'peca';
  precoMinimo?: number | null;
};

export type EnderecoEntrega = {
  cep?: string;
  cidade?: string;
  bairro?: string;
  uf?: string;
};

export function isPecaItem(slug: string, tipo?: string) {
  return tipo === 'peca' || isPecaSlug(slug) || slug.startsWith('mat-');
}

export function analisarItensCarrinho(itens: ItemCarrinhoResumo[]) {
  let subtotalServicos = 0;
  let subtotalPecas = 0;
  let temServico = false;
  let temPeca = false;

  for (const item of itens) {
    const unit = Number(item.precoMinimo) || 0;
    const qty = item.quantidade || 1;
    const isPeca = isPecaItem(item.slug, item.tipo);
    const val = isPeca
      ? totalComDescontoAPartirDaSegunda(unit, qty, DESCONTO_SEGUNDA_UNIDADE_PERCENT).total
      : unit * qty;
    if (isPeca) {
      subtotalPecas += val;
      temPeca = true;
    } else {
      subtotalServicos += val;
      temServico = true;
    }
  }

  const subtotal = subtotalServicos + subtotalPecas;
  const somentePecas = temPeca && !temServico;
  const misto = temServico && temPeca;

  return { subtotalServicos, subtotalPecas, subtotal, temServico, temPeca, somentePecas, misto };
}

const FAIXAS_CEP_MANAUS: Array<{ prefixos: string[]; taxa: number; regiao: string }> = [
  { prefixos: ['69075', '69076', '69077'], taxa: 12, regiao: 'Distrito Industrial e entorno' },
  { prefixos: ['69070', '69071', '69072', '69073', '69074'], taxa: 14, regiao: 'Cidade Nova / Jorge Teixeira' },
  { prefixos: ['69000', '69001', '69002', '69005', '69010', '69055', '69056', '69057'], taxa: 15, regiao: 'Centro e adjacências' },
  { prefixos: ['69020', '69021', '69022', '69023', '69024', '69025', '69060', '69061', '69062'], taxa: 17, regiao: 'Zona Norte (Tarumã, São Jorge)' },
  { prefixos: ['69050', '69051', '69052', '69053', '69054', '69058', '69059'], taxa: 18, regiao: 'Compensa / Alvorada / Flores' },
  { prefixos: ['69040', '69041', '69042', '69043', '69044', '69045', '69046', '69047', '69048', '69049'], taxa: 19, regiao: 'Zona Sul' },
  { prefixos: ['69080', '69081', '69082', '69083', '69084', '69085', '69086', '69087', '69088', '69089'], taxa: 20, regiao: 'Zona Oeste' },
  { prefixos: ['69090', '69091', '69092', '69093', '69094', '69095', '69096', '69097', '69098', '69099'], taxa: 22, regiao: 'Zona Leste / Puraquequara' },
];

const REGIAO_METROPOLITANA = [
  'iranduba',
  'manacapuru',
  'rio preto da eva',
  'presidente figueiredo',
  'careiro',
  'careiro da varzea',
  'autazes',
  'nova olinda do norte',
];

function normalizar(txt: string) {
  return txt
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
    .toLowerCase();
}

export function calcularTaxaEntrega(endereco: EnderecoEntrega): { taxa: number; regiao: string } {
  const uf = normalizar(endereco.uf || 'AM');
  if (uf && uf !== 'am') {
    return { taxa: 0, regiao: 'Fora do Amazonas' };
  }

  const cep = (endereco.cep || '').replace(/\D/g, '');
  const cidade = normalizar(endereco.cidade || '');

  if (cidade && REGIAO_METROPOLITANA.some((c) => cidade.includes(c) || c.includes(cidade))) {
    return { taxa: 32, regiao: 'Região metropolitana de Manaus' };
  }

  if (cidade && cidade !== 'manaus') {
    return { taxa: 38, regiao: `${endereco.cidade} — AM` };
  }

  if (cep.length >= 5) {
    const prefixo5 = cep.slice(0, 5);
    for (const faixa of FAIXAS_CEP_MANAUS) {
      if (faixa.prefixos.includes(prefixo5)) {
        return { taxa: faixa.taxa, regiao: faixa.regiao };
      }
    }
    if (cep.startsWith('690')) {
      return { taxa: 20, regiao: 'Manaus' };
    }
  }

  return { taxa: 20, regiao: 'Manaus' };
}

export function validarCarrinhoFrontend(itens: ItemCarrinhoResumo[], endereco?: EnderecoEntrega | null) {
  const normalizados = itens.map((i) => ({
    ...i,
    precoMinimo:
      typeof i.precoMinimo === 'number'
        ? i.precoMinimo
        : Number(String(i.precoMinimo ?? '').replace(/[^\d.-]/g, '')) || 0,
  }));
  const resumo = analisarItensCarrinho(normalizados);

  if (resumo.temServico && resumo.subtotal < MINIMO_CARRINHO_SERVICO) {
    const falta = MINIMO_CARRINHO_SERVICO - resumo.subtotal;
    const contexto = resumo.misto
      ? 'Pedidos com serviço e peça'
      : 'Pedidos só com serviço';
    return {
      ok: false as const,
      mensagem: `${contexto} exigem mínimo de R$ ${MINIMO_CARRINHO_SERVICO.toFixed(2).replace('.', ',')}. Faltam R$ ${falta.toFixed(2).replace('.', ',')}.`,
      ...resumo,
      taxaEntrega: 0,
      taxaEntregaRegiao: undefined,
      total: resumo.subtotal,
      avisoServico: undefined,
      avisoPecas: undefined,
      avisoMisto: undefined,
    };
  }

  let taxaEntrega = 0;
  let taxaEntregaRegiao: string | undefined;

  // Frete só quando o carrinho tem APENAS peças (sem serviço)
  if (resumo.somentePecas && resumo.subtotal < MINIMO_PECAS_ISENTO_ENTREGA) {
    if (endereco?.cep || endereco?.cidade) {
      const entrega = calcularTaxaEntrega(endereco);
      taxaEntrega = entrega.taxa;
      taxaEntregaRegiao = entrega.regiao;
    }
  }

  const avisoPecas =
    resumo.somentePecas && resumo.subtotal < MINIMO_PECAS_ISENTO_ENTREGA
      ? endereco?.cep
        ? `Taxa de entrega (${taxaEntregaRegiao}): incluída no total`
        : 'Só peças abaixo de R$ 150: taxa de entrega calculada no checkout conforme seu CEP'
      : resumo.somentePecas && resumo.subtotal >= MINIMO_PECAS_ISENTO_ENTREGA
        ? 'Frete grátis — pedido de peças acima de R$ 150'
        : undefined;

  const avisoMisto = resumo.misto
    ? 'Peças vão na mesma visita do serviço — sem taxa de entrega'
    : undefined;

  return {
    ok: true as const,
    ...resumo,
    taxaEntrega,
    taxaEntregaRegiao,
    total: resumo.subtotal + taxaEntrega,
    avisoPecas,
    avisoServico: undefined,
    avisoMisto,
  };
}
