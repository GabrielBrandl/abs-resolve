import 'dotenv/config';
import { createApp } from './app.js';
import { assertJwtSecret } from './utils/security.js';
import { iniciarCronJobs } from './services/cron.service.js';
import { fluxoConfigService } from './services/fluxo-config.service.js';
import { catalogoAdminService } from './services/catalogo-admin.service.js';

assertJwtSecret(process.env.JWT_SECRET);
assertJwtSecret(process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);

const PORT = process.env.PORT || 3001;
const app = createApp();

app.listen(PORT, () => {
  console.log(`ABS Resolve API v2.1 rodando em http://localhost:${PORT}`);
  iniciarCronJobs();
  void fluxoConfigService.initCache();
  void catalogoAdminService.sincronizarTiposPreco();
});
