/**
 * Teste: pagamento com cartão inline (mock Asaas)
 */
const BASE = process.env.API_URL || 'http://localhost:3001';
const ts = Date.now();

async function req(method, path, body, token) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}: ${json.error || JSON.stringify(json)}`);
  return json.data ?? json;
}

function gerarCpfValido() {
  const n = Array.from({ length: 9 }, () => Math.floor(Math.random() * 9));
  const calc = (base) => {
    let sum = 0;
    for (let i = 0; i < base.length; i++) sum += base[i] * (base.length + 1 - i);
    const r = (sum * 10) % 11;
    return r === 10 ? 0 : r;
  };
  const d1 = calc(n);
  const d2 = calc([...n, d1]);
  const digits = [...n, d1, d2].join('');
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

async function main() {
  const guest = await req('POST', '/auth/checkout-convidado', {
    nome: 'Cliente Cartao Inline',
    cpf: gerarCpfValido(),
    email: `cartao.inline.${ts}@absresolve.test`,
    telefone: '92999887766',
    consentimentoLgpd: true,
    endereco: {
      rua: 'Av. Teste',
      numero: '100',
      bairro: 'Centro',
      cidade: 'Manaus',
      uf: 'AM',
      cep: '69005000',
    },
  });
  const token = guest.accessToken;

  const sol = await req(
    'POST',
    '/solicitacao/carrinho',
    { itens: [{ slug: 'troca-tomada', quantidade: 1 }], express: false },
    token
  );

  const pagamentoRes = await req(
    'POST',
    `/solicitacao/${sol.id}/pagar`,
    {
      metodo: 'CARTAO',
      installmentCount: 1,
      cartao: {
        holderName: 'Cliente Cartao Inline',
        number: '5162306219378829',
        expiryMonth: '05',
        expiryYear: '28',
        ccv: '318',
      },
    },
    token
  );

  if (pagamentoRes.pagamento?.status !== 'RECEIVED') {
    throw new Error(`Esperava status RECEIVED, veio: ${pagamentoRes.pagamento?.status}`);
  }

  const st = await req('GET', `/solicitacao/${sol.id}/status`, null, token);
  if (!st.podeAgendar) throw new Error('Status não liberou agendamento após cartão');

  console.log('\n✅ CARTÃO INLINE OK');
  console.log('  Pedido:', pagamentoRes.pedido?.numero);
  console.log('  Pagamento:', pagamentoRes.pagamento?.status);
}

main().catch((err) => {
  console.error('\n❌ FALHA:', err.message);
  process.exit(1);
});
