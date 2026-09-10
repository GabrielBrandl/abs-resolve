import { garantirPlanoFinanceiroPadrao } from '../src/services/financeiro.service.js';

async function main() {
  await garantirPlanoFinanceiroPadrao();
  console.log('Plano financeiro seed OK');
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
